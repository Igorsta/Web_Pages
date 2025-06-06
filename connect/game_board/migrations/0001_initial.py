# Generated by Django 4.2.20 on 2025-05-23 13:44

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='GameBoard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default='Untitled Board', max_length=100)),
                ('rows', models.PositiveIntegerField()),
                ('cols', models.PositiveIntegerField()),
                ('dots_config', models.JSONField(blank=True, default=list)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='game_boards', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
