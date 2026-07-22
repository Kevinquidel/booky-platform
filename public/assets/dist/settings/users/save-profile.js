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
const { getFirestore, collection, getDocs, doc, setDoc, getDoc, serverTimestamp } = await import(FIREBASE_FIRESTORE_URL);

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

// Escuchar cambios en el estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    obtenerUIDyCorreo();
  } else {
    console.log('Usuario no autenticado');
  }
});

// Función para guardar o actualizar el perfil en Firestore protegiendo el rol existente
export async function saveProfile() {
  const userDetails = obtenerUIDyCorreo();

  if (!userDetails || !userDetails.uid) {
    console.error('No se pudo obtener el UID del usuario.');
    if (typeof showNotification === 'function') {
      showNotification('Error al obtener el UID del usuario. Por favor, inicie sesión nuevamente.', 'error');
    }
    return;
  }

  const { uid, email } = userDetails;
  const userDocRef = doc(firestore, 'USERS', uid);

  try {
    // 1. Verificar si el documento ya existe en Firestore
    const docSnapshot = await getDoc(userDocRef);
    let rolAsignado;
    let fechaCreacionExistente = null;

    if (docSnapshot.exists()) {
      // SI YA EXISTE: Preservamos el rol y la fecha de creación original que ya tenía
      const userData = docSnapshot.data();
      rolAsignado = userData.role || 'cliente';
      fechaCreacionExistente = userData.createdAt || null;
    } else {
      // SI NO EXISTE (Primer registro): Verificamos si la colección USERS está totalmente vacía
      const querySnapshot = await getDocs(collection(firestore, 'USERS'));
      
      if (querySnapshot.empty) {
        // Es el primer usuario absoluto de todo el sistema -> superadmin
        rolAsignado = 'superadmin';
        console.log('Primer usuario detectado: Asignando rol absoluto de SUPERADMIN.');
      } else {
        // Ya hay usuarios previos en el sistema -> rol por defecto cliente
        rolAsignado = 'cliente';
      }
    }

    // 2. Construir el objeto con los datos del perfil actualizados
    const profileData = {
      displayName: getValue('displayName'),
      userEmail: getValue('userEmail') || email,
      phone: getValue('phone'),
      birthDate: getValue('birthDate'),
      userUid: uid,
      role: rolAsignado, // Mantiene el rol existente sin degradarlo a 'cliente'
      ultimaVezAcceso: serverTimestamp(),
      estadoCuenta: true
    };

    // Si es un documento nuevo o no tenía createdAt, le asignamos el timestamp de creación actual.
    // Si ya existía, dejamos intacta su fecha original de registro.
    if (!fechaCreacionExistente) {
      profileData.createdAt = serverTimestamp();
    }

    // 3. Guardar o actualizar usando setDoc con { merge: true }
    await setDoc(userDocRef, profileData, { merge: true });
    console.log('Perfil guardado con éxito en Firestore:', profileData);
    
    if (typeof showNotification === 'function') {
      showNotification('¡Perfil actualizado con éxito!', 'success');
    }
  } catch (error) {
    console.error('Error al guardar el perfil:', error);
    if (typeof showNotification === 'function') {
      showNotification('Error al guardar el perfil. Por favor, intente nuevamente.', 'error');
    }
  }
}

// Función auxiliar para obtener el valor de un campo HTML de forma segura
function getValue(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    const value = element.value;
    if (value === '') {
      console.log(`El campo ${elementId} está vacío.`);
    }
    return value;
  } else {
    console.log(`Elemento con ID ${elementId} no encontrado en el DOM.`);
    return '';
  }
}

// Vincula la función al objeto window de forma limpia para que tu onclick="uploadToFirestore()" la llame correctamente
window.uploadToFirestore = function () {
  saveProfile();
}