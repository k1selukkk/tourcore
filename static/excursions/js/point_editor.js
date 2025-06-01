// static/excursions/js/point_editor.js

ymaps.ready(init);

let myMap;
let currentPlacemark;
let djangoData;

// DOM элементы
let currentPointEditorCard;
let currentPointTitleCard;
let pointFormFieldsContainer; // Контейнер для полей ВНУТРИ currentPointEditorCard
let addPointToListBtn;
let cancelEditPointBtn;
let pointsListContainer; // Правая колонка, куда добавляем карточки точек
let pointsCountSpan;
let emptyFormHtmlRaw; // "Сырой" HTML из {{ formset.empty_form.as_p }}
let formsetPrefix;    // Префикс формсета (например, "points")
let totalFormsInput;  // Ссылка на input TOTAL_FORMS
let nextFormIdx = 0;  // Индекс для следующей добавляемой формы

function init() {
    const scriptDataTag = document.getElementById('django-to-js-data');
    djangoData = JSON.parse(scriptDataTag.textContent);
    formsetPrefix = djangoData.formsetPrefix;
    
    const emptyFormDiv = document.getElementById('empty-form-template-django');
    if (emptyFormDiv) {
        // emptyFormHtmlRaw = emptyFormDiv.innerHTML; // as_p добавляет <p>, что не всегда удобно.
        // Вместо этого, давайте найдем отдельные поля в empty_form и будем их клонировать/использовать
        // Пока оставим так, но это место для улучшения.
        // Для начала, давайте сделаем так, чтобы поля в pointFormFieldsContainer имели фиксированные ID
        // и мы просто копировали из них значения. А emptyFormHtmlRaw будем использовать для создания новой формы.
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = djangoData.emptyFormHtml; // Используем HTML из JSON
        emptyFormHtmlRaw = tempDiv.innerHTML; // Сохраняем для создания новых форм
    } else {
        console.error("Элемент #empty-form-template-django не найден!");
    }

    currentPointEditorCard = document.getElementById('current-point-editor');
    currentPointTitleCard = document.getElementById('current-point-title-card');
    pointFormFieldsContainer = document.getElementById('point-form-fields-container');
    addPointToListBtn = document.getElementById('add-point-to-list-btn');
    cancelEditPointBtn = document.getElementById('cancel-edit-point-btn');
    pointsListContainer = document.getElementById('points-list-container');
    pointsCountSpan = document.getElementById('points-count');
    
    // Находим input для TOTAL_FORMS
    totalFormsInput = document.querySelector(`input[name="${formsetPrefix}-TOTAL_FORMS"]`);
    if (totalFormsInput) {
        nextFormIdx = parseInt(totalFormsInput.value); // Начинаем нумерацию с текущего кол-ва форм
    } else {
        console.error("Не найден input TOTAL_FORMS для префикса:", formsetPrefix);
        // Если его нет, это серьезная проблема с рендерингом {{ formset.management_form }}
    }


    let mapCenter = [46.3497, 48.0408];
    let mapZoom = 12;

    if (djangoData.existingPoints && djangoData.existingPoints.length > 0) {
        mapCenter = [djangoData.existingPoints[0].latitude, djangoData.existingPoints[0].longitude];
        mapZoom = 15;
        // Обновляем pointsCountSpan на основе существующих точек
        updatePointsCount(djangoData.existingPoints.length);
    }

    myMap = new ymaps.Map("map", {
        center: mapCenter,
        zoom: mapZoom,
        controls: ['zoomControl', 'searchControl', 'geolocationControl', 'typeSelector', 'fullscreenControl']
    });

    myMap.controls.add('rulerControl', { scaleLine: true });
    const searchControl = myMap.controls.get('searchControl');
    searchControl.options.set('provider', 'yandex#search');

    if (djangoData.existingPoints) {
        djangoData.existingPoints.forEach(point => {
            const placemark = new ymaps.Placemark([point.latitude, point.longitude], {
                hintContent: point.name, balloonContentHeader: point.name,
            }, {
                preset: 'islands#blueDotIconWithCaption', pointId: point.id, formPrefix: point.formPrefix
            });
            myMap.geoObjects.add(placemark);
        });
    }

    myMap.events.add('click', function (e) {
        const coords = e.get('coords');
        if (currentPlacemark) {
            currentPlacemark.geometry.setCoordinates(coords);
        } else {
            currentPlacemark = new ymaps.Placemark(coords, {}, {
                preset: 'islands#violetDotIconWithCaption', draggable: true
            });
            myMap.geoObjects.add(currentPlacemark);
            currentPlacemark.events.add('dragend', function () {
                const newCoords = currentPlacemark.geometry.getCoordinates();
                fillTemporaryFormCoordinates(newCoords[0], newCoords[1]); // Обновляем временную форму
                reverseGeocode(newCoords);
            });
        }
        showPointFormForNewPoint(coords[0], coords[1]); // Используем новую функцию
        reverseGeocode(coords);
    });

    addPointToListBtn.addEventListener('click', handleAddPointToList);
    cancelEditPointBtn.addEventListener('click', handleCancelEditPoint);

    console.log("Карта инициализирована. Данные из Django:", djangoData);
    console.log("Префикс формсета:", formsetPrefix);
    console.log("Начальный nextFormIdx:", nextFormIdx);
    console.log("HTML пустой формы (raw):", emptyFormHtmlRaw ? emptyFormHtmlRaw.substring(0,100) + "..." : "не найден");
}


// *** МОДИФИЦИРОВАНА: Показать/заполнить форму для НОВОЙ точки ***
// Использует временные ID для полей в pointFormFieldsContainer
function showPointFormForNewPoint(latitude, longitude) {
    currentPointEditorCard.style.display = 'block';
    currentPointEditorCard.classList.add('current-point-editor-card'); // Добавляем класс для рамки
    currentPointTitleCard.textContent = 'Новая точка';

    // Генерируем HTML для полей временной формы (можно улучшить, сделав шаблон)
    // Эти ID временные, только для текущего редактирования
    pointFormFieldsContainer.innerHTML = `
        <div class="mb-2">
            <label for="temp_point_name" class="form-label form-label-sm">Название точки</label>
            <input type="text" id="temp_point_name" class="form-control form-control-sm">
        </div>
        <div class="mb-2">
            <label for="temp_point_description" class="form-label form-label-sm">Описание точки</label>
            <textarea id="temp_point_description" class="form-control form-control-sm" rows="3"></textarea>
        </div>
        <div class="mb-2">
            <label for="temp_point_image" class="form-label form-label-sm">Изображение</label>
            <input type="file" id="temp_point_image" class="form-control form-control-sm">
        </div>
        <input type="hidden" id="temp_point_latitude">
        <input type="hidden" id="temp_point_longitude">
        <input type="hidden" id="temp_point_order">
    `;
    
    fillTemporaryFormCoordinates(latitude, longitude);
    document.getElementById('temp_point_order').value = nextFormIdx; // Начальный порядок

    addPointToListBtn.style.display = 'inline-block';
    cancelEditPointBtn.style.display = 'inline-block';
    document.getElementById('temp_point_name').focus();
}

// *** МОДИФИЦИРОВАНА: Обновить координаты во ВРЕМЕННОЙ форме ***
function fillTemporaryFormCoordinates(latitude, longitude) {
    const latField = document.getElementById('temp_point_latitude');
    const lonField = document.getElementById('temp_point_longitude');
    if (latField) latField.value = latitude.toFixed(6);
    if (lonField) lonField.value = longitude.toFixed(6);
}


function reverseGeocode(coords) {
    ymaps.geocode(coords).then(function (res) {
        var firstGeoObject = res.geoObjects.get(0);
        const pointName = firstGeoObject.getAddressLine() || firstGeoObject.getPremise() || 'Новая точка';
        if (currentPlacemark) {
            currentPlacemark.properties.set('iconCaption', pointName.substring(0, 25));
            currentPlacemark.properties.set('hintContent', pointName);
        }
        const nameField = document.getElementById('temp_point_name');
        if (nameField && currentPointEditorCard.style.display === 'block' && nameField.value === '') {
            nameField.value = pointName;
        }
        currentPointTitleCard.textContent = `Новая точка: ${pointName.substring(0, 30)}...`;
    }).catch(function (err) { console.warn('Ошибка геокодирования:', err); });
}

// *** РЕАЛИЗАЦИЯ: Обработчик кнопки "Добавить эту точку в экскурсию" ***
function handleAddPointToList() {
    // 1. Получить данные из временной формы
    const name = document.getElementById('temp_point_name').value.trim();
    const description = document.getElementById('temp_point_description').value.trim();
    const latitude = document.getElementById('temp_point_latitude').value;
    const longitude = document.getElementById('temp_point_longitude').value;
    const order = document.getElementById('temp_point_order').value;
    const imageFile = document.getElementById('temp_point_image').files[0]; // Файл изображения

    if (!name) {
        alert("Пожалуйста, укажите название точки.");
        document.getElementById('temp_point_name').focus();
        return;
    }
    if (!latitude || !longitude) {
        alert("Координаты не определены. Пожалуйста, выберите точку на карте.");
        return;
    }

    // 2. Создать новую форму Django Formset
    const newFormHtml = emptyFormHtmlRaw.replace(/__prefix__/g, nextFormIdx);
    const newFormDiv = document.createElement('div');
    newFormDiv.innerHTML = newFormHtml;
    newFormDiv.id = `form-${formsetPrefix}-${nextFormIdx}-wrapper`; // Обертка для удобства
    newFormDiv.classList.add('point-list-item-django', 'mb-2');
    // Сразу добавим форму в DOM (внутри основной формы, но пока можно невидимой или в конец)
    // document.getElementById('points-form').appendChild(newFormDiv); // Или другое место
    
    // 3. Заполнить поля этой новой формы данными
    // Имена полей будут: formsetPrefix-nextFormIdx-fieldName
    // Например: points-0-name
    const prefix = `${formsetPrefix}-${nextFormIdx}`;
    newFormDiv.querySelector(`input[name="${prefix}-name"]`).value = name;
    newFormDiv.querySelector(`textarea[name="${prefix}-description"]`).value = description;
    newFormDiv.querySelector(`input[name="${prefix}-latitude"]`).value = latitude;
    newFormDiv.querySelector(`input[name="${prefix}-longitude"]`).value = longitude;
    newFormDiv.querySelector(`input[name="${prefix}-order"]`).value = order;
    // С файлом сложнее: мы не можем программно установить value для input type="file" из соображений безопасности.
    // Файл должен быть отправлен с основной формой. Django Formset это обработает, если input есть.
    // Если нужно отобразить, что файл выбран, это можно сделать отдельно.
    // Пока просто убедимся, что input[type=file] есть в newFormHtml
    
    // Важно: Прикрепляем новую форму к основному тегу <form>
    // чтобы она отправилась с остальными данными.
    // Обычно формсеты рендерятся все вместе. Мы добавляем новую форму динамически.
    // Её нужно добавить перед кнопкой submit или в специальный контейнер для форм.
    // Для простоты, пока что не будем её физически добавлять в DOM так, чтобы она была видна.
    // Мы её добавим в pointsListContainer, но она будет скрыта, а видимой будет карточка.
    // Фактически, нам нужно, чтобы скрытые input'ы этой новой формы были частью основной form#points-form

    const hiddenFormContainer = document.getElementById('empty-form-template-django').parentNode; // Родительский div для empty_form
    hiddenFormContainer.appendChild(newFormDiv); // Добавляем новую форму сюда (она будет скрыта)

    // 4. Добавить карточку в список справа
    addPointCardToDisplayList(name, description, order, imageFile, nextFormIdx);

    // 5. Обновить management_form
    nextFormIdx++;
    if (totalFormsInput) {
        totalFormsInput.value = nextFormIdx;
    }
    updatePointsCount(nextFormIdx); // Используем nextFormIdx как общее количество форм

    // 6. Сбросить и скрыть временную форму
    handleCancelEditPoint();

    console.log(`Точка "${name}" добавлена в список (индекс формы ${nextFormIdx - 1}). Всего форм: ${totalFormsInput.value}`);
}

// *** НОВАЯ ФУНКЦИЯ: Добавить карточку точки в отображаемый список справа ***
function addPointCardToDisplayList(name, description, order, imageFile, formIndex) {
    const noPointsMsg = document.getElementById('no-points-message');
    if (noPointsMsg) noPointsMsg.style.display = 'none';

    const card = document.createElement('div');
    card.classList.add('card', 'point-card', 'point-card-new', 'mb-2'); // Новая точка - синяя
    card.setAttribute('data-form-index', formIndex); // Связь с индексом формы

    let imageUrl = null;
    if (imageFile) {
        imageUrl = URL.createObjectURL(imageFile); // Временный URL для превью
    }

    card.innerHTML = `
        <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
                <h6 class="card-title mb-1">
                    <span class="point-order-display">${parseInt(order) + 1}.</span>
                    <span class="point-name-display">${name}</span>
                </h6>
                <div>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-icon remove-point-btn" title="Удалить точку">🗑️</button>
                </div>
            </div>
            <p class="card-text text-muted small point-description-display mb-1">${description.substring(0, 70)}...</p>
            ${imageUrl ? `<img src="${imageUrl}" alt="preview" style="max-height: 40px; max-width: 80px; border-radius: .2rem;" class="mb-1">` : ''}
        </div>
    `;
    pointsListContainer.appendChild(card);

    // Добавить обработчик для кнопки удаления этой карточки
    card.querySelector('.remove-point-btn').addEventListener('click', function() {
        handleRemovePoint(card, formIndex);
    });
}

// *** НОВАЯ ФУНКЦИЯ: Обработчик удаления точки (клиентская часть) ***
function handleRemovePoint(cardElement, formIndex) {
    // Если это существующая точка (имеет ID в модели), то нужно отметить её поле DELETE
    // Если это новая, только что добавленная на клиенте, то просто удалить форму и карточку.

    const formWrapperToRemove = document.getElementById(`form-${formsetPrefix}-${formIndex}-wrapper`) || 
                                document.querySelector(`input[name="${formsetPrefix}-${formIndex}-id"]`)?.closest('.point-list-item-django');
    
    if (formWrapperToRemove) {
        // Проверяем, есть ли у этой формы поле ID (т.е. это сохраненная точка)
        const idField = formWrapperToRemove.querySelector(`input[name="${formsetPrefix}-${formIndex}-id"]`);
        if (idField && idField.value) { // Существующая точка
            const deleteCheckbox = formWrapperToRemove.querySelector(`input[name="${formsetPrefix}-${formIndex}-DELETE"]`);
            if (deleteCheckbox) {
                deleteCheckbox.checked = true;
                cardElement.style.opacity = '0.5'; // Помечаем как "удаляемую"
                cardElement.querySelector('.remove-point-btn').disabled = true; // Блокируем повторное удаление
                console.log(`Точка с префиксом ${formsetPrefix}-${formIndex} помечена для удаления на сервере.`);
            } else {
                console.warn(`Не найден DELETE чекбокс для формы ${formsetPrefix}-${formIndex}`);
                 // Если нет чекбокса, но есть ID, просто удаляем с клиента, но она останется на сервере
                 // Это не должно происходить, если can_delete=True для формсета
                cardElement.remove();
                formWrapperToRemove.remove(); // Удаляем и скрытую форму
            }
        } else { // Новая, еще не сохраненная точка
            cardElement.remove(); // Удаляем карточку из списка
            formWrapperToRemove.remove(); // Удаляем ее форму из DOM
            console.log(`Новая точка (форма ${formsetPrefix}-${formIndex}) удалена с клиента.`);
            // Уменьшать TOTAL_FORMS и переиндексировать не будем, Django справится с "дырками" в нумерации
            // или можно реализовать более сложную логику переиндексации.
            // Но для простоты - не делаем. Сервер просто проигнорирует отсутствующие формы.
        }
    } else {
        // Если не нашли обертку формы, просто удаляем карточку (менее надежно)
        cardElement.remove();
        console.warn(`Не найдена обертка формы для индекса ${formIndex}, удалена только карточка.`);
    }

    // Обновить счетчик (просто декрементируем видимое число, реальный TOTAL_FORMS не меняем для уже добавленных)
    let currentCount = parseInt(pointsCountSpan.textContent);
    // updatePointsCount(currentCount > 0 ? currentCount - 1 : 0); // Это не совсем корректно, т.к. TOTAL_FORMS не уменьшается
    // Лучше пересчитать видимые карточки
    const visibleCards = pointsListContainer.querySelectorAll('.card:not([style*="opacity: 0.5"])').length;
    updatePointsCount(visibleCards);


    const noPointsMsg = document.getElementById('no-points-message');
    if (pointsListContainer.querySelectorAll('.card').length === 0 && noPointsMsg) {
         noPointsMsg.style.display = 'block';
    }
}


function handleCancelEditPoint() {
    currentPointEditorCard.style.display = 'none';
    currentPointEditorCard.classList.remove('current-point-editor-card');
    pointFormFieldsContainer.innerHTML = '';
    if (currentPlacemark) {
        myMap.geoObjects.remove(currentPlacemark);
        currentPlacemark = null;
    }
}

// Вспомогательная функция для обновления счетчика точек
function updatePointsCount(count) {
    if (pointsCountSpan) {
        pointsCountSpan.textContent = count;
    }
}