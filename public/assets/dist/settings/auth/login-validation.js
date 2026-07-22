document.addEventListener('DOMContentLoaded', function () {
  // Obtener referencias a los elementos del formulario y los mensajes de error
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailLogin');
  const passwordInput = document.getElementById('passwordLogin');
  const errorEmail = document.getElementById('errorEmail');
  const errorPassword = document.getElementById('errorPassword');

  if (form && emailInput && passwordInput) {
    // Agregar event listener para manejar el envío del formulario
    form.addEventListener('submit', function (event) {
      if (!validateForm()) {
        event.preventDefault(); // Evita el envío si hay errores
      }
    });

    // Agregar event listeners para restablecer los errores al cambiar el valor del campo
    emailInput.addEventListener('input', function () {
      validateEmail();
    });

    passwordInput.addEventListener('input', function () {
      validatePassword();
    });

    // Validar el formulario una vez al cargar la página
    // Comenté esto para evitar la validación inicial
    // validateForm();
  }

  // Función para validar el formato del correo electrónico
  function validateEmail() {
    const email = emailInput.value.trim();
    const isValidFormat = validateEmailFormat(email);

    setValidity(emailInput, isValidFormat, errorEmail, 'Asegúrate de que el formato del correo sea correcto.');
  }

  // Función para validar la longitud y el formato de la contraseña
  function validatePassword() {
    const password = passwordInput.value.trim();
    const isValidFormat = validatePasswordFormat(password);

    setValidity(passwordInput, isValidFormat, errorPassword, 'La contraseña debe ser de al menos 6 caracteres.');
  }

  // Función para establecer la validez y mostrar mensajes de error
  function setValidity(inputElement, isValid, errorElement, errorMessage) {
    if (inputElement.value.trim() === '') {
      // No mostrar mensajes de error si el campo está vacío
      isValid = true;
    }

    if (isValid) {
      inputElement.classList.remove('is-invalid');
      errorElement.textContent = '';
    } else {
      inputElement.classList.add('is-invalid');
      errorElement.textContent = errorMessage;
    }
  }

  // Función para validar el formato del correo electrónico con una expresión regular
  function validateEmailFormat(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  }

  // Función para validar la longitud mínima y el formato de la contraseña
  function validatePasswordFormat(password) {
    // Modifiqué la expresión regular para hacerla menos exigente
    const passwordRegex = /^[a-zA-Z\d\W_]{6,}$/;
    return passwordRegex.test(password);
  }

  // Función principal para validar todo el formulario
  function validateForm() {
    validateEmail();
    validatePassword();

    const invalidInputs = document.querySelectorAll('.is-invalid');

    return invalidInputs.length === 0; // Devuelve true si no hay errores, de lo contrario, false
  }
});

