document.addEventListener('DOMContentLoaded', function() {
    class TrieNode {
        constructor() {
            this.children = {};
            this.isEndOfWord = false;
        }
    }

    class Trie {
        constructor() {
            this.root = new TrieNode();
        }

        insert(word) {
            let node = this.root;
            word = word.toLowerCase(); // Asegura que la palabra esté en minúsculas
            for (let char of word) {
                if (!node.children[char]) {
                    node.children[char] = new TrieNode();
                }
                node = node.children[char];
            }
            node.isEndOfWord = true;
        }

        searchSuggestions(prefix, limit = 10) {
            let node = this.root;
            let results = [];

            for (let char of prefix) {
                if (node.children[char]) {
                    node = node.children[char];
                } else {
                    return results;
                }
            }

            this.findAllWords(node, prefix, results, limit);
            return results.slice(0, limit);
        }

        findAllWords(node, prefix, results, limit) {
            if (results.length >= limit) {
                return; // Detiene la búsqueda si se alcanza el límite
            }

            if (node.isEndOfWord) {
                results.push(prefix);
            }

            for (let char in node.children) {
                if (results.length >= limit) {
                    break; // Sale del bucle si se alcanza el límite
                }
                this.findAllWords(node.children[char], prefix + char, results, limit);
            }
        }
    }

    const trie = new Trie();

    // Lista de idiomas basada en la estructura de carpetas proporcionada
    const languages = ['en']; // Definir 'en' como el idioma por defecto
    
    // Obtener el código de idioma del navegador del usuario
    const userLanguage = navigator.language.slice(0, 2);
    console.log('Idioma del usuario:', userLanguage);
    
    // Añadir el idioma del usuario al principio de la lista de idiomas
    languages.unshift(userLanguage);
    
    // Generar las rutas de archivos basándose en los idiomas predeterminados
    const languageFilesDefault = languages.map(language => `/databases/words/${language}/${language}.txt`);
    
    // Generar la ruta de archivo basada en el idioma del usuario actual
    const languageFilesUser = [userLanguage].map(language => `/databases/words/${userLanguage}/${userLanguage}.txt`);
    
    // Incluir la ruta del archivo de números
    const numberFile = '/databases/numbers/decimal.txt';

    // Aquí combinamos todo en un único array y después mapeamos a las promesas
    const allFiles = [...languageFilesDefault, ...languageFilesUser, numberFile];

    const textFilePromises = allFiles.map(file => 
        fetch(file)
        .then(response => response.text())
        .then(text => {
            const entries = text.split(',');
            entries.forEach(entry => trie.insert(entry.trim()));
        })
    );
    
    // Carpeta base para los archivos JSON
    const baseFolder = '/databases/names';
    
    // Genera automáticamente las rutas de los archivos JSON para los nombres
    const years = Array.from({length: (2022 - 1880 + 1)}, (_, k) => k + 1880);
    const jsonFiles = years.flatMap(year => [
        `${baseFolder}/${year}/boy_names_${year}.json`,
        `${baseFolder}/${year}/girl_names_${year}.json`
    ]);
    
    // Función para cargar archivos JSON
    const jsonFilePromises = jsonFiles.map(file => 
        fetch(file)
        .then(response => response.json())
        .then(json => {
           // console.log(json);
            json.names.forEach(name => trie.insert(name.trim()));
        })
    );
    
    // Espera a que todos los archivos .txt y .json se hayan cargado antes de inicializar el autocompletado
    Promise.all([...textFilePromises, ...jsonFilePromises]).then(() => {
        initializeAutocomplete(trie);
    }).catch(error => console.error('Error loading word lists:', error));


let highlightedIndex = -1;
        
    function initializeAutocomplete(trie) {
        const searchInput = document.querySelector('.search-input');
        const suggestionsContainer = document.querySelector('.suggestions-container');
        const shortcutText = document.querySelector('.shortcut-text'); // Selecciona el elemento de texto de acceso directo

    
        searchInput.addEventListener('input', () => {
            const inputText = searchInput.value.toLowerCase();
            const words = inputText.split(' ');
            const currentWord = words[words.length - 1];
            suggestionsContainer.innerHTML = '';
    
            if (currentWord.length > 0) {
                const suggestions = trie.searchSuggestions(currentWord);
                suggestions.forEach((suggestion, index) => {
                    const div = document.createElement('div');
                    const suggestionWithPreviousWords = words.slice(0, -1).join(' ') + (words.length > 1 ? ' ' : '') + suggestion;
                    div.textContent = suggestionWithPreviousWords;
                    div.className = 'suggestion';
                    div.addEventListener('click', () => {
                        searchInput.value = suggestionWithPreviousWords + ' ';
                        suggestionsContainer.innerHTML = '';
                    });
                    div.addEventListener('mouseover', () => {
                        highlightedIndex = index;
                    });
                    suggestionsContainer.appendChild(div);
                });
            }
            // Oculta el texto de acceso directo mientras se escribe
            if (shortcutText) {
                shortcutText.style.opacity = '0';
            }
        });
    
        searchInput.addEventListener('keydown', (e) => {
            const suggestions = document.querySelectorAll('.suggestion');
    
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (highlightedIndex > 0) {
                    highlightedIndex--;
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (highlightedIndex < suggestions.length - 1) {
                    highlightedIndex++;
                }
            } else if (e.key === 'Enter' && highlightedIndex !== -1 && suggestions[highlightedIndex]) {
                e.preventDefault();
                searchInput.value = suggestions[highlightedIndex].textContent + ' ';
                suggestionsContainer.innerHTML = '';
                return;
            }
    
            suggestions.forEach((suggestion, index) => {
                if (index === highlightedIndex) {
                    suggestion.classList.add('highlighted');
                } else {
                    suggestion.classList.remove('highlighted');
                }
            });
        });
    
        // Evento que maneja la finalización de la escritura en el campo de búsqueda
        searchInput.addEventListener('blur', () => {
            // Muestra nuevamente el texto de acceso directo cuando se deja de escribir
            if (shortcutText) {
                shortcutText.style.opacity = '1';
            }
        });

        document.addEventListener('click', (event) => {
            const isClickInsideSuggestions = suggestionsContainer.contains(event.target);
            const isClickInsideSearchInput = searchInput.contains(event.target);
        
            if (!isClickInsideSuggestions && !isClickInsideSearchInput) {
                suggestionsContainer.innerHTML = '';
            }
        });

    }
    
});
