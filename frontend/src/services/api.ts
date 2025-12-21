import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getDashboardStats = async () => {
  const response = await api.get('/inventory/dashboard/stats/');
  return response.data;
};

export const getItems = async () => {
  let results: any[] = [];
  let url: string | null = '/inventory/items/';

  while (url) {
    const response: any = await api.get(url);
    const data: any = response.data;

    if (Array.isArray(data)) {
      return data;
    }

    if (data.results) {
      results = [...results, ...data.results];
      url = data.next;
    } else {
      break;
    }
  }
  return results;
};

export const createItem = async (itemData: any) => {
  const response = await api.post('/inventory/items/', itemData);
  return response.data;
};

export const updateItem = async (id: number, itemData: any) => {
  const response = await api.patch(`/inventory/items/${id}/`, itemData);
  return response.data;
};

export const getRecipesList = async () => {
  const response = await api.get('/inventory/recipes/');
  return response.data.results;
};

export const getFullInventory = async (typeFilter?: string) => {
  let url = '/inventory/inventory/';
  // Only append param if typeFilter is a non-empty string
  if (typeFilter && typeFilter.length > 0) {
    url += `?item__type=${typeFilter}`;
  }
  const response = await api.get(url);
  return response.data.results || response.data; // Handle pagination if present, but default to array if viewset uses simple list
};

export const getRecipes = async () => {
  const response = await api.get('/inventory/items/?has_recipe=true&type=product');
  return response.data.results;
};

export const getRecipeDetails = async (itemId: number) => {
  const response = await api.get(`/inventory/recipes/?item=${itemId}`);
  // It returns a list, pick the first one
  return response.data.results[0];
};

export const getLocations = async () => {
  const response = await api.get('/inventory/locations/');
  return response.data.results;
};

export const getItemConversions = async (itemId: number) => {
  const response = await api.get(`/inventory/unit-conversions/?item=${itemId}`);
  return response.data.results;
};

export const createUnitConversion = async (data: any) => {
  const response = await api.post('/inventory/unit-conversions/', data);
  return response.data;
};

export const deleteUnitConversion = async (id: number) => {
  await api.delete(`/inventory/unit-conversions/${id}/`);
};

export const createProductionLog = async (data: {
  recipe: number,
  quantity_made: number,
  unit_type: string,
  target_location?: number,
  force_creation?: boolean
}) => {
  const response = await api.post('/inventory/production-logs/', data);
  return response.data;
};

export const submitStocktake = async (counts: { item_id: number, location_id: number, actual_quantity: number, unit_name?: string }[]) => {
  const response = await api.post('/inventory/stocktake/', { counts });
  return response.data;
};

// Receiving
export const getReceivingLogs = async () => {
  const response = await api.get('/inventory/receiving-logs/');
  return response.data.results;
};

export const createReceivingLog = async (data: any) => {
  const response = await api.post('/inventory/receiving-logs/', data);
  return response.data;
};

// Stocktake Session
export const startStocktakeSession = async () => {
  const response = await api.post('/inventory/stocktake-sessions/start/');
  return response.data;
};

export const saveStocktakeRecords = async (sessionId: number, records: any[]) => {
  const response = await api.post(`/inventory/stocktake-sessions/${sessionId}/save_records/`, { records });
  return response.data;
};

export const finalizeStocktakeSession = async (sessionId: number) => {
  const response = await api.post(`/inventory/stocktake-sessions/${sessionId}/finalize/`);
  return response.data;
};

// Expired Items
export const getExpiredItems = async () => {
  const response = await api.get('/inventory/inventory/expired/');
  return response.data;
};

export const disposeExpiredItem = async (inventoryId: number, notes: string = '') => {
  const response = await api.post(`/inventory/inventory/${inventoryId}/dispose/`, { notes });
  return response.data;
};

export const getExpiredItemLogs = async () => {
  const response = await api.get('/inventory/expired-logs/');
  return response.data.results;
};

// User Management (IT)
export const getUsers = async () => {
  const response = await api.get('/users/management/');
  return response.data.results || response.data;
};

export const createUser = async (userData: any) => {
  const response = await api.post('/users/management/', userData);
  return response.data;
};

export const updateUser = async (id: number, userData: any) => {
  const response = await api.patch(`/users/management/${id}/`, userData);
  return response.data;
};

export const getStores = async () => {
  const response = await api.get('/users/stores/');
  return response.data.results || response.data;
};

export default api;
