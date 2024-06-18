import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function PackageList() {
    const [packages, setPackages] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState({});
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await axios.get(
                    "https://imcc-bantu-1to1.onrender.com/getUserRole",
                    { withCredentials: true }
                );
                setUserRole(response.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
            }
        };

        fetchUserRole();
    }, []);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await axios.get(
                    "https://imcc-bantu-1to1.onrender.com/packageListing",
                    { withCredentials: true }
                );
                setPackages(response.data);
            } catch (error) {
                console.error("Error fetching packages:", error);
                setError("You need to log in to view this content.");
            }
        };

        fetchPackages();
    }, []);

    const handleFileChange = (packageId, event) => {
        setSelectedFiles({
            ...selectedFiles,
            [packageId]: event.target.files[0],
        });
        setError(null); // Reset error when a new file is selected
    };

    const handleUpload = async (packageId) => {
        const selectedFile = selectedFiles[packageId];
        if (!selectedFile) {
            alert("Please select a file.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("package_id", packageId);

            await axios.post("https://imcc-bantu-1to1.onrender.com/uploadInvoice", formData, {
                withCredentials: true,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            alert("Receipt uploaded successfully");
            navigate("https://imcc-bantu-1to1.onrender.com/ticketManagement");
        } catch (error) {
            console.error("Error uploading file:", error);
            setError(
                error.response ? error.response.data.error : error.message
            );
        }
    };

    if (error) {
        return <div>{error}</div>;
    }

    return userRole ? (
        <div>
            <h2>Bantu 1-to-1 Packages</h2>
            <h5 className="info-bantu">
                Please upload the receipt for the Bantu 1-to-1 package that you
                have purchased. Once uploaded you can monitor their status in the
                service status section. After the receipt has been approved, you
                can provide the necessary details for the Bantu 1-to-1 service.
                Your cooperation is much appreciated. Thank you.
            </h5>
            {packages.map((packageItem) => (
                <div key={packageItem.id} className="package-container">
                    <div className="package-info">
                        <h4>{packageItem.title}</h4>
                        <p>{packageItem.description}</p>
                        <p>Price: RM {packageItem.price}</p>
                    </div>
                    <div className="button-container">
                        <input
                            type="file"
                            onChange={(event) =>
                                handleFileChange(packageItem.id, event)
                            }
                            accept="application/pdf"
                        />
                        <button onClick={() => handleUpload(packageItem.id)}>
                            Upload Receipt
                        </button>
                    </div>
                </div>
            ))}
        </div>
    ) : (
        "You need to log in to view this content."
    );
}

export default PackageList;
