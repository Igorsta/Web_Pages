from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken import views as authtoken_views 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('main.urls')),
    path('login/', auth_views.LoginView.as_view(template_name='main/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('api/', include('main.urls')),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api-token-auth/', authtoken_views.obtain_auth_token, name='api_token_auth'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)