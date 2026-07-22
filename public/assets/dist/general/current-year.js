// Obtener el año actual
function getCurrentYear() {
    return new Date().getFullYear();
}

// Obtener la fecha actual formateada (Ejemplo: "15 de junio, 2023")
function getFormattedDate() {
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('es-ES', options);
}

// Obtener la hora local del usuario (formato de 24 horas)
function getCurrentTime() {
    var options = { hour: '2-digit', minute: '2-digit', hour12: false };
    return new Date().toLocaleTimeString('es-ES', options);
}

// Obtener el día de la semana actual
function getCurrentDayOfWeek() {
    var daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var currentDay = new Date().getDay();
    return daysOfWeek[currentDay];
}

// Obtener el número de la semana actual en el año
function getCurrentWeekNumber() {
    var onejan = new Date(new Date().getFullYear(), 0, 1);
    var weekNumber = Math.ceil((((new Date() - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return weekNumber;
}

// Obtener la zona horaria del usuario
function getCurrentTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Obtener la fecha y hora actual en formato ISO 8601
function getCurrentDateTimeISO() {
    return new Date().toISOString();
}

// Obtener el saludo según la hora del día
function getGreeting() {
    var currentHour = new Date().getHours();
    var greeting;

    if (currentHour < 12) {
        greeting = 'Buenos días';
    } else if (currentHour < 18) {
        greeting = 'Buenas tardes';
    } else {
        greeting = 'Buenas noches';
    }

    return greeting;
}

// Mostrar el año actual en un elemento con el id "current-year"
function displayCurrentYear() {
    var currentYear = getCurrentYear();
    var currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = currentYear;
    }
}

// Mostrar la fecha y hora actual en un elemento con el id "current-date-time"
function displayCurrentDateTime() {
    var formattedDate = getFormattedDate();
    var currentTime = getCurrentTime();
    var currentDateTimeElement = document.getElementById('current-date-time');
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = formattedDate + ', ' + currentTime;
    }
}

// Mostrar el día de la semana actual en un elemento con el id "current-day"
function displayCurrentDayOfWeek() {
    var currentDayOfWeek = getCurrentDayOfWeek();
    var currentDayOfWeekElement = document.getElementById('current-day');
    if (currentDayOfWeekElement) {
        currentDayOfWeekElement.textContent = currentDayOfWeek;
    }
}

// Mostrar el número de la semana actual en un elemento con el id "current-week"
function displayCurrentWeekNumber() {
    var currentWeekNumber = getCurrentWeekNumber();
    var currentWeekNumberElement = document.getElementById('current-week');
    if (currentWeekNumberElement) {
        currentWeekNumberElement.textContent = currentWeekNumber;
    }
}

// Mostrar la zona horaria actual en un elemento con el id "current-timezone"
function displayCurrentTimeZone() {
    var currentTimeZone = getCurrentTimeZone();
    var currentTimeZoneElement = document.getElementById('current-timezone');
    if (currentTimeZoneElement) {
        currentTimeZoneElement.textContent = currentTimeZone;
    }
}

// Mostrar la fecha y hora actual en formato ISO 8601 en un elemento con el id "current-datetime-iso"
function displayCurrentDateTimeISO() {
    var currentDateTimeISO = getCurrentDateTimeISO();
    var currentDateTimeISOElement = document.getElementById('current-datetime-iso');
    if (currentDateTimeISOElement) {
        currentDateTimeISOElement.textContent = currentDateTimeISO;
    }
}

// Mostrar el saludo en un elemento con el id "greeting"
function displayGreeting() {
    var greeting = getGreeting();
    var greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

// Llamar a las funciones para mostrar los elementos en la página
displayCurrentYear();
displayCurrentDateTime();
displayCurrentDayOfWeek();
displayCurrentWeekNumber();
displayCurrentTimeZone();
displayCurrentDateTimeISO();
displayGreeting();
