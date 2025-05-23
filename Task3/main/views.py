# main/views.py
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm
from django.contrib.auth import login, logout, update_session_auth_hash
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from django.db import transaction 
from django.conf import settings
from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticated
from .serializers import UserImageSerializer, ImageClickSerializer
from .forms import UserImageForm, CommonImageUploadForm 
from .models import ImageClick, UserImage, CommonImage # Make sure UserImage is imported
from .permissions import IsOwner
import json
import io

from PIL import Image as PILImage, ImageDraw, ImageFont # Dodaj ImageFont, jeśli chcesz numery

from .forms import DefineGridForm

@login_required
def define_grid(request):
    if request.method == 'POST':
        form = DefineGridForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            cols = form.cleaned_data['columns']
            rows = form.cleaned_data['rows']

            cell_size = 50  # pixels per cell
            line_thickness = 1
            img_width = cols * cell_size + line_thickness
            img_height = rows * cell_size + line_thickness
            background_color = (255, 255, 255) # White
            line_color = (0, 0, 0) # Black

            pil_img = PILImage.new('RGB', (img_width, img_height), background_color)
            draw = ImageDraw.Draw(pil_img)

            for i in range(cols + 1):
                x = i * cell_size
                draw.line([(x, 0), (x, img_height)], fill=line_color, width=line_thickness)
            
            for i in range(rows + 1):
                y = i * cell_size
                draw.line([(0, y), (img_width, y)], fill=line_color, width=line_thickness)

            img_io = io.BytesIO()
            pil_img.save(img_io, format='PNG')
            img_io.seek(0) # Reset buffer pointer

            image_file = ContentFile(img_io.read(), name=f"{name.replace(' ', '_')}_grid.png")
            
            if UserImage.objects.filter(user=request.user, name=name).exists():
                form.add_error('name', 'You already have an image with this name. Please choose a different name.')
            else:
                user_image_instance = UserImage(user=request.user, name=name)
                user_image_instance.image.save(image_file.name, image_file, save=True)
                
                return redirect(f"{settings.LOGIN_REDIRECT_URL}?selected={user_image_instance.name}")
    else:
        form = DefineGridForm()
    
    return render(request, 'main/define_grid.html', {'form': form})

class UserImageViewSet(viewsets.ModelViewSet):
    queryset = UserImage.objects.all()  # Add this back
    serializer_class = UserImageSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return UserImage.objects.filter(user=user)
        return UserImage.objects.none() 
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ImageClickViewSet(viewsets.ModelViewSet):
    queryset = ImageClick.objects.all()  # Add this back
    serializer_class = ImageClickSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return ImageClick.objects.filter(user=user)
        return ImageClick.objects.none() # Or handle unauthenticated access

    def perform_create(self, serializer):
        image_instance = serializer.validated_data.get('image')
        if image_instance.user != self.request.user:
            raise serializers.ValidationError("You can only add clicks to your own images.")
        serializer.save(user=self.request.user, image=image_instance)

    def perform_update(self, serializer):
        if 'image' in serializer.validated_data:
            image_instance = serializer.validated_data.get('image')
            if image_instance.user != self.request.user:
                raise serializers.ValidationError("You can only associate clicks with your own images.")
        serializer.save()


@csrf_exempt
@login_required
def add_click(request):
    if request.method == "POST":
        data = json.loads(request.body)
        image_id = data['image_id']
        x = float(data['x'])
        y = float(data['y'])

        image = get_object_or_404(UserImage, id=image_id, user=request.user)
        click = ImageClick.objects.create(image=image, user=request.user, x=x, y=y)

        return JsonResponse({
            'success': True,
            'click_id': click.id
        })
    return JsonResponse({'success': False})

@csrf_exempt
@login_required
def delete_click(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            click = ImageClick.objects.get(id=data['id'], user=request.user)
            click.delete()
            return JsonResponse({'status': 'deleted'})
        except ImageClick.DoesNotExist:
            return JsonResponse({'status': 'not found'}, status=404)

@csrf_exempt
@login_required
def update_click(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            click = ImageClick.objects.get(id=data['id'], user=request.user) # Check ownership
            
            click.x = data['x']
            click.y = data['y']
            click.save()
            return JsonResponse({'status': 'success'})
        except ImageClick.DoesNotExist:
            return JsonResponse({'status': 'not found or forbidden'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    return JsonResponse({'status': 'invalid request'}, status=400)

@login_required
def record_click(request):
    if request.method == "POST":
        image_id = request.POST.get('image_id')
        x = request.POST.get('x')
        y = request.POST.get('y')

        image = get_object_or_404(UserImage, id=image_id, user=request.user)
        click = ImageClick.objects.create(image=image, user=request.user, x=x, y=y) # Assign current user
        return JsonResponse({'status': 'ok'})

    return JsonResponse({'status': 'error'}, status=400)

@login_required
@transaction.atomic # Ensures that if any part fails, the whole operation is rolled back
def use_common_image(request, common_image_id):
    common_image = get_object_or_404(CommonImage, id=common_image_id)
    
    new_image_name_base = common_image.name
    new_image_name = new_image_name_base
    counter = 1
    while UserImage.objects.filter(user=request.user, name=new_image_name).exists():
        new_image_name = f"{new_image_name_base}_{counter}"
        counter += 1

    user_image = UserImage(
        user=request.user,
        name=new_image_name
    )

    try:
        with open(common_image.image.path, 'rb') as f:
            image_content = ContentFile(f.read(), name=common_image.image.name.split('/')[-1]) # Get original filename
            user_image.image.save(image_content.name, image_content, save=True) # Save the file to UserImage
        
        return redirect(f"{settings.LOGIN_REDIRECT_URL}?selected={user_image.name}")
    except IOError as e:
        print(f"Error copying common image file: {e}") # Log this properly
        return redirect('home') # Or wherever appropriate

@login_required
def home(request):
    user_images_list = UserImage.objects.filter(user=request.user) # Ensure this is the variable name
    common_images_list = CommonImage.objects.all()
    selected = request.GET.get('selected')
    selected_image = user_images_list.filter(name=selected).first() if selected else None
    return render(request, 'main/home.html', {
        'user_images': user_images_list,
        'common_images_list': common_images_list,   
        'selected_image': selected_image,
    })

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/')
    else:
        form = UserCreationForm()
    return render(request, 'main/register.html', {'form': form})

@login_required
def upload_image(request):
    if request.method == 'POST':
        form = UserImageForm(request.POST, request.FILES)
        if form.is_valid():
            user_image = form.save(commit=False)
            user_image.user = request.user
            user_image.save()
            return redirect('home')
    else:
        form = UserImageForm()
    return render(request, 'main/upload_image.html', {'form': form})

@login_required
def upload_common_image(request):
    if request.method == 'POST':
        form = CommonImageUploadForm(request.POST, request.FILES)
        if form.is_valid():
            common_image = form.save(commit=False)
            common_image.save()
            return redirect('home') # Or to a page showing common images
    else:
        form = CommonImageUploadForm()
    return render(request, 'main/upload_common_image.html', {'form': form})

@login_required
def user_panel(request):
    images = UserImage.objects.filter(user=request.user)
    if request.method == 'POST':
        image_id_to_update = request.POST.get('image_id_for_rename') # Assuming a distinct field name for clarity
        if image_id_to_update:
            image_instance = get_object_or_404(UserImage, id=image_id_to_update, user=request.user)
            form = UserImageForm(request.POST, request.FILES, instance=image_instance)
        else:
            form = UserImageForm(request.POST, request.FILES)
        
        if form.is_valid():
            image = form.save(commit=False)
            image.user = request.user
            image.save()
            return redirect('user_panel')
    else:
        form = UserImageForm() # Form for uploading a new image / or empty form for rename if not POST

    password_form = PasswordChangeForm(user=request.user)
    
    return render(request, 'main/user_panel.html', {
        'images': images,
        'upload_form': form, # Renamed for clarity in template if needed
        'password_form': password_form,
    })

@login_required
def change_password(request):
    if request.method == 'POST':
        password_form = PasswordChangeForm(user=request.user, data=request.POST)
        if password_form.is_valid():
            password_form.save()
            update_session_auth_hash(request, password_form.user)
            return redirect('user_panel')
    else:
        password_form = PasswordChangeForm(user=request.user)
    
    images = UserImage.objects.filter(user=request.user)
    upload_form = UserImageForm() # Or maintain state if it was a multi-purpose page
    return render(request, 'main/user_panel.html', {
        'images': images,
        'upload_form': upload_form,
        'password_form': password_form, # This will have errors
    })

@login_required
def delete_image(request, image_id):
    image = get_object_or_404(UserImage, id=image_id, user=request.user)
    image.image.delete()
    image.delete()
    return redirect('user_panel')