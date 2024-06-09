import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Modal,
    Button,
    Form,
    Card,
    Spinner,
    Alert,
    Pagination,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../PostList.css";
import { FaHeart } from "react-icons/fa";

const PostList = () => {
    const [userRole, setUserRole] = useState("");
    const [userData, setUserData] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [filterCategory, setFilterCategory] = useState(""); // State to hold the selected filter category
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState("");
    const [replyInputs, setReplyInputs] = useState({});
    const [replyVisibility, setReplyVisibility] = useState({});
    const [editingPost, setEditingPost] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [liked, setLiked] = useState(false);
    const [totalLikes, setTotalLikes] = useState();
    const [likes, setLikes] = useState({}); // Track likes for each post

    const postsPerPage = 5;

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
        async function fetchUserProfile() {
            try {
                const resp = await axios.get("http://localhost:5000/@me", {
                    withCredentials: true,
                });
                setUserData(resp.data);
            } catch (error) {
                console.log("Not authenticated");
            }
        }

        fetchUserProfile();
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

    useEffect(() => {
        fetchCategories();
        fetchPosts();
    }, [currentPage, filterCategory]);

    const fetchPosts = async () => {
        await axios
            .get("http://localhost:5000/getPosts", {
                withCredentials: true,
                params: {
                    page: currentPage,
                    limit: postsPerPage,
                    category: filterCategory // Include the filter category in the request
                },
            })
            .then((response) => {
                const fetchedPosts = response.data.posts;
                setPosts(fetchedPosts);
                setTotalPosts(response.data.totalPosts);
                // Fetch like status for each post
                fetchedPosts.forEach((post) => {
                    fetchLikeStatus(post.post_id);
                });
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
            });
    };

    const fetchLikeStatus = async (postId) => {
        try {
            const response = await axios.get(
                `http://localhost:5000/getLikeStatus/${postId}`,
                { withCredentials: true }
            );
            setLikes((prevLikes) => ({
                ...prevLikes,
                [postId]: {
                    liked: response.data.liked,
                    totalLikes: response.data.totalLikes,
                },
            }));
        } catch (error) {
            console.error("Error fetching like status:", error);
        }
    };

    const handleAddPost = () => {
        setEditingPost(null);
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

    const handleFilterCategoryChange = (event) => {
        setFilterCategory(event.target.value);
        setCurrentPage(1); // Reset to the first page when the filter changes
    };

    const handleSubmit = () => {
        if (
            title.trim() !== "" &&
            content.trim() !== "" &&
            selectedCategory !== ""
        ) {
            setLoading(true);
            const postData = {
                title: title,
                content: content,
                category_id: selectedCategory,
            };

            if (editingPost) {
                // If editingPost is not null, update the existing post
                axios
                    .put(
                        `http://localhost:5000/editPost/${editingPost.post_id}`,
                        postData,
                        {
                            withCredentials: true,
                        }
                    )
                    .then((response) => {
                        setLoading(false);
                        fetchPosts();
                        setShowModal(false);
                        setTitle("");
                        setContent("");
                        setSelectedCategory("");
                        setError("");
                    })
                    .catch((error) => {
                        setLoading(false);
                        setError("Error editing post. Please try again later.");
                    });
            } else {
                // If editingPost is null, create a new post
                axios
                    .post("http://localhost:5000/createPost", postData, {
                        withCredentials: true,
                    })
                    .then((response) => {
                        setLoading(false);
                        fetchPosts();
                        setShowModal(false);
                        setTitle("");
                        setContent("");
                        setSelectedCategory("");
                        setError("");
                    })
                    .catch((error) => {
                        setLoading(false);
                        setError("Error adding post. Please try again later.");
                    });
            }
        } else {
            setError("Please fill out all fields and select a category.");
        }
    };

    const handleEditPost = (post) => {
        setEditingPost(post);
        setTitle(post.title);
        setContent(post.content);
        setSelectedCategory(post.category);
        setShowModal(true);
    };

    const handleDeletePost = (post_id) => {
        axios
            .delete(`http://localhost:5000/deletePost/${post_id}`, {
                withCredentials: true,
            })
            .then(() => {
                alert("Your post has been successfuly deleted.");
                fetchPosts();
            })
            .catch((error) => {
                console.error("Error deleting post:", error);
            });
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

    const handleDeleteReply = (reply_id) => {
        axios
            .delete(`http://localhost:5000/deleteReply/${reply_id}`, {
                withCredentials: true,
            })
            .then(() => {
                fetchPosts(); // Refresh posts to reflect the deleted reply
                alert("Reply has been succesfully deleted.");
            })
            .catch((error) => {
                console.error("Error deleting reply:", error);
            });
    };

    const toggleReplyInput = (postId) => {
        setReplyInputs({ ...replyInputs, [postId]: !replyInputs[postId] });
        setReplyVisibility({
            ...replyVisibility,
            [postId]: !replyVisibility[postId],
        });
        if (!replyInputs[postId]) {
            fetchReplies(postId);
        }
    };

    // Filter posts based on selected filter category
    const filteredPosts = filterCategory
        ? posts.filter((post) => post.category === filterCategory)
        : posts;

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const renderPagination = () => {
        const totalPages = Math.ceil(totalPosts / postsPerPage);
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

    const handleLike = async (postId) => {
        try {
            const response = await axios.post(
                `http://localhost:5000/likePost/${postId}`,
                {}, // Empty body
                { withCredentials: true }
            );

            setLikes((prevLikes) => ({
                ...prevLikes,
                [postId]: {
                    liked: response.data.liked,
                    totalLikes: response.data.totalLikes,
                },
            }));
        } catch (error) {
            console.error("Error liking post:", error);
            // Optionally, handle the 401 error by redirecting to login or showing a message
            if (error.response && error.response.status === 401) {
                alert("You need to log in to like a post.");
            }
        }
    };

    return (
        <>
            <h2>Discussion Forum</h2>
            <div className="forum-component">
                <div className="button-general ms-5">
                    <Button onClick={handleAddPost}>+ New Post</Button>
                </div>

                <Form.Group
                    controlId="filterCategorySelect"
                    className="filter me-5"
                >
                    <Form.Label>
                        <b>Filter by Category</b>
                    </Form.Label>
                    <Form.Control
                        as="select"
                        value={filterCategory}
                        onChange={handleFilterCategoryChange}
                    >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                    </Form.Control>
                </Form.Group>
            </div>
            <div className="post-list-container">
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {editingPost ? "Edit Post" : "Add New Post"}
                        </Modal.Title>
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
                                <Form.Label>Category</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={selectedCategory}
                                    onChange={handleCategoryChange}
                                >
                                    <option value="">Select a category</option>
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
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <Spinner
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                />
                            ) : editingPost ? (
                                "Save"
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>

                <div className="post-list">
                    {filteredPosts.map((post) => (
                        <Card key={post.post_id} className="post-card">
                            <Card.Body>
                                <div className="row">
                                    <div className="col">
                                        <Card.Subtitle className="mb-2 text-muted">
                                            {post.user} - Asked in{" "}
                                            {post.category} category
                                        </Card.Subtitle>

                                        <div className="col" align="right">
                                            {post.user === userData?.name && (
                                                <Button
                                                    className="me-2"
                                                    variant="info"
                                                    onClick={() =>
                                                        handleEditPost(post)
                                                    }
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                            {(userRole === "admin" ||
                                                post.user ===
                                                    userData?.name) && (
                                                <Button
                                                    variant="danger"
                                                    onClick={() =>
                                                        handleDeletePost(
                                                            post.post_id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Card.Text>
                                    <b>{post.title}</b>
                                </Card.Text>
                                <Card.Text>{post.content}</Card.Text>
                                <div className="d-flex align-items-center">
                                    <button
                                        onClick={() => handleLike(post.post_id)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <FaHeart
                                            color={
                                                likes[post.post_id]?.liked
                                                    ? "red"
                                                    : "grey"
                                            }
                                            size={24}
                                        />
                                    </button>
                                    <span className="ms-2">
                                        {likes[post.post_id]?.totalLikes || 0}
                                    </span>
                                </div>

                                {/* <p>Likes: {post.total_likes}</p> */}
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
                                            className="d-flex align-items-center"
                                            onSubmit={(event) =>
                                                handleReplySubmit(
                                                    event,
                                                    post.post_id
                                                )
                                            }
                                        >
                                            <Form.Group
                                                controlId={`replyContent-${post.post_id}`}
                                                className="flex-grow-1 me-2"
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
                                    {replyVisibility[post.post_id] &&
                                        post.replies && ( // Check if replies exist for the post
                                            <div className="each-reply-container">
                                                {post.replies.map((reply) => (
                                                    <div
                                                        key={reply.reply_id}
                                                        className="reply align-items-center"
                                                    >
                                                        <div className="row">
                                                            <div className="col">
                                                                <Card.Subtitle className="mb-2 text-muted">
                                                                    {
                                                                        reply.user_name
                                                                    }
                                                                </Card.Subtitle>
                                                                <Card.Text className="mb-2 text-muted">
                                                                    {
                                                                        reply.content
                                                                    }
                                                                </Card.Text>
                                                            </div>
                                                            <div
                                                                className="col"
                                                                align="right"
                                                            >
                                                                {(reply.user_name ===
                                                                    userData?.name ||
                                                                    userRole ===
                                                                        "admin") && (
                                                                    <Button
                                                                        variant="danger"
                                                                        onClick={() =>
                                                                            handleDeleteReply(
                                                                                reply.reply_id
                                                                            )
                                                                        }
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
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
            <div className="page-button d-flex justify-content-center mt-4">
                {renderPagination()}
            </div>
        </>
    );
};

export default PostList;
