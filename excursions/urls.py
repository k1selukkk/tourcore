# excursions/urls.py
from django.urls import path
from . import views

app_name = 'excursions'

urlpatterns = [
    path('', views.tour_list_view, name='tour_list'),
    path('create/', views.create_tour_view, name='create_tour'),
    path('<int:tour_id>/add-points/', views.add_points_to_tour_view, name='add_points_to_tour'),
    path('<int:tour_id>/', views.tour_detail_view, name='tour_detail'),
    path('<int:tour_id>/play/', views.tour_play_view, name='tour_play'), # ДОБАВЛЕН ЭТОТ МАРШРУТ
]