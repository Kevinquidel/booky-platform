document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const emailInput = document.getElementById('emailRegister');
  const passwordInput = document.getElementById('passwordRegister');
  const emailError = document.getElementById('errorEmail');
  const passwordError = document.getElementById('errorPasswordRegister');
  const generalError = document.getElementById('generalError');

  emailInput.addEventListener('input', validateInput.bind(null, emailInput, emailError, validateEmailFormat, enablePasswordInput, disablePasswordInput));
  passwordInput.addEventListener('input', validateInput.bind(null, passwordInput, passwordError, validatePasswordFormat));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validateForm();
  });

  function validateInput(inputElement, errorElement, validationFunction, enableFunction, disableFunction) {
    const value = inputElement.value.trim();

    if (value === '') {
      setValidity(inputElement, errorElement, false, `Por favor, ingrese ${inputElement === emailInput ? 'un correo electrónico' : 'una contraseña'}`);
      return;
    }

    const isValidFormat = validationFunction(value);

    setValidity(inputElement, errorElement, isValidFormat, inputElement === emailInput ? 'El formato del correo electrónico es inválido' : 'La contraseña no cumple con los requisitos');

    if (isValidFormat && inputElement === emailInput) {
      enableFunction();
    } else if (!isValidFormat && inputElement === emailInput) {
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

  function validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePasswordFormat(password) {
    const passwordRegex = /^[a-zA-Z\d\W_]{6,}$/;
    return passwordRegex.test(password);
  }

  function validateForm() {
    validateInput(emailInput, emailError, validateEmailFormat, enablePasswordInput, disablePasswordInput);
    validateInput(passwordInput, passwordError, validatePasswordFormat);

    const invalidInputs = document.querySelectorAll('.is-invalid');

    if (invalidInputs.length === 0) {
      console.log('Formulario válido. Enviando...');
      form.submit();
    } else {
      generalError.textContent = 'Por favor, corrija los errores antes de enviar el formulario.';
    }
  }
});

