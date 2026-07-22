import { firebaseConfig } from "../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../settings/config/firebase-config-urls.js";
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// ==========================================
// 2. CONFIGURACIÓN Y LÓGICA DE NAVEGACIÓN
// ==========================================
const baseUrl = '/'; 

const navigationButtons = [
  { 
    label: 'Inicio',
    link: `${baseUrl}index.html`,
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    roles: ['cliente', 'moderador', 'admin', 'superadmin']
  },
  { 
    label: 'Servicios',
    link: `${baseUrl}content/services.html`,
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 15H4V8h16v11z"/></svg>`,
    roles: ['cliente']
  },
  { 
    label: 'Reservar Cita',
    link: `${baseUrl}content/booking.html`,
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM7 11h5v5H7z"/></svg>`,
    roles: ['cliente']
  },
  { 
    label: 'Mis Citas',
    link: `${baseUrl}content/appointments.html`, // <- Cambiado a content/
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM12 10c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    roles: ['cliente']
  },
  { 
    label: 'Perfil',
    link: `${baseUrl}content/profile.html`, // <- Cambiado a content/
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
    roles: ['cliente', 'moderador', 'admin', 'superadmin']
  },
  { 
    label: 'Gestión Citas',
    link: `${baseUrl}dashboard/appointments-management.html`,
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`,
    roles: ['moderador', 'admin', 'superadmin']
  },
  { 
    label: 'Panel Admin',
    link: `${baseUrl}dashboard/panel-admn.html`,
    svg: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38-1.03.7-1.62.94l-.36 2.54c.05.24.24.41.48.41h3.84c-.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    roles: ['admin', 'superadmin']
  }
];

function generateButtons(rolUsuario = 'cliente') {
  const navigationElement = document.getElementById('navigation');
  const subcategoryPanel = document.getElementById('subcategory-panel');
  let activeButton = null;
  let isSubMenuVisible = false;

  if (!navigationElement) return;

  navigationElement.innerHTML = ''; 

  const botonesPermitidos = navigationButtons.filter(button => button.roles.includes(rolUsuario));

  botonesPermitidos.forEach(button => {
    const buttonElement = document.createElement('a');
    buttonElement.href = button.link;
    buttonElement.classList.add('btn');
    buttonElement.innerHTML = `
      ${button.svg}
      <span>${button.label}</span>
    `;

// Interceptar el clic solo si NO es una página del dashboard
    buttonElement.addEventListener('click', (event) => {
      // Si la ruta incluye 'dashboard/', dejamos que el navegador abra la página con normalidad
      if (button.link.includes('dashboard/')) {
        return; // Sale de la función y permite la recarga completa natural
      }

      event.preventDefault(); // Evita la recarga solo para las pestañas de la SPA
      
      // Actualiza la URL en la barra de direcciones sin refrescar la página
      history.pushState({ path: button.link }, '', button.link);
      
      // Fuerza el evento popstate para que content.js detecte el cambio de vista
      window.dispatchEvent(new PopStateEvent('popstate', { state: { path: button.link } }));
      
      // Si manejas una función global de carga, la ejecutas aquí
      if (typeof cargarContenido === 'function') {
        cargarContenido(button.link);
      } else {
        window.location.reload(); 
      }
    });

    navigationElement.appendChild(buttonElement);

    if (button.subcategories) {
      buttonElement.classList.add('dropdown');

      buttonElement.addEventListener('mouseover', () => {
        if (activeButton && activeButton !== buttonElement) {
          activeButton.classList.remove('active');
          if (subcategoryPanel) subcategoryPanel.style.display = 'none';
          isSubMenuVisible = false;
        }

        activeButton = buttonElement;
        if (subcategoryPanel) {
          subcategoryPanel.innerHTML = '';

          button.subcategories.forEach(subcategory => {
            const subButtonElement = document.createElement('a');
            subButtonElement.href = subcategory.link;
            subButtonElement.innerHTML = `
              <img src="${subcategory.image}" alt="${subcategory.label}" title="${subcategory.comment}">
              <span>${subcategory.label}</span>
            `;
            subcategoryPanel.appendChild(subButtonElement);
          });

          subcategoryPanel.style.display = 'block';
          isSubMenuVisible = true;

          const buttonRect = buttonElement.getBoundingClientRect();
          subcategoryPanel.style.left = `${buttonRect.left}px`;
          subcategoryPanel.style.top = `${buttonRect.bottom}px`;
        }
      });

      buttonElement.addEventListener('mouseout', () => {
        if (activeButton === buttonElement && !isSubMenuVisible) {
          activeButton.classList.remove('active');
          activeButton = null;
          if (subcategoryPanel) subcategoryPanel.style.display = 'none';
        }
      });
    }
  });

  if (subcategoryPanel) {
    subcategoryPanel.addEventListener('mouseover', () => {
      if (activeButton) {
        activeButton.classList.add('active');
        subcategoryPanel.style.display = 'block';
        isSubMenuVisible = true;
      }
    });

    subcategoryPanel.addEventListener('mouseout', (event) => {
      if (activeButton && !subcategoryPanel.contains(event.relatedTarget)) {
        activeButton.classList.remove('active');
        activeButton = null;
        subcategoryPanel.style.display = 'none';
        isSubMenuVisible = false;
      }
    });
  }
}

// Llamada inicial o vinculación con Firebase Auth para obtener el rol real
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Usando "USERS" en mayúsculas tal como lo tienes en tu panel de administración
      const userDocRef = doc(firestore, "USERS", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const rolUsuario = userData.role || userData.rol || 'cliente';
        
        console.log(`[NAVBAR] Acceso concedido para ${user.email}. Rol detectado: ${rolUsuario}`);
        generateButtons(rolUsuario);
      } else {
        console.warn("[NAVBAR] El documento del usuario no existe en USERS. Usando rol por defecto: cliente");
        generateButtons('cliente');
      }
    } catch (error) {
      console.error("[NAVBAR] Error al obtener el rol del usuario:", error);
      generateButtons('cliente');
    }
  } else {
    console.log("[NAVBAR] No hay usuario autenticado. Usando rol por defecto: cliente");
    generateButtons('cliente');
  }
});


// ==========================================
// PERSONALIZACION DEL PANEL //
/////////////////////////////

let panelElement = document.getElementById('main-navbar'); 
let mainNavbar = document.getElementById('main-navbar'); 
function getPrimeraLetraContainer() {
    return document.getElementById('primeraLetraContainer');
}
const footerNavigation = document.getElementById('footer-navigation');

let toolsContainer = document.getElementById('tools-container-unique');
let mainToolButton, toolsDropdown, iconImage;

if (!toolsContainer) {
    toolsContainer = document.createElement('div');
    toolsContainer.id = 'tools-container-unique';
    toolsContainer.style.position = 'relative';
    toolsContainer.style.display = 'flex';
    toolsContainer.style.alignItems = 'center';
    toolsContainer.style.marginLeft = '12px';  
    toolsContainer.style.marginRight = '203px'; 

    mainToolButton = document.createElement('button');
    mainToolButton.style.border = 'none';
    mainToolButton.style.background = 'none';
    mainToolButton.style.padding = '0';
    mainToolButton.style.cursor = 'pointer';
    mainToolButton.style.width = '32px';
    mainToolButton.style.height = '32px';
    mainToolButton.style.display = 'flex';
    mainToolButton.style.alignItems = 'center';
    mainToolButton.style.justifyContent = 'center';

    iconImage = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconImage.setAttribute('viewBox', '0 0 24 24');
    iconImage.setAttribute('width', '24px');
    iconImage.setAttribute('height', '24px');
    iconImage.id = 'color-icon';
    iconImage.innerHTML = `
      <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/>
    `;
    mainToolButton.appendChild(iconImage);

    toolsDropdown = document.createElement('div');
    toolsDropdown.style.display = 'none';
    toolsDropdown.style.position = 'absolute';
    toolsDropdown.style.left = '0';
    toolsDropdown.style.top = 'auto';
    toolsDropdown.style.bottom = '45px'; 
    toolsDropdown.style.backgroundColor = '#ffffff';
    toolsDropdown.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.15)';
    toolsDropdown.style.borderRadius = '8px';
    toolsDropdown.style.padding = '8px';
    toolsDropdown.style.zIndex = '1000';
    toolsDropdown.style.minWidth = '160px';

    const optionColor = document.createElement('div');
    optionColor.style.padding = '8px 12px';
    optionColor.style.cursor = 'pointer';
    optionColor.style.display = 'flex';
    optionColor.style.alignItems = 'center';
    optionColor.style.gap = '8px';
    optionColor.style.fontSize = '14px';
    optionColor.style.color = '#333';
    optionColor.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#555"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.35c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.98-1.98C9.28 19.26 10.6 19.5 12 19.5c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
      Cambiar Color
    `;

    optionColor.addEventListener('mouseover', () => optionColor.style.backgroundColor = '#f1f1f1');
    optionColor.addEventListener('mouseout', () => optionColor.style.backgroundColor = 'transparent');

    optionColor.addEventListener('click', () => {
      const randomColor1 = getRandomColor();
      const randomColor2 = getRandomColor();
      const randomGradient = `linear-gradient(to right, ${randomColor1}, ${randomColor2})`;
      if (panelElement) panelElement.style.backgroundImage = randomGradient;
      if (mainNavbar) mainNavbar.style.backgroundImage = randomGradient;
      const primeraLetraContainer = getPrimeraLetraContainer();

      if (primeraLetraContainer) {
        primeraLetraContainer.style.backgroundColor = randomColor2;
      }  
      updateIconAndTextColors(randomGradient);
      localStorage.setItem('panelGradient', randomGradient);
      toolsDropdown.style.display = 'none';
    });

    const optionReset = document.createElement('div');
    optionReset.style.padding = '8px 12px';
    optionReset.style.cursor = 'pointer';
    optionReset.style.display = 'flex';
    optionReset.style.alignItems = 'center';
    optionReset.style.gap = '8px';
    optionReset.style.fontSize = '14px';
    optionReset.style.color = '#333';
    optionReset.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#555"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 2.97-2.17 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.08 3.05 7.44 7 7.93v-2.02c-2.83-.48-5-2.94-5-5.91z"/></svg>
      Restablecer
    `;

    optionReset.addEventListener('mouseover', () => optionReset.style.backgroundColor = '#f1f1f1');
    optionReset.addEventListener('mouseout', () => optionReset.style.backgroundColor = 'transparent');

    optionReset.addEventListener('click', () => {
      if (panelElement) panelElement.style.backgroundImage = defaultGradient;
      if (mainNavbar) mainNavbar.style.backgroundImage = defaultGradient;
      const primeraLetraContainer = getPrimeraLetraContainer();
      if (primeraLetraContainer) {
        primeraLetraContainer.style.backgroundColor = '#2c2c2c';
      }  
      updateIconAndTextColors(defaultGradient);
      localStorage.removeItem('panelGradient');
      location.reload();
    });

    toolsDropdown.appendChild(optionColor);
    toolsDropdown.appendChild(optionReset);
    toolsContainer.appendChild(mainToolButton);
    toolsContainer.appendChild(toolsDropdown);

    mainToolButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = toolsDropdown.style.display === 'block';
      toolsDropdown.style.display = isVisible ? 'none' : 'block';
    });
} else {
    mainToolButton = toolsContainer.querySelector('button');
    toolsDropdown = toolsContainer.querySelector('div');
    iconImage = toolsContainer.querySelector('#color-icon');
}

if (footerNavigation && !footerNavigation.contains(toolsContainer)) {
  footerNavigation.prepend(toolsContainer);
}

const userGreeting = document.getElementById('userGreeting');
const userMenu = document.getElementById('booky-nav-container');

if (panelElement) {
    if (userGreeting) {
        panelElement.appendChild(userGreeting);
    }
    if (userMenu) {
        panelElement.appendChild(userMenu);
    }
}

document.addEventListener('click', () => {
  if (toolsDropdown) toolsDropdown.style.display = 'none';
});

const defaultGradient = 'linear-gradient(to right, #1f1f1f, #2c2c2c)'; 
const savedGradient = localStorage.getItem('panelGradient');
const activeGradient = savedGradient || defaultGradient;
if (panelElement) panelElement.style.backgroundImage = activeGradient;
if (mainNavbar) mainNavbar.style.backgroundImage = activeGradient;

updateIconAndTextColors(activeGradient);

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function updateIconAndTextColors(gradient) {
  const colors = gradient.match(/#[0-9A-Fa-f]{6}/g);
  const esDegradadoBase = gradient.includes('191919') || gradient.includes('1f1f1f') || gradient.includes('2c2c2c');

  if (esDegradadoBase || gradient === 'none') {
    if (footerNavigation) {
      footerNavigation.style.backgroundImage = '';
      footerNavigation.style.backgroundColor = '';
      footerNavigation.style.color = '';
      footerNavigation.querySelectorAll('a, span').forEach(el => el.style.color = '');
      footerNavigation.querySelectorAll('img, svg').forEach(img => img.style.filter = '');
    }
  } else {
    if (footerNavigation) {
      footerNavigation.style.backgroundImage = gradient;
      footerNavigation.style.backgroundColor = '';
    }
  }

  if (colors && colors.length >= 2) {
    const firstColor = colors[0];
    const lastColor = colors[colors.length - 1];
    const isDark = isDarkColor(firstColor) || isDarkColor(lastColor);
    const iconColor = isDark ? '#FFFFFF' : '#000000';
    
    if (iconImage) iconImage.style.fill = iconColor;
    
    if (mainNavbar) {
      const navigationLinks = mainNavbar.querySelectorAll('#navigation a');
      for (let i = 0; i < navigationLinks.length; i++) {
        navigationLinks[i].style.color = iconColor;
      }

      const searchIconElement = mainNavbar.querySelector('#main-navbar > svg, #main-navbar img, .search-icon, svg[viewBox*="9.14"] + svg, button + svg');
      if (searchIconElement) {
        searchIconElement.style.color = iconColor;
        if(searchIconElement.tagName.toLowerCase() === 'img') {
          searchIconElement.style.filter = isDark ? 'invert(1)' : 'invert(0)';
        }
      }
    }

    if (footerNavigation && !esDegradadoBase) {
      const footerElements = footerNavigation.querySelectorAll('a, span');
      footerElements.forEach(el => el.style.color = iconColor);
      
      const footerImages = footerNavigation.querySelectorAll('img, svg');
      footerImages.forEach(img => {
        img.style.filter = isDark ? 'invert(1)' : 'invert(0)';
      });
    }

    const primeraLetraContainer = getPrimeraLetraContainer();
    if (primeraLetraContainer) {
      primeraLetraContainer.style.backgroundColor = lastColor;  
    }
  }
}

function isDarkColor(color) {
  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.substring(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const [r, g, b] = hexToRgb(color);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

const toggleButton = document.getElementById("toggle-button");
if (toggleButton && footerNavigation) {
  const newToggleButton = toggleButton.cloneNode(true);
  toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
  
  newToggleButton.addEventListener("click", () => {
    footerNavigation.classList.toggle("hidden");
  });
}

function sincronizarConPanel() {
  const panelSuperior = document.getElementById('main-navbar');
  if (panelSuperior && footerNavigation) {
    const bgImage = window.getComputedStyle(panelSuperior).backgroundImage;
    const bgColor = window.getComputedStyle(panelSuperior).backgroundColor;

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

sincronizarConPanel();

const panelSuperiorObserver = document.getElementById('main-navbar');
if (panelSuperiorObserver && footerNavigation) {
  const observer = new MutationObserver(() => {
    sincronizarConPanel();
  });
  observer.observe(panelSuperiorObserver, { attributes: true, attributeFilter: ['style', 'class'] });
}

function cargarContenido(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar el contenido');
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
    });
}

window.addEventListener('popstate', function(event) {
  if (event.state && event.state.path) {
    cargarContenido(event.state.path);
  }
});

const menuItems = [
  { label: 'Política y Términos de Uso', link: `${baseUrl}content/privacy/policy-and-terms.html`, image: `${baseUrl}assets/img/nav/terminos.svg` },
  { label: 'Acerca de, Contacto', link: `${baseUrl}content/about/about.html`, image: `${baseUrl}assets/img/nav/acerca.svg` }
];

const footerMenu = document.getElementById("footer-menu");
if (footerMenu) {
  footerMenu.innerHTML = ''; 
  menuItems.forEach(item => {
    const menuItem = document.createElement('li');
    const menuItemLink = document.createElement('a');
    const menuItemImage = document.createElement('img');

    menuItemLink.href = item.link;
    menuItemLink.addEventListener('click', function(event) {
      event.preventDefault(); 
      cargarContenido(this.href); 
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