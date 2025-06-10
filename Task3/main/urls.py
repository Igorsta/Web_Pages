# main/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'images', views.UserImageViewSet, basename='userimage')
router.register(r'clicks', views.ImageClickViewSet, basename='imageclick')

urlpatterns = [
    path('', views.home, name='home'),
    # 'register' jest teraz w głównym login_required_project/urls.py
    path('add-click/', views.add_click, name='add_click'),
    path('user-panel/', views.user_panel, name='user_panel'),
    path('delete-click/', views.delete_click, name='delete_click'),
    path('update-click/', views.update_click, name='update_click'),
    path('upload-image/', views.upload_image, name='upload_image'),
    path('change-password/', views.change_password, name='change_password'),
    path('delete/<int:image_id>/', views.delete_image, name='delete_image'),
    path('use-common-image/<int:common_image_id>/', views.use_common_image, name='use_common_image'),
    path('upload-common-image/', views.upload_common_image, name='upload_common_image'),
    # path('define-grid/', views.define_grid, name='define_grid'), # Jeśli używasz

    path('api/', include(router.urls)), # DRF API routes
]