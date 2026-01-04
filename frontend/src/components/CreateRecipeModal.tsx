import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { getItems, createRecipe, updateRecipe, createItem } from '../services/api';

interface UnitConversion {
    id: number;
    unit_name: string;
    factor: number;
}

interface Item {
    id: number;
    name: string;
    type: string;
    base_unit: string;
    conversions?: UnitConversion[];
}

interface IngredientInput {
    ingredient_item: number; // Item ID
    quantity_required: number; // Raw input quantity
    quantity_input: string; // Display input quantity
    selected_unit_factor: number; // 1 for base unit, >1 for conversions
    selected_unit_name: string;
}

// Helper to parse quantities including fractions and mixed numbers
const parseQuantity = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.toString().trim();

    // Handle mixed numbers like "1 1/2"
    if (cleanValue.includes(' ')) {
        const parts = cleanValue.split(' ');
        if (parts.length === 2) {
            const whole = parseFloat(parts[0]);
            const fraction = parts[1];
            if (!isNaN(whole) && fraction.includes('/')) {
                const fractionParts = fraction.split('/');
                if (fractionParts.length === 2) {
                    const numerator = parseFloat(fractionParts[0]);
                    const denominator = parseFloat(fractionParts[1]);
                    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                        return whole + (numerator / denominator);
                    }
                }
            }
        }
    }

    // Handle fractions like "1/3"
    if (cleanValue.includes('/')) {
        const parts = cleanValue.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
    }

    // Handle standard numbers
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};

interface StepInput {
    id?: number;
    step_number: number;
    instruction: string;
    image_url?: string; // URL reference only
}

interface CreateRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialRecipe?: any; // Recipe to edit
}

const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({ isOpen, onClose, onSuccess, initialRecipe }) => {
    const [products, setProducts] = useState<Item[]>([]);
    const [ingredientsList, setIngredientsList] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductUnit, setNewProductUnit] = useState('Each');
    const [shelfLife, setShelfLife] = useState<number>(1);

    const [yieldQuantity, setYieldQuantity] = useState<number>(1);
    // const [yieldUnit, setYieldUnit] = useState<number | null>(null); // Keeping simple for now

    const [recipeIngredients, setRecipeIngredients] = useState<IngredientInput[]>([]);
    const [steps, setSteps] = useState<StepInput[]>([{ step_number: 1, instruction: '' }]);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen]);

    // Populate form if editing
    useEffect(() => {
        if (isOpen && initialRecipe && products.length > 0 && ingredientsList.length > 0) {
            setSelectedProductId(initialRecipe.item);
            setYieldQuantity(initialRecipe.yield_quantity);

            // Map ingredients
            // Using base units for simplicity and accuracy
            const mappedIngredients = (initialRecipe.ingredients || []).map((ing: any) => ({
                ingredient_item: ing.ingredient_item,
                quantity_required: ing.quantity_required, // Base unit quantity
                quantity_input: ing.quantity_required.toString(),
                selected_unit_factor: 1,
                selected_unit_name: ing.base_unit
            }));
            setRecipeIngredients(mappedIngredients);

            // Map steps
            if (initialRecipe.steps && initialRecipe.steps.length > 0) {
                setSteps(initialRecipe.steps.map((s: any) => ({
                    id: s.id,
                    step_number: s.step_number,
                    instruction: s.instruction,
                    image_url: s.image || ''
                })));
            } else {
                setSteps([{ step_number: 1, instruction: '', image_url: '' }]);
            }

            setIsNewProduct(false);
        } else if (isOpen && !initialRecipe) {
            // Reset for create mode
            setSelectedProductId(null);
            setIsNewProduct(false);
            setNewProductName('');
            setNewProductUnit('Each');
            setShelfLife(1);
            setYieldQuantity(1);
            setRecipeIngredients([]);
            setSteps([{ step_number: 1, instruction: '', image_url: '' }]);
        }
    }, [isOpen, initialRecipe, products, ingredientsList]);

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
        setRecipeIngredients([...recipeIngredients, {
            ingredient_item: 0,
            quantity_required: 0,
            quantity_input: '',
            selected_unit_factor: 1,
            selected_unit_name: ''
        }]);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...recipeIngredients];
        newIngredients.splice(index, 1);
        setRecipeIngredients(newIngredients);
    };

    const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
        const newIngredients = [...recipeIngredients];
        const currentIng = newIngredients[index];

        if (field === 'ingredient_item') {
            const item = ingredientsList.find(i => i.id === Number(value));
            if (item) {
                newIngredients[index] = {
                    ...currentIng,
                    ingredient_item: item.id,
                    selected_unit_factor: 1, // Reset to base unit on item change
                    selected_unit_name: item.base_unit
                };
            } else {
                // Reset if invalid/placeholder selected
                newIngredients[index] = {
                    ...currentIng,
                    ingredient_item: 0,
                    selected_unit_factor: 1,
                    selected_unit_name: ''
                };
            }
        } else if (field === 'quantity_input') {
            const val = value as string;
            newIngredients[index] = {
                ...currentIng,
                quantity_input: val,
                quantity_required: parseQuantity(val)
            };
        } else {
            newIngredients[index] = { ...currentIng, [field]: value };
        }

        setRecipeIngredients(newIngredients);
    };

    const handleUnitChange = (index: number, factor: number, name: string) => {
        const newIngredients = [...recipeIngredients];
        newIngredients[index] = {
            ...newIngredients[index],
            selected_unit_factor: factor,
            selected_unit_name: name
        };
        setRecipeIngredients(newIngredients);
    };

    const handleAddStep = () => {
        setSteps([...steps, { step_number: steps.length + 1, instruction: '', image_url: '' }]);
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

    const moveStep = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= steps.length) return;
        const newSteps = [...steps];
        const [moved] = newSteps.splice(index, 1);
        newSteps.splice(newIndex, 0, moved);
        newSteps.forEach((s, idx) => s.step_number = idx + 1);
        setSteps(newSteps);
    };

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index].instruction = value;
        setSteps(newSteps);
    };

    const handleStepImageChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index].image_url = value;
        setSteps(newSteps);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            let targetItemId = selectedProductId;

            if (isNewProduct) {
                console.log("Creating new product:", { name: newProductName, unit: newProductUnit, shelfLife });
                // Create the product first
                const newItem = await createItem({
                    name: newProductName,
                    type: 'product',
                    base_unit: newProductUnit,
                    // defaults
                    shelf_life_days: shelfLife
                });
                targetItemId = newItem.id;
            }

            if (!targetItemId) {
                alert("Please select or create a product.");
                setLoading(false);
                return;
            }

            const ingredientsPayload = recipeIngredients
                .filter(i => i.ingredient_item !== 0 && i.quantity_required > 0)
                .map(i => ({
                    ingredient_item: i.ingredient_item,
                    // Convert to base units for backend
                    quantity_required: i.quantity_required * i.selected_unit_factor
                }));

            if (recipeIngredients.length > 0 && ingredientsPayload.length === 0) {
                alert("Please ensure all ingredients have a valid item and quantity greater than 0.");
                setLoading(false);
                return;
            }

            const recipeData = {
                item: targetItemId,
                yield_quantity: yieldQuantity,
                ingredients: ingredientsPayload,
                steps: steps.filter(s => s.instruction.trim() !== '').map(s => {
                    const stepPayload: any = {
                        step_number: s.step_number,
                        instruction: s.instruction,
                        caption: ''
                    };

                    if (s.id) {
                        stepPayload.id = s.id;
                    }

                    const img = (s.image_url || '').trim();
                    if (img.length === 0) {
                        stepPayload.image = null; // Explicitly clear when blank
                    } else {
                        stepPayload.image = img;
                    }

                    return stepPayload;
                })
            };

            console.log("Submitting recipe data:", JSON.stringify(recipeData, null, 2));

            if (initialRecipe) {
                await updateRecipe(initialRecipe.id, recipeData);
                console.log("Recipe updated successfully");
            } else {
                await createRecipe(recipeData);
                console.log("Recipe created successfully");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error creating/updating recipe", error);
            if (error.response) {
                console.error("Server response:", error.response.data);
                alert(`Failed to save recipe: ${JSON.stringify(error.response.data)}`);
            } else {
                alert("Failed to save recipe. It might already exist for this item.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-2xl font-bold text-gray-800">{initialRecipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Product Selection - Only allow changing if creating new recipe or if needed (usually tied to item so maybe readonly in edit?) */}
                    {/* For now allowing edit but logic suggests recipe is unique to item. */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipe For</label>
                        {!initialRecipe && (
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
                        )}

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
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Shelf Life (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={shelfLife}
                                        onChange={(e) => setShelfLife(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <select
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedProductId || ''}
                                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                                disabled={!!initialRecipe} // Disable changing item when editing
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
                            {recipeIngredients.map((ing, idx) => {
                                const selectedItem = ingredientsList.find(i => i.id === ing.ingredient_item);
                                const availableUnits = selectedItem ? [
                                    { id: -1, unit_name: selectedItem.base_unit, factor: 1.0 },
                                    ...(selectedItem.conversions || [])
                                ] : [];

                                return (
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
                                                type="text"
                                                placeholder="Qty"
                                                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                                value={ing.quantity_input || ''}
                                                onChange={(e) => handleIngredientChange(idx, 'quantity_input', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <select
                                                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                                disabled={!selectedItem}
                                                value={ing.selected_unit_name || ''}
                                                onChange={(e) => {
                                                    const unit = availableUnits.find(u => u.unit_name === e.target.value);
                                                    if (unit) {
                                                        handleUnitChange(idx, unit.factor, unit.unit_name);
                                                    }
                                                }}
                                            >
                                                {!selectedItem && <option>Unit</option>}
                                                {availableUnits.map((u, uIdx) => (
                                                    <option key={uIdx} value={u.unit_name}>{u.unit_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveIngredient(idx)}
                                            className="p-2 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
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
                            {steps.map((step, idx) => {
                                const hasPreview = Boolean((step.image_url || '').trim());
                                return (
                                    <div key={idx} className="flex gap-3">
                                        <div className="flex-none pt-2 space-y-1">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                                                {step.step_number}
                                            </div>
                                            <div className="flex flex-col gap-1 text-xs text-gray-500">
                                                <button
                                                    type="button"
                                                    className="hover:text-blue-600"
                                                    onClick={() => moveStep(idx, -1)}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    className="hover:text-blue-600"
                                                    onClick={() => moveStep(idx, 1)}
                                                >
                                                    ↓
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <textarea
                                                className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                rows={2}
                                                placeholder={`Step ${step.step_number} instructions...`}
                                                value={step.instruction}
                                                onChange={(e) => handleStepChange(idx, e.target.value)}
                                            />

                                            <div className="flex flex-col gap-2">
                                                <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Image URL (optional)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                                                        placeholder="https://example.com/image.jpg"
                                                        value={step.image_url || ''}
                                                        onChange={(e) => handleStepImageChange(idx, e.target.value)}
                                                    />
                                                    {hasPreview && (
                                                        <button
                                                            type="button"
                                                            className="text-xs text-gray-500 hover:text-red-600"
                                                            onClick={() => handleStepImageChange(idx, '')}
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                {hasPreview && (
                                                    <div className="w-24 h-24 rounded-md border bg-gray-50 overflow-hidden">
                                                        <img src={step.image_url} alt="Step" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveStep(idx)}
                                            className="flex-none pt-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
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

