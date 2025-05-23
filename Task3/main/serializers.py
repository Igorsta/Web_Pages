from rest_framework import serializers
from .models import UserImage, ImageClick

class ImageClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageClick
        fields = ['id', 'user', 'x', 'y', 'image']

class UserImageSerializer(serializers.ModelSerializer):
    clicks = ImageClickSerializer(many=True, read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    def get_queryset(self):
        # 🔐 Zwracaj tylko obrazy danego użytkownika
        return UserImage.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # 🔐 Ustaw właściciela obrazu automatycznie
        serializer.save(user=self.request.user)
    class Meta:
        model = UserImage
        fields = ['id', 'user', 'name', 'image', 'clicks']
