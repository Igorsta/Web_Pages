# main/apps.py
from django.apps import AppConfig

class MainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'

    def ready(self):
        print("MainConfig.ready() IS BEING CALLED - Attempting to import signals...")
        try:
            import main.signals
            print("MainConfig.ready(): main.signals IMPORTED SUCCESSFULLY.")
        except ImportError as e:
            print(f"MainConfig.ready() ERROR: COULD NOT IMPORT main.signals - {e}")
        except Exception as e_gen:
            print(f"MainConfig.ready() UNEXPECTED ERROR during signal import: {e_gen}")