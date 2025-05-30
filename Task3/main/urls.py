# main/urls.py
from django.urls import path, include
# from django.conf import settings # Not needed here if MEDIA_URL is handled at project level
# from django.conf.urls.static import static # Not needed here
# from django.contrib.auth import views as auth_views # Auth views usually at project level
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'images', views.UserImageViewSet)
router.register(r'clicks', views.ImageClickViewSet)

# Keep app_name if you use it for these non-board URLs, or remove if not needed.
# app_name = 'main' # Example, if you namespace these

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
    # path('define-grid/', views.define_grid, name='define_grid'), # Ensure this view exists if uncommented
    path('', include(router.urls)), # For your DRF viewsets
    # REMOVE THE FOLLOWING BOARD URLS FROM HERE:
    # path('create/', views.board_editor_view, name='board_create'),
    # path('<int:board_id>/edit/', views.board_editor_view, name='board_edit'),
    # path('<int:board_id>/delete/', views.board_delete_view, name='board_delete'),
    # path('api/save_board/', views.save_board_api_view, name='save_board_api'),
    # path('api/board/<int:board_id>/', views.get_board_data_api_view, name='get_board_data_api'),
]

# urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) # Usually handled at project level