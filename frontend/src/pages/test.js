import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Button, Modal, Form, Pagination } from "react-bootstrap";
import "../InvoiceStatus.css";

const PackageStatus = () => {
    const [activeButton, setActiveButton] = useState("All");
    const [ticketDetails, setTicketDetails] = useState([]);
    const [formData, setFormData] = useState({});
    const [invoiceId, setInvoiceId] = useState("");
    const [submittedDetails, setSubmittedDetails] = useState([]);
    const [ticketList, setTicketList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedFile, setSelectedFile] = useState(null);
    const [remarks, setRemarks] = useState({});
    const [editableTicket, setEditableTicket] = useState(null);
    const [packageRequestDetails, setPackageRequestDetails] = useState(null);
    const [expandedInvoices, setExpandedInvoices] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEditPackageDetailsModal, setShowEditPackageDetailsModal] =
        useState(false);
    const [showTicketDetailsFormModal, setShowTicketDetailsFormModal] =
        useState(false);
    const [approvalStatus, setApprovalStatus] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);
    const [confirmationRequestId, setConfirmationRequestId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTickets, setTotalTickets] = useState(0);

    const ticketsPerPage = 10;

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get(
                    "http://localhost:5000/getUserRole",
                    {
                        withCredentials: true,
                    }
                );
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, []);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                let response;
                if (userRole === "admin") {
                    response = await axios.get(
                        "http://localhost:5000/getAllTickets",
                        {
                            withCredentials: true,
                            params: {
                                page: currentPage,
                                limit: ticketsPerPage,
                            },
                        }
                    );
                } else if (userRole === "client") {
                    response = await axios.get(
                        "http://localhost:5000/getUserTickets",
                        { withCredentials: true }
                    );
                } else {
                    setLoading(false);
                    return;
                }

                const data = response.data;
                if (userRole === "admin") {
                    setTicketList(data.ticket_list);
                    setTotalTickets(data.total_tickets);
                } else {
                    setTicketList(data);
                }

                const initialRemarks = {};
                data.ticket_list.forEach((ticket) => {
                    if (ticket.invoice_status === "Payment Rejected") {
                        initialRemarks[ticket.invoice_id] = ticket.remarks;
                    }
                });
                setRemarks(initialRemarks);
            } catch (error) {
                console.error("Error fetching invoice status:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userRole) {
            fetchTickets();
        }
    }, [userRole, currentPage]);

    const handleViewFile = (filename) => {
        const fileUrl = `http://localhost:5000/viewInvoiceFile/${filename}`;
        window.open(fileUrl, "_blank");
    };

    const handleFileUpload = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleSubmitUpload = async (invoiceId) => {
        if (!selectedFile) {
            alert("Please select a file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("invoice_id", invoiceId);

        try {
            const response = await axios.post(
                "http://localhost:5000/uploadInvoice",
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            alert("Invoice uploaded successfully");
            console.log(response.data);
            const newFileName = response.data.file_name;

            setTicketList((prevInvoiceList) =>
                prevInvoiceList.map((invoice) =>
                    invoice.invoice_id === invoiceId
                        ? {
                              ...invoice,
                              package_request_status:
                                  "Pending Receipt Approval",
                              file_name: newFileName,
                              remarks: "", // Clear remarks after uploading
                          }
                        : invoice
                )
            );

            setSelectedFile(null);
            document.getElementById(`file-input-${invoiceId}`).value = null;
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload invoice. Please try again.");
        }
    };

    const toggleExpand = async (invoiceId, packageRequestId) => {
        setExpandedInvoices((prevState) => ({
            ...prevState,
            [invoiceId]: !prevState[invoiceId],
        }));

        // Fetch details if expanding
        if (!expandedInvoices[invoiceId]) {
            try {
                const response = await axios.get(
                    `http://localhost:5000/getPackageRequest/${packageRequestId}`,
                    { withCredentials: true }
                );
                console.log(response.data);

                const packageRequestStatus = response.data.status;

                if (
                    packageRequestStatus ===
                        "Pending Package Details Approval" ||
                    packageRequestStatus === "Package Details Approved" ||
                    packageRequestStatus === "Package Details Rejected" ||
                    packageRequestStatus === "Completed" ||
                    packageRequestStatus ===
                        "Package Details Rejected. Waiting for admin response." ||
                    packageRequestStatus ===
                        "Package Details Rejected. Waiting for client response."
                ) {
                    const details = response.data.details;

                    // Update details for the specific invoiceId
                    setTicketDetails((prevState) => ({
                        ...prevState,
                        [invoiceId]: details,
                    }));
                }
            } catch (error) {
                console.error("Error fetching package details:", error);
            }
        }
    };

    const handleEditModalClose = () => {
        setShowEditModal(false);
        setApprovalStatus("");
        setRejectionReason("");
    };

    const handleManageReceiptModalShow = (invoice) => {
        setEditableTicket(invoice);
        setShowEditModal(true);
    };

    const handleEditPackageDetailsModalShow = (invoice) => {
        setEditableTicket(invoice);
        setShowEditPackageDetailsModal(true);
    };

    const handleEditPackageDetailsModalClose = () => {
        setShowEditPackageDetailsModal(false);
        setApprovalStatus("");
        setRejectionReason("");
    };

    const handleReceiptStatus = async (ticketId, newStatus) => {
        try {
            const data = {
                ticket_id: ticketId,
                invoice_status: newStatus,
            };

            if (newStatus === "Receipt Rejected") {
                data.remarks = rejectionReason;
            }

            const response = await axios.post(
                "http://localhost:5000/updateInvoiceStatus",
                data,
                { withCredentials: true }
            );
            alert("Receipt status updated successfully");

            setShowEditModal(false);
            setTicketList((prevInvoiceList) =>
                prevInvoiceList.map((invoice) =>
                    invoice.package_request_id === ticketId
                        ? {
                              ...invoice,
                              package_request_status: data.invoice_status,
                              remarks: data.remarks || null,
                          }
                        : invoice
                )
            );
        } catch (error) {
            console.error("Error updating invoice status:", error);
        }
    };

    const handleTicketDetailsShow = async (invoice_id) => {
        setInvoiceId(invoice_id);
        console.log(invoice_id);
        setShowTicketDetailsFormModal(true);

        try {
            const response = await axios.get(
                `http://localhost:5000/getPackageDetails/${invoice_id}`,
                { withCredentials: true }
            );
            console.log(response);
            setSubmittedDetails(response.data.package_details);
            const initialFormData = {};
            response.data.package_details.forEach((detail) => {
                initialFormData[detail.detail_name] = detail.value || "";
            });
            setFormData(initialFormData);
        } catch (error) {
            console.error("Error fetching package details:", error);
        }
    };

    const handleNewAddedPackageDetail = (e, index) => {
        const { name, value } = e.target;
        setSubmittedDetails((prevDetails) => {
            const updatedDetails = [...prevDetails];
            updatedDetails[index] = { ...updatedDetails[index], value };
            return updatedDetails;
        });
    };

    const handleDetailChange = (e, index) => {
        const { name, value } = e.target;
        setPackageRequestDetails((prevDetails) => {
            const updatedDetails = [...prevDetails];
            updatedDetails[index] = { ...updatedDetails[index], value };
            return updatedDetails;
        });
    };

    const handleSubmitTicketDetails = async () => {
        try {
            const data = {
                package_request_id: invoiceId,
                details: submittedDetails,
            };
            const response = await axios.post(
                "http://localhost:5000/submitPackageRequest",
                data,
                { withCredentials: true }
            );
            console.log(response.data);
            alert("Package request submitted successfully");
            setShowTicketDetailsFormModal(false);

            setTicketList((prevInvoiceList) =>
                prevInvoiceList.map((ticket) =>
                    ticket.package_request_id === invoiceId
                        ? {
                              ...ticket,
                              package_request_status:
                                  "Pending Package Details Approval",
                          }
                        : ticket
                )
            );
        } catch (error) {
            console.error("Error submitting package request:", error);
            alert("Error submitting package request");
        }
    };

    const handlePackageDetailsStatus = async (ticketId, newStatus) => {
        try {
            const data = {
                request_id: ticketId,
                status: newStatus,
            };

            let response;
            if (newStatus === "Package Details Rejected") {
                if (userRole === "admin") {
                    newStatus =
                        "Package Details Rejected. Waiting for client response.";
                } else if (userRole === "client") {
                    newStatus =
                        "Package Details Rejected. Waiting for admin response.";
                }

                await axios.post(
                    "http://localhost:5000/submitOrUpdatePackageRequest",
                    {
                        package_request_id: ticketId,
                        status: newStatus,
                        details: packageRequestDetails,
                    },
                    { withCredentials: true }
                );
                alert("Package request status updated successfully");
                setShowEditPackageDetailsModal(false);
            } else {
                response = await axios.post(
                    "http://localhost:5000/updatePackageRequestStatus",
                    data,
                    { withCredentials: true }
                );

                alert("Package request status updated successfully");
                setShowEditPackageDetailsModal(false);
            }

            setShowEditModal(false);

            setTicketList((prevInvoiceList) =>
                prevInvoiceList.map((invoice) =>
                    invoice.package_request_id === ticketId
                        ? { ...invoice, package_request_status: newStatus }
                        : invoice
                )
            );
        } catch (error) {
            console.error("Error updating package request status:", error);
        }
    };

    const handleCloseTicket = (id) => {
        setConfirmationRequestId(id);
        setShowCloseTicketModal(true);
    };

    const handleConfirmClose = async () => {
        try {
            const data = {
                request_id: confirmationRequestId,
                status: "Completed",
            };
            const response = await axios.post(
                "http://localhost:5000/updatePackageRequestStatus",
                data,
                { withCredentials: true }
            );
            if (response.status === 200) {
                alert("Ticket is close");
                setTicketList((prevInvoiceList) =>
                    prevInvoiceList.map((invoice) =>
                        invoice.package_request_id === confirmationRequestId
                            ? {
                                  ...invoice,
                                  package_request_status: data.status,
                              }
                            : invoice
                    )
                );
            }
        } catch (error) {
            alert("Failed to close the ticket");
        }
        setConfirmationRequestId(null);
        setShowCloseTicketModal(false);
    };

    const handleCloseTicketModalClose = () => {
        setShowCloseTicketModal(false);
    };

    const filteredInvoiceList = Array.isArray(ticketList)
        ? filterStatus === "All"
            ? ticketList
            : Array.isArray(filterStatus)
            ? ticketList.filter((invoice) =>
                  filterStatus.includes(invoice.package_request_status)
              )
            : ticketList.filter(
                  (invoice) => invoice.package_request_status === filterStatus
              )
        : [];

    const handleButtonClick = (status) => {
        setActiveButton(status);
        if (status === "All") {
            setFilterStatus("All");
        } else if (status === "Pending") {
            setFilterStatus([
                "Pending Receipt Approval",
                "Receipt Approved",
                "Receipt Rejected",
                "Pending Package Details Approval",
                "Package Details Rejected",
                "Package Details Rejected. Waiting for admin response.",
                "Package Details Rejected. Waiting for client response.",
            ]);
        } else if (status === "Active") {
            setFilterStatus(["Active", "Package Details Approved"]);
        } else if (status === "Completed") {
            setFilterStatus("Completed");
        }
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const renderPagination = () => {
        const totalPages = Math.ceil(totalTickets / ticketsPerPage);
        let items = [];
        for (let number = 1; number <= totalPages; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => handlePageChange(number)}
                >
                    {number}
                </Pagination.Item>
            );
        }
        return <Pagination>{items}</Pagination>;
    };
    return userRole ? (
        <div>
            <h2>Bantu 1-to-1 Service Management</h2>
            <div className="navigation-bar">
                <button
                    className={activeButton === "All" ? "active" : ""}
                    onClick={() => handleButtonClick("All")}
                >
                    All
                </button>
                <button
                    className={activeButton === "Pending" ? "active" : ""}
                    onClick={() => handleButtonClick("Pending")}
                >
                    Pending
                </button>
                <button
                    className={activeButton === "Active" ? "active" : ""}
                    onClick={() => handleButtonClick("Active")}
                >
                    Active
                </button>
                <button
                    className={activeButton === "Completed" ? "active" : ""}
                    onClick={() => handleButtonClick("Completed")}
                >
                    Completed
                </button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : filteredInvoiceList.length === 0 ? (
                <p>No services found.</p>
            ) : (
                Array.isArray(filteredInvoiceList) &&
                filteredInvoiceList.map((ticketList, index) => (
                    <div
                        key={index}
                        className="package-container"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div className="package-request-form">
                            <p>
                                <b>Ticket ID:</b>{" "}
                                {ticketList.package_request_id}
                            </p>
                            <p>
                                <b>Package:</b> {ticketList.package}
                            </p>
                            <p>
                                <b>Status:</b>{" "}
                                {ticketList.package_request_status}
                            </p>
                            {ticketList.package_request_status ===
                                "Receipt Rejected" &&
                                userRole === "client" && (
                                    <div>
                                        <p>
                                            <b>Rejection Reason:</b>{" "}
                                            {ticketList.remarks}
                                        </p>
                                        <div className="button-container-invoice">
                                            <div className="divider" />
                                            <input
                                                type="file"
                                                onChange={handleFileUpload}
                                                id={`file-input-${ticketList.invoice_id}`}
                                                accept="application/pdf"
                                                key={`file-input-${ticketList.invoice_id}`}
                                            />
                                            <button
                                                onClick={() =>
                                                    handleSubmitUpload(
                                                        ticketList.invoice_id
                                                    )
                                                }
                                            >
                                                Upload Again
                                            </button>
                                        </div>
                                    </div>
                                )}
                            {expandedInvoices[ticketList.invoice_id] && (
                                <>
                                    {userRole === "admin" && (
                                        <>
                                            <p>
                                                <b>Client Name:</b>{" "}
                                                {ticketList.user_name}
                                            </p>
                                            <p>
                                                <b>Client Email:</b>{" "}
                                                {ticketList.email}
                                            </p>
                                        </>
                                    )}
                                    {(ticketList.package_request_status ===
                                        "Pending Package Details Approval" ||
                                        ticketList.package_request_status ===
                                            "Package Details Approved" ||
                                        ticketList.package_request_status ===
                                            "Package Details Rejected" ||
                                        ticketList.package_request_status ===
                                            "Completed" ||
                                        ticketList.package_request_status ===
                                            "Package Details Rejected. Waiting for admin response." ||
                                        ticketList.package_request_status ===
                                            "Package Details Rejected. Waiting for client response.") && (
                                        <>
                                            {ticketDetails[
                                                ticketList.invoice_id
                                            ]?.map((detail, index) => (
                                                <p key={index}>
                                                    <b>{detail.detail_name}:</b>{" "}
                                                    {detail.value}
                                                </p>
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                            <Link
                                onClick={() =>
                                    toggleExpand(
                                        ticketList.invoice_id,
                                        ticketList.package_request_id
                                    )
                                }
                            >
                                {expandedInvoices[ticketList.invoice_id]
                                    ? "View Less"
                                    : "View More"}
                            </Link>
                        </div>
                        {userRole === "admin" &&
                            ticketList.package_request_status ===
                                "Pending Receipt Approval" && (
                                <div className="button-general">
                                    <button
                                        onClick={() =>
                                            handleManageReceiptModalShow(
                                                ticketList
                                            )
                                        }
                                    >
                                        Manage Receipt
                                    </button>
                                </div>
                            )}
                        {((userRole === "admin" &&
                            ticketList.package_request_status ===
                                "Pending Package Details Approval") ||
                            (userRole === "client" &&
                                ticketList.package_request_status ===
                                    "Package Details Rejected. Waiting for client response.") ||
                            (userRole === "admin" &&
                                ticketList.package_request_status ===
                                    "Package Details Rejected. Waiting for admin response.")) && (
                            <div className="button-general">
                                <button
                                    onClick={() =>
                                        handleEditPackageDetailsModalShow(
                                            ticketList
                                        )
                                    }
                                >
                                    Manage Package Details
                                </button>
                            </div>
                        )}
                        {userRole === "client" &&
                            ticketList.package_request_status ===
                                "Receipt Approved" && (
                                <div className="button-general">
                                    <button
                                        onClick={() =>
                                            handleTicketDetailsShow(
                                                ticketList.invoice_id
                                            )
                                        }
                                    >
                                        Package Request Details Form
                                    </button>
                                </div>
                            )}
                        {userRole === "admin" &&
                            ticketList.package_request_status ===
                                "Package Details Approved" && (
                                <div className="button-general">
                                    <button
                                        onClick={() =>
                                            handleCloseTicket(
                                                ticketList.package_request_id
                                            )
                                        }
                                    >
                                        Close Ticket
                                    </button>
                                </div>
                            )}
                        {confirmationRequestId ===
                            ticketList.package_request_id && (
                            <Modal
                                show={showCloseTicketModal}
                                onHide={handleCloseTicketModalClose}
                            >
                                <Modal.Title>
                                    Close Ticket Confirmation
                                </Modal.Title>
                                <Modal.Body>
                                    Please confirm you want to close the ticket.
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            setConfirmationRequestId(null)
                                        }
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleConfirmClose}
                                    >
                                        Confirm
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        )}
                    </div>
                ))
            )}
            <div className="d-flex justify-content-center mt-4">
                {renderPagination()}
            </div>

            <Modal show={showEditModal} onHide={handleEditModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Ticket Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        <b>Ticket ID:</b> {editableTicket?.package_request_id}
                    </p>
                    <p>
                        <b>Package:</b> {editableTicket?.package}
                    </p>
                    <p>
                        <b>Client Name:</b> {editableTicket?.user_name}
                    </p>
                    <p>
                        <b>Client Email:</b> {editableTicket?.email}
                    </p>
                    <p>
                        <b>Receipt File:</b>{" "}
                        <span
                            style={{
                                display: "inline-block",
                                color: "blue",
                                textDecoration: "underline",
                                cursor: "pointer",
                                maxWidth: "300px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                            onClick={() =>
                                handleViewFile(editableTicket?.file_name)
                            }
                        >
                            {editableTicket?.file_name}
                        </span>
                    </p>
                    <p>
                        <Form.Group
                            controlId="approvalStatus"
                            className="d-flex align-items-center"
                            style={{ marginBottom: "0" }}
                        >
                            <Form.Label className="mr-2 mb-0">
                                <b>Status:</b>{" "}
                            </Form.Label>
                            <Form.Control
                                as="select"
                                value={approvalStatus}
                                onChange={(e) => {
                                    setApprovalStatus(e.target.value);
                                }}
                            >
                                <option value="Pending Payment Approval">
                                    Pending Payment Approval
                                </option>
                                <option value="Receipt Approved">
                                    Receipt Approved
                                </option>
                                <option value="Receipt Rejected">
                                    Receipt Rejected
                                </option>
                            </Form.Control>
                        </Form.Group>
                    </p>

                    {approvalStatus === "Receipt Rejected" && (
                        <Form.Group controlId="rejectionReason">
                            <Form.Label>Rejection Reason:</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={rejectionReason}
                                onChange={(e) =>
                                    setRejectionReason(e.target.value)
                                }
                            />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleEditModalClose}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() =>
                            handleReceiptStatus(
                                editableTicket?.package_request_id,
                                approvalStatus
                            )
                        }
                    >
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal
                show={showEditPackageDetailsModal}
                onHide={handleEditPackageDetailsModalClose}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Manage Ticket Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        <b>Ticket ID:</b> {editableTicket?.package_request_id}
                    </p>
                    <p>
                        <b>Package:</b> {editableTicket?.package}
                    </p>
                    <p>
                        <b>Client Name:</b> {editableTicket?.user_name}
                    </p>
                    <p>
                        <b>Client Email:</b> {editableTicket?.email}
                    </p>
                    <p>
                        <b>Receipt File:</b>{" "}
                        <span
                            onClick={() =>
                                handleViewFile(editableTicket?.file_name)
                            }
                            style={{
                                color: "blue",
                                textDecoration: "underline",
                                cursor: "pointer",
                            }}
                        >
                            {editableTicket?.file_name}
                        </span>
                    </p>
                    {packageRequestDetails?.map((detail, index) => (
                        <div key={index}>
                            {approvalStatus === "Package Details Rejected" ? (
                                <React.Fragment>
                                    <b>
                                        <label>{detail.detail_name}:</label>
                                    </b>
                                    <input
                                        type={
                                            detail.detail_type === "text"
                                                ? "text"
                                                : detail.detail_type
                                        }
                                        name={detail.detail_name}
                                        value={detail.value}
                                        onChange={(e) =>
                                            handleDetailChange(e, index)
                                        }
                                        className="editable-input"
                                    />
                                </React.Fragment>
                            ) : (
                                <p>
                                    <b>{detail.detail_name}:</b> {detail.value}
                                </p>
                            )}
                        </div>
                    ))}

                    <Form.Group controlId="approvalStatus">
                        <Form.Label>
                            <b>Status:</b>{" "}
                        </Form.Label>
                        <Form.Control
                            as="select"
                            value={approvalStatus}
                            onChange={(e) => {
                                setApprovalStatus(e.target.value);
                                console.log(e.target.value);
                            }}
                        >
                            <option value="Pending Package Details Approval">
                                Pending Package Details Approval
                            </option>
                            <option value="Package Details Approved">
                                Package Details Approved
                            </option>
                            <option value="Package Details Rejected">
                                Package Details Rejected
                            </option>
                        </Form.Control>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleEditPackageDetailsModalClose}
                    >
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() =>
                            handlePackageDetailsStatus(
                                editableTicket?.package_request_id,
                                approvalStatus
                            )
                        }
                    >
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Ticket Details Form Modal */}
            <Modal
                show={showTicketDetailsFormModal}
                onHide={() => setShowTicketDetailsFormModal(false)}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Update Ticket Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {submittedDetails.map((detail, index) => (
                        <div key={index} className="form-group">
                            <React.Fragment>
                                <label>{detail.detail_name}</label>
                                <input
                                    type={
                                        detail.detail_type === "text"
                                            ? "text"
                                            : detail.detail_type
                                    }
                                    name={detail.detail_name}
                                    value={detail.value}
                                    onChange={(e) =>
                                        handleNewAddedPackageDetail(e, index)
                                    }
                                    className="editable-input"
                                />
                            </React.Fragment>
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowTicketDetailsFormModal(false)}
                    >
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleSubmitTicketDetails()}
                    >
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    ) : (
        "You need to log in to view this content."
    );
};

export default PackageStatus;
