// Importar la configuración de Firebase
import { firebaseConfig } from "../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar los módulos de Firebase desde el CDN de forma dinámica (se mantiene global como requiere ES Modules)
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged, signOut } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase con la configuración importada
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Función para habilitar o deshabilitar elementos según el estado de autenticación
function toggleElementsBasedOnAuthState(user) {
  const loginButton = document.getElementById('login-button');
  const signupButton = document.getElementById('signup-button');
  const menuLogoutBtn = document.getElementById('menuLogoutBtn');
  
  // Elementos del saludo y contenedor de perfil
  const userGreeting = document.getElementById('userGreeting');
  const usernameDisplay = document.getElementById('usernameDisplay');
  const bookyNavContainer = document.querySelector('.booky-nav-container') || document.getElementById('booky-nav-container');

  if (user) {
    // --- EL USUARIO ESTÁ AUTENTICADO ---
    if (loginButton) loginButton.style.display = 'none';
    if (signupButton) signupButton.style.display = 'none';

    if (userGreeting) userGreeting.classList.remove('is-hidden');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.displayName || "Usuario";
    }

    if (bookyNavContainer) {
      bookyNavContainer.style.display = '';
      bookyNavContainer.classList.remove('is-hidden');
    }
  } else {
    // --- EL USUARIO NO ESTÁ AUTENTICADO ---
    if (loginButton) loginButton.style.display = 'inline-block';
    if (signupButton) signupButton.style.display = 'inline-block';

    if (userGreeting) userGreeting.classList.add('is-hidden');

    if (bookyNavContainer) {
      bookyNavContainer.style.display = 'none';
    }
  }

  // Vincular el evento de cerrar sesión del menú desplegable si existe
  if (menuLogoutBtn) {
    const newLogoutBtn = menuLogoutBtn.cloneNode(true);
    menuLogoutBtn.parentNode.replaceChild(newLogoutBtn, menuLogoutBtn);
    
    newLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth)
        .then(() => {
          window.location.href = '/index.html';
        })
        .catch(error => {
          console.error("Error al cerrar sesión:", error.message);
        });
    });
  }
}

// Ejecutar el observador de Firebase y los eventos de botones asegurando que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  if (firebaseApp) {
    onAuthStateChanged(auth, toggleElementsBasedOnAuthState);
  }

  // Obtener los elementos estáticos y asignarles sus eventos de navegación iniciales
  const loginButton = document.getElementById('login-button');
  const signupButton = document.getElementById('signup-button');

  if (loginButton) {
    loginButton.addEventListener('click', () => {
      window.location.href = '/dashboard/auth/login.html';
    });
  }

  if (signupButton) {
    signupButton.addEventListener('click', () => {
      window.location.href = '/dashboard/auth/signup.html';
    });
  }
}