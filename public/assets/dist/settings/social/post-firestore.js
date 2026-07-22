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
const { getFirestore, doc, setDoc, serverTimestamp, collection, getDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

// Función para obtener el UID y el correo del usuario actual
function obtenerUIDyCorreo() {
  const user = auth.currentUser;

  if (user) {
    console.log('UID:', user.uid);
    console.log('Correo:', user.email);
    return { uid: user.uid, email: user.email };
  } else {
    console.log('Usuario no autenticado');
    return null;
  }
}

// Función para guardar una nueva publicación en Firestore
export async function savePost(content) {
  // Obtener UID y correo del usuario actual
  const { uid, email } = obtenerUIDyCorreo();

  if (!uid) {
    console.error('No se pudo obtener el UID del usuario.');
    return;
  }

  // Obtener referencia a la subcolección del usuario dentro de la colección "POST"
  const userPostsCollection = collection(firestore, 'POST', uid, 'userPosts');

  // Crear un nuevo documento para la publicación con un ID único generado automáticamente
  const newPostDoc = await addDoc(userPostsCollection, {
    content: content,
    timestamp: serverTimestamp(),
    // Otros campos relevantes de la publicación
  });

  console.log('Publicación creada con éxito. ID:', newPostDoc.id);
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Obtener el botón de Guardar Perfil desde el DOM
  const saveProfileButton = document.getElementById('saveProfileButton');

  // Supongamos que tienes un botón con el ID 'btnPublicar' en tu HTML
  document.getElementById('btnPublicar').addEventListener('click', async () => {
    const contenidoPublicacion = document.getElementById('contenidoPublicacion').value;
    await savePost(contenidoPublicacion);
  });

  // Agregar un event listener al botón de Guardar Perfil
  saveProfileButton.addEventListener('click', async () => {
    // Llamar a la función para guardar o actualizar el perfil en Firestore
    await saveProfile();
  });

  // Escuchar cambios en el estado de autenticación
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Usuario autenticado, mostrar UID y correo en la consola
      obtenerUIDyCorreo();
    } else {
      console.log('Usuario no autenticado');
    }
  });
});
