import os
import uuid
from io import BytesIO
from PIL import Image as PILImage
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import UserImage, ImageClick

def create_test_image_file(name="test_image.png", ext="png", size=(50, 50), color="red"):
    file_obj = BytesIO()
    image = PILImage.new("RGB", size=size, color=color)
    image.save(file_obj, format=ext.upper())
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type=f"image/{ext}")

class BaseSetupTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user1_data = {'username': 'user1', 'password': 'password123'}
        cls.user1 = User.objects.create_user(**cls.user1_data)
        cls.user2_data = {'username': 'user2', 'password': 'password456'}
        cls.user2 = User.objects.create_user(**cls.user2_data)
        cls.image_u1 = UserImage.objects.create(
            user=cls.user1,
            name="image_user1",
            image=create_test_image_file("img_u1.png")
        )
        cls.image_u2 = UserImage.objects.create(
            user=cls.user2,
            name="image_user2",
            image=create_test_image_file("img_u2.png")
        )
        cls.click_u1_img_u1 = ImageClick.objects.create(
            image=cls.image_u1,
            user=cls.user1,
            x=10.0,
            y=20.0
        )

    def setUp(self):
        self.client = APIClient()

    @classmethod
    def tearDownClass(cls):
        for img_obj in UserImage.objects.all():
            if img_obj.image and hasattr(img_obj.image, 'path'):
                if os.path.exists(img_obj.image.path):
                    try:
                        os.remove(img_obj.image.path)
                        img_dir = os.path.dirname(img_obj.image.path)
                        if not os.listdir(img_dir):
                            os.rmdir(img_dir)
                            month_dir = os.path.dirname(img_dir)
                            if not os.listdir(month_dir):
                                os.rmdir(month_dir)
                                year_dir = os.path.dirname(month_dir)
                                if not os.listdir(year_dir):
                                    os.rmdir(year_dir)
                    except OSError:
                        pass
        super().tearDownClass()

class ModelTests(BaseSetupTestCase):

    def test_userimage_creation(self):
        self.assertEqual(self.image_u1.user, self.user1)
        self.assertEqual(self.image_u1.name, "image_user1")
        self.assertTrue(self.image_u1.image.name.startswith('uploads/'))
        self.assertEqual(str(self.image_u1), "image_user1")

    def test_imageclick_creation(self):
        self.assertEqual(self.click_u1_img_u1.image, self.image_u1)
        self.assertEqual(self.click_u1_img_u1.user, self.user1)
        self.assertEqual(self.click_u1_img_u1.x, 10.0)
        self.assertEqual(str(self.click_u1_img_u1), f"Click on {self.image_u1.name} by {self.user1.username} at (10.0, 20.0)")

    def test_user_image_relation(self):
        self.assertIn(self.image_u1, self.user1.images.all())

    def test_image_click_relation(self):
        self.assertIn(self.click_u1_img_u1, self.image_u1.clicks.all())

class WebAuthTests(BaseSetupTestCase):

    def test_home_page_requires_login(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn(reverse('login'), response.url)

    def test_user_login_and_logout(self):
        login_response = self.client.post(reverse('login'), self.user1_data)
        self.assertEqual(login_response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(login_response.url, '/')
            
        home_response = self.client.get(reverse('home'))
        self.assertEqual(home_response.status_code, status.HTTP_200_OK)
        self.assertContains(home_response, self.user1.username)
        logout_response = self.client.get(reverse('logout'))
        self.assertEqual(logout_response.status_code, status.HTTP_302_FOUND)
        self.assertIn(reverse(settings.LOGOUT_REDIRECT_URL.strip('/')), logout_response.url)
        home_response_after_logout = self.client.get(reverse('home'))
        self.assertEqual(home_response_after_logout.status_code, status.HTTP_302_FOUND)

    def test_user_sees_only_own_images_on_home(self):
        self.client.login(username=self.user1_data['username'], password=self.user1_data['password'])
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, self.image_u1.name)
        self.assertNotContains(response, self.image_u2.name)

    def test_user_cannot_delete_others_image_via_web(self):
        self.client.login(username=self.user1_data['username'], password=self.user1_data['password'])
        delete_url = reverse('delete_image', args=[self.image_u2.id])
        response = self.client.post(delete_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserImage.objects.filter(id=self.image_u2.id).exists())

class WebCRUDTests(BaseSetupTestCase):

    def setUp(self):
        super().setUp()
        self.client.login(username=self.user1_data['username'], password=self.user1_data['password'])

    def test_upload_new_image(self):
        initial_image_count = UserImage.objects.filter(user=self.user1).count()
        base_file_name = "web_upload"
        image_file = create_test_image_file(f"{base_file_name}.jpg", ext="jpeg")
        data = {
            'name': 'My Web Uploaded Image',
            'image': image_file
        }
        response = self.client.post(reverse('upload_image'), data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response.url, reverse('home'))
        self.assertEqual(UserImage.objects.filter(user=self.user1).count(), initial_image_count + 1)
        new_image = UserImage.objects.get(user=self.user1, name='My Web Uploaded Image')
        self.assertIn(base_file_name, new_image.image.name)
        self.assertTrue(new_image.image.name.lower().endswith(".jpg"))
    

    def test_add_click_via_ajax(self):
        initial_click_count = ImageClick.objects.filter(image=self.image_u1, user=self.user1).count()
        click_data = {
            'image_id': self.image_u1.id,
            'x': 30.5,
            'y': 40.5
        }
        response = self.client.post(reverse('add_click'), click_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertTrue(response_data['success'])
        self.assertIn('click_id', response_data)
        self.assertEqual(ImageClick.objects.filter(image=self.image_u1, user=self.user1).count(), initial_click_count + 1)
        new_click = ImageClick.objects.get(id=response_data['click_id'])
        self.assertEqual(new_click.x, 30.5)

    def test_delete_click_via_ajax(self):
        self.assertTrue(ImageClick.objects.filter(id=self.click_u1_img_u1.id).exists())
        click_id_to_delete = self.click_u1_img_u1.id
        
        delete_data = {'id': click_id_to_delete}
        response = self.client.post(reverse('delete_click'), delete_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'deleted')
        self.assertFalse(ImageClick.objects.filter(id=click_id_to_delete).exists())

    def test_user_cannot_delete_others_click_via_ajax(self):
        click_u2 = ImageClick.objects.create(image=self.image_u2, user=self.user2, x=5, y=5)
        self.client.login(username=self.user1_data['username'], password=self.user1_data['password'])
        delete_data = {'id': click_u2.id}
        response = self.client.post(reverse('delete_click'), delete_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ImageClick.objects.filter(id=click_u2.id).exists())

class APITests(BaseSetupTestCase):

    def setUp(self):
        super().setUp()
        self.user1_token = Token.objects.get(user=self.user1)
        self.user2_token = Token.objects.get(user=self.user2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.user1_token.key}')

    def test_api_list_images_requires_authentication(self):
        self.client.credentials()
        response = self.client.get(reverse('userimage-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_list_images_returns_only_own_images(self):
        response = self.client.get(reverse('userimage-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), UserImage.objects.filter(user=self.user1).count())
        self.assertEqual(response.data[0]['name'], self.image_u1.name)
        for item in response.data:
            self.assertNotEqual(item['name'], self.image_u2.name)

    def test_api_create_image(self):
        initial_count = UserImage.objects.filter(user=self.user1).count()
        image_file = create_test_image_file("api_upload.gif", ext="gif")
        unique_name = f"API Test Image {self.user1.username} {uuid.uuid4().hex}"
        data = {'name': unique_name, 'image': image_file}
        
        response = self.client.post(reverse('userimage-list'), data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserImage.objects.filter(user=self.user1).count(), initial_count + 1)
        self.assertEqual(response.data['name'], unique_name)
        self.assertEqual(response.data['user'], self.user1.id)

    def test_api_retrieve_own_image_detail(self):
        response = self.client.get(reverse('userimage-detail', args=[self.image_u1.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.image_u1.name)

    def test_api_cannot_retrieve_others_image_detail(self):
        response = self.client.get(reverse('userimage-detail', args=[self.image_u2.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_delete_own_image(self):
        image_to_delete = UserImage.objects.create(user=self.user1, name="to_delete_api", image=create_test_image_file())
        response = self.client.delete(reverse('userimage-detail', args=[image_to_delete.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserImage.objects.filter(id=image_to_delete.id).exists())

    def test_api_cannot_delete_others_image(self):
        response = self.client.delete(reverse('userimage-detail', args=[self.image_u2.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserImage.objects.filter(id=self.image_u2.id).exists())

    def test_api_create_image_invalid_data(self):
        data = {'name': ''}
        response = self.client.post(reverse('userimage-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', response.data)
        self.assertIn('name', response.data)

    def test_api_list_clicks_returns_only_own_clicks(self):
        ImageClick.objects.create(image=self.image_u2, user=self.user2, x=1, y=1)
        response = self.client.get(reverse('imageclick-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), ImageClick.objects.filter(user=self.user1).count())
        self.assertEqual(response.data[0]['id'], self.click_u1_img_u1.id)

    def test_api_create_click_on_own_image(self):
        initial_count = ImageClick.objects.filter(user=self.user1).count()
        data = {
            'image': self.image_u1.id,
            'x': 55.0,
            'y': 65.0
        }
        response = self.client.post(reverse('imageclick-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ImageClick.objects.filter(user=self.user1).count(), initial_count + 1)
        self.assertEqual(response.data['x'], 55.0)
        self.assertEqual(response.data['user'], self.user1.id)

    def test_api_delete_own_click(self):
        click_to_delete = ImageClick.objects.create(image=self.image_u1, user=self.user1, x=1, y=1)
        response = self.client.delete(reverse('imageclick-detail', args=[click_to_delete.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ImageClick.objects.filter(id=click_to_delete.id).exists())

    def test_api_cannot_delete_others_click(self):
        click_u2 = ImageClick.objects.create(image=self.image_u2, user=self.user2, x=1, y=1)
        response = self.client.delete(reverse('imageclick-detail', args=[click_u2.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ImageClick.objects.filter(id=click_u2.id).exists())