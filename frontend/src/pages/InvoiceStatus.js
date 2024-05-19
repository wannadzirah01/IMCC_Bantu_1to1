import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../InvoiceStatus.css';

const InvoiceStatus = () => {
    const [invoiceList, setInvoiceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedFile, setSelectedFile] = useState(null);
    const [remarks, setRemarks] = useState({}); // To manage remarks for each invoice
    const [editableInvoice, setEditableInvoice] = useState(null); // To keep track of the editable invoice item

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

                // Set initial remarks
                const initialRemarks = {};
                data.forEach(invoice => {
                    if (invoice.invoice_status === 'Rejected') {
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

            if (newStatus === 'Rejected') {
                payload.remarks = remarks[invoiceId] || '';
            }

            const response = await axios.post('http://localhost:5000/updateInvoiceStatus', payload, { withCredentials: true });
            setInvoiceList(invoiceList.map(invoice => invoice.invoice_id === invoiceId ? { ...invoice, invoice_status: newStatus, remarks: payload.remarks } : invoice));
            setEditableInvoice(null); // Reset editable invoice after saving
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
            // Update the invoice status in the state
            // Extract the new file name from the response
            const newFileName = response.data.file_name;

            // Update the invoice status and file name in the state
            setInvoiceList(invoiceList.map(invoice =>
                invoice.invoice_id === invoiceId
                    ? { ...invoice, invoice_status: 'Pending Approval', remarks: '', file_name: newFileName }
                    : invoice
            ));

            // Clear the selected file
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
        : invoiceList.filter(invoice => invoice.invoice_status === filterStatus);

    return userRole ? (
        <div>
            <h1>Invoice Status</h1>
            <div className="navigation-bar">
                <button onClick={() => setFilterStatus('All')}>All</button>
                <button onClick={() => setFilterStatus('Pending Approval')}>Pending Approval</button>
                <button onClick={() => setFilterStatus('Rejected')}>Rejected</button>
                <button onClick={() => setFilterStatus('Approved')}>Approved</button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : filteredInvoiceList.length === 0 ? (
                <p>No invoices found.</p>
            ) : (
                filteredInvoiceList.map((invoiceItem, index) => (
                    <div key={index} className='package-container'>
                        <div className='package-info'>
                            <p><b>File Name:</b> {invoiceItem.file_name}</p>
                            <p><b>Package:</b> {invoiceItem.package}</p>
                            <p>
                                <b>Status:</b> {userRole === 'admin' ? (
                                    <>
                                        {editableInvoice && editableInvoice.invoice_id === invoiceItem.invoice_id ? (
                                            <select 
                                                onChange={(e) => setEditableInvoice({ ...editableInvoice, invoice_status: e.target.value })} 
                                                value={editableInvoice.invoice_status}
                                            >
                                                <option value="Pending Approval">Pending Approval</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        ) : (
                                            invoiceItem.invoice_status
                                        )}
                                        {editableInvoice && editableInvoice.invoice_id === invoiceItem.invoice_id && (
                                            <>
                                                {editableInvoice.invoice_status === 'Rejected' && (
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
                            {invoiceItem.invoice_status === 'Rejected' && userRole === 'client' && (
                                <div>
                                    <p><b>Rejection Reason:</b> {invoiceItem.remarks}</p>
                                    <div className='button-container-invoice'>
                                    <div class="divider" />
                                    <input type="file" onChange={handleFileUpload} />
                                    <button onClick={() => handleSubmitUpload(invoiceItem.invoice_id)}>Upload Again</button>
                                </div>
                                </div>
                                
                            )}
                            <p><b>Uploaded Date:</b> {invoiceItem.uploaded_datetime}</p>
                            {userRole === 'admin' && (
                                <>
                                    <p><b>Client Name:</b> {invoiceItem.user_name}</p>
                                    <p><b>Matric Number:</b> {invoiceItem.matric_number}</p>
                                    <div className="button-general">
                                        <button onClick={() => handleViewFile(invoiceItem.file_name)}>View File</button>
                                        <div class="divider" />
                                        <button onClick={() => handleEditClick(invoiceItem.invoice_id)}>Edit</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    ) : "You need to log in to view this content.";
};

export default InvoiceStatus;