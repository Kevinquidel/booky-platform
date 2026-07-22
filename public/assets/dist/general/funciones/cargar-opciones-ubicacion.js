// cargar-opciones-ubicacion.js

// URL del archivo JSON
const ubicationsURL = '/databases/options/ubications-earth.json';

// Declarar variables globales
let paisSeleccionadoGlobal;

// Función para cargar opciones de países
function cargarPaises() {
  fetch(ubicationsURL)
    .then(response => response.json())
    .then(data => {
      var selectPais = document.getElementById("locationCountry");

      if (!selectPais) {
        console.error('Elemento con id "locationCountry" no encontrado.');
        return;
      }

      for (var i = 0; i < data.opciones.length; i++) {
        var pais = data.opciones[i].pais;
        if (pais) {
          if (!selectPais.querySelector(`option[value="${pais.valor}"]`)) {
            var option = document.createElement("option");
            option.value = pais.valor;
            option.text = pais.label;
            selectPais.add(option);
          }
        }
      }
    })
    .catch(error => console.error('Error al cargar el archivo JSON:', error));
}

// Función para activar el siguiente select cuando se selecciona un país
function seleccionarPais() {
  var selectPais = document.getElementById("locationCountry");
  var selectEstado = document.getElementById("locationState");

  if (!selectPais || !selectEstado) {
    console.error('Elemento con id "locationCountry" o "locationState" no encontrado.');
    return;
  }

  // Guardar el valor en la variable global
  paisSeleccionadoGlobal = selectPais.value;

  selectEstado.innerHTML = '<option value="" selected disabled>Seleccione un estado</option>';
  selectEstado.disabled = true;

  if (paisSeleccionadoGlobal) {
    cargarEstados(paisSeleccionadoGlobal);
    selectEstado.disabled = false;
  }
}


// Función para cargar opciones de estados según el país seleccionado
function cargarEstados(paisSeleccionado) {
  fetch(ubicationsURL)
    .then(response => response.json())
    .then(data => {
      var selectEstado = document.getElementById("locationState");

      for (var i = 0; i < data.opciones.length; i++) {
        var opcion = data.opciones[i];
        if (opcion.pais.valor == paisSeleccionado) {
          var estado = opcion.estado;
          if (!selectEstado.querySelector(`option[value="${estado.valor}"]`)) {
            var option = document.createElement("option");
            option.value = estado.valor;
            option.text = estado.label;
            selectEstado.add(option);
          }
        }
      }
    })
    .catch(error => console.error('Error al cargar el archivo JSON:', error));
}

// Función para activar el siguiente select cuando se selecciona un estado
function seleccionarEstado() {
  var selectEstado = document.getElementById("locationState");
  var selectCiudad = document.getElementById("locationCity");

  var estadoSeleccionado = selectEstado.value;

  selectCiudad.innerHTML = '<option value="" selected disabled>Seleccione una ciudad</option>';
  selectCiudad.disabled = true;

  if (estadoSeleccionado) {
    cargarCiudades(estadoSeleccionado);
    selectCiudad.disabled = false;
  }
}

// Función para cargar opciones de ciudades según el estado seleccionado
function cargarCiudades(estadoSeleccionado) {
  fetch(ubicationsURL)
    .then(response => response.json())
    .then(data => {
      var selectCiudad = document.getElementById("locationCity");

      for (var i = 0; i < data.opciones.length; i++) {
        var opcion = data.opciones[i];
        if (opcion.estado.valor == estadoSeleccionado) {
          var ciudad = opcion.ciudad;
          if (!selectCiudad.querySelector(`option[value="${ciudad.valor}"]`)) {
            var option = document.createElement("option");
            option.value = ciudad.valor;
            option.text = ciudad.label;
            selectCiudad.add(option);
          }
        }
      }
    })
    .catch(error => console.error('Error al cargar el archivo JSON:', error));
}

