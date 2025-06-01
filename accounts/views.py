# accounts/views.py
from django.urls import NoReverseMatch
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from .forms import RegisterForm, LoginForm
from django.contrib import messages  # Добавьте этот импорт
from django.contrib.auth import update_session_auth_hash

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
    else:
        form = RegisterForm()
    return render(request, 'accounts/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')
    else:
        form = LoginForm()
    return render(request, 'accounts/login.html', {'form': form})

# accounts/views.py
@login_required
def logout_view(request):
    logout(request)
    try:
        return redirect('home')
    except NoReverseMatch:
        return redirect('login')  # Резервный редирект если 'home' не существует

@login_required
def profile_view(request):
    return render(request, 'accounts/profile.html', {'user': request.user})

# Добавьте в конец views.py
@login_required
def edit_profile_view(request):
    if request.method == 'POST':
        user = request.user
        user.name = request.POST.get('name')
        user.surname = request.POST.get('surname')
        user.email = request.POST.get('email')
        user.login = request.POST.get('login')
        user.city = request.POST.get('city')
        
        new_password = request.POST.get('password')
        if new_password:
            user.set_password(new_password)
            update_session_auth_hash(request, user)  # Сохраняем сессию
        
        user.save()
        messages.success(request, 'Профиль успешно обновлен!')
        return redirect('profile')
    return redirect('profile')

@login_required
def delete_account_view(request):
    if request.method == 'POST':
        request.user.delete()
        logout(request)
        messages.success(request, 'Ваш аккаунт удален')
        return redirect('home')
    return redirect('profile')

# Добавьте в конец файла
@login_required
def home_view(request):
    return render(request, 'home.html', {'user': request.user})