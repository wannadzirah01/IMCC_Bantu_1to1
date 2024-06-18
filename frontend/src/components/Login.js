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
            const response = await axios.post(
                // "http://localhost:5000/login",
                "https://imcc-bantu-1to1.onrender.com/login",
                { email, password },
                { withCredentials: true }
            );
            alert("Successful user login");

            const userRoleResponse = await axios.get(
                // "http://localhost:5000/getUserRole",
                "https://imcc-bantu-1to1.onrender.com/getUserRole",
                { withCredentials: true }
            );
            setUserRole(userRoleResponse.data.role);

            if (userRoleResponse.data.role === "client") {
                navigate("https://imcc-bantu-1to1.onrender.com/packageListing");
            } else if (userRoleResponse.data.role === "admin") {
                navigate("https://imcc-bantu-1to1.onrender.com/ticketManagement");
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert("Invalid Credentials");
            }
        }
    };

    return (
        <div className="login-page">
            <div className="auth-form-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Log In</h2>
                    <label htmlFor="email">Email</label>
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Please enter your email"
                        id="email"
                        name="email"
                    />
                    <label htmlFor="password">Password</label>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        placeholder="Please enter your password"
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
        </div>
    );
};

export default Login;
