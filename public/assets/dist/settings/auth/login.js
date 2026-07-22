// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, signInWithRedirect, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const baseUrl = window.location.origin;
const googleLoginButton = document.getElementById('googleLoginButton');
const loginButton = document.getElementById('loginButton');
const signupButton = document.querySelector('.signup-link');
const email = document.getElementById('emailLogin');
const password = document.getElementById('passwordLogin');
const errorElement = document.getElementById('errorMessage');

if (googleLoginButton) {
  googleLoginButton.addEventListener('click', () => loginWithGoogle());
}

if (loginButton) {
  loginButton.addEventListener('click', () => submitLoginForm());
}

if (signupButton) {
  signupButton.addEventListener('click', () => redirectToSignup());
}

// Función para iniciar sesión con Google
function loginWithGoogle() {
  signInWithRedirect(auth, new GoogleAuthProvider());
}

// Función para enviar el formulario de inicio de sesión con correo electrónico y contraseña
function submitLoginForm() {
  const emailValue = email.value.trim();
  const passwordValue = password.value;

  if (!emailValue || !passwordValue) {
    showErrorMessage('Ingresa un correo electrónico y una contraseña válidos');
    return;
  }

  signInWithEmailAndPassword(auth, emailValue, passwordValue)
    .then(async (result) => {
      // Validar si el usuario está inhabilitado antes de dejarlo pasar
      const user = result.user;
      const userValidado = await verificarEstadoUsuario(user);
      if (userValidado) {
        redirectToMainPage();
      }
    })
    .catch((error) => handleLoginError(error));
}

// Función para verificar en Firestore si el usuario está inhabilitado
async function verificarEstadoUsuario(user) {
  try {
    const userDocRef = doc(firestore, "USERS", user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.disabled === true) {
        await signOut(auth); // Cerramos sesión inmediatamente
        showErrorMessage('Tu cuenta ha sido inhabilitada por un administrador.');
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error al verificar el estado del usuario:", error);
    return true; // Permitir en caso de error de lectura para no bloquear por fallos de red
  }
}

// Función para manejar errores de inicio de sesión
function handleLoginError(error) {
  if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
    showErrorMessage('Correo electrónico o contraseña incorrectos.');
  } else {
    showErrorMessage('No se pudo iniciar sesión. Verifica tus credenciales.');
  }
}

// Redirigir a la página principal después de iniciar sesión
function redirectToMainPage() {
  const urlToIndex = `../../index.html`;
  window.location.href = urlToIndex;
}

// Redirigir a la página de registro
function redirectToSignup() {
  const urlToSignup = `./signup.html`;
  window.location.href = urlToSignup;
}

// Mostrar mensajes de error y éxito
function showErrorMessage(message) {
  showErrorNotification(message);
}

function showSuccessMessage(message) {
  showSuccessNotification(message);
}

// Mostrar notificación de error
function showErrorNotification(message) {
  errorElement.textContent = message;
  errorElement.className = 'error-notification'; 
  errorElement.style.display = 'block';
}

// Mostrar notificación de éxito
function showSuccessNotification(message) {
  errorElement.textContent = message;
  errorElement.className = 'success-notification'; 
  errorElement.style.display = 'block';
}

// Comprobar el estado de autenticación (también valida al usar Google Redirect)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Usuario autenticado:', user);
    const userValidado = await verificarEstadoUsuario(user);
    if (userValidado) {
      redirectToMainPage(); 
    }
  } else {
    console.log('Usuario no autenticado');
  }
});