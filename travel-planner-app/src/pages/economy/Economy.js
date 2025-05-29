import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {api} from '../../api';
import styles from './Economy.module.css';
import PieChart from './PieChart.js';
import {MdClose, MdEdit} from 'react-icons/md';


export default function Economy() {
  const {tripId} = useParams();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState(null);
  const [participantMap, setParticipantMap] = useState({});
  const [err, setErr] = useState(null);

  const [debts, setDebts] = useState({});
  const [payerParticipantId, setPayerParticipantId] = useState('');
  const [popupOpen, setPopupOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [editExpense, setEditExpense] = useState(null);

  const [totalPaidPerUser, setTotalPaidPerUser] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const [settlementResults, setSettlementResults] = useState([]);
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  
function calculateSettlement(totalPaidPerUser, participants) {
  const settlements = [];

  const balances = participants.map(p => {
    const paid = totalPaidPerUser.find(user => user.id === p.participant_id)?.value || 0;
    return {
      id: p.participant_id,
      balance: paid
    };
  });

  let total = 0;
  for (const p of balances) {
    total += p.balance;
  }

  const avg = total / participants.length;

  const adjusted = balances.map(p => ({
    id: p.id,
    balance: Number((p.balance - avg).toFixed(2)),
  }));

  const payers = adjusted.filter(p => p.balance < 0).map(p => ({ ...p }));
  const receivers = adjusted.filter(p => p.balance > 0).map(p => ({ ...p }));

  let i = 0, j = 0;

  while (i < payers.length && j < receivers.length) {
    const payer = payers[i];
    const receiver = receivers[j];
    const amount = Math.min(-payer.balance, receiver.balance);

    settlements.push({
      fromId: payer.id,
      toId: receiver.id,
      amount: Number(amount.toFixed(2)),
    });

    payer.balance += amount;
    receiver.balance -= amount;

    if (Math.abs(payer.balance) < 0.01) i++; // 0.01 to avoid float-issues
    if (Math.abs(receiver.balance) < 0.01) j++;
  }
  return settlements;
  }

  // Fetch expenses, participants and participant ID
  useEffect(() => {
    const fetchData = async () => {
      try {
        const expensesData = await api(`/trips/${tripId}/expenses/`);
        setExpenses(expensesData);

        const participantsData = await api(`/trips/${tripId}/participants/`);
        setParticipants(participantsData);

        const loggedInUserId = Number(localStorage.getItem('user_id'));
        const map = {};
        participantsData.forEach(p => {
          map[p.participant_id] = p.username || `Participant ${p.participant_id}`;
          if (p.user_id === loggedInUserId) {
            setCurrentUserParticipantId(p.participant_id);
          }
        
        });
        setParticipantMap(map);

      } catch (e) {
        if (e.message.includes('401')) navigate('/login');
        else setErr(e.message);
      }
    };
    fetchData();
  }, [tripId, navigate]);

  // Calculate debts
  useEffect(() => {
    if (!expenses || !currentUserParticipantId) return;

    const debts = {};
    expenses.forEach(exp => {
      const payer = exp.paid_by;
      const participants = exp.shared_between;

      const isNotPayer = payer !== currentUserParticipantId;

      if (isNotPayer) {
        const share = Number(exp.amount) / participants.length;
        const payerName = participantMap[payer] || `Participant ${payer}`;
        debts[payerName] = (debts[payerName] || 0) + share;
      }
    });
    setDebts(debts);
  }, [expenses, currentUserParticipantId, participantMap]);

    // For pie chart
  useEffect(() => {
    if (!expenses || !participants) return;

    const paidMap = {};
    expenses.forEach(exp => {
      const payer = exp.paid_by;
      paidMap[payer] = (paidMap[payer] || 0) + Number(exp.amount);
    });

    const data = Object.entries(paidMap).map(([id, amount]) => ({
      name: participantMap[id],
      value: Number(amount.toFixed(2)),
    }));

    setTotalPaidPerUser(data);

    const totalExpenses = data.reduce((sum, entry) => sum + entry.value, 0);
    setTotalAmount(totalExpenses);

  }, [expenses, participantMap, participants]);

  const handleExpense = async () => {
    if (!payerParticipantId || !description || !amount) return;

    const payload = {
      amount: Number(amount).toFixed(2),
      description,
      paid_by: Number(payerParticipantId, 10),
      shared_between: participants.map(p => p.participant_id)
    };

      if (editExpense) {
        const updated = await api(`/trips/${tripId}/expenses/${editExpense.expense_id}/`, {
          method: 'PUT',
          body: payload
        });
        setExpenses(prev => {
          return prev.map(e => {
            if (e.expense_id === editExpense.expense_id) {
              return updated;
            }
            return e;
          });
        });
      } else {
        const added = await api(`/trips/${tripId}/expenses/`, {
          method: 'POST',
          body: payload
        });
        setExpenses(prev => [...prev, added]);
      }

      setPopupOpen(false);
      setPayerParticipantId('');
      setDescription('');
      setAmount('');
      setEditExpense(null);

  };

function handleCloseSettlement() {
  if (!participants || !totalPaidPerUser || !currentUserParticipantId) {
    return;
  }

  let totalPaidPerUserID = [];
  for (let i = 0; i < totalPaidPerUser.length; i++) {
    let user = totalPaidPerUser[i];
    let id;
    for (let pid in participantMap) {
      if (participantMap[pid] === user.name) {
        id = pid;
        break;
      }
    }
    totalPaidPerUserID.push({ id: Number(id), value: user.value });
  }

  let allSettlements = calculateSettlement(totalPaidPerUserID, participants);
  let myDebts = [];
  for (let j = 0; j < allSettlements.length; j++) {
    if (allSettlements[j].fromId === currentUserParticipantId) {
      myDebts.push(allSettlements[j]);
    }
  }

  let results = [];
  for (let k = 0; k < myDebts.length; k++) {
    results.push({
      toName: participantMap[myDebts[k].toId],
      amount: myDebts[k].amount
    });
  }

  setSettlementResults(results);
  setShowSettlementPopup(true);
}

  const handleEditExpense = (expense) => {

    setEditExpense(expense);
    setPayerParticipantId(expense.paid_by.toString());
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setPopupOpen(true);

  };

  const handleDeleteExpense = async (expenseId) => {

      await api(`/trips/${tripId}/expenses/${expenseId}/`,
        {method: 'DELETE'});
      setExpenses(function(prevExpenses) {
        const updatedExpenses = prevExpenses.filter(function(expense) {
          return expense.expense_id !== expenseId;
        });
        return updatedExpenses;
      });
  };

  if (err) return <p>Error: {err}</p>;
  if (expenses === null || participants === null) return <p>Loading economy data…</p>;

  return (
    <div className={styles.economyPage}>
      <div className="left-column">
        <h1>ECONOMY</h1>
        <div className={styles.settlement}>
          <h2>SETTLEMENT</h2>
          <div className={styles.expenseList}>
          {expenses.map(e => (
            <div key={e.expense_id} className={styles.expenseBox}>
              <div className={styles.buttonGroup}>
                <button onClick={() => handleEditExpense(e)} title="Edit">
                  <i><MdEdit /></i>
                </button>
                <button onClick={() => handleDeleteExpense(e.expense_id)} title="Delete">
                  <i><MdClose /></i>
                </button>
              </div>
              <strong>{participantMap[e.paid_by]}</strong>
              <p>{e.description}</p>
              <p>{Number(e.amount).toFixed(2)}</p>
            </div>
          ))}
        </div>
          <button className="add" onClick={() => {setPopupOpen(true);}}>
            + ADD EXPENSE
          </button>
          <button className="btn" onClick={handleCloseSettlement}>Calculate settlement</button>
        </div>
      </div>

      <div className="right-column">
        <div className={styles.summary}>
          <h2>TOTAL EXPENSES</h2>
          <p>TOTAL: €{totalAmount.toFixed(2)}</p>
        </div>
        {totalAmount > 0 && (
          <div className={styles.pieChart}>
            <PieChart data={totalPaidPerUser} />
          </div>
        )}
        <div className={styles.youOwe}>
          <h3>YOU OWE</h3>
          {Object.keys(debts).length > 0 ? (
            Object.entries(debts).map(([name, owe]) => (
              <p key={name}>{name.toUpperCase()}: €{owe.toFixed(2)} </p>
            ))
          ) : (
            <p>You are all settled up!</p>
          )}
        </div>
      </div>

      {showSettlementPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Settlement Summary</h3>
            {settlementResults.length === 0 ? (
              <p>You are all settled up!</p>
            ) : (
              settlementResults.map((tx, index) => (
               <p key={index}>
                You pay {tx.toName}: €{tx.amount.toFixed(2)}
              </p>
              ))
            )}
            <div className="popup-actions">
              <button className="btn" onClick={() => setShowSettlementPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {popupOpen && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>{editExpense ? 'Edit Expense' : 'Add Expense'}</h3>
            <select
              value={payerParticipantId}
              onChange={e => setPayerParticipantId(e.target.value)}
            >
              <option value="">Select Payer</option>
              {participants.map(p => (
                <option key={p.participant_id} value={p.participant_id}>
                  {p.username}
                </option>
              ))}
            </select>
            <input
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <input
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <div className="popup-actions">
              <button className='btn' onClick={handleExpense}>
                {editExpense ? 'Save Changes' : 'Add'}
              </button>
              <button className='btnCancel' onClick={() => {
                setPopupOpen(false);
                setEditExpense(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
