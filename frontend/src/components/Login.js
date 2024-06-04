import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import "../App.css";

const Login = ({ setUserRole }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/login", { email, password }, { withCredentials: true });
      alert("Successful user login");

      const userRoleResponse = await axios.get('http://localhost:5000/getUserRole', { withCredentials: true });
      setUserRole(userRoleResponse.data.role);

      if (userRoleResponse.data.role === "client") {
        navigate("/packageListing");
      } else if (userRoleResponse.data.role === "admin") {
        navigate("/ticketManagement");
      }
      
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert("Invalid Credentials");
      }
    }
  };

  return (
    <div className="auth-form-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Log In</h2>
        <label htmlFor="email">Student Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="studentemail@student.usm.my"
          id="email"
          name="email"
        />
        <label htmlFor="password">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          id="password"
          name="password"
        />
        <div className="divider" />
        <div className="button-general">
          <button type="submit">Login</button>
        </div>
      </form>
      <Link to="/register" className="link-btn">
        Don't have an account? Register
      </Link>
    </div>
  );
};

export default Login;