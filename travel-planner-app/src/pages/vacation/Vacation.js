import React from 'react';
import {useParams, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import {api} from "../../api";
import styles from "./Vacation.module.css";

export default function VacationOverview() {
  const {tripId} = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState(null);
  const [err, setErr] = useState(null);

  const [currentUserParticipantId, setCurrentUserParticipantId] = useState(null);

  const [addParticipantPopup, setAddParticipantPopup] = useState(false);
  const [userIdToAdd, setUserIdToAdd] = useState('');
  const [addParticipantError, setAddParticipantError] = useState(null);
  const [addParticipantSuccess, setAddParticipantSuccess] = useState('');
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState(false);

  const [editVacation, setEditVacation] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDestination, setEditedDestination] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');

  const [externalEvents, setExternalEvents] = useState([]);
  const [weatherSummary, setWeatherSummary] = useState('');

  useEffect(() => {
    api(`/trips/${tripId}/`)
      .then(data => {
        setTrip(data);
        setEditedName(data.name);
        setEditedStartDate(data.start_date);
        setEditedEndDate(data.end_date);
        setEditedDestination(data.destination);
        setEditedDescription(data.description);

        const myUserId = Number(localStorage.getItem('user_id'));
        const current = data.participants.find(p => p.user_id === myUserId);
        if (current) {
          setCurrentUserParticipantId(current.participant_id);
        }
      })
      .catch(e => {
        if (e.message.includes("401")) nav("/login");
        else setErr(e.message);
      });
  }, [tripId, nav]);

  useEffect(() => {
    if (!trip) return;

    const fetchExternalInfo = async () => {
      try {
        const d = await api(`/trips/${tripId}/external_info/`);
        setExternalEvents(d.events || []);
        setWeatherSummary(d.weather_interpretation?.Summary || '');
      } catch {
        setExternalEvents([]);
        setWeatherSummary('');
      }
    };

    fetchExternalInfo();
  }, [trip, tripId]);


  const handleAddParticipantSubmit = async (e) => {
    if (e) 
      e.preventDefault(); 

    setAddParticipantError(null);
    setAddParticipantSuccess('');
    setIsSubmittingParticipant(true);

    const userId = Number(userIdToAdd);

    try {
      const newParticipant = await api(`/trips/${tripId}/participants/`, {
        method: 'POST',
        body: {user: userId},
      });
      
      setTrip(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant]
      }));

      setAddParticipantSuccess(`User ${newParticipant.username} added successfully!`);
      setUserIdToAdd(''); 

      setTimeout(() => {
        setAddParticipantPopup(false);
        setAddParticipantSuccess(''); 
      }, 1000);

      setIsSubmittingParticipant(false);
 
    } catch (err) {

      let errorMessage = 'Failed to add participant. Please try again.';
      setAddParticipantError(errorMessage);
      setUserIdToAdd(''); 
      setIsSubmittingParticipant(false);
      console.error("Add participant error:", err);
    } 
  };

  const handleDeleteTrip = async () => {
    await api(`/trips/${tripId}/`, { method: "DELETE" });
    nav("/home");
  };

  const handleUpdateTrip = async () => {

      const updatedTrip = await api(`/trips/${tripId}/`, {
        method: 'PATCH',
        body: {
          name: editedName,
          destination: editedDestination,
          description: editedDescription,
          start_date: editedStartDate,
          end_date: editedEndDate,
        },
      });
      setTrip(updatedTrip);
      setEditVacation(false);
    
  };

  const handleRemoveParticipant = async (id) => {
    try {
      await api(`/trips/${tripId}/participants/${id}/`, 
      {method: 'DELETE'});

      setTrip(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.participant_id !== id && p.id !== id)
      }));
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  if (err) return <p>{err}</p>;
  if (!trip) return <p>Loading…</p>;

  return (
    <div className={styles.vacationPage}>
      <div className="left-column">
        <h2>YOUR VACATION TO</h2>
        <h1>{trip.destination}</h1>
        <p className={styles.dates}> {trip.start_date} – {trip.end_date}</p>

        <div className={styles.menu}>
          <h2 onClick={() => nav(`/vacation/${tripId}/itinerary`)}>ITINERARY</h2>
          <h2 onClick={() => nav(`/vacation/${tripId}/expenses`)}>ECONOMY</h2>
          <h2 onClick={() => nav(`/vacation/${tripId}/tasks`)}>RESPONSIBILITIES</h2>
        </div>

        {externalEvents.length > 0 && (
          <div className={styles.weatherBox}>
            <h3>WHAT’S ON</h3>
            <ul>
              {externalEvents.map(ev => (
                <li key={ev.url}>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.eventTitle}
                  >
                    {ev.name} <span className={styles.eventDate}>({ev.date})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="right-column">
        <button className={styles.btnEdit} onClick={() => setEditVacation(true)}>
          EDIT VACATION
        </button>

        {weatherSummary && (
          <div className={styles.weatherBox}>
            <h3>WEATHER</h3>
            <p>{weatherSummary}</p>
          </div>
        )}

        <div className={styles.important}>
          <h3>TO DO</h3>
          {trip.tasks && trip.tasks.filter(t => t.status !== 2).map(t => (
            <p key={t.task_id || t.id}>{t.name.toUpperCase()}</p>
          ))}
        </div>

        <div className={styles.participants}>
          <h3>PARTICIPANTS</h3>
          {trip.participants && trip.participants.map(p => (
            <p
              key={p.participant_id}
              className={styles.participant}
              onClick={() => handleRemoveParticipant(p.participant_id)}
            >
              {p.username.toUpperCase()}
            </p>
          ))}
          <p className="add" onClick={() => {
            setAddParticipantPopup(true);
            setAddParticipantError(null);
            setAddParticipantSuccess('');
          }}>
            + ADD PARTICIPANT
          </p>
        </div>

        <div className={styles.expenses}>
          <h3>YOUR EXPENSES</h3>
          {trip.expenses && trip.expenses.length > 0 ? (
            <p>
              YOUR TOTAL: €{trip.expenses
                .filter(e => e.paid_by === currentUserParticipantId)
                .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                .toFixed(2)}
            </p>
          ) : (
            <p>No expenses yet</p>
          )}
        </div>
      </div>

    {editVacation && (
      <div className="popup-overlay">
        <div className="popup">
          <h3>Edit Trip</h3>
          <form>
            <label>
              Name:
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </label>
            <label>
              Destination (City):
              <input
                type="text"
                value={editedDestination}
                onChange={(e) => setEditedDestination(e.target.value)}
              />
            </label>
            <label>
              Description:
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
              />
            </label>
            <label>
              Start date:
              <input
                type="date"
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
              />
            </label>
            <label>
              End date:
              <input
                type="date"
                value={editedEndDate}
                onChange={(e) => setEditedEndDate(e.target.value)}
              />
            </label>
          </form>

          <div className="popup-actions">
            <button className={styles.btnDelete} onClick={handleDeleteTrip}>Delete</button>
            <button className="btn" onClick={handleUpdateTrip}>Edit</button>
            <button className="btnCancel" onClick={() => setEditVacation(false)}>Cancel</button>
          </div>
        </div>
      </div>
    )}

      {addParticipantPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <popup-title>Add New Participant</popup-title>
            <form onSubmit={handleAddParticipantSubmit}>
              <div className="form-group">
                <label htmlFor="userId">User ID to Add:</label>
                <input
                  type="text"
                  id="userId"
                  value={userIdToAdd}
                  onChange={(e) => setUserIdToAdd(e.target.value)}
                  placeholder="Enter User ID"
                  disabled={isSubmittingParticipant}
                />
              </div>
                            
              {addParticipantError && <div className="error"><p>{addParticipantError}</p></div>}
              {addParticipantSuccess && <p className="success-message">{addParticipantSuccess}</p>}
              
              <div className="popup-actions">
                <button type="submit" 
                className='btn' 
                disabled={isSubmittingParticipant}>
                  {isSubmittingParticipant ? 'Adding...' : 'Add'}
                </button>
                <button type="button" 
                className='btnCancel' 
                onClick={() => setAddParticipantPopup(false)} 
                disabled={isSubmittingParticipant}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}
