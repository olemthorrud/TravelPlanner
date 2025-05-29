from django.urls import path
from .api import (
    TripListCreateAPI,
    TripDetailAPI,
    EventListCreateAPI,
    EventDetailAPI,
    ParticipantListCreateAPI,
    ParticipantDetailAPI,
    MemoryListCreateAPI,
    ExpenseListCreateAPI,
    ExpenseDetailAPI,
    TaskListCreateAPI,
    TaskDetailAPI,
    LoginView,
    ExternalInfoAPI,
)

urlpatterns = [
    # Login endpoint
    path('login/', LoginView.as_view(), name='api-login'),

    # Database API endpoints
    path('trips/', TripListCreateAPI.as_view(), name='trip-api-list'),
    path('trips/<int:trip_id>/', TripDetailAPI.as_view(), name='trip-api-detail'),
    path('trips/<int:trip_id>/events/', EventListCreateAPI.as_view(), name='trip-events-list'),
    path('trips/<int:trip_id>/events/<int:event_id>/', EventDetailAPI.as_view(), name='event-detail'),
    path('trips/<int:trip_id>/participants/', ParticipantListCreateAPI.as_view(), name='trip-participants'), 
    path('trips/<int:trip_id>/participants/<int:participant_id>/', ParticipantDetailAPI.as_view()),
    path('trips/<int:trip_id>/memories/', MemoryListCreateAPI.as_view(), name='trip-memories'),
    path('trips/<int:trip_id>/expenses/', ExpenseListCreateAPI.as_view(), name='trip-expenses'),
    path('trips/<int:trip_id>/expenses/<int:expense_id>/', ExpenseDetailAPI.as_view(), name='expense-detail'),
    path('trips/<int:trip_id>/tasks/', TaskListCreateAPI.as_view(), name='trip-tasks'),
    path('trips/<int:trip_id>/tasks/<int:task_id>/',  TaskDetailAPI.as_view()),

    # External information API endpoint
    path('trips/<int:trip_id>/external_info/', ExternalInfoAPI.as_view(), name='external-info'),

]