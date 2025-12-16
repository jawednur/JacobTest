import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { AlertTriangle, Clock, Box, Activity } from 'lucide-react';

interface Stats {
    low_stock_count: number;
    expiring_today_count: number;
    total_inventory_items: number;
    recent_activity: any[];
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('dashboard/stats/');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!stats) return <div>Error loading stats</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 font-serif text-dark-grey">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Stat Cards */}
                <div className="bg-card p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-red-100 rounded-full mr-4">
                        <AlertTriangle className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-sans uppercase tracking-wider">Low Stock Items</p>
                        <p className="text-3xl font-bold text-dark-grey font-serif">{stats.low_stock_count}</p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-full mr-4">
                        <Clock className="w-8 h-8 text-tertiary-gold" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-sans uppercase tracking-wider">Expiring Today</p>
                        <p className="text-3xl font-bold text-dark-grey font-serif">{stats.expiring_today_count}</p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-green-100 rounded-full mr-4">
                        <Box className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-sans uppercase tracking-wider">Total Items</p>
                        <p className="text-3xl font-bold text-dark-grey font-serif">{stats.total_inventory_items}</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center">
                    <Activity className="w-5 h-5 text-gray-400 mr-2" />
                    <h2 className="text-xl font-bold text-dark-grey font-serif">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recent_activity.length > 0 ? (
                        stats.recent_activity.map((log: any) => (
                            <div key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-sans text-sm text-dark-grey">
                                        <span className="font-bold">{log.user_name}</span> made <span className="font-bold">{log.quantity_made} {log.unit_type}</span> of {log.recipe_name}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-400 font-sans">
                            No recent activity found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
