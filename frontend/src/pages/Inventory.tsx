import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Item {
    id: number;
    name: string;
    type: string;
    base_unit: string;
    shelf_life_hours: number;
}

interface ApiResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Item[];
}

const Inventory: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filtering & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState(''); // '' means all
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        type: 'ingredient',
        base_unit: '',
        shelf_life_hours: 24
    });

    useEffect(() => {
        fetchItems();
    }, [page, searchQuery, filterType]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: page,
            };
            if (searchQuery) params.search = searchQuery;
            if (filterType) params.type = filterType;

            const response = await api.get<ApiResponse>('items/', { params });
            // Handle both paginated and non-paginated (just in case backend setup varies)
            if (Array.isArray(response.data)) {
                setItems(response.data);
                setTotalCount(response.data.length);
                setHasNext(false);
                setHasPrev(false);
            } else {
                setItems(response.data.results);
                setTotalCount(response.data.count);
                setHasNext(!!response.data.next);
                setHasPrev(!!response.data.previous);
            }
        } catch (error) {
            console.error("Failed to fetch items", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1); // Reset to first page on new search
    };

    const handleFilterChange = (type: string) => {
        setFilterType(type);
        setPage(1);
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('items/', newItem);
            setIsModalOpen(false);
            setNewItem({ name: '', type: 'ingredient', base_unit: '', shelf_life_hours: 24 });
            fetchItems();
        } catch (error) {
            console.error("Failed to create item", error);
            alert("Failed to create item.");
        }
    };

    return (
        <div className="flex gap-6">
            {/* Sidebar Filters */}
            <div className="w-64 flex-shrink-0">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center mb-4 text-dark-grey">
                        <Filter className="w-5 h-5 mr-2" />
                        <h2 className="font-serif font-bold text-lg">Filters</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-sans">Type</h3>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value=""
                                        checked={filterType === ''}
                                        onChange={() => handleFilterChange('')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-sans text-dark-grey">All Items</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="ingredient"
                                        checked={filterType === 'ingredient'}
                                        onChange={() => handleFilterChange('ingredient')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-sans text-dark-grey">Ingredients</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="product"
                                        checked={filterType === 'product'}
                                        onChange={() => handleFilterChange('product')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-sans text-dark-grey">Products</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-serif text-dark-grey">Inventory Items</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary text-white font-bold py-2 px-4 rounded flex items-center hover:bg-tertiary-gold transition-colors font-sans uppercase text-sm tracking-wider"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Item
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search items by name..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>

                {/* Table */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-serif font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-serif font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-serif font-bold text-gray-500 uppercase tracking-wider">Base Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-serif font-bold text-gray-500 uppercase tracking-wider">Shelf Life (Hrs)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 font-sans">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length > 0 ? (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.base_unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.shelf_life_hours}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-sans">
                                        No items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="text-sm text-gray-500 font-sans">
                        Showing page {page} of {Math.ceil(totalCount / 10) || 1}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={!hasPrev}
                            className={`p-2 rounded border ${!hasPrev ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasNext}
                            className={`p-2 rounded border ${!hasNext ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
                        <h2 className="text-2xl font-bold font-serif mb-6 text-dark-grey">Create New Item</h2>
                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Name</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Type</label>
                                <select
                                    value={newItem.type}
                                    onChange={e => setNewItem({...newItem, type: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans bg-white"
                                >
                                    <option value="ingredient">Ingredient</option>
                                    <option value="product">Product</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Base Unit</label>
                                <input
                                    type="text"
                                    value={newItem.base_unit}
                                    onChange={e => setNewItem({...newItem, base_unit: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                                    placeholder="e.g. Gram, Single"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Shelf Life (Hours)</label>
                                <input
                                    type="number"
                                    value={newItem.shelf_life_hours}
                                    onChange={e => setNewItem({...newItem, shelf_life_hours: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-500 hover:text-gray-700 font-sans"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-tertiary-gold transition-colors font-sans uppercase text-sm tracking-wider"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
