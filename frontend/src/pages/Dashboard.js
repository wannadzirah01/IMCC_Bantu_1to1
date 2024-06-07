import React, { useEffect, useState } from "react";
import axios from "axios";
import Plotly from "plotly.js-dist"; 

const Dashboard = () => {
    const [barChartData, setBarChartData] = useState(null);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const response = await axios.get("http://localhost:5000/admin_dashboard", { withCredentials: true });
                setBarChartData(JSON.parse(response.data.bar_chart_json)); // Use the response data directly
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        };

        fetchChartData();
    }, []);

    useEffect(() => {
        if (barChartData) {
            Plotly.newPlot('plotly-chart', barChartData.data, barChartData.layout);
        }
    }, [barChartData]);

    return (
        <div>
            <h2>Admin Dashboard</h2>
            <div id="plotly-chart"></div>
        </div>
    );
};

export default Dashboard;