from django.db import models
from apps.core.models import BaseModel


class Client(BaseModel):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Site(BaseModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=255)
    address = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    site_manager_contact = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.name} ({self.client.name})"


class SiteAssignment(BaseModel):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey('staff.EmployeeProfile', on_delete=models.CASCADE, related_name='site_assignments')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # null = ongoing

    class Meta:
        unique_together = ('site', 'employee', 'start_date')

    def __str__(self):
        return f"{self.employee} @ {self.site} from {self.start_date}"