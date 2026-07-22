// Importar la configuración de Firebase
import { firebaseConfig } from "../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

// Función para obtener el UID y el correo del usuario actual
function obtenerUIDyCorreo() {
  const user = auth.currentUser;

  if (user) {
    console.group('%cDatos del Usuario', 'color: #2ecc71; font-weight: bold;');
    console.log('UID:', user.uid);
    console.log('Correo:', user.email);
    console.groupEnd();
    return { uid: user.uid, email: user.email };
  } else {
    console.group('%cUsuario no autenticado', 'color: #e74c3c; font-weight: bold;');
    console.log('Usuario no autenticado');
    console.groupEnd();
    return null;
  }
}

// Función para verificar el estado de la cuenta en Firestore
async function verificarEstadoCuenta(uid) {
    // Obtener el documento del usuario en Firestore
    const userDocRef = doc(firestore, 'USERS', uid);
  
    try {
      const docSnapshot = await getDoc(userDocRef);
  
      if (docSnapshot.exists()) {
        // Verificar si el campo estadoCuenta existe en el documento
        const userData = docSnapshot.data();        
        if (userData && userData.hasOwnProperty('estadoCuenta') && userData.estadoCuenta === true) {
          console.log('La cuenta está activa.');

        // Si intenta acceder a la página de creación de cuenta, redirigir a index.html
        if (isCurrentPage("/dashboard/auth/create-account.html")) {
          window.location.href = "../../index.html";
          return; // Finalizar la ejecución aquí
        }  
          
        } else {
          // Mostrar la notificación solo si no estamos en la página correcta
          const createAccountUrl = "/dashboard/auth/create-account.html";
          if (!isCurrentPage(createAccountUrl)) {
            showNotificationAndRedirect('¡Oops! Tu cuenta no está activa o falta información. Completa el formulario de creación de cuenta para empezar a disfrutar de nuestros servicios.', 20);
          }
        }
      } else {
        console.error('No se encontró el documento del usuario en Firestore.');
      }

       // Mostrar notificación si estamos en la página correcta
      if (isCurrentPage("/dashboard/auth/create-account.html")) {
        showGreenNotification('Bienvenido a la página de creación de cuenta.');
        
      }

    } catch (error) {
      console.error('Error al verificar el estado de la cuenta en Firestore:', error);
    }
}



// Función para mostrar la notificación con cuenta regresiva y redireccionar
function showNotificationAndRedirect(message, countdownSeconds) {
  // Mostrar el mensaje con cuenta regresiva
  showNotification(message);

  // Mostrar la cuenta regresiva
  const countdownElement = document.createElement('div');
  countdownElement.id = 'countdown';
  countdownElement.style.position = 'fixed';
  countdownElement.style.bottom = '20px';
  countdownElement.style.left = '50%';
  countdownElement.style.transform = 'translateX(-50%)';
  countdownElement.style.backgroundColor = '#333';
  countdownElement.style.color = '#fff';
  countdownElement.style.padding = '10px';
  countdownElement.style.borderRadius = '5px';
  countdownElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
  countdownElement.style.zIndex = '1000'; 
  document.body.appendChild(countdownElement);

  let secondsLeft = countdownSeconds;

  const countdownInterval = setInterval(function() {
    countdownElement.textContent = `Redireccionando en ${secondsLeft} segundos...`;
    secondsLeft--;

    if (secondsLeft < 0) {
      clearInterval(countdownInterval);
      redirectIfAccountInactive();
    }
  }, 1000); // Actualizar cada segundo
}

// Función para mostrar la notificación
function showNotification(message) {
  
  // Mostrar el mensaje
  const notificationElement = document.createElement('div');
  notificationElement.id = 'mensaje';
  notificationElement.textContent = message;
  notificationElement.style.position = 'fixed';
  notificationElement.style.top = '20px';
  notificationElement.style.left = '50%';
  notificationElement.style.transform = 'translateX(-50%)';
  notificationElement.style.width = '80%';
  notificationElement.style.maxWidth = '400px';
  notificationElement.style.backgroundColor = '#ff6347';
  notificationElement.style.color = '#fff';
  notificationElement.style.padding = '20px';
  notificationElement.style.borderRadius = '10px';
  notificationElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
  notificationElement.style.textAlign = 'center';
  notificationElement.style.zIndex = '1000';
  document.body.appendChild(notificationElement);
}

// Función para mostrar la notificación
function showGreenNotification(message) {
  // Mostrar el mensaje
  const notificationElement = document.createElement('div');
  notificationElement.id = 'mensaje';
  notificationElement.textContent = message;
  notificationElement.style.position = 'fixed';
  notificationElement.style.top = '20px';
  notificationElement.style.left = '50%';
  notificationElement.style.transform = 'translateX(-50%)';
  notificationElement.style.width = '80%';
  notificationElement.style.maxWidth = '400px';
  notificationElement.style.backgroundColor = '#2ECC71'; // Verde
  notificationElement.style.color = '#fff'; // Texto en blanco
  notificationElement.style.padding = '20px';
  notificationElement.style.borderRadius = '10px';
  notificationElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
  notificationElement.style.textAlign = 'center';
  notificationElement.style.zIndex = '1000';
  document.body.appendChild(notificationElement);

  // Ocultar la notificación después de 10 segundos
  setTimeout(() => {
    notificationElement.style.display = 'none';
  }, 5000); // 10000 milisegundos = 10 segundos
}



// Función para verificar si la URL actual es la misma que la de destino
function isCurrentPage(url) {
  return window.location.pathname === url;
}

// Función para redireccionar si la cuenta no está activa
function redirectIfAccountInactive() {
  const createAccountUrl = "/dashboard/auth/create-account.html";
  if (!isCurrentPage(createAccountUrl)) {
    window.location.href = createAccountUrl;
  }
}

// Escuchar cambios en el estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario autenticado, mostrar UID y correo en la consola
    const { uid } = obtenerUIDyCorreo();
    // Verificar el estado de la cuenta después de obtener el UID
    verificarEstadoCuenta(uid);
  } else {
    console.log('Usuario no autenticado');
    // Redirigir al usuario a /index.html si está en /public/dashboard/auth/create-account.html y no está autenticado
    if (isCurrentPage("/dashboard/auth/create-account.html")) {
      window.location.href = "../index.html";
    }
  }
});
