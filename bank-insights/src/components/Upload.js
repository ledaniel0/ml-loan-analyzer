import React, { useState } from "react";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [insights, setInsights] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post("http://localhost:8000/upload-statement", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setInsights(response.data.transactions);
  };

  return (
    <div>
      <form onSubmit={handleFileUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      {insights && <div>{JSON.stringify(insights)}</div>}
    </div>
  );
};

export default Upload;
