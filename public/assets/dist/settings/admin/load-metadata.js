// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const CACHE_KEY = "booky_site_metadata_cache";

async function aplicarMetadatosGlobales() {
    console.log("🔄 Iniciando carga y aplicación de metadatos globales...");
    
    const assetsDefault = {
        logo1024: "/assets/img/web/booky-logo.png",
        favicon16: "/assets/img/web/favicon-16x16.png",
        favicon32: "/assets/img/web/favicon-32x32.png",
        favicon96: "/assets/img/web/favicon-96x96.png",
        appleTouch: "/assets/img/web/apple-touch-icon.png",
        android192: "/assets/img/web/android-chrome-192x192.png",
        android512: "/assets/img/web/android-chrome-512x512.png"
    };

    let data;

    try {
        // 1. Intentar cargar desde el caché local del navegador primero
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.log("⚡ Usando metadatos desde el caché local del navegador.");
            data = JSON.parse(cachedData);
        } else {
            // 2. Si no hay caché, consultar Firestore
            const snap = await getDoc(doc(firestore, "SETTINGS", "site-metadata"));
            
            if (snap.exists()) {
                console.log("✅ Documento 'SETTINGS/site-metadata' encontrado en Firestore.");
                const raw = snap.data();
                const sourceAssets = raw.assets || raw;

                data = {
                    title: raw.title || "Booky - Gestión de citas y reservas",
                    description: raw.description || "BOOKY es una plataforma web para gestionar citas, servicios y reservas de forma rápida, organizada y sencilla.",
                    author: raw.author || "BOOKY",
                    siteName: raw.siteName || "BOOKY",
                    logo1024: sourceAssets.logo1024 || raw.logo1024 || assetsDefault.logo1024,
                    favicon16: sourceAssets.favicon16 || raw.favicon16 || assetsDefault.favicon16,
                    favicon32: sourceAssets.favicon32 || raw.favicon32 || assetsDefault.favicon32,
                    favicon96: sourceAssets.favicon96 || raw.favicon96 || assetsDefault.favicon96,
                    appleTouch: sourceAssets.appleTouch || raw.appleTouch || assetsDefault.appleTouch,
                    android192: sourceAssets.android192 || raw.android192 || assetsDefault.android192,
                    android512: sourceAssets.android512 || raw.android512 || assetsDefault.android512
                };
            } else {
                console.warn("⚠️ El documento 'SETTINGS/site-metadata' no existe en Firestore. Usando valores por defecto.");
                data = {
                    title: "Booky - Gestión de citas y reservas",
                    description: "BOOKY es una plataforma web para gestionar citas, servicios y reservas de forma rápida, organizada y sencilla.",
                    author: "BOOKY",
                    siteName: "BOOKY",
                    ...assetsDefault
                };
            }

            // Guardar en localStorage para futuras visitas
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }

        // 3. Actualizar Title de la pestaña
        document.title = data.title;

        // 4. Actualizar Título principal dentro del cuerpo (Body)
        const mainTitleEl = document.getElementById('main-title');
        if (mainTitleEl) {
            mainTitleEl.textContent = data.title;
        }

        // 5. Actualizar Logos del Cuerpo antes de mostrar nada
        const headerLogoImg = document.getElementById('header-logo-img');
        if (headerLogoImg && data.logo1024) {
            headerLogoImg.src = data.logo1024;
        }

        const loadingLogoImg = document.getElementById('loading-logo-img');
        if (loadingLogoImg && data.logo1024) {
            loadingLogoImg.src = data.logo1024;
        }

        // 6. Actualizar Meta Tags principales y de Redes Sociales
        const tags = {
            "description": data.description,
            "author": data.author,
            "og:title": data.title,
            "og:description": data.description,
            "og:type": "website",
            "og:site_name": data.siteName,
            "og:image": data.logo1024,
            "twitter:card": "summary_large_image",
            "twitter:title": data.title,
            "twitter:description": data.description,
            "twitter:image": data.logo1024
        };

        for (const [key, value] of Object.entries(tags)) {
            if (!value) continue;
            let attrName = (key.startsWith("og:") || key === "author") ? "property" : "name";
            if (key === "author" || key === "description") attrName = "name";

            let element = document.querySelector(`meta[${attrName}="${key}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attrName, key);
                document.head.appendChild(element);
            }
            element.content = value;
        }

        // 7. Actualizar Favicons
        const faviconConfigs = [
            { rel: "icon", type: "image/png", sizes: "16x16", href: data.favicon16 },
            { rel: "icon", type: "image/png", sizes: "32x32", href: data.favicon32 },
            { rel: "icon", type: "image/png", sizes: "96x96", href: data.favicon96 },
            { rel: "apple-touch-icon", sizes: "180x180", href: data.appleTouch }
        ];

        faviconConfigs.forEach(cfg => {
            let selector = `link[rel="${cfg.rel}"]`;
            if (cfg.sizes) selector += `[sizes="${cfg.sizes}"]`;

            let link = document.querySelector(selector);
            if (!link) {
                link = document.createElement('link');
                link.rel = cfg.rel;
                if (cfg.sizes) link.setAttribute('sizes', cfg.sizes);
                if (cfg.type) link.type = cfg.type;
                document.head.appendChild(link);
            }
            link.href = cfg.href;
        });

        console.log("🎉 ¡Metadatos aplicados con éxito!");

    } catch (e) {
        console.error("❌ Error crítico cargando metadatos:", e);
    } finally {
        // 8. Revelar el contenido de la página una vez aplicado todo (éxito o error)
        document.body.classList.add('metadata-loaded');
    }
}

aplicarMetadatosGlobales();