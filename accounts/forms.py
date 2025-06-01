# accounts/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import CustomUser

class RegisterForm(UserCreationForm):
    email = forms.EmailField(
        label='Email',
        widget=forms.EmailInput(attrs={'autocomplete': 'email'})
    )
    name = forms.CharField(label='Имя')
    surname = forms.CharField(label='Фамилия')
    login = forms.CharField(label='Логин')
    city = forms.CharField(label='Город', required=False)

    class Meta:
        model = CustomUser
        fields = ('email', 'name', 'surname', 'login', 'city', 'password1', 'password2')

class LoginForm(AuthenticationForm):
    username = forms.CharField(label='Email или Логин')