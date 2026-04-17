from django.contrib import admin
from .models import FileRegistry


@admin.register(FileRegistry)
class FileRegistryAdmin(admin.ModelAdmin):
    list_display = ("original_name", "id", "file_type", "size_bytes", "upload_status", "created_at")
    list_filter = ("file_type", "upload_status", "created_at")
    search_fields = ("original_name", "id")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)
