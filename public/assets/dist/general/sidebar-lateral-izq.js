function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var buttonImage = document.querySelector('.outside-btn img');
  
    sidebar.classList.toggle('sidebar-closed'); // Togglea la clase sidebar-closed
  
    if (sidebar.classList.contains('sidebar-closed')) {
      // Si el sidebar está cerrado, oculta la imagen
      buttonImage.style.display = 'none';
    } else {
      // Si el sidebar está abierto, muestra la imagen
      buttonImage.style.display = 'block';
    }
  }
  