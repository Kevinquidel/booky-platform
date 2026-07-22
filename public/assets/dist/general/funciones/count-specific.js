function limitarCaracteres(input, maxLength) {
    if (input.value.length > maxLength) {
        input.value = input.value.slice(0, maxLength);
    }
}

function mostrarCampoEspecifico(select, campoEspecificoId) {
    var campoEspecifico = document.getElementById(campoEspecificoId);
    campoEspecifico.style.display = (select.value === "otro") ? "block" : "none";
}

function validarSoloNumeros(event) {
    var input = event.target;
    input.value = input.value.replace(/[^0-9]/g, ''); // Elimina cualquier caracter que no sea un número
}