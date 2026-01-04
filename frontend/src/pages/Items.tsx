import React, { useState, useEffect, useRef } from 'react';
import { getItems, createItem, updateItem, getLocations, getExpiredItems, disposeExpiredItem, configureItemForStore, getStores } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Item {
    id: number;
    name: string;
    type: 'ingredient' | 'product';
    base_unit: string;
    shelf_life_days: number | null;
    par: number;
    default_location: number | null;
    store: number | null;
    store_name?: string | null;
    is_global: boolean;
}

const ItemsPage: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [expiredItems, setExpiredItems] = useState<any[]>([]);
    const isSuper = !!(user?.is_superuser || user?.role === 'it' || user?.is_staff);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'ingredient' | 'product'>('ingredient');
    const [baseUnit, setBaseUnit] = useState('');
    const [tracksExpiration, setTracksExpiration] = useState(true);
    const [shelfLifeDays, setShelfLifeDays] = useState<number>(1);
    const [par, setPar] = useState<number>(0);
    const [defaultLocation, setDefaultLocation] = useState<string>('');
    const [isGlobal, setIsGlobal] = useState<boolean>(false);
    const [scopeFilter, setScopeFilter] = useState<string>('all'); // all | global | store:{id}
    const [scopeMenuOpen, setScopeMenuOpen] = useState<boolean>(false);
    const scopeMenuRef = useRef<HTMLDivElement | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (isSuper) {
                if (scopeFilter === 'global') {
                    params.scope = 'global';
                } else if (scopeFilter.startsWith('store:')) {
                    params.scope = scopeFilter;
                }
            }
            const [itemsData, locationsData, expiredData] = await Promise.all([
                getItems(params),
                getLocations(),
                getExpiredItems()
            ]);
            setItems(itemsData);
            setLocations(locationsData);
            setExpiredItems(expiredData);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [scopeFilter, isSuper]);

    useEffect(() => {
        const loadStores = async () => {
            if (!isSuper) {
                setStores([]);
                return;
            }
            try {
                const data = await getStores();
                setStores(data);
            } catch (e) {
                console.error("Failed to load stores", e);
            }
        };
        loadStores();
    }, [isSuper]);

    useEffect(() => {
        if (!scopeMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
                setScopeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [scopeMenuOpen]);

    const openModal = (item?: Item) => {
        if (item) {
            setEditingItem(item);
            setName(item.name);
            setType(item.type);
            setBaseUnit(item.base_unit);
            setPar(item.par || 0);
            setDefaultLocation(item.default_location ? item.default_location.toString() : '');
            setIsGlobal(item.is_global);
            if (item.shelf_life_days !== null) {
                setTracksExpiration(true);
                setShelfLifeDays(item.shelf_life_days);
            } else {
                setTracksExpiration(false);
                setShelfLifeDays(1); // Default
            }
        } else {
            setEditingItem(null);
            setName('');
            setType('ingredient');
            setBaseUnit('');
            setTracksExpiration(true);
            setShelfLifeDays(1);
            setPar(0);
            setDefaultLocation('');
            setIsGlobal(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            name,
            type,
            base_unit: baseUnit,
            shelf_life_days: tracksExpiration ? shelfLifeDays : null,
            par,
            default_location: defaultLocation ? parseInt(defaultLocation) : null,
            is_global: isSuper ? isGlobal : false
        };

        try {
            if (editingItem) {
                if (editingItem.is_global && !isSuper) {
                    await configureItemForStore(editingItem.id, {
                        par,
                        default_location: defaultLocation ? parseInt(defaultLocation) : null
                    });
                } else {
                    await updateItem(editingItem.id, payload);
                }
            } else {
                await createItem(payload);
            }
            closeModal();
            fetchData();
        } catch (err) {
            console.error("Failed to save item", err);
            alert("Failed to save item.");
        }
    };

    const handleDispose = async (invId: number) => {
        if(!window.confirm("Confirm disposal of this expired batch?")) return;
        try {
            await disposeExpiredItem(invId, "Expired");
            // Refresh
            const expiredData = await getExpiredItems();
            setExpiredItems(expiredData);
        } catch(e) {
            alert("Failed to dispose");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Items Management</h1>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => openModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Item
                        </button>
                    </div>
                </div>

                {expiredItems.length > 0 && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Expired Goods Detected
                        </h2>
                        <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-red-100 text-red-800 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Item</th>
                                        <th className="p-3">Location</th>
                                        <th className="p-3">Quantity</th>
                                        <th className="p-3">Expires</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                    {expiredItems.map((exp: any) => (
                                        <tr key={exp.id}>
                                            <td className="p-3 font-medium text-gray-800">{exp.item_name}</td>
                                            <td className="p-3 text-gray-600">{exp.location_name}</td>
                                            <td className="p-3 font-bold">{exp.quantity}</td>
                                            <td className="p-3 text-red-600 font-medium">
                                                {new Date(exp.expiration_date).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button 
                                                    onClick={() => handleDispose(exp.id)}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                                                >
                                                    Dispose
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 text-sm uppercase font-semibold">
                                <th className="p-4 border-b">Name</th>
                                <th className="p-4 border-b">
                                    <div className="flex items-center space-x-2">
                                        <span>Scope</span>
                                        {isSuper && (
                                            <div className="relative" ref={scopeMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setScopeMenuOpen(prev => !prev)}
                                                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-700 transition-colors"
                                                >
                                                    {scopeFilter === 'all' && 'All'}
                                                    {scopeFilter === 'global' && 'Global'}
                                                    {scopeFilter.startsWith('store:') && (() => {
                                                        const id = scopeFilter.split(':')[1];
                                                        const store = stores.find((s: any) => String(s.id) === id);
                                                        return store ? store.name : 'Store';
                                                    })()}
                                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                {scopeMenuOpen && (
                                                    <div className="absolute mt-1 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                                        <ul className="py-1 text-sm text-gray-700">
                                                            <li>
                                                                <button
                                                                    onClick={() => { setScopeFilter('all'); setScopeMenuOpen(false); }}
                                                                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${scopeFilter === 'all' ? 'bg-gray-100 font-semibold' : ''}`}
                                                                >
                                                                    All scopes
                                                                </button>
                                                            </li>
                                                            <li>
                                                                <button
                                                                    onClick={() => { setScopeFilter('global'); setScopeMenuOpen(false); }}
                                                                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${scopeFilter === 'global' ? 'bg-gray-100 font-semibold' : ''}`}
                                                                >
                                                                    Global
                                                                </button>
                                                            </li>
                                                            {stores.map((s: any) => (
                                                                <li key={s.id}>
                                                                    <button
                                                                        onClick={() => { setScopeFilter(`store:${s.id}`); setScopeMenuOpen(false); }}
                                                                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${scopeFilter === `store:${s.id}` ? 'bg-gray-100 font-semibold' : ''}`}
                                                                    >
                                                                        {s.name}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </th>
                                <th className="p-4 border-b">Type</th>
                                <th className="p-4 border-b">Base Unit</th>
                                <th className="p-4 border-b">Shelf Life</th>
                                <th className="p-4 border-b text-right">Par Level</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No items found.</td></tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="p-4">
                                            {item.is_global ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                                                    Global
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                                    {item.store_name || 'Store'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 capitalize">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${item.type === 'product' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-4">{item.base_unit}</td>
                                        <td className="p-4">
                                            {item.shelf_life_days !== null 
                                                ? <span className="text-green-600 font-medium">{item.shelf_life_days} Days</span> 
                                                : <span className="text-gray-400 italic">No Expiration</span>
                                            }
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-700">{item.par}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => openModal(item)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={editingItem?.is_global && !isSuper}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select 
                                        value={type}
                                        onChange={e => setType(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        disabled={editingItem?.is_global && !isSuper}
                                    >
                                        <option value="ingredient">Ingredient</option>
                                        <option value="product">Product</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Unit</label>
                                    <input 
                                        type="text" 
                                        value={baseUnit}
                                        onChange={e => setBaseUnit(e.target.value)}
                                        placeholder="e.g. kg, box"
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        required
                                        disabled={editingItem?.is_global && !isSuper}
                                    />
                                </div>
                            </div>

                            {isSuper && (
                                <div className="flex items-center space-x-2">
                                    <input
                                        id="isGlobal"
                                        type="checkbox"
                                        checked={isGlobal}
                                        onChange={e => setIsGlobal(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                        disabled={!!editingItem?.id} // don't change scope on edit
                                    />
                                    <label htmlFor="isGlobal" className="text-sm text-gray-700">
                                        Make this a global item (available to all stores)
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Storage Location</label>
                                <select 
                                    value={defaultLocation}
                                    onChange={e => setDefaultLocation(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">No Default Location</option>
                                    {locations.map((loc: any) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Newly received items will default to this location.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Par Level (Minimum Stock)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={par}
                                    onChange={e => setPar(parseFloat(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Set the minimum quantity you want to keep on hand for this store.
                                </p>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={tracksExpiration}
                                        onChange={e => setTracksExpiration(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                        disabled={editingItem?.is_global && !isSuper}
                                    />
                                    <span className="text-gray-900 font-medium">Tracks Expiration / Shelf Life</span>
                                </label>
                                
                                {tracksExpiration && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life (Days)</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={shelfLifeDays}
                                            onChange={e => setShelfLifeDays(parseInt(e.target.value))}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                            required={tracksExpiration}
                                            disabled={editingItem?.is_global && !isSuper}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Inventory created for this item will automatically expire after this many days.
                                        </p>
                                    </div>
                                )}
                                {!tracksExpiration && (
                                    <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded italic">
                                        This item will be treated as non-perishable (e.g. frozen, dry goods).
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;
