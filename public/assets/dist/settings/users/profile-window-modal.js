// profile-window-modal.js

// ==========================================
// Cargar la ventana modal
// ==========================================
async function cargarModalPerfil() {
    const container = document.getElementById("profileModalContainer");

    if (!container) {
        console.error("No existe el contenedor #profileModalContainer.");
        return;
    }

    // Evita cargar el modal más de una vez usando el nuevo ID/clase
    if (document.getElementById("myModal")) {
        return;
    }

    try {
        const response = await fetch("/dashboard/users/profile/profile-nav-edit-modal/modal-profile.html");

        if (!response.ok) {
            throw new Error("No se pudo cargar profile.html");
        }

        container.innerHTML = await response.text();

        // Notificar a Firebase para que rellene los datos inmediatamente
        window.dispatchEvent(new CustomEvent("modalPerfilCargado"));

    } catch (error) {
        console.error("Error cargando la ventana modal:", error);
    }
}

// ==========================================
// Mostrar la ventana modal
// ==========================================
async function mostrarModal() {
    await cargarModalPerfil();

    const modal = document.getElementById("myModal");
    if (modal) {
        modal.style.display = "block";
    }
}

// ==========================================
// Cancelar
// ==========================================
function cancelarModal() {
    cerrarModal();
}

// ==========================================
// Cerrar la ventana modal
// ==========================================
function cerrarModal() {
    const modal = document.getElementById("myModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// ==========================================
// Cerrar al hacer clic fuera del modal
// ==========================================
window.addEventListener("click", (event) => {
    const modal = document.getElementById("myModal");
    if (modal && event.target === modal) {
        cerrarModal();
    }
});

// ==========================================
// Exponer funciones al entorno global (Scope)
// ==========================================
window.mostrarModal = mostrarModal;
window.cancelarModal = cancelarModal;
window.cerrarModal = cerrarModal;