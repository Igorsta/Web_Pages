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
from django.views.decorators.http import require_POST
from .models import GameBoard
from PIL import Image as PILImage, ImageDraw, ImageFont # Dodaj ImageFont, jeśli chcesz numery
from django.core.exceptions import ValidationError
from .forms import DefineGridForm
from django.core.files.base import ContentFile
import base64
import re

@login_required
@require_POST # Ensure this view only accepts POST requests
def save_grid_as_image_view(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON.'}, status=400)

    image_data_url = data.get('image_data_url')
    image_name = data.get('name', 'Generated Grid Image')
    filename = data.get('filename', 'grid_image.png')

    if not image_data_url:
        return JsonResponse({'status': 'error', 'message': 'Missing image data URL.'}, status=400)

    try:
        # Decode the base64 data URL
        # format: data:[<mime_type>][;base64],<data>
        header, encoded_data = image_data_url.split(',', 1)
        # mime_type = header.split(';')[0].split(':')[1] # e.g. image/png

        # Basic validation for filename (you might want more robust sanitization)
        safe_filename = re.sub(r'[^\w\.\-]', '_', filename)

        image_data_binary = base64.b64decode(encoded_data)
        image_content_file = ContentFile(image_data_binary, name=safe_filename)

        # Create a UserImage instance (or your equivalent model for path editing backgrounds)
        # Ensure unique name if your UserImage.name must be unique
        unique_image_name = image_name
        counter = 1
        while UserImage.objects.filter(user=request.user, name=unique_image_name).exists():
            unique_image_name = f"{image_name}_{counter}"
            counter += 1
        
        user_image = UserImage(user=request.user, name=unique_image_name)
        user_image.image.save(safe_filename, image_content_file, save=True) # save=True will commit to DB

        return JsonResponse({
            'status': 'success',
            'message': 'Grid image saved successfully.',
            'image_id': user_image.id,
            'image_name': user_image.name,
            'image_url': user_image.image.url
        })

    except (TypeError, ValueError) as e: # Catch base64 decoding errors
        return JsonResponse({'status': 'error', 'message': f'Invalid image data format: {str(e)}'}, status=400)
    except Exception as e:
        # Log the exception e
        return JsonResponse({'status': 'error', 'message': f'An unexpected error occurred: {str(e)}'}, status=500)

@login_required
def board_list_view(request):
    boards = GameBoard.objects.filter(user=request.user).order_by('-id')
    return render(request, 'game_board/board_list.html', {'boards': boards})

@login_required
def board_editor_view(request, board_id=None):
    board_instance = None
    initial_board_data_json = "null" # Default for new board

    if board_id:
        board_instance = get_object_or_404(GameBoard, pk=board_id, user=request.user)
        initial_board_data = {
            "id": board_instance.id,
            "name": board_instance.name,
            "rows": board_instance.rows,
            "cols": board_instance.cols,
            "dots_config": board_instance.dots_config
        }
        initial_board_data_json = json.dumps(initial_board_data)


    # This view primarily serves the HTML structure.
    # The actual board creation/editing logic happens via API calls from TypeScript.
    # However, you might pre-populate some form fields if editing.
    context = {
        'board_instance': board_instance,
        'initial_board_data_json': initial_board_data_json,
    }
    return render(request, 'game_board/board_editor.html', context)


@login_required
@require_POST # Ensures this view only accepts POST requests
def save_board_api_view(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

    board_id = data.get('id')
    name = data.get('name', 'Untitled Board')
    rows = data.get('rows')
    cols = data.get('cols')
    dots_config = data.get('dots_config', [])

    if not all([name, isinstance(rows, int), isinstance(cols, int), isinstance(dots_config, list)]):
        return JsonResponse({'status': 'error', 'message': 'Missing or invalid data fields.'}, status=400)

    try:
        if board_id:
            # Update existing board
            board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
            board.name = name
            board.rows = rows
            board.cols = cols
            board.dots_config = dots_config
            board.save() # This will call full_clean()
            return JsonResponse({'status': 'success', 'message': 'Board updated successfully.', 'board_id': board.id})
        else:
            # Create new board
            board = GameBoard(user=request.user, name=name, rows=rows, cols=cols, dots_config=dots_config)
            board.save() # This will call full_clean()
            return JsonResponse({'status': 'success', 'message': 'Board created successfully.', 'board_id': board.id}, status=201)
    except ValidationError as e:
        return JsonResponse({'status': 'error', 'message': 'Validation Error', 'errors': e.message_dict}, status=400)
    except Exception as e:
        # Log the exception e
        return JsonResponse({'status': 'error', 'message': f'An unexpected error occurred: {str(e)}'}, status=500)


@login_required
def get_board_data_api_view(request, board_id):
    board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
    data = {
        "id": board.id,
        "name": board.name,
        "rows": board.rows,
        "cols": board.cols,
        "dots_config": board.dots_config
    }
    return JsonResponse(data)


@login_required
@require_POST # Use POST for destructive actions
def board_delete_view(request, board_id):
    board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
    board.delete()
    # If called via AJAX, return JSON. If via form, redirect.
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'status': 'success', 'message': 'Board deleted successfully.'})
    return redirect('game_board:board_list')

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