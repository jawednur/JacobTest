import React, { useState, useEffect } from 'react';
import { getRecipesList, deleteRecipe } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CreateRecipeModal from '../components/CreateRecipeModal';
import { Plus, Trash2, Edit } from 'lucide-react';

interface RecipeStepIngredient {
    id: number;
    item_name: string;
    location_name: string;
}

interface RecipeStep {
    id: number;
    step_number: number;
    instruction: string;
    image: string | null;
    caption: string;
    ingredients: RecipeStepIngredient[];
}

interface RecipeIngredient {
    id: number;
    ingredient_item: number;
    item_name: string;
    quantity_required: number;
    base_unit: string;
    display_quantity: number;
    display_unit: string;
    location_name: string;
}

interface Recipe {
    id: number;
    item: number;
    item_name: string;
    base_unit: string;
    yield_quantity: number;
    steps: RecipeStep[];
    ingredients: RecipeIngredient[];
}

// Helper to format decimal as fraction
const formatQuantity = (val: number): string => {
    if (val === 0) return "0";

    // Check if close to whole number
    if (Math.abs(val - Math.round(val)) < 0.01) {
        return Math.round(val).toString();
    }

    const whole = Math.floor(val);
    const decimal = val - whole;

    // Common fraction mapping
    const fractions: { [key: string]: string } = {
        "0.25": "1/4",
        "0.33": "1/3",
        "0.5": "1/2",
        "0.66": "2/3",
        "0.75": "3/4"
    };

    // Find closest fraction
    let bestFraction = "";
    let minDiff = 0.04; // Tolerance

    for (const [decStr, fracStr] of Object.entries(fractions)) {
        const dec = parseFloat(decStr);
        if (Math.abs(decimal - dec) < minDiff) {
            bestFraction = fracStr;
            break;
        }
    }

    if (bestFraction) {
        return whole > 0 ? `${whole} ${bestFraction}` : bestFraction;
    }

    // Default to 2 decimals if no common fraction match
    return val.toFixed(2).replace(/\.00$/, '');
};

const RecipesPage: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    // Navigation & Query Params
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const recipeIdParam = searchParams.get('id');
    const returnToProduction = searchParams.get('returnToProduction') === 'true'; // Check if we should return

    // Swipeable Card State
    const [currentCardIndex, setCurrentCardIndex] = useState(0); // 0 = Overview, 1+ = Steps
    const [slideDirection, setSlideDirection] = useState(0);

    const { user } = useAuth();
    const canManageRecipes = user?.role === 'admin' || user?.role === 'it' || user?.is_superuser || user?.is_staff;
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    useEffect(() => {
        fetchRecipes();
    }, [recipeIdParam]); // Re-run if ID param changes (though mostly on mount)

    const fetchRecipes = async () => {
        try {
            const data = await getRecipesList();
            setRecipes(data);

            // Check if ID in URL
            if (recipeIdParam) {
                const found = data.find((r: Recipe) => r.id === parseInt(recipeIdParam));
                if (found) {
                    setSelectedRecipe(found);
                }
            }
        } catch (err) {
            console.error("Failed to fetch recipes", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRecipe = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setCurrentCardIndex(0);
        setSlideDirection(0);
        // Optional: update URL without reload to support bookmarking/back
        // window.history.pushState({}, '', `/recipes?id=${recipe.id}`);
    };

    const handleBack = () => {
        if (returnToProduction && selectedRecipe) {
            // Navigate back to production page with pre-filled item
            navigate(`/production?recipeId=${selectedRecipe.id}`);
        } else {
            setSelectedRecipe(null);
            navigate('/recipes'); // clear query param
        }
    };

    const handleDeleteRecipe = async (e: React.MouseEvent, recipeId: number) => {
        e.stopPropagation(); // Prevent opening the recipe details
        if (window.confirm('Are you sure you want to delete this recipe?')) {
            try {
                await deleteRecipe(recipeId);
                // Refresh list
                fetchRecipes();
                if (selectedRecipe?.id === recipeId) {
                    handleBack();
                }
            } catch (error) {
                console.error("Failed to delete recipe", error);
                alert("Failed to delete recipe.");
            }
        }
    };

    // Card Navigation Logic
    const totalCards = selectedRecipe ? 1 + (selectedRecipe.steps?.length || 0) : 0; // 1 for Overview + N steps

    const handleNext = () => {
        if (currentCardIndex < totalCards - 1) {
            setSlideDirection(1);
            setCurrentCardIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentCardIndex > 0) {
            setSlideDirection(-1);
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    const swipeHandlers = useSwipeable({
        onSwipedLeft: handleNext,
        onSwipedRight: handlePrev,
        preventScrollOnSwipe: false,
        trackMouse: true
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading recipes...</div>;

    // --- Detailed View (Swipeable Cards) ---
    if (selectedRecipe) {
        const steps = selectedRecipe.steps || [];
        const progress = ((currentCardIndex + 1) / totalCards) * 100;

        return (
            <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden z-50">
                {/* Header */}
                <div className="bg-white px-4 py-3 shadow-sm z-10 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <div className="font-bold text-gray-800 truncate max-w-[200px]">
                        {selectedRecipe.item_name}
                    </div>
                    <div className="text-sm text-gray-500 w-[70px] text-right">
                        {currentCardIndex === 0 ? "Intro" : `Step ${currentCardIndex}/${steps.length}`}
                    </div>
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
                    className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto relative bg-gray-100"
                >
                    <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                        <motion.div
                            key={currentCardIndex}
                            custom={slideDirection}
                            initial={{ x: slideDirection > 0 ? 300 : -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: slideDirection > 0 ? -300 : 300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full max-w-lg"
                        >
                            {currentCardIndex === 0 ? (
                                // --- Card 1: Overview (Ingredients & Yield) ---
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                                    <div className="bg-amber-50 p-6 text-center">
                                        <h1 className="text-3xl font-bold mb-2 text-gray-800">{selectedRecipe.item_name}</h1>
                                        <div className="inline-block bg-amber-600 rounded-full px-3 py-1 text-sm font-semibold text-white">
                                            Yields: {selectedRecipe.yield_quantity} {selectedRecipe.base_unit}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 overflow-y-auto">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Ingredients</h3>
                                        {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                                            <ul className="space-y-3">
                                                {selectedRecipe.ingredients.map(ing => (
                                                    <li key={ing.id} className="flex justify-between items-center text-sm">
                                                        <div>
                                                            <span className="font-medium text-gray-900">{ing.item_name}</span>
                                                            {ing.location_name && (
                                                                <div className="text-xs text-gray-500">{ing.location_name}</div>
                                                            )}
                                                        </div>
                                                        <span className="bg-gray-100 text-gray-800 font-bold px-2 py-1 rounded">
                                                            {formatQuantity(ing.display_quantity)} {ing.display_unit}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500 italic">No ingredients listed.</p>
                                        )}
                                    </div>

                                    <div className="p-4 bg-gray-50 text-center border-t text-gray-500 text-sm">
                                        Swipe Left to Start Steps →
                                    </div>
                                </div>
                            ) : (
                                // --- Card 2+: Recipe Steps ---
                                (() => {
                                    const step = steps[currentCardIndex - 1]; // Adjust index
                                    return (
                                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                                            {/* Image Section */}
                                            {step.image ? (
                                                <div className="h-48 w-full bg-gray-200 relative">
                                                    <img
                                                        src={step.image}
                                                        alt={`Step ${step.step_number}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-24 bg-gray-100 flex items-center justify-center text-gray-400">
                                                    <span className="text-sm italic">No image for this step</span>
                                                </div>
                                            )}

                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="flex items-center mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mr-3 flex-shrink-0 shadow-md">
                                                        {step.step_number}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-800">Step {step.step_number}</h3>
                                                </div>

                                                <div className="prose prose-blue text-gray-700 leading-relaxed text-lg flex-1 overflow-y-auto">
                                                    {step.instruction}
                                                </div>

                                                {step.caption && (
                                                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100 italic">
                                                        💡 {step.caption}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Step specific ingredients if any (schema supported?) */}
                                            {/* Assuming step.ingredients might exist based on schema or future expansion, currently global ingredients used in overview */}
                                        </div>
                                    );
                                })()
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Controls (for desktop / non-swipe users) */}
                    <div className="flex justify-between w-full max-w-lg mt-6">
                        <button
                            onClick={handlePrev}
                            disabled={currentCardIndex === 0}
                            className="bg-white px-4 py-2 rounded shadow text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                        >
                            ← Prev
                        </button>

                        {currentCardIndex === totalCards - 1 ? (
                            <button
                                onClick={handleBack}
                                className="bg-green-600 px-6 py-2 rounded shadow text-white hover:bg-green-700 font-bold border border-black"
                            >
                                {returnToProduction ? "Log Production" : "Done"}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="bg-blue-600 px-6 py-2 rounded shadow text-white hover:bg-blue-700 font-bold border border-black"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- List View ---
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Recipes</h1>
                    {canManageRecipes && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Create Recipe
                        </button>
                    )}
                </div>

                <CreateRecipeModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingRecipe(null);
                    }}
                    onSuccess={fetchRecipes}
                    initialRecipe={editingRecipe}
                />

                {recipes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                        No recipes found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map(recipe => (
                            <div
                                key={recipe.id}
                                onClick={() => handleSelectRecipe(recipe)}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer overflow-hidden group relative"
                            >
                                {canManageRecipes && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingRecipe(recipe);
                                                setIsCreateModalOpen(true);
                                            }}
                                            className="absolute top-4 right-14 p-2 bg-white text-gray-400 hover:text-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Edit Recipe"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteRecipe(e, recipe.id)}
                                            className="absolute top-4 right-4 p-2 bg-white text-gray-400 hover:text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Delete Recipe"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 pr-8">
                                        {recipe.item_name}
                                    </h2>
                                    <div className="text-sm text-gray-500">
                                        Yields: <span className="font-medium text-gray-700">{recipe.yield_quantity} {recipe.base_unit}</span>
                                    </div>
                                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                                        View Instructions
                                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipesPage;
