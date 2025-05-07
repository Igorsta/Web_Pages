from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import home, register, upload_image
from main.views import home, upload_image, logout_view
from django.contrib.auth import views as auth_views
from django.contrib import admin
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='home'),
    path('login/', auth_views.LoginView.as_view(template_name='main/login.html'), name='login'),
    path('logout/', logout_view, name='logout'),
    path('', home, name='home'),
    path('upload/', upload_image, name='upload_image'),
    path('register/', register, name='register'),
    path('delete/<int:image_id>/', views.delete_image, name='delete_image'),
    path('panel/', views.user_panel, name='user_panel'),
    path('change_password/', views.change_password, name='change_password'),
    path('record_click/', views.record_click, name='record_click'),
    path('update-click/', views.update_click, name='update_click'),
    path('delete-click/', views.delete_click, name='delete_click'),
    path('add-click/', views.add_click, name='add_click'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
