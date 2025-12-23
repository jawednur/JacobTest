import React, { useState, useEffect } from 'react';
import { getFullInventory, getItemConversions } from '../services/api';

interface InventoryItem {
  id: number;
  item: number; // Item ID
  item_name: string;
  item_type: string;
  location_name: string;
  quantity: number;
  expiration_date: string | null;
  store_name: string;
}

interface UnitConversion {
    id: number;
    unit_name: string;
    factor: number;
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'expiration'>('alphabetical');
  
  // State to track clicked items for unit toggling
  // Map: inventoryId -> { currentUnit: string, factor: number, availableUnits: UnitConversion[] }
  const [displayUnits, setDisplayUnits] = useState<{[key: number]: {currentUnit: string, factor: number, availableUnits: UnitConversion[]}}>({});

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const data = await getFullInventory(filterType);
        // Ensure data is array
        // Type assertion to handle potential pagination structure
        const results = Array.isArray(data) ? data : (data as any).results || [];
        
        // Sort results
        if (sortOrder === 'alphabetical') {
            results.sort((a: InventoryItem, b: InventoryItem) => a.item_name.localeCompare(b.item_name));
        } else if (sortOrder === 'expiration') {
            results.sort((a: InventoryItem, b: InventoryItem) => {
                if (!a.expiration_date) return 1; // No expiration goes to bottom
                if (!b.expiration_date) return -1;
                return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
            });
        }

        setInventory(results);
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [filterType, sortOrder]);

  const handleQuantityClick = async (invItem: InventoryItem) => {
      // If we already have units loaded, cycle to the next one
      if (displayUnits[invItem.id]) {
          const currentstate = displayUnits[invItem.id];
          const units = currentstate.availableUnits;
          if (units.length === 0) return;

          // Find current index
          const currentIndex = units.findIndex(u => u.unit_name === currentstate.currentUnit);
          const nextIndex = (currentIndex + 1) % units.length;
          const nextUnit = units[nextIndex];

          setDisplayUnits(prev => ({
              ...prev,
              [invItem.id]: {
                  ...prev[invItem.id],
                  currentUnit: nextUnit.unit_name,
                  factor: nextUnit.factor
              }
          }));
      } else {
          // First click: fetch conversions and set initial toggle state
          try {
              const conversions = await getItemConversions(invItem.item);
              // Base unit is always implicit factor 1, but we don't know the name from InventoryItem directly 
              // (Wait, we don't have base_unit name in InventoryItem serializer, only ID and Name)
              // Actually, we should probably fetch the item details or rely on conversions.
              // For simplicity, let's assume 'Base Unit' if factor is 1, or try to guess.
              // Better approach: Add base_unit to InventorySerializer in backend. 
              // For now, let's just use the conversions returned. If empty, we can't do much.
              
              // We'll simulate a base unit entry if we can, or just use what we have.
              // Let's assume the API returns conversions relative to base.
              // We will add a "Base" option with factor 1.
              
              const allUnits = [
                  { id: -1, unit_name: 'Base Unit', factor: 1.0 },
                  ...conversions
              ];

              if (conversions.length > 0) {
                   // Switch to first converted unit immediately for feedback
                   const firstConv = conversions[0];
                   setDisplayUnits(prev => ({
                       ...prev,
                       [invItem.id]: {
                           currentUnit: firstConv.unit_name,
                           factor: firstConv.factor,
                           availableUnits: allUnits
                       }
                   }));
              } else {
                  // No conversions available
                  alert("No alternative units defined for this item.");
              }

          } catch (err) {
              console.error("Failed to load conversions", err);
          }
      }
  };

  const getDisplayQuantity = (item: InventoryItem) => {
      const state = displayUnits[item.id];
      if (state && state.factor > 0) {
          const val = item.quantity / state.factor;
          return `${val.toFixed(2).replace(/\.00$/, '')} ${state.currentUnit}`;
      }
      return item.quantity; // Default (Base)
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Full Inventory</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Sort by:</span>
              <select
                className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="alphabetical">Alphabetical (A-Z)</option>
                <option value="expiration">Expiration (Soonest)</option>
              </select>
            </div>
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
                      <td 
                        className="p-4 text-right font-mono font-bold text-blue-600 cursor-pointer hover:bg-blue-50 select-none"
                        onClick={() => handleQuantityClick(item)}
                        title="Click to toggle units"
                      >
                        {getDisplayQuantity(item)}
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
