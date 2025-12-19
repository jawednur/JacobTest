import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, disposeExpiredItem } from '../services/api';
import ExpiredItemsModal from '../components/ExpiredItemsModal';
import { AlertTriangle, ClipboardList } from 'lucide-react';

interface InventoryItem {
    id: number;
    item_name: string;
    location_name: string;
    quantity: number;
    expiration_date: string | null;
}

interface LowStockItem {
    id: number;
    name: string;
    quantity: number;
    par_level: number;
    deficit: number;
    unit: string;
}

interface DashboardData {
    low_stock_count: number;
    low_stock_items: LowStockItem[];
    expiring_today_count: number;
    expiring_today_items: InventoryItem[];
    expired_count: number;
    expired_items: InventoryItem[];
    total_inventory_items: number;
    recent_activity: any[];
}

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            const stats = await getDashboardStats();
            setData(stats);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDispose = async (invId: number, reason: string) => {
        try {
            await disposeExpiredItem(invId, reason);
            fetchData();
        } catch (e) {
            console.error("Failed to dispose", e);
            alert("Failed to dispose item.");
            throw e;
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading Dashboard...</div>;
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Error loading data.</div>;
    }

    const hasExpiredOrExpiring = data.expired_count > 0 || data.expiring_today_count > 0;

    return (
        <div className="p-6 bg-background min-h-screen font-sans text-dark-grey">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-charcoal font-serif">Hello, {user?.first_name || user?.username}</h1>
                    <p className="text-charcoal opacity-70 mt-1">Here is what needs your attention today.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsExpiredModalOpen(true)}
                        disabled={!hasExpiredOrExpiring}
                        className={`
                            px-6 py-3 rounded-lg shadow-md transition-colors font-medium flex items-center
                            ${hasExpiredOrExpiring 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Manage Expiring
                    </button>
                    <button
                        onClick={() => navigate('/production')}
                        className="bg-primary text-white px-6 py-3 rounded-lg shadow-md hover:bg-red-800 transition-colors font-medium flex items-center"
                    >
                        <ClipboardList className="w-5 h-5 mr-2" />
                        Start Prep Log
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-card p-6 rounded-lg shadow-sm border border-neutral-light">
                    <div className="text-charcoal text-sm font-medium uppercase tracking-wider font-serif">Low Stock Items</div>
                    <div className="text-4xl font-bold text-primary mt-2">{data.low_stock_count}</div>
                    <div className="text-xs text-charcoal mt-2 opacity-70">Items below par level</div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-neutral-light">
                    <div className="text-charcoal text-sm font-medium uppercase tracking-wider font-serif">Expiring Today</div>
                    <div className="text-4xl font-bold text-tertiary-gold mt-2">{data.expiring_today_count}</div>
                    <div className="text-xs text-charcoal mt-2 opacity-70">Action needed immediately</div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-neutral-light">
                    <div className="text-charcoal text-sm font-medium uppercase tracking-wider font-serif">Expired</div>
                    <div className="text-4xl font-bold text-primary mt-2">{data.expired_count}</div>
                    <div className="text-xs text-charcoal mt-2 opacity-70">Remove from stock</div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-neutral-light">
                    <div className="text-charcoal text-sm font-medium uppercase tracking-wider font-serif">Total Inventory</div>
                    <div className="text-4xl font-bold text-secondary-dark mt-2" style={{ color: '#5A8C6A' }}>{data.total_inventory_items}</div>
                    <div className="text-xs text-charcoal mt-2 opacity-70">Active items tracked</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Low Stock List */}
                <div className="bg-card rounded-lg shadow-sm border border-neutral-light overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-light bg-background-alt flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-primary font-serif">Low Stock - Needs Prep</h2>
                    </div>
                    <div className="divide-y divide-neutral-light max-h-96 overflow-y-auto">
                        {(!data.low_stock_items || data.low_stock_items.length === 0) ? (
                            <div className="p-6 text-center text-charcoal opacity-60">No items below par level.</div>
                        ) : (
                            data.low_stock_items.map(item => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-background-warm transition-colors">
                                    <div>
                                        <div className="font-medium text-charcoal">{item.name}</div>
                                        <div className="text-sm text-charcoal opacity-70">
                                            Par: {item.par_level} {item.unit}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary">{item.quantity} {item.unit}</div>
                                        <div className="text-xs text-primary">
                                            Deficit: -{item.deficit.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expiring Today List */}
                <div className="bg-card rounded-lg shadow-sm border border-neutral-light overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-light bg-background-alt">
                        <h2 className="text-lg font-semibold text-tertiary-gold font-serif">Expiring Today</h2>
                    </div>
                    <div className="divide-y divide-neutral-light max-h-96 overflow-y-auto">
                        {data.expiring_today_items.length === 0 ? (
                            <div className="p-6 text-center text-charcoal opacity-60">No items expiring today.</div>
                        ) : (
                            data.expiring_today_items.map(item => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-background-warm transition-colors">
                                    <div>
                                        <div className="font-medium text-charcoal">{item.item_name}</div>
                                        <div className="text-sm text-charcoal opacity-70">Loc: {item.location_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-charcoal">{item.quantity}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expired List */}
                <div className="bg-card rounded-lg shadow-sm border border-neutral-light overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-light bg-background-alt">
                        <h2 className="text-lg font-semibold text-primary font-serif">Expired - Needs Removal</h2>
                    </div>
                    <div className="divide-y divide-neutral-light max-h-96 overflow-y-auto">
                        {data.expired_items.length === 0 ? (
                            <div className="p-6 text-center text-charcoal opacity-60">No expired items found.</div>
                        ) : (
                            data.expired_items.map(item => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-background-warm transition-colors">
                                    <div>
                                        <div className="font-medium text-charcoal">{item.item_name}</div>
                                        <div className="text-sm text-charcoal opacity-70">Loc: {item.location_name}</div>
                                        <div className="text-xs text-red-600 mt-1">
                                            {new Date(item.expiration_date!).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="font-bold text-charcoal mb-2">{item.quantity}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-100 flex flex-col md:flex-row items-center justify-between">
                <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-bold text-blue-900">Ready to start production?</h3>
                    <p className="text-blue-700">Log your prep work to update inventory levels and reduce low stock alerts.</p>
                </div>
                <button
                    onClick={() => navigate('/production')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                    Go to Prep Log
                </button>
            </div>

            <ExpiredItemsModal 
                isOpen={isExpiredModalOpen}
                onClose={() => setIsExpiredModalOpen(false)}
                expiringItems={data.expiring_today_items}
                expiredItems={data.expired_items}
                onDispose={handleDispose}
            />
        </div>
    );
};

export default EmployeeDashboard;
