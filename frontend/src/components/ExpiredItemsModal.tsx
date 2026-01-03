import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface InventoryItem {
    id: number;
    item_name: string;
    location_name: string;
    quantity: number;
    expiration_date: string | null;
}

interface ExpiredItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    expiringItems: InventoryItem[];
    expiredItems: InventoryItem[];
    onDispose: (id: number, reason: string) => Promise<void>;
}

const ExpiredItemsModal: React.FC<ExpiredItemsModalProps> = ({ 
    isOpen, 
    onClose, 
    expiringItems, 
    expiredItems,
    onDispose 
}) => {
    const [processingId, setProcessingId] = useState<number | null>(null);

    if (!isOpen) return null;

    const handleDispose = async (id: number, itemName: string, isExpired: boolean) => {
        if (!window.confirm(`Confirm disposal of ${isExpired ? 'expired' : 'expiring'} ${itemName}?`)) return;
        
        setProcessingId(id);
        try {
            await onDispose(id, isExpired ? 'Expired' : 'Expiring Soon');
        } catch (error) {
            console.error('Error disposing item:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const hasItems = expiringItems.length > 0 || expiredItems.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Trash2 className="w-6 h-6 mr-2 text-red-600" />
                        Manage Expiring Inventory
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {!hasItems ? (
                        <div className="text-center py-10 text-gray-500">
                            <p className="text-lg">Good news! No items are expiring today or expired.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {expiredItems.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        Expired Items (Needs Removal)
                                    </h3>
                                    <div className="bg-red-50 rounded-lg border border-red-100 overflow-hidden">
                                        <div className="divide-y divide-red-100">
                                            {expiredItems.map(item => (
                                                <div key={item.id} className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{item.item_name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Location: {item.location_name} • Qty: {item.quantity}
                                                        </p>
                                                        <p className="text-xs text-red-600 mt-1">
                                                            Expired: {new Date(item.expiration_date!).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDispose(item.id, item.item_name, true)}
                                                        disabled={processingId === item.id}
                                                        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {processingId === item.id ? 'Processing...' : 'Dispose'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {expiringItems.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        Expiring Today
                                    </h3>
                                    <div className="bg-yellow-50 rounded-lg border border-yellow-100 overflow-hidden">
                                        <div className="divide-y divide-yellow-100">
                                            {expiringItems.map(item => (
                                                <div key={item.id} className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{item.item_name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Location: {item.location_name} • Qty: {item.quantity}
                                                        </p>
                                                        <p className="text-xs text-yellow-700 mt-1">
                                                            Expires: Today
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDispose(item.id, item.item_name, false)}
                                                        disabled={processingId === item.id}
                                                        className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {processingId === item.id ? 'Processing...' : 'Dispose'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiredItemsModal;





