import React, { useState, useEffect } from 'react';
import { getLocations, createProductionLog, getRecipesList, getItemConversions } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ProductionLogPage: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRecipeId = searchParams.get('recipeId');

  // Form
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitType, setUnitType] = useState('');
  const [targetLocation, setTargetLocation] = useState('');

  // Derived state for the selected item
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [unitOptions, setUnitOptions] = useState<any[]>([]);

  // Modal
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingIngredients, setMissingIngredients] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL param for pre-selection
  useEffect(() => {
    if (initialRecipeId && recipes.length > 0) {
        handleItemChange(initialRecipeId);
    }
  }, [initialRecipeId, recipes]);

  const loadData = async () => {
    try {
      const [recipesData, locationsData] = await Promise.all([
        getRecipesList(),
        getLocations()
      ]);
      setRecipes(recipesData);
      setLocations(locationsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemChange = async (recipeId: string) => {
    setSelectedItem(recipeId);
    if (recipeId) {
      try {
        // Find local recipe object
        const localRecipe = recipes.find(r => r.id === parseInt(recipeId));
        if (localRecipe) {
          setSelectedRecipe(localRecipe);

          // Fetch unit conversions for the item
          try {
            const convs = await getItemConversions(localRecipe.item);
            setUnitOptions(convs);
          } catch (e) {
            console.error("Failed to load conversions", e);
            setUnitOptions([]);
          }

          // Check if yield_unit_details exists (populated by serializer)
          if (localRecipe.yield_unit_details) {
            setUnitType(localRecipe.yield_unit_details.unit_name);
          } else if (localRecipe.yield_unit && typeof localRecipe.yield_unit === 'object') {
            setUnitType(localRecipe.yield_unit.unit_name);
          } else {
            setUnitType(localRecipe.base_unit);
          }
        }
      } catch (err) {
        console.error("Error fetching recipe details", err);
        setUnitType('');
        setUnitOptions([]);
      }
    } else {
      setSelectedRecipe(null);
      setUnitType('');
      setUnitOptions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent, force: boolean = false) => {
    e.preventDefault();
    if (!selectedItem || !quantity || !targetLocation) return;

    setSubmitting(true);

    const payload = {
      recipe: parseInt(selectedItem),
      quantity_made: parseFloat(quantity),
      unit_type: unitType,
      target_location: parseInt(targetLocation),
      force_creation: force // New flag to bypass check
    };

    try {
      await createProductionLog(payload);

      // Success
      alert("Production logged successfully.");
      setSelectedItem('');
      setQuantity('');
      setTargetLocation('');
      setUnitType('');
      setSelectedRecipe(null);
      setShowMissingModal(false);

    } catch (err: any) {
      if (err.response && err.response.status === 409 && err.response.data.missing_ingredients) {
        setMissingIngredients(err.response.data.missing_ingredients);
        setShowMissingModal(true);
      } else {
        console.error(err);
        alert("Failed to log production.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Log Prep / Production</h1>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item / Recipe</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedItem}
              onChange={(e) => handleItemChange(e.target.value)}
              required
            >
              <option value="">Select an item to prep...</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.item_name}</option>
              ))}
            </select>
          </div>

          {/* New Styled Recipe Link */}
          {selectedRecipe && (
            <div
              onClick={() => navigate(`/recipes?id=${selectedRecipe.id}&returnToProduction=true`)}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition flex items-center justify-between group"
            >
              <div className="flex items-center">
                <div className="bg-blue-600 text-white rounded-full p-2 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 group-hover:text-blue-800">View Recipe Instructions</h3>
                  <p className="text-sm text-blue-700">See ingredients & steps for {selectedRecipe.item_name}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Made</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
              >
                <option value="">Select unit...</option>
                {selectedRecipe && (
                  <>
                    <option value={selectedRecipe.base_unit}>Base Unit ({selectedRecipe.base_unit})</option>
                    {selectedRecipe.yield_unit && (
                      <option value={selectedRecipe.yield_unit.unit_name}>
                        {selectedRecipe.yield_unit.unit_name}
                      </option>
                    )}
                    {unitOptions.map((u: any) => {
                      // Skip if same as yield unit to avoid duplicates
                      if (selectedRecipe.yield_unit && u.unit_name === selectedRecipe.yield_unit.unit_name) return null;
                      return (
                        <option key={u.id} value={u.unit_name}>
                          {u.unit_name} ({u.factor}x)
                        </option>
                      );
                    })}
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Location (Destination)</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              required
            >
              <option value="">Select location...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Where the finished product is stored.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Logging..." : "Log Production"}
          </button>
        </form>
      </div>

      {/* Missing Ingredients Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4 text-amber-600">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-bold">Missing Ingredients</h2>
            </div>

            <p className="text-gray-600 mb-4">
              You do not have enough inventory to make this recipe.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6 max-h-60 overflow-y-auto">
              <ul className="space-y-3">
                {missingIngredients.map((ing: any, idx: number) => (
                  <li key={idx} className="text-sm flex justify-between items-start border-b border-amber-100 pb-2 last:border-0 last:pb-0">
                    <span className="font-semibold text-gray-800">{ing.name}</span>
                    <div className="text-right">
                      <div className="text-red-600 font-medium">
                        Need: {ing.display_required} {ing.display_unit}
                        {ing.display_unit !== ing.unit && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({typeof ing.required === 'number' ? ing.required.toFixed(1) : ing.required} {ing.unit})
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600">
                        Have: {ing.display_available} {ing.display_unit}
                        {ing.display_unit !== ing.unit && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({typeof ing.available === 'number' ? ing.available.toFixed(1) : ing.available} {ing.unit})
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowMissingModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Prep Anyways
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionLogPage;
