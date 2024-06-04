import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import axios from 'axios';

const MentorDetailsModal = ({ isOpen, onClose, packageRequestId }) => {
    const [mentorName, setMentorName] = useState("");
    const [mentorEmail, setMentorEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = () => {
        console.log(packageRequestId)
        if (mentorName.trim() !== "" && mentorEmail.trim() !== "") {
            setLoading(true);
            axios.post(
                "http://localhost:5000/addMentorDetails",
                {
                    packageRequestId: packageRequestId,
                    mentorEmail: mentorEmail,
                    mentorName: mentorName,
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
                setError("Error adding mentor details. Please try again later.");
            });
        } else {
            setError("Please fill out all fields.");
        }
    };

    const handleClose = () => {
        onClose(); // Close the modal without submitting
        setMentorName("");
        setMentorEmail("");
    };

    return (
        <Modal show={isOpen} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Add New Mentor</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form>
                    <Form.Group controlId="mentorName">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter name"
                            value={mentorName}
                            onChange={(e) => setMentorName(e.target.value)} />
                    </Form.Group>
                    <Form.Group controlId="mentorEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="Enter email"
                            value={mentorEmail}
                            onChange={(e) => setMentorEmail(e.target.value)} />
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

export default MentorDetailsModal;