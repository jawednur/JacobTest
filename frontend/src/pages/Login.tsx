import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/toastique_horiz_gold-web.svg';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post('http://localhost:8000/api/users/token/', {
                username,
                password
            });
            await login(response.data);
            navigate('/');

        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="bg-card p-8 rounded-lg shadow-lg w-full max-w-md border border-neutral-light">
                <div className="text-center mb-8">
                    <img src={logo} alt="Toastique" className="h-16 mx-auto mb-4" />
                    <p className="text-charcoal mt-2 font-serif">Sign in to your account</p>
                </div>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-primary px-4 py-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-2 font-serif">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-tertiary-gold bg-background-alt text-dark-grey"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-2 font-serif">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-tertiary-gold bg-background-alt text-dark-grey"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:opacity-90 transition-colors font-serif tracking-wide"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
