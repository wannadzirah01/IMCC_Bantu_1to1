import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../InvoiceStatus.css';
import { useNavigate } from "react-router-dom";

const PackageRequestForm = ({ invoiceId, packageRequestId }) => {
    const [details, setDetails] = useState([]);
    const [formData, setFormData] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [packageRequestStatus, setPackageRequestStatus] = useState('');
    const [submittedDetails, setSubmittedDetails] = useState([]);
    const [submittedPackageRequest, setSubmittedPackageRequest] = useState({});
    const [userRole, setUserRole] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    const navigate = useNavigate();

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

    useEffect(() => {
        const fetchPackageRequest = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/getPackageRequest/${packageRequestId}`, { withCredentials: true });
                setPackageRequestStatus(response.data.status);
                setNewStatus(response.data.status);
                if (response.data.status === 'Pending Approval' || response.data.status === 'Created' || response.data.status === 'Active' || response.data.status === 'Rejected') {
                    setSubmittedDetails(response.data.details);
                    setSubmittedPackageRequest(response.data);
                }
            } catch (error) {
                console.error('Error fetching package request:', error);
            }
        };

        fetchPackageRequest();
    }, [packageRequestId]);

    useEffect(() => {
        const fetchPackageDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/getPackageDetails/${invoiceId}`, { withCredentials: true });
                setDetails(response.data.package_details);
                const initialFormData = {};
                response.data.package_details.forEach(detail => {
                    initialFormData[detail.detail_name] = '';
                });
                setFormData(initialFormData);
            } catch (error) {
                console.error('Error fetching package details:', error);
            }
        };

        fetchPackageDetails();
    }, [invoiceId]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleDetailChange = (event, index) => {
        const { name, value } = event.target;
        const newDetails = [...submittedDetails];
        newDetails[index].value = value;
        setSubmittedDetails(newDetails);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const detailsArray = Object.entries(formData).map(([name, value]) => ({
            detail_name: name,
            value
        }));

        try {
            await axios.post('http://localhost:5000/submitPackageRequest', {
                invoice_id: invoiceId,
                package_request_id: packageRequestId,
                details: detailsArray
            }, { withCredentials: true });

            alert('Package request submitted successfully');
            setSubmitted(true);
            navigate("/invoiceStatus");
        } catch (error) {
            console.error('Error submitting package request:', error);
        }
    };

    const handleStatusUpdate = async () => {
        try {
            await axios.post('http://localhost:5000/submitOrUpdatePackageRequest', {
                package_request_id: packageRequestId,
                status: newStatus,
                details: newStatus === 'Rejected' ? submittedDetails : undefined
            }, { withCredentials: true });

            alert('Package request status updated successfully');
            setPackageRequestStatus(newStatus);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating package request status:', error);
        }
    };

    return (
        <div>
            {packageRequestStatus === 'Pending Approval' || packageRequestStatus === 'Active' || packageRequestStatus === 'Rejected' ? (
                <div className="package-request-form">
                    <br />
                    <h5>Package Request Details</h5>
                    <br />
                    {submittedDetails.map((detail, index) => (
                        <div key={index} className="form-group">
                            {newStatus === 'Rejected' && isEditing ? (
                                <React.Fragment> 
                                    <label>{detail.detail_name}</label>
                                    <input
                                        type="text"
                                        name={detail.detail_name}
                                        value={detail.value}
                                        onChange={(e) => handleDetailChange(e, index)}
                                        className="editable-input"
                                    />      
                                </React.Fragment>
                            ) : (
                                <p><b>{detail.detail_name}:</b> {detail.value}</p>
                            )}
                        </div>
                    ))}
                    <div className="package-request-form">
                    <span><b>Service Status:</b>{' '}
                    {isEditing ? (
                    <select onChange={(e) => setNewStatus(e.target.value)} value={newStatus} className="status-dropdown">
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                    </select>
                    ) : (
                    <span>{submittedPackageRequest.status}</span>
                    )}
                    </span>
                        {(userRole === 'admin' || (userRole === 'client' && packageRequestStatus === 'Rejected')) && (
                            <div className='button-general'>
                                <button onClick={isEditing ? handleStatusUpdate : () => setIsEditing(true)}>
                                    {isEditing ? 'Save' : 'Edit'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="package-request-form">
                    {details.map((detail, index) => (
                        <div key={index} className="form-group">
                            <label>{detail.detail_name}</label>
                            <input
                                type={detail.detail_type === 'text' ? 'text' : detail.detail_type}
                                name={detail.detail_name}
                                value={formData[detail.detail_name] || ''}
                                onChange={handleInputChange}
                                required
                                className="input-field"
                            />
                        </div>
                    ))}
                    <div className="button-general">
                        <button type="submit">Submit</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PackageRequestForm;