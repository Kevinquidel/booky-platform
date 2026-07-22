// public/settings/client/services.js

import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_FIRESTORE_URL, FIREBASE_AUTH_URL } from "../../settings/config/firebase-config-urls.js";
import { getBookyAPI } from "../admin/admin-apis.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Obtiene la URL exacta de Firestore y solo reemplaza {key} si existe
async function generarImagenDinamica(nombreServicio) {
    const limpio = nombreServicio.trim();
    const queryEncoded = encodeURIComponent(limpio);

    try {
        const apiConfig = await getBookyAPI("image", limpio);
        
        if (apiConfig && apiConfig.url && apiConfig.url.trim() !== "") {
            let endpointUrl = apiConfig.url.trim();
            const token = apiConfig.value ? apiConfig.value.trim() : "";

            return endpointUrl
                .replace("{query}", queryEncoded)
                .replace("{key}", token)
                .replace("{token}", token);
        }
    } catch (e) {
        console.error("Error al obtener la API de imagen:", e);
    }

    return `https://picsum.photos/seed/${queryEncoded}/600/600`;
}

// 2. Lee la URL exacta de Gemini desde Firestore, reemplaza {key} y registra errores detallados
async function generarDescripcionDinamica(nombreServicio) {
    const limpio = nombreServicio.trim();

    try {
        const apiConfig = await getBookyAPI("text", limpio);
        
        if (apiConfig && apiConfig.url && apiConfig.url.trim() !== "") {
            let endpointUrl = apiConfig.url.trim();
            let token = apiConfig.value ? apiConfig.value.trim() : "";
            
            // Reemplazo estricto del marcador por tu llave real guardada en Firestore
            endpointUrl = endpointUrl.replace("{key}", token);

            const res = await fetch(endpointUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Escribe una descripción comercial y profesional de máximo 35 palabras para el servicio: "${limpio}".`
                        }]
                    }]
                })
            });

            if (res.ok) {
                const data = await res.json();
                const textoGenerado = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textoGenerado) {
                    return textoGenerado.trim();
                }
            } else {
                const errDetails = await res.text();
                console.error("--- ERROR EN LA API DE TEXTO (GEMINI) ---");
                console.error("Status:", res.status, res.statusText);
                console.error("URL llamada:", endpointUrl);
                console.error("Detalles del servidor:", errDetails);
            }
        }
    } catch (e) {
        console.error("--- EXCEPCIÓN DE RED O FETCH ---", e);
    }

    // Respaldo local de seguridad
    console.warn("Usando descripción de respaldo local para:", limpio);
    const descripcionesSugeridas = [
        `Servicio profesional y especializado de ${limpio} adaptado a tus necesidades.`,
        `Especialistas en ${limpio} con atención garantizada y de alta calidad.`,
        `Solución integral en ${limpio} diseñada para ofrecerte la mejor experiencia.`
    ];

    const index = limpio.length % descripcionesSugeridas.length;
    let descripcion = descripcionesSugeridas[index];
    
    if (descripcion.length > 50) {
        descripcion = `Especialistas en ${limpio}.`;
    }
    
    return descripcion;
}

async function obtenerMonedaConfigurada() {
    try {
        const settingsRef = doc(db, "SETTINGS", "general");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().currency) {
            return settingsSnap.data().currency;
        }
    } catch (e) {
        // Silencioso
    }
    return "$"; 
}

export async function initServices() {
    const container = document.getElementById('services-grid-container');
    if (!container) {
        console.log("Vista de servicios no detectada todavía en el DOM.");
        return;
    }

    try {
        const [querySnapshot, monedaSistema] = await Promise.all([
            getDocs(collection(db, "SERVICES")),
            obtenerMonedaConfigurada()
        ]);
        
        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="profile-item-card bg-white rounded-lg shadow-sm p-6 border border-gray-100 col-span-full text-center text-gray-500">
                    No hay servicios registrados actualmente.
                </div>
            `;
            return;
        }

        let htmlContent = '';

        for (const documentSnapshot of querySnapshot.docs) {
            const serviceId = documentSnapshot.id;
            const service = documentSnapshot.data();
            const title = service.name || service.customLabel || "Servicio General";
            
            let description = service.description || service.customValue || "";
            let imageUrl = service.imageUrl;
            
            let needsUpdate = false;
            let updates = {};

            const esImagenInvalida = !imageUrl || !imageUrl.startsWith("http");

            if (esImagenInvalida) {
                imageUrl = await generarImagenDinamica(title);
                updates.imageUrl = imageUrl;
                needsUpdate = true;
            }

            const esDescripcionInvalida = !description || description.trim() === "" || description.trim().length > 50;

            if (esDescripcionInvalida) {
                description = await generarDescripcionDinamica(title);
                updates.description = description;
                needsUpdate = true;
            }

            if (needsUpdate) {
                updates.updatedAt = Date.now();
                try {
                    const serviceRef = doc(db, "SERVICES", serviceId);
                    await updateDoc(serviceRef, updates);
                } catch (updateErr) {
                    console.error("No se pudo persistir la actualización en Firestore:", updateErr);
                }
            }

            const priceHtml = service.price !== undefined && service.price !== null && service.price !== "" 
                ? `<span style="color: #2563eb; font-weight: 600; font-size: 0.95rem;">${monedaSistema} ${service.price}</span>` 
                : `<span style="font-size: 0.85rem; color: #9ca3af; font-style: italic;">A consultar</span>`;
            
            const durationHtml = service.duration ? `
                <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                    <strong>Duración estimada:</strong> <span>${service.duration} min</span>
                </p>
            ` : `
                <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: transparent; user-select: none;">
                    <strong>Placeholder</strong>
                </p>
            `;

            const descriptionHtml = `
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 0.95rem; line-height: 1.5; min-height: 45px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${description}
                </p>
            `;

            htmlContent += `
                <div class="profile-item-card bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between" style="min-height: 460px;">
                    <div>
                        <div style="width: 100%; height: 210px; position: relative; overflow: hidden; background-color: #f3f4f6;">
                            <img src="${imageUrl}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.src='https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop'">
                        </div>
                        
                        <div style="padding: 20px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
                                <h3 style="font-size: 1.1rem; font-weight: 600; color: #1f2937; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;" title="${title}">${title}</h3>
                                ${priceHtml}
                            </div>
                            
                            ${descriptionHtml}
                            ${durationHtml}
                        </div>
                    </div>
                    
                    <div style="padding: 0 20px 20px 20px;">
                        <a href="/?view=booking&service_to_book=${serviceId}" style="background-color: #2563eb; color: white; padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; text-decoration: none; display: block; text-align: center; transition: background-color 0.2s;">
                            Agendar Cita
                        </a>
                    </div>
                </div>
            `;
        }

        container.className = "profile-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
        container.innerHTML = htmlContent;

    } catch (error) {
        console.error("Error al cargar los servicios desde Firestore:", error);
        container.innerHTML = `
            <div class="profile-item-card bg-white rounded-lg shadow-sm p-6 border border-gray-100 col-span-full text-center text-red-600 text-sm">
                Error al cargar el catálogo de servicios.
            </div>
        `;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initServices);
} else {
    initServices();
}