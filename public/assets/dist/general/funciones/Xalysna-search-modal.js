// Obtiene el activador y el modal
var openModal = document.getElementById("searchModalButton");
var modal = document.getElementById("searchModal");

// Obtiene el elemento que cierra el modal
var span = document.getElementsByClassName("closeSearchModal")[0]; // Asegúrate de tener un elemento con clase "close"

// Abre el modal al hacer clic en el activador
openModal.onclick = function() {
  modal.style.display = "block";
}

// Cierra el modal al hacer clic en (x)
span.onclick = function() {
  modal.style.display = "none";
}

// Cierra el modal al hacer clic fuera de él
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
