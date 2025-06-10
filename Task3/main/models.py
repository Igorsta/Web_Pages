# main/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token
from django.core.exceptions import ValidationError
# from django.contrib.contenttypes.fields import GenericForeignKey # Not needed without Reaction model
# from django.contrib.contenttypes.models import ContentType # Not needed without Reaction model

class UserImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    name = models.CharField(max_length=100, unique=True) # unique=True might be an issue if not handled well
    image = models.ImageField(upload_to='uploads/%Y/%m/%d/')

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if is_new and not self.name:
            base_name = self.image.name.split('/')[-1].rsplit('.', 1)[0] if self.image and self.image.name else "image"
            safe_base_name = "".join(c if c.isalnum() else "_" for c in base_name)[:50] # Limit length
            
            temp_name = f"{self.user.username}_{safe_base_name}"
            counter = 1
            final_name = temp_name[:90] # Ensure total length is within CharField limit
            while UserImage.objects.filter(user=self.user, name=final_name).exists():
                final_name = f"{temp_name[:85]}_{counter}" # Adjust to ensure space for counter
                counter += 1
                if len(final_name) > 100: # Prevent infinite loop / excessively long names
                    final_name = f"{self.user.username}_img_{uuid.uuid4().hex[:8]}"
                    break
            self.name = final_name
        elif not self.name: # Fallback for older instances or if name somehow gets cleared
             self.name = f"{self.user.id}_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ImageClick(models.Model):
    image = models.ForeignKey(UserImage, on_delete=models.CASCADE, related_name='clicks')
    user = models.ForeignKey(User, on_delete=models.CASCADE) # Make sure this is set in the view
    x = models.FloatField()
    y = models.FloatField()

    def __str__(self):
        return f"Click on {self.image.name} by {self.user.username} at ({self.x}, {self.y})"

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
    paths_config = models.JSONField(default=list, blank=True) # For storing drawn paths

    def __str__(self):
        return f"{self.name} ({self.rows}x{self.cols}) by {self.user.username}"

    def clean(self):
        super().clean()
        if not (1 < self.rows <= 50):
            raise ValidationError({'rows': 'Rows must be between 2 and 50.'})
        if not (1 < self.cols <= 50):
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
        if self.paths_config:
            if not isinstance(self.paths_config, list):
                raise ValidationError({'paths_config': 'Paths configuration must be a list.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)