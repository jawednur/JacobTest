import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../services/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Loader2, TrendingUp, Package, Utensils, Trash2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination for Waste Table
    const [wastePage, setWastePage] = useState(1);
    const ITEMS_PER_PAGE = 3;

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await getAnalytics();
            setData(response);
        } catch (err) {
            setError('Failed to load analytics data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (error) return (
        <div className="text-center text-red-500 p-8">
            {error}
        </div>
    );

    if (!data) return null;

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-charcoal">Analytics</h1>
                <p className="text-gray-500">Sales trends, popularity, and ingredient usage based on consumption.</p>
            </header>

            {/* Production Trends Chart */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-neutral-light">
                <div className="flex items-center mb-6">
                    <TrendingUp className="w-5 h-5 text-primary mr-2" />
                    <h2 className="text-lg font-semibold text-charcoal">Sales Trends (Last 30 Days)</h2>
                </div>
                <div style={{ width: '100%', height: 320, minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.production_trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend />
                            {/* Dynamically generate Lines based on keys in the first data point, excluding 'date' */}
                            {data.production_trends.length > 0 && Object.keys(data.production_trends[0])
                                .filter(key => key !== 'date')
                                .map((key, index) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={COLORS[index % COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))
                            }
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {data.production_trends.length === 0 && (
                    <p className="text-center text-gray-400 mt-4">No sales data available.</p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Products */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-neutral-light">
                    <div className="flex items-center mb-6">
                        <Package className="w-5 h-5 text-secondary mr-2" />
                        <h2 className="text-lg font-semibold text-charcoal">Popular Products</h2>
                    </div>
                    <div style={{ width: '100%', height: 256, minHeight: 256 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.popular_products} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="recipe__item__name"
                                    type="category"
                                    width={100}
                                    tick={{ fill: '#4B5563', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="total_made" radius={[0, 4, 4, 0]}>
                                    {data.popular_products.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Current Product Stock */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-neutral-light overflow-hidden">
                    <div className="flex items-center mb-4">
                        <Package className="w-5 h-5 text-green-600 mr-2" />
                        <h2 className="text-lg font-semibold text-charcoal">Products In Stock</h2>
                    </div>
                    <div className="overflow-y-auto max-h-64">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr>
                                    <th className="p-3 font-medium">Product</th>
                                    <th className="p-3 font-medium text-right">Quantity</th>
                                    <th className="p-3 font-medium text-right">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.current_stock.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800">{item.item__name}</td>
                                        <td className="p-3 text-right font-medium text-gray-600">
                                            {typeof item.total_quantity === 'number'
                                                ? item.total_quantity.toFixed(2)
                                                : item.total_quantity}
                                        </td>
                                        <td className="p-3 text-right text-xs text-gray-400">
                                            {item.item__base_unit}
                                        </td>
                                    </tr>
                                ))}
                                {data.current_stock.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-gray-400">No products in stock.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Ingredient Usage Table */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-neutral-light">
                <div className="flex items-center mb-4">
                    <Utensils className="w-5 h-5 text-orange-500 mr-2" />
                    <h2 className="text-lg font-semibold text-charcoal">Ingredient Usage (Estimated)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="p-3 font-medium">Ingredient</th>
                                <th className="p-3 font-medium text-right">Total Used</th>
                                <th className="p-3 font-medium text-right">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.ingredient_usage.map((ing: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-800 font-medium">{ing.name}</td>
                                    <td className="p-3 text-right text-gray-600">{ing.quantity.toFixed(2)}</td>
                                    <td className="p-3 text-right text-gray-500">{ing.unit}</td>
                                </tr>
                            ))}
                            {data.ingredient_usage.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-400">No usage data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Waste / Expired Items Table */}
            <div className="bg-card rounded-xl shadow-sm p-6 border border-neutral-light">
                <div className="flex items-center mb-4">
                    <Trash2 className="w-5 h-5 text-red-500 mr-2" />
                    <h2 className="text-lg font-semibold text-charcoal">Expired / Waste (Last 30 Days)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="p-3 font-medium">Item</th>
                                <th className="p-3 font-medium text-right">Total Wasted</th>
                                <th className="p-3 font-medium text-right">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.expired_waste
                                ?.slice((wastePage - 1) * ITEMS_PER_PAGE, wastePage * ITEMS_PER_PAGE)
                                .map((waste: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800 font-medium">{waste.name}</td>
                                        <td className="p-3 text-right text-gray-600">
                                            {typeof waste.total_expired === 'number'
                                                ? waste.total_expired.toFixed(2)
                                                : waste.total_expired}
                                        </td>
                                        <td className="p-3 text-right text-gray-500">{waste.unit}</td>
                                    </tr>
                                ))}
                            {(!data.expired_waste || data.expired_waste.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-400">No waste data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {data.expired_waste && data.expired_waste.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                        <div>
                            Showing {(wastePage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(wastePage * ITEMS_PER_PAGE, data.expired_waste.length)} of {data.expired_waste.length} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setWastePage(p => Math.max(1, p - 1))}
                                disabled={wastePage === 1}
                                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setWastePage(p => Math.min(Math.ceil(data.expired_waste.length / ITEMS_PER_PAGE), p + 1))}
                                disabled={wastePage >= Math.ceil(data.expired_waste.length / ITEMS_PER_PAGE)}
                                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
