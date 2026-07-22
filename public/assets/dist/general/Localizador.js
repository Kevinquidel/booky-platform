// Función para obtener la carpeta actual del archivo HTML
function getCurrentFolder() {
    const currentScript = document.currentScript;
    if (currentScript) {
      const scriptSrc = currentScript.src;
      const scriptPath = new URL(scriptSrc).pathname;
      const folderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
      return folderPath;
    }
    return '';
  }
  
  // Función para construir las rutas localizadas
  function getLocalizedPath(filePath) {
    const currentFolder = getCurrentFolder();
  
    // Ruta base de la carpeta "public/dist"
    const publicDistFolder = currentFolder;
  
    // Verificar si el archivo es de la carpeta de imágenes, estilos o scripts
    if (filePath.startsWith('./img')) {
      // Ruta de la carpeta de imágenes
      const imgFolder = publicDistFolder + '/../img/';
      return filePath.replace('./img/', imgFolder);
    } else if (filePath.startsWith('./css')) {
      // Ruta de la carpeta de estilos
      const cssFolder = publicDistFolder + '/../css/';
      return filePath.replace('./css/', cssFolder);
    } else if (filePath.startsWith('./dist')) {
      // Ruta de la carpeta de scripts
      const distFolder = publicDistFolder + '/';
      return filePath.replace('./dist/', distFolder);
    } else {
      // Ruta de otros archivos
      return publicDistFolder + '/../' + filePath;
    }
  }
  
  // Ejemplo de uso de la función getLocalizedPath
  const imgPath = './img/my-image.jpg'; // Ruta relativa a la imagen
  const cssPath = './css/style.css'; // Ruta relativa al archivo CSS
  const scriptPath = './dist/script.js'; // Ruta relativa al archivo JavaScript
  
  const localizedImgPath = getLocalizedPath(imgPath);
  const localizedCssPath = getLocalizedPath(cssPath);
  const localizedScriptPath = getLocalizedPath(scriptPath);
  
  // Usa las rutas localizadas en tu código HTML
  const imgElement = document.createElement('img');
  imgElement.src = localizedImgPath;
  document.body.appendChild(imgElement);
  
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = localizedCssPath;
  document.head.appendChild(linkElement);
  