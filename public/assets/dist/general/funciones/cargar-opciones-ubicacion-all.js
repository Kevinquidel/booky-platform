// URLs de los archivos JSON
const countriesURL = '/databases/options/countries.json';
const statesURL = '/databases/options/states.json';
const citiesURL = '/databases/options/cities.json';

// Función para cargar opciones de países
function cargarPaises() {
  fetch(countriesURL)
    .then(response => response.json())
    .then(data => {
      var selectPais = document.getElementById("locationCountry");

      if (!selectPais) {
        console.error('Elemento con id "locationCountry" no encontrado.');
        return;
      }

      // Limpiar select
      selectPais.innerHTML = '<option value="" selected disabled>Seleccione un país</option>';

      // Agregar opciones de países
      data.countries.forEach(pais => {
        var option = document.createElement("option");
        option.value = pais.id;
        option.text = pais.name;
        selectPais.add(option);
      });
    })
    .catch(error => console.error('Error al cargar el archivo JSON de países:', error));
}

// Función para cargar opciones de estados
function cargarEstados() {
  fetch(statesURL)
    .then(response => response.json())
    .then(data => {
      var selectEstado = document.getElementById("locationState");

      if (!selectEstado) {
        console.error('Elemento con id "locationState" no encontrado.');
        return;
      }

      // Limpiar select
      selectEstado.innerHTML = '<option value="" selected disabled>Seleccione un estado</option>';

      // Agregar opciones de estados
      data.states.forEach(estado => {
        var option = document.createElement("option");
        option.value = estado.id;
        option.text = estado.name;
        selectEstado.add(option);
      });
    })
    .catch(error => console.error('Error al cargar el archivo JSON de estados:', error));
}

// Función para cargar opciones de ciudades
function cargarCiudades() {
  fetch(citiesURL)
    .then(response => response.json())
    .then(data => {
      var selectCiudad = document.getElementById("locationCity");

      if (!selectCiudad) {
        console.error('Elemento con id "locationCity" no encontrado.');
        return;
      }

      // Limpiar select
      selectCiudad.innerHTML = '<option value="" selected disabled>Seleccione una ciudad</option>';

      // Agregar opciones de ciudades
      data.cities.forEach(ciudad => {
        var option = document.createElement("option");
        option.value = ciudad.id;
        option.text = ciudad.name;
        selectCiudad.add(option);
      });
    })
    .catch(error => console.error('Error al cargar el archivo JSON de ciudades:', error));
}

// Llamar a las funciones para cargar las opciones al inicio
cargarPaises();
cargarEstados();
cargarCiudades();
