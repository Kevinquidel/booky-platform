// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL); // Agregado doc y getDoc

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

// Variable para almacenar el último nombre de usuario ingresado en la sesión actual
let ultimoUsernameId = sessionStorage.getItem('ultimoUsernameId') || "";

// Obtener el elemento del campo de entrada y el elemento del mensaje desde el DOM
const usernameInput = document.getElementById('usernameId');
const mensajeUsuario = document.getElementById('mensajeUsuario');
const btnSiguientePaso = document.getElementById('btnSiguientePaso'); // Asegúrate de usar el ID correcto

usernameInput.addEventListener('input', async () => {
    const usernameId = usernameInput.value.trim();

    // Verificar la entrada del usuario
    if (!validarEntradaUsuario(usernameId)) return;

    // Primero, validar si el usuario actual es el mismo que el del documento
    const esUsuarioActual = await validarUsuarioActualConDocumento(usernameId);
    if (esUsuarioActual) return; // Si es el usuario actual, ya se mostró un mensaje apropiado

    // Luego, validar la existencia del usernameId si no es el usuario actual
    const usernameIdExistente = await validarExistenciaUsernameId(usernameId);
    if (usernameIdExistente) {
        mostrarMensaje('Este nombre de usuario ya está en uso. Por favor, elija otro.');
        btnSiguientePaso.disabled = true;
        usernameInput.style.borderColor = 'red';
    } else {
        mostrarMensaje('Este nombre de usuario está disponible. Puede utilizarlo.');
        btnSiguientePaso.disabled = false;
        usernameInput.style.borderColor = 'green';
    }
});

function mostrarMensaje(mensaje) {
    mensajeUsuario.textContent = mensaje;
}

function validarEntradaUsuario(usernameId) {
    if (usernameId.length < 3 || usernameId.length > 15) {
        mostrarMensaje('El nombre de usuario debe tener entre 3 y 15 caracteres.');
        btnSiguientePaso.disabled = true;
        usernameInput.style.borderColor = 'red';
        return false;
    }

    const caracteresEspeciales = /[!@#$%^&*(),.?":{}|<>]/;
    if (caracteresEspeciales.test(usernameId)) {
        mostrarMensaje('El nombre de usuario no puede contener caracteres especiales.');
        btnSiguientePaso.disabled = true;
        usernameInput.style.borderColor = 'red';
        return false;
    }

    return true;
}

async function validarExistenciaUsernameId(usernameId) {
    const usersCollectionRef = collection(firestore, 'USERS');
    try {
        const querySnapshot = await getDocs(query(usersCollectionRef, where('usernameId', '==', usernameId)));
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error al validar la existencia del usernameId:', error);
        mostrarMensaje('Hubo un error al validar el nombre de usuario. Inténtelo de nuevo.');
        btnSiguientePaso.disabled = true;
        return false;
    }
}

async function validarUsuarioActualConDocumento(usernameId) {
    const user = auth.currentUser;
    if (!user) {
        console.error('No hay un usuario autenticado.');
        mostrarMensaje('Por favor, inicie sesión para continuar.');
        return false;
    }

    const currentUserId = user.uid;
    const docRef = doc(firestore, "USERS", currentUserId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().usernameId === usernameId) {
            mostrarMensaje('Este es el usuario actual. Puede editar su nombre de usuario.');
            btnSiguientePaso.disabled = false;
            usernameInput.style.borderColor = 'green';
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al validar el usuario actual con el documento:', error);
        mostrarMensaje('Hubo un error al validar el usuario. Inténtelo de nuevo.');
        btnSiguientePaso.disabled = true;
        return false;
    }
}
