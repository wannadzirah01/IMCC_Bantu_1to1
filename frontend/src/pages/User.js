import React, { useEffect, useState } from "react";
import axios from "../api/axios";

const User = () => {
  const [userData, setUserData] = useState(null);

  const logoutUser = async () => {
    await axios.post("//localhost:5000/logout");
    window.location.href = "/";
  };

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

  return (
    <div className="profile-container">
  <div className="profile-user-info">
    <h2>User Profile</h2>
    {userData && (
      <>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Name:</strong> {userData.name}</p>
        <p><strong>Matric Number:</strong> {userData.matric_number}</p>
        <p><strong>Phone Number:</strong> {userData.phone_number}</p>
        <p><strong>School:</strong> {userData.school}</p>
        <p><strong>Year of Study:</strong> {userData.year_of_study}</p>
      </>
    )}
    <div className="button-general">
      <button onClick={logoutUser}>Logout</button>
    </div>
  </div>
</div>
  );
};

export default User;