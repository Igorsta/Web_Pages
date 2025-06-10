# main/admin.py
from django.contrib import admin
from .models import UserImage, ImageClick, CommonImage, GameBoard
import json
from django.utils.html import format_html

@admin.register(GameBoard)
class GameBoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'rows', 'cols', 'get_dots_count', 'get_paths_count')
    list_filter = ('user', 'rows', 'cols')
    search_fields = ('name', 'user__username')
    readonly_fields = ('dots_config_pretty', 'paths_config_pretty')

    fieldsets = (
        (None, {'fields': ('user', 'name', 'rows', 'cols')}),
        ('Configuration (Raw JSON - Edit with caution)', {
            'classes': ('collapse',),
            'fields': ('dots_config', 'paths_config'),
        }),
        ('Configuration (Formatted View)', {
            'fields': ('dots_config_pretty', 'paths_config_pretty'),
        }),
    )

    def get_dots_count(self, obj):
        return len(obj.dots_config) if isinstance(obj.dots_config, list) else 0
    get_dots_count.short_description = 'Dots Count'

    def get_paths_count(self, obj):
        return len(obj.paths_config) if isinstance(obj.paths_config, list) else 0
    get_paths_count.short_description = 'Paths Count'

    def dots_config_pretty(self, obj):
        formatted_json = json.dumps(obj.dots_config, indent=4)
        return format_html("<pre>{}</pre>", formatted_json)
    dots_config_pretty.short_description = 'Dots Config (Formatted)'

    def paths_config_pretty(self, obj):
        formatted_json = json.dumps(obj.paths_config, indent=4)
        return format_html("<pre>{}</pre>", formatted_json)
    paths_config_pretty.short_description = 'Paths Config (Formatted)'

@admin.register(UserImage)
class UserImageAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'image_thumbnail')
    list_filter = ('user',)
    search_fields = ('name', 'user__username')
    readonly_fields = ('image_preview',)

    def image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 45px; height:45px; object-fit:cover;" />', obj.image.url)
        return "No Image"
    image_thumbnail.short_description = 'Thumbnail'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 200px; max-height:200px;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image Preview'

@admin.register(ImageClick)
class ImageClickAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'image_name_link', 'x', 'y')
    list_filter = ('user', 'image__name')
    search_fields = ('image__name', 'user__username')
    raw_id_fields = ('image', 'user') # Better for ForeignKey selection

    def image_name_link(self, obj):
        from django.urls import reverse
        link = reverse("admin:main_userimage_change", args=[obj.image.id])
        return format_html('<a href="{}">{}</a>', link, obj.image.name)
    image_name_link.short_description = 'On Image'
    image_name_link.admin_order_field = 'image__name'


@admin.register(CommonImage)
class CommonImageAdmin(admin.ModelAdmin):
    list_display = ('name', 'image_thumbnail', 'description')
    search_fields = ('name', 'description')
    readonly_fields = ('image_preview',)

    def image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 45px; height:45px; object-fit:cover;" />', obj.image.url)
        return "No Image"
    image_thumbnail.short_description = 'Thumbnail'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 200px; max-height:200px;" />', obj.image.url)
        return "No Image"
    image_preview.short_description = 'Image Preview'