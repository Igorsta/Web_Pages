# game_board/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import json

class GameBoard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_boards')
    name = models.CharField(max_length=100, default="Untitled Board")
    rows = models.PositiveIntegerField()
    cols = models.PositiveIntegerField()
    dots_config = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.name} ({self.rows}x{self.cols}) by {self.user.username}"

    def clean(self):
        super().clean()
        if not (1 < self.rows <= 50): # Example limits
            raise ValidationError({'rows': 'Rows must be between 2 and 50.'})
        if not (1 < self.cols <= 50): # Example limits
            raise ValidationError({'cols': 'Columns must be between 2 and 50.'})

        if self.dots_config:
            if not isinstance(self.dots_config, list):
                raise ValidationError({'dots_config': 'Dots configuration must be a list.'})

            dot_colors_count = {}
            occupied_cells = set()

            for dot in self.dots_config:
                if not all(k in dot for k in ['row', 'col', 'color']):
                    raise ValidationError({'dots_config': 'Each dot must have row, col, and color.'})
                if not (0 <= dot['row'] < self.rows and 0 <= dot['col'] < self.cols):
                    raise ValidationError({'dots_config': f"Dot at ({dot['row']},{dot['col']}) is out of bounds."})

                cell = (dot['row'], dot['col'])
                if cell in occupied_cells:
                    raise ValidationError({'dots_config': f"Cell ({dot['row']},{dot['col']}) is occupied by more than one dot."})
                occupied_cells.add(cell)

                dot_colors_count[dot['color']] = dot_colors_count.get(dot['color'], 0) + 1

            for color, count in dot_colors_count.items():
                if count != 2:
                    raise ValidationError({'dots_config': f"Color {color} must be used for exactly two dots. Found {count}."})

    def save(self, *args, **kwargs):
        self.full_clean() # Call clean() before saving
        super().save(*args, **kwargs)

# Example of an alternative using a separate Dot model (more relational, less flexible for bulk updates)
# class Dot(models.Model):
#     board = models.ForeignKey(GameBoard, on_delete=models.CASCADE, related_name='dots')
#     row = models.PositiveIntegerField()
#     col = models.PositiveIntegerField()
#     color = models.CharField(max_length=7) # e.g., #RRGGBB
#
#     class Meta:
#         unique_together = ('board', 'row', 'col') # No two dots on the same cell of the same board