from django.urls import path
from .views import (
    register_view, 
    login_view, 
    logout_view, 
    profile_view,
    edit_profile_view,
    delete_account_view,
    home_view  # Добавлено новое представление
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('home/', home_view, name='home'),  # Добавлен путь для домашней страницы
    path('edit-profile/', edit_profile_view, name='edit_profile'),
    path('delete-account/', delete_account_view, name='delete_account'),
]