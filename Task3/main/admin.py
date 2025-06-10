# main/admin.py
from django.contrib import admin
from .models import UserImage, ImageClick, CommonImage, GameBoard # Ensure all are imported

# --- GameBoard Admin (looks good from your previous code) ---
@admin.register(GameBoard)
class GameBoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'rows', 'cols', 'get_dots_count', 'get_paths_count')
    list_filter = ('user', 'rows', 'cols')
    search_fields = ('name', 'user__username')
    readonly_fields = ('dots_config_pretty', 'paths_config_pretty') # If you have these methods

    fieldsets = (
        (None, {
            'fields': ('user', 'name', 'rows', 'cols')
        }),
        ('Configuration (Raw JSON - Edit with caution)', {
            'classes': ('collapse',),
            'fields': ('dots_config', 'paths_config'), # Ensure paths_config is here
        }),
        ('Configuration (Formatted View)', { # Assuming you have these helper methods
            'fields': ('dots_config_pretty', 'paths_config_pretty'),
        }),
    )

    def get_dots_count(self, obj):
        if isinstance(obj.dots_config, list):
            return len(obj.dots_config)
        return 0
    get_dots_count.short_description = 'Dots Count'

    def get_paths_count(self, obj):
        if isinstance(obj.paths_config, list): # Check the new paths_config field
            return len(obj.paths_config)
        return 0
    get_paths_count.short_description = 'Paths Count'

    def dots_config_pretty(self, obj):
        import json
        from django.utils.html import format_html
        formatted_json = json.dumps(obj.dots_config, indent=4)
        return format_html("<pre>{}</pre>", formatted_json)
    dots_config_pretty.short_description = 'Dots Config (Formatted)'

    def paths_config_pretty(self, obj):
        import json
        from django.utils.html import format_html
        formatted_json = json.dumps(obj.paths_config, indent=4)
        return format_html("<pre>{}</pre>", formatted_json)
    paths_config_pretty.short_description = 'Paths Config (Formatted)'


@admin.register(UserImage) # Use the decorator for cleaner registration
class UserImageAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'image_thumbnail') # Added thumbnail for better display
    list_filter = ('user',)
    search_fields = ('name', 'user__username')
    readonly_fields = ('image_preview',) # For a larger preview in the detail view

    def image_thumbnail(self, obj):
        from django.utils.html import format_html
        if obj.image:
            return format_html('<img src="{}" style="width: 45px; height:45px; object-fit:cover;" />', obj.image.url)
        return "No Image"
    image_thumbnail.short_description = 'Thumbnail'

    def image_preview(self, obj):
        from django.utils.html import format_html
        if obj.image:
            return format_html('<img src="{}" style="max-width: 200px; max-height:200px;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image Preview'


# --- ImageClick Admin (Optional: can be an inline in UserImageAdmin) ---
@admin.register(ImageClick)
class ImageClickAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'image_name', 'x', 'y')
    list_filter = ('user', 'image')
    search_fields = ('image__name', 'user__username')

    def image_name(self, obj):
        return obj.image.name
    image_name.short_description = 'On Image'
    image_name.admin_order_field = 'image__name'


# --- CommonImage Admin ---
@admin.register(CommonImage)
class CommonImageAdmin(admin.ModelAdmin):
    list_display = ('name', 'image_thumbnail', 'description')
    search_fields = ('name', 'description')
    readonly_fields = ('image_preview',)

    def image_thumbnail(self, obj):
        from django.utils.html import format_html
        if obj.image:
            return format_html('<img src="{}" style="width: 45px; height:45px; object-fit:cover;" />', obj.image.url)
        return "No Image"
    image_thumbnail.short_description = 'Thumbnail'

    def image_preview(self, obj):
        from django.utils.html import format_html
        if obj.image:
            return format_html('<img src="{}" style="max-width: 200px; max-height:200px;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image Preview'