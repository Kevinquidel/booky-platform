// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, applyActionCode, checkActionCode } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase con la configuración importada
const firebaseApp = initializeApp(firebaseConfig);

// Obtener una instancia de autenticación de Firebase
const auth = getAuth(firebaseApp);

// Obtener los parámetros de la URL actual
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');
const action = urlParams.get('action');
const mode = urlParams.get('mode');

// Verificar la dirección de correo electrónico en Firebase usando los parámetros
if (action === 'verifyEmail') {
  if (mode === 'verifyEmail') {
    // Realizar la verificación de correo y redirigir según corresponda
    applyActionCode(auth, oobCode)
      .then(async () => {
        // Almacenar el código OOB en sessionStorage
        sessionStorage.setItem('oobCode', oobCode);

        // Obtener información sobre la acción de código OOB
        const info = await checkActionCode(auth, oobCode);

        // Verificar si la acción es para cambiar el correo electrónico
        if (info.data.requestType === 'updateEmail') {
          // Redireccionar al usuario a la página de cambio de correo electrónico
          window.location.href = '/public/dashboard/auth/action/change-email.html';
        } else {
          // Redireccionar según corresponda
          window.location.href = '/public/dashboard/auth/action/verificacion_exitosa.html';
        }
      })
      .catch((error) => {
        console.error('Error de verificación de correo:', error);

        switch (error.code) {
          case 'auth/expired-action-code':
            console.error('El código de acción expiró');
            window.location.href = '/public/dashboard/auth/action/verificacion_expirada.html';
            break;

          case 'auth/invalid-action-code':
            console.error('El código de acción es inválido');
            window.location.href = '/public/dashboard/auth/action/verificacion_invalida.html';
            break;

          default:
            console.error('Error desconocido de verificación de correo');
            window.location.href = '/public/dashboard/auth/action/verificacion_error.html';
            break;
        }
      });
  } else if (mode === 'resetPassword') {
    // Almacenar el código OOB en sessionStorage
    sessionStorage.setItem('oobCode', oobCode);

    // Redireccionar al usuario a la página de cambio de contraseña
    window.location.href = '/public/dashboard/auth/action/change-password.html';
  }
}
