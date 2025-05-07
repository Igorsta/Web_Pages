from django.db import models
from django.contrib.auth.models import User
import uuid

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
