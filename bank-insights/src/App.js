import React, { useState } from "react";
import axios from "axios";

function App() {
    const [transactions, setTransactions] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [jsonInput, setJsonInput] = useState("");

    const handleAnalyze = async () => {
        try {
            const data = JSON.parse(jsonInput);
            console.log("Data Sent to Backend:", data); // Log data
            const response = await axios.post("http://localhost:8000/analyze-transactions", data, {
                headers: { "Content-Type": "application/json" },
            });
            setTransactions(response.data.transactions);
            setAnalysis(response.data.analysis);
        } catch (error) {
            console.error("Error analyzing transactions:", error);
        }
    };
    

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Bank Statement Analysis</h1>
            <textarea
                rows="10"
                className="w-full border mb-4 p-2"
                placeholder="Paste JSON data here"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
            />
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleAnalyze}
            >
                Analyze
            </button>

            {transactions.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">Transactions</h2>
                    <pre className="bg-gray-100 p-4">{JSON.stringify(transactions, null, 2)}</pre>
                </div>
            )}

            {analysis && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">Analysis</h2>
                    <p>Total Income: £{analysis.total_income}</p>
                    <p>Total Expenses: £{analysis.total_expenses}</p>
                    <h3 className="font-semibold mt-2">Top Recurring Expenses:</h3>
                    <ul>
                        {analysis.recurring_expenses.map(([desc, amount], idx) => (
                            <li key={idx}>
                                {desc}: £{amount.toFixed(2)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default App;
