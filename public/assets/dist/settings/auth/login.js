// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica (usando Popup en lugar de Redirect)
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc, setDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const loginForm = document.getElementById('loginForm');
const googleLoginButton = document.getElementById('googleLoginButton');
const signupButton = document.querySelector('.signup-link');
const email = document.getElementById('emailLogin');
const password = document.getElementById('passwordLogin');
const errorElement = document.getElementById('errorMessage');

// Escuchar el evento submit del formulario
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Previene la recarga tradicional de la página
    await submitLoginForm();
  });
}

if (googleLoginButton) {
  googleLoginButton.addEventListener('click', (event) => {
    event.preventDefault();
    loginWithGoogle();
  });
}

if (signupButton) {
  signupButton.addEventListener('click', () => redirectToSignup());
}

// Función para iniciar sesión con Google mediante Popup
async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("Autenticación con Google exitosa:", result.user.uid);
    // onAuthStateChanged se encargará automáticamente de verificar el usuario y redirigir
  } catch (error) {
    console.error("Error en el popup de Google:", error.code, error.message);
    if (error.code === 'auth/popup-closed-by-user') {
      showErrorMessage("Ventana de inicio de sesión cerrada.");
    } else {
      showErrorMessage("No se pudo completar el inicio de sesión con Google.");
    }
  }
}

// Función para enviar el formulario de inicio de sesión con correo electrónico y contraseña
async function submitLoginForm() {
  const emailValue = email.value.trim();
  const passwordValue = password.value;

  console.log("Intentando iniciar sesión con correo:", emailValue);

  if (!emailValue || !passwordValue) {
    showErrorMessage('Ingresa un correo electrónico y una contraseña válidos');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, emailValue, passwordValue);
  } catch (error) {
    console.error("Código de error Firebase:", error.code);
    console.error("Mensaje completo de error:", error.message);
    handleLoginError(error);
  }
}

// Función para verificar o crear automáticamente el estado del usuario en Firestore
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
    } else {
      // Si el usuario no tiene documento (primer ingreso con Google), se lo creamos
      console.log("El usuario no tiene documento en USERS. Creando registro inicial...");
      await setDoc(userDocRef, {
        email: user.email,
        nombre: user.displayName || "Usuario",
        createdAt: new Date().toISOString(),
        disabled: false
      });
    }
    return true;
  } catch (error) {
    console.error("Error al verificar o crear el estado del usuario:", error);
    return true; 
  }
}

// Función para manejar errores de inicio de sesión
function handleLoginError(error) {
  if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
    showErrorMessage('Correo electrónico o contraseña incorrectos.');
  } else if (error.code === 'auth/invalid-email') {
    showErrorMessage('El formato del correo electrónico no es válido.');
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

// Mostrar mensajes de error
function showErrorMessage(message) {
  errorElement.textContent = message;
  errorElement.className = 'error-notification'; 
  errorElement.style.display = 'block';
}

// Único guardián y controlador de estado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('Usuario autenticado:', user.uid);
    const userValidado = await verificarEstadoUsuario(user);
    if (userValidado) {
      redirectToMainPage(); 
    }
  } else {
    console.log('Usuario no autenticado');
  }
});