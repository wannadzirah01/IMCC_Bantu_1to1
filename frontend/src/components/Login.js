import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import "../App.css";

const Login = (props) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userID, setUserID] = useState(null); // Add state for userID

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/login", { email, password });
      alert("Successful user login");

      // Retrieve userID from the server response and store it in state
      const { userID } = response.data;
      setUserID(userID);

      // Redirect to the ticket monitoring page
      navigate("/ticketMonitoring");
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

        <div class="divider" />

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