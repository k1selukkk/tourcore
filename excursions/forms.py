# excursions/forms.py
from django import forms
from .models import Tour, PointOfInterest # Добавили PointOfInterest

class TourForm(forms.ModelForm):
    class Meta:
        model = Tour
        fields = ['title', 'description']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Например, "Прогулка по Астраханскому Кремлю"'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Краткое описание вашей будущей экскурсии...'}),
        }
        labels = {
            'title': 'Название экскурсии',
            'description': 'Описание экскурсии',
        }

class PointOfInterestForm(forms.ModelForm):
    class Meta:
        model = PointOfInterest
        # Мы явно указываем все поля, которые хотим видеть в форме.
        # Поля 'latitude', 'longitude', 'order' будут заполняться через JavaScript
        # и их виджеты определены как HiddenInput, чтобы они не отображались пользователю напрямую,
        # но были частью формы для отправки данных.
        fields = ['name', 'description', 'custom_image', 'latitude', 'longitude', 'order']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control form-control-sm mb-2', # Добавил mb-2 для небольшого отступа снизу
                'placeholder': 'Название достопримечательности'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control form-control-sm mb-2',
                'rows': 3,
                'placeholder': 'Описание точки, интересные факты...'
            }),
            'custom_image': forms.ClearableFileInput(attrs={
                'class': 'form-control form-control-sm mb-2'
            }),
            # Для этих полей id заданы, чтобы JavaScript мог легко их найти и обновить
            'latitude': forms.HiddenInput(attrs={'id': 'id_point_latitude_hidden'}),
            'longitude': forms.HiddenInput(attrs={'id': 'id_point_longitude_hidden'}),
            'order': forms.HiddenInput(attrs={'id': 'id_point_order_hidden'}),
        }
        labels = {
            'name': 'Название точки',
            'description': 'Описание точки',
            'custom_image': 'Изображение для точки (необязательно)',
        }

# Создаем FormSet для управления множеством форм PointOfInterest, связанных с одной Tour
PointOfInterestFormSet = forms.inlineformset_factory(
    Tour,  # Родительская модель
    PointOfInterest,  # Дочерняя модель (которую мы редактируем "инлайн" с родителем)
    form=PointOfInterestForm,  # Указываем нашу кастомную форму для точек
    fields=['name', 'description', 'custom_image', 'latitude', 'longitude', 'order'], # Поля из PointOfInterestForm, которые будут в формсете
    extra=1,  # Сколько пустых форм для добавления новых точек показывать по умолчанию. Ставим 0, т.к. будем добавлять через JS.
               # Если поставить 1, то одна пустая форма будет сразу отрендерена.
    can_delete=True, # Позволяет пользователю отмечать существующие точки для удаления (появится чекбокс "Удалить")
    # min_num=0, # Минимальное количество форм. Если нужно, чтобы хотя бы одна точка была, можно поставить min_num=1.
    # validate_min=True, # Включает валидацию для min_num.
)