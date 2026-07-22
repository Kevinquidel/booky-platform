// Importar la configuración de Firebase
import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

// Importar los módulos de Firebase desde el CDN de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged, signOut } = await import(FIREBASE_AUTH_URL);

// Inicializar Firebase con la configuración importada
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

document.addEventListener('DOMContentLoaded', function() {
  // Elementos de la interfaz
  const repositoryFolder = document.getElementById('repository');
  const logoutButton = document.getElementById('logout-button');
  const menuLogoutBtn = document.getElementById('menuLogoutBtn');
  const loginButton = document.getElementById('login-button');
  const signupButton = document.getElementById('signup-button');
  
  // Elementos del saludo y contenedor de perfil
  const userGreeting = document.getElementById('userGreeting');
  const usernameDisplay = document.getElementById('usernameDisplay');
  const bookyNavContainer = document.querySelector('.booky-nav-container') || document.getElementById('booky-nav-container');

  // Verificar el estado del caché inmediatamente al cargar para evitar parpadeos
  updateUIBasedOnAuth(localStorage.getItem('isUserLoggedIn') === 'true');

  // Observador del estado de autenticación de Firebase
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // El usuario ha iniciado sesión
      localStorage.setItem('isUserLoggedIn', 'true');
      updateUIBasedOnAuth(true, user);
    } else {
      // El usuario no ha iniciado sesión
      localStorage.setItem('isUserLoggedIn', 'false');
      updateUIBasedOnAuth(false);
    }
  });

  function updateUIBasedOnAuth(isLoggedIn, user = null) {
    if (isLoggedIn) {
      showElement(repositoryFolder);
      showElement(logoutButton);
      hideElement(loginButton);
      hideElement(signupButton);
      
      // Mostrar saludo y perfil cuando SÍ hay sesión
      showElement(userGreeting);
      if (usernameDisplay && user) {
        usernameDisplay.textContent = user.displayName || "Usuario";
      }
      showElement(bookyNavContainer);
    } else {
      hideElement(repositoryFolder);
      hideElement(logoutButton);
      showElement(loginButton);
      showElement(signupButton);
      
      // Ocultar saludo y perfil cuando NO hay sesión
      hideElement(userGreeting);
      hideElement(bookyNavContainer);
    }
  }

  function showElement(element) {
    if (element) {
      element.style.display = '';
      element.classList.remove('is-hidden');
    }
  }

  function hideElement(element) {
    if (element) {
      element.style.display = '';
      element.classList.add('is-hidden');
    }
  }

  // Vincular eventos de redirección para Login y Registro
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

  // Configurar la acción de cerrar sesión (tanto para botón clásico como para el menú desplegable)
  const handleLogout = (e) => {
    if (e) e.preventDefault();
    signOut(auth)
      .then(() => {
        localStorage.setItem('isUserLoggedIn', 'false');
        window.location.href = '/index.html';
      })
      .catch(error => {
        console.error("Error al cerrar sesión:", error.message);
      });
  };

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (menuLogoutBtn) {
    const newLogoutBtn = menuLogoutBtn.cloneNode(true);
    menuLogoutBtn.parentNode.replaceChild(newLogoutBtn, menuLogoutBtn);
    newLogoutBtn.addEventListener('click', handleLogout);
  }
});