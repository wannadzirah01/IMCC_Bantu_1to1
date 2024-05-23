import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../InvoiceStatus.css';
import PackageRequestForm from './PackageRequestForm';  

const InvoiceStatus = () => {
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedFile, setSelectedFile] = useState(null);
    const [remarks, setRemarks] = useState({});
    const [editableInvoice, setEditableInvoice] = useState(null);

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
        const fetchInvoiceStatus = async () => {
            try {
                let response;
                if (userRole === 'admin') {
                    response = await axios.get('http://localhost:5000/getAllInvoiceStatus', { withCredentials: true });
                } else if (userRole === 'client') {
                    response = await axios.get('http://localhost:5000/getInvoiceStatus', { withCredentials: true });
                } else {
                    setLoading(false);
                    return;
                }

                const data = Array.isArray(response.data) ? response.data : [];
                setInvoiceList(data);

                const initialRemarks = {};
                data.forEach(invoice => {
                    if (invoice.invoice_status === 'Payment Rejected') {
                        initialRemarks[invoice.invoice_id] = invoice.remarks;
                    }
                });
                setRemarks(initialRemarks);
            } catch (error) {
                console.error('Error fetching invoice status:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userRole) {
            fetchInvoiceStatus();
        }
    }, [userRole]);

    const handleViewFile = (filename) => {
        const fileUrl = `http://localhost:5000/viewInvoiceFile/${filename}`;
        window.open(fileUrl, '_blank');
    };

    const handleStatusChange = async (invoiceId, newStatus) => {
        try {
            const payload = {
                invoice_id: invoiceId,
                invoice_status: newStatus,
            };

            if (newStatus === 'Payment Rejected') {
                payload.remarks = remarks[invoiceId] || '';
            }

            const response = await axios.post('http://localhost:5000/updateInvoiceStatus', payload, { withCredentials: true });
            setInvoiceList(invoiceList.map(invoice => invoice.invoice_id === invoiceId ? { ...invoice, invoice_status: newStatus, remarks: payload.remarks } : invoice));
            setEditableInvoice(null);
        } catch (error) {
            console.error('Error updating invoice status:', error);
        }
    };

    const handleRemarksChange = (invoiceId, value) => {
        setRemarks({ ...remarks, [invoiceId]: value });
    };

    const handleFileUpload = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleSubmitUpload = async (invoiceId) => {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('invoice_id', invoiceId);

        try {
            const response = await axios.post('http://localhost:5000/uploadInvoice', formData, { 
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data',
                  },
             });
            
            alert('Invoice uploaded successfully');
            console.log(response.data);
            const newFileName = response.data.file_name;

            setInvoiceList(invoiceList.map(invoice =>
                invoice.invoice_id === invoiceId
                    ? { ...invoice, invoice_status: 'Pending Payment', remarks: '', file_name: newFileName }
                    : invoice
            ));

            setSelectedFile(null);
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const handleEditClick = (invoiceId) => {
        const editableInvoiceItem = invoiceList.find(item => item.invoice_id === invoiceId);
        setEditableInvoice(editableInvoiceItem);
    };

    const handleSaveButtonClick = async () => {
        if (editableInvoice) {
            const { invoice_id, invoice_status } = editableInvoice;
            handleStatusChange(invoice_id, invoice_status);
        }
    };

    const filteredInvoiceList = filterStatus === 'All'
        ? invoiceList
        : Array.isArray(filterStatus)
            ? invoiceList.filter(invoice => filterStatus.includes(invoice.package_request_status))
            : invoiceList.filter(invoice => invoice.package_request_status === filterStatus);

    return userRole ? (
        <div>
            <h1>Bantu Service Status</h1>
            <div className="navigation-bar">
                <button onClick={() => setFilterStatus('All')}>All</button>
                <button onClick={() => setFilterStatus(['Pending Approval', 'Created', 'Rejected'])}>Pending Approval</button>
                <button onClick={() => setFilterStatus('Active')}>Active</button>
                <button onClick={() => setFilterStatus('Completed')}>Completed</button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : filteredInvoiceList.length === 0 ? (
                <p>No services found.</p>
            ) : (
                filteredInvoiceList.map((invoiceItem, index) => (
                    <div key={index} className='package-container'>
                        <div className='package-request-form'>
                            <p><b>Package:</b> {invoiceItem.package}</p>
                            {userRole === 'admin' && (
                                <>
                                    <p><b>Client Name:</b> {invoiceItem.user_name}</p>
                                    <p><b>Matric Number:</b> {invoiceItem.matric_number}</p>
                                    <p><b>File Name:</b> {invoiceItem.file_name}</p>
                                    <div className="button-general">
                                        <button onClick={() => handleViewFile(invoiceItem.file_name)}>View File</button>
                                        <div className="divider" />
                                        <button onClick={() => handleEditClick(invoiceItem.invoice_id)}>Edit</button>
                                    </div>
                                </>
                            )}
                            <p>
                                <b>Invoice Status:</b> {userRole === 'admin' ? (
                                    <>
                                        {editableInvoice && editableInvoice.invoice_id === invoiceItem.invoice_id ? (
                                            <select 
                                                onChange={(e) => setEditableInvoice({ ...editableInvoice, invoice_status: e.target.value })} 
                                                value={editableInvoice.invoice_status}
                                            >
                                                <option value="Pending Payment">Pending Payment</option>
                                                <option value="Payment Received">Payment Received</option>
                                                <option value="Payment Rejected">Payment Rejected</option>
                                            </select>
                                        ) : (
                                            invoiceItem.invoice_status
                                        )}
                                        {editableInvoice && editableInvoice.invoice_id === invoiceItem.invoice_id && (
                                            <>
                                                {editableInvoice.invoice_status === 'Payment Rejected' && (
                                                    <input 
                                                        type="text" 
                                                        placeholder="Rejection Reason" 
                                                        value={remarks[editableInvoice.invoice_id] || ''}
                                                        onChange={(e) => handleRemarksChange(editableInvoice.invoice_id, e.target.value)}
                                                    />
                                                )}
                                                <div className='button-container'><button onClick={handleSaveButtonClick}>Save</button></div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    invoiceItem.invoice_status
                                )}
                            </p>
                            {invoiceItem.invoice_status === 'Payment Rejected' && userRole === 'client' && (
                                <div>
                                    <p><b>Rejection Reason:</b> {invoiceItem.remarks}</p>
                                    <div className='button-container-invoice'>
                                        <div className="divider" />
                                        <input type="file" onChange={handleFileUpload} />
                                        <button onClick={() => handleSubmitUpload(invoiceItem.invoice_id)}>Upload Again</button>
                                    </div>
                                </div>
                            )}
                            {((invoiceItem.invoice_status === 'Payment Received' && invoiceItem.package_request_status === 'Active') ||
                            (invoiceItem.invoice_status === 'Payment Received' && invoiceItem.package_request_status === 'Pending Approval') ||
                            (invoiceItem.invoice_status === 'Payment Received' && invoiceItem.package_request_status === 'Submitted') ||
                            (invoiceItem.invoice_status === 'Payment Received' && invoiceItem.package_request_status === 'Created' && userRole === 'client')
                        ) && (
                                <PackageRequestForm 
                                    invoiceId={invoiceItem.invoice_id} 
                                    packageRequestId={invoiceItem.package_request_id} 
                                />
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    ) : "You need to log in to view this content.";
};

export default InvoiceStatus;