import React, { useState, useEffect, useMemo } from 'react';
import { getItems, getItemConversions, createUnitConversion, deleteUnitConversion, getLocations, getFullInventory } from '../services/api';

interface Item {
    id: number;
    name: string;
    base_unit: string;
    default_location?: number | null;
}

interface Location {
    id: number;
    name: string;
}

interface InventoryEntry {
    item: number;
    location: number | null;
}

interface UnitConversion {
    id: number;
    item: number;
    unit_name: string;
    factor: number;
    is_default_display: boolean;
}

const UnitConversions: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [conversions, setConversions] = useState<UnitConversion[]>([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<number | 'all'>('all');
    const [itemLocations, setItemLocations] = useState<Map<number, Set<number>>>(new Map());
    
    // Form State
    const [newUnitName, setNewUnitName] = useState('');
    const [newFactor, setNewFactor] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const [itemsData, locationsData, inventoryData] = await Promise.all([
                    getItems(),
                    getLocations(),
                    getFullInventory()
                ]);
                // Ensure data is array or handle pagination result object
                let itemsArray: Item[] = [];
                if (Array.isArray(itemsData)) {
                    itemsArray = itemsData;
                } else if ((itemsData as any).results) {
                    itemsArray = (itemsData as any).results;
                }

                setLocations(locationsData || []);
                const invArray: InventoryEntry[] = Array.isArray(inventoryData) ? inventoryData : (inventoryData?.results || []);
                const locationMap = new Map<number, Set<number>>();

                itemsArray.forEach(item => {
                    if (item.default_location) {
                        const set = locationMap.get(item.id) || new Set<number>();
                        set.add(item.default_location);
                        locationMap.set(item.id, set);
                    }
                });

                invArray.forEach(entry => {
                    if (entry.location) {
                        const set = locationMap.get(entry.item) || new Set<number>();
                        set.add(entry.location);
                        locationMap.set(entry.item, set);
                    }
                });

                setItemLocations(locationMap);
                setItems(itemsArray);
                if (itemsArray.length > 0) {
                    setSelectedItem(itemsArray[0]);
                }
            } catch (err) {
                console.error("Failed to fetch items", err);
                setError("Failed to load items.");
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    useEffect(() => {
        if (selectedItem) {
            fetchConversions(selectedItem.id);
        }
    }, [selectedItem]);

    const filteredItems = useMemo(() => {
        if (selectedLocation === 'all') return items;
        return items.filter(item => {
            const locs = itemLocations.get(item.id);
            return locs ? locs.has(selectedLocation) : false;
        });
    }, [items, selectedLocation, itemLocations]);

    useEffect(() => {
        // When the filter changes, keep selection within the filtered list
        if (!filteredItems.length) {
            setSelectedItem(null);
            setConversions([]);
            return;
        }

        if (!selectedItem || !filteredItems.some(i => i.id === selectedItem.id)) {
            setSelectedItem(filteredItems[0]);
        }
    }, [filteredItems, selectedItem]);

    const fetchConversions = async (itemId: number) => {
        try {
            const data = await getItemConversions(itemId);
            setConversions(data);
        } catch (err) {
            console.error("Failed to fetch conversions", err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !newUnitName || !newFactor) return;

        try {
            await createUnitConversion({
                item: selectedItem.id,
                unit_name: newUnitName,
                factor: parseFloat(newFactor),
                is_default_display: false
            });
            
            // Reset form and reload
            setNewUnitName('');
            setNewFactor('');
            fetchConversions(selectedItem.id);
        } catch (err) {
            console.error("Failed to create conversion", err);
            setError("Failed to create conversion. Check inputs.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this conversion?")) return;
        try {
            await deleteUnitConversion(id);
            if (selectedItem) {
                fetchConversions(selectedItem.id);
            }
        } catch (err) {
            console.error("Failed to delete conversion", err);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Unit Conversion Management</h1>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Location</label>
                        <select
                            value={selectedLocation}
                            onChange={e => setSelectedLocation(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar: Item Selection */}
                    <div className="w-full md:w-1/3 bg-white rounded-lg shadow-md p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4 text-gray-700">Select Item</h2>
                        <div className="space-y-2">
                            {filteredItems.length === 0 && (
                                <p className="text-gray-400 text-sm italic">No items for this location.</p>
                            )}
                            {filteredItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                                        selectedItem?.id === item.id 
                                        ? 'bg-blue-100 text-blue-800 font-medium' 
                                        : 'hover:bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main: Conversions for Selected Item */}
                    <div className="w-full md:w-2/3">
                        {selectedItem ? (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-2">{selectedItem.name}</h2>
                                <p className="text-sm text-gray-500 mb-6">Base Unit: <span className="font-medium text-gray-700">{selectedItem.base_unit}</span></p>

                                {/* List Existing Conversions */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Existing Conversions</h3>
                                    {conversions.length === 0 ? (
                                        <p className="text-gray-400 italic">No conversions defined.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {conversions.map(conv => (
                                                <div key={conv.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-100">
                                                    <div>
                                                        <span className="font-bold text-gray-800">1 {conv.unit_name}</span>
                                                        <span className="text-gray-500 mx-2">=</span>
                                                        <span className="text-gray-700">{conv.factor} {selectedItem.base_unit}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDelete(conv.id)}
                                                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Add New Conversion Form */}
                                <div className="border-t pt-6">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Add New Conversion</h3>
                                    {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
                                    <form onSubmit={handleCreate} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
                                                <input
                                                    type="text"
                                                    value={newUnitName}
                                                    onChange={e => setNewUnitName(e.target.value)}
                                                    placeholder="e.g. Box"
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Factor (in {selectedItem.base_unit})</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newFactor}
                                                    onChange={e => setNewFactor(e.target.value)}
                                                    placeholder="e.g. 28.0"
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                                        >
                                            Add Conversion
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                                Select an item to manage its conversions.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitConversions;


