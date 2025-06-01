from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('excursions/', include('excursions.urls')),
    
    # Перенаправление корня на страницу входа
    path('', RedirectView.as_view(pattern_name='login', permanent=False)),
]

# Добавляем обработку медиафайлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)