import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [matchedSkills, setMatchedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const skillKeywords = [
    "react",
    "node.js",
    "mongodb",
    "rest api",
    "aws",
    "azure",
    "git",
    "ci/cd",
    "agile",
    "javascript",
    "typescript",
    "html",
    "css",
  ];

  const BACKEND_BASE_URL = "https://ai-resume-analyzer-z5p4.onrender.com/api/login";

  // Login handler
  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    setError("");
    try {
      const res = await axios.post(`${BACKEND_BASE_URL}`, {
        username,
      });
      setToken(res.data.accessToken);
      setIsLoggedIn(true);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Login failed. Please check username."
      );
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setError("");
      setExtractedText("");
      setMatchedSkills([]);
      setAiAnalysis(null);
      setUploadedFile(null);

      if (!isLoggedIn) {
        setError("Please login first.");
        return;
      }

      if (acceptedFiles.length === 0) {
        setError("No file selected.");
        return;
      }

      const file = acceptedFiles[0];
      setUploadedFile(file);

      if (
        !file.name.toLowerCase().endsWith(".docx") &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        setError("Only .docx and .pdf files are supported.");
        return;
      }

      const formData = new FormData();
      formData.append("resume", file);

      try {
        setLoading(true);
        const response = await axios.post(
          `${BACKEND_BASE_URL}/api/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setLoading(false);

        const { text, skills, aiAnalysis } = response.data;
        setExtractedText(text);
        setMatchedSkills(skills);
        setAiAnalysis(aiAnalysis);
      } catch (err) {
        setLoading(false);
        setError(
          err.response?.data?.error || "Failed to process the file. Please try again."
        );
        console.error(err);
      }
    },
    [token, isLoggedIn]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-700">
        Resume Analyzer
      </h1>

      {!isLoggedIn && (
        <div className="max-w-md mx-auto bg-white shadow-md p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-2 w-full rounded mb-4"
          />
          <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            Login
          </button>
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>
          )}
        </div>
      )}

      {isLoggedIn && (
        <div className="max-w-xl mx-auto bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Upload your resume</h2>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed p-6 text-center rounded-lg cursor-pointer transition ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the resume here ...</p>
            ) : (
              <p>Drag & drop a DOCX or PDF file here, or click to select one</p>
            )}
          </div>

          {loading && (
            <p className="mt-4 text-center text-blue-600">Processing...</p>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>
          )}

          {uploadedFile && (
            <div className="mt-4 p-4 bg-green-100 rounded-md text-green-800">
              <strong>Uploaded:</strong> {uploadedFile.name}
            </div>
          )}

          {extractedText && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md max-h-72 overflow-auto">
              <h3 className="font-semibold mb-2">Extracted Text:</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {extractedText}
              </pre>
            </div>
          )}

          {matchedSkills.length > 0 && (
            <div className="mt-4 p-4 bg-green-100 rounded-md">
              <h3 className="font-semibold mb-2">Matched Skills:</h3>
              <ul className="list-disc list-inside text-sm text-green-800">
                {matchedSkills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium">
                Match Score:{" "}
                {Math.round((matchedSkills.length / skillKeywords.length) * 100)}%
              </p>
            </div>
          )}

          {aiAnalysis && (
            <div className="mt-6 p-4 bg-yellow-100 rounded-md">
              <h3 className="font-semibold mb-2">AI Resume Score & Feedback:</h3>
              <p>
                <strong>Score:</strong>{" "}
                {aiAnalysis.score !== null ? `${aiAnalysis.score}%` : "N/A"}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{aiAnalysis.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
