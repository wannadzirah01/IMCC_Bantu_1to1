import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userID, setUserID] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserID = async () => {
      try {
        const response = await axios.get("http://localhost:5000/getUserID", {
          withCredentials: true,
        });
        setUserID(response.data.userID);
      } catch (error) {
        console.error("Error fetching userID:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserID();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ userID, setUserID }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export default UserContext;