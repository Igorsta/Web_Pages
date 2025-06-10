from django.apps import AppConfig

class MainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'

    def ready(self):
        import main.models # Or 'import main.signals' if you put the signal handler there
        print("MainConfig.ready() called - Attempting to import signals...")
        try:
            import main.signals
            print("MainConfig.ready(): main.signals imported successfully.")
        except ImportError as e:
            print(f"MainConfig.ready() ERROR: Could not import main.signals - {e}")

# class GameBoardConfig(AppConfig):
#     default_auto_field = 'django.db.models.BigAutoField'
#     name = 'game_board'
