from typing import Type, TypeVar, Generic, List, Optional, Any
from django.db import models
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist

T = TypeVar("T", bound=models.Model)


class BaseRepository(Generic[T]):
    """
    Standardizes low-level ORM operations (Database queries).
    The ONLY place allowed to touch `model.objects` should be here or its subclasses.
    """

    model: Type[T] = None

    def __init__(self, model: Type[T] = None):
        if model:
            self.model = model
        if self.model is None:
            raise ValueError("The 'model' attribute must be defined in subclasses or passed to __init__.")

    def get_by_id(self, pk: Any) -> Optional[T]:
        """Fetch a single record by ID. Returns None if not found."""
        try:
            return self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return None

    def get_or_404(self, pk: Any) -> T:
        """Fetch a single record by ID or raise a 404 error."""
        return get_object_or_404(self.model, pk=pk)

    def all(self) -> models.QuerySet:
        """Fetch all records for the model."""
        return self.model.objects.all()

    def filter(self, **kwargs) -> models.QuerySet:
        """Filter records based on provided keyword arguments."""
        return self.model.objects.filter(**kwargs)

    def create(self, **data) -> T:
        """Create and return a new record."""
        return self.model.objects.create(**data)

    def update(self, pk: Any, **data) -> Optional[T]:
        """Update an existing record by ID. Returns updated instance or None."""
        instance = self.get_by_id(pk)
        if instance:
            for attr, value in data.items():
                setattr(instance, attr, value)
            # Use update_fields to avoid MySQL strict-mode issues with auto_now fields.
            # Always include 'updated_at' if the model has it so Django sets it correctly.
            fields_to_save = list(data.keys())
            if hasattr(instance, 'updated_at') and 'updated_at' not in fields_to_save:
                fields_to_save.append('updated_at')
            instance.save(update_fields=fields_to_save)
        return instance

    def delete(self, pk: Any, soft_delete: bool = True) -> bool:
        """
        Standardizes deletion logic.
        - If soft_delete is True and model has 'is_active', it sets 'is_active' to False.
        - Otherwise, it performs a hard delete from the DB.
        """
        instance = self.get_by_id(pk)
        if not instance:
            return False

        if soft_delete and hasattr(instance, "is_active"):
            instance.is_active = False
            instance.save(update_fields=["is_active"])
        else:
            instance.delete()
        return True

    def exists(self, **kwargs) -> bool:
        """Check if any record matches the filter criteria."""
        return self.model.objects.filter(**kwargs).exists()

    def count(self, **kwargs) -> int:
        """Count records matching the filter criteria."""
        return self.model.objects.filter(**kwargs).count()
