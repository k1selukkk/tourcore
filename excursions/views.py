# excursions/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.conf import settings # Убедись, что импортирован
from django.forms import inlineformset_factory # Хотя мы уже импортировали FormSet из forms.py
from django.contrib import messages # Для отображения сообщений пользователю
import json
from .models import Tour, PointOfInterest # Убедись, что PointOfInterest импортирован
from .forms import TourForm, PointOfInterestFormSet # Импортируем наш FormSet

def tour_list_view(request):
    tours = Tour.objects.all() # Получаем все объекты экскурсий из базы данных
    context = {
        'tours': tours,
        'page_title': 'Список экскурсий' # Просто для примера, как передавать доп. данные
    }
    # Django будет искать шаблон 'excursions/tour_list.html'
    # внутри папок 'templates' каждого зарегистрированного приложения
    return render(request, 'excursions/tour_list.html', context)

def create_tour_view(request):
    if request.method == 'POST':
        form = TourForm(request.POST) # Данные из формы
        if form.is_valid():
            new_tour = form.save(commit=False) # Пока не сохраняем в базу
            new_tour.author = request.user     # Присваиваем текущего пользователя как автора
            new_tour.save()                    # Теперь сохраняем в базу
            messages.success(request, f"Экскурсия '{new_tour.title}' создана. Теперь добавьте точки.")
            return redirect(reverse('excursions:add_points_to_tour', kwargs={'tour_id': new_tour.id}))
        else:
            messages.error(request, "Пожалуйста, исправьте ошибки в форме создания экскурсии.")
    else:
        form = TourForm()
    
    context = {
        'form': form,
        'page_title': 'Создание новой экскурсии'
    }
    return render(request, 'excursions/create_tour.html', context)

# Заглушка для представления добавления точек, чтобы redirect работал
# Позже мы его полноценно реализуем
def add_points_to_tour_view(request, tour_id):
    tour = get_object_or_404(Tour, id=tour_id)
    # Пока мы не используем аутентификацию, но если бы использовали,
    # здесь была бы проверка, что request.user является автором тура:
    # if tour.author != request.user:
    #     messages.error(request, "У вас нет прав для редактирования этой экскурсии.")
    #     return redirect('excursions:tour_list')

    if request.method == 'POST':
        formset = PointOfInterestFormSet(request.POST, request.FILES, instance=tour, prefix='points')
        # request.FILES нужен для обработки загруженных изображений
        # prefix='points' должен совпадать с префиксом, который используется в management_form в шаблоне,
        # если мы его явно задаем (по умолчанию это 'form')
        # Django inlineformset_factory по умолчанию использует имя related_name или имя модели в нижнем регистре + '-set'
        # В нашем случае это будет 'pointofinterest_set', но мы можем задать свой prefix.
        # Если prefix не указан при инициализации FormSet в view, Django ожидает стандартный префикс.
        # Если в шаблоне {{ formset.management_form }} рендерится без prefix, то и здесь не надо.
        # Давай пока уберем prefix, чтобы использовать стандартное поведение, если в шаблоне нет явного префикса в {{ formset.management_form }}
        # (по умолчанию префикс для inlineformset - это related_name, у нас 'points')

        # formset = PointOfInterestFormSet(request.POST, request.FILES, instance=tour) # Стандартный префикс
        
        if formset.is_valid():
            formset.save() # Сохраняет все изменения: новые точки, измененные старые, удаленные
            messages.success(request, f"Точки для экскурсии '{tour.title}' успешно сохранены!")
            # Можно перенаправить сюда же, чтобы пользователь видел результат,
            # или на страницу просмотра экскурсии, если она есть.
            return redirect(reverse('excursions:add_points_to_tour', kwargs={'tour_id': tour.id}))
        else:
            # Если форма невалидна, выведем ошибки (Django сделает это в шаблоне)
            messages.error(request, "Пожалуйста, исправьте ошибки в форме.")
            # Ошибки формсета (например, общие для формсета) можно посмотреть в formset.non_form_errors()
            # Ошибки отдельных форм в formset.forms[i].errors
            print("Formset errors:", formset.errors)
            for form_in_set in formset:
                 if form_in_set.errors:
                     print(f"Errors in form {form_in_set.prefix}: {form_in_set.errors}")


    else: # GET-запрос
        # Инициализируем формсет для существующего тура.
        # Он автоматически подтянет все связанные PointOfInterest объекты.
        formset = PointOfInterestFormSet(instance=tour, prefix='points') # или без prefix если используем стандартный
        # formset = PointOfInterestFormSet(instance=tour)

    context = {
        'tour': tour,
        'formset': formset,
        'page_title': f'Редактирование точек: {tour.title}',
        'yandex_maps_api_key': settings.YANDEX_MAPS_API_KEY
    }
    return render(request, 'excursions/add_points.html', context)
# Не забудь импортировать settings в начале файла views.py, если еще не сделал:
# from django.conf import settings
def tour_detail_view(request, tour_id):
    tour = get_object_or_404(Tour.objects.prefetch_related('points'), id=tour_id)
    # tour.points.all() теперь не будет делать доп. запрос к БД благодаря prefetch_related

    # Сериализуем точки в JSON для передачи в JS на карте (если нужно показать все точки на превью)
    # или просто передадим их в контекст и отрендерим в шаблоне
    points_data = []
    for point in tour.points.all().order_by('order'): # Убедимся что точки отсортированы
        points_data.append({
            'name': point.name,
            'latitude': point.latitude,
            'longitude': point.longitude,
            'order': point.order
        })

    context = {
        'tour': tour,
        'points_data_json': json.dumps(points_data), # Передаем JSON с точками
        'page_title': tour.title,
        'yandex_maps_api_key': settings.YANDEX_MAPS_API_KEY
    }
    return render(request, 'excursions/tour_detail.html', context)
def tour_play_view(request, tour_id):
    tour = get_object_or_404(Tour.objects.prefetch_related('points'), id=tour_id)
    
    # Проверяем, есть ли вообще точки в экскурсии
    if not tour.points.exists():
        messages.warning(request, "В этой экскурсии нет точек. Нельзя начать прохождение.")
        return redirect(reverse('excursions:tour_detail', kwargs={'tour_id': tour.id}))

    points_ordered = list(tour.points.all().order_by('order')) # Получаем отсортированный список точек

    points_data_for_js = []
    for point in points_ordered:
        points_data_for_js.append({
            'id': point.id,
            'name': point.name,
            'description': point.description,
            'latitude': point.latitude,
            'longitude': point.longitude,
            'order': point.order,
            'image_url': point.get_image_url() # Используем метод модели для получения URL картинки
        })

    context = {
        'tour': tour,
        'points_json': json.dumps(points_data_for_js), # JSON со всеми точками для JS
        'page_title': f"Прохождение: {tour.title}",
        'yandex_maps_api_key': settings.YANDEX_MAPS_API_KEY,
        'arrival_radius_meters': 30 # Радиус прибытия в метрах, передаем в JS
    }
    return render(request, 'excursions/tour_play.html', context)