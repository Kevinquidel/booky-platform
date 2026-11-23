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

const normalizar = valor => String(valor ?? "").trim().toLocaleLowerCase("es");

async function fetchConTimeout(url, options = {}, ms = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function obtenerListaApisCliente(tipo, consulta) {
    const lista = [];

    try {
        if (typeof getBookyAPI === "function") {
            const principal = await getBookyAPI(tipo, consulta);
            if (principal && (principal.url || principal.value)) {
                lista.push(principal);
            }
        }
    } catch (e) {
        console.warn(`No se pudo obtener API principal de ${tipo}:`, e);
    }

    try {
        const snap = await getDoc(doc(db, "SETTINGS", "api_credentials"));
        if (snap.exists()) {
            const raw = snap.data();
            const campo = tipo === "image" ? "imageApis" : "textApis";
            const extras = Array.isArray(raw[campo]) ? raw[campo] : [];
            for (const item of extras) {
                if (!item?.value && !item?.url) continue;
                const duplicado = lista.some(
                    ya => normalizar(ya.name) === normalizar(item.name) && String(ya.value || "") === String(item.value || "")
                );
                if (!duplicado) {
                    lista.push(item);
                }
            }
        }
    } catch {
        // Silencioso si no hay permisos de lectura directa en SETTINGS
    }

    return lista;
}

// 1. Genera imagen solo cuando el servicio no tiene una URL válida
async function generarImagenDinamica(nombreServicio) {
    const limpio = nombreServicio.trim();
    const queryEncoded = encodeURIComponent(limpio);

    try {
        const apisImagen = await obtenerListaApisCliente("image", limpio);

        for (const apiConfig of apisImagen) {
            if (apiConfig && apiConfig.url && apiConfig.url.trim() !== "") {
                const token = apiConfig.value ? apiConfig.value.trim() : "";
                const urlConstruida = apiConfig.url
                    .trim()
                    .replace("{query}", queryEncoded)
                    .replace("{key}", token)
                    .replace("{token}", token);

                if (urlConstruida.startsWith("http")) {
                    return urlConstruida;
                }
            }
        }
    } catch (e) {
        console.error("Error al obtener la API de imagen:", e);
    }

    return `https://picsum.photos/seed/${queryEncoded}/600/600`;
}

// 2. Genera descripción solo cuando el servicio no tiene descripción guardada
async function generarDescripcionDinamica(nombreServicio) {
    const limpio = nombreServicio.trim();
    const promptTexto = `Escribe una descripción comercial y profesional de máximo 35 palabras para el servicio: "${limpio}".`;

    try {
        const apisTexto = await obtenerListaApisCliente("text", limpio);

        for (const apiConfig of apisTexto) {
            const token = apiConfig?.value ? String(apiConfig.value).trim() : "";
            const provider = normalizar(apiConfig?.name);
            let endpointUrl = apiConfig?.url ? String(apiConfig.url).trim() : "";

            if (!endpointUrl && token) {
                if (provider.includes("groq")) {
                    endpointUrl = "https://api.groq.com/openai/v1/chat/completions";
                } else if (provider.includes("openrouter")) {
                    endpointUrl = "https://openrouter.ai/api/v1/chat/completions";
                }
            }

            if (!endpointUrl) continue;
            endpointUrl = endpointUrl.replace("{key}", token).replace("{token}", token);

            try {
                if (endpointUrl.includes("chat/completions") && token) {
                    const modelo = provider.includes("groq")
                        ? "llama-3.3-70b-versatile"
                        : "openai/gpt-4o-mini";

                    const resOpenAi = await fetchConTimeout(
                        endpointUrl,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                model: modelo,
                                messages: [{ role: "user", content: promptTexto }],
                                temperature: 0.6
                            })
                        },
                        7000
                    );

                    if (resOpenAi.ok) {
                        const dataOpenAi = await resOpenAi.json();
                        const textoOpenAi = dataOpenAi?.choices?.[0]?.message?.content?.trim();
                        if (textoOpenAi) return textoOpenAi;
                    }
                    continue;
                }

                const res = await fetchConTimeout(
                    endpointUrl,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: promptTexto
                                }]
                            }]
                        })
                    },
                    7000
                );

                if (res.ok) {
                    const data = await res.json();
                    const textoGenerado = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textoGenerado && textoGenerado.trim()) {
                        return textoGenerado.trim();
                    }
                } else {
                    const errDetails = await res.text().catch(() => "");
                    console.warn("Proveedor de texto no disponible:", res.status, res.statusText, errDetails);
                }
            } catch (errProveedor) {
                console.warn("Fallo en proveedor de texto, probando siguiente:", errProveedor);
            }
        }
    } catch (e) {
        console.error("--- EXCEPCIÓN DE RED O FETCH ---", e);
    }

    // Respaldo local de seguridad únicamente cuando el servicio no tiene descripción y no respondió ninguna API
    console.warn("Usando descripción de respaldo local para:", limpio);
    const descripcionesSugeridas = [
        `Servicio profesional y especializado de ${limpio} adaptado a tus necesidades.`,
        `Especialistas en ${limpio} con atención garantizada y de alta calidad.`,
        `Solución integral en ${limpio} diseñada para ofrecerte la mejor experiencia.`
    ];

    const index = limpio.length % descripcionesSugeridas.length;
    return descripcionesSugeridas[index];
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

            let description = typeof service.description === "string" && service.description.trim() !== ""
                ? service.description.trim()
                : (typeof service.customValue === "string" ? service.customValue.trim() : "");

            let imageUrl = typeof service.imageUrl === "string" ? service.imageUrl.trim() : "";

            let needsUpdate = false;
            const updates = {};

            // Solo generar imagen si el servicio aún no tiene una URL http/https válida
            const tieneImagenValida = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
            if (!tieneImagenValida) {
                imageUrl = await generarImagenDinamica(title);
                updates.imageUrl = imageUrl;
                needsUpdate = true;
            }

            // Solo generar descripción si el servicio no tiene descripción guardada
            const tieneDescripcionValida = description.length > 0;
            if (!tieneDescripcionValida) {
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
            ` : "";

            const descriptionHtml = `
                <p style="margin: 0 0 14px 0; color: #4b5563; font-size: 0.95rem; line-height: 1.55; word-break: break-word;">
                    ${description}
                </p>
            `;

            htmlContent += `
                <div class="profile-item-card bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between" style="min-height: auto;">
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

window.initServices = initServices;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initServices);
} else {
    initServices();
}