# game_board/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt # Be careful with this
import json
from .models import GameBoard
from django.core.exceptions import ValidationError

# game_board/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login # To log in the user after registration
# from django.contrib.auth.forms import UserCreationForm # Use this if not using CustomUserCreationForm
from .forms import CustomUserCreationForm # Use this if you created the custom form
from django.urls import reverse_lazy

def register_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST) # Or UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user) # Log the user in directly after successful registration
            return redirect('game_board:board_list') # Or whatever your main page is
    else:
        form = CustomUserCreationForm() # Or UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

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