# main/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import GameBoard, UserImage, ImageClick # Make sure ImageClick is imported
from .event_queue import broadcast_event

@receiver(post_save, sender=GameBoard)
def game_board_saved_handler(sender, instance: GameBoard, created: bool, **kwargs):
    print(f"SIGNAL [game_board_saved_handler]: Fired for GameBoard ID {instance.id}. CREATED: {created}")
    if created:
        try:
            creator_username = instance.user.username
        except AttributeError: # Should not happen if user is mandatory
            creator_username = "UnknownUser"
        event_data = {
            "board_id": instance.id,
            "board_name": instance.name,
            "creator_username": creator_username
        }
        broadcast_event(event_type="newBoard", data=event_data)

@receiver(post_save, sender=UserImage)
def user_image_saved_handler(sender, instance: UserImage, created: bool, **kwargs):
    print(f"SIGNAL [user_image_saved_handler]: Fired for UserImage ID {instance.id}. CREATED: {created}")
    try:
        user_username = instance.user.username
    except AttributeError:
        user_username = "UnknownUser"

    # Send 'newPath' for both creation and update of UserImage
    # 'action' field helps frontend distinguish
    action_type = "image_created" if created else "image_updated"
    
    event_data = {
        "path_id": None, # No specific path_id when a UserImage itself is saved
        "board_id": instance.id, # UserImage.id is treated as the board_id for this event
        "board_name": instance.name,
        "user_username": user_username,
        "action": action_type
    }
    broadcast_event(event_type="newPath", data=event_data)

@receiver(post_save, sender=ImageClick)
def image_click_created_handler(sender, instance: ImageClick, created: bool, **kwargs):
    print(f"SIGNAL [image_click_created_handler]: Fired for ImageClick ID {instance.id}. CREATED: {created}")
    if created: # Only for new clicks
        try:
            user_username = instance.user.username
        except AttributeError: user_username = "UnknownUser"
        try:
            image_id = instance.image.id
            image_name = instance.image.name
        except AttributeError:
            image_id = None
            image_name = "UnknownImage"
        
        event_data = {
            "path_id": instance.id, # The ID of the click itself
            "board_id": image_id,   # The ID of the UserImage it belongs to
            "board_name": image_name,
            "user_username": user_username,
            "action": "point_added"
        }
        broadcast_event(event_type="newPath", data=event_data)