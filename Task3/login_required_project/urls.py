# login_required_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken import views as authtoken_views
from main import views as main_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth views (using registration/login.html by default if not specified)
    # Assuming your main/login.html is at main/templates/main/login.html and you want to use it
    # path('login/', auth_views.LoginView.as_view(template_name='main/login.html'), name='login'),
    # If using default registration/login.html location:
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'), # Ensure next_page is correct
    path('register/', main_views.register, name='register'), # Assuming register view is in main.views

    # App-specific URLs
    path('board/', include('main.urls_board')), # For GameBoard features
    path('api/save_grid_as_image/', main_views.save_grid_as_image_view, name='save_grid_as_image_api'),
    
    # SSE Notifications
    path('sse/notifications/', main_views.sse_notifications_view, name='sse_global_notifications'),

    # DRF auth (optional, if you use DRF browsable API login)
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api-token-auth/', authtoken_views.obtain_auth_token, name='api_token_auth'), # For token auth

    # Main app URLs (including DRF router if it's in main.urls)
    # This should generally be last if it includes a root path like ''
    path('', include('main.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serving static files with runserver is automatic with DEBUG=True if STATIC_URL is set
    # urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)