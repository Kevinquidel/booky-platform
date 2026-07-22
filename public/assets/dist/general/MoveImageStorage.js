// Importar la configuración de Firebase
import { firebaseConfig } from "../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_STORAGE_URL } from "../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_STORAGE_URL:", FIREBASE_STORAGE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getStorage, ref, move } = await import(FIREBASE_STORAGE_URL);

// Inicializa Firebase con la configuración
const firebaseApp = initializeApp(firebaseConfig);

// Obtiene una referencia al servicio de almacenamiento de Firebase
const storage = getStorage(firebaseApp);

document.addEventListener('DOMContentLoaded', function () {
    // Obtén el ID real del artículo de alguna manera (por ejemplo, desde el título de la página)
    const articleId = obtenerIDRealDelArticulo(); // Asegúrate de implementar esta función

    // Verifica si la imagen ya está en su ubicación definitiva
    const storageRef = ref(storage, `media/blog/${articleId}.png`);

    storageRef.getDownloadURL().then((url) => {
        // La imagen ya está en su ubicación definitiva
        console.log(`La imagen ya está en su ubicación definitiva: ${url}`);
    }).catch((error) => {
        // La imagen no está en su ubicación definitiva; muévela
        moveImageToFinalLocation(articleId);
    });
});

function moveImageToFinalLocation(articleId) {
    // Ruta de la imagen en TEMPORAL
    const sourceRef = ref(storage, `TEMPORAL/${articleId}-nombre_de_la_imagen.jpg`);

    // Ruta de la ubicación definitiva
    const destinationRef = ref(storage, `media/blog/${articleId}.png`);

    // Mueve la imagen desde TEMPORAL a la ubicación definitiva
    move(sourceRef, destinationRef).then(() => {
        console.log('Imagen movida a su ubicación definitiva.');
    }).catch((error) => {
        console.error('Error al mover la imagen:', error);
    });
}

// Implementa la función para obtener el ID real del artículo según tus necesidades
function obtenerIDRealDelArticulo() {
    // Aquí puedes obtener el ID real del artículo desde el título de la página o cualquier otra fuente
    // Retorna el ID real del artículo
}
