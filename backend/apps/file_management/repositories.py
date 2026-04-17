from common.repositories.base import BaseRepository
from .models import FileRegistry


class FileRepository(BaseRepository[FileRegistry]):
    """
    Standardizes low-level ORM operations for FileRegistry.
    """
    model = FileRegistry

    def get_by_uuid(self, uuid_val):
        """Fetch a file by its UUID string or object."""
        return self.get_by_id(uuid_val)
