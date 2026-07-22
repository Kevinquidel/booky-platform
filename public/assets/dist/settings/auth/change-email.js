// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, sendEmailVerification, updateProfile } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase con la configuración importada
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Función para manejar la solicitud de cambio de dirección de correo electrónico
async function handleChangeEmailForm(email) {
  try {
    console.log('Enviando solicitud de cambio de dirección de correo electrónico para:', email);

    // Verificar si el correo electrónico es válido antes de enviar la solicitud
    if (!isValidEmail(email)) {
      throw new Error('Correo electrónico no válido.');
    }

    // Obtener datos del usuario para personalizar el correo
    const user = auth.currentUser;
    const displayName = user.displayName; // Asegúrate de que displayName esté disponible en tu configuración

    // Configuración para el enlace de acción
    const actionCodeSettings = {
      url: window.location.origin + `/dashboard/auth/action/verificacion.html?action=verifyEmail&mode=action&oobCode=code&displayName=${displayName}`,
      handleCodeInApp: true,
    };

    // Enviar el enlace de confirmación al correo electrónico del usuario
    await sendEmailVerification(auth.currentUser, actionCodeSettings);

    // Actualizar el perfil del usuario con la nueva dirección de correo electrónico
    await updateProfile(user, { email });

    // Redirigir a la página de confirmación de envío de correo electrónico exitosa
    window.location.href = '/dashboard/auth/action/send-mail-change-email-exitosa.html';
  } catch (error) {
    console.error('Error al enviar el correo electrónico de cambio:', error.code, error.message);
    // Mostrar el error en la página
    document.getElementById('errorMessageChangeEmail').textContent = `Error: ${error.message}`;
  }
}

// Función para validar un correo electrónico
function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// Obtener el formulario y agregar un listener de evento
document.getElementById('changeEmailForm').addEventListener('submit', function (event) {
  event.preventDefault(); // Evitar que el formulario se envíe de forma predeterminada
  const email = document.getElementById('currentEmail').value;
  handleChangeEmailForm(email);
});
