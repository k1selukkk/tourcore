// static/excursions/js/tour_player.js

let playMap;
let userPlacemark; // Маркер пользователя
let tourData;      // Данные экскурсии (точки, радиус и т.д.)
let currentPointIndex = 0;
let watchId; // ID для navigator.geolocation.watchPosition

// DOM элементы
let statusBar;
let pointInfoPanel;
let pointNameDisplay;
let distanceToPointDisplay;
let pointImageDisplay;
let pointDescriptionDisplay;
let nextPointButton;
let panelHeader; // Для заголовка панели
let togglePanelButton; // Кнопка-стрелка для сворачивания/разворачивания

// Константа для радиуса прибытия (будет перезаписана из Django)
let ARRIVAL_RADIUS_METERS = 50; 

ymaps.ready(initTourPlayer);

function initTourPlayer() {
    const scriptDataTag = document.getElementById('tour-data-for-js');
    if (!scriptDataTag) {
        console.error("Не найден тег с данными экскурсии!");
        alert("Ошибка загрузки данных экскурсии. Попробуйте позже.");
        return;
    }
    tourData = JSON.parse(scriptDataTag.textContent);
    ARRIVAL_RADIUS_METERS = tourData.arrivalRadius || 50;

    if (!tourData.points || tourData.points.length === 0) {
        alert("В этой экскурсии нет точек.");
        const bodyElement = document.querySelector('body');
        let tourListUrl = null;
        if (bodyElement) {
            const linkElement = bodyElement.querySelector('a[href*="/excursions/"]');
            if (linkElement && !linkElement.href.includes('/play/') && !linkElement.href.includes('/add-points/')) {
                 tourListUrl = linkElement.href;
            }
        }
        window.location.href = tourListUrl || `/excursions/${tourData.tourId}/`;
        return;
    }

    // Инициализация DOM элементов
    statusBar = document.getElementById('status-message-bar');
    pointInfoPanel = document.getElementById('point-info-panel');
    pointNameDisplay = document.getElementById('point-name-display');
    distanceToPointDisplay = document.getElementById('distance-to-point');
    pointImageDisplay = document.getElementById('point-image-display');
    pointDescriptionDisplay = document.getElementById('point-description-display');
    nextPointButton = document.getElementById('btn-next-point');
    
    panelHeader = document.getElementById('panel-header');
    togglePanelButton = pointInfoPanel.querySelector('.toggle-panel-btn');

    // Обработчики событий
    if (nextPointButton) nextPointButton.addEventListener('click', moveToNextPoint);
    if (panelHeader) { 
        panelHeader.addEventListener('click', togglePointInfoPanel);
    } else if (togglePanelButton) { // Если вдруг нет panelHeader, вешаем на кнопку
         togglePanelButton.addEventListener('click', togglePointInfoPanel);
    }

    const initialMapCenter = [tourData.points[0].latitude, tourData.points[0].longitude];
    playMap = new ymaps.Map("play-map", {
        center: initialMapCenter,
        zoom: 15,
        controls: ['zoomControl', 'geolocationControl', 'fullscreenControl']
    });

    renderAllPointsOnMap();
    
    // Показываем панель в свернутом виде при инициализации
    if (pointInfoPanel && tourData.points && tourData.points.length > 0) {
        pointInfoPanel.classList.add('visible'); // Панель становится видимой, но свернутой по CSS
    }
    updateUIForCurrentPoint(false); // Обновляем UI для первой точки
    
    startGeolocation();
    console.log("Проигрыватель экскурсии инициализирован.", tourData);
}

function renderAllPointsOnMap() {
    if (!playMap) return;
    playMap.geoObjects.removeAll();
    if (userPlacemark) {
        playMap.geoObjects.add(userPlacemark);
    }
    tourData.points.forEach((point, index) => {
        let presetStyle = 'islands#grayIcon';
        if (index < currentPointIndex) {
            presetStyle = 'islands#greenIcon';
        } else if (index === currentPointIndex) {
            presetStyle = 'islands#redIcon';
        }
        const placemark = new ymaps.Placemark([point.latitude, point.longitude], {
            iconContent: index + 1,
            hintContent: point.name
        }, { preset: presetStyle });
        playMap.geoObjects.add(placemark);
    });
}

function updateUIForCurrentPoint(hasArrived) {
    if (currentPointIndex >= tourData.points.length) {
        handleTourCompletion();
        return;
    }
    const currentPoint = tourData.points[currentPointIndex];
    
    if (!pointNameDisplay || !statusBar || !pointDescriptionDisplay || !pointImageDisplay || !nextPointButton || !pointInfoPanel) {
        console.error("DOM UI элементы точки не найдены в updateUIForCurrentPoint!");
        return;
    }

    pointNameDisplay.textContent = `${currentPointIndex + 1}. ${currentPoint.name}`;
    
    if (hasArrived) {
        statusBar.textContent = `Вы на точке: ${currentPoint.name}!`;
        pointDescriptionDisplay.innerHTML = currentPoint.description;
        pointDescriptionDisplay.classList.remove('blurred-description');
        pointImageDisplay.classList.add('arrived'); // Добавляем класс "прибыл"

        if (currentPoint.image_url) {
            pointImageDisplay.src = currentPoint.image_url;
            pointImageDisplay.alt = currentPoint.name;
            pointImageDisplay.classList.add('has-image'); // Добавляем класс "есть картинка"
        } else {
            pointImageDisplay.src = "#"; // Убираем src, если нет картинки
            pointImageDisplay.classList.remove('has-image');
        }
        nextPointButton.disabled = false;
        nextPointButton.textContent = (currentPointIndex === tourData.points.length - 1) ? "Завершить экскурсию" : "Следующая точка";
    } else { 
        statusBar.textContent = `Идите к точке: ${currentPoint.name}`;
        pointDescriptionDisplay.textContent = "Подробное описание и фото будут доступны по прибытии.";
        pointDescriptionDisplay.classList.add('blurred-description');
        pointImageDisplay.src = "#"; // Сбрасываем src
        pointImageDisplay.classList.remove('has-image');
        pointImageDisplay.classList.remove('arrived'); // Убираем класс "прибыл"
        nextPointButton.disabled = true;
    }

    // Убеждаемся, что панель видима (но она может быть свернута)
    if (!pointInfoPanel.classList.contains('visible')) {
        pointInfoPanel.classList.add('visible');
    }
    
    if(playMap) {
        playMap.panTo([currentPoint.latitude, currentPoint.longitude], {
            flying: true, duration: 1000 
        });
    }
}

function startGeolocation() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            geolocationSuccess,
            geolocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        if (statusBar) statusBar.textContent = "Геолокация не поддерживается вашим браузером.";
        alert("Геолокация не поддерживается вашим браузером.");
    }
}

function geolocationSuccess(position) {
    const userCoords = [position.coords.latitude, position.coords.longitude];
    console.log("User Coords (Raw):", position.coords.latitude, position.coords.longitude);
    console.log("Accuracy:", position.coords.accuracy, "meters");

    if (!userPlacemark) {
        userPlacemark = new ymaps.Placemark(userCoords, {}, { preset: 'islands#geolocationIcon' });
        if(playMap) playMap.geoObjects.add(userPlacemark);
        console.log("User placemark created at:", userCoords);
        
        if(playMap) {
            playMap.panTo(userCoords, {
                flying: true, duration: 1500, checkZoomRange: true
            }).then(() => {
                if (playMap.getZoom() < 16) {
                    playMap.setZoom(16, { duration: 500 });
                }
            });
        }
    } else {
        userPlacemark.geometry.setCoordinates(userCoords);
    }
    checkArrival(userCoords);
}

function geolocationError(error) {
    let message = "Ошибка геолокации: ";
    switch(error.code) {
        case error.PERMISSION_DENIED: message += "Доступ запрещен."; break;
        case error.POSITION_UNAVAILABLE: message += "Местоположение недоступно."; break;
        case error.TIMEOUT: message += "Тайм-аут запроса."; break;
        default: message += `Неизвестная ошибка (код: ${error.code}).`; break;
    }
    if (statusBar) statusBar.textContent = message;
    console.warn(message, error);
}

function checkArrival(userCoords) {
    if (currentPointIndex >= tourData.points.length || !tourData.points[currentPointIndex]) return;

    const currentTargetPoint = tourData.points[currentPointIndex];
    const distance = ymaps.coordSystem.geo.getDistance(userCoords, [currentTargetPoint.latitude, currentTargetPoint.longitude]);
    
    const accuracy = navigator.geolocation.lastPosition ? Math.round(navigator.geolocation.lastPosition.coords.accuracy) : 'N/A';
    if (distanceToPointDisplay) distanceToPointDisplay.textContent = `До точки: ~${Math.round(distance)} м. (Точность GPS: ~${accuracy} м.)`;

    if (distance <= ARRIVAL_RADIUS_METERS) {
        updateUIForCurrentPoint(true);
    } else {
        // Обновляем UI на "не прибыл", если ранее было "прибыл" ИЛИ если описание все еще размыто
        if ( (nextPointButton && !nextPointButton.disabled) || (pointDescriptionDisplay && pointDescriptionDisplay.classList.contains('blurred-description')) ) {
             updateUIForCurrentPoint(false);
        }
    }
}

function moveToNextPoint() {
    currentPointIndex++;
    if (currentPointIndex < tourData.points.length) {
        updateUIForCurrentPoint(false);
        renderAllPointsOnMap();
        if (distanceToPointDisplay) distanceToPointDisplay.textContent = "";
        // Сворачиваем панель при переходе к следующей точке
        if (pointInfoPanel && pointInfoPanel.classList.contains('expanded')) {
            pointInfoPanel.classList.remove('expanded');
        }
    } else {
        handleTourCompletion();
    }
}

function handleTourCompletion() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (statusBar) statusBar.textContent = "Поздравляем! Экскурсия завершена!";
    if (pointNameDisplay) pointNameDisplay.textContent = "Экскурсия окончена";
    if (pointDescriptionDisplay) {
        pointDescriptionDisplay.innerHTML = "<p>Вы прошли все точки. Спасибо за участие!</p>";
        pointDescriptionDisplay.classList.remove('blurred-description');
    }
    if (pointImageDisplay) {
        pointImageDisplay.src = "#"; // Сбрасываем src
        pointImageDisplay.classList.remove('has-image', 'arrived');
    }
    
    if (nextPointButton) {
        nextPointButton.textContent = "На главную";
        nextPointButton.disabled = false;
        nextPointButton.onclick = function() {
            // Попытка найти ссылку на список экскурсий
            const bodyElement = document.querySelector('body');
            let targetUrl = "/excursions/"; 
            if (bodyElement) {
                const linkElement = bodyElement.querySelector('a.btn[href*="/excursions/"]'); // Ищем кнопку, ведущую на экскурсии
                if (linkElement && !linkElement.href.includes('/play/') && !linkElement.href.includes('/add-points/')) {
                    targetUrl = linkElement.href;
                }
            }
            window.location.href = targetUrl;
        };
    }
    if (distanceToPointDisplay) distanceToPointDisplay.textContent = "";
    if (pointInfoPanel) {
        pointInfoPanel.classList.add('visible');
        pointInfoPanel.classList.add('expanded'); // Разворачиваем панель для финального сообщения
    }
    console.log("Экскурсия завершена");
}

// Функция для переключения состояния панели (сворачивание/разворачивание)
function togglePointInfoPanel() {
    if (pointInfoPanel) {
        pointInfoPanel.classList.toggle('expanded');
    }
}

// Сохраняем последнее известное положение для доступа в checkArrival
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        p => { navigator.geolocation.lastPosition = p; },
        err => { 
            console.warn("Не удалось получить начальное положение для lastPosition:", err);
            navigator.geolocation.lastPosition = null;
        }
    );
}