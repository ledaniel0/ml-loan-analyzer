import React, { useState } from "react";
import axios from "axios";

function App() {
    const [file, setFile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [analysis, setAnalysis] = useState(null);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post("http://localhost:8000/upload-statement", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            console.log("Backend Response:", response.data);
            setTransactions(response.data.transactions);
            setAnalysis(response.data.analysis);
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Bank Statement Analyzer</h1>
            <form onSubmit={handleFileUpload}>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="mb-4"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Upload
                </button>
            </form>
            <div className="mt-6">
                {transactions.length > 0 && (
                    <>
                        <h2 className="text-xl font-semibold">Transactions</h2>
                        <pre>{JSON.stringify(transactions, null, 2)}</pre>
                    </>
                )}
                {analysis && (
                    <>
                        <h2 className="text-xl font-semibold mt-4">Analysis</h2>
                        <p>Total Income: £{analysis.total_income}</p>
                        <p>Total Expenses: £{analysis.total_expenses}</p>
                        <h3 className="font-semibold mt-2">Top Recurring Expenses:</h3>
                        <ul>
                            {analysis.recurring_expenses.map(([desc, amount]) => (
                                <li key={desc}>{desc}: £{amount}</li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
