// Obtén referencias a los elementos
const toggleButton = document.getElementById("toggle-button");
const footerNavigation = document.getElementById("footer-navigation");
const footerMenu = document.getElementById("footer-menu");

// Evento para alternar la visibilidad del menú
if (toggleButton && footerNavigation) {
  // Evitar duplicar el listener si el script se ejecuta más de una vez
  const newToggleButton = toggleButton.cloneNode(true);
  toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
  
  newToggleButton.addEventListener("click", () => {
    footerNavigation.classList.toggle("hidden");
  });
}

// Sincronización exacta del fondo del panel al footer
function sincronizarConPanel() {
  const panelSuperior = document.getElementById('main-navbar');
  if (panelSuperior && footerNavigation) {
    const bgImage = window.getComputedStyle(panelSuperior).backgroundImage;
    const bgColor = window.getComputedStyle(panelSuperior).backgroundColor;

    // Detectar si el panel tiene el degradado base/predeterminado oscuro inicial
    const esDegradadoBase = bgImage && (bgImage.includes('31, 31, 31') || bgImage.includes('44, 44, 44') || bgImage.includes('28, 28, 28'));

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

// Sincronizar al cargar la página
sincronizarConPanel();

// Vigilar cualquier cambio en tiempo real (pincel o restablecer)
const panelSuperior = document.getElementById('main-navbar');
if (panelSuperior && footerNavigation) {
  const observer = new MutationObserver(() => {
    sincronizarConPanel();
  });
  observer.observe(panelSuperior, { attributes: true, attributeFilter: ['style', 'class'] });
}

// Función para cargar contenido sin recargar la página (SPA)
function cargarContenido(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el contenido');
      }
      return response.text();
    })
    .then(html => {
      const contenedor = document.getElementById('contenido');
      if (contenedor) {
        contenedor.innerHTML = html;
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

// Creación de elementos del menú (Solo las páginas esenciales)
const menuItems = [
  { label: 'Política y Términos de Uso', link: `${baseUrl}content/privacy/policy-and-terms.html`, image: `${baseUrl}assets/img/nav/terminos.svg` },
  { label: 'Acerca de, Contacto', link: `${baseUrl}content/about/about.html`, image: `${baseUrl}assets/img/nav/acerca.svg` }
];

// CORRECCIÓN: Inyección limpia vaciando el ul primero para evitar duplicados
if (footerMenu) {
  footerMenu.innerHTML = ''; 
  menuItems.forEach(item => {
    const menuItem = document.createElement('li');
    const menuItemLink = document.createElement('a');
    const menuItemImage = document.createElement('img');

    menuItemLink.href = item.link;
    menuItemLink.addEventListener('click', function(event) {
      event.preventDefault(); // Previene que el navegador recargue la página
      cargarContenido(this.href); // Carga el contenido por AJAX
      
      // Actualiza la historia del navegador
      history.pushState({ path: this.href }, '', this.href);
    });
    
    menuItemImage.src = item.image;
    menuItemImage.alt = item.label;
    menuItemLink.appendChild(menuItemImage);
    menuItemLink.appendChild(document.createTextNode(item.label));
    menuItem.appendChild(menuItemLink);
    footerMenu.appendChild(menuItem);
  });
}