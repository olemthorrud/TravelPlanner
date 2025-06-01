# KJObackend/serializers.py
from rest_framework import serializers
from .models import Trip, Event, Participant, Expense, Task
from django.contrib.auth import get_user_model

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    participant_id = serializers.IntegerField(source='id', read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source='user', read_only=True)
    username = serializers.StringRelatedField(source='user.username')

    class Meta:
        model = Participant
        fields = ['participant_id', 'user_id', 'username']

class TaskSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='id', read_only=True)
    trip_id = serializers.PrimaryKeyRelatedField(source='trip', read_only=True)
    responsible = serializers.PrimaryKeyRelatedField(
        queryset=Participant.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    
    responsible_id   = serializers.IntegerField(source='responsible.id',
                                                read_only=True)
    
    responsible_name = serializers.CharField(source='responsible.user.username',
                                             read_only=True)
    class Meta:
        model = Task
        fields = ['task_id', 'trip_id', 'name', 'description', 'status', 'responsible', 'responsible_id', 'responsible_name']

class EventSerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(source='id', read_only=True)
    class Meta:
        model = Event
        fields = ['event_id', 'name', 'date', 'description']

class ExpenseSerializer(serializers.ModelSerializer):
    expense_id = serializers.IntegerField(source='id', read_only=True)
    trip_id = serializers.PrimaryKeyRelatedField(source='trip', read_only=True)
    class Meta:
        model = Expense
        fields = ['expense_id', 'trip_id', 'amount', 'description', 'paid_by', 'shared_between']

class TripSerializer(serializers.ModelSerializer):
    trip_id = serializers.IntegerField(source='id', read_only=True)  # Add this line
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    owner_username = serializers.StringRelatedField(source='owner.username', read_only=True)
    participants = ParticipantSerializer(source='trip_participants', many=True, read_only=True)
    events = EventSerializer(many=True, read_only=True)
    expenses = ExpenseSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = ['trip_id', 'name', 'start_date', 'end_date', 'owner', 'owner_username', 'participants', 'destination', 'description', 'events', 'expenses', 'tasks']


class ParticipantCreateSerializer(serializers.ModelSerializer):
    username_to_add = serializers.CharField(write_only=True)
    participant_id = serializers.IntegerField(source='id', read_only=True)
    user_id      = serializers.PrimaryKeyRelatedField(source='user', read_only=True)
    username     = serializers.StringRelatedField(source='user.username', read_only=True)

    class Meta:
        model  = Participant
        fields = [
            'participant_id',
            'username_to_add',
            'user_id',
            'username',    
        ]
    def validate_username_to_add(self, value):
        try:
            user = User.objects.get(username=value)
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
 
    def create(self, validated_data):
        user = validated_data.pop('username_to_add')
        trip = validated_data.pop('trip')
        return Participant.objects.create(user=user, trip=trip)