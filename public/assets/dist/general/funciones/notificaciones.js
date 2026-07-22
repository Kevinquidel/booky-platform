// notificaciones.js

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = 'notification';
  document.body.appendChild(notification);
  setTimeout(() => {
      document.body.removeChild(notification);
  }, 2500); // Mostrar el mensaje durante 1.5 segundos
}
