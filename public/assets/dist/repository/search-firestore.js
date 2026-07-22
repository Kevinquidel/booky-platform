// Importar la configuración de Firebase
import { firebaseConfig } from "../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_STORAGE_URL } from "../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_STORAGE_URL:", FIREBASE_STORAGE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getStorage, ref, listAll, getDownloadURL, getMetadata } = await import(FIREBASE_STORAGE_URL);

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

const searchButton = document.getElementById("searchButton");
const fileTableBody = document.getElementById("fileTableBody");
const searchInput = document.getElementById("searchInput");
const errorText = document.getElementById("errorText");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");

let filesData = [];
let currentPage = 1;
const itemsPerPage = 10;

function renderTable(files) {
  fileTableBody.innerHTML = "";

  if (files.length === 0) {
    errorText.textContent = "No se encontraron archivos.";
    return;
  }

  sortFiles(files);

  for (const file of files) {
    const row = document.createElement("tr");

    row.appendChild(createTableCell(file.name));
    row.appendChild(createTableCell(file.contentType));
    row.appendChild(createTableCell(formatDate(file.updated)));
    row.appendChild(createTableCell(formatSize(file.size)));
    row.appendChild(createDownloadCell(file.ref));

    fileTableBody.appendChild(row);
  }

  errorText.textContent = "";
}

function createTableCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function formatDate(date) {
  const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  return new Date(date).toLocaleDateString("es-ES", options);
}

function formatSize(size) {
  const kilobytes = size / 1024;
  if (kilobytes < 1024) {
    return kilobytes.toFixed(2) + " KB";
  }
  const megabytes = kilobytes / 1024;
  return megabytes.toFixed(2) + " MB";
}

function createDownloadCell(ref) {
  const cell = document.createElement("td");
  const downloadButton = document.createElement("a");
  downloadButton.textContent = "Descargar";
  downloadButton.href = "#";
  downloadButton.setAttribute("download", ref.name);
  downloadButton.classList.add("download-button");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      downloadButton.addEventListener("click", () => {
        getDownloadURL(ref)
          .then((url) => {
            downloadButton.href = url;
          })
          .catch((error) => {
            console.log("Error al obtener la URL de descarga:", error);
          });
      });
    } else {
      downloadButton.addEventListener("click", () => {
        console.log("Debes iniciar sesión para descargar el archivo.");
      });
    }
  });

  cell.appendChild(downloadButton);
  return cell;
}

function sortFiles(files) {
  files.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    const typeA = a.contentType.toLowerCase();
    const typeB = b.contentType.toLowerCase();
    const updatedA = new Date(a.updated);
    const updatedB = new Date(b.updated);
    const sizeA = a.size;
    const sizeB = b.size;

    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    } else if (typeA !== typeB) {
      return typeA.localeCompare(typeB);
    } else if (updatedA !== updatedB) {
      return updatedA - updatedB;
    } else {
      return sizeA - sizeB;
    }
  });
}

function filterFiles(query) {
  const filteredFiles = filesData.filter((file) => {
    return file.name.toLowerCase().includes(query.toLowerCase());
  });

  renderTable(filteredFiles);
}

function searchFiles() {
  const query = searchInput.value;
  filterFiles(query);
}

searchButton.addEventListener("click", searchFiles);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchFiles();
  }
});

function getFilesMetadata() {
  const storageRef = ref(storage);
  listAll(storageRef)
    .then((result) => {
      const promises = result.items.map((itemRef) => {
        return getMetadata(itemRef)
          .then((metadata) => {
            const fileData = {
              ref: itemRef,
              name: metadata.name,
              updated: metadata.updated,
              contentType: metadata.contentType,
              size: metadata.size
            };
            return fileData;
          })
          .catch((error) => {
            console.log("Error al obtener los metadatos:", error);
            return null;
          });
      });

      Promise.all(promises)
        .then((files) => {
          filesData = files.filter((file) => file !== null);
          renderTable(filesData);
          updatePaginationButtons();
        })
        .catch((error) => {
          console.log("Error al obtener los metadatos:", error);
        });
    })
    .catch((error) => {
      console.log("Error al obtener la lista de archivos:", error);
    });
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(filesData.length / itemsPerPage);

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

function renderTablePage(page) {
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;
  const filesPage = filesData.slice(start, end);
  renderTable(filesPage);
}

prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTablePage(currentPage);
    updatePaginationButtons();
  }
});

nextButton.addEventListener("click", () => {
  const totalPages = Math.ceil(filesData.length / itemsPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    renderTablePage(currentPage);
    updatePaginationButtons();
  }
});

getFilesMetadata();
updatePaginationButtons();
