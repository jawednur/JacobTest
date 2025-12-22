import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { getItems, createRecipe, createItem } from '../services/api';

interface Item {
    id: number;
    name: string;
    type: string;
    base_unit: string;
}

interface IngredientInput {
    ingredient_item: number; // Item ID
    quantity_required: number;
}

interface StepInput {
    step_number: number;
    instruction: string;
}

interface CreateRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [products, setProducts] = useState<Item[]>([]);
    const [ingredientsList, setIngredientsList] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductUnit, setNewProductUnit] = useState('Each');
    
    const [yieldQuantity, setYieldQuantity] = useState<number>(1);
    // const [yieldUnit, setYieldUnit] = useState<number | null>(null); // Keeping simple for now
    
    const [recipeIngredients, setRecipeIngredients] = useState<IngredientInput[]>([]);
    const [steps, setSteps] = useState<StepInput[]>([{ step_number: 1, instruction: '' }]);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const allItems = await getItems();
            setProducts(allItems.filter((i: Item) => i.type === 'product'));
            setIngredientsList(allItems.filter((i: Item) => i.type === 'ingredient'));
        } catch (error) {
            console.error("Error fetching items", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIngredient = () => {
        setRecipeIngredients([...recipeIngredients, { ingredient_item: 0, quantity_required: 0 }]);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...recipeIngredients];
        newIngredients.splice(index, 1);
        setRecipeIngredients(newIngredients);
    };

    const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
        const newIngredients = [...recipeIngredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setRecipeIngredients(newIngredients);
    };

    const handleAddStep = () => {
        setSteps([...steps, { step_number: steps.length + 1, instruction: '' }]);
    };

    const handleRemoveStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        // Re-number subsequent steps
        for (let i = index; i < newSteps.length; i++) {
            newSteps[i].step_number = i + 1;
        }
        setSteps(newSteps);
    };

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index].instruction = value;
        setSteps(newSteps);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            let targetItemId = selectedProductId;

            if (isNewProduct) {
                // Create the product first
                const newItem = await createItem({
                    name: newProductName,
                    type: 'product',
                    base_unit: newProductUnit,
                    // defaults
                    shelf_life_days: 1
                });
                targetItemId = newItem.id;
            }

            if (!targetItemId) {
                alert("Please select or create a product.");
                setLoading(false);
                return;
            }

            const recipeData = {
                item: targetItemId,
                yield_quantity: yieldQuantity,
                ingredients: recipeIngredients.filter(i => i.ingredient_item !== 0 && i.quantity_required > 0),
                steps: steps.filter(s => s.instruction.trim() !== '')
            };

            await createRecipe(recipeData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error creating recipe", error);
            alert("Failed to create recipe. It might already exist for this item.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-2xl font-bold text-gray-800">Create New Recipe</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Product Selection */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipe For</label>
                        <div className="flex items-center mb-4">
                            <label className="flex items-center mr-6 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={!isNewProduct} 
                                    onChange={() => setIsNewProduct(false)}
                                    className="mr-2 h-4 w-4 text-blue-600"
                                />
                                Existing Product
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={isNewProduct} 
                                    onChange={() => setIsNewProduct(true)}
                                    className="mr-2 h-4 w-4 text-blue-600"
                                />
                                New Product
                            </label>
                        </div>

                        {isNewProduct ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newProductName}
                                        onChange={(e) => setNewProductName(e.target.value)}
                                        placeholder="e.g. Avocado Toast"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Base Unit</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newProductUnit}
                                        onChange={(e) => setNewProductUnit(e.target.value)}
                                        placeholder="e.g. Plate"
                                    />
                                </div>
                            </div>
                        ) : (
                            <select
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedProductId || ''}
                                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.base_unit})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Yield */}
                    <div className="mb-8">
                         <label className="block text-sm font-medium text-gray-700 mb-2">Yields</label>
                         <div className="flex items-center">
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                className="w-24 border border-gray-300 rounded-md p-2 mr-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={yieldQuantity}
                                onChange={(e) => setYieldQuantity(parseFloat(e.target.value))}
                            />
                            <span className="text-gray-600">
                                {isNewProduct ? newProductUnit : (selectedProductId ? products.find(p => p.id === selectedProductId)?.base_unit : 'Units')}
                            </span>
                         </div>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Ingredients</h3>
                            <button
                                onClick={handleAddIngredient}
                                className="text-sm flex items-center text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Ingredient
                            </button>
                        </div>
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            {recipeIngredients.length === 0 && (
                                <p className="text-sm text-gray-500 text-center italic">No ingredients added yet.</p>
                            )}
                            {recipeIngredients.map((ing, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <select
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                            value={ing.ingredient_item || ''}
                                            onChange={(e) => handleIngredientChange(idx, 'ingredient_item', Number(e.target.value))}
                                        >
                                            <option value="0">Select Ingredient...</option>
                                            {ingredientsList.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Qty"
                                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                            value={ing.quantity_required || ''}
                                            onChange={(e) => handleIngredientChange(idx, 'quantity_required', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveIngredient(idx)}
                                        className="p-2 text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="mb-4">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Directions</h3>
                            <button
                                onClick={handleAddStep}
                                className="text-sm flex items-center text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Step
                            </button>
                        </div>
                        <div className="space-y-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex-none pt-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                                            {step.step_number}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <textarea
                                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            rows={2}
                                            placeholder={`Step ${step.step_number} instructions...`}
                                            value={step.instruction}
                                            onChange={(e) => handleStepChange(idx, e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveStep(idx)}
                                        className="flex-none pt-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4 mr-2" /> Save Recipe
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateRecipeModal;

