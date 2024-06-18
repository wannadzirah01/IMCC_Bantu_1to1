import React, { useEffect, useState } from "react";
import axios from "axios";
import Plotly from "plotly.js-dist";
import {
    LineChart,
    Line,
    XAxis,
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
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({});

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
                setBarChartData(JSON.parse(response.data.bar_chart_json));
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

    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             const response = await axios.get(
    //                 "http://localhost:5000/getTicketCounts",
    //                 { withCredentials: true }
    //             );
    //             const statusCounts = response.data.status_counts;
    //             const formattedData = Object.keys(statusCounts).map(
    //                 (status) => ({
    //                     status,
    //                     count: statusCounts[status],
    //                 })
    //             );
    //             setData(formattedData);
    //             setLoading(false);
    //         } catch (error) {
    //             console.error("Error fetching ticket counts", error);
    //             setLoading(false);
    //         }
    //     };

    //     fetchData();
    // }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/getTicketCounts",
                    { withCredentials: true }
                );
                setCounts(response.data.status_counts);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching ticket counts", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const CustomXAxisTick = (props) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="end"
                    fill="#FFFF"
                    transform="rotate(-35)"
                    fontSize="12px"
                    fontFamily="Arial, sans-serif"
                >
                    {payload.value}
                </text>
            </g>
        );
    };

    const CustomYAxisTick = (props) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={-10}
                    y={0}
                    dy={3}
                    textAnchor="end"
                    fill="#FFFF"
                    fontSize="12px"
                    fontFamily="Arial, sans-serif"
                >
                    {payload.value}
                </text>
            </g>
        );
    };

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
                    <h3>Tickets Count</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={packageRequests}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="title"
                                angle={-10}
                                textAnchor="end"
                                height={180}
                                interval={0}
                                tick={<CustomXAxisTick />}
                            />
                            <YAxis tick={<CustomYAxisTick />} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="request_count" fill="#f68b1e" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* <div className="chart-box">
                    <h3>Ticket Counts by Status</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="status" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div> */}
                <div className="tickets-data">
                    <div className="chart-box-0">
                        <h3>Ticket Counts by Status</h3>

                        <h4>Pending : {counts.Pending}</h4>

                        <h4>Active : {counts.Active}</h4>

                        <h4>Completed : {counts.Completed}</h4>

                        <h4>
                            Total :{" "}
                            {counts.Pending + counts.Active + counts.Completed}
                        </h4>
                    </div>
                </div>
            </div>
            <div className="post-by-time">
                <div className="chart-box-1">
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
                {/* <div className="chart-box-1">
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
                </div> */}
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
