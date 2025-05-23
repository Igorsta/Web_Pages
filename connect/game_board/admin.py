# game_board/admin.py
from django.contrib import admin
from .models import GameBoard

@admin.register(GameBoard)
class GameBoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'rows', 'cols', 'dots_count')
    list_filter = ('user', 'rows', 'cols')
    search_fields = ('name', 'user__username')
    # readonly_fields = ('dots_config',) # Make JSONField readonly if complex

    def dots_count(self, obj):
        return len(obj.dots_config)
    dots_count.short_description = 'Number of Dots'