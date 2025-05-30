from django.apps import AppConfig

class MainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'

    def ready(self):
        import main.models # Or 'import main.signals' if you put the signal handler there

class GameBoardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'game_board'
