import React, { useEffect, useState } from "react";
import axios from "axios";
import Plotly from "plotly.js-dist";
import { LineChart, Line, XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";

const COLORS = [
    "#E01A38",
    "#41E01A",
    "#1A9BE0",
    "#A11AE0",
    "#E01A9E",
    "#E0561A",
];

const Dashboard = () => {
    const [barChartData, setBarChartData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [postsByDay, setPostsByDay] = useState([]);
    const [postsByMonth, setPostsByMonth] = useState([]);

    const [packageRequests, setPackageRequests] = useState([]);

    useEffect(() => {
        const fetchPackageRequests = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/package_requests_count"
                );
                setPackageRequests(response.data);
            } catch (error) {
                console.error("Error fetching package requests data:", error);
            }
        };

        fetchPackageRequests();
    }, []);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/admin_dashboard",
                    { withCredentials: true }
                );
                setBarChartData(JSON.parse(response.data.bar_chart_json)); // Use the response data directly
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        };

        fetchChartData();
    }, []);

    useEffect(() => {
        if (barChartData) {
            Plotly.newPlot(
                "plotly-chart",
                barChartData.data,
                barChartData.layout
            );
        }
    }, [barChartData]);

    useEffect(() => {
        const fetchCategoryPopularity = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/categoryPopularity"
                );
                setCategories(response.data.category_popularity);
            } catch (error) {
                console.error("Error fetching category popularity:", error);
            }
        };

        fetchCategoryPopularity();
    }, []);

    useEffect(() => {
        const fetchPostsByDate = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/postsByDate"
                );
                setPostsByDay(response.data.posts_by_day);
                setPostsByMonth(response.data.posts_by_month);
            } catch (error) {
                console.error("Error fetching posts by date:", error);
            }
        };

        fetchPostsByDate();
    }, []);

    return (
        <div>
            <h2>Admin Dashboard</h2>
            <div>
                <div className="chart-box">
                    <h3>Package Requests Count</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={packageRequests}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="title" angle={-25} textAnchor="end" height={150} interval={0} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="request_count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="chart-box">
                <h3> QnA Post Category Popularity</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={categories}
                            dataKey="post_count"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            fill="#8884d8"
                            label
                        >
                            {categories.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="post-by-time ">
                <div className="chart-box-1">
                    <h3>Posts by Day</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={postsByDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="post_count"
                                stroke="#8884d8"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="chart-box-1">
                    <h3>Posts by Month</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={postsByMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="post_count"
                                stroke="#82ca9d"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
