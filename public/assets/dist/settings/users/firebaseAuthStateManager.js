// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_DATABASE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_DATABASE_URL:", FIREBASE_DATABASE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import(FIREBASE_AUTH_URL);
const { getDatabase, ref, onValue } = await import(FIREBASE_DATABASE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y database
const auth = getAuth(app);
const database = getDatabase(app);

// Función para obtener el UID, correo, fecha de creación y última vez de acceso del usuario
function obtenerInformacionUsuario() {
  const user = auth.currentUser;

  if (user) {
    console.log('UID:', user.uid);
    console.log('Correo:', user.email);
    
    // Obtener fecha de creación de la cuenta
    const fechaCreacion = user.metadata.creationTime;
    console.log('Fecha de creación de la cuenta:', fechaCreacion);

    // Obtener la última vez de acceso
    const ultimaVezAcceso = user.metadata.lastSignInTime;
    console.log('Última vez de acceso:', ultimaVezAcceso);
  } else {
    console.log('Usuario no autenticado');
  }
}

// Función para obtener el UID y el correo del usuario actual
function obtenerUIDyCorreo() {
  const user = auth.currentUser;

  if (user) {
    console.log('UID:', user.uid);
    console.log('Correo:', user.email);
  } else {
    console.log('Usuario no autenticado');
  }
}

// Función para escuchar cambios en el estado de autenticación
function escucharEstadoAutenticacion() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('Usuario autenticado:', user.uid);
    } else {
      console.log('Usuario no autenticado');
    }
  });
}

// Función para imprimir todos los estados posibles de autenticación
function imprimirEstadosPosibles() {
  console.log('Estados posibles de autenticación:');
  console.log('1. onAuthStateChanged: Escucha cambios en el estado de autenticación');
  console.log('2. signInWithEmailAndPassword: Iniciar sesión con correo y contraseña');
  console.log('3. signOut: Cerrar sesión');
}

// Exportar funciones
export { obtenerUIDyCorreo, escucharEstadoAutenticacion, imprimirEstadosPosibles, obtenerInformacionUsuario };
