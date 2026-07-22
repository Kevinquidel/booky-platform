// assets/dist/settings/admin/admin-apis.js

import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_FIRESTORE_URL, FIREBASE_AUTH_URL } from "../../settings/config/firebase-config-urls.js";

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getFirestore, doc, getDoc, setDoc } = await import(FIREBASE_FIRESTORE_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const SETTINGS_COLLECTION = "SETTINGS";
const SETTINGS_DOC_ID = "api_credentials";

// Referencias del DOM de la vista HTML
const imageApisContainer = document.getElementById("image-apis-container");
const textApisContainer = document.getElementById("text-apis-container");
const addImageApiBtn = document.getElementById("add-image-api-btn");
const addTextApiBtn = document.getElementById("add-text-api-btn");
const bookyApisForm = document.getElementById("booky-apis-form");

// Función auxiliar para recolectar datos incluyendo la URL del endpoint
async function sincronizarEliminacionFirestore() {
    const imageApis = [];
    if (imageApisContainer) {
        imageApisContainer.querySelectorAll(".api-row").forEach(row => {
            const name = row.querySelector(".api-name-input").value.trim();
            const value = row.querySelector(".api-value-input").value.trim();
            const url = row.querySelector(".api-url-input").value.trim();
            if (name || value || url) imageApis.push({ name, value, url });
        });
    }

    const textApis = [];
    if (textApisContainer) {
        textApisContainer.querySelectorAll(".api-row").forEach(row => {
            const name = row.querySelector(".api-name-input").value.trim();
            const value = row.querySelector(".api-value-input").value.trim();
            const url = row.querySelector(".api-url-input").value.trim();
            if (name || value || url) textApis.push({ name, value, url });
        });
    }

    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        await setDoc(docRef, {
            imageApis,
            textApis,
            updatedAt: Date.now()
        }, { merge: true });

        alert("Fila eliminada y cambios guardados correctamente.");
    } catch (error) {
        console.error("Error al actualizar Firestore tras eliminar:", error);
        alert("Hubo un error al guardar los cambios de eliminación en Firestore.");
    }
}

// Función para crear una fila interactiva con soporte para Nombre, Token y URL del Endpoint
function crearFilaApi(container, nombre = "", valor = "", urlEndpoint = "") {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm api-row";
    
    row.innerHTML = `
        <input type="text" placeholder="Nombre (ej. Pexels, GPT-4)" value="${nombre}" autocomplete="off" class="api-name-input w-1/4 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
        
        <input type="text" placeholder="Clave o Token de la API" value="${valor}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="api-value-input w-1/3 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none">
        
        <input type="text" placeholder="URL o Endpoint (usa {query} para búsquedas)" value="${urlEndpoint}" autocomplete="off" class="api-url-input flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none">
        
        <button type="button" class="delete-row-btn text-gray-400 hover:text-red-600 p-2 rounded transition" title="Eliminar fila">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    `;

    row.querySelector(".delete-row-btn").addEventListener("click", async () => {
        row.remove();

        if (imageApisContainer && imageApisContainer.children.length === 0) {
            crearFilaApi(imageApisContainer);
        }
        if (textApisContainer && textApisContainer.children.length === 0) {
            crearFilaApi(textApisContainer);
        }

        await sincronizarEliminacionFirestore();
    });

    container.appendChild(row);
}

// Cargar credenciales desde Firestore incluyendo la URL
async function cargarApisDesdeFirestore() {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (imageApisContainer) imageApisContainer.innerHTML = "";
        if (textApisContainer) textApisContainer.innerHTML = "";

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (data.imageApis && Array.isArray(data.imageApis)) {
                data.imageApis.forEach(item => crearFilaApi(imageApisContainer, item.name, item.value, item.url));
            }
            
            if (data.textApis && Array.isArray(data.textApis)) {
                data.textApis.forEach(item => crearFilaApi(textApisContainer, item.name, item.value, item.url));
            }
        }
    } catch (error) {
        console.error("Error al recuperar las credenciales de Firestore:", error);
        alert("Error al cargar las credenciales de Firestore.");
    }

    if (imageApisContainer && imageApisContainer.children.length === 0) {
        crearFilaApi(imageApisContainer);
    }
    if (textApisContainer && textApisContainer.children.length === 0) {
        crearFilaApi(textApisContainer);
    }
}

if (addImageApiBtn) {
    addImageApiBtn.addEventListener("click", () => crearFilaApi(imageApisContainer));
}
if (addTextApiBtn) {
    addTextApiBtn.addEventListener("click", () => crearFilaApi(textApisContainer));
}

// Guardar configuración completa en Firestore
if (bookyApisForm) {
    bookyApisForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const imageApis = [];
        if (imageApisContainer) {
            imageApisContainer.querySelectorAll(".api-row").forEach(row => {
                const name = row.querySelector(".api-name-input").value.trim();
                const value = row.querySelector(".api-value-input").value.trim();
                const url = row.querySelector(".api-url-input").value.trim();
                if (name || value || url) imageApis.push({ name, value, url });
            });
        }

        const textApis = [];
        if (textApisContainer) {
            textApisContainer.querySelectorAll(".api-row").forEach(row => {
                const name = row.querySelector(".api-name-input").value.trim();
                const value = row.querySelector(".api-value-input").value.trim();
                const url = row.querySelector(".api-url-input").value.trim();
                if (name || value || url) textApis.push({ name, value, url });
            });
        }

        try {
            const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
            await setDoc(docRef, {
                imageApis,
                textApis,
                updatedAt: Date.now()
            }, { merge: true });

            alert("¡Credenciales guardadas correctamente!");
        } catch (error) {
            console.error("Error al guardar las credenciales:", error);
            alert("Hubo un error al guardar las APIs en Firestore.");
        }
    });
}

// Módulo de acceso global mejorado para retornar todo el objeto (token y url)
export async function getBookyAPI(tipo, nombreBuscado) {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;
        const data = docSnap.data();
        
        const lista = tipo === "image" ? data.imageApis : data.textApis;
        if (!lista || !Array.isArray(lista)) return null;

        const encontrada = lista.find(item => item.name && item.name.toLowerCase().includes(nombreBuscado.toLowerCase()));
        return encontrada ? encontrada : (lista.length > 0 ? lista[0] : null);
    } catch (error) {
        console.error("Error al consultar la pasarela de API:", error);
        return null;
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (imageApisContainer && textApisContainer) {
            cargarApisDesdeFirestore();
        }
    } else {
        console.warn("Sesión de usuario no detectada en Firebase Auth.");
    }
});