import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Forum() {

    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get('http://localhost:5000/getUserRole', { withCredentials: true });
                setUserRole(response.data.role);
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        };

        fetchUserRole();
    }, []);

    return userRole ? (
        <h2>Forum</h2>
    ) : "You need to log in to view this content.";
}
