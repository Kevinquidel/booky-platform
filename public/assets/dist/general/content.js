// public/assets/dist/general/content.js

// ==========================================
// REDIRECCIÓN DE SEGURIDAD EN BLANCO (ANTI-F5 AISLADO)
// ==========================================
(function() {
    const pathname = window.location.pathname;
    // Si la URL actual contiene la carpeta '/content/' (ej: /content/profile.html)
    if (pathname.includes('/content/')) {
        const partes = pathname.split('/content/');
        if (partes[1]) {
            const vistaArchivo = partes[1]; // Ejemplo: "profile.html"
            
            // Oculta la vista inmediatamente para que el usuario solo vea la pantalla en blanco
            if (document.documentElement) {
                document.documentElement.style.display = 'none';
            }
            
            // Redirige de forma absoluta y limpia a la raíz de tu app pasando la vista como parámetro
            window.location.replace(`${window.location.origin}/index.html?view=${vistaArchivo}`);
            return;
        }
    }
})();

const contenidoContainer = document.getElementById("app-view-container") || document.getElementById("contenido");

if (!contenidoContainer) {
    console.warn("[CONTENT] No se encontró ningún contenedor de vistas ('app-view-container' o 'contenido') en el DOM.");
}

async function loadContent(targetUrl = window.location.href) {
    if (!contenidoContainer) return;

    const urlObj = new URL(targetUrl, window.location.origin);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams.get('view');
    
    let viewFile = 'home.html';
    const checkPath = searchParams ? searchParams : pathname;

    // Detectar qué vista cargar según el parámetro ?view= o la ruta actual
    if (checkPath.includes('services')) {
        viewFile = 'services.html';
    } else if (checkPath.includes('booking')) {
        viewFile = 'booking.html';
    } else if (checkPath.includes('appointments')) {
        viewFile = 'appointments.html';
    } else if (checkPath.includes('profile')) {
        viewFile = 'profile.html';
    } else if (checkPath.includes('policy-and-terms')) {
        viewFile = 'privacy/policy-and-terms.html';
    } else if (checkPath.includes('about')) {
        viewFile = 'about/about.html';
    }

    try {
        // Construcción de la ruta absoluta basada en el origen del servidor
        const fetchUrl = `${window.location.origin}/content/${viewFile}`;
        
        console.log(`[CONTENT] Intentando cargar la vista desde: ${fetchUrl}`);
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error(`No se pudo encontrar el archivo ${viewFile} (Estado: ${response.status})`);
        }

        const htmlContent = await response.text();
        contenidoContainer.innerHTML = htmlContent;
        console.log(`[CONTENT] Vista ${viewFile} inyectada con éxito.`);

        // Inicializar controladores específicos según la vista inyectada
        if (viewFile === 'services.html') {
            import('../settings/client/services.js').then(module => {
                if (typeof module.initServices === 'function') {
                    module.initServices();
                }
            }).catch(err => console.log("No se pudo cargar el script de services:", err));
        } else if (viewFile === 'booking.html') {
            import('../settings/client/client-booking.js').then(module => {
                if (module.initBookingForm) module.initBookingForm();
            }).catch(err => console.log("No se pudo cargar el script de booking:", err));
        } else if (viewFile === 'appointments.html') {
            import('../settings/client/client-appointments.js').then(module => {
                if (typeof module.initAppointments === 'function') {
                    module.initAppointments();
                }
            }).catch(err => console.log("No se pudo cargar el script de appointments:", err));
        } else if (viewFile === 'profile.html') {
            import('../settings/client/profile.js').then(module => {
                if (typeof module.inicializarPerfil === 'function') {
                    module.inicializarPerfil();
                }
            }).catch(err => console.log("No se pudo cargar el script de profile:", err));
        }

    } catch (error) {
        console.error("Error al inyectar el contenido dinámico:", error);
        contenidoContainer.innerHTML = `<p style="padding: 20px; color: #e53e3e;">Error al cargar la vista (${viewFile}). Revisa que el archivo exista en public/content/</p>`;
    }
}

// Escuchar cuando el usuario navega hacia adelante o atrás con las flechas del navegador
window.addEventListener('popstate', () => {
    loadContent(window.location.href);
});

// Exponer funciones globalmente de forma inmediata
window.loadDynamicContent = loadContent;
window.cargarContenido = loadContent;

// Cargar contenido inicial al abrir o refrescar la página
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => loadContent());
} else {
    loadContent();
}