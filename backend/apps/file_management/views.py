from django.core.exceptions import ValidationError
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from common.response import success_response, error_response, created_response
from .models import FileRegistry
from .serializers import FileRegistrySerializer
from .services import FileService


class FileViewSet(viewsets.ModelViewSet):
    """
    API for managing uploaded files.
    """
    queryset = FileRegistry.objects.all()
    serializer_class = FileRegistrySerializer
    service_class = FileService()
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Admins see everything, Employees see only their own uploads.
        """
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        
        # Determine if the user has an employee record
        if hasattr(user, 'employee_record'):
            employee = user.employee_record.first()
            if employee:
                return self.queryset.filter(uploaded_by=employee)
        
        return self.queryset.none()

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """
        Uploads a file and returns the registry record.
        Expects 'file' in the request body.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return error_response(message="No file provided.", status_code=status.HTTP_400_BAD_REQUEST)

        # Retrieve employee record for the authenticated user
        employee = None
        if hasattr(request.user, 'employee_record'):
            employee = request.user.employee_record.first()

        try:
            registry = self.service_class.upload_file(
                file_obj=file_obj,
                uploaded_by_employee=employee
            )
            serializer = self.get_serializer(registry)
            return created_response(
                message="File uploaded successfully.",
                data=serializer.data
            )
        except ValidationError as e:
            return error_response(message=str(e.message) if hasattr(e, 'message') else str(e))
        except Exception as e:
            return error_response(message=f"Upload failed: {str(e)}")
