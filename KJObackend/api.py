
# Dependencies from other files
from .models import Trip, Event, Participant, Expense, Memory, Task
from .serializers import TripSerializer, EventSerializer, ParticipantSerializer, ParticipantCreateSerializer, MemorySerializer, ExpenseSerializer, TaskSerializer
from .external_apis import get_ticketmaster_events, get_country_code, get_coordinates, get_weather_forecast, interpret_weather_forecast

# Django imports
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, get_user_model

# REST imports
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

# Misc imports
from datetime import date

User = get_user_model()

class TripListCreateAPI(generics.ListCreateAPIView):
    serializer_class   = TripSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        relevant_trips = Trip.objects.filter(participants=self.request.user)

        time_flag = self.request.query_params.get("time")
        today = date.today()

        if time_flag == "future":
            relevant_trips = relevant_trips.filter(start_date__gte=today)
        elif time_flag == "past":
            relevant_trips = relevant_trips.filter(end_date__lt=today)

        return relevant_trips.order_by('start_date')

    def perform_create(self, serializer):
        trip = serializer.save(owner=self.request.user)
        Participant.objects.create(
            user=self.request.user,
            trip=trip,
        )

class TripDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]

    # to override default due to naming
    def get_object(self):
        return get_object_or_404(Trip, id=self.kwargs["trip_id"])

class EventListCreateAPI(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs['trip_id']
        return Event.objects.filter(trip_id=trip_id)

    def perform_create(self, serializer):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can add events")
            
        serializer.save(trip=trip)

class EventDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        trip = get_object_or_404(Trip, id=self.kwargs["trip_id"])
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can modify events")
        return get_object_or_404(Event, id=self.kwargs["event_id"], trip=trip)

class ParticipantListCreateAPI(generics.ListCreateAPIView):
    serializer_class = ParticipantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        return ParticipantCreateSerializer if self.request.method == 'POST' else ParticipantSerializer

    def get_queryset(self):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can view other participants")
            
        return Participant.objects.filter(trip=trip)

    def perform_create(self, serializer):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can add other participants")

        user_id = serializer.validated_data['user'].id
        if Participant.objects.filter(user_id=user_id, trip=trip).exists():
            raise ValidationError("User already participates in this trip")
            
        serializer.save(trip=trip)

class ParticipantDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ParticipantSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        trip = get_object_or_404(Trip, id=self.kwargs["trip_id"])
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can modify participants")
        return get_object_or_404(Participant, id=self.kwargs["participant_id"], trip=trip)
    
    # To prevent participants from being edited
    def put(self, request, *args, **kwargs):
        return Response({'detail': 'Editing participants is not allowed.'})

    def patch(self, request, *args, **kwargs):
        return Response({'detail': 'Editing participants is not allowed.'})

class MemoryListCreateAPI(generics.ListCreateAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        # Only participants can view
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can view memories")
            
        return Memory.objects.filter(trip=trip)

    def perform_create(self, serializer):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        # Only participants can add memories
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can add memories")

        participant = get_object_or_404(
            Participant,
            user=self.request.user,
            trip=trip
        )

        # save using the Participant instance
        serializer.save(trip=trip, participant=participant)
    
class ExpenseListCreateAPI(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        # Only participants can view
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can view expenses")
            
        return Expense.objects.filter(trip=trip)
    
    def perform_create(self, serializer):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        
        # Only participants can add expenses
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can add expenses")
            
        serializer.save(trip=trip)

class ExpenseDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        trip = get_object_or_404(Trip, id=self.kwargs["trip_id"])
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can modify expenses")
        return get_object_or_404(Expense, id=self.kwargs["expense_id"], trip=trip)
    
class TaskListCreateAPI(generics.ListCreateAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can view tasks")
        return Task.objects.filter(trip=trip)

    def perform_create(self, serializer):
        trip = get_object_or_404(Trip, id=self.kwargs['trip_id'])

        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can add tasks")

        responsible = serializer.validated_data.get("responsible")
        if responsible is None:
            responsible = get_object_or_404(
                Participant, user=self.request.user, trip=trip
            )

        serializer.save(trip=trip, responsible=responsible)

class TaskDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        trip = get_object_or_404(Trip, id=self.kwargs["trip_id"])
        if not trip.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Only participants can modify tasks")
        return get_object_or_404(Task, id=self.kwargs["task_id"], trip=trip)

class LoginView(APIView):
    permission_classes = []
    authentication_classes = []
    def post(self, request):
        user = authenticate(
            username=request.data.get('username'),
            password=request.data.get('password')
        )
        if not user:
            return Response({'detail': 'Bad creds'})
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user_id': user.id})

class ExternalInfoAPI(APIView):
    def get(self, request, trip_id):
        trip = Trip.objects.get(pk=trip_id)
        city_name = trip.destination
        country_code = get_country_code(city_name)

        if not country_code:
            return Response({
                'events': [] #something to tell the frontend that we found no location (unfamiliar location)
            })

        coordinates = get_coordinates(city_name, country_code)
        lat, lon = map(float, coordinates)

        weather_forecast = get_weather_forecast(lat, lon)
        events = get_ticketmaster_events(city_name, country_code, trip.start_date, trip.end_date)
        weather_interpretation = interpret_weather_forecast(weather_forecast)
        return Response({
            'events': events,
            'weather_interpretation': weather_interpretation
        })