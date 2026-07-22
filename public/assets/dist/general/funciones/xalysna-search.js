// Importar la configuración de Firebase
import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, getDocs } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth();

// Elementos del DOM
const searchInput = document.querySelector(".search-input");
const searchButton = document.querySelector(".search-button");
const resultsContainer = document.getElementById('results-container');
const paginationContainer = document.getElementById('pagination-container');
const errorElement = document.querySelector(".error-element");

// Constantes y variables de paginación
const pageSize = 5; // Número máximo de resultados por página
let currentPage = 1; // Página actual
let totalPages = 0;


// Objeto con los nombres de las colecciones y la información de los campos
const collections = {
    USERS: {
        titleField: 'usernameId',
        descriptionField: 'locationCountry',
        urlField: 'url',
        imageField: 'photoProfile'
    },
    // Agrega más colecciones aquí según sea necesario
};


function getImageClass(result) {
    // Objeto que mapea el tipo de colección a la clase CSS correspondiente
    const collectionToImageClassMap = {
        USERS: 'profile-image',
        // Agrega más mapeos según sea necesario
    };

    // Devuelve la clase correspondiente o una clase predeterminada si no se encuentra
    return collectionToImageClassMap[result.collectionType] || 'default-image';
}


// Función para obtener los datos de un documento de Firestore
async function getFirestoreData(collectionRef) {
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map(doc => doc.data());
}

const baseUrl = '/';

// Asegúrate de definir correctamente la ruta a tu imagen predeterminada
const defaultImageSrc = `${baseUrl}assets/img/error/alt-image-not-found.png`;

function showResults(results) {
    resultsContainer.textContent = ''; // Limpiar el contenedor antes de agregar nuevos resultados
    const fragment = document.createDocumentFragment(); // Usar DocumentFragment para optimizar
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);



    // Función auxiliar para generar el enlace
    function createLink(url, title) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = title;
        link.setAttribute('role', 'button'); // Mejora de accesibilidad
        link.tabIndex = 0; // Hacer tabulable
        return link;
    }

    // Usa paginatedResults aquí para iterar y mostrar los resultados
    paginatedResults.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result';
        resultElement.setAttribute('tabindex', '0');

        const titleElement = createLink(result.url, result.title);
        const description = document.createElement('p');
        description.textContent = result.description;

        const image = document.createElement('img');
        image.alt = 'Imagen representativa'; // Ajusta este texto según sea necesario
        image.className = getImageClass(result); // Usa la función dedicada para obtener la clase de la imagen
        image.src = defaultImageSrc; // Inicialmente asigna la imagen predeterminada

        // Intenta cargar la imagen original y actualiza el src solo si la carga es exitosa
        if (result.image && result.image.trim() !== '') {
            const testImage = new Image();
            testImage.onload = function() {
                image.src = result.image; // Actualiza el src al de la imagen original
            };
            testImage.onerror = function() {
                // Maneja el error, por ejemplo, manteniendo la imagen predeterminada o registrando el error
                // No es necesario cambiar el src porque ya se ha establecido la imagen predeterminada
            };
            testImage.src = result.image;
        }

        resultElement.appendChild(image);
        resultElement.appendChild(titleElement);
        resultElement.appendChild(description);

        resultElement.addEventListener('click', () => {
            console.log(`Resultado seleccionado: ${result.title}`);
        });

        fragment.appendChild(resultElement);
    });

    resultsContainer.appendChild(fragment); // Agregar todos los elementos de resultados al contenedor de una sola vez
    updatePaginationControls(results.length); // Actualizar controles de paginación
}


// Función para actualizar los controles de paginación con limitación de botones visibles
function updatePaginationControls(totalResults) {
    totalPages = Math.ceil(totalResults / pageSize);
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return; // No mostrar paginación si todo cabe en una página

    const maxButtons = 5; // Máximo número de botones de página visibles
    let startPage = Math.max(currentPage - Math.floor(maxButtons / 2), 1);
    let endPage = startPage + maxButtons - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(endPage - maxButtons + 1, 1);
    }

    // Botón "Anterior"
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        currentPage = Math.max(1, currentPage - 1);
        searchFirestore();
    });
    paginationContainer.appendChild(prevButton);

    // Crear botones de página limitados
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = currentPage === i ? 'active' : '';
        pageButton.addEventListener('click', () => {
            currentPage = i;
            searchFirestore();
        });
        paginationContainer.appendChild(pageButton);
    }

    // Botón "Siguiente"
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Siguiente';
    nextButton.disabled = currentPage >= totalPages;
    nextButton.addEventListener('click', () => {
        currentPage = Math.min(totalPages, currentPage + 1);
        searchFirestore();
    });
    paginationContainer.appendChild(nextButton);
}


// Función para buscar en Firestore y mostrar los resultados
async function searchFirestore() {
    try {
        const searchQuery = searchInput.value.trim().toLowerCase(); // Obtener la consulta de búsqueda del usuario

        let allResults = [];

        for (const collectionName in collections) {
            const { titleField, descriptionField, urlField, imageField } = collections[collectionName];
            const collectionRef = collection(db, collectionName);
            const collectionData = await getFirestoreData(collectionRef);

            // Filtrar los resultados de esta colección según la consulta de búsqueda
            const results = collectionData.filter(data =>
                (data[titleField] && data[titleField].toLowerCase().includes(searchQuery)) ||
                (data[descriptionField] && data[descriptionField].toLowerCase().includes(searchQuery))
            ).map(data => ({
                collectionType: collectionName,
                title: data[titleField],
                description: data[descriptionField],
                url: data[urlField],
                image: data[imageField]
            }));

            allResults = allResults.concat(results);
        }

        showResults(allResults);
    } catch (error) {
        console.error('Error searching Firestore:', error);
        errorElement.textContent = 'Error searching Firestore. Please try again later.';
    }
}


// Event listener para el botón de búsqueda
searchButton.addEventListener('click', function(event) {
    event.preventDefault();
    searchFirestore();
});

// Event listener para el evento 'Enter' en el campo de búsqueda
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchFirestore();
    }
});
