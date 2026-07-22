document.addEventListener('DOMContentLoaded', () => {
    // Configurar el evento del botón principal del formulario único
    const saveProfileButton = document.getElementById("saveProfileButton");
    if (saveProfileButton) {
        saveProfileButton.addEventListener("click", manejarGuardadoYRedireccion);
    }
});

// Función para validar estrictamente los campos del formulario actual de Booky
function validarFormularioPerfil() {
    const displayName = document.getElementById('displayName');
    const phone = document.getElementById('phone');
    const birthDate = document.getElementById('birthDate');

    // 1. Validar Nombre Completo (Mínimo 3 caracteres, sin números mediante el patrón nativo)
    if (displayName && !displayName.checkValidity()) {
        showNotification('Por favor, ingrese un nombre válido (entre 3 y 60 caracteres, sin números).');
        return false;
    }

    // 2. Validar Teléfono para reservas (Exactamente 10 dígitos numéricos)
    if (phone && !phone.checkValidity()) {
        showNotification('Por favor, ingrese un número de teléfono válido de 10 dígitos.');
        return false;
    }

    // 3. Validar Fecha de Nacimiento nativa (Seleccionada)
    if (birthDate && !birthDate.value) {
        showNotification('Por favor, seleccione su fecha de nacimiento.');
        return false;
    }

    return true;
}

// Función principal que gestiona la persistencia de datos y la animación de redirección
function manejarGuardadoYRedireccion() {
    // Detener la ejecución si las validaciones fallan
    if (!validarFormularioPerfil()) {
        return; 
    }

    // Ejecutar la persistencia en Firebase/Firestore si la función global existe
    if (typeof uploadToFirestore === "function") {
        uploadToFirestore();
    } else {
        console.warn("La función uploadToFirestore no está definida en el entorno global.");
    }

    // Inicializar el contador de redirección en 2 segundos
    let countdown = 2;
    showNotification(`Redirigiendo en ${countdown} segundos...`);

    // Actualizar el mensaje de notificación cada segundo
    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            showNotification(`Redirigiendo en ${countdown} segundos...`);
        } else {
            clearInterval(interval);
        }
    }, 1000);

    // Redirección final a la raíz del sitio
    setTimeout(function() {
        window.location.href = "../../index.html";
    }, 2000);
}