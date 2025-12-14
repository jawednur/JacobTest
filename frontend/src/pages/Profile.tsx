import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('users/profile/');
                setProfile(response.data);
                setFormData({
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    email: response.data.email
                });
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            await api.patch('users/profile/', formData);
            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Failed to update profile", error);
            setMessage('Failed to update profile.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-8 font-serif text-dark-grey">User Profile</h1>

            <div className="bg-card p-8 rounded-lg shadow-sm border border-gray-100">
                {message && (
                    <div className={`px-4 py-3 rounded mb-6 text-sm font-sans ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-dark-grey uppercase tracking-wider mb-2 font-sans">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary font-sans"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-sans">Role</label>
                                <p className="font-sans text-dark-grey capitalize">{profile.role}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-sans">Store</label>
                                <p className="font-sans text-dark-grey">{profile.store_name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="bg-primary text-white font-bold py-3 px-6 rounded hover:bg-tertiary-gold transition-colors font-sans uppercase text-sm tracking-wider"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
