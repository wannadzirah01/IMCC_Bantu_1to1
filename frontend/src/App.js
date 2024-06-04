import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import NavBar from "./components/NavBar";
import PackageListing from "./pages/PackageListing";
import User from "./pages/User";
import Status from "./pages/PackageStatus";
import ComplaintStatus from "./pages/ComplaintStatus";
import axios from "./api/axios";
import PackageRequest from "./pages/PackageRequestForm";
import PostList from "./pages/PostList";
import 'bootstrap/dist/css/bootstrap.min.css';
import Dashboard from "./pages/Dashboard";

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
          <Route path="/packageListing" element={<PackageListing />} />
          <Route path="/forum" element={<PostList />} />
          <Route path="/@me" element={<User />} />
          <Route path="/ticketManagement" element={<Status />} />
          <Route path="/packageRequest" element={<PackageRequest />} />
          <Route path="/packageRequestForm" element={<PackageRequest />} />
          <Route path="/complaintStatus" element={<ComplaintStatus />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;