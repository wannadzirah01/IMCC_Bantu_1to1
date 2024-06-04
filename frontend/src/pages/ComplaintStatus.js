import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ComplaintStatus = ({ invoiceId, packageRequestId }) => {
    const [complaintList, setComplaintList] = useState([]);
    const [userRole, setUserRole] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get("http://localhost:5000/getUserRole", {
                    withCredentials: true,
                });
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, []);

    useEffect(() => {
        const fetchComplaintList = async () => {
            try {
                const endpoint =
                    userRole === "admin"
                        ? "http://localhost:5000/getComplaints"
                        : "http://localhost:5000/getUserComplaints";

                const response = await axios.get(endpoint, { withCredentials: true });
                setComplaintList(response.data);
            } catch (error) {
                console.error("Error fetching complaint list:", error);
            }
        };

        if (userRole) {
            fetchComplaintList();
        }
    }, [userRole]);

    if (!userRole) {
        return "Loading...";
    }

    if (!userRole === "admin" || !userRole === "client") {
        return "You need to login to view this page.";
    }

    return userRole ? (
        <div>
            <h2>Complaints List</h2>
            {complaintList.map((complaint) => (
                <div key={complaint.complaint_id} className="package-container">
                    <div className="package-info">
                        <h4>Complaint ID: {complaint.complaint_id}</h4>
                        <p>Request ID: {complaint.request_id}</p>
                        <p>Details: {complaint.complaint_details}</p>
                        <p>Status: {complaint.complaint_status}</p>
                        <p>Created: {new Date(complaint.complaint_created).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    ) : (
        "You need to log in to view this content."
    );
};

export default ComplaintStatus;