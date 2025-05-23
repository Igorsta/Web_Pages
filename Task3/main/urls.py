from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'images', views.UserImageViewSet)
router.register(r'clicks', views.ImageClickViewSet)

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('add-click/', views.add_click, name='add_click'),
    path('user-panel/', views.user_panel, name='user_panel'),
    path('delete-click/', views.delete_click, name='delete_click'),
    path('record-click/', views.record_click, name='record_click'),
    path('update-click/', views.update_click, name='update_click'),
    path('upload-image/', views.upload_image, name='upload_image'),
    path('change-password/', views.change_password, name='change_password'),
    path('delete/<int:image_id>/', views.delete_image, name='delete_image'),
    path('use-common-image/<int:common_image_id>/', views.use_common_image, name='use_common_image'),
    path('upload-common-image/', views.upload_common_image, name='upload_common_image'),
    path('define-grid/', views.define_grid, name='define_grid'),
    path('', include(router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
