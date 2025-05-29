import React, {useState, useEffect} from "react";
import {useParams, useLocation, useNavigate} from "react-router-dom";
import {api} from "../../api";
import styles from "./Itinerary.module.css";

export default function Itinerary() {
  const {tripId} = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [events, setEvents] = useState(location.state?.events || null);
  const [err, setErr] = useState(null);
  const [trip, setTrip] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uniqueDates, setUniqueDates] = useState([]);

  const getAllTripDates = tripObject => {
    const tripDates = [];
    const currentDate = new Date(tripObject.start_date);

    while(currentDate <= new Date(tripObject.end_date)) {
      const dateAsString = currentDate.toISOString().split("T")[0];
      tripDates.push(dateAsString);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return tripDates;
  };

  useEffect(() => {
    if (trip) return;

    api(`/trips/${tripId}/`)
      .then(setTrip)
      .catch(e=>{
        if (e.message.includes("401")) navigate("/login");
        else setErr(e.message);
      });
  }, [tripId, navigate, trip]);

  useEffect(() => {
    if (events) return;

    api(`/trips/${tripId}/events/`)
      .then(setEvents)
      .catch(e => {
        if (e.message.includes("401")) navigate("/login");
        else setErr(e.message);
      });
  }, [tripId, navigate, events]);

  useEffect(() => {
    if (!trip || (uniqueDates == []) || (calendarSlots == [])) return;
    
    const allTripDates = getAllTripDates(trip);
    setUniqueDates(allTripDates);
    setCalendarSlots(Array(allTripDates.length * 5).fill(null));
  }, [trip]);

  // Add suggestions to suggestion area and planned events to the right date in the calendar
  useEffect(() => {
    if (!events || uniqueDates == []) return;

    events.map(event => {
      if (!((suggestions.find(suggestion => suggestion && suggestion.suggestion_id === event.event_id)) ||
            (calendarSlots.find(suggestionCard => suggestionCard && suggestionCard.suggestion_id === event.event_id)))) {

        const newSuggestionCard = ({
          suggestion_id: event.event_id,
          text: event.name
        }); 
      
        if (event.date === null) {
          setSuggestions(prev => [...prev, newSuggestionCard]);
        } else {
          setCalendarSlots(prev => {
            const newSlots = [...prev];

            let idx = uniqueDates.indexOf(event.date) * 5;
            while (newSlots[idx] != null) {
              idx = idx + 1;
            };

            newSlots[idx] = newSuggestionCard;
            return newSlots;
          });
        }
      }
    });
  }, [events, uniqueDates]);

  if (err) return <p>{err}</p>;
  if (!events) return <p>Loading…</p>;
  if (!trip) return <p>Loading…</p>;

  const handleAddEvent = () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErr(null);

    const payload = {
      name: newName.trim(),
      date: null,
      description: newDescription.trim()
    };

    api(`/trips/${tripId}/events/`, {
      method: "POST",
      body: payload
    })
    .then(ev => {
      setEvents(prev => [...prev, ev]);
      setNewName("");
      setNewDate("");
      setNewDescription("");
      setPopupOpen(false);
    })
    .catch(e => {
      if (e.message.includes("401")) navigate("/login");
      else setErr(`Failed to add event: ${e}`);
    })
    .finally(() => setIsSubmitting(false));
  };

  const handleDragStart = (item, src) => {
    setDraggedItem(item);
    setDragSource(src);
  };

  const handleDragOver = e => e.preventDefault();

  const handleDropToSlot = async (targetDate, slotIdx) => {
    if (!draggedItem || calendarSlots[slotIdx] !== null) return;
    setNewDate(targetDate);

    if (dragSource === "suggestion") {
      setCalendarSlots(prev => {
        const newSlots = [...prev];
        newSlots[slotIdx] = draggedItem;
        return newSlots;
      });

      setSuggestions(prev => prev.filter(s => s.suggestion_id !== draggedItem.suggestion_id));

    } else if (dragSource === "calendar") {
      setCalendarSlots(prev => {
        const newSlots = [...prev];
        newSlots[newSlots.findIndex(s => s && s.suggestion_id === draggedItem.suggestion_id)] = null;
        newSlots[slotIdx] = draggedItem;
        return newSlots;
      });
    }

    try {
      await api(`/trips/${tripId}/events/${draggedItem.suggestion_id}/`, {
        method: "PATCH",
        body: {date: newDate}
      });
    } catch (e) {
      console.error("Update date failed:", e);
    }

    setDraggedItem(null);
    setDragSource(null);
  };

  const handleDropToSuggestionArea = async () => {
    if (!draggedItem) return;

    if (dragSource === "calendar") {
      setSuggestions(prev => [...prev, draggedItem]);
      setCalendarSlots(prev => {
        const newSlots = [...prev];
        newSlots[newSlots.findIndex(s => s && s.suggestion_id === draggedItem.suggestion_id)] = null;
        return newSlots;
      });
    }

    try {
      await api(`/trips/${tripId}/events/${draggedItem.suggestion_id}/`, {
        method: "PATCH",
        body: {date: null}
      });
    } catch (e) {
      console.error("Update date failed:", e);
    }

    setDraggedItem(null);
    setDragSource(null);
  };

  const deleteSuggestion = async (id) => {
    setSuggestions(prev => prev.filter(s => s.suggestion_id !== id));

    try {
      await api(`/trips/${tripId}/events/${id}/`, {method: "DELETE"});
    } catch (e) {
        console.error("Failed to delete suggestion:", e);
        alert("Failed to delete suggestion. Please try again.");
    }
  };

  const deleteFromCalendar = async (idx) => {
    const item = calendarSlots[idx];
    if (!item) return;

    const t = [...calendarSlots];
    t[idx] = null;
    setCalendarSlots(t);

    try {
      await api(`/trips/${tripId}/events/${item.suggestion_id}/`, {method: "DELETE"});
    } catch (e) {
      console.error("Failed to delete calendar item:", e);
      alert("Failed to delete event.");
    }
  };

  const dateLabel = d => new Date(d).toLocaleDateString("en-GB");

  return (
    <div className={styles.itineraryPage}>
      <h1>ITINERARY</h1>
      <div className={styles.content}>
        <div className={styles.calendarGrid}>
          {uniqueDates.map((date, col) => (
            <div key={date} className={styles.calendarColumn}>
              <div className={styles.calendarDate}>{dateLabel(date)}</div>
              {[0,1,2,3,4].map(row => {
                const idx = col*5 + row;
                const slot = calendarSlots[idx];
                return (
                  <div key={idx} className={styles.calendarSlot} onDrop={()=>handleDropToSlot(date, idx)} onDragOver={handleDragOver}>
                    {slot && (
                      <div className={styles.suggestionCard} draggable onDragStart={()=>handleDragStart(slot,"calendar")}>
                        {slot.text}
                        <span className={styles.deleteBtn} onClick={()=>deleteFromCalendar(idx)}>×</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      
        <div className={styles.suggestionPanel} onDrop={handleDropToSuggestionArea} onDragOver={handleDragOver}>
          <h1>SUGGESTIONS</h1>
          <div className={styles.suggestionGrid}>
            {suggestions.map(s=>(
              <div key={s.suggestion_id} className={styles.suggestionCard} draggable onDragStart={()=>handleDragStart(s,"suggestion")}>
                {s.text}
                <span className={styles.deleteBtn} onClick={()=>deleteSuggestion(s.suggestion_id)}>×</span>
              </div>
            ))}
          </div>
          <span className={styles.addSuggestion} onClick={()=> setPopupOpen(true)}>+ ADD EVENT</span>
        </div>
      </div>
  
      {popupOpen && (
        <div className="popup-overlay">
          <div className="popup">
            <popup-title>New Event</popup-title>

            <label>Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Event name" />
            
            <label>Description</label>
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Event description" />

            <div className="popup-actions">
              <button className="btn" onClick={handleAddEvent} disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add"}
              </button>
              <button className="btnCancel" onClick={() => {setNewName(""); setNewDate(""); setNewDescription(""); setPopupOpen(false);}}>
                Cancel
              </button>
            </div>

            {err && <div className="error"><p>{err}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}