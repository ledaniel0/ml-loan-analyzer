import React, { useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STEP = {
  DASHBOARD: "DASHBOARD",
  ENTER_DATA: "ENTER_DATA",
  ANALYSIS_RESULT: "ANALYSIS_RESULT",
};

const App = () => {
  const [currentStep, setCurrentStep] = useState(STEP.DASHBOARD);
  const [analysis, setAnalysis] = useState(null);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sample chart data
  const monthlyIncomeData = [
    { month: "Jan", amount: 3000 },
    { month: "Feb", amount: 3500 },
    { month: "Mar", amount: 4000 },
    { month: "Apr", amount: 4500 },
  ];

  const monthlyExpenseData = [
    { month: "Jan", amount: 2000 },
    { month: "Feb", amount: 1800 },
    { month: "Mar", amount: 2100 },
    { month: "Apr", amount: 2200 },
  ];

  const handleNewApplication = () => {
    setCurrentStep(STEP.ENTER_DATA);
  };

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) {
      setError("No file selected.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      console.log("Sending request to analyze statement...");
      const response = await axios.post(
        "http://localhost:8000/analyze-statement",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("Received response:", response.data);

      if (response.data?.analysis) {
        setAnalysis(response.data.analysis);
        setCurrentStep(STEP.ANALYSIS_RESULT);
      } else {
        setError("Failed to analyze the file. No analysis data received.");
      }
    } catch (err) {
      console.error("Error during analysis:", err);
      setError(
        err.response?.data?.detail ||
          "Error analyzing file. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderFileUpload = () => (
    <div className="mb-4">
      <input
        type="file"
        accept=".pdf"
        className="block"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <div className="text-blue-600 mt-2">Processing file...</div>}
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );

  const renderDashboard = () => (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="bg-white shadow p-4 flex-1">
          <h2 className="text-sm font-semibold mb-2">Average Monthly Income</h2>
          <ResponsiveContainer height={200}>
            <LineChart data={monthlyIncomeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white shadow p-4 flex-1">
          <h2 className="text-sm font-semibold mb-2">Average Monthly Expenses</h2>
          <ResponsiveContainer height={200}>
            <LineChart data={monthlyExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Recent Loan Applications</h2>
        <div className="bg-white shadow p-4 mb-2 flex items-center justify-between">
          <div>
            <div className="font-bold">Application #1234</div>
            <div className="text-sm text-gray-500">Date: 2024-06-10</div>
          </div>
          <span className="inline-block px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">
            Pending
          </span>
        </div>
      </div>
    </div>
  );

  const renderAnalysisResult = () => (
    <div className="bg-white shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Loan Analysis Result</h2>
      {analysis ? (
        <div className="space-y-2">
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(analysis, null, 2)}
          </pre>
          {analysis.income_analysis && (
            <p>
              <strong>Total Income:</strong> $
              {analysis.income_analysis.total_income?.toFixed(2) || "N/A"}
            </p>
          )}
          {analysis.expense_analysis && (
            <p>
              <strong>Total Expenses:</strong> $
              {analysis.expense_analysis.total_expenses?.toFixed(2) || "N/A"}
            </p>
          )}
          {analysis.key_metrics && (
            <p>
              <strong>Net Flow:</strong> $
              {analysis.key_metrics.net_flow?.toFixed(2) || "N/A"}
            </p>
          )}
          {analysis.decision && (
            <p>
              <strong>Loan Decision:</strong> {analysis.decision}
            </p>
          )}
          {analysis.confidence_score && (
            <p>
              <strong>Confidence Score:</strong> {analysis.confidence_score * 100}%
            </p>
          )}
          {analysis.raw_completion && (
            <div>
              <strong>Raw Completion:</strong> {analysis.raw_completion}
            </div>
          )}
        </div>
      ) : (
        <p>No analysis data available.</p>
      )}
      <button
        onClick={() => setCurrentStep(STEP.DASHBOARD)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Return to Dashboard
      </button>
    </div>
  );

  const renderMainContent = () => {
    switch (currentStep) {
      case STEP.DASHBOARD:
        return renderDashboard();
      case STEP.ENTER_DATA:
        return (
          <div className="bg-white shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Upload Bank Statement
            </h2>
            {renderFileUpload()}
          </div>
        );
      case STEP.ANALYSIS_RESULT:
        return renderAnalysisResult();
      default:
        return <p>Invalid step. Please refresh the page.</p>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between bg-white px-4 py-2 border-b">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-xl">Bankly Loan System</div>
          <button
            className="px-3 py-1 text-sm bg-white border rounded hidden md:block"
            onClick={() => setCurrentStep(STEP.DASHBOARD)}
          >
            Dashboard
          </button>
          <button
            className="px-3 py-1 text-sm bg-white border rounded hidden md:block"
            onClick={handleNewApplication}
          >
            New Application
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Search..."
          />
          <button className="text-gray-600">🔔</button>
          <button className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center text-gray-700">
            <span className="text-sm">U</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto hidden md:block">
          <nav className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Loans</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="text-gray-600 hover:text-black">Pending Applications</button></li>
              <li><button className="text-gray-600 hover:text-black">Approved Loans</button></li>
              <li><button className="text-gray-600 hover:text-black">Denied Loans</button></li>
              <li><button className="text-gray-600 hover:text-black">Archived Loans</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Customers</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="text-gray-600 hover:text-black">Customer Directory</button></li>
              <li><button className="text-gray-600 hover:text-black">Loan History by Customer</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Reports</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="text-gray-600 hover:text-black">Loan Trends</button></li>
              <li><button className="text-gray-600 hover:text-black">Approval Rates</button></li>
              <li><button className="text-gray-600 hover:text-black">Risk Metrics</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Settings</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="text-gray-600 hover:text-black">User Preferences</button></li>
              <li><button className="text-gray-600 hover:text-black">Sign Out</button></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
