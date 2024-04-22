import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom";
import axios from '../api/axios';
import '../App.css';

const Login = (props) => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await axios.post("http://localhost:5000/login",
            { email, password });
            alert("Successful user login")

            navigate("/@me");
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert('Invalid Credentials');
            }
        }
    }

    return (
        <div className="auth-form-container">
            <form className="login-form" onSubmit={handleSubmit}>
            <h2>Log In</h2>

            <label htmlFor="email">Student Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="studentemail@student.usm.my" id="email" name="email" />
            
            <label htmlFor="password">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" id="password" name="password" />

            <div class="divider"/>
            
            <button type="submit" onClick={(e) => handleSubmit(e)}>Login</button>
        
        </form><Link to="/register" className="link-btn" >Don't have an account? Register</Link></div>
    )
}

export default Login