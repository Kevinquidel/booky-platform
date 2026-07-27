// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

const docRef = doc(firestore, "SETTINGS", "site-metadata");
const CACHE_KEY = "booky_site_metadata_cache";
let assetGeneradosCache = {};

// Validación de Autenticación y Rol de Administrador
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
        const esAdmin = await verificarRolAdmin(user);
        
        if (!esAdmin) {
            alert("Acceso denegado. No tienes permisos de administrador.");
            window.location.href = "../index.html";
            return;
        }

        await cargarMetadatos();
    } else {
        console.log('Usuario no autenticado');
        window.location.href = "../login.html";
    }
});

async function verificarRolAdmin(user) {
    try {
        const userDocRef = doc(firestore, "USERS", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const rol = (userData.role || userData.rol || "").toLowerCase();
            if (rol === "admin" || rol === "superadmin" || rol === "super-admin") {
                return true;
            }
        }

        const adminsRef = collection(firestore, "ADMINS");
        const q = query(adminsRef, where("email", "==", user.email));
        const adminSnap = await getDocs(q);
        
        if (!adminSnap.empty) return true;

        return false;
    } catch (error) {
        console.error("Error al verificar rol de administrador:", error);
        return false;
    }
}

async function cargarMetadatos() {
    try {
        // 1. Intentar cargar desde el caché local del navegador primero para evitar lecturas en Firestore
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.log("Cargando metadatos desde el caché local del navegador.");
            rellenarFormularioMetadatos(JSON.parse(cachedData));
            return;
        }

        // 2. Si no hay caché, consultar Firestore
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            // Guardar en localStorage para futuras visitas
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            rellenarFormularioMetadatos(data);
        }
    } catch (error) {
        console.error("Error al cargar metadatos:", error);
    }
}

function rellenarFormularioMetadatos(data) {
    document.getElementById("meta-sitename").value = data.siteName || "";
    document.getElementById("meta-title").value = data.title || "";
    document.getElementById("meta-description").value = data.description || "";
    document.getElementById("meta-author").value = data.author || "";
    
    if (data.logo1024) {
        document.getElementById("img-preview").src = data.logo1024;
        assetGeneradosCache = {
            logo1024: data.logo1024 || "",
            favicon16: data.favicon16 || "",
            favicon32: data.favicon32 || "",
            favicon96: data.favicon96 || "",
            appleTouch: data.appleTouch || "",
            android192: data.android192 || "",
            android512: data.android512 || ""
        };
    }
}

// Función auxiliar para redimensionar y comprimir imágenes localmente mediante Canvas
function redimensionarImagenLocal(img, size, quality = 0.9) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL("image/png");
}

// Procesar vista previa y generar cada uno de los formatos localmente al seleccionar la imagen
document.getElementById("meta-image-file").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const msgEl = document.getElementById("image-validation-msg");
    const previewEl = document.getElementById("img-preview");

    if (file.type !== "image/png") {
        msgEl.textContent = "Error: El archivo debe ser estrictamente PNG (sin fondo).";
        msgEl.className = "text-xs text-red-500 mt-1";
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            previewEl.src = img.src;

            if (img.width !== 1024 || img.height !== 1024) {
                msgEl.textContent = `Advertencia: Mide ${img.width}x${img.height}px. Lo recomendado es exactamente 1024x1024px.`;
                msgEl.className = "text-xs text-amber-600 mt-1";
            } else {
                msgEl.textContent = `¡Imagen maestra de 1024x1024px válida! Comprimiendo y optimizando para Firestore...`;
                msgEl.className = "text-xs text-green-600 mt-1";
            }

            const canvas1024 = document.createElement("canvas");
            canvas1024.width = 1024;
            canvas1024.height = 1024;
            const ctx1024 = canvas1024.getContext("2d");
            ctx1024.drawImage(img, 0, 0, 1024, 1024);
            
            const logo1024Optimizado = canvas1024.toDataURL("image/webp", 0.85);

            assetGeneradosCache = {
                logo1024: String(logo1024Optimizado),
                favicon16: String(redimensionarImagenLocal(img, 16)),
                favicon32: String(redimensionarImagenLocal(img, 32)),
                favicon96: String(redimensionarImagenLocal(img, 96)),
                appleTouch: String(redimensionarImagenLocal(img, 180)),
                android192: String(redimensionarImagenLocal(img, 192)),
                android512: String(redimensionarImagenLocal(img, 512))
            };
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("metadata-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const assetsFinales = Object.keys(assetGeneradosCache).length > 0 ? assetGeneradosCache : {
        logo1024: "/assets/img/web/booky-logo.png",
        favicon16: "/assets/img/web/favicon-16x16.png",
        favicon32: "/assets/img/web/favicon-32x32.png",
        favicon96: "/assets/img/web/favicon-96x96.png",
        appleTouch: "/assets/img/web/apple-touch-icon.png",
        android192: "/assets/img/web/android-chrome-192x192.png",
        android512: "/assets/img/web/android-chrome-512x512.png"
    };

    const nuevosDatos = {
        siteName: String(document.getElementById("meta-sitename").value || ""),
        title: String(document.getElementById("meta-title").value || ""),
        description: String(document.getElementById("meta-description").value || ""),
        author: String(document.getElementById("meta-author").value || ""),
        logo1024: String(assetsFinales.logo1024),
        favicon16: String(assetsFinales.favicon16),
        favicon32: String(assetsFinales.favicon32),
        favicon96: String(assetsFinales.favicon96),
        appleTouch: String(assetsFinales.appleTouch),
        android192: String(assetsFinales.android192),
        android512: String(assetsFinales.android512)
    };

    try {
        await setDoc(docRef, nuevosDatos, { merge: true });
        // Actualizar caché local tras guardar cambios
        localStorage.setItem(CACHE_KEY, JSON.stringify(nuevosDatos));
        alert("¡Metadatos y formatos optimizados guardados correctamente en Firestore!");
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Hubo un error al guardar los cambios: " + error.message);
    }
});

// NUEVA FUNCIONALIDAD: Botón para borrar/restablecer la configuración global en Firestore
async function resetearMetadatosFirestore() {
    const confirmacion = confirm("⚠️ ¿Estás seguro de que deseas eliminar la configuración global en Firestore? La aplicación volverá a utilizar los valores por defecto del sistema.");
    if (!confirmacion) return;

    try {
        await deleteDoc(docRef);
        // Limpiar caché local también
        localStorage.removeItem(CACHE_KEY);
        alert("✔️ ¡Configuración eliminada de Firestore con éxito! La página se recargará.");
        location.reload();
    } catch (error) {
        console.error("Error al eliminar los metadatos:", error);
        alert("❌ Hubo un error al intentar borrar los datos de Firestore: " + error.message);
    }
}

// Exponer la función globalmente para que se pueda enlazar a un botón en el HTML mediante onclick="resetearMetadatosFirestore()"
window.resetearMetadatosFirestore = resetearMetadatosFirestore;