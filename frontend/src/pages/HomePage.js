// import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Button, Modal, Form } from "react-bootstrap"; // Importing Modal and Form from react-bootstrap
import "../InvoiceStatus.css";
import PackageRequestForm from "./PackageRequestForm";
import ComplaintModal from "../components/ComplaintModal";

const PackageStatus = () => {
    const [details, setDetails] = useState(packageRequestDetails);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [formData, setFormData] = useState({});
    const [invoiceId, setInvoiceId] = useState("");
    const [submittedDetails, setSubmittedDetails] = useState([]);
    const [invoiceList, setInvoiceList] = useState([]);
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
        const fetchInvoiceStatus = async () => {
            try {
                let response;
                if (userRole === "admin") {
                    response = await axios.get(
                        "http://localhost:5000/getAllTickets",
                        { withCredentials: true }
                    );
                } else if (userRole === "client") {
                    response = await axios.get(
                        "http://localhost:5000/getUserTickets",
                        {
                            withCredentials: true,
                        }
                    );
                } else {
                    setLoading(false);
                    return;
                }

                const data = Array.isArray(response.data) ? response.data : [];
                setInvoiceList(data);

                const initialRemarks = {};
                data.forEach((invoice) => {
                    if (invoice.invoice_status === "Payment Rejected") {
                        initialRemarks[invoice.invoice_id] = invoice.remarks;
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
            fetchInvoiceStatus();
        }
    }, [userRole]);

    const handleViewFile = (filename) => {
        const fileUrl = `http://localhost:5000/viewInvoiceFile/${filename}`;
        window.open(fileUrl, "_blank");
    };

    const handleFileUpload = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleSubmitUpload = async (invoiceId) => {
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

            setInvoiceList(
                invoiceList.map((invoice) =>
                    invoice.invoice_id === invoiceId
                        ? {
                              ...invoice,
                              invoice_status: "Pending Payment",
                              remarks: "",
                              file_name: newFileName,
                          }
                        : invoice
                )
            );

            setSelectedFile(null);
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    const toggleExpand = async (invoiceId, packageRequestId) => {
        setExpandedInvoices((prev) => ({
            ...prev,
            [invoiceId]: !prev[invoiceId],
        }));

        try {
            const response = await axios.get(
                `http://localhost:5000/getPackageRequest/${packageRequestId}`,
                {
                    withCredentials: true,
                }
            );
            console.log(response.data);

            const packageRequestStatus = response.data.status;

            if (
                packageRequestStatus === "Pending Package Details Approval" ||
                packageRequestStatus === "Package Details Approved"
            ) {
                const details = response.data.details;

                setPackageRequestDetails(details);
            }
        } catch (error) {
            console.error("Error fetching package details:", error);
        }
    };

    const handleEditModalClose = () => {
        setShowEditModal(false);
        setApprovalStatus("");
        setRejectionReason("");
    };

    const handleEditModalShow = (invoice) => {
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

            if (editableTicket.package_request_status === newStatus) {
                console.log("No changes made to the status.");
                return;
            }

            const response = await axios.post(
                "http://localhost:5000/updateInvoiceStatus",
                data,
                { withCredentials: true }
            );

            setShowEditModal(false);
            setInvoiceList((prevInvoiceList) =>
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

    const handlePackageDetailChange = (e, index) => {
        const { name, value } = e.target;
        const updatedDetails = details.map((detail, i) =>
            i === index ? { ...detail, value } : detail
        );
        setDetails(updatedDetails);
    };

    const handleDetailChange = (e, index) => {
        const { name, value } = e.target;
        setSubmittedDetails((prevDetails) => {
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
            setShowTicketDetailsFormModal(false); // Close the modal on success

            // Update the invoice list to reflect the new status
            setTicketDetails((prevInvoiceList) =>
                prevInvoiceList.map((ticket) =>
                    ticket.package_request_id === editableTicket
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

            // Check if the new status is different from the original status
            if (editableTicket.package_request_status === newStatus) {
                console.log("No changes made to the status.");
                return; // Exit function if no changes made
            }

            const response = await axios.post(
                "http://localhost:5000/updatePackageRequestStatus",
                data,
                { withCredentials: true }
            );

            // Update the frontend state to reflect the updated invoice status
            setShowEditModal(false);
        } catch (error) {
            console.error("Error updating invoice status:", error);
        }
    };

    const filteredInvoiceList =
        filterStatus === "All"
            ? invoiceList
            : Array.isArray(filterStatus)
            ? invoiceList.filter((invoice) =>
                  filterStatus.includes(invoice.package_request_status)
              )
            : invoiceList.filter(
                  (invoice) => invoice.package_request_status === filterStatus
              );

    return userRole ? (
        <div>
            <h2>Bantu Service Status</h2>
            <div className="navigation-bar">
                <button onClick={() => setFilterStatus("All")}>All</button>
                <button
                    onClick={() =>
                        setFilterStatus([
                            "Pending Receipt Approval",
                            "Receipt Approved",
                            "Receipt Rejected",
                        ])
                    }
                >
                    Pending
                </button>
                <button
                    onClick={() =>
                        setFilterStatus(["Active", "Package Details Approved"])
                    }
                >
                    Active
                </button>
                <button onClick={() => setFilterStatus("Completed")}>
                    Completed
                </button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : filteredInvoiceList.length === 0 ? (
                <p>No services found.</p>
            ) : (
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
                            {ticketList.invoice_status === "Receipt Rejected" &&
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
                                            "Package Details Approved") && (
                                        <>
                                            {packageRequestDetails?.map(
                                                (detail, index) => (
                                                    <p>
                                                        <b>
                                                            {detail.detail_name}
                                                            :
                                                        </b>{" "}
                                                        {detail.value}
                                                    </p>
                                                )
                                            )}
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
                                            handleEditModalShow(ticketList)
                                        }
                                    >
                                        Manage Receipt
                                    </button>
                                </div>
                            )}
                        {userRole === "admin" &&
                            ticketList.package_request_status ===
                                "Pending Package Details Approval" && (
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
                    </div>
                ))
            )}
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
                                    console.log(e.target.value);
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
                                        handleDetailChange(e, index)
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

                    {packageRequestDetails?.map((detail, index) => (
                        <div key={index} className="form-group">
                            {approvalStatus === "Package Details Rejected" ? (
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
                                            handlePackageDetailChange(e, index)
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
        </div>
    ) : (
        "You need to log in to view this content."
    );
};

export default PackageStatus;