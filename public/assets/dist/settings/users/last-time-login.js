// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar Firebase con la configuración importada
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

// Función para obtener el UID y el correo del usuario actual
export function obtenerUIDyCorreo() {
  const user = auth.currentUser;

  if (user) {
    console.log('UID:', user.uid);
    console.log('Correo:', user.email);
    return { uid: user.uid, email: user.email };
  } else {
    console.error('Usuario no autenticado');
    return null;
  }
}

// Función para guardar o actualizar el perfil en Firestore
export async function saveProfile() {
  try {
    // Obtener UID y correo del usuario actual
    const { uid, email } = obtenerUIDyCorreo();

    if (!uid) {
      throw new Error('No se pudo obtener el UID del usuario.');
    }

    // Obtener referencia al documento del usuario en la colección "USERS"
    const userDocRef = doc(firestore, 'USERS', uid);

    // Obtener la fecha de último acceso del usuario
    const ultimaVezAcceso = serverTimestamp();

    if (!ultimaVezAcceso) {
      throw new Error('Error al obtener la marca de tiempo del servidor.');
    }

    // Fecha de último acceso a la cuenta.
    const profileData = {
      ultimaVezAcceso: ultimaVezAcceso,
    };

    // Verificar si el documento ya existe
    const docSnapshot = await getDoc(userDocRef);

    if (docSnapshot.exists()) {
      // Si el documento existe, actualizar los datos
      await updateDoc(userDocRef, profileData);
      console.log('Perfil actualizado con éxito.');
    } else {
      // Si el documento no existe, crear uno nuevo
      await setDoc(userDocRef, profileData);
      console.log('Perfil creado con éxito.');
    }
  } catch (error) {
    console.error('Error al guardar el perfil:', error.message);
  }
}

// Escuchar cambios en el estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario autenticado, mostrar UID y correo en la consola
    obtenerUIDyCorreo();
    
    // Llamar a la función para guardar o actualizar el perfil en Firestore
    saveProfile();
  } else {
    console.log('Usuario no autenticado');
  }
});
