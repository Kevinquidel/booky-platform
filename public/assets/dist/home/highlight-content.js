var featuredSection = document.getElementById('featured-section');
var baseUrl = '';

// Verifica si estás trabajando en el entorno local
if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
  baseUrl = 'http://127.0.0.1:5500/';
}

// Define las rutas de los contenidos HTML
var contentPaths = [
  'content/about/',
  'content/blog/business-ai/',
  'content/blog/creative-ai/',
  'content/blog/entertain-ai/',
  'content/blog/FitSport/',
  'content/blog/lifestyle-ai/',
  'content/blog/science-tech-minds/',
  'content/blog/TechKnow/',
  'content/blog/TechVision360/',
  'content/ency/',
  'content/privacy/',
  'content/repository/',
  'content/support/',
  'content/token/',
  'content/utilities/'
];

// Función para reorganizar aleatoriamente una matriz
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Intercambia elementos aleatoriamente
  }
}

// Reorganiza aleatoriamente las rutas de contenido
shuffleArray(contentPaths);

// Carga y muestra los contenidos HTML en el nuevo orden aleatorio
contentPaths.forEach(function (contentPath) {
  fetch(`${baseUrl}${contentPath}`)
    .then(function(response) {
      return response.text();
    })
    .then(function(content) {
      // Parsea el contenido HTML
      var parser = new DOMParser();
      var htmlDoc = parser.parseFromString(content, 'text/html');

      // Obtiene elementos relevantes del HTML
      var title = htmlDoc.querySelector('title'); // Título
      var description = htmlDoc.querySelector('meta[name="description"]'); // Descripción corta
      var author = htmlDoc.querySelector('meta[name="author"]'); // Autor

      // Crea elementos solo si existen
      if (title) {
        var titleElement = document.createElement('h2');
        titleElement.textContent = title.textContent;
        featuredSection.appendChild(titleElement);
      }

      if (description) {
        var descriptionElement = document.createElement('p');
        descriptionElement.textContent = description.content;
        featuredSection.appendChild(descriptionElement);
      }

      if (author) {
        var authorElement = document.createElement('p');
        authorElement.textContent = 'Autor: ' + author.content;
        featuredSection.appendChild(authorElement);
      }

      // Crea un botón de "Continuar leyendo" con un enlace al contenido
      var continueReadingElement = document.createElement('a');
      continueReadingElement.textContent = 'Continuar leyendo';
      continueReadingElement.href = `${baseUrl}${contentPath}`;
      featuredSection.appendChild(continueReadingElement);
    })
    .catch(function(error) {
      console.error('Error al cargar el contenido HTML:', error);
    });
});
