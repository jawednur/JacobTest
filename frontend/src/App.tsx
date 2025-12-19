import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ProductionLogPage from './pages/ProductionLog';
import StocktakePage from './pages/Stocktake';
import InventoryPage from './pages/Inventory';
import ItemsPage from './pages/Items';
import RecipesPage from './pages/Recipes';
import UnitConversionsPage from './pages/UnitConversions';
import Login from './pages/Login';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login', { state: { from: location } });
        }
    }, [isAuthenticated, loading, navigate, location]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Role mismatch redirect
        if (user.role === 'employee') return <EmployeeDashboard />; // Fallback to their dash
        return <div>Access Denied</div>;
    }

    return isAuthenticated ? <>{children}</> : null;
};

// Dispatcher to handle "/"
const DashboardDispatcher: React.FC = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;

    if (user?.role === 'employee') {
        return <EmployeeDashboard />;
    }
    return <Dashboard />; // Default/Admin
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout>
                                <DashboardDispatcher />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/inventory" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout>
                                <InventoryPage />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/items" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout>
                                <ItemsPage />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/unit-conversions" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout>
                                <UnitConversionsPage />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/recipes" element={
                        <ProtectedRoute>
                            <Layout>
                                <RecipesPage />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/production" element={
                        <ProtectedRoute>
                            <Layout>
                                <ProductionLogPage />
                            </Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/stocktake" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Layout>
                                <StocktakePage />
                            </Layout>
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
