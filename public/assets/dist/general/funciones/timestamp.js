// Obtener la fecha y hora actual en el formato deseado
function getCurrentFormattedDateTime(timestampElement) {
    const currentDate = new Date();
    const day = currentDate.getDate();
    const month = currentDate.toLocaleString('es-ES', { month: 'long' });
    const year = currentDate.getFullYear();
    const hour = currentDate.getHours().toString().padStart(2, '0');
    const minute = currentDate.getMinutes().toString().padStart(2, '0');
  
    const formattedDateTime = `${day} de ${month} del ${year} a las ${hour}:${minute}`;
    if (timestampElement) {
      timestampElement.textContent = formattedDateTime;
    }
    return formattedDateTime;
  }
  
  // Mostrar la fecha y hora inicial en un elemento con el id "article-timestamp"
  function displayArticleTimestamp() {
    const articleTimestampElement = document.getElementById('article-timestamp');
    const timestamp = getCurrentFormattedDateTime(articleTimestampElement);
    }
    
  // Llamar a la función para mostrar el timestamp del artículo
  displayArticleTimestamp();