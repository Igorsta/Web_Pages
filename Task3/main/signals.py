# main/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import GameBoard, UserImage, ImageClick
from .event_queue import broadcast_event

@receiver(post_save, sender=GameBoard)
def game_board_saved_handler(sender, instance: GameBoard, created: bool, **kwargs):
    print(f"SIGNAL [game_board_saved_handler]: Fired for GameBoard ID {instance.id}. CREATED: {created}")
    if created:
        try:
            creator_username = instance.user.username
        except AttributeError:
            creator_username = "UnknownUser"
            print(f"SIGNAL [game_board_saved_handler]: Warning - User or username not found for GameBoard ID {instance.id}")

        print(f"SIGNAL [game_board_saved_handler]: New GameBoard - ID: {instance.id}, Name: {instance.name}")
        event_data = {
            "board_id": instance.id,
            "board_name": instance.name,
            "creator_username": creator_username
        }
        broadcast_event(event_type="newBoard", data=event_data)
    else:
        print(f"SIGNAL [game_board_saved_handler]: GameBoard ID {instance.id} updated, not new. No 'newBoard' SSE event.")

@receiver(post_save, sender=UserImage)
def user_image_saved_handler(sender, instance: UserImage, created: bool, **kwargs): # Zmieniona nazwa handlera dla jasności
    """
    Wysyła zdarzenie 'newPath' GDY UserImage jest tworzony LUB aktualizowany.
    Jeśli jest tworzony, to jest to nowy obrazek do rysowania ścieżek.
    Jeśli jest aktualizowany, zakładamy, że konfiguracja ścieżek mogła się zmienić.
    """
    print(f"SIGNAL [user_image_saved_handler]: Fired for UserImage ID {instance.id}. CREATED: {created}")
    
    try:
        user_username = instance.user.username
    except AttributeError:
        user_username = "UnknownUser"
        print(f"SIGNAL [user_image_saved_handler]: Warning - User for UserImage ID {instance.id} not found.")

    action_type = "created" if created else "updated"
    print(f"SIGNAL [user_image_saved_handler]: UserImage {action_type} - ID: {instance.id}, Name: {instance.name}. Sending 'newPath' event.")
    
    event_data = {
        "path_id": None,  # Dla ogólnego zdarzenia UserImage, nie mamy konkretnego ID ścieżki
        "board_id": instance.id, # ID UserImage traktujemy jako ID planszy
        "board_name": instance.name,
        "user_username": user_username, # Użytkownik, który jest właścicielem/modyfikował
        "action": action_type # Dodatkowa informacja dla frontendu, czy obraz został utworzony czy zaktualizowany
    }
    broadcast_event(event_type="newPath", data=event_data)


@receiver(post_save, sender=ImageClick)
def image_click_created_handler(sender, instance: ImageClick, created: bool, **kwargs):
    """
    Wysyła zdarzenie 'newPath' GDY tworzony jest NOWY ImageClick.
    """
    print(f"SIGNAL [image_click_created_handler]: Fired for ImageClick ID {instance.id}. CREATED: {created}")
    if created: # Tylko przy tworzeniu nowego punktu
        try:
            user_username = instance.user.username
        except AttributeError:
            user_username = "UnknownUser"
            print(f"SIGNAL [image_click_created_handler]: Warning - User for ImageClick ID {instance.id} not found.")
        
        try:
            image_id = instance.image.id
            image_name = instance.image.name
        except AttributeError:
            image_id = None
            image_name = "UnknownImage"
            print(f"SIGNAL [image_click_created_handler]: Warning - Image for ImageClick ID {instance.id} not found.")

        print(f"SIGNAL [image_click_created_handler]: New ImageClick created - ID: {instance.id} on Image ID {image_id}. Sending 'newPath' event.")
        event_data = {
            "path_id": instance.id,
            "board_id": image_id,
            "board_name": image_name,
            "user_username": user_username,
            "action": "point_added" # Specyficzna akcja dla dodania punktu
        }
        broadcast_event(event_type="newPath", data=event_data)