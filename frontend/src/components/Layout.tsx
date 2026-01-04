import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, 
    Package, 
    ChefHat, 
    ClipboardList, 
    Scale, 
    LogOut, 
    Utensils,
    History,
    Menu,
    X,
    BarChart2,
    Users
} from 'lucide-react';
import logo from '../assets/toastique-icon.svg';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isSuperuser = user?.is_superuser;
    const isAdmin = isSuperuser || user?.role === 'admin' || user?.role === 'it';

    const navItems = [
        { 
            path: '/', 
            label: 'Dashboard', 
            icon: LayoutDashboard,
            allowed: true 
        },
        { 
            path: '/accounts', 
            label: 'Accounts', 
            icon: Users,
            allowed: isSuperuser 
        },
        { 
            path: '/analytics', 
            label: 'Analytics', 
            icon: BarChart2,
            allowed: isAdmin 
        },
        { 
            path: '/inventory', 
            label: 'Inventory', 
            icon: Package,
            allowed: isAdmin 
        },
        { 
            path: '/items', 
            label: 'Items', 
            icon: Utensils,
            allowed: isAdmin 
        },
        { 
            path: '/recipes', 
            label: 'Recipes', 
            icon: ChefHat,
            allowed: true 
        },
        { 
            path: '/production', 
            label: 'Production Log', 
            icon: History,
            allowed: true 
        },
        { 
            path: '/stocktake', 
            label: 'Stocktake', 
            icon: ClipboardList,
            allowed: isAdmin 
        },
        { 
            path: '/unit-conversions', 
            label: 'Units', 
            icon: Scale,
            allowed: isAdmin 
        },
    ];

    return (
        <div className="flex h-screen bg-background text-charcoal font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-30 w-64 bg-card shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:flex
            `}>
                <div className="p-6 flex items-center justify-between lg:justify-center border-b border-neutral-light">
                    <img src={logo} alt="Toastique" className="h-10 w-auto" />
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    {navItems.filter(item => item.allowed).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center px-4 py-3 rounded-lg transition-colors duration-200
                                ${isActive 
                                    ? 'bg-primary text-white shadow-md' 
                                    : 'text-dark-grey hover:bg-neutral-pale hover:text-primary'}
                            `}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-light">
                    <div className="flex items-center mb-4 px-4">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold mr-3">
                            {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate">{user?.first_name || user?.username}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-primary bg-neutral-pale hover:bg-primary hover:text-white transition-colors duration-200"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header (visible only on small screens) */}
            <div className="lg:hidden fixed top-0 w-full bg-card shadow-sm z-10 p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="mr-3 text-gray-600 hover:text-primary"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <img src={logo} alt="Toastique" className="h-8" />
                </div>
                <button onClick={handleLogout} className="text-primary">
                    <LogOut className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 pt-20 lg:pt-8 bg-background-alt w-full">
                {children}
            </main>
        </div>
    );
};

export default Layout;
