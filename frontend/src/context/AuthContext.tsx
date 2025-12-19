import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface AuthContextType {
    user: any;
    login: (tokens: { access: string; refresh: string }) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            setIsAuthenticated(true);
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('users/profile/');
            setUser(response.data);
            setIsAuthenticated(true); // Ensure this is set
        } catch (error) {
            console.error("Failed to fetch user", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (tokens: { access: string; refresh: string }) => {
        localStorage.setItem('accessToken', tokens.access);
        localStorage.setItem('refreshToken', tokens.refresh);
        setIsAuthenticated(true);
        // We do NOT await here to allow immediate navigation if needed, 
        // OR we ensure fetchUser sets loading state correctly if we do await.
        // If we await, loading is already false from initial load.
        // Let's rely on fetchUser logic.
        try {
            await fetchUser();
        } catch (e) {
            // Login succeeded but profile fetch failed?
            // Should stay authenticated but maybe with partial user data?
            // logout() is called in fetchUser catch block.
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
