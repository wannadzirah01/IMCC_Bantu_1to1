import React, { useState } from "react";
import axios from "../api/axios";
import { Link, useNavigate } from "react-router-dom";

const Register = (props) => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [matricNumber, setMatricNumber] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [school, setSchool] = useState("");
    // const [yearOfStudy, setYearOfStudy] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await axios.post(
                // "http://localhost:5000/register",
                "https://imcc-bantu-1to1.onrender.com/register",
                // { email, password, name, matricNumber, phoneNumber, school, yearOfStudy});
                { email, password, name, phoneNumber }
            );
            alert("Successful user registration");

            navigate("/");
        } catch (err) {
            if (err.response && err.response.status === 400) {
                alert("User already exist. Please Login");
            }
        }
    };

    return (
        <div className="register-page">
            <div className="auth-form-container">
                <form className="register-form" onSubmit={handleSubmit}>
                    <h2>Register</h2>

                    <label htmlFor="name">Full Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        id="name"
                        placeholder="Full Name"
                    />

                    {/* <label htmlFor="matricNumber">Matric Number</label>
            <input value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)} id="matricNumber" placeholder="Matric Number" /> */}

                    <label htmlFor="email">Email</label>
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        id="email"
                        placeholder="Email"
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        id="password"
                        placeholder="Password"
                    />

                    <label htmlFor="phoneNumber">Phone Number</label>
                    <input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        id="phoneNumber"
                        placeholder="Phone Number"
                    />

                    {/* <label htmlFor="school">School</label>
            <input value={school} onChange={(e) => setSchool(e.target.value)} id="school" placeholder="School" /> */}

                    {/* <label htmlFor="yearOfStudy">Year of Study</label>
            <input value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} id="yearOfStudy" placeholder="1, 2, 3, 4, or 5" /> */}

                    <div class="divider" />
                    <div className="button-general">
                        <button type="submit" onClick={(e) => handleSubmit(e)}>
                            Register
                        </button>
                    </div>
                </form>
                <Link to="/" className="link-btn">
                    Already have an account? Login here
                </Link>
            </div>
        </div>
    );
};

export default Register;
