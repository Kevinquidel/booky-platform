// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc, updateDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// ==========================================================================
// CARGA UNIFICADA DE DATOS DEL USUARIO (PERFIL Y FOTO)
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('Usuario no autenticado');
        return;
    }

    try {
        const userDocRef = doc(firestore, 'USERS', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
            console.error('El documento del usuario no existe en Firestore.');
            return;
        }

        const data = docSnap.data();
        const usernameId = data.displayName || data.usernameId || user.email || 'U';
        const fotoPerfilURL = data.photoProfile;

        actualizarInterfacesVisuales(usernameId, fotoPerfilURL);

        if (data.role === 'admin') {
            const adminTab = document.getElementById("adminPanelTab");
            if (adminTab) adminTab.style.display = "block";
        }

    } catch (error) {
        console.error('Error al cargar los datos del usuario:', error);
    }
});

// Función visual unificada para actualizar Navbar y Modal
function actualizarInterfacesVisuales(nombreOEmail, fotoURL) {
    const letra = nombreOEmail.charAt(0).toUpperCase();

    // 1. Actualizar Navbar
    const contenedorNavbar = document.getElementById('contenedorPerfil');
    if (contenedorNavbar) {
        const imgNav = contenedorNavbar.querySelector('img');
        const letraNav = contenedorNavbar.querySelector('#primeraLetraContainer');
        
        if (letraNav) letraNav.textContent = letra;

        if (imgNav && fotoURL) {
            // Si es Base64 se asigna directo, si es URL externa se le puede concatenar caché
            imgNav.src = fotoURL;
            imgNav.style.display = 'block';
            if (letraNav) letraNav.style.display = 'none';
        } else {
            if (imgNav) imgNav.style.display = 'none';
            if (letraNav) letraNav.style.display = 'flex';
        }
    }

    // 2. Actualizar Modal de Edición de Perfil
    const modalSection = document.getElementById('profile-picture-section') || document;
    const imagenPerfil = modalSection.querySelector('#imagenPerfil');
    const primeraLetraContainer = modalSection.querySelector('#primeraLetraContainer');

    if (primeraLetraContainer) primeraLetraContainer.textContent = letra;

    if (imagenPerfil && fotoURL) {
        imagenPerfil.src = fotoURL;
        imagenPerfil.style.display = 'block';
        if (primeraLetraContainer) primeraLetraContainer.style.display = 'none';
    } else {
        if (imagenPerfil) imagenPerfil.style.display = 'none';
        if (primeraLetraContainer) primeraLetraContainer.style.display = 'flex';
    }
}

// ==========================================================================
// FUNCIÓN EXPORTADA PARA SUBIR LA FOTO DESDE EL CROPPER (MODO BASE64)
// ==========================================================================
export async function subirFotoPerfilYActualizar(uid, base64data) {
    try {
        const userDocRef = doc(firestore, 'USERS', uid);
        
        // Guardamos directamente la cadena Base64 comprimida en el documento de Firestore
        await updateDoc(userDocRef, { photoProfile: base64data });

        console.log('¡Foto de perfil actualizada con éxito en Firestore!');
        
        // Recargamos la página para asegurar que todos los componentes pinten la nueva foto
        location.reload();
    } catch (error) {
        console.error('Error al actualizar la foto de perfil en Firestore:', error);
    }
}

// ==========================================================================
// ELIMINACIÓN DE FOTO DE PERFIL
// ==========================================================================
async function eliminarFotoPerfil(uid) {
    try {
        const userDocRef = doc(firestore, 'USERS', uid);
        await updateDoc(userDocRef, { photoProfile: null });
        console.log('Foto eliminada correctamente de Firestore.');
        location.reload();
    } catch (error) {
        console.error('Error al eliminar la foto de perfil:', error);
    }
}

// Listener global delegado para el botón de eliminar (compatible con modales dinámicos)
document.addEventListener('click', (event) => {
    const btnEliminar = event.target.closest('#eliminarFotoPerfilBtn');
    if (btnEliminar) {
        const modalElement = document.getElementById('confirmacionModal');
        if (!modalElement) {
            if (auth.currentUser) {
                eliminarFotoPerfil(auth.currentUser.uid);
            }
            return;
        }
        
        const confirmacionModal = new bootstrap.Modal(modalElement);
        confirmacionModal.show();

        const confirmarEliminacionBtn = document.getElementById('confirmarEliminacionBtn');
        if (confirmarEliminacionBtn) {
            confirmarEliminacionBtn.addEventListener('click', async () => {
                if (auth.currentUser) {
                    await eliminarFotoPerfil(auth.currentUser.uid);
                    confirmacionModal.hide();
                }
            }, { once: true });
        }
    }
});