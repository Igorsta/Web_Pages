from django.db import models
from django.contrib.auth.models import User
import uuid
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token
from django.core.exceptions import ValidationError

class UserImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    name = models.CharField(max_length=100, unique=True)
    image = models.ImageField(upload_to='uploads/%Y/%m/%d/')

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"{self.user.id}_{uuid.uuid4().hex}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
class ImageClick(models.Model):
    image = models.ForeignKey(UserImage, on_delete=models.CASCADE, related_name='clicks')
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=1)
    x = models.FloatField()
    y = models.FloatField()

    def __str__(self):
        return f"Click on {self.image.name} by {self.user} at ({self.x}, {self.y})"

class CommonImage(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Descriptive name for the common image.")
    image = models.ImageField(upload_to='common_images/%Y/%m/%d/', help_text="The actual image file.")
    description = models.TextField(blank=True, null=True, help_text="Optional description.")
    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name = "Common Image"
    

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)

class GameBoard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_boards')
    name = models.CharField(max_length=100, default="Untitled Board")
    rows = models.PositiveIntegerField()
    cols = models.PositiveIntegerField()
    dots_config = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.name} ({self.rows}x{self.cols}) by {self.user.username}"

    def clean(self):
        super().clean()
        if not (1 < self.rows <= 50): # Example limits
            raise ValidationError({'rows': 'Rows must be between 2 and 50.'})
        if not (1 < self.cols <= 50): # Example limits
            raise ValidationError({'cols': 'Columns must be between 2 and 50.'})

        if self.dots_config:
            if not isinstance(self.dots_config, list):
                raise ValidationError({'dots_config': 'Dots configuration must be a list.'})

            dot_colors_count = {}
            occupied_cells = set()

            for dot in self.dots_config:
                if not all(k in dot for k in ['row', 'col', 'color']):
                    raise ValidationError({'dots_config': 'Each dot must have row, col, and color.'})
                if not (0 <= dot['row'] < self.rows and 0 <= dot['col'] < self.cols):
                    raise ValidationError({'dots_config': f"Dot at ({dot['row']},{dot['col']}) is out of bounds."})

                cell = (dot['row'], dot['col'])
                if cell in occupied_cells:
                    raise ValidationError({'dots_config': f"Cell ({dot['row']},{dot['col']}) is occupied by more than one dot."})
                occupied_cells.add(cell)

                dot_colors_count[dot['color']] = dot_colors_count.get(dot['color'], 0) + 1

            for color, count in dot_colors_count.items():
                if count != 2:
                    raise ValidationError({'dots_config': f"Color {color} must be used for exactly two dots. Found {count}."})

    def save(self, *args, **kwargs):
        self.full_clean() # Call clean() before saving
        super().save(*args, **kwargs)
