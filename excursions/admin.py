# excursions/admin.py
from django.contrib import admin
from .models import Tour, PointOfInterest

class PointOfInterestInline(admin.TabularInline): # Позволяет редактировать точки на странице экскурсии
    model = PointOfInterest
    extra = 1 # Сколько пустых форм для новых точек показывать
    fields = ('name', 'description', 'latitude', 'longitude', 'order', 'custom_image')
    # Можно добавить readonly_fields, если какие-то поля не должны редактироваться здесь
    # sortable_field_name = "order" # Если хотим перетаскивание в админке (требует доп. настройки)

@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'get_points_count')
    search_fields = ('title', 'description')
    inlines = [PointOfInterestInline]

    def get_points_count(self, obj):
        return obj.points.count()
    get_points_count.short_description = 'Кол-во точек'

@admin.register(PointOfInterest)
class PointOfInterestAdmin(admin.ModelAdmin):
    list_display = ('name', 'tour', 'order', 'latitude', 'longitude')
    list_filter = ('tour',)
    search_fields = ('name', 'description')
    list_editable = ('order',) # Позволяет менять порядок прямо в списке (осторожно с этим)
    ordering = ('tour', 'order')