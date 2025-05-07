from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm
from django.contrib.auth import login, logout, update_session_auth_hash
from django.shortcuts import render, redirect, get_object_or_404
from .forms import UserImageForm
from django.http import JsonResponse
from .models import ImageClick, UserImage
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt  # You can also use the csrf_token in the HTML instead of this decorator
def add_click(request):
    if request.method == "POST":
        data = json.loads(request.body)
        image_id = data['image_id']
        x = data['x']
        y = data['y']

        # Fetch the image from the database
        image = get_object_or_404(UserImage, id=image_id)

        # Create a new Click object and save it to the database
        click = ImageClick.objects.create(image=image, user=request.user, x=x, y=y)

        # Return the new click ID to the frontend
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
            click = ImageClick.objects.get(id=data['id'], image__user=request.user)
            click.delete()
            return JsonResponse({'status': 'deleted'})
        except ImageClick.DoesNotExist:
            return JsonResponse({'status': 'not found'}, status=404)

@csrf_exempt
@login_required
def update_click(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        click = ImageClick.objects.get(id=data['id'], image__user=request.user)
        click.x = data['x']
        click.y = data['y']
        click.save()
        return JsonResponse({'status': 'success'})

@login_required
def record_click(request):
    if request.method == "POST":
        image_id = request.POST.get('image_id')
        x = request.POST.get('x')
        y = request.POST.get('y')

        image = UserImage.objects.get(id=image_id, user=request.user)
        click = ImageClick.objects.create(image=image, x=x, y=y)
        return JsonResponse({'status': 'ok'})

    return JsonResponse({'status': 'error'}, status=400)


@login_required
def home(request):
    images = UserImage.objects.filter(user=request.user)
    selected = request.GET.get('selected')
    selected_image = images.filter(name=selected).first() if selected else None
    return render(request, 'main/home.html', {
        'images': images,
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
def delete_image(request, image_id):
    image = get_object_or_404(UserImage, id=image_id, user=request.user)
    image.image.delete()  # Delete the actual image file
    image.delete()        # Delete the database record
    return redirect('home')  #

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def user_panel(request):
    images = UserImage.objects.filter(user=request.user)
    if request.method == 'POST':
        # Handle image rename or update
        form = UserImageForm(request.POST, request.FILES)
        if form.is_valid():
            image = form.save(commit=False)
            image.user = request.user  # Ensure it's saved under the correct user
            image.save()
            return redirect('user_panel')
    else:
        form = UserImageForm()

    # Password change form
    password_form = PasswordChangeForm(user=request.user)
    
    return render(request, 'main/user_panel.html', {
        'images': images,
        'form': form,
        'password_form': password_form,
    })

@login_required
def change_password(request):
    if request.method == 'POST':
        password_form = PasswordChangeForm(user=request.user, data=request.POST)
        if password_form.is_valid():
            password_form.save()
            update_session_auth_hash(request, password_form.user)
            return redirect('user_panel')  # Redirect after password change
    else:
        password_form = PasswordChangeForm(user=request.user)
    
    return render(request, 'main/user_panel.html', {'password_form': password_form})

@login_required
def delete_image(request, image_id):
    image = get_object_or_404(UserImage, id=image_id, user=request.user)
    image.image.delete()  # Delete the actual image file
    image.delete()        # Delete the database record
    return redirect('user_panel')  # Redirect back to the user panel
