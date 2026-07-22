// Importar la configuración de Firebase
import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Función para inicializar los datos del perfil cuando el DOM está listo o la vista es inyectada
export function inicializarPerfil() {
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileRole = document.getElementById("profile-role");
    const profilePhone = document.getElementById("profile-phone");
    const profileStatus = document.getElementById("profile-status");
    const profileLastAccess = document.getElementById("profile-last-access");
    const profileCreated = document.getElementById("profile-created");

    if (!profileEmail) {
        console.log("Vista de perfil no detectada todavía en el DOM.");
        return; 
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario autenticado detectado en perfil:", user.uid);
            console.log("Correo:", user.email);

            profileEmail.textContent = user.email || "No registrado";
            profileName.textContent = user.displayName || "Usuario de Booky";
            profileRole.textContent = "Cargando...";

            try {
                const userDocRef = doc(firestore, "USERS", user.uid);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    console.log("Datos de usuario obtenidos de Firestore:", userData);
                    
                    // 1. Nombre / DisplayName
                    const nombreCompleto = userData.displayName || userData.nombre || userData.name || userData.nombres;
                    if (nombreCompleto) {
                        profileName.textContent = nombreCompleto;
                    }

                    // 2. Rol
                    const rol = userData.role || userData.rol || 'cliente';
                    profileRole.textContent = rol.charAt(0).toUpperCase() + rol.slice(1);

                    // 3. Teléfono (Campo: phone)
                    if (profilePhone) {
                        profilePhone.textContent = userData.phone || userData.telefono || "No registrado";
                    }

                    // 4. Estado de Cuenta (Campo: estadoCuenta)
                    if (profileStatus) {
                        if (userData.estadoCuenta === true) {
                            profileStatus.textContent = "Activa";
                            profileStatus.style.color = "#16a34a"; // Verde para activo
                        } else if (userData.estadoCuenta === false) {
                            profileStatus.textContent = "Inactiva";
                            profileStatus.style.color = "#dc2626"; // Rojo para inactivo
                        } else {
                            profileStatus.textContent = userData.estadoCuenta || "No especificado";
                        }
                    }

                    // 5. Último Acceso (Campo: ultimaVezAcceso - suele ser Timestamp o String)
                    if (profileLastAccess) {
                        let ultimoAccesoTexto = "No disponible";
                        if (userData.ultimaVezAcceso) {
                            // Si es un Timestamp de Firestore, lo convertimos a fecha legible si tiene .toDate()
                            if (typeof userData.ultimaVezAcceso.toDate === 'function') {
                                ultimoAccesoTexto = userData.ultimaVezAcceso.toDate().toLocaleString();
                            } else {
                                ultimoAccesoTexto = userData.ultimaVezAcceso;
                            }
                        }
                        profileLastAccess.textContent = ultimoAccesoTexto;
                    }

                    // 6. Miembro Desde (Campo: createdAt)
                    if (profileCreated) {
                        let creadoTexto = "No disponible";
                        if (userData.createdAt) {
                            if (typeof userData.createdAt.toDate === 'function') {
                                creadoTexto = userData.createdAt.toDate().toLocaleString();
                            } else {
                                creadoTexto = userData.createdAt;
                            }
                        }
                        profileCreated.textContent = creadoTexto;
                    }

                    console.log("Todos los campos de Firestore (excepto citas) cargados correctamente.");
                } else {
                    console.log("El documento del usuario no existe en Firestore, asignando valores por defecto.");
                    profileRole.textContent = "Cliente";
                }
            } catch (error) {
                console.error("Error al obtener los datos de Firestore para el perfil:", error);
                profileRole.textContent = "Cliente";
            }
        } else {
            console.log("No hay sesión activa, redirigiendo al login...");
            window.location.href = "../auth/login.html";
        }
    });
}

// Ejecutar al cargar la página directamente o al ser inyectado dinámicamente
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarPerfil);
} else {
    inicializarPerfil();
}