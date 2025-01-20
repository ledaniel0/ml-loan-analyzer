import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from "axios";


const STEP = {
  DASHBOARD: 'DASHBOARD',
  ENTER_DATA: 'ENTER_DATA',
  ANALYSIS_RESULT: 'ANALYSIS_RESULT'
};

const DEFAULT_TRANSACTION = {
  date: '',
  description: '',
  credit: 0,
  debit: 0,
  balance: 0
};

function App() {
  const [currentStep, setCurrentStep] = useState(STEP.DASHBOARD);
  const [transactions, setTransactions] = useState([DEFAULT_TRANSACTION]);
  const [analysis, setAnalysis] = useState(null);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);


  // Sample data for charts
  const monthlyIncomeData = [
    { month: 'Jan', amount: 3000 },
    { month: 'Feb', amount: 3500 },
    { month: 'Mar', amount: 4000 },
    { month: 'Apr', amount: 4500 },
  ];

  const monthlyExpenseData = [
    { month: 'Jan', amount: 2000 },
    { month: 'Feb', amount: 1800 },
    { month: 'Mar', amount: 2100 },
    { month: 'Apr', amount: 2200 },
  ];

  const handleNewApplication = () => {
    setCurrentStep(STEP.ENTER_DATA);
  };

  const handleTransactionChange = (index, field, value) => {
    const newTransactions = [...transactions];
    newTransactions[index][field] = value;
    setTransactions(newTransactions);
  };

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) {
      setError("No file selected.");
      return;
    }
  
    setIsLoading(true);
    setError(null);
    setFile(uploadedFile);
  
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
  
      console.log("Sending file to backend...");
      const response = await axios.post("http://localhost:8000/upload-pdf", formData, {
        headers: { 
          "Content-Type": "multipart/form-data"
        },
      });
      
      console.log("Response from backend:", response.data);  // Add this logging
  
      if (response.data?.transactions && Array.isArray(response.data.transactions)) {
        console.log("Found transactions:", response.data.transactions);  // Add this logging
        const formattedTransactions = response.data.transactions.map(txn => ({
          date: txn.date || '',
          description: txn.description || '',
          credit: parseFloat(txn.credit) || 0,
          debit: parseFloat(txn.debit) || 0,
          balance: parseFloat(txn.balance) || 0
        }));
        
        console.log("Formatted transactions:", formattedTransactions);  // Add this logging
        setTransactions(formattedTransactions.length ? formattedTransactions : [DEFAULT_TRANSACTION]);
      } else {
        console.log("No valid transactions in response");  // Add this logging
        setError("No valid transactions found in the PDF.");
        setTransactions([DEFAULT_TRANSACTION]);
      }
    } catch (error) {
      console.error("Error parsing PDF:", error);
      console.error("Error response:", error.response);  // Add this logging
      setError(error.response?.data?.detail || "Error parsing PDF. Please try again or enter data manually.");
      setTransactions([DEFAULT_TRANSACTION]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the render function for the file upload section
  const renderFileUpload = () => (
    <div className="mb-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept=".pdf"
          className="block"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="text-blue-600">
            Loading...
          </div>
        )}
      </div>
      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );

  const addNewRow = () => {
    setTransactions([...transactions, { ...DEFAULT_TRANSACTION }]);
  };

  const removeRow = (index) => {
    const newTransactions = transactions.filter((_, idx) => idx !== index);
    setTransactions(newTransactions);
  };

  const handleAnalyze = async () => {
    // Simplified analysis for demo
    const analysis = {
      total_income: transactions.reduce((sum, t) => sum + (t.credit || 0), 0),
      total_expenses: transactions.reduce((sum, t) => sum + (t.debit || 0), 0),
      net_flow: transactions.reduce((sum, t) => sum + ((t.credit || 0) - (t.debit || 0)), 0),
      recommendation: 'APPROVED' // Demo purpose only
    };
    setAnalysis(analysis);
    setCurrentStep(STEP.ANALYSIS_RESULT);
  };

  const renderMainContent = () => {
    switch (currentStep) {
      case STEP.DASHBOARD:
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="bg-white shadow p-4 flex-1">
                <h2 className="text-sm font-semibold mb-2">Average Monthly Income</h2>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
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
              </div>

              <div className="bg-white shadow p-4 flex-1">
                <h2 className="text-sm font-semibold mb-2">Average Monthly Expenses</h2>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
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
              <div className="bg-white shadow p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="font-bold">Application #5678</div>
                  <div className="text-sm text-gray-500">Date: 2024-05-21</div>
                </div>
                <span className="inline-block px-2 py-1 text-sm bg-green-100 text-green-800 rounded">
                  Approved
                </span>
              </div>
            </div>
          </div>
        );

        case STEP.ENTER_DATA:
          return (
            <div className="bg-white shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Enter Transaction Data</h2>
              
              {renderFileUpload()}
              
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border">Date</th>
                      <th className="px-4 py-2 border">Description</th>
                      <th className="px-4 py-2 border">Credit</th>
                      <th className="px-4 py-2 border">Debit</th>
                      <th className="px-4 py-2 border">Balance</th>
                      <th className="px-4 py-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 border">
                          <input
                            type="date"
                            className="w-full p-1 border rounded"
                            value={txn.date}
                            onChange={(e) => handleTransactionChange(idx, 'date', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="text"
                            className="w-full p-1 border rounded"
                            value={txn.description}
                            onChange={(e) => handleTransactionChange(idx, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full p-1 border rounded"
                            value={txn.credit}
                            onChange={(e) => handleTransactionChange(idx, 'credit', parseFloat(e.target.value || 0))}
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full p-1 border rounded"
                            value={txn.debit}
                            onChange={(e) => handleTransactionChange(idx, 'debit', parseFloat(e.target.value || 0))}
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full p-1 border rounded"
                            value={txn.balance}
                            onChange={(e) => handleTransactionChange(idx, 'balance', parseFloat(e.target.value || 0))}
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <button
                            onClick={() => removeRow(idx)}
                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={addNewRow}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Row
                </button>
                <button
                  onClick={handleAnalyze}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Analyze Data
                </button>
              </div>
            </div>
          );

      case STEP.ANALYSIS_RESULT:
        return (
          <div className="bg-white shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Loan Analysis Result</h2>
            {analysis ? (
              <div className="space-y-2">
                <p><strong>Total Income:</strong> ${analysis.total_income.toFixed(2)}</p>
                <p><strong>Total Expenses:</strong> ${analysis.total_expenses.toFixed(2)}</p>
                <p><strong>Net Flow:</strong> ${analysis.net_flow.toFixed(2)}</p>
                <p className="mt-4"><strong>Loan Decision:</strong> {analysis.recommendation}</p>
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

      default:
        return <p>Invalid step. Please refresh the page.</p>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
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

        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}

export default App;