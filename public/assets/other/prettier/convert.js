const fs = require('fs');
const path = require('path');
const { transformSync } = require('@babel/core');

// Ruta del archivo .mjs
const rutaArchivoMJS = './prettier.mjs';

if (path.extname(rutaArchivoMJS) === '.mjs') {
  const nuevoNombre = path.basename(rutaArchivoMJS, '.mjs') + '.js';
  const nuevaRuta = path.join(path.dirname(rutaArchivoMJS), nuevoNombre);

  // Lee el contenido del archivo .mjs
  fs.readFile(rutaArchivoMJS, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error al leer el archivo ${rutaArchivoMJS}:`, err);
      return;
    }

    // Utiliza Babel para realizar la conversión
    const nuevoContenido = convertirAModuloCommonJS(data);

    // Escribe el nuevo contenido en el archivo .js
    fs.writeFile(nuevaRuta, nuevoContenido, 'utf8', (err) => {
      if (err) {
        console.error(`Error al escribir en el archivo ${nuevaRuta}:`, err);
      } else {
        console.log(`Se convirtió ${rutaArchivoMJS} a ${nuevaRuta}`);
      }
    });
  });
} else {
  console.error('La ruta proporcionada no apunta a un archivo .mjs');
}

// Función para convertir el contenido del módulo a CommonJS utilizando Babel
function convertirAModuloCommonJS(contenido) {
  try {
    const resultado = transformSync(contenido, {
      presets: ['@babel/preset-env'],
    });

    if (resultado && resultado.code) {
      return resultado.code;
    } else {
      console.error('Error al utilizar Babel para convertir el módulo ES6 a CommonJS');
      return contenido;
    }
  } catch (error) {
    console.error('Error al utilizar Babel para convertir el módulo ES6 a CommonJS:', error);
    return contenido;
  }
}
