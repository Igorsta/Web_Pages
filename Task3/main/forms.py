from django import forms
from .models import UserImage, CommonImage

class UserImageForm(forms.ModelForm):
    class Meta:
        model = UserImage
        fields = ['name', 'image']

class CommonImageUploadForm(forms.ModelForm): # New form
    class Meta:
        model = CommonImage
        fields = ['name', 'image', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }
        help_texts = {
            'name': 'A unique name for this shared image.',
            'image': 'Select the image file.',
            'description': 'Optional: Briefly describe the image.'
        }

class DefineGridForm(forms.Form): # New form for grid definition
    name = forms.CharField(max_length=100, label="Grid Name", help_text="Name for this grid image.")
    columns = forms.IntegerField(min_value=1, max_value=50, initial=5, label="Columns (Vertical Lines)")
    rows = forms.IntegerField(min_value=1, max_value=50, initial=5, label="Rows (Horizontal Lines)")