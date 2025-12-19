import React, { useState, useEffect } from 'react';
import { getFullInventory } from '../services/api';

interface InventoryItem {
  id: number;
  item_name: string;
  location_name: string;
  quantity: number;
  expiration_date: string | null;
  // Note: Backend might need to be updated to include 'par' if it's not on the Inventory model directly
  // Typically 'par' is on StoreItemSettings.
  // We might need to fetch settings or have backend serialize it onto this object.
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const data = await getFullInventory(filterType);
        // Ensure data is array (drf pagination might wrap in 'results')
        const results = Array.isArray(data) ? data : data.results || [];
        setInventory(results);
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [filterType]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Full Inventory</h1>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 font-medium">Filter by:</span>
            <select
              className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Items</option>
              <option value="ingredient">Ingredients</option>
              <option value="product">Products</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm uppercase font-semibold">
                  <th className="p-4 border-b">Item Name</th>
                  <th className="p-4 border-b">Location</th>
                  <th className="p-4 border-b text-right">Quantity On Hand</th>
                  {/* <th className="p-4 border-b text-right">Par Level</th> */}
                  <th className="p-4 border-b">Expiration Date</th>
                  <th className="p-4 border-b">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Loading inventory data...</td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No inventory items found.</td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{item.item_name}</td>
                      <td className="p-4">
                        <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-xs font-semibold text-gray-600">
                          {item.location_name}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-blue-600">
                        {item.quantity}
                      </td>
                      {/* <td className="p-4 text-right text-gray-500">-</td> */}
                      <td className="p-4 text-sm">
                        {item.expiration_date
                          ? <span className={new Date(item.expiration_date) < new Date() ? 'text-red-600 font-bold' : ''}>
                            {new Date(item.expiration_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          : <span className="text-gray-400 italic">Does not expire</span>
                        }
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {/* Assuming we have a last_updated field, otherwise fallback or remove */}
                        Today {/* Placeholder if field missing */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
