// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica (usando Popup)
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const baseUrl = window.location.origin;
const googleLoginButton = document.getElementById('googleLoginButton');
const registerForm = document.getElementById('registerForm');

if (googleLoginButton) {
  googleLoginButton.addEventListener('click', () => loginWithGoogle());
}

if (registerForm) {
  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitRegisterForm();
  });
}

// Función para registrarse/iniciar sesión con Google mediante Popup
async function loginWithGoogle() {
  console.log('Función loginWithGoogle ejecutada');
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result && result.user) {
      handleAuthResult(result.user);
    }
  } catch (error) {
    console.error("Error en el popup de Google:", error.code, error.message);
    if (error.code === 'auth/popup-closed-by-user') {
      showNotification("Ventana de registro cerrada.");
    } else {
      handleFirebaseError(error);
    }
  }
}

function submitRegisterForm() {
  const emailInput = document.getElementById('emailRegister');
  const passwordInput = document.getElementById('passwordRegister');

  if (!emailInput || !passwordInput) {
    console.error('Error: Elementos de entrada no encontrados.');
    showNotification('Error interno: Elementos del formulario no encontrados.');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!isValidEmail(email)) {
    showNotification('El formato del correo electrónico no es válido.');
    return;
  }

  if (password.length < 6) {
    showNotification('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      if (user) {
        handleAuthResult(user);
      } else {
        console.error('Error: No se pudo obtener el usuario después de la creación de la cuenta.');
        handleFirebaseError({ code: 'user-not-found', message: 'No se pudo obtener el usuario después de la creación de la cuenta.' });
      }
    })
    .catch((error) => handleFirebaseError(error));
}

function sendVerificationEmail(user) {
  sendEmailVerification(user)
    .then(() => {
      redirectToVerificationPage(user);
    })
    .catch((error) => handleFirebaseError(error));
}

function redirectToVerificationPage(user) {
  const verificationUrl = buildVerificationURL(user);
  window.location.href = verificationUrl;
}

function buildVerificationURL(user) {
  const actionURL = getActionURL();
  return `${baseUrl}/dashboard/auth/action/verificacion.html?${actionURL}&oobCode=${user.uid}`;
}

function getActionURL() {
  return 'action=verifyEmail';
}

function handleAuthResult(user) {
  if (user && user.emailVerified) {
    redirectToMainPage();
  } else {
    // Si el correo no está verificado, envía el correo de verificación
    sendVerificationEmail(user);
  }
}

function redirectToMainPage() {
  console.log('Redirigiendo a la página principal...');
  window.location.href = 'create-account.html';
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function handleFirebaseError(error) {
  console.error('Error de Firebase:', error.code, error.message);

  const errorMessages = {
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/user-disabled': 'El usuario ha sido deshabilitado.',
    'auth/user-not-found': 'No se encontró un usuario con ese correo.',
    'auth/wrong-password': 'La contraseña es incorrecta.',
    'auth/weak-password': 'La contraseña es demasiado débil.',
    'auth/email-already-in-use': 'El correo electrónico ya está en uso.',
    'auth/operation-not-allowed': 'La operación no está permitida.',
    'auth/requires-recent-login': 'La autenticación reciente es necesaria. Por favor, vuelve a iniciar sesión.',
    'auth/too-many-requests': 'Demasiados intentos. Por favor, inténtalo más tarde.',
  };

  const userFriendlyMessage = errorMessages[error.code] || 'Ocurrió un error durante la autenticación. Por favor, intenta de nuevo más tarde.';
  
  // Mostrar notificación visual en lugar de solo consola
  if (typeof showNotification === 'function') {
    showNotification(userFriendlyMessage);
  }
}