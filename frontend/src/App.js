import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import NavBar from "./components/NavBar";
import TicketMonitoring from "./pages/TicketMonitoring";
import Forum from "./pages/Forum";
import User from "./pages/User";
import Status from "./pages/InvoiceStatus";
import axios from "./api/axios";
import PackageRequest from "./pages/PackageRequestForm";

const App = () => {
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await axios.get('http://localhost:5000/getUserRole', { withCredentials: true });
        setUserRole(response.data.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <NavBar userRole={userRole} setUserRole={setUserRole} />
        <Routes>
          <Route path="/" element={<Login setUserRole={setUserRole} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ticketMonitoring" element={<TicketMonitoring />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/@me" element={<User />} />
          <Route path="/invoiceStatus" element={<Status />} />
          <Route path="/packageRequest" element={<PackageRequest />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;