import React, { useState, useEffect } from 'react';
import { getItems, getReceivingLogs, createReceivingLog } from '../services/api';

const ReceivingPage: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsData, itemsData] = await Promise.all([
                getReceivingLogs(),
                getItems()
            ]);
            setLogs(logsData);
            setItems(itemsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !quantity) return;

        setSubmitting(true);
        try {
            await createReceivingLog({
                item: parseInt(selectedItem),
                quantity: parseFloat(quantity),
                unit_cost: unitCost ? parseFloat(unitCost) : null
            });
            // Reload logs and reset form
            const newLogs = await getReceivingLogs();
            setLogs(newLogs);
            setSelectedItem('');
            setQuantity('');
            setUnitCost('');
            alert("Item received successfully.");
        } catch (err) {
            console.error(err);
            alert("Failed to receive item.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">Receiving</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Receive New Stock</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                                <select 
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    value={selectedItem}
                                    onChange={(e) => setSelectedItem(e.target.value)}
                                    required
                                >
                                    <option value="">Select Item...</option>
                                    {items.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.base_unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Optional)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    value={unitCost}
                                    onChange={(e) => setUnitCost(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                            >
                                {submitting ? 'Submitting...' : 'Receive Item'}
                            </button>
                        </form>
                    </div>

                    {/* Logs Section */}
                    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Recent Logs</h2>
                        {loading ? (
                            <div className="text-gray-500">Loading...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                                            <th className="p-3 border-b">Date</th>
                                            <th className="p-3 border-b">Item</th>
                                            <th className="p-3 border-b">Quantity</th>
                                            <th className="p-3 border-b">User</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-gray-500">No logs found.</td>
                                            </tr>
                                        ) : (
                                            logs.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="p-3 border-b border-gray-100 text-sm">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 border-b border-gray-100 font-medium">{log.item_name}</td>
                                                    <td className="p-3 border-b border-gray-100">{log.quantity}</td>
                                                    <td className="p-3 border-b border-gray-100 text-sm text-gray-500">{log.user_name}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceivingPage;

