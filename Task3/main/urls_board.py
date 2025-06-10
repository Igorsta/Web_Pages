# main/urls_board.py
from django.urls import path
from . import views # Assuming your board views are in main/views.py

app_name = 'game_board' # You can keep this namespace if you like, or change it

urlpatterns = [
    path('', views.board_list_view, name='board_list'), # Assuming this view exists in main.views
    path('create/', views.board_editor_view, name='board_create'),
    path('events/', views.sse_notifications_view, name='sse_board_events'),
    path('<int:board_id>/edit/', views.board_editor_view, name='board_edit'),
    path('<int:board_id>/delete/', views.board_delete_view, name='board_delete'),
    # API endpoint
    path('api/save_board/', views.save_board_api_view, name='save_board_api'),
    path('api/board/<int:board_id>/', views.get_board_data_api_view, name='get_board_data_api'),
]