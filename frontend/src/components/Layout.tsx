import React from 'react';
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
    History
} from 'lucide-react';
import logo from '../assets/toastique-icon.svg';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';

    const navItems = [
        { 
            path: '/', 
            label: 'Dashboard', 
            icon: LayoutDashboard,
            allowed: true 
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
            {/* Sidebar */}
            <aside className="w-64 bg-card shadow-lg flex flex-col hidden md:flex">
                <div className="p-6 flex items-center justify-center border-b border-neutral-light">
                    <img src={logo} alt="Toastique" className="h-10 w-auto" />
                </div>
                
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    {navItems.filter(item => item.allowed).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
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
            <div className="md:hidden fixed top-0 w-full bg-card shadow-sm z-10 p-4 flex justify-between items-center">
                <img src={logo} alt="Toastique" className="h-8" />
                <button onClick={handleLogout} className="text-primary">
                    <LogOut className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 pt-20 md:pt-8 bg-background-alt">
                {children}
            </main>
        </div>
    );
};

export default Layout;
