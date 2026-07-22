import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let datosUsuarioCached = null;
let correoBackupCached = "";

function setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value || ''; 
        console.log(`%c Campo rellenado -> ID: ${elementId}`, 'color: #2ecc71');
    }
}

// 🔥 Función unificada para actualizar el avatar y controlar de forma absoluta el botón eliminar
function actualizarAvatares() {
    if (!datosUsuarioCached) return;

    const nombre = datosUsuarioCached.displayName || "U";
    const primeraLetra = nombre.charAt(0).toUpperCase();
    
    // Obtenemos el campo de la foto de Firestore
    const rawFoto = datosUsuarioCached.photoProfile || datosUsuarioCached.photoURL || datosUsuarioCached.photoUrl;
    
    // Depuración en consola para ver qué contiene exactamente Firestore
    console.log("Valor de foto en Firestore:", rawFoto ? (typeof rawFoto === 'string' ? `String de longitud ${rawFoto.length}` : typeof rawFoto) : "Vacío/Nulo");

    // Verificación estricta: Debe ser un string válido y mayor a 50 caracteres (para descartar rutas rotas o strings vacíos)
    const tieneFotoValida = typeof rawFoto === 'string' && rawFoto.trim().length > 50;
    const fotoUrl = tieneFotoValida ? rawFoto : null;

    // 1. Actualizar el avatar del panel superior (Navbar)
    const contenedorPerfil = document.getElementById('contenedorPerfil');
    if (contenedorPerfil) {
        const imagenNavbar = contenedorPerfil.querySelector('img');
        const letraNavbar = contenedorPerfil.querySelector('#primeraLetraContainer');
        
        if (letraNavbar) letraNavbar.textContent = primeraLetra;

        if (fotoUrl && imagenNavbar) {
            imagenNavbar.src = fotoUrl;
            imagenNavbar.style.cssText = "display: block !important; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;";
            if (letraNavbar) letraNavbar.style.cssText = "display: none !important;";
        } else {
            if (imagenNavbar) imagenNavbar.style.display = 'none';
            if (letraNavbar) letraNavbar.style.display = 'flex';
        }
    }

    // 2. Actualizar el avatar dentro del Modal de Edición de Perfil y gestionar botón Eliminar
    const modalSection = document.getElementById('profile-picture-section');
    if (modalSection) {
        const imagenModal = modalSection.querySelector('#imagenPerfil');
        const letraModal = modalSection.querySelector('#primeraLetraContainer');
        const btnEliminar = modalSection.querySelector('#eliminarFotoPerfilBtn');

        if (letraModal) letraModal.textContent = primeraLetra;

        if (fotoUrl && imagenModal) {
            imagenModal.src = fotoUrl;
            imagenModal.style.cssText = "display: block !important; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;";
            if (letraModal) letraModal.style.cssText = "display: none !important;";
            
            // Mostrar botón eliminar solo si hay foto válida asegurada
            if (btnEliminar) {
                btnEliminar.style.setProperty('display', 'inline-block', 'important');
            }
        } else {
            if (imagenModal) imagenModal.style.display = 'none';
            if (letraModal) letraModal.style.display = 'flex';
            
            // Ocultar de forma forzosa y prioritaria el botón eliminar
            if (btnEliminar) {
                btnEliminar.style.setProperty('display', 'none', 'important');
            }
        }
    }
}

// 🔥 Rellena el saludo en la barra de navegación y lo muestra
function mostrarSaludoNavbar() {
    if (!datosUsuarioCached) return;

    const usernameDisplay = document.getElementById('usernameDisplay');
    const userGreeting = document.getElementById('userGreeting');

    if (usernameDisplay && datosUsuarioCached.displayName) {
        usernameDisplay.textContent = datosUsuarioCached.displayName;
        console.log('%c El saludo de la navbar ha sido configurado.', 'color: #2ecc71');
    }

    if (userGreeting) {
        userGreeting.classList.remove('is-hidden');
    }

    // 🔥 Inyección integrada de los datos en el dropdown menu
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    const menuRole = document.getElementById('menuRole'); // <--- Agregado

    if (menuUserName) {
        menuUserName.textContent = datosUsuarioCached.displayName || "Usuario";
    }
    if (menuUserEmail) {
        menuUserEmail.textContent = datosUsuarioCached.userEmail || correoBackupCached || "usuario@correo.com";
    }
    if (menuRole) {
        menuRole.textContent = datosUsuarioCached.role || "cliente"; // <--- Agregado para inyectar el rol
    }

    actualizarAvatares();
}

function aplicarDatosEnInputs() {
    if (!datosUsuarioCached) return;

    console.log('%c Inyectando datos en los campos del modal...', 'color: #9b59b6; font-weight: bold;');
    setValue('displayName', datosUsuarioCached.displayName);
    setValue('userEmail', datosUsuarioCached.userEmail || correoBackupCached); 
    setValue('phone', datosUsuarioCached.phone);
    setValue('birthDate', datosUsuarioCached.birthDate);
    
    actualizarAvatares();
}

async function obtenerDatosDeBaseDeDatos(uid, backupEmail) {
    try {
        const userDocRef = doc(firestore, 'USERS', uid);
        const docSnapshot = await getDoc(userDocRef);

        if (docSnapshot.exists()) {
            datosUsuarioCached = docSnapshot.data();
            correoBackupCached = backupEmail;
            
            sessionStorage.setItem('userData', JSON.stringify(datosUsuarioCached));
            console.log("%c Datos de usuario listos en memoria.", "color: #3498db;");

            mostrarSaludoNavbar();

            if (document.getElementById('displayName')) {
                aplicarDatosEnInputs();
            }
        }
    } catch (error) {
        console.error(' Error al obtener datos desde Firestore:', error);
    }
}

window.addEventListener("modalPerfilCargado", () => {
    console.log("%c Detected: El HTML del modal ha sido inyectado dinámicamente.", "color: #f1c40f; font-weight: bold;");
    aplicarDatosEnInputs();
});

setTimeout(() => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            obtenerDatosDeBaseDeDatos(user.uid, user.email);
        }
    });
}, 1200);