import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import './App.css';

import Landing from './pages/landing/Landing.js';
import Login from './pages/login/Login.js';
import Home from './pages/home/Home.js';
import Vacation from './pages/vacation/Vacation.js';
import Economy from './pages/economy/Economy.js';
import Itinerary from './pages/itinerary/Itinerary.js';
import Responsibilities from './pages/responsibilities/Responsibilities.js';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/vacation/:tripId" element={<Vacation />} />
        <Route path="/vacation/:tripId/expenses" element={<Economy />} />
        <Route path="/vacation/:tripId/itinerary" element={<Itinerary />} />
        <Route path="/vacation/:tripId/tasks" element={<Responsibilities />} />
      </Routes>
    </Router>
  );
}