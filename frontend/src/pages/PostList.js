import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Form, Card, Spinner, Alert } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../PostList.css";

const PostList = () => {
    const [userRole, setUserRole] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState("");
    const [replyInputs, setReplyInputs] = useState({});

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
        fetchCategories();
        fetchPosts();
    }, []);

    const fetchCategories = () => {
        axios
            .get("http://localhost:5000/getCategories")
            .then((response) => {
                setCategories(response.data);
            })
            .catch((error) => {
                console.error("Error fetching categories:", error);
            });
    };

    const fetchPosts = () => {
        axios
            .get("http://localhost:5000/getPosts")
            .then((response) => {
                setPosts(response.data);
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
            });
    };

    const handleAddPost = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setTitle("");
        setContent("");
        setSelectedCategory("");
        setError("");
    };

    const handleTitleChange = (event) => {
        setTitle(event.target.value);
    };

    const handleContentChange = (event) => {
        setContent(event.target.value);
    };

    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value);
    };

    const handleSubmit = () => {
        if (
            title.trim() !== "" &&
            content.trim() !== "" &&
            selectedCategory !== ""
        ) {
            setLoading(true);
            axios
                .post(
                    "http://localhost:5000/createPost",
                    {
                        title: title,
                        content: content,
                        category_id: selectedCategory,
                    },
                    { withCredentials: true }
                )
                .then((response) => {
                    setLoading(false);
                    fetchPosts();
                    setShowModal(false);
                })
                .catch((error) => {
                    setLoading(false);
                    setError("Error adding post. Please try again later.");
                });
        } else {
            setError("Please fill out all fields and select a category.");
        }
    };

    const handleReplySubmit = (event, postId) => {
        event.preventDefault();
        const replyContent = event.target[`replyContent-${postId}`].value;

        if (replyContent.trim() !== "") {
            setLoading(true);
            axios
                .post(
                    "http://localhost:5000/createReply",
                    {
                        content: replyContent,
                        post_id: postId,
                    },
                    { withCredentials: true }
                )
                .then((response) => {
                    setLoading(false);
                    const newReply = response.data;
                    setPosts(
                        posts.map((post) =>
                            post.post_id === postId
                                ? {
                                      ...post,
                                      replies: [
                                          ...(post.replies || []),
                                          newReply,
                                      ],
                                  }
                                : post
                        )
                    );
                    event.target[`replyContent-${postId}`].value = ""; // Clear the reply input box
                })
                .catch((error) => {
                    setLoading(false);
                    setError("Error adding reply. Please try again later.");
                });
        } else {
            setError("Please enter a reply.");
        }
    };

    const fetchReplies = (postId) => {
        axios
            .get(`http://localhost:5000/getReplies/${postId}`)
            .then((response) => {
                setPosts(
                    posts.map((post) =>
                        post.post_id === postId
                            ? { ...post, replies: response.data }
                            : post
                    )
                );
            })
            .catch((error) => {
                console.error(
                    `Error fetching replies for post ${postId}:`,
                    error
                );
            });
    };

    const toggleReplyInput = (postId) => {
        setReplyInputs({ ...replyInputs, [postId]: !replyInputs[postId] });
        if (!replyInputs[postId]) {
            fetchReplies(postId);
        }
    };

    return (
        <>
            <h2>Forum</h2>
            <div className="post-list-container">
                <div className="button-general ms-5">
                    <Button onClick={handleAddPost}>Add Post</Button>
                </div>

                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Add New Post</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form>
                            <Form.Group controlId="postTitle">
                                <Form.Label>Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter title"
                                    value={title}
                                    onChange={handleTitleChange}
                                />
                            </Form.Group>
                            <Form.Group controlId="postContent">
                                <Form.Label>Content</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Enter content"
                                    value={content}
                                    onChange={handleContentChange}
                                />
                            </Form.Group>
                            <Form.Group controlId="categorySelect">
                                <Form.Label>Select Category</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={selectedCategory}
                                    onChange={handleCategoryChange}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Close
                        </Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {loading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
                <div className="post-container">
                    <div className="post-list">
                        {posts.map((post) => (
                            <Card key={post.post_id} className="post-card">
                                <Card.Body>
                                    <Card.Subtitle className="mb-2 text-muted">
                                        Category: {post.category}
                                    </Card.Subtitle>
                                    <Card.Subtitle className="mb-2 text-muted">
                                        Posted By: {post.user}
                                    </Card.Subtitle>
                                    <Card.Title>{post.title}</Card.Title>
                                    <Card.Text>{post.content}</Card.Text>
                                    <div className="reply-main-container">
                                        <Card.Subtitle
                                            className="mb-2 text-muted reply-link"
                                            onClick={() =>
                                                toggleReplyInput(post.post_id)
                                            }
                                        >
                                            Reply
                                        </Card.Subtitle>
                                        {replyInputs[post.post_id] && (
                                            <Form
                                                onSubmit={(event) =>
                                                    handleReplySubmit(
                                                        event,
                                                        post.post_id
                                                    )
                                                }
                                            >
                                                <Form.Group
                                                    controlId={`replyContent-${post.post_id}`}
                                                >
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter your reply"
                                                    />
                                                </Form.Group>
                                                <div className="button-general">
                                                    <Button
                                                        variant="primary"
                                                        type="submit"
                                                    >
                                                        Submit Reply
                                                    </Button>
                                                </div>
                                            </Form>
                                        )}
                                        {post.replies && ( // Check if replies exist for the post
                                            <div className="each-reply-container">
                                                {post.replies.map((reply) => (
                                                    <div
                                                        key={reply.reply_id}
                                                        className="reply"
                                                    >
                                                        <p className="reply-content">
                                                            {reply.content}
                                                        </p>
                                                        <p className="reply-info">
                                                            Replied By:{" "}
                                                            {reply.user_name}
                                                        </p>
                                                        <p className="reply-info">
                                                            Replied At:{" "}
                                                            {reply.created_at}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PostList;
