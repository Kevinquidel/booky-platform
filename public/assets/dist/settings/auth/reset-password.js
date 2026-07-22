// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, sendPasswordResetEmail, confirmPasswordReset } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase con la configuración importada
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Función para manejar la solicitud de restablecimiento de contraseña
async function handleResetPasswordForm(email) {
  try {
    console.log('Enviando solicitud de restablecimiento de contraseña para:', email);

    // Verificar si el correo electrónico es válido antes de enviar la solicitud
    if (!isValidEmail(email)) {
      throw new Error('Correo electrónico no válido.');
    }

    await sendPasswordResetEmail(auth, email);

    console.info('Correo electrónico de restablecimiento enviado correctamente.');

    // Redirigir a la página de confirmación de envío de correo electrónico exitosa
    window.location.href = '/dashboard/auth/action/send-email-reset-password-exitosa.html';
  } catch (error) {
    console.error('Error al enviar el correo electrónico de restablecimiento:', error.message);
    // Mostrar el error en la página
    document.getElementById('errorMessageResetPassword').textContent = `Error: ${error.message}`;
  }
}

// Función para manejar el cambio de contraseña
async function handleChangePasswordForm(newPassword, confirmPassword, oobCode) {
  try {
    console.log('Cambiando la contraseña...');
    console.log('Nuevo Password:', newPassword);
    console.log('Confirmar Password:', confirmPassword);
    console.log('Código OOB:', oobCode);

    // Verificar que el código OOB esté presente
    if (!oobCode) {
      console.error('Código OOB no válido.');
      // Mostrar el mensaje en la página
      document.getElementById('errorMessageResetPassword').textContent = 'Código OOB no válido.';
      return;
    }

    // Cambiar la contraseña usando la función de Firebase
    await confirmPasswordReset(auth, oobCode, newPassword);

    console.info('Contraseña cambiada correctamente.');

    // Redirigir a la página de verificación exitosa
    window.location.href = '/dashboard/auth/action/reset-password-exitosa.html';
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error.message);

    // Verificar si el error se debe a un código OOB no válido
    if (error.code === 'auth/expired-action-code' || error.code === 'auth/invalid-action-code') {
      // Redirigir a la página de error en cambio de contraseña
      window.location.href = '/dashboard/auth/action/reset-password-error.html';
    } else {
      // Mostrar el error en la página
      document.getElementById('errorMessageResetPassword').textContent = `Error: ${error.message}`;
    }
  }
}

// Función para validar la dirección de correo electrónico
function isValidEmail(email) {
  // Puedes implementar una lógica más avanzada para validar el formato del correo electrónico
  return /\S+@\S+\.\S+/.test(email);
}

// Función para obtener el código OOB de la URL
function getOobCodeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('oobCode');
}

// Función para almacenar el código OOB en sessionStorage
function storeOobCodeInSession(oobCode) {
  sessionStorage.setItem('oobCode', oobCode);
}

// Función para obtener el código OOB de sessionStorage
function getOobCodeFromSession() {
  return sessionStorage.getItem('oobCode');
}

// Función para verificar el correo electrónico si es necesario
async function verifyEmailIfNeeded() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'verifyEmail') {
      // Obtener el correo electrónico del usuario desde los parámetros de la URL
      const email = urlParams.get('email');

      // Obtener el código OOB
      const oobCode = urlParams.get('oobCode');

      // Realizar la verificación del correo electrónico aquí
      await handleResetPasswordForm(email);

      // Almacenar el código OOB en sessionStorage
      storeOobCodeInSession(oobCode);
    }
  } catch (error) {
    console.error('Error al verificar el correo electrónico:', error.message);
  }
}

// Obtener el código OOB de sessionStorage
let oobCode = sessionStorage.getItem('oobCode');
console.log('Código OOB obtenido de sessionStorage:', oobCode);

// Si no se encuentra el código OOB en sessionStorage, intentar obtenerlo de la URL
if (!oobCode) {
  oobCode = getOobCodeFromUrl();
  console.log('Código OOB obtenido de la URL:', oobCode);
}

// Detectar la página actual
const currentPage = window.location.pathname;

// Manejar eventos según la página actual
if (currentPage === '/dashboard/auth/action/send-email-reset-password.html') {
  // Página de solicitud de restablecimiento de contraseña
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('email').value;
      await handleResetPasswordForm(email);
    });
  }
} else if (currentPage === '/dashboard/auth/action/change-password.html') {
  // Página de cambio de contraseña
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Verificar si el código OOB está presente en sessionStorage
      if (!oobCode) {
        console.error('Código OOB no válido.');
        // Redirigir a la página de error en cambio de contraseña
        window.location.href = '/dashboard/auth/action/reset-password-error.html';
        return;
      }

      await handleChangePasswordForm(newPassword, confirmPassword, oobCode);
    });
  }

  // Añadir el event listener al botón en lugar del atributo onclick
  const resetPasswordButton = document.getElementById('resetPasswordButton');
  if (resetPasswordButton) {
    resetPasswordButton.addEventListener('click', async () => {
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Verificar si el código OOB está presente en sessionStorage
      if (!oobCode) {
        console.error('Código OOB no válido.');
        // Redirigir a la página de error en cambio de contraseña
        window.location.href = '/dashboard/auth/action/reset-password-error.html';
        return;
      }

      await handleChangePasswordForm(newPassword, confirmPassword, oobCode);
    });
  }
}
