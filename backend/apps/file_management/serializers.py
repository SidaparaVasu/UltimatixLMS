from rest_framework import serializers
from .models import FileRegistry


class FileRegistrySerializer(serializers.ModelSerializer):
    """
    Standard serializer for FileRegistry records.
    """
    file_url = serializers.SerializerMethodField()
    uploader_name = serializers.CharField(source="uploaded_by.user.get_full_name", read_only=True)

    class Meta:
        model = FileRegistry
        fields = [
            "id", "original_name", "file", "file_url", "file_type", 
            "size_bytes", "upload_status", "uploaded_by", "uploader_name",
            "created_at"
        ]
        read_only_fields = ["id", "file_type", "size_bytes", "upload_status", "created_at"]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None
