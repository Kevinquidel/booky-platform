// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let getBookyAPI = null;
try {
    const apisModule = await import("./admin-apis.js");
    if (typeof apisModule.getBookyAPI === "function") {
        getBookyAPI = apisModule.getBookyAPI;
    }
} catch {
    getBookyAPI = null;
}

const servicesTableBody = document.getElementById("services-table-body");
const serviceForm = document.getElementById("service-form");
const serviceFormContainer = document.getElementById("service-form-container");
const servicesListContainer = document.getElementById("services-list-container");
const mainGridContainer = document.getElementById("main-grid-container");
const navUsuarios = document.getElementById("nav-usuarios"); // Referencia al enlace de usuarios en la barra de navegación

// Variable global para controlar si estamos editando un servicio existente
let editingServiceId = null;
let currentGeneratedImageUrl = null;
let generatingDescription = false;
let generatingImage = false;
let comprobandoIA = false;

// Caché de disponibilidad y enfriamiento temporal ante 429 / 503
const cacheModelosGemini = new Map();
const enfriamientoModelos = new Map(); // clave -> timestamp hasta el cual no reintentar
const cacheDisponibilidadIA = {
    checkedAt: 0,
    text: null,
    image: null
};

const normalizar = valor => String(valor ?? "").trim().toLocaleLowerCase("es");

function estaEnfriado(clave) {
    const hasta = enfriamientoModelos.get(clave);
    if (!hasta) return false;
    if (Date.now() >= hasta) {
        enfriamientoModelos.delete(clave);
        return false;
    }
    return true;
}

function enfriar(clave, segundos = 60) {
    enfriamientoModelos.set(clave, Date.now() + segundos * 1000);
}

async function fetchConTimeout(url, options = {}, ms = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function pintarBadgeIA(badgeId, etiqueta, estadoTexto, nivel = "neutral") {
    const badge = document.getElementById(badgeId);
    if (!badge) return;

    const estilos = {
        ok: {
            box: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-medium text-emerald-800",
            dot: "h-2 w-2 rounded-full bg-emerald-500"
        },
        warn: {
            box: "inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 font-medium text-amber-800",
            dot: "h-2 w-2 rounded-full bg-amber-400"
        },
        err: {
            box: "inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 font-medium text-red-700",
            dot: "h-2 w-2 rounded-full bg-red-500"
        },
        neutral: {
            box: "inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 font-medium text-gray-700",
            dot: "h-2 w-2 rounded-full bg-gray-400"
        }
    };

    const cfg = estilos[nivel] || estilos.neutral;
    badge.className = cfg.box;
    badge.innerHTML = `<span class="${cfg.dot}"></span><span>${etiqueta}: ${estadoTexto}</span>`;
}

function actualizarBadgesDisponibilidad(info) {
    const proveedoresTexto = Array.isArray(info?.text?.proveedores) ? info.text.proveedores : [];
    const proveedoresImagen = Array.isArray(info?.image?.proveedores) ? info.image.proveedores : [];

    if (proveedoresTexto.length > 0) {
        const principal = proveedoresTexto[0];
        const modeloCorto = principal.modelo ? ` · ${principal.modelo}` : "";
        const extra = proveedoresTexto.length > 1 ? ` (+${proveedoresTexto.length - 1} resp.)` : "";
        pintarBadgeIA("ai-text-badge", "Texto", `${principal.proveedor}${modeloCorto}${extra}`, "ok");
    } else {
        pintarBadgeIA("ai-text-badge", "Texto", "Respaldo base", "warn");
    }

    if (proveedoresImagen.length > 0) {
        const principal = proveedoresImagen[0];
        const extra = proveedoresImagen.length > 1 ? ` (+${proveedoresImagen.length - 1} resp.)` : "";
        pintarBadgeIA("ai-image-badge", "Imágenes", `${principal.proveedor}${extra}`, "ok");
    } else {
        pintarBadgeIA("ai-image-badge", "Imágenes", "Respaldo por nombre", "warn");
    }
}

function setAiStatus(mensaje, esError = false, proveedorEtiqueta = "") {
    const panel = document.getElementById("ai-result-panel");
    const provEl = document.getElementById("ai-provider-used");
    let statusEl = document.getElementById("ai-service-status");

    if (!statusEl && serviceForm) {
        statusEl = document.createElement("p");
        statusEl.id = "ai-service-status";
        statusEl.setAttribute("role", "status");
        const submitBtn = serviceForm.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.insertAdjacentElement("beforebegin", statusEl);
        } else {
            serviceForm.append(statusEl);
        }
    }

    if (panel) {
        const hayImagen = Boolean(currentGeneratedImageUrl);
        panel.hidden = !mensaje && !hayImagen;
    }

    if (provEl) {
        provEl.textContent = proveedorEtiqueta || "";
    }

    if (statusEl) {
        statusEl.textContent = mensaje || "";
        statusEl.className = esError
            ? "text-xs font-medium text-red-600"
            : "text-xs font-medium text-emerald-700";
    }
}

function actualizarVistaPreviaImagen(url) {
    currentGeneratedImageUrl = url || null;
    const urlInput = document.getElementById("service-image-url") || document.getElementById("service-image");
    if (urlInput && url) {
        urlInput.value = url;
    }

    const previewBox = document.getElementById("ai-image-preview-box");
    let previewImg = document.getElementById("service-image-preview");

    if (!previewImg && serviceForm) {
        const containerImgAi = document.getElementById("container-image-ai");
        const wrapper = document.createElement("div");
        wrapper.id = "ai-image-preview-wrapper";
        wrapper.className = "mt-3";

        previewImg = document.createElement("img");
        previewImg.id = "service-image-preview";
        previewImg.alt = "Vista previa del servicio";
        previewImg.className = "h-36 w-full rounded-lg border border-gray-200 object-cover hidden";

        wrapper.append(previewImg);
        if (containerImgAi) {
            containerImgAi.insertAdjacentElement("afterend", wrapper);
        } else {
            serviceForm.append(wrapper);
        }
    }

    if (previewImg) {
        if (url) {
            previewImg.src = url;
            previewImg.classList.remove("hidden");
            if (previewBox) previewBox.hidden = false;
        } else {
            previewImg.removeAttribute("src");
            previewImg.classList.add("hidden");
            if (previewBox) previewBox.hidden = true;
        }
    }

    const panel = document.getElementById("ai-result-panel");
    const statusTxt = document.getElementById("ai-service-status")?.textContent?.trim() || "";
    if (panel) {
        panel.hidden = !statusTxt && !url;
    }
}

async function leerConfiguracionApis() {
    try {
        const snap = await getDoc(doc(firestore, "SETTINGS", "api_credentials"));
        const raw = snap.exists() ? snap.data() : {};

        const limpiarLista = arr =>
            Array.isArray(arr) ? arr.filter(x => x?.value && String(x.value).trim()) : [];

        const textApis = limpiarLista(raw.textApis);
        const imageApis = limpiarLista(raw.imageApis);
        const otherApis = limpiarLista(raw.otherApis);

        for (const item of otherApis) {
            const cat = normalizar(item.category);
            const nom = normalizar(item.name);
            if (cat.includes("imagen") || cat.includes("foto") || nom.includes("unsplash") || nom.includes("pexels") || nom.includes("pixabay") || nom.includes("flickr")) {
                imageApis.push(item);
            } else if (cat.includes("texto") || cat.includes("ia") || cat.includes("modelo") || nom.includes("gemini") || nom.includes("groq") || nom.includes("openrouter") || nom.includes("hugging") || nom.includes("openai")) {
                textApis.push(item);
            }
        }

        let preferredText = null;
        let preferredImage = null;
        if (getBookyAPI) {
            try {
                preferredText = await getBookyAPI("text");
                preferredImage = await getBookyAPI("image");
            } catch {
                preferredText = null;
                preferredImage = null;
            }
        }

        const ordenarConPreferida = (lista, preferida) => {
            if (!preferida?.value) return lista;
            const idx = lista.findIndex(item => normalizar(item.name) === normalizar(preferida.name) && item.value === preferida.value);
            if (idx <= 0) return lista;
            const copia = [...lista];
            const [seleccionada] = copia.splice(idx, 1);
            copia.unshift(seleccionada);
            return copia;
        };

        return {
            textApis: ordenarConPreferida(textApis, preferredText),
            imageApis: ordenarConPreferida(imageApis, preferredImage)
        };
    } catch (error) {
        console.warn("No se pudo leer SETTINGS/api_credentials:", error);
        return { textApis: [], imageApis: [] };
    }
}

// Consulta modelos estables de texto disponibles en Gemini evitando modelos experimentales/preview
async function obtenerModelosGeminiDisponibles(apiKey) {
    const key = apiKey.trim();
    if (cacheModelosGemini.has(key)) {
        return cacheModelosGemini.get(key);
    }

    const prioridades = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash"
    ];

    try {
        const res = await fetchConTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
            {},
            6000
        );
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const modelos = Array.isArray(data?.models) ? data.models : [];

        const candidatos = modelos
            .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
            .map(m => String(m.name || "").replace(/^models\//, ""))
            .filter(nombre => {
                if (!nombre) return false;
                if (
                    nombre.includes("embedding") ||
                    nombre.includes("imagen") ||
                    nombre.includes("veo") ||
                    nombre.includes("live") ||
                    nombre.includes("audio") ||
                    nombre.includes("exp") ||
                    nombre.includes("preview")
                ) {
                    return false;
                }
                return nombre.startsWith("gemini-");
            });

        candidatos.sort((a, b) => {
            const ia = prioridades.findIndex(p => a === p || a.startsWith(p + "-"));
            const ib = prioridades.findIndex(p => b === p || b.startsWith(p + "-"));
            const rankA = ia === -1 ? 999 : ia;
            const rankB = ib === -1 ? 999 : ib;
            return rankA - rankB;
        });

        const resultadoFinal = candidatos.length > 0 ? candidatos : prioridades;
        cacheModelosGemini.set(key, resultadoFinal);
        return resultadoFinal;
    } catch {
        return prioridades;
    }
}

// Resuelve TODA la lista de proveedores de texto compatibles en orden de prioridad
async function resolverListaProveedoresTexto(textApis) {
    const proveedoresActivos = [];

    for (const api of textApis) {
        const provider = normalizar(api.name);
        const key = String(api.value).trim();

        if (provider.includes("gemini") || provider.includes("google")) {
            const modelos = await obtenerModelosGeminiDisponibles(key);
            if (modelos.length > 0) {
                proveedoresActivos.push({
                    tipo: "gemini",
                    proveedor: api.name,
                    modelo: modelos[0],
                    modelos,
                    key
                });
            }
            continue;
        }

        if (provider.includes("groq")) {
            proveedoresActivos.push({
                tipo: "openai-compatible",
                endpoint: "https://api.groq.com/openai/v1/chat/completions",
                proveedor: api.name,
                modelo: "llama-3.3-70b-versatile",
                key
            });
            continue;
        }

        if (provider.includes("openrouter")) {
            proveedoresActivos.push({
                tipo: "openai-compatible",
                endpoint: "https://openrouter.ai/api/v1/chat/completions",
                proveedor: api.name,
                modelo: "openai/gpt-4o-mini",
                key
            });
            continue;
        }

        if (provider.includes("hugging")) {
            proveedoresActivos.push({
                tipo: "huggingface",
                endpoint: "https://router.huggingface.co/v1/chat/completions",
                proveedor: api.name,
                modelo: "Qwen/Qwen2.5-7B-Instruct",
                key
            });
            continue;
        }

        if (provider.includes("openai")) {
            proveedoresActivos.push({
                tipo: "openai-compatible",
                endpoint: "https://api.openai.com/v1/chat/completions",
                proveedor: api.name,
                modelo: "gpt-4o-mini",
                key
            });
        }
    }

    return {
        disponible: proveedoresActivos.length > 0,
        proveedores: proveedoresActivos
    };
}

// Resuelve TODA la lista de proveedores de imagen compatibles en orden de prioridad
async function resolverListaProveedoresImagen(imageApis) {
    const proveedoresActivos = [];

    for (const api of imageApis) {
        const provider = normalizar(api.name);
        const key = String(api.value).trim();

        if (provider.includes("unsplash")) {
            proveedoresActivos.push({ tipo: "unsplash", proveedor: api.name, key });
        } else if (provider.includes("pexels")) {
            proveedoresActivos.push({ tipo: "pexels", proveedor: api.name, key });
        } else if (provider.includes("pixabay")) {
            proveedoresActivos.push({ tipo: "pixabay", proveedor: api.name, key });
        } else if (provider.includes("flickr")) {
            proveedoresActivos.push({ tipo: "flickr", proveedor: api.name, key });
        }
    }

    return {
        disponible: proveedoresActivos.length > 0,
        proveedores: proveedoresActivos
    };
}

async function comprobarDisponibilidadIA(forzar = false) {
    const ahora = Date.now();
    if (!forzar && cacheDisponibilidadIA.checkedAt && ahora - cacheDisponibilidadIA.checkedAt < 30000) {
        actualizarBadgesDisponibilidad(cacheDisponibilidadIA);
        return cacheDisponibilidadIA;
    }

    if (comprobandoIA && cacheDisponibilidadIA.text && cacheDisponibilidadIA.image) {
        actualizarBadgesDisponibilidad(cacheDisponibilidadIA);
        return cacheDisponibilidadIA;
    }

    comprobandoIA = true;
    pintarBadgeIA("ai-text-badge", "Texto", "Comprobando…", "neutral");
    pintarBadgeIA("ai-image-badge", "Imágenes", "Comprobando…", "neutral");

    try {
        const { textApis, imageApis } = await leerConfiguracionApis();
        const [estadoTexto, estadoImagen] = await Promise.all([
            resolverListaProveedoresTexto(textApis),
            resolverListaProveedoresImagen(imageApis)
        ]);

        cacheDisponibilidadIA.checkedAt = Date.now();
        cacheDisponibilidadIA.text = estadoTexto;
        cacheDisponibilidadIA.image = estadoImagen;
        actualizarBadgesDisponibilidad(cacheDisponibilidadIA);
        return cacheDisponibilidadIA;
    } catch {
        const fallbackEstado = {
            checkedAt: Date.now(),
            text: { disponible: false, proveedores: [] },
            image: { disponible: false, proveedores: [] }
        };
        cacheDisponibilidadIA.text = fallbackEstado.text;
        cacheDisponibilidadIA.image = fallbackEstado.image;
        actualizarBadgesDisponibilidad(fallbackEstado);
        return fallbackEstado;
    } finally {
        comprobandoIA = false;
    }
}

async function ejecutarProveedorTexto(item, promptUsuario, onProgreso) {
    if (item.tipo === "gemini") {
        const modelosAProbar = Array.isArray(item.modelos) && item.modelos.length > 0
            ? item.modelos
            : [item.modelo];

        let ultimoError = null;
        for (const modelo of modelosAProbar) {
            const llaveEnfriamiento = `gemini:${modelo}`;
            if (estaEnfriado(llaveEnfriamiento)) {
                onProgreso?.(`Saltando ${modelo} (enfriado temporalmente por límite/saturación)…`, `Probando siguiente modelo`);
                continue;
            }

            onProgreso?.(`Consultando ${item.proveedor} con modelo ${modelo}…`, `${item.proveedor} · ${modelo}`);

            try {
                const res = await fetchConTimeout(
                    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(item.key)}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: promptUsuario }] }]
                        })
                    },
                    8000
                );

                if (res.status === 429 || res.status === 503) {
                    enfriar(llaveEnfriamiento, res.status === 429 ? 60 : 30);
                    const motivo = res.status === 429 ? "límite de cuota (429)" : "servicio saturado (503)";
                    console.warn(`${item.proveedor} (${modelo}): ${motivo}, pasando al siguiente modelo.`);
                    onProgreso?.(`${modelo} reportó ${motivo}. Probando siguiente opción…`, `${item.proveedor} · Reintentando`);
                    ultimoError = new Error(`${modelo} (${res.status})`);
                    continue;
                }

                if (res.status === 404 || res.status === 400) {
                    console.warn(`${item.proveedor} (${modelo}) no compatible (${res.status}), probando siguiente modelo.`);
                    onProgreso?.(`${modelo} no disponible (${res.status}). Probando siguiente modelo…`, `${item.proveedor} · Reintentando`);
                    ultimoError = new Error(`${modelo} (${res.status})`);
                    continue;
                }

                if (!res.ok) {
                    throw new Error(`${item.proveedor} (${modelo}) HTTP ${res.status}`);
                }

                const data = await res.json();
                const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (!texto) {
                    throw new Error(`Respuesta vacía de ${item.proveedor} (${modelo})`);
                }

                item.modelo = modelo;
                return { texto, modeloUsado: modelo };
            } catch (err) {
                ultimoError = err;
            }
        }
        throw ultimoError || new Error(`Ningún modelo de ${item.proveedor} respondió.`);
    }

    if (item.tipo === "openai-compatible" || item.tipo === "huggingface") {
        const llaveEnfriamiento = `${item.tipo}:${item.proveedor}`;
        if (estaEnfriado(llaveEnfriamiento)) {
            throw new Error(`${item.proveedor} enfriado temporalmente.`);
        }

        onProgreso?.(`Consultando ${item.proveedor} (${item.modelo})…`, `${item.proveedor} · ${item.modelo}`);

        const res = await fetchConTimeout(
            item.endpoint,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${item.key}`
                },
                body: JSON.stringify({
                    model: item.modelo,
                    messages: [{ role: "user", content: promptUsuario }],
                    temperature: 0.6
                })
            },
            8000
        );

        if (res.status === 429 || res.status === 503) {
            enfriar(llaveEnfriamiento, res.status === 429 ? 60 : 30);
            throw new Error(`${item.proveedor} reportó ${res.status}`);
        }

        if (!res.ok) {
            throw new Error(`${item.proveedor} HTTP ${res.status}`);
        }

        const data = await res.json();
        const texto = data?.choices?.[0]?.message?.content?.trim();
        if (!texto) {
            throw new Error(`Respuesta vacía de ${item.proveedor}`);
        }

        return { texto, modeloUsado: item.modelo };
    }

    throw new Error(`Proveedor ${item.proveedor} no soportado.`);
}

async function generarDescripcionConIA(nombreServicio, borradorActual = "") {
    const estado = await comprobarDisponibilidadIA();
    const listaProveedores = estado?.text?.proveedores || [];

    const promptUsuario = borradorActual
        ? `Redacta una descripción clara, atractiva y profesional en español (máximo 2 oraciones, sin comillas ni listas) para el servicio "${nombreServicio}" en la plataforma Booky, tomando como base este borrador: "${borradorActual}".`
        : `Redacta una descripción clara, atractiva y profesional en español (máximo 2 oraciones, sin comillas ni listas) para el servicio "${nombreServicio}" en la plataforma Booky.`;

    if (listaProveedores.length === 0) {
        return {
            texto: `${nombreServicio} disponible en Booky con atención personalizada, reserva ágil y calidad garantizada para tu cita.`,
            detalle: "No hay API de texto configurada; se generó una descripción base.",
            proveedorEtiqueta: "Respaldo texto"
        };
    }

    const motivos = [];
    for (let idx = 0; idx < listaProveedores.length; idx++) {
        const item = listaProveedores[idx];
        try {
            const { texto, modeloUsado } = await ejecutarProveedorTexto(
                item,
                promptUsuario,
                (msg, tag) => setAiStatus(msg, false, tag)
            );
            actualizarBadgesDisponibilidad(estado);
            const notaRespaldo = idx > 0 ? ` (respaldo #${idx + 1})` : "";
            return {
                texto,
                detalle: `Descripción generada con ${item.proveedor} (${modeloUsado})${notaRespaldo}.`,
                proveedorEtiqueta: `${item.proveedor} · ${modeloUsado}`
            };
        } catch (err) {
            console.warn(`Proveedor de texto #${idx + 1} (${item.proveedor}) no disponible:`, err?.message || err);
            motivos.push(`${item.proveedor}: ${err?.message || "no disponible"}`);
            if (idx + 1 < listaProveedores.length) {
                setAiStatus(`"${item.proveedor}" no disponible. Probando siguiente proveedor de texto…`, false, "Cambiando IA");
            }
        }
    }

    return {
        texto: `${nombreServicio} disponible en Booky con atención profesional, reserva rápida y calidad garantizada.`,
        detalle: `Los proveedores de texto no respondieron (${motivos.join(" · ")}); se aplicó texto base.`,
        proveedorEtiqueta: "Respaldo base"
    };
}

async function ejecutarProveedorImagen(item, nombreServicio) {
    if (item.tipo === "unsplash") {
        const res = await fetchConTimeout(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(nombreServicio)}&per_page=1`,
            { headers: { Authorization: `Client-ID ${item.key}` } },
            6500
        );
        if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
        const data = await res.json();
        const foto = data?.results?.[0]?.urls?.regular || data?.results?.[0]?.urls?.small;
        if (!foto) throw new Error("Sin resultados en Unsplash");
        return foto;
    }

    if (item.tipo === "pexels") {
        const res = await fetchConTimeout(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(nombreServicio)}&per_page=1`,
            { headers: { Authorization: item.key } },
            6500
        );
        if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
        const data = await res.json();
        const foto = data?.photos?.[0]?.src?.large || data?.photos?.[0]?.src?.medium;
        if (!foto) throw new Error("Sin resultados en Pexels");
        return foto;
    }

    if (item.tipo === "pixabay") {
        const res = await fetchConTimeout(
            `https://pixabay.com/api/?key=${encodeURIComponent(item.key)}&q=${encodeURIComponent(nombreServicio)}&image_type=photo&per_page=3`,
            {},
            6500
        );
        if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
        const data = await res.json();
        const foto = data?.hits?.[0]?.webformatURL || data?.hits?.[0]?.largeImageURL;
        if (!foto) throw new Error("Sin resultados en Pixabay");
        return foto;
    }

    if (item.tipo === "flickr") {
        const res = await fetchConTimeout(
            `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${encodeURIComponent(item.key)}&text=${encodeURIComponent(nombreServicio)}&per_page=1&format=json&nojsoncallback=1&extras=url_l,url_m`,
            {},
            6500
        );
        if (!res.ok) throw new Error(`Flickr HTTP ${res.status}`);
        const data = await res.json();
        const p = data?.photos?.photo?.[0];
        const foto = p?.url_l || p?.url_m || (p ? `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg` : null);
        if (!foto) throw new Error("Sin resultados en Flickr");
        return foto;
    }

    throw new Error(`Proveedor de imagen ${item.proveedor} no soportado.`);
}

async function generarImagenConIA(nombreServicio) {
    const estado = await comprobarDisponibilidadIA();
    const listaProveedores = estado?.image?.proveedores || [];
    const consulta = `${nombreServicio} service appointment professional clean studio`;

    for (let idx = 0; idx < listaProveedores.length; idx++) {
        const item = listaProveedores[idx];
        setAiStatus(`Buscando imagen en ${item.proveedor} para "${nombreServicio}"…`, false, item.proveedor);
        try {
            const url = await ejecutarProveedorImagen(item, nombreServicio);
            const notaRespaldo = idx > 0 ? ` (respaldo #${idx + 1})` : "";
            return {
                url,
                detalle: `Imagen obtenida desde ${item.proveedor}${notaRespaldo} para "${nombreServicio}".`,
                proveedorEtiqueta: item.proveedor
            };
        } catch (err) {
            console.warn(`Proveedor de imagen #${idx + 1} (${item.proveedor}) no disponible:`, err?.message || err);
        }
    }

    return {
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(consulta)}?width=800&height=500&nologo=true`,
        detalle: `Imagen generada por respaldo directo para "${nombreServicio}".`,
        proveedorEtiqueta: "Respaldo imagen"
    };
}

function iniciarGeneradoresIA() {
    if (!serviceForm) return;

    const nameInput = document.getElementById("service-name");
    const chkDesc = document.getElementById("toggle-description");
    const containerDesc = document.getElementById("container-description");
    const descInput = document.getElementById("service-description");
    const chkImgAi = document.getElementById("toggle-image-ai");
    const containerImgAi = document.getElementById("container-image-ai");

    // Botón de descripción: solo dentro de #container-description
    let btnDesc = document.getElementById("btn-generate-description");
    if (!btnDesc && descInput) {
        btnDesc = document.createElement("button");
        btnDesc.id = "btn-generate-description";
        btnDesc.type = "button";
        btnDesc.textContent = "Generar descripción con IA";
        btnDesc.className = "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50";
        descInput.insertAdjacentElement("afterend", btnDesc);
    }

    // Botón de imagen: exclusivamente dentro de #container-image-ai
    let btnImg = document.getElementById("btn-generate-image");
    if (!btnImg && containerImgAi) {
        btnImg = document.createElement("button");
        btnImg.id = "btn-generate-image";
        btnImg.type = "button";
        btnImg.textContent = "Generar imagen con IA";
        btnImg.className = "inline-flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50";
        containerImgAi.appendChild(btnImg);
    }

    if (btnDesc) {
        btnDesc.addEventListener("click", async () => {
            if (generatingDescription) return;
            const nombre = nameInput?.value.trim() || "";
            if (!nombre) {
                setAiStatus("Escribe primero el nombre del servicio para generar su descripción.", true, "Validación");
                nameInput?.focus();
                return;
            }

            generatingDescription = true;
            btnDesc.disabled = true;
            setAiStatus(`Comprobando IA de texto y generando descripción para "${nombre}"…`, false, "Iniciando IA");

            try {
                const borrador = descInput?.value.trim() || "";
                const resultado = await generarDescripcionConIA(nombre, borrador);
                if (chkDesc && !chkDesc.checked) {
                    chkDesc.checked = true;
                    containerDesc?.classList.remove("hidden");
                }
                if (descInput) {
                    descInput.value = resultado.texto;
                }
                setAiStatus(resultado.detalle, false, resultado.proveedorEtiqueta);
            } catch (error) {
                console.error("Error generando descripción con IA:", error);
                setAiStatus(error?.message || "No se pudo generar la descripción con IA.", true, "Error IA");
            } finally {
                generatingDescription = false;
                btnDesc.disabled = false;
            }
        });
    }

    if (btnImg) {
        btnImg.addEventListener("click", async () => {
            if (generatingImage) return;
            const nombre = nameInput?.value.trim() || "";
            if (!nombre) {
                setAiStatus("Escribe primero el nombre del servicio para generar su imagen.", true, "Validación");
                nameInput?.focus();
                return;
            }

            generatingImage = true;
            btnImg.disabled = true;
            setAiStatus(`Comprobando IA de imágenes para "${nombre}"…`, false, "Iniciando IA");

            try {
                const resultado = await generarImagenConIA(nombre);
                if (chkImgAi && !chkImgAi.checked) {
                    chkImgAi.checked = true;
                    containerImgAi?.classList.remove("hidden");
                }
                actualizarVistaPreviaImagen(resultado.url);
                setAiStatus(resultado.detalle, false, resultado.proveedorEtiqueta);
            } catch (error) {
                console.error("Error generando imagen con IA:", error);
                setAiStatus(error?.message || "No se pudo generar la imagen con IA.", true, "Error IA");
            } finally {
                generatingImage = false;
                btnImg.disabled = false;
            }
        });
    }
}

iniciarGeneradoresIA();
void comprobarDisponibilidadIA(true);

// Controladores visuales de los Checkboxes opcionales
const setupToggle = (checkboxId, containerId) => {
    const chk = document.getElementById(checkboxId);
    const container = document.getElementById(containerId);
    if (chk && container) {
        chk.addEventListener("change", () => {
            if (chk.checked) {
                container.classList.remove("hidden");
            } else {
                container.classList.add("hidden");
            }
        });
    }
};

setupToggle("toggle-price", "container-price");
setupToggle("toggle-duration", "container-duration");
setupToggle("toggle-description", "container-description");
setupToggle("toggle-image-ai", "container-image-ai");
setupToggle("toggle-custom", "container-custom");

// Validación de sesión y roles de administrador
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(firestore, "USERS", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            alert("Acceso denegado: Perfil no encontrado.");
            window.location.href = "../index.html";
            return;
        }

        const userData = userSnap.data();
        const rolUsuario = userData.role || 'cliente';
        const rolesPermitidos = ['superadmin', 'admin', 'moderador'];

        if (!rolesPermitidos.includes(rolUsuario)) {
            alert("Acceso no autorizado.");
            window.location.href = "../index.html";
            return;
        }

        // Si es moderador, ocultamos automáticamente el enlace/botón de "Usuarios" en la barra de navegación
        if (rolUsuario === 'moderador' && navUsuarios) {
            navUsuarios.style.display = 'none';
        }

        await cargarServicios(rolUsuario);
        await comprobarDisponibilidadIA(true);
    } else {
        window.location.href = "../login.html";
    }
});

// Función para listar servicios desde Firestore
async function cargarServicios(rolUsuario = 'admin') {
    try {
        const querySnapshot = await getDocs(collection(firestore, "SERVICES"));
        if (!servicesTableBody) return;
        servicesTableBody.innerHTML = "";

        if (querySnapshot.empty) {
            servicesTableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-4 text-center text-gray-500">No hay servicios registrados.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const servicio = docSnap.data();
            const serviceId = docSnap.id;

            const displayPrecio = servicio.hasPrice ? `${servicio.currency || ''} ${servicio.price}` : '<span class="text-gray-400 italic">No especificado</span>';
            const displayDuracion = servicio.hasDuration ? servicio.duration : '<span class="text-gray-400 italic">No especificada</span>';

            let displayExtra = '<span class="text-gray-400 italic">Ninguno</span>';
            if (servicio.hasCustom && servicio.customLabel && servicio.customValue) {
                displayExtra = `<span class="font-semibold text-gray-700">${servicio.customLabel}:</span> ${servicio.customValue}`;
            }

            // Si es moderador, ocultamos los botones de acción en la tabla
            let accionesHTML = '';
            if (rolUsuario !== 'moderador') {
                accionesHTML = `
                    <button data-id="${serviceId}" class="btn-editar-servicio text-blue-600 hover:text-blue-900 font-semibold">Editar</button>
                    <button data-id="${serviceId}" class="btn-eliminar-servicio text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                `;
            } else {
                accionesHTML = `<span class="text-gray-400 italic text-xs">Solo lectura</span>`;
            }

            const miniaturaHTML = servicio.imageUrl
                ? `<img src="${servicio.imageUrl}" alt="${servicio.name}" class="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0">`
                : "";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-4 py-4 text-sm text-gray-900">
                    <div class="flex items-start gap-3">
                        ${miniaturaHTML}
                        <div>
                            <div class="font-bold text-gray-900">${servicio.name}</div>
                            ${servicio.hasDescription ? `<div class="text-xs text-gray-500 mt-0.5">${servicio.description}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${displayPrecio}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${displayDuracion}</td>
                <td class="px-4 py-4 text-sm text-gray-600">${displayExtra}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    ${accionesHTML}
                </td>
            `;
            servicesTableBody.appendChild(row);
        });

        // Si es moderador, removemos el contenedor del formulario por completo y expandimos la tabla a todo el ancho
        if (rolUsuario === 'moderador') {
            if (serviceFormContainer) {
                serviceFormContainer.style.display = 'none';
            }
            if (servicesListContainer && mainGridContainer) {
                mainGridContainer.classList.remove("lg:grid-cols-3");
                mainGridContainer.classList.add("grid-cols-1");
                servicesListContainer.classList.remove("lg:col-span-2");
            }
        } else {
            if (serviceFormContainer) {
                serviceFormContainer.style.display = 'block';
            }
            activarBotonesAcciones();
        }

    } catch (error) {
        console.error("Error al cargar servicios:", error);
        servicesTableBody.innerHTML = `<tr><td colspan="5" class="px-4 py-4 text-center text-red-500">Error al cargar servicios.</td></tr>`;
    }
}

// Evento para crear o actualizar un servicio
if (serviceForm) {
    serviceForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("service-name").value.trim();
        const hasPrice = document.getElementById("toggle-price").checked;
        const hasDuration = document.getElementById("toggle-duration").checked;
        const hasDescription = document.getElementById("toggle-description").checked;
        const hasCustom = document.getElementById("toggle-custom").checked;

        const manualImageInput = document.getElementById("service-image-url") || document.getElementById("service-image");
        const imageUrl = (manualImageInput?.value.trim() || currentGeneratedImageUrl) || null;

        const serviceData = {
            name,
            hasPrice,
            hasDuration,
            hasDescription,
            hasCustom,
            imageUrl,
            updatedAt: new Date()
        };

        if (hasPrice) {
            serviceData.price = parseFloat(document.getElementById("service-price").value) || 0;
            serviceData.currency = document.getElementById("service-currency").value;
        } else {
            serviceData.price = null;
            serviceData.currency = null;
        }

        if (hasDuration) {
            serviceData.duration = document.getElementById("service-duration").value.trim();
        } else {
            serviceData.duration = null;
        }

        if (hasDescription) {
            serviceData.description = document.getElementById("service-description").value.trim();
        } else {
            serviceData.description = null;
        }

        if (hasCustom) {
            serviceData.customLabel = document.getElementById("service-custom-label").value.trim() || 'Campo Libre';
            serviceData.customValue = document.getElementById("service-custom-value").value.trim();
        } else {
            serviceData.customLabel = null;
            serviceData.customValue = null;
        }

        try {
            if (editingServiceId) {
                // Actualizar documento existente
                await updateDoc(doc(firestore, "SERVICES", editingServiceId), serviceData);
                alert("Servicio actualizado con éxito.");
                editingServiceId = null;
                document.querySelector("#service-form button[type='submit']").textContent = "Guardar Servicio";
                document.getElementById("form-title").textContent = "Agregar Nuevo Servicio";
            } else {
                // Crear nuevo documento
                serviceData.createdAt = new Date();
                await addDoc(collection(firestore, "SERVICES"), serviceData);
                alert("Servicio creado con éxito.");
            }

            serviceForm.reset();
            actualizarVistaPreviaImagen(null);
            setAiStatus("");

            // Ocultar contenedores opcionales y desmarcar checkboxes
            ["toggle-price", "toggle-duration", "toggle-description", "toggle-image-ai", "toggle-custom"].forEach(id => {
                const chk = document.getElementById(id);
                if (chk) chk.checked = false;
            });
            ["container-price", "container-duration", "container-description", "container-image-ai", "container-custom"].forEach(id => {
                const cont = document.getElementById(id);
                if (cont) cont.classList.add("hidden");
            });

            await cargarServicios();
        } catch (error) {
            console.error("Error al guardar el servicio:", error);
            alert("Hubo un error al procesar la solicitud.");
        }
    });
}

// Activar eventos de los botones Editar y Eliminar en la tabla
function activarBotonesAcciones() {
    // Botón Eliminar
    document.querySelectorAll(".btn-eliminar-servicio").forEach(button => {
        button.addEventListener("click", async (e) => {
            const serviceId = e.target.getAttribute("data-id");

            if (confirm("¿Estás seguro de eliminar este servicio?")) {
                try {
                    await deleteDoc(doc(firestore, "SERVICES", serviceId));
                    alert("Servicio eliminado correctamente.");
                    await cargarServicios();
                } catch (error) {
                    console.error("Error al eliminar servicio:", error);
                    alert("Hubo un error al eliminar el servicio.");
                }
            }
        });
    });

    // Botón Editar
    document.querySelectorAll(".btn-editar-servicio").forEach(button => {
        button.addEventListener("click", async (e) => {
            const serviceId = e.target.getAttribute("data-id");
            try {
                const docSnap = await getDoc(doc(firestore, "SERVICES", serviceId));
                if (!docSnap.exists()) return;

                const servicio = docSnap.data();
                editingServiceId = serviceId;

                // Rellenar campos obligatorios
                document.getElementById("service-name").value = servicio.name || "";
                actualizarVistaPreviaImagen(servicio.imageUrl || null);

                // Configurar Precio y Moneda
                const chkPrice = document.getElementById("toggle-price");
                chkPrice.checked = !!servicio.hasPrice;
                const containerPrice = document.getElementById("container-price");
                if (servicio.hasPrice) {
                    containerPrice.classList.remove("hidden");
                    document.getElementById("service-price").value = servicio.price || "";
                    document.getElementById("service-currency").value = servicio.currency || "USD";
                } else {
                    containerPrice.classList.add("hidden");
                }

                // Configurar Duración
                const chkDuration = document.getElementById("toggle-duration");
                chkDuration.checked = !!servicio.hasDuration;
                const containerDuration = document.getElementById("container-duration");
                if (servicio.hasDuration) {
                    containerDuration.classList.remove("hidden");
                    document.getElementById("service-duration").value = servicio.duration || "";
                } else {
                    containerDuration.classList.add("hidden");
                }

                // Configurar Descripción
                const chkDesc = document.getElementById("toggle-description");
                chkDesc.checked = !!servicio.hasDescription;
                const containerDesc = document.getElementById("container-description");
                if (servicio.hasDescription) {
                    containerDesc.classList.remove("hidden");
                    document.getElementById("service-description").value = servicio.description || "";
                } else {
                    containerDesc.classList.add("hidden");
                }

                // Configurar cajón de Imagen IA si el servicio ya tiene imagenUrl
                const chkImgAi = document.getElementById("toggle-image-ai");
                const containerImgAi = document.getElementById("container-image-ai");
                if (chkImgAi && containerImgAi) {
                    const tieneImg = Boolean(servicio.imageUrl);
                    chkImgAi.checked = tieneImg;
                    containerImgAi.classList.toggle("hidden", !tieneImg);
                }

                // Configurar Campo Libre
                const chkCustom = document.getElementById("toggle-custom");
                chkCustom.checked = !!servicio.hasCustom;
                const containerCustom = document.getElementById("container-custom");
                if (servicio.hasCustom) {
                    containerCustom.classList.remove("hidden");
                    document.getElementById("service-custom-label").value = servicio.customLabel || "";
                    document.getElementById("service-custom-value").value = servicio.customValue || "";
                } else {
                    containerCustom.classList.add("hidden");
                }

                // Cambiar textos para indicar edición
                document.getElementById("form-title").textContent = "Editar Servicio";
                document.querySelector("#service-form button[type='submit']").textContent = "Actualizar Servicio";

                // Hacer scroll suave hacia el formulario para editar cómodamente
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {
                console.error("Error al cargar datos para edición:", error);
                alert("No se pudo cargar el servicio para editar.");
            }
        });
    });
}