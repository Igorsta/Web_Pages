from django.db import models
from django.contrib.auth.models import User
import uuid
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token

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
