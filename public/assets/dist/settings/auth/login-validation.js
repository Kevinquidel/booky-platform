document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailLogin');
  const passwordInput = document.getElementById('passwordLogin');
  const errorEmail = document.getElementById('errorEmail');
  const errorPassword = document.getElementById('errorPassword');

  if (form && emailInput && passwordInput) {
    // Ya NO hacemos event.preventDefault() aquí para permitir que login.js controle el submit de Firebase

    // Agregar event listeners para validar en tiempo real al escribir
    emailInput.addEventListener('input', function () {
      validateEmail();
    });

    passwordInput.addEventListener('input', function () {
      validatePassword();
    });
  }

  // Función para validar el formato del correo electrónico
  function validateEmail() {
    const email = emailInput.value.trim();
    
    if (email === '') {
      setValidity(emailInput, true, errorEmail, '');
      return true;
    }

    const isValidFormat = validateEmailFormat(email);
    setValidity(emailInput, isValidFormat, errorEmail, 'Asegúrate de que el formato del correo sea correcto.');
    return isValidFormat;
  }

  // Función para validar la longitud y el formato de la contraseña
  function validatePassword() {
    const password = passwordInput.value;
    
    if (password === '') {
      setValidity(passwordInput, true, errorPassword, '');
      return true;
    }

    const isValidFormat = validatePasswordFormat(password);
    setValidity(passwordInput, isValidFormat, errorPassword, 'La contraseña debe ser de al menos 6 caracteres.');
    return isValidFormat;
  }

  // Función para establecer la validez y mostrar mensajes de error visuales
  function setValidity(inputElement, isValid, errorElement, errorMessage) {
    if (inputElement.value.trim() === '') {
      isValid = true; 
    }

    if (isValid) {
      inputElement.classList.remove('is-invalid');
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    } else {
      inputElement.classList.add('is-invalid');
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';
    }
  }

  function validateEmailFormat(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  }

  function validatePasswordFormat(password) {
    const passwordRegex = /^[a-zA-Z\d\W_]{6,}$/;
    return passwordRegex.test(password);
  }
});