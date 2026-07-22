// Función para cargar datos JSON
function fetchData(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar los datos desde ${url}. Código de estado: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error(`Error al cargar los datos desde ${url}:`, error);
            throw error; // Propagar el error para manejarlo en la función de llamada
        });
}

// Función para traducir códigos de países
function translateCountryCode(code, data) {
    if (!data || !data.countries) {
        console.error('Datos de países no válidos.');
        return "País no encontrado";
    }
    code = parseInt(code); // Convertir a número
    for (const country of data.countries) {
        if (country.id === code) {
            return country.name;
        }
    }
    console.error(`País con código ${code} no encontrado.`);
    return "País no encontrado";
}

// Función para traducir códigos de estados
function translateStateCode(code, data) {
    if (!data || !data.states) {
        console.error('Datos de estados no válidos.');
        return "Estado no encontrado";
    }
    code = parseInt(code); // Convertir a número
    for (const state of data.states) {
        if (state.id === code) {
            return state.name;
        }
    }
    console.error(`Estado con código ${code} no encontrado.`);
    return "Estado no encontrado";
}

// Función para traducir códigos de ciudades
function translateCityCode(code, data) {
    if (!data || !data.cities) {
        console.error('Datos de ciudades no válidos.');
        return "Ciudad no encontrada";
    }
    code = parseInt(code); // Convertir a número
    for (const city of data.cities) {
        if (city.id === code) {
            return city.name;
        }
    }
    console.error(`Ciudad con código ${code} no encontrada.`);
    return "Ciudad no encontrada";
}


// Obtener userData del sessionStorage
const userData = JSON.parse(sessionStorage.getItem('userData'));
console.log(userData);

// URLs de los archivos JSON
const countriesURL = '/databases/options/countries.json';
const statesURL = '/databases/options/states.json';
const citiesURL = '/databases/options/cities.json';

// Función para mostrar nombre del país
function displayCountry(userData, countriesData) {
    console.log(countriesData); // Verificar los datos cargados
    if (!countriesData || !Array.isArray(countriesData.countries)) {
        console.error('Datos de países no válidos.');
        return;
    }
    const countryName = translateCountryCode(userData.locationCountry, countriesData);
    const locationCountrySpan = document.getElementById("locationCountrySpan");
    if (!locationCountrySpan) {
        console.error('Elemento con id "locationCountrySpan" no encontrado.');
        return;
    }
    // Mostrar el nombre del país en el span
    locationCountrySpan.textContent = countryName;
}

// Función para mostrar nombre del estado
function displayState(userData, statesData) {
    console.log(statesData); // Verificar los datos cargados
    if (!statesData || !Array.isArray(statesData.states)) {
        console.error('Datos de estados no válidos.');
        return;
    }
    const stateName = translateStateCode(userData.locationState, statesData);
    const locationStateSpan = document.getElementById("locationStateSpan");
    if (!locationStateSpan) {
        console.error('Elemento con id "locationStateSpan" no encontrado.');
        return;
    }
    // Mostrar el nombre del estado en el span
    locationStateSpan.textContent = stateName;
}

// Función para mostrar nombre de la ciudad
function displayCity(userData, citiesData) {
    console.log(citiesData); // Verificar los datos cargados
    if (!citiesData || !Array.isArray(citiesData.cities)) {
        console.error('Datos de ciudades no válidos.');
        return;
    }
    const cityName = translateCityCode(userData.locationCity, citiesData);
    const locationCitySpan = document.getElementById("locationCitySpan");
    if (!locationCitySpan) {
        console.error('Elemento con id "locationCitySpan" no encontrado.');
        return;
    }
    // Mostrar el nombre de la ciudad en el span
    locationCitySpan.textContent = cityName;
}


// Llamar a las funciones para mostrar las opciones al inicio
setTimeout(() => {
    Promise.all([
        fetchData(countriesURL),
        fetchData(statesURL),
        fetchData(citiesURL)
    ]).then(([countriesData, statesData, citiesData]) => {
        displayCountry(userData, countriesData);
        displayState(userData, statesData);
        displayCity(userData, citiesData);
    }).catch(error => {
        console.error('Error al cargar los datos:', error);
    });
}, 6000); // Esperar 2 segundos antes de mostrar las opciones
