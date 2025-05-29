import React, {useState, useEffect, useMemo} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {api} from "../../api";
import styles from "./Responsibilities.module.css";

const STATUS = {REQUESTED: 0, IN_PROGRESS: 1, DONE: 2};
const STATUS_LABELS = {
  [STATUS.REQUESTED]: "requested",
  [STATUS.IN_PROGRESS]: "in progress",
  [STATUS.DONE]: "done"
};

const colForStatus = s => s === STATUS.REQUESTED ? "todo" : s === STATUS.IN_PROGRESS ? "inprogress" : "done";
const statusForColumn = col => col === "todo" ? STATUS.REQUESTED : col === "inprogress" ? STATUS.IN_PROGRESS : STATUS.DONE;

export default function Responsibilities() {
  const {tripId} = useParams();
  const nav = useNavigate();

  const [columns, setColumns] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [err, setErr] = useState(null);

  const [popupOpen, setPopupOpen] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [description, setDescription] = useState("");
  const [selectedResp, setSelectedResp] = useState("");
  const [dragged, setDragged] = useState(null);
  const [srcColumn, setSrcColumn] = useState(null);

  const allTasksByResp = useMemo(() => {
    if (!columns) return;

    const allColumns = [...columns.todo, ...columns.inprogress, ...columns.done];
    return allColumns.reduce((resp, card) => {
      const name = card.full.responsible_name || "Unknown";
      resp[name] = resp[name] || [];
      resp[name].push(card);
      return resp;
    }, {});
  }, [columns]);

  useEffect(() => {
    api(`/trips/${tripId}/tasks/`)
      .then(tasks => {
        const initialColumns = {todo: [], inprogress: [], done: []};
        tasks.forEach(t => {
          const col = colForStatus(t.status);
          initialColumns[col].push({
            id: t.task_id,
            text: t.name,
            responsible: (t.responsible_name || "?").charAt(0).toUpperCase(),
            full: t
          });
        });
        setColumns(initialColumns);
      })
      .catch(e => {
        if (e.message.includes("401")) nav("/login");
        else setErr(e.message);
      });

    api(`/trips/${tripId}/participants/`)
      .then(data => setParticipants(data))
      .catch(e => {
        if (e.message.includes("401")) nav("/login");
        else console.error("Failed to load participants:", e);
      });
  }, [tripId, nav]);

  if (err) return <p>{err}</p>;
  if (!columns) return <p>Loading tasks…</p>;

  const handleDragStart = (task, col) => {
    setDragged(task);
    setSrcColumn(col);
  };

  const handleDragOver = e => e.preventDefault();

  const handleDrop = async targetCol => {
    if (!dragged || srcColumn == null || targetCol === srcColumn) return;

    const newStatus = statusForColumn(targetCol);
    const updatedCard = {...dragged, full: {...dragged.full, status: newStatus}};
  
    setColumns(prev => {
      const from = prev[srcColumn].filter(t => t.id !== dragged.id);
      const to = [...prev[targetCol], updatedCard];
      return {...prev, [srcColumn]: from, [targetCol]: to};
    });

    try {
      await api(`/trips/${tripId}/tasks/${dragged.id}/`, {
        method: "PATCH",
        body: {status: newStatus}
      });
    } catch (e) {
      console.error("Update status failed, rolling back.", e);

      setColumns(prev => {
        const to = prev[targetCol].filter(t => t.id !== dragged.id);
        const from = [...prev[srcColumn], dragged];
        return {...prev, [srcColumn]: from, [targetCol]: to};
      });
    }

    setDragged(null);
    setSrcColumn(null);
  };

  const addTask = async () => {
    if (!taskText.trim() || !selectedResp) return;

    try {
      const created = await api(`/trips/${tripId}/tasks/`, {
        method: "POST",
        body: {
          name: taskText.trim(),
          description: description.trim(),
          responsible: parseInt(selectedResp)
        }
      });

      const card = {
        id: created.task_id,
        text: created.name,
        responsible: (created.responsible_name || "?").charAt(0).toUpperCase(),
        full: created
      };

      setColumns(prev => ({...prev, todo: [...prev.todo, card]}));
      setTaskText("");
      setDescription("");
      setSelectedResp("");
      setPopupOpen(false);

    } catch (e) {
      if (e.message.includes("401")) nav("/login");
      else setErr(e.message);
    }
  };

  const handleDelete = async () => {
    if (!dragged || srcColumn == null) return;

    setColumns(prev => ({...prev, [srcColumn]: prev[srcColumn].filter(t => t.id !== dragged.id)}));

    try {
      await api(`/trips/${tripId}/tasks/${dragged.id}/`, {method: "DELETE"});
    } catch (e) {
      console.error("Delete failed, restoring.", e);

      setColumns(prev => ({...prev, [srcColumn]: [...prev[srcColumn], dragged] }));
    }

    setDragged(null);
    setSrcColumn(null);
  };

  return (
    <div className={styles.responsibilitiesPage}>
      <div className={styles.header}>
        <h1>RESPONSIBILITIES</h1>
        <div className={styles.actions}>
          <button className="btn" onClick={() => setPopupOpen(true)}>+ Add Task</button>
          <div className={styles.trashBin} onDragOver={handleDragOver} onDrop={handleDelete}>
            🗑️ Drag here to delete
          </div>
        </div>
      </div>

      <div className={styles.taskBoard}>
        {Object.entries(columns).map(([key, tasks]) => (
          <div key={key} className={`${styles.taskColumn} ${styles[key]}`} onDragOver={handleDragOver} 
            onDrop={() => handleDrop(key)}>
            {tasks.map(task => (
              <div key={task.id} className={styles.taskCard} draggable onDragStart={() => handleDragStart(task, key)}>
                <span>{task.text}</span>
                <div className={styles.responsible}>{task.responsible}</div>
              </div>
            ))}
            {[...Array(Math.max(0, 3 - tasks.length))].map((_, i) => (
              <div key={i} className={styles.taskSlot} />
            ))}
          </div>
        ))}
      </div>

      <div className={styles.allTasksList}>
        <h2>TASK DETAILS</h2>
        {Object.entries(allTasksByResp).map(([resp, tasks]) => (
          <div key={resp} className={styles.respGroup}>
            <h3>{resp}</h3>
            <ul>
              {tasks.map(card => (
                <li key={card.id} className={styles.taskItem}>
                  <strong>{card.text} ({STATUS_LABELS[card.full.status]})</strong>
                  <p>{card.full.description || "No description available."}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {popupOpen && (
        <div className="popup-overlay">
          <div className="popup">
            <popup-title>Add New Task</popup-title>

            <label>Task name</label>
            <input placeholder="Task name" value={taskText} onChange={e => setTaskText(e.target.value)} />

            <label>Description</label>
            <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

            <label>Responsible</label>
            <select value={selectedResp} onChange={e => setSelectedResp(e.target.value)} required>
              <option value="">— Choose —</option>
              {participants.map(p => (<option key={p.participant_id} value={p.participant_id}>{p.username}</option>))}
            </select>

            <div className="popup-actions">
              <button className="btn" onClick={addTask}>Add</button>
              <button className="btnCancel" onClick={() => {setTaskText(""); setDescription(""); setSelectedResp(""); setPopupOpen(false);}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}