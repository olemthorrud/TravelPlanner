from django.db import models
from django.utils import timezone
from datetime import date
from django.conf import settings

class Trip(models.Model):
    # Member variables
    name = models.CharField(max_length=100)
    destination = models.CharField(max_length=100, default="", blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    description = models.TextField(default="", blank=True)
    
    # Relationships
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_trips', 
        default=None
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='Participant',
        related_name='participating_trips', 
        default=None
    )

    # Helper functionality
    def __str__(self):  
        return self.name

class Participant(models.Model):
    # Member variables
    id = models.AutoField(primary_key=True, editable=False)
    
    # Relationships
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='participations'  
    )
    
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='trip_participants'  
    )
    
    # Helper functionality
    class Meta:
        unique_together = ['user', 'trip']

    def __str__(self):
        return f"{self.user.username} - {self.trip.name}"

class Event(models.Model):
    # Member variables
    name = models.CharField(max_length=100)
    date = models.DateField(default=None, null=True, blank=True) #allow null to distinguish between suggestion and planned event
    description = models.TextField(default="", blank=True)

    # Relationships
    trip = models.ForeignKey(Trip, related_name='events', on_delete=models.CASCADE, default=0) 
    
    # Helper functionality
    def __str__(self):
        return self.name

class Expense(models.Model):
    # Member variables
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(default="", blank=True)
    
    # Relationships
    trip = models.ForeignKey(Trip, related_name='expenses', on_delete=models.CASCADE, default=0) 
    paid_by = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='paid_expenses'
    )

    shared_between = models.ManyToManyField(
        Participant,
        related_name='shared_expenses'
    )

    # Helper functionality
    def __str__(self):
        return self.description

class Task(models.Model):
    # Member variables
    class Status(models.IntegerChoices):
        REQUESTED = 0, 'Requested'
        IN_PROGRESS = 1, 'In Progress'
        DONE = 2, 'Done'

    status = models.IntegerField(
        choices=Status.choices,
        default=Status.REQUESTED,
    )
    name = models.CharField(max_length=100)
    description = models.TextField(default="", blank=True)
    
    # Relationships
    trip = models.ForeignKey(Trip, related_name='tasks', on_delete=models.CASCADE, default=0) 
    responsible = models.ForeignKey(Participant, related_name='tasks', on_delete=models.CASCADE)
    
    # Helper functionality
    def __str__(self):
        return self.name