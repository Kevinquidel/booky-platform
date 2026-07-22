// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

const tableBody = document.getElementById("users-table-body");
const navUsuarios = document.getElementById("nav-usuarios"); // Referencia al enlace de usuarios

// Escuchar cambios en el estado de autenticación y validar roles antes de permitir acceso
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
        
        // 🔒 VALIDACIÓN DE SEGURIDAD POR ROL
        const userDocRef = doc(firestore, "USERS", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            console.error("El documento del usuario no existe en Firestore.");
            alert("Acceso denegado: Perfil no encontrado.");
            window.location.href = "../index.html"; 
            return;
        }

        const userData = userSnap.data();
        const rolUsuario = userData.role || 'cliente';

        // Permitimos moderadores, admin y superadmin en el panel general, pero controlamos vistas
        const rolesPermitidos = ['superadmin', 'admin', 'moderador'];

        if (!rolesPermitidos.includes(rolUsuario)) {
            console.warn(`Acceso bloqueado: El usuario ${user.email} tiene el rol '${rolUsuario}' y no tiene permisos administrativos.`);
            alert("Acceso no autorizado: No tienes permisos para ver este panel.");
            window.location.href = "../index.html"; 
            return;
        }

        // Si es moderador, ocultamos el botón/enlace de "Usuarios" de la barra de navegación
        if (rolUsuario === 'moderador' && navUsuarios) {
            navUsuarios.style.display = 'none';
        }

        console.log(`Acceso concedido. Rol detectado: ${rolUsuario}`);
        
        // Si esta vista es estrictamente la de gestión de usuarios y un moderador intenta entrar directamente, podemos bloquearlo o dejarlo ver según tu preferencia. 
        // Si estás en la página de usuarios y el moderador no debe estar aquí:
        if (rolUsuario === 'moderador') {
            alert("Los moderadores no tienen acceso a la gestión de usuarios.");
            window.location.href = "appointments-management.html"; // Redirigir a citas
            return;
        }

        // Pasamos el UID del usuario actual para bloquear acciones sobre sí mismo
        await cargarUsuarios(user.uid);

    } else {
        console.log('Usuario no autenticado');
        window.location.href = "../login.html";
    }
});

// Función para obtener y listar todos los usuarios de Firestore
async function cargarUsuarios(currentUserId) {
    try {
        const querySnapshot = await getDocs(collection(firestore, "USERS"));
        if (!tableBody) return;
        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No hay usuarios registrados.</td></tr>`;
            return;
        }

        const usuariosArray = [];
        querySnapshot.forEach((documentSnapshot) => {
            usuariosArray.push({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            });
        });

        const primerUsuarioId = usuariosArray.length > 0 ? usuariosArray[0].id : null;

        if (usuariosArray.length > 0 && usuariosArray[0].role !== 'superadmin') {
            const userDocRef = doc(firestore, "USERS", primerUsuarioId);
            await updateDoc(userDocRef, { role: 'superadmin' });
            usuariosArray[0].role = 'superadmin'; 
        }

        usuariosArray.forEach((userData, index) => {
            const userId = userData.id;
            const userEmail = userData.userEmail || '';
            
            let rolActual = userData.role;

            if (index === 0) {
                rolActual = 'superadmin';
            } else if (!rolActual) {
                rolActual = 'cliente';
            }

            const estadoActual = userData.estadoCuenta !== false;
            const esSuperAdminPrincipal = (index === 0);
            const esUnoMismo = (userId === currentUserId);

            let badgeStyle = 'bg-gray-100 text-gray-800';
            let etiquetaRol = 'Cliente';

            if (rolActual === 'superadmin') {
                badgeStyle = 'bg-red-100 text-red-800';
                etiquetaRol = 'Super Admin';
            } else if (rolActual === 'admin') {
                badgeStyle = 'bg-purple-100 text-purple-800';
                etiquetaRol = 'Administrador';
            } else if (rolActual === 'moderador') {
                badgeStyle = 'bg-blue-100 text-blue-800';
                etiquetaRol = 'Moderador';
            } else {
                badgeStyle = 'bg-green-100 text-green-800';
                etiquetaRol = 'Cliente';
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${userData.displayName || 'Sin nombre'} 
                    ${esSuperAdminPrincipal ? '<span class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded ml-1">Absoluto</span>' : ''}
                    ${esUnoMismo ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-1">Tú</span>' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${userEmail}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeStyle}">
                        ${etiquetaRol}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    ${esSuperAdminPrincipal || esUnoMismo ? 
                        `<span class="text-gray-400 italic">${esSuperAdminPrincipal ? 'Inmutable (Sistema)' : 'No editable (Tu cuenta)'}</span>` : 
                        `<select data-id="${userId}" class="role-selector bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5">
                            <option value="cliente" ${rolActual === 'cliente' ? 'selected' : ''}>Cliente</option>
                            <option value="moderador" ${rolActual === 'moderador' ? 'selected' : ''}>Moderador</option>
                            <option value="admin" ${rolActual === 'admin' ? 'selected' : ''}>Administrador</option>
                            <option value="superadmin" ${rolActual === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                        </select>
                        <select data-id="${userId}" class="status-selector bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5">
                            <option value="true" ${estadoActual ? 'selected' : ''}>Habilitado</option>
                            <option value="false" ${!estadoActual ? 'selected' : ''}>Inhabilitado</option>
                        </select>
                        <button data-id="${userId}" class="btn-eliminar text-red-600 hover:text-red-900">Eliminar</button>`
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });

        activarBotonesAccion(primerUsuarioId, currentUserId);

    } catch (error) {
        console.error("Error al cargar los usuarios:", error);
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Error al conectar con la base de datos.</td></tr>`;
    }
}

function activarBotonesAccion(primerUsuarioId, currentUserId) {
    document.querySelectorAll(".role-selector").forEach(select => {
        select.addEventListener("change", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const nuevoRol = e.target.value;

            if (userId === primerUsuarioId || userId === currentUserId) {
                alert("Acción denegada: No puedes modificar tu propio rol ni el del superadministrador principal.");
                cargarUsuarios(currentUserId);
                return;
            }

            if (confirm(`¿Estás seguro de cambiar el rol de este usuario a "${nuevoRol.toUpperCase()}"?`)) {
                try {
                    const userDocRef = doc(firestore, "USERS", userId);
                    await updateDoc(userDocRef, { role: nuevoRol });
                    alert("Rol actualizado con éxito en la base de datos.");
                    cargarUsuarios(currentUserId);
                } catch (err) {
                    console.error("Error al actualizar rol:", err);
                    alert("Hubo un error al cambiar el rol.");
                    cargarUsuarios(currentUserId); 
                }
            } else {
                cargarUsuarios(currentUserId); 
            }
        });
    });

    document.querySelectorAll(".status-selector").forEach(select => {
        select.addEventListener("change", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const nuevoEstado = e.target.value === "true";

            if (userId === primerUsuarioId || userId === currentUserId) {
                alert("Acción denegada: No puedes cambiar el estado de tu propia cuenta.");
                cargarUsuarios(currentUserId);
                return;
            }

            const accionTexto = nuevoEstado ? "habilitar" : "inhabilitar";

            if (confirm(`¿Estás seguro de ${accionTexto} a este usuario?`)) {
                try {
                    const userDocRef = doc(firestore, "USERS", userId);
                    await updateDoc(userDocRef, { estadoCuenta: nuevoEstado });
                    alert(`Usuario ${nuevoEstado ? 'habilitado' : 'inhabilitado'} con éxito.`);
                    cargarUsuarios(currentUserId);
                } catch (err) {
                    console.error("Error al cambiar estado:", err);
                    alert("Hubo un error al actualizar el estado del usuario.");
                    cargarUsuarios(currentUserId);
                }
            } else {
                cargarUsuarios(currentUserId);
            }
        });
    });

    document.querySelectorAll(".btn-eliminar").forEach(button => {
        button.addEventListener("click", async (e) => {
            const userId = e.target.getAttribute("data-id");

            if (userId === primerUsuarioId || userId === currentUserId) {
                alert("Acción denegada: No puedes eliminar tu propia cuenta.");
                return;
            }

            if (confirm("¿Estás seguro de eliminar este usuario de Firestore?")) {
                try {
                    const userDocRef = doc(firestore, "USERS", userId);
                    await deleteDoc(userDocRef);
                    alert("Usuario eliminado correctamente de la base de datos.");
                    cargarUsuarios(currentUserId);
                } catch (err) {
                    console.error("Error al eliminar usuario:", err);
                    alert("Hubo un error al eliminar el usuario.");
                }
            }
        });
    });
}