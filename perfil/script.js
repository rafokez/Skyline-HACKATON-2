document.addEventListener("DOMContentLoaded", function() {
    const fileInput = document.getElementById('profile-pic');
    if (fileInput) {
        fileInput.addEventListener('change', previewProfilePic);
    }
});

function previewProfilePic(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('profile-pic-preview');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    } else {
        preview.src = 'user.png'; // Caminho para a imagem padrão
    }
}