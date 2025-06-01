# accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _  # Исправленный импорт

class CustomUser(AbstractUser):
    # Убираем стандартный username, заменяем его на login
    username = None
    
    # Основные поля
    name = models.CharField(_('name'), max_length=50)
    surname = models.CharField(_('surname'), max_length=50)
    login = models.CharField(_('login'), max_length=50, unique=True)  # Будет использоваться для входа
    email = models.EmailField(_('email address'), unique=True)
    city = models.CharField(_('city'), max_length=50, blank=True)
    
    # Указываем, что `login` — это поле для аутентификации
    USERNAME_FIELD = 'login'  
    
    # Обязательные поля при создании пользователя (кроме логина и пароля)
    REQUIRED_FIELDS = ['email', 'name', 'surname']  

    def __str__(self):
        return f'{self.name} {self.surname} | {self.login}'