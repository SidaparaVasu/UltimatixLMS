from rest_framework.exceptions import NotFound


class BaseRBACService:
    model = None

    def get_by_id(self, pk):
        try:
            return self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            raise NotFound(f"{self.model.__name__} with ID {pk} not found.")

    def get_all_active(self):
        return self.model.objects.filter(is_active=True)

    def get_all(self):
        return self.model.objects.all()

    def create(self, **data):
        return self.model.objects.create(**data)

    def update(self, pk, partial=False, **data):
        instance = self.get_by_id(pk)
        for attr, value in data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def delete(self, pk, soft_delete=True):
        instance = self.get_by_id(pk)
        if soft_delete and hasattr(instance, "is_active"):
            instance.is_active = False
            instance.save()
        else:
            instance.delete()
        return True
