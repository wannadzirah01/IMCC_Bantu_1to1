import React, { useEffect, useState } from "react";
import axios from "../api/axios";

const Dashboard = () => {
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/getUserRole",
                    { withCredentials: true }
                );
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, []);

    return userRole ? (
        <h2>Bantu 1-to-1 Dashboard</h2>
    ) : (
        "You need to log in to view this content."
    );
};

export default Dashboard;
