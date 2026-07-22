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

// Función para darle "Me gusta" a una publicación
export async function likePost(postId) {
  const { uid } = obtenerUIDyCorreo();

  if (!uid) {
    console.error('No se pudo obtener el UID del usuario.');
    return;
  }

  const likesCollection = collection(firestore, 'likes', postId);

  try {
    const likesCollectionSnapshot = await getDoc(likesCollection);
    if (!likesCollectionSnapshot.exists()) {
      await setDoc(likesCollection, {});
    }

    await setDoc(likesCollection, { [uid]: true }, { merge: true });

    console.log('Le diste "Me gusta" a la publicación', postId);
  } catch (error) {
    console.error('Error al darle "Me gusta" a la publicación:', error);
  }
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Supongamos que tienes un botón con el ID 'btnMeGusta' en tu HTML
  document.getElementById('btnMeGusta').addEventListener('click', async () => {
    const postId = 'el_id_de_la_publicacion'; // Reemplazar con el ID real de la publicación
    await likePost(postId);
  });

});
