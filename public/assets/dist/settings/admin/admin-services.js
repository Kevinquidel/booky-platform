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

const servicesTableBody = document.getElementById("services-table-body");
const serviceForm = document.getElementById("service-form");
const serviceFormContainer = document.getElementById("service-form-container");
const servicesListContainer = document.getElementById("services-list-container");
const mainGridContainer = document.getElementById("main-grid-container");
const navUsuarios = document.getElementById("nav-usuarios"); // Referencia al enlace de usuarios en la barra de navegación

// Variable global para controlar si estamos editando un servicio existente
let editingServiceId = null;

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

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-4 py-4 text-sm text-gray-900">
                    <div class="font-bold text-gray-900">${servicio.name}</div>
                    ${servicio.hasDescription ? `<div class="text-xs text-gray-500 mt-0.5">${servicio.description}</div>` : ''}
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

        const serviceData = {
            name,
            hasPrice,
            hasDuration,
            hasDescription,
            hasCustom,
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
            
            // Ocultar contenedores opcionales y desmarcar checkboxes
            ["toggle-price", "toggle-duration", "toggle-description", "toggle-custom"].forEach(id => {
                document.getElementById(id).checked = false;
            });
            ["container-price", "container-duration", "container-description", "container-custom"].forEach(id => {
                document.getElementById(id).classList.add("hidden");
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