// Obtén referencias a los elementos
const toggleButton = document.getElementById("toggle-button");
const footerNavigation = document.getElementById("footer-navigation");
const footerMenu = document.getElementById("footer-menu");

// Evento para alternar la visibilidad del menú
if (toggleButton && footerNavigation) {
  const newToggleButton = toggleButton.cloneNode(true);
  toggleButton.parentNode.replaceChild(nuevoToggleButton = newToggleButton, toggleButton);

  nuevoToggleButton.addEventListener("click", () => {
    footerNavigation.classList.toggle("hidden");
  });
}

// Sincronización exacta del fondo del panel al footer
function sincronizarConPanel() {
  const panelSuperior = document.getElementById('main-navbar');
  if (panelSuperior && footerNavigation) {
    const bgImage = window.getComputedStyle(panelSuperior).backgroundImage;
    const bgColor = window.getComputedStyle(panelSuperior).backgroundColor;

    const esDegradadoBase = bgImage && (
      bgImage.includes('31, 31, 31') ||
      bgImage.includes('44, 44, 44') ||
      bgImage.includes('28, 28, 28')
    );

    if (esDegradadoBase || bgImage === 'none') {
      footerNavigation.style.backgroundImage = '';
      footerNavigation.style.backgroundColor = '';
    } else if (bgImage && bgImage !== 'none') {
      footerNavigation.style.backgroundImage = bgImage;
      footerNavigation.style.backgroundColor = '';
    } else if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
      footerNavigation.style.backgroundColor = bgColor;
      footerNavigation.style.backgroundImage = '';
    }
  }
}

sincronizarConPanel();

const panelSuperior = document.getElementById('main-navbar');
if (panelSuperior && footerNavigation) {
  const observer = new MutationObserver(() => {
    sincronizarConPanel();
  });
  observer.observe(panelSuperior, { attributes: true, attributeFilter: ['style', 'class'] });
}

// Función para cargar contenido sin recargar la página (SPA) en #app-view-container
function cargarContenido(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error al cargar el contenido (${response.status}) en ${url}`);
      }
      return response.text();
    })
    .then(html => {
      const contenedor = document.getElementById('app-view-container');
      if (contenedor) {
        contenedor.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    })
    .catch(error => {
      console.error('Error al cargar la página: ', error);
      if (typeof showNotification === 'function') {
        showNotification('Error al cargar el contenido, por favor intenta de nuevo.');
      }
    });
}

// Manejo de eventos de popstate para navegación del historial (Atrás / Adelante)
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.path) {
    cargarContenido(event.state.path);
  }
});

// Normalizar baseUrl desde index.html
const raizBase = (typeof baseUrl === 'string' && baseUrl.trim() !== '')
  ? baseUrl.replace(/\/+$/, '')
  : '';

// Creación de elementos del menú (Solo las páginas esenciales)
const menuItems = [
  {
    label: 'Política y Términos de Uso',
    link: `${raizBase}/content/privacy/policy-and-terms.html`,
    image: `${raizBase}/assets/img/nav/terminos.svg`
  },
  {
    label: 'Acerca de, Contacto',
    link: `${raizBase}/content/about/about.html`,
    image: `${raizBase}/assets/img/nav/acerca.svg`
  }
];

// Inyección limpia vaciando el ul primero para evitar duplicados
if (footerMenu) {
  footerMenu.innerHTML = '';
  menuItems.forEach(item => {
    const menuItem = document.createElement('li');
    const menuItemLink = document.createElement('a');
    const menuItemImage = document.createElement('img');

    menuItemLink.href = item.link;
    menuItemLink.addEventListener('click', function(event) {
      event.preventDefault();

      // Actualiza la historia del navegador
      history.pushState({ path: item.link }, '', item.link);

      // Dispara popstate para que content.js también se entere (igual que en panel.js)
      window.dispatchEvent(new PopStateEvent('popstate', { state: { path: item.link } }));

      // Carga el contenido dinámicamente en #app-view-container
      cargarContenido(item.link);
    });

    menuItemImage.src = item.image;
    menuItemImage.alt = item.label;
    menuItemLink.appendChild(menuItemImage);
    menuItemLink.appendChild(document.createTextNode(item.label));
    menuItem.appendChild(menuItemLink);
    footerMenu.appendChild(menuItem);
  });
}