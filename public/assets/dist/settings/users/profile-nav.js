function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

window.onload = function() {
    var firstTab = document.getElementsByClassName("tablinks")[0];
    if (firstTab) {
        firstTab.click();
    }
};

function showUploadButton() {
    document.getElementById("uploadImageButton").style.display = "block";
}

function hideUploadButton() {
    document.getElementById("uploadImageButton").style.display = "none";
}
