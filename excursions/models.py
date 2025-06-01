# excursions/models.py
from django.db import models
from django.conf import settings # Для доступа к API ключу, если понадобится в моделях

class Tour(models.Model):
    title = models.CharField(max_length=200, verbose_name="Название экскурсии")
    description = models.TextField(blank=True, null=True, verbose_name="Описание экскурсии")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, # Используем настройку AUTH_USER_MODEL
        on_delete=models.CASCADE, # или models.SET_NULL, если хочешь сохранять экскурсии после удаления автора
        related_name='tours_created', # Имя для обратной связи от пользователя к его экскурсиям
        verbose_name="Автор",
        null=True, # Временно разрешим NULL, чтобы не ломать существующие экскурсии без автора
        blank=True # И в форме это поле не будет обязательным (мы его заполним программно)
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    # is_published = models.BooleanField(default=True, verbose_name="Опубликовано") # Пока все опубликованы

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Экскурсия"
        verbose_name_plural = "Экскурсии"
        ordering = ['-created_at']

class PointOfInterest(models.Model):
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE, related_name="points", verbose_name="Экскурсия")
    name = models.CharField(max_length=150, verbose_name="Название точки")
    description = models.TextField(verbose_name="Описание точки", blank=True, null=True) # <--- ДОБАВЬ blank=True, null=True

    latitude = models.FloatField(verbose_name="Широта")
    longitude = models.FloatField(verbose_name="Долгота")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок в маршруте", help_text="Порядковый номер точки в экскурсии, начиная с 0.")
    
    custom_image = models.ImageField(
        upload_to='poi_images/', 
        blank=True, 
        null=True, 
        verbose_name="Изображение точки",
        help_text="Загрузите изображение для этой точки."
    )

    def get_image_url(self):
        if self.custom_image:
            return self.custom_image.url
        # Можно вернуть URL заглушки, если изображения нет
        # from django.templatetags.static import static
        # return static('images/placeholder.png') # если есть static/images/placeholder.png
        return None

    def __str__(self):
        return f"{self.order}. {self.name} ({self.tour.title})"

    class Meta:
        verbose_name = "Точка интереса"
        verbose_name_plural = "Точки интереса"
        ordering = ['tour', 'order']