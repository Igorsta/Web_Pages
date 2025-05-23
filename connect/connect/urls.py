# connect_dots_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from game_board import views as game_board_views # Import your app's views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('accounts/register/', game_board_views.register_view, name='register'), # <-- ADD THIS
    path('board/', include('game_board.urls')), # Your app's URLs
    path('', auth_views.LoginView.as_view(), name='home_redirect_to_login'),
    
]