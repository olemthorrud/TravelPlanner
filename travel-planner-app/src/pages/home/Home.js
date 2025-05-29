import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {api} from "../../api";
import styles from "./Home.module.css";

export default function Home() {
  const [trips, setTrips] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [vacName, setVacName] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const nav = useNavigate();

  const isFuture = d => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inputDate = new Date(d);
    inputDate.setHours(0, 0, 0, 0);
    return inputDate >= today;
  };

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await api("/trips/");
        setTrips(data);
      } catch (e) {
        if (e.message?.includes("401")) {
          nav("/login");
        }
      }
    }
    fetchTrips();
  }, [nav]);

  const future = trips.filter(t => isFuture(t.start_date));
  const past = trips.filter(t => !isFuture(t.end_date));
  const myUserId = Number(localStorage.getItem("user_id"));

  const myTasks = [];

  for (const trip of future) {
    const participant = trip.participants.find(p => p.user_id === myUserId);
    const myId = participant.participant_id;

    for (const task of trip.tasks) {
      if (task.responsible_id === myId && task.status !== 2) {
        myTasks.push({
          ...task,
          tripName: trip.name
        });
      }
    }
  }

  async function addVacation(e) {
    e.preventDefault();
    await api("/trips/", {
      method: "POST",
      body: {name: vacName, start_date: startDate, end_date: endDate, destination: destination, description: description}
    });
    setTrips(await api("/trips/"));
    
    setVacName("");
    setDestination("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setShowPopup(false);
  }

  return (
    <div className={styles.homePage}>
      <div className="left-column">
        <h1>TRAVEL PLANNER</h1>

        <div className={styles.nextVacation}>
          <h2>YOUR NEXT VACATION</h2>
          {future.length ? (
            <p style={{cursor:"pointer"}}
               onClick={()=>nav(`/vacation/${future[0].trip_id}`)}>
              {future[0].name.toUpperCase()}
            </p>
          ) : <p>No upcoming trips</p>}
        </div>

        <div className={styles.futureVacations}>
          <h2>FUTURE VACATIONS</h2>
          {future.slice(1).map(t => (
            <p key={t.trip_id}
               style={{cursor:"pointer"}}
               onClick={() => nav(`/vacation/${t.trip_id}`)}
            >{t.name.toUpperCase()}</p>
          ))}

          {!showPopup && (
            <button className="add" onClick={()=>setShowPopup(true)}>
              + ADD VACATION
            </button>
          )}

          {showPopup && (
            <div className="popup-overlay">
              <div className="popup">
                <popup-title className="popup-title">ADD A NEW VACATION</popup-title>
                <form className="popup-form" onSubmit={addVacation}>
                  <div className="form-group">
                    <label>Vacation Name</label>
                    <input value={vacName} required
                           onChange={e=>setVacName(e.target.value)} />
                    <label>Destination (City)</label>
                    <input value={destination} required
                           onChange={e => setDestination(e.target.value)} />  
                    <label>Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                    />
                    <label>Start Date</label>
                    <input type="date" value={startDate} required
                           onChange={e=>setStartDate(e.target.value)} />
                    <label>End Date</label>
                    <input type="date" value={endDate} required
                           onChange={e=>setEndDate(e.target.value)} />
                  </div>
                  <div className="popup-actions">
                    <button type="submit" className="btn">Submit</button>
                    <button type="button" className="btnCancel"
                            onClick={()=>{setShowPopup(false);}}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="right-column">
        <div className={styles.logOut}>
          <p>LOG OUT</p>
        </div>

        <div className={styles.responsibilities}>
          <h3>TO DO</h3>
          {myTasks.length
            ? myTasks.map(t => (
                <p key={t.task_id}>
                  <strong>{t.tripName.toUpperCase()}:</strong> {t.name}
                </p>
              ))
            : <resp-text>You have no open tasks ✨</resp-text>}
        </div>

        <div className={styles.been}>
          <h3>BEEN</h3>
          {past.map(t => (
            <p key={t.trip_id}
               style={{cursor:"pointer"}}
               onClick={()=>nav(`/vacation/${t.trip_id}`)}
            >{t.name.toUpperCase()}</p>
          ))}
        </div>
      </div>
    </div>
  );
};