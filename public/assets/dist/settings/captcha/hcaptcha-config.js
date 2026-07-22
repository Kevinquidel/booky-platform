// hcaptcha-config.js

(function () {
  const hcaptchaSiteKey = 'be2f837e-7ca8-47a0-b846-d01dab1f199f';

  const hcaptchaContainer = document.querySelector('[data-hcaptcha-sitekey]');

  if (hcaptchaContainer) {
    // Verificar si ya existe un widget de hCaptcha en el contenedor antes de inicializarlo
    if (hcaptchaContainer.querySelector('.h-captcha')) {
      return; // No inicialices hCaptcha nuevamente si ya está presente en el contenedor
    }

    // Verificar si hCaptcha ya se ha cargado
    if (window.hcaptchaLoaded) {
      return; // No inicialices hCaptcha nuevamente si ya se ha cargado
    }

    // Crear un elemento script para cargar la librería de hCaptcha
    const hcaptchaScript = document.createElement('script');
    hcaptchaScript.src = 'https://hcaptcha.com/1/api.js';
    hcaptchaScript.async = true;

    // Agregar un evento de carga para inicializar hCaptcha después de cargar la librería
    hcaptchaScript.onload = function () {
      // Crear un elemento div para el widget de hCaptcha
      const hcaptchaDiv = document.createElement('div');
      hcaptchaDiv.setAttribute('class', 'h-captcha');
      hcaptchaDiv.setAttribute('data-sitekey', hcaptchaSiteKey);

      // Agregar el div del widget de hCaptcha al contenedor seleccionado
      hcaptchaContainer.appendChild(hcaptchaDiv);

      // Inicializar hCaptcha
      window.hcaptcha.render(hcaptchaDiv, {
        'theme': 'light', // Puedes ajustar el tema y otras opciones según tus preferencias
        'language': 'es',
        'onError': function (error) {
          console.error('Error en hCaptcha:', error);
          // Puedes tomar medidas adicionales aquí, como mostrar un mensaje de error al usuario.
        },
        'onLoad': function () {
          console.log('hCaptcha se ha cargado correctamente');
          // Puedes realizar acciones adicionales aquí si es necesario.
        },
        'onSuccess': function (response) {
          console.log('hCaptcha se ha completado con éxito:', response);
          // Puedes realizar acciones adicionales aquí si es necesario.
        },
        'onExpire': function () {
          console.log('hCaptcha ha caducado debido a inactividad');
          // Puedes realizar acciones adicionales aquí si es necesario.
        },
        'onClose': function () {
          console.log('El usuario cerró el diálogo de hCaptcha sin completar el desafío');
          // Puedes realizar acciones adicionales aquí si es necesario.
        },
      });

      // Marcar que hCaptcha se ha cargado
      window.hcaptchaLoaded = true;
    };

    // Agregar el script al final del cuerpo del documento
    document.body.appendChild(hcaptchaScript);

    // Manejar errores en la carga de la librería de hCaptcha
    hcaptchaScript.onerror = function () {
      console.error('Error al cargar la librería de hCaptcha');
      // Puedes tomar medidas adicionales aquí, como mostrar un mensaje de error al usuario.
    };
  }
})();
