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
import { v4 as uuidv4 } from 'uuid';

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
  const [applications, setApplications] = useState([]);

  // chart data
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

        const newApplication = {
          id: uuidv4(),
          applicationNumber: `APP-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().split('T')[0],
          status: response.data.analysis.decision === 'Approved' ? 'Approved' : 
                  response.data.analysis.decision === 'Denied' ? 'Denied' : 'Pending',
          analysis: response.data.analysis,
        };
        setApplications(prev => [newApplication, ...prev]);
      } else {
        setError("Failed to analyze the file. No analysis data received.");
      }
    } catch (err) {
      console.error("Error during analysis:", err);
      if (err.response?.status === 429) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(
          err.response?.data?.detail ||
            "Error analyzing file. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderFileUpload = () => (
    <div className="mb-4">
      <input
        type="file"
        accept=".pdf"
        className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded file:border-0
                   file:text-sm file:font-semibold
                   file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100"
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
        <div className="bg-white shadow p-4 flex-1 rounded">
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
        <div className="bg-white shadow p-4 flex-1 rounded">
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
        {applications.length === 0 ? (
          <div className="bg-white shadow p-4 rounded">
            <p className="text-gray-600">No recent applications.</p>
          </div>
        ) : (
          applications.map(app => (
            <div key={app.id} className="bg-white shadow p-4 mb-2 rounded flex items-center justify-between">
              <div>
                <div className="font-bold">{app.applicationNumber}</div>
                <div className="text-sm text-gray-500">Date: {app.date}</div>
              </div>
              <span
                className={`inline-block px-3 py-1 text-sm font-semibold rounded ${
                  app.status === 'Approved'
                    ? 'bg-green-100 text-green-800'
                    : app.status === 'Denied'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {app.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAnalysisResult = () => (
    <div className="bg-white shadow p-6 rounded">
      <h2 className="text-2xl font-semibold mb-6">Loan Analysis Result</h2>
      {analysis ? (
        <div className="space-y-6">
          {/* Loan Decision - Emphasized Section */}
          <div className="p-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow-lg flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Loan Decision</h3>
              <p className="text-lg mt-2">{analysis.decision || "N/A"}</p>
            </div>
            <div className="text-4xl font-extrabold">
              {analysis.decision === 'Approved' && '✅'}
              {analysis.decision === 'Denied' && '❌'}
              {analysis.decision === 'Pending' && '⏳'}
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded shadow">
            <h3 className="text-lg font-medium text-yellow-800">Confidence Score</h3>
            <div className="mt-2">
              <p><strong>Confidence Level:</strong> {analysis.confidence_score ? `${(analysis.confidence_score * 100).toFixed(2)}%` : "N/A"}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded shadow">
            <h3 className="text-lg font-medium text-blue-800">Income Analysis</h3>
            <div className="mt-2">
              <p><strong>Total Income:</strong> ${analysis.income_analysis?.total_income?.toFixed(2) || "N/A"}</p>
              <p><strong>Income Stability:</strong> {analysis.income_analysis?.income_stability || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded shadow">
            <h3 className="text-lg font-medium text-red-800">Expense Analysis</h3>
            <div className="mt-2">
              <p><strong>Total Expenses:</strong> ${analysis.expense_analysis?.total_expenses?.toFixed(2) || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded shadow">
            <h3 className="text-lg font-medium text-green-800">Key Metrics</h3>
            <div className="mt-2">
              <p><strong>Net Flow:</strong> ${analysis.key_metrics?.net_flow?.toFixed(2) || "N/A"}</p>
            </div>
          </div>

          {analysis.raw_completion && (
            <div className="p-4 bg-gray-50 rounded shadow">
              <h3 className="text-lg font-medium text-gray-800">Additional Information</h3>
              <div className="mt-2">
                <p>{analysis.raw_completion}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>No analysis data available.</p>
      )}
      <button
        onClick={() => setCurrentStep(STEP.DASHBOARD)}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
          <div className="bg-white shadow p-6 rounded">
            <h2 className="text-2xl font-semibold mb-4">
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
      <nav className="flex items-center justify-between bg-white px-4 py-2 border-b shadow">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-xl">Bankly</div>
          <button
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100 hidden md:block"
            onClick={() => setCurrentStep(STEP.DASHBOARD)}
          >
            Dashboard
          </button>
          <button
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100 hidden md:block"
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
          <button className="text-gray-600" title="Notifications">🔔</button>
          <button className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center text-gray-700" title="User Profile">
            <span className="text-sm">U</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto hidden md:block">
          <nav className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Loans</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="w-full text-left text-gray-600 hover:text-black">Pending Applications</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Approved Loans</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Denied Loans</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Archived Loans</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Customers</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="w-full text-left text-gray-600 hover:text-black">Customer Directory</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Loan History by Customer</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Reports</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="w-full text-left text-gray-600 hover:text-black">Loan Trends</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Approval Rates</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Risk Metrics</button></li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-2">Settings</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="w-full text-left text-gray-600 hover:text-black">User Preferences</button></li>
              <li><button className="w-full text-left text-gray-600 hover:text-black">Sign Out</button></li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
