# game_board/urls.py
from django.urls import path
from . import views

app_name = 'game_board'

urlpatterns = [
    path('', views.board_list_view, name='board_list'),
    path('create/', views.board_editor_view, name='board_create'),
    path('<int:board_id>/edit/', views.board_editor_view, name='board_edit'),
    path('<int:board_id>/delete/', views.board_delete_view, name='board_delete'),
    path('api/save_board/', views.save_board_api_view, name='save_board_api'),
    path('api/board/<int:board_id>/', views.get_board_data_api_view, name='get_board_data_api'),
    path('register/', views.register_view, name='register'),
    
]