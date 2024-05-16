import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUser } from "../components/UserContext";

function GetPackageList() {
  const [packages, setPackages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const { userID } = useUser();
  const [error, setError] = useState(null);

  // Create refs for file inputs to reset them
  const fileInputRefs = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/packageListing");
        setPackages(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleFileChange = (packageId, event) => {
    setSelectedFiles({
      ...selectedFiles,
      [packageId]: event.target.files[0],
    });
    setError(null); // Reset error when a new file is selected
  };

  const handleButtonClick = async (packageId) => {
    const selectedFile = selectedFiles[packageId];
    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("package_id", packageId);
      formData.append("user_id", userID);

      await axios.post("http://localhost:5000/uploadInvoice", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setError(null);
      setSelectedFiles({
        ...selectedFiles,
        [packageId]: null,
      });

      // Reset the file input
      if (fileInputRefs.current[packageId]) {
        fileInputRefs.current[packageId].value = null;
      }

      alert("Invoice uploaded successfully");
    } catch (error) {
      setError(error.response ? error.response.data.error : error.message);
    }
  };

  return (
    <div>
      <h1>Bantu Packages</h1>
      <p>Select a package that you have bought and upload the invoice of the payment.</p>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {packages.map((packageList) => (
        <div key={packageList.id} className="package-container">
          <div className="package-info">
            <h4>{packageList.title}</h4>
            <p>{packageList.description}</p>
            <p>Price: RM {packageList.price}</p>
          </div>
          <div className="button-container">
            <input
              type="file"
              onChange={(event) => handleFileChange(packageList.id, event)}
              accept="image/*,application/pdf" // Adjust based on allowed file types
              ref={(el) => (fileInputRefs.current[packageList.id] = el)} // Set ref for file input
            />
            <button onClick={() => handleButtonClick(packageList.id)}>
              Upload Invoice
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GetPackageList;