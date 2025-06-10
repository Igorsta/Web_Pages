# main/views.py
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm # For register view
from django.contrib.auth import login, logout, update_session_auth_hash # For register view
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt # For older AJAX views if used
from django.core.files.base import ContentFile
from django.db import transaction
from django.conf import settings
from django.core.exceptions import ValidationError
# from django.contrib.contenttypes.models import ContentType # Not needed if Reaction model is removed
from django.views.decorators.http import require_POST
from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticated

from .models import ImageClick, UserImage, CommonImage, GameBoard # Reaction removed
from .serializers import UserImageSerializer, ImageClickSerializer
from .forms import UserImageForm, CommonImageUploadForm, DefineGridForm
from .permissions import IsOwner
from .event_queue import add_client_queue, remove_client_queue, broadcast_event

import json
import base64
import re
import time
import queue

# --- SSE View ---
def sse_notifications_view(request): # Can be @login_required if needed
    client_id, client_q = add_client_queue()
    print(f"SSE VIEW: Client connected (ID: {client_id}) from {request.META.get('REMOTE_ADDR')}")

    def event_stream_generator(client_id_for_generator, queue_for_generator):
        print(f"SSE VIEW [Generator]: Started for client ID: {client_id_for_generator}")
        try:
            yield f":sse-connection-established client_id={client_id_for_generator}\n\n"
            last_keep_alive = time.time()
            while True:
                current_time = time.time()
                if current_time - last_keep_alive > 15:
                    yield ":keep-alive\n\n"
                    last_keep_alive = current_time
                try:
                    message = queue_for_generator.get(timeout=1)
                    yield message
                    queue_for_generator.task_done()
                except queue.Empty:
                    continue
                except Exception as e_inner_q:
                    print(f"SSE VIEW [Generator] ERROR (queue get) for client ID {client_id_for_generator}: {e_inner_q}")
                    break
        except GeneratorExit:
            print(f"SSE VIEW [Generator]: Client ID {client_id_for_generator} disconnected (GeneratorExit).")
        except Exception as e_outer_gen:
            print(f"SSE VIEW [Generator] ERROR (outer) for client ID {client_id_for_generator}: {e_outer_gen}")
        finally:
            print(f"SSE VIEW [Generator]: Cleaning up for client ID: {client_id_for_generator}.")
            remove_client_queue(client_id_for_generator)

    response = StreamingHttpResponse(event_stream_generator(client_id, client_q), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    response['X-Accel-Buffering'] = 'no'
    return response

# --- GameBoard Views ---
@login_required
def board_list_view(request):
    boards_query = GameBoard.objects.filter(user=request.user).order_by('-id')
    boards_for_template = []
    for board in boards_query:
        boards_for_template.append({
            'id': board.id,
            'name': board.name,
            'rows': board.rows,
            'cols': board.cols,
            'dots_config': board.dots_config,
            'dots_config_json': json.dumps(board.dots_config) # For canvas preview
        })
    return render(request, 'game_board/board_list.html', {'boards': boards_for_template})

@login_required
def board_editor_view(request, board_id=None):
    board_instance = None
    initial_board_data_json = "null"
    if board_id:
        board_instance = get_object_or_404(GameBoard, pk=board_id, user=request.user)
        initial_board_data = {
            "id": board_instance.id,
            "name": board_instance.name,
            "rows": board_instance.rows,
            "cols": board_instance.cols,
            "dots_config": board_instance.dots_config,
            "paths_config": board_instance.paths_config
        }
        initial_board_data_json = json.dumps(initial_board_data)
    context = {
        'board_instance': board_instance,
        'initial_board_data_json': initial_board_data_json,
    }
    return render(request, 'game_board/board_editor.html', context)

@login_required
@require_POST
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
    paths_config = data.get('paths_config', [])

    if not all([name, isinstance(rows, int), isinstance(cols, int),
                isinstance(dots_config, list), isinstance(paths_config, list)]):
        return JsonResponse({'status': 'error', 'message': 'Missing or invalid data fields.'}, status=400)
    try:
        if board_id:
            board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
            board.name = name; board.rows = rows; board.cols = cols
            board.dots_config = dots_config; board.paths_config = paths_config
            board.save()
            return JsonResponse({'status': 'success', 'message': 'Board updated.', 'board_id': board.id})
        else:
            board = GameBoard(user=request.user, name=name, rows=rows, cols=cols,
                              dots_config=dots_config, paths_config=paths_config)
            board.save()
            return JsonResponse({'status': 'success', 'message': 'Board created.', 'board_id': board.id}, status=201)
    except ValidationError as e:
        return JsonResponse({'status': 'error', 'message': 'Validation Error', 'errors': e.message_dict}, status=400)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f'Error: {str(e)}'}, status=500)

@login_required
def get_board_data_api_view(request, board_id):
    board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
    return JsonResponse({
        "id": board.id, "name": board.name, "rows": board.rows, "cols": board.cols,
        "dots_config": board.dots_config, "paths_config": board.paths_config
    })

@login_required
@require_POST
def board_delete_view(request, board_id):
    board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
    board.delete()
    # You might want to use Django messages framework here for non-AJAX
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'status': 'success', 'message': 'Board deleted successfully.'})
    return redirect('game_board:board_list') # Make sure this redirect is what you want

@login_required
@require_POST
def convert_board_to_image_view(request, board_id): # For the button on board_list.html
    board = get_object_or_404(GameBoard, pk=board_id, user=request.user)
    MAX_DIMENSION = 400; MIN_CELL_SIZE = 10; CELL_PADDING = 2; # Small padding
    BACKGROUND_COLOR = "#FFFFFF"; GRID_LINE_COLOR = "#DDDDDD"; DOT_RADIUS_RATIO = 0.35

    rows = board.rows; cols = board.cols; dots_config = board.dots_config
    cell_size_for_width = (MAX_DIMENSION - 2 * CELL_PADDING) / cols
    cell_size_for_height = (MAX_DIMENSION - 2 * CELL_PADDING) / rows
    cell_size = int(min(cell_size_for_width, cell_size_for_height))
    cell_size = max(cell_size, MIN_CELL_SIZE)
    image_width = cols * cell_size + 2 * CELL_PADDING
    image_height = rows * cell_size + 2 * CELL_PADDING

    pil_image = PILImage.new('RGB', (image_width, image_height), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(pil_image)
    for r_idx in range(rows + 1):
        y = CELL_PADDING + r_idx * cell_size
        draw.line([(CELL_PADDING, y), (image_width - CELL_PADDING, y)], fill=GRID_LINE_COLOR, width=1)
    for c_idx in range(cols + 1):
        x = CELL_PADDING + c_idx * cell_size
        draw.line([(x, CELL_PADDING), (x, image_height - CELL_PADDING)], fill=GRID_LINE_COLOR, width=1)
    dot_radius = int(cell_size * DOT_RADIUS_RATIO)
    if dots_config:
        for dot in dots_config:
            center_x = CELL_PADDING + dot['col'] * cell_size + cell_size // 2
            center_y = CELL_PADDING + dot['row'] * cell_size + cell_size // 2
            bbox = [center_x - dot_radius, center_y - dot_radius, center_x + dot_radius, center_y + dot_radius]
            draw.ellipse(bbox, fill=dot['color'])
    image_io = io.BytesIO()
    pil_image.save(image_io, format='PNG')
    image_io.seek(0)
    image_name_base = f"{board.name}_as_image"
    filename = f"{image_name_base.replace(' ', '_')[:50]}.png" # Limit filename length
    unique_image_name = image_name_base
    counter = 1
    while UserImage.objects.filter(user=request.user, name=unique_image_name).exists():
        unique_image_name = f"{image_name_base[:90]}_{counter}" # Limit name length
        counter += 1
        if len(unique_image_name) > 100: unique_image_name = f"board_{board.id}_img_{uuid.uuid4().hex[:8]}"; break
    user_image = UserImage(user=request.user, name=unique_image_name)
    try:
        user_image.image.save(filename, ContentFile(image_io.read()), save=True)
        # messages.success(request, f"Board '{board.name}' converted to image '{user_image.name}'.") # For Django messages
        return JsonResponse({'status': 'success', 'message': 'Board converted to image.', 'image_name': user_image.name})
    except Exception as e:
        # messages.error(request, "Error saving converted image.")
        return JsonResponse({'status': 'error', 'message': f'Error saving image: {str(e)}'}, status=500)


@login_required
@require_POST
def save_grid_as_image_view(request): # For the button on board_editor.html (receives image data)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError: return JsonResponse({'status': 'error', 'message': 'Invalid JSON.'}, status=400)
    image_data_url = data.get('image_data_url')
    image_name = data.get('name', 'Generated Grid Image')
    filename = data.get('filename', 'grid_image.png')
    if not image_data_url: return JsonResponse({'status': 'error', 'message': 'Missing image data URL.'}, status=400)
    try:
        if ',' not in image_data_url: return JsonResponse({'status': 'error', 'message': 'Invalid data URL format.'}, status=400)
        header, encoded_data = image_data_url.split(',', 1)
        safe_filename = re.sub(r'[^\w\.\-]', '_', filename);
        if not safe_filename: safe_filename = "grid.png"
        image_data_binary = base64.b64decode(encoded_data)
        image_content_file = ContentFile(image_data_binary, name=safe_filename)
        unique_image_name = image_name
        counter = 1
        while UserImage.objects.filter(user=request.user, name=unique_image_name).exists():
            base_name_part = image_name.rsplit('.', 1)[0] if '.' in image_name else image_name
            ext_part = "." + image_name.rsplit('.', 1)[-1] if '.' in image_name else ""
            unique_image_name = f"{base_name_part[:90]}_{counter}{ext_part}"
            counter += 1
            if len(unique_image_name) > 100: unique_image_name = f"grid_img_{uuid.uuid4().hex[:8]}"; break
        user_image = UserImage(user=request.user, name=unique_image_name)
        user_image.image.save(safe_filename, image_content_file, save=True)
        return JsonResponse({'status': 'success', 'message': 'Grid image saved.', 'image_id': user_image.id, 'image_name': user_image.name, 'image_url': user_image.image.url})
    except (TypeError, ValueError, base64.binascii.Error) as e:
        return JsonResponse({'status': 'error', 'message': f'Invalid image data: {str(e)}'}, status=400)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f'Server error: {str(e)}'}, status=500)

# === ISTNIEJĄCE WIDOKI (home, UserImage/ImageClick DRF ViewSets, add_click, etc.) ===
# UserImageViewSet, ImageClickViewSet, add_click, delete_click, update_click
# use_common_image, home, register, upload_image, upload_common_image,
# user_panel, change_password, delete_image

class UserImageViewSet(viewsets.ModelViewSet):
    serializer_class = UserImageSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    def get_queryset(self):
        return UserImage.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ImageClickViewSet(viewsets.ModelViewSet):
    serializer_class = ImageClickSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    def get_queryset(self):
        return ImageClick.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
        image_instance = serializer.validated_data.get('image')
        if image_instance.user != self.request.user:
            raise serializers.ValidationError("You can only add clicks to your own images.")
        serializer.save(user=self.request.user) # image is already set via validated_data

@login_required # Changed from csrf_exempt
@require_POST # More appropriate for creating data
def add_click(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        image_id = data.get('image_id')
        x = float(data.get('x'))
        y = float(data.get('y'))
    except (json.JSONDecodeError, TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)

    image = get_object_or_404(UserImage, id=image_id, user=request.user)
    click = ImageClick.objects.create(image=image, user=request.user, x=x, y=y)
    return JsonResponse({'success': True, 'click_id': click.id})

@login_required # Changed from csrf_exempt
@require_POST
def delete_click(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        click_id = data.get('id')
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
    
    click = get_object_or_404(ImageClick, id=click_id, user=request.user)
    click.delete()
    return JsonResponse({'status': 'deleted'})

@login_required # Changed from csrf_exempt
@require_POST
def update_click(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        click_id = data.get('id')
        x = float(data.get('x'))
        y = float(data.get('y'))
    except (json.JSONDecodeError, TypeError, ValueError):
        return JsonResponse({'status': 'error', 'message': 'Invalid data'}, status=400)

    click = get_object_or_404(ImageClick, id=click_id, user=request.user)
    click.x = x
    click.y = y
    click.save()
    return JsonResponse({'status': 'success'})

@login_required
@transaction.atomic
def use_common_image(request, common_image_id):
    common_image = get_object_or_404(CommonImage, id=common_image_id)
    base_name = common_image.name
    new_image_name = base_name
    counter = 1
    while UserImage.objects.filter(user=request.user, name=new_image_name).exists():
        new_image_name = f"{base_name}_{counter}"
        counter += 1
        if len(new_image_name) > 95 : # prevent too long names
            new_image_name = f"{base_name[:80]}_{uuid.uuid4().hex[:8]}"
            break
            
    user_image = UserImage(user=request.user, name=new_image_name)
    try:
        with open(common_image.image.path, 'rb') as f:
            original_filename = common_image.image.name.split('/')[-1]
            image_content = ContentFile(f.read(), name=original_filename)
            user_image.image.save(image_content.name, image_content, save=True)
        return redirect(f"{reverse('home')}?selected={user_image.name}")
    except IOError as e:
        print(f"Error copying common image file: {e}")
        # messages.error(request, "Could not use common image due to a file error.")
        return redirect('home')

@login_required
def home(request):
    user_images_list = UserImage.objects.filter(user=request.user).order_by('-id')
    common_images_list = CommonImage.objects.all().order_by('name')
    selected_image_name = request.GET.get('selected')
    selected_image_instance = None
    if selected_image_name:
        selected_image_instance = UserImage.objects.filter(user=request.user, name=selected_image_name).first()
    context = {
        'user_images': user_images_list,
        'common_images_list': common_images_list,
        'selected_image': selected_image_instance,
    }
    return render(request, 'main/home.html', context)

def register(request):
    if request.user.is_authenticated: return redirect('home')
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(); login(request, user)
            return redirect(settings.LOGIN_REDIRECT_URL)
    else: form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

@login_required
def upload_image(request):
    if request.method == 'POST':
        form = UserImageForm(request.POST, request.FILES) # Pass request.user if form needs it for validation
        if form.is_valid():
            user_image = form.save(commit=False)
            user_image.user = request.user
            user_image.save() # Name will be auto-generated here by model's save if not provided
            return redirect(f"{reverse('home')}?selected={user_image.name}")
    else:
        form = UserImageForm()
    return render(request, 'main/upload_image.html', {'form': form})

@login_required # Consider if this should be staff/superuser only
def upload_common_image(request):
    if request.method == 'POST':
        form = CommonImageUploadForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('home')
    else:
        form = CommonImageUploadForm()
    return render(request, 'main/upload_common_image.html', {'form': form})

@login_required
def user_panel(request):
    images = UserImage.objects.filter(user=request.user).order_by('-id')
    upload_form = UserImageForm() # For new uploads
    password_form = PasswordChangeForm(user=request.user)

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'rename_image':
            image_id_to_rename = request.POST.get('image_id_for_rename')
            image_instance = get_object_or_404(UserImage, id=image_id_to_rename, user=request.user)
            # Use a specific form for renaming if it's different from upload
            rename_form = UserImageForm(request.POST, request.FILES, instance=image_instance)
            if rename_form.is_valid():
                rename_form.save()
                # messages.success(request, "Image renamed successfully.")
                return redirect('user_panel')
            else: # Pass the form with errors back to the template
                # This part needs careful handling in the template to show errors for the specific form
                pass # For now, let it fall through to re-render with original forms
        elif action == 'upload_new_image':
            upload_form = UserImageForm(request.POST, request.FILES)
            if upload_form.is_valid():
                new_image = upload_form.save(commit=False)
                new_image.user = request.user
                new_image.save()
                # messages.success(request, "New image uploaded successfully.")
                return redirect('user_panel')
    
    context = {
        'images': images,
        'upload_form': upload_form,
        'password_form': password_form,
    }
    return render(request, 'main/user_panel.html', context)


@login_required
def change_password(request):
    if request.method == 'POST':
        password_form = PasswordChangeForm(user=request.user, data=request.POST)
        if password_form.is_valid():
            password_form.save()
            update_session_auth_hash(request, password_form.user)
            # messages.success(request, 'Your password was successfully updated!')
            return redirect('user_panel')
        # else: messages.error(request, 'Please correct the error below.')
    else:
        password_form = PasswordChangeForm(user=request.user)
    
    # Re-populate other context variables needed by user_panel.html if rendering it on error
    images = UserImage.objects.filter(user=request.user)
    upload_form = UserImageForm()
    return render(request, 'main/user_panel.html', {
        'images': images, 'upload_form': upload_form, 'password_form': password_form,
    })

@login_required
@require_POST # Deletion should be POST
def delete_image(request, image_id):
    image = get_object_or_404(UserImage, id=image_id, user=request.user)
    if image.image:
        image.image.delete(save=False) # Delete file from storage, don't save model yet
    image.delete() # Now delete model instance
    # messages.success(request, f"Image '{image.name}' and its points deleted.")
    return redirect('user_panel') # Or 'home' if user_panel doesn't list images after deletion

# DefineGridForm and define_grid view were from an older context,
# if you still use them, ensure they are correctly implemented.
# For example:
# @login_required
# def define_grid(request):
#     if request.method == 'POST':
#         form = DefineGridForm(request.POST)
#         if form.is_valid():
#             # Logic to create a UserImage from grid definition
#             # This would be similar to convert_board_to_image_view but starts from form data
#             pass # Implement this
#     else:
#         form = DefineGridForm()
#     return render(request, 'main/define_grid.html', {'form': form})