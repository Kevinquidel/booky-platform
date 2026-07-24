document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const emailInput = document.getElementById('emailRegister');
  const passwordInput = document.getElementById('passwordRegister');
  const emailError = document.getElementById('errorEmail');
  const passwordError = document.getElementById('errorPasswordRegister');
  const generalError = document.getElementById('errorMessageRegister'); // Ajustado al ID que tienes en el HTML

  if (!form || !emailInput || !passwordInput) return;

  emailInput.addEventListener('input', validateInput.bind(null, emailInput, emailError, validateEmailFormat, enablePasswordInput, disablePasswordInput));
  passwordInput.addEventListener('input', validateInput.bind(null, passwordInput, passwordError, validatePasswordFormat));

  function validateInput(inputElement, errorElement, validationFunction, enableFunction, disableFunction) {
    const value = inputElement.value.trim();

    if (value === '') {
      setValidity(inputElement, errorElement, false, `Por favor, ingrese ${inputElement === emailInput ? 'un correo electrónico' : 'una contraseña'}`);
      return;
    }

    const isValidFormat = validationFunction(value);

    setValidity(inputElement, errorElement, isValidFormat, inputElement === emailInput ? 'El formato del correo electrónico es inválido' : 'La contraseña debe tener al menos 6 caracteres');

    if (isValidFormat && inputElement === emailInput && typeof enableFunction === 'function') {
      enableFunction();
    } else if (!isValidFormat && inputElement === emailInput && typeof disableFunction === 'function') {
      disableFunction();
    }
  }

  function enablePasswordInput() {
    passwordInput.removeAttribute('disabled');
  }

  function disablePasswordInput() {
    passwordInput.setAttribute('disabled', 'disabled');
    passwordInput.value = '';
    setValidity(passwordInput, passwordError, false, 'Por favor, ingrese un correo electrónico válido antes de habilitar la contraseña');
  }

  function setValidity(inputElement, errorElement, isValid, errorMessage) {
    if (inputElement.value.trim() === '') {
      isValid = true;
    }

    if (isValid) {
      inputElement.classList.remove('is-invalid');
      if (errorElement) errorElement.textContent = '';
    } else {
      inputElement.classList.add('is-invalid');
      if (errorElement) errorElement.textContent = errorMessage;
    }
  }

  function validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePasswordFormat(password) {
    const passwordRegex = /^.{6,}$/; // Validación simple de al menos 6 caracteres
    return passwordRegex.test(password);
  }
});