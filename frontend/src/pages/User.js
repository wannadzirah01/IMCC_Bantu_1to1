import React, { useEffect, useState } from "react";
import axios from "../api/axios";

const User = () => {
    const [userData, setUserData] = useState(null);
    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get(
                    "https://imcc-bantu-1to1.onrender.com/getUserRole",
                    { withCredentials: true }
                );
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, []);

    useEffect(() => {
        async function fetchUserProfile() {
            try {
                const resp = await axios.get("//localhost:5000/@me");
                setUserData(resp.data);
            } catch (error) {
                console.log("Not authenticated");
            }
        }

        fetchUserProfile();
    }, []);

    return userData ? (
        <div className="profile-container">
            <div className="profile-user-info">
                <h2>User Profile</h2>
                <p>
                    <strong>Email:</strong> {userData.email}
                </p>
                <p>
                    <strong>Name:</strong> {userData.name}
                </p>
                <p>
                    <strong>Phone Number:</strong> {userData.phone_number}
                </p>
                {userRole === "client" && (
                    <>
                        {/* <p>
                            <strong>Matric Number:</strong>{" "}
                            {userData.matric_number}
                        </p> */}
                        {/* <p>
                            <strong>School:</strong> {userData.school}
                        </p> */}
                        {/* <p>
                            <strong>Year of Study:</strong>{" "}
                            {userData.year_of_study}
                        </p> */}
                    </>
                )}
            </div>
        </div>
    ) : (
        "You need to log in to view this content."
    );
};

export default User;
