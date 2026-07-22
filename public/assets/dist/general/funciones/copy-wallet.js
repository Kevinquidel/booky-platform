// copywallet.js

document.addEventListener('DOMContentLoaded', function () {
  const walletAddressElement = document.getElementById('wallet-address');

  walletAddressElement.addEventListener('click', () => {
      const addressToCopy = walletAddressElement.getAttribute('data-copy');
      const tempInput = document.createElement('input');
      tempInput.value = addressToCopy;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);

      // Mostrar un mensaje de "Dirección copiada"
      showNotification("Dirección copiada");
  });
});
