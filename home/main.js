var map;
var markers = [];
var mapInitialized = false; // Adiciona um sinalizador para rastrear se o mapa foi inicializado


function initMap() {
    var etecAdolphoBerezinCoordinates = { lat: -24.122187948908884, lng: -46.67868733406067 };

    var mapOptions = {
        center: etecAdolphoBerezinCoordinates,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        streetViewControl: false
    };

    map = new google.maps.Map(document.getElementById('google-map'), mapOptions);

    map.addListener('click', function(event) {
        placeMarker(event.latLng);
        mapInitialized = true;
    });

    loadReports();
}

function searchAddress() {
    var address = document.getElementById('location-1').value;
    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status === 'OK') {
            var location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(15); // Defina o zoom desejado, por exemplo, 15
            placeMarker(location); // Adicione um marcador no local
        } else {
            alert('Não foi possível encontrar o endereço: ' + status);
        }
    });
}

function placeMarker(location) {
    var type = document.getElementById('problem-type').value;
    var credibility = 1; // Inicialmente com veracidade baixa
    var icon = getIcon(type, credibility);

    var marker = new google.maps.Marker({
        position: location,
        map: map,
        icon: icon,
        draggable: true,
        type: type // Adicionando tipo ao marcador
    });

    google.maps.event.addListener(marker, 'dragend', function(event) {
        updateLocationInput(event.latLng);
    });

    google.maps.event.addListener(marker, 'click', function() {
        console.log("Marcador clicado:", marker); // Adicionando um log para depuração
        showReportDetails(marker);
    });

    markers.push(marker);
    updateLocationInput(location);
}

function getIcon(type, credibility) {
    var iconUrl;

    switch(type) {
        case 'acidente':
            iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            break;
        case 'transito':
            iconUrl = 'Transito_baixa_ver.png';
            break;
        case 'alagamento':
            iconUrl = 'Alagamento_baixa_ver.png';
            break;
        default:
            iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }

    if (credibility == 2) {
        iconUrl = 'Acidente_media_ver.png';
    } else if (credibility == 3) {
        iconUrl = 'Acidente_alta_ver.png';
    }

    return {
        url: iconUrl,
        scaledSize: new google.maps.Size(32, 32)
    };
}

function updateLocationInput(location) {
    if (typeof location.lat === 'function' && typeof location.lng === 'function') {
        document.getElementById('location').value = location.lat() + ',' + location.lng();
    } else {
        document.getElementById('location').value = location.lat + ',' + location.lng;
    }
}

function submitReport() {
    var type = document.getElementById('problem-type').value;
    var description = document.getElementById('problem-description').value;
    var location = document.getElementById('location').value;
    var photo = document.getElementById('problem-photo').files[0];

    if (!type || !description || !location || !photo) {
        alert("Por favor, preencha todos os campos e anexe uma foto.");
        return;
    }

    var report = {
        type: type,
        description: description,
        location: location,
        photo: URL.createObjectURL(photo)
    };

    saveReport(report);
    closeReportForm();
}

function saveReport(report) {
    var storedReports = JSON.parse(localStorage.getItem('reports')) || [];
    storedReports.push(report);
    localStorage.setItem('reports', JSON.stringify(storedReports));
    var location = parseLocation(report.location);
    placeMarker(location);
    checkForAlerts(location);
    alert("Relatório enviado com sucesso!");
}

function parseLocation(locationString) {
    var coords = locationString.split(',');
    return { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
}

function checkForAlerts(location) {
    var storedReports = JSON.parse(localStorage.getItem('reports')) || [];
    var credibility = calculateCredibility(location, storedReports);

    markers.forEach(marker => {
        if (isSameLocation(marker.position, location)) {
            var icon = getIcon(marker.type, credibility);
            marker.setIcon(icon);
        }
    });
}

function calculateCredibility(location, reports) {
    var count = 0;
    reports.forEach(report => {
        if (isNearby(location, parseLocation(report.location), 0.5)) { // Raio de 0.5km para proximidade
            count++;
        }
    });
    return Math.min(count, 3); // Máximo de 3 para alta veracidade
}

function isNearby(location1, location2, radius) {
    var distance = haversineDistance(location1, location2);
    return distance <= radius;
}

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    var lat1 = coords1.lat;
    var lon1 = coords1.lng;
    var lat2 = coords2.lat;
    var lon2 = coords2.lng;

    var R = 6371; // km
    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d;
}

function isSameLocation(location1, location2) {
    if (typeof location1.lat === 'function' && typeof location1.lng === 'function') {
        return location1.lat() === location2.lat && location1.lng() === location2.lng;
    } else {
        return location1.lat === location2.lat && location1.lng() === location2.lng;
    }
}

function showReportDetails(marker) {
    var storedReports = JSON.parse(localStorage.getItem('reports')) || [];
    var report = storedReports.find(report => 
        isSameLocation(parseLocation(report.location), marker.position)
    );

    if (report) {
        displayReportDetails(report);
    }
}

function displayReportDetails(report) {
    var credibility = getCredibility(parseLocation(report.location));

    var reportDetails = `
        <div class="report-details-container">
            <img src="${report.photo}" alt="Problema">
            <p>Tipo: ${report.type}</p>
            <p>Descrição: ${report.description}</p>
            <p>Veracidade: ${credibility}</p>
            <button onclick="closeReportDetails()">Fechar</button>
        </div>
    `;

    // Adicionando os detalhes do relatório ao overlay
    $('#report-details-overlay').html(reportDetails).fadeIn();
}

function getCredibility(location) {
    var storedReports = JSON.parse(localStorage.getItem('reports')) || [];
    var credibility = calculateCredibility(location, storedReports);

    if (credibility >= 3) {
        return "Alta";
    } else if (credibility === 2) {
        return "Média";
    } else {
        return "Baixa";
    }
}

function closeReportDetails() {
    $('#report-details-overlay').fadeOut();
}

function openReportForm() {
    const reportForm = document.getElementById('report-form');
    reportForm.style.display = 'block';
    document.getElementById('report-button').style.display = 'none';
    reportForm.classList.remove('slide-up'); // Remove a classe de fechar caso exista
    reportForm.classList.add('slide-down');
}

function closeReportForm() {
    const reportForm = document.getElementById('report-form');
    reportForm.classList.remove('slide-down'); // Remove a classe de abrir caso exista
    reportForm.classList.add('slide-up');
    // Aguardar o tempo da animação antes de realmente ocultar o formulário
    setTimeout(() => {
        reportForm.style.display = 'none';
        document.getElementById('report-button').style.display = 'block';
    }, 500); // Duração da animação em milissegundos
}

// Função para lidar com erros de geolocalização
function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

window.onload = function() {
    getLocation(); // Chama a função para obter a localização do usuário assim que o aplicativo é carregado
    initMap(); // Inicializa o mapa após obter a localização do usuário
}

function loadReports() {
    var storedReports = JSON.parse(localStorage.getItem('reports')) || [];
    storedReports.forEach(report => {
        var location = parseLocation(report.location);
        placeMarker(location);
    });
}

var options = {
    types: ['address']
};

//  Auto complete na barra de pesquisa

var input1 = document.getElementById("location-1");
var autocomplete1 = new google.maps.places.Autocomplete(input1, options);

var input2 = document.getElementById("location-2");
var autocomplete2 = new google.maps.places.Autocomplete(input2, options);

// Função para obter a localização atual do usuário
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;

    var geocoder = new google.maps.Geocoder();
    var latlng = { lat: latitude, lng: longitude };

    geocoder.geocode({ 'location': latlng }, function (results, status) {
        if (status === 'OK') {
            if (results[0]) {
                document.getElementById('location-1').value = results[0].formatted_address;
            }
        }
    });
}

getLocation();
