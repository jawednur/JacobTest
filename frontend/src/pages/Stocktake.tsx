import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import {
    startStocktakeSession,
    saveStocktakeRecords,
    finalizeStocktakeSession,
    getLocations,
    getItems,
    getItemConversions
} from '../services/api';

// Types
interface Location {
    id: number;
    name: string;
}

interface Item {
    id: number;
    name: string;
    base_unit: string;
}

interface StockCount {
    actual_quantity: string;
    unit_name: string;
}

const StocktakePage: React.FC = () => {
    // Session State
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Data State
    const [locations, setLocations] = useState<Location[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [itemUnits, setItemUnits] = useState<{ [key: number]: any[] }>({});

    // Flow State
    const [activeLocation, setActiveLocation] = useState<Location | null>(null);
    const [completedLocations, setCompletedLocations] = useState<number[]>([]);
    const [locationCounts, setLocationCounts] = useState<{ [locationId: number]: { [itemId: number]: number } }>({}); // For display in dashboard

    // Counting State (Current Location)
    const [currentCounts, setCurrentCounts] = useState<{ [key: number]: StockCount }>({});
    const [submitting, setSubmitting] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState(0); // -1 (prev), 1 (next)

    // Report State
    const [report, setReport] = useState<any[] | null>(null);

    // Initial Load
    useEffect(() => {
        initializeStocktake();
    }, []);

    const initializeStocktake = async () => {
        setLoading(true);
        try {
            // Start or Get Session
            const sessionData = await startStocktakeSession();
            setSession(sessionData);

            // Load Metadata
            const [locs, itemsData] = await Promise.all([
                getLocations(),
                getItems()
            ]);
            setLocations(locs);
            setItems(itemsData);

            // Load Units (can be optimized to load on demand, but preloading for smoother UI)
            const unitsMap: { [key: number]: any[] } = {};
            await Promise.all(itemsData.map(async (item: any) => {
                try {
                    const convs = await getItemConversions(item.id);
                    unitsMap[item.id] = convs;
                } catch (e) { /* ignore */ }
            }));
            setItemUnits(unitsMap);

        } catch (err) {
            console.error("Failed to init stocktake", err);
            alert("Could not start stocktake session.");
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleSelectLocation = (location: Location) => {
        setActiveLocation(location);
        setCurrentCounts({}); // Reset form for new location
        setCurrentItemIndex(0);
        setSlideDirection(0);
    };

    const handleQuantityChange = (itemId: number, val: string) => {
        const item = items.find(i => i.id === itemId);
        const defaultUnit = item ? item.base_unit : '';

        setCurrentCounts(prev => ({
            ...prev,
            [itemId]: {
                actual_quantity: val,
                unit_name: prev[itemId]?.unit_name || defaultUnit
            }
        }));
    };

    const handleUnitChange = (itemId: number, unit: string) => {
        setCurrentCounts(prev => ({
            ...prev,
            [itemId]: {
                actual_quantity: prev[itemId]?.actual_quantity || '',
                unit_name: unit
            }
        }));
    };

    // Navigation Handlers
    const handleNext = () => {
        if (currentItemIndex < items.length - 1) {
            setSlideDirection(1);
            setCurrentItemIndex(prev => prev + 1);
        } else {
            // Optional feedback for end of list
        }
    };

    const handlePrev = () => {
        if (currentItemIndex > 0) {
            setSlideDirection(-1);
            setCurrentItemIndex(prev => prev - 1);
        }
    };

    const handleIncrement = (itemId: number) => {
        const currentCount = currentCounts[itemId];
        const val = parseFloat(currentCount?.actual_quantity || '0');
        handleQuantityChange(itemId, (val + 1).toString());
    };

    const handleDecrement = (itemId: number) => {
        const currentCount = currentCounts[itemId];
        const val = parseFloat(currentCount?.actual_quantity || '0');
        if (val > 0) {
            handleQuantityChange(itemId, (val - 1).toString());
        }
    };

    // Swipe Handlers
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleNext(),
        onSwipedRight: () => handlePrev(),
        preventScrollOnSwipe: false,
        trackMouse: true
    });


    const submitLocationCounts = async () => {
        if (!activeLocation || !session) return;
        setSubmitting(true);

        // Prepare Payload
        const records = Object.keys(currentCounts).map(itemIdStr => {
            const itemId = parseInt(itemIdStr);
            const countData = currentCounts[itemId];
            if (!countData.actual_quantity) return null; // Skip empty

            return {
                item_id: itemId,
                location_id: activeLocation.id,
                quantity_counted: countData.actual_quantity,
                unit_name: countData.unit_name
            };
        }).filter(r => r !== null);

        if (records.length === 0 && !window.confirm("No items counted. Mark this location as done?")) {
            setSubmitting(false);
            return;
        }

        try {
            await saveStocktakeRecords(session.id, records);

            // Mark complete locally
            setCompletedLocations(prev => [...prev, activeLocation.id]);

            // Store summary
            const summary: { [itemId: number]: number } = {};
            records.forEach(r => {
                if (r) summary[r.item_id] = parseFloat(r.quantity_counted as string);
            });
            setLocationCounts(prev => ({
                ...prev,
                [activeLocation.id]: summary
            }));

            setActiveLocation(null); // Return to dashboard
        } catch (err) {
            console.error(err);
            alert("Failed to save counts.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalize = async () => {
        if (!window.confirm("Are you sure you want to finalize the stocktake? Inventory will be updated.")) return;

        setLoading(true);
        try {
            const data = await finalizeStocktakeSession(session.id);
            setReport(data.report);
            setSession(null); // Clear session
        } catch (err) {
            console.error(err);
            alert("Failed to finalize stocktake.");
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---

    if (loading && !report) return <div className="p-8 text-center">Loading Stocktake...</div>;

    // Report View
    if (report) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Stocktake Report</h1>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Start New Stocktake
                        </button>
                    </div>
                    {/* Simplified report view for brevity in rewrite, keeping table logic is fine but focusing on cards */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700 uppercase">
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-right">Start</th>
                                    <th className="p-3 text-right">Counted</th>
                                    <th className="p-3 text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.map((row: any, idx: number) => (
                                    <tr key={idx} className="border-b">
                                        <td className="p-3">{row.item_name}</td>
                                        <td className="p-3 text-right">{row.start_quantity}</td>
                                        <td className="p-3 text-right">{row.end_quantity}</td>
                                        <td className={`p-3 text-right ${row.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {row.variance.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Counting View (Swipe Interface)
    if (activeLocation && items.length > 0) {
        const currentItem = items[currentItemIndex];
        const itemConversions = itemUnits[currentItem.id] || [];
        const currentCount = currentCounts[currentItem.id] || { actual_quantity: '0', unit_name: currentItem.base_unit };
        const progress = ((currentItemIndex + 1) / items.length) * 100;

        return (
            <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white px-4 py-3 shadow-sm z-10 flex justify-between items-center">
                    <button
                        onClick={() => setActiveLocation(null)}
                        className="p-2 text-gray-500 hover:text-gray-800"
                    >
                        ✕ Cancel
                    </button>
                    <div className="text-center">
                        <h2 className="font-bold text-gray-800">{activeLocation.name}</h2>
                        <div className="text-xs text-gray-500">
                            Item {currentItemIndex + 1} of {items.length}
                        </div>
                    </div>
                    <button
                        onClick={submitLocationCounts}
                        disabled={submitting}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                        Finish
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 h-1">
                    <div
                        className="bg-blue-500 h-1 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Card Container */}
                <div
                    {...swipeHandlers}
                    className="flex-1 flex flex-col items-center justify-center p-6 relative"
                >
                    <AnimatePresence initial={false} custom={slideDirection}>
                        <motion.div
                            key={currentItem.id}
                            custom={slideDirection}
                            initial={{ x: slideDirection > 0 ? 300 : -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: slideDirection > 0 ? -300 : 300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute w-full max-w-sm"
                        >
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex flex-col border border-gray-100">
                                {/* Card Content */}
                                <div className="flex-1 p-8 flex flex-col items-center text-center justify-center space-y-6">

                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentItem.name}</h3>
                                        {/* Removed confusing swipe instruction */}
                                    </div>

                                    {/* Quantity Display */}
                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={() => handleIncrement(currentItem.id)}
                                            className="p-4 text-gray-400 hover:text-blue-600 transition mb-2 focus:outline-none active:scale-95 transform"
                                            aria-label="Increase Quantity"
                                        >
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                        </button>

                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={currentCount.actual_quantity || ''}
                                            onChange={(e) => handleQuantityChange(currentItem.id, e.target.value)}
                                            placeholder="0"
                                            className="text-6xl font-black text-blue-600 text-center w-full bg-transparent border-none focus:ring-0 p-0 m-0"
                                            style={{ appearance: 'textfield', MozAppearance: 'textfield' }} // Hide spinner arrows
                                        />

                                        <button
                                            onClick={() => handleDecrement(currentItem.id)}
                                            className="p-4 text-gray-400 hover:text-blue-600 transition mt-2 focus:outline-none active:scale-95 transform"
                                            aria-label="Decrease Quantity"
                                        >
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>

                                    {/* Unit Selector */}
                                    <div className="w-full">
                                        <select
                                            className="w-full p-3 text-center border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700 font-medium focus:border-blue-500 focus:ring-0 transition"
                                            value={currentCount.unit_name}
                                            onChange={(e) => handleUnitChange(currentItem.id, e.target.value)}
                                        >
                                            <option value={currentItem.base_unit}>{currentItem.base_unit}</option>
                                            {itemConversions.map((c: any) => (
                                                <option key={c.id} value={c.unit_name}>
                                                    {c.unit_name} ({c.factor}x)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                </div>

                                {/* Navigation Hints */}
                                <div className="bg-gray-50 p-0 flex justify-between text-gray-400 text-sm font-medium border-t border-gray-100 h-16">
                                    <div className="flex-1 flex items-center justify-start pl-4 border-r border-gray-100">
                                        {currentItemIndex > 0 ? (
                                            <button 
                                                onClick={handlePrev}
                                                className="flex items-center text-gray-600 hover:text-blue-600 transition px-4 py-2 rounded-lg hover:bg-blue-50 w-full h-full justify-start"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                Previous
                                            </button>
                                        ) : <div className="w-full"></div>}
                                    </div>
                                    <div className="flex-1 flex items-center justify-end pr-4">
                                        {currentItemIndex < items.length - 1 ? (
                                            <button 
                                                onClick={handleNext}
                                                className="flex items-center text-gray-600 hover:text-blue-600 transition px-4 py-2 rounded-lg hover:bg-blue-50 w-full h-full justify-end"
                                            >
                                                Next Item
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={submitLocationCounts}
                                                disabled={submitting}
                                                className="flex items-center text-blue-600 hover:text-blue-700 transition px-4 py-2 rounded-lg hover:bg-blue-50 w-full h-full justify-end font-bold"
                                            >
                                                Finish
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Instructions Overlay (Optional, visually helpful) */}
                    <div className="absolute bottom-8 text-gray-400 text-xs text-center pointer-events-none">
                        Swipe Left/Right to Navigate • Swipe Up/Down to Count
                    </div>
                </div>
            </div>
        );
    }

    // Fallback if no items in counting view but location active
    if (activeLocation && items.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">No items found to count.</p>
                <button onClick={() => setActiveLocation(null)} className="text-blue-600">Go Back</button>
            </div>
        );
    }

    // Dashboard View (Select Location)
    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                <header className="mb-12 text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Stocktake In Progress</h1>
                    <p className="text-gray-600">Select a location to enter counts.</p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-auto justify-items-center">
                    {locations.map(loc => {
                        const isCompleted = completedLocations.includes(loc.id);
                        const countSummary = locationCounts[loc.id];
                        const countTotal = countSummary ? Object.keys(countSummary).length : 0;

                        return (
                            <div
                                key={loc.id}
                                onClick={() => !isCompleted && handleSelectLocation(loc)}
                                className={`
                                    relative p-6 rounded-xl shadow-md border cursor-pointer transition-all transform hover:-translate-y-1 w-full max-w-sm flex flex-col h-64 justify-between
                                    ${isCompleted ? 'bg-gray-50 border-green-500' : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-xl'}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{loc.name}</h3>
                                    {isCompleted && (
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2">
                                            COMPLETED
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex-1 flex items-center justify-center">
                                    {isCompleted ? (
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-green-600 mb-1">{countTotal}</div>
                                            <div className="text-sm text-gray-500">Items Counted</div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <div className="text-sm">Tap to Start</div>
                                        </div>
                                    )}
                                </div>

                                {isCompleted ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSelectLocation(loc); }}
                                        className="mt-4 w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded transition"
                                    >
                                        Edit Counts
                                    </button>
                                ) : (
                                    <div className="mt-4 w-full py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded text-center group-hover:bg-blue-600 group-hover:text-white transition">
                                        Start Counting →
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="sticky bottom-0 bg-white p-6 rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 flex justify-between items-center z-10 mt-8 mx-auto max-w-7xl w-full">
                <div className="text-gray-600 font-medium">
                    Progress: <span className="text-gray-900 font-bold">{completedLocations.length}</span> / {locations.length} Locations
                </div>
                <button
                    onClick={handleFinalize}
                    disabled={completedLocations.length === 0}
                    className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Finalize Stocktake
                </button>
            </div>
        </div>
    );
};

export default StocktakePage;
