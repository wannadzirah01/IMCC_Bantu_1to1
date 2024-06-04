import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import axios from 'axios';

const ComplaintModal = ({ isOpen, onClose, packageRequestId }) => {
    const [complaintDetails, setComplaintDetails] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = () => {
        console.log(packageRequestId)
        if (complaintDetails.trim() !== "") {
            setLoading(true);
            axios.post(
                "http://localhost:5000/addComplaints",
                {
                    packageRequestId: packageRequestId,
                    complaintDetails: complaintDetails
                },
                { withCredentials: true }
            )
            .then((response) => {
                setLoading(false);
                // Do something after successful submission, like closing the modal
                onClose();
            })
            .catch((error) => {
                setLoading(false);
                setError("Error submitting complaint details. Please try again later.");
            });
        } else {
            setError("Please fill out all fields.");
        }
    };

    const handleClose = () => {
        onClose(); // Close the modal without submitting
        setComplaintDetails("");
    };

    return (
        <Modal show={isOpen} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Complaint Form</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form>
                    <Form.Group controlId="complaintDetails">
                        <Form.Label>Details</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter complaint Details"
                            value={complaintDetails}
                            onChange={(e) => setComplaintDetails(e.target.value)} />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    {loading ? <Spinner animation="border" size="sm" /> : "Submit"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ComplaintModal;