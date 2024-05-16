import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import NavBar from "./components/NavBar";
import TicketMonitoring from "./pages/TicketMonitoring";
import Forum from "./pages/Forum";
import User from "./pages/User";
import { UserProvider } from "./components/UserContext";

const App = () => {
  return (
    <UserProvider>
      <div className="App">
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/ticketMonitoring" element={<TicketMonitoring />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/@me" element={<User />} />
          </Routes>
        </BrowserRouter>
      </div>
    </UserProvider>
  );
};

export default App;
