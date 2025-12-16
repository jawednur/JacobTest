import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, List, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-64 h-screen bg-charcoal text-white flex flex-col fixed left-0 top-0">
            <div className="p-6">
                <h1 className="text-2xl font-serif font-bold">IMS MRP</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex items-center p-3 rounded-lg transition-colors ${isActive ? 'bg-secondary text-charcoal font-medium' : 'hover:bg-gray-700 text-gray-300'}`
                    }
                >
                    <Home className="w-5 h-5 mr-3" />
                    Dashboard
                </NavLink>
                <NavLink
                    to="/items"
                    className={({ isActive }) =>
                        `flex items-center p-3 rounded-lg transition-colors ${isActive ? 'bg-secondary text-charcoal font-medium' : 'hover:bg-gray-700 text-gray-300'}`
                    }
                >
                    <List className="w-5 h-5 mr-3" />
                    Items
                </NavLink>
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex items-center p-3 rounded-lg transition-colors ${isActive ? 'bg-secondary text-charcoal font-medium' : 'hover:bg-gray-700 text-gray-300'}`
                    }
                >
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                </NavLink>
            </nav>
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={handleLogout}
                    className="flex items-center p-3 w-full text-left text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                </button>
            </div>
        </div>
    );
};

const Layout: React.FC = () => {
    return (
        <div className="flex bg-background min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
