import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, getStores } from '../services/api';
import { Users, Database, FileText, Server, Edit } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    store: number | null;
    store_name: string | null;
}

interface Store {
    id: number;
    name: string;
}

const ITDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    // const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'employee',
        store: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersData, storesData] = await Promise.all([getUsers(), getStores()]);
            setUsers(usersData);
            setStores(storesData);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            // setLoading(false);
        }
    };

    const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                role: formData.role,
                store: formData.store ? parseInt(formData.store) : null
            };
            
            if (formData.password) {
                payload.password = formData.password;
            }

            if (editingUser) {
                await updateUser(editingUser.id, payload);
            } else {
                await createUser(payload);
            }
            
            setShowUserModal(false);
            setEditingUser(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving user", error);
            alert("Failed to save user.");
        }
    };

    const startEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '', // Don't show password
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            store: user.store ? user.store.toString() : ''
        });
        setShowUserModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            role: 'employee',
            store: ''
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-charcoal">IT Dashboard</h1>
            
            {/* Status Section */}
            <div className="mb-8">
                 <h2 className="text-xl font-semibold mb-4 flex items-center text-charcoal"><Server className="mr-2 w-5 h-5"/> System Status</h2>
                 <div className="border border-neutral-light rounded-lg overflow-hidden h-64 bg-white shadow-sm">
                     <iframe src="https://status.railway.app/" className="w-full h-full border-0" title="Railway Status" />
                 </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <a href="http://localhost:8000/admin/" target="_blank" rel="noopener noreferrer" className="bg-white p-6 rounded-xl shadow-sm border border-neutral-light hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center cursor-pointer">
                    <Database className="w-10 h-10 text-primary mb-3" />
                    <h3 className="text-lg font-semibold text-charcoal">Database Admin</h3>
                    <p className="text-sm text-gray-500">Access Django Admin, Schemas, and raw data.</p>
                </a>
                <a href="/recipes" className="bg-white p-6 rounded-xl shadow-sm border border-neutral-light hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center cursor-pointer">
                    <FileText className="w-10 h-10 text-secondary mb-3" />
                    <h3 className="text-lg font-semibold text-charcoal">Master Recipe Model</h3>
                    <p className="text-sm text-gray-500">Edit global recipes and ingredients.</p>
                </a>
                <a href="/inventory" className="bg-white p-6 rounded-xl shadow-sm border border-neutral-light hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center cursor-pointer">
                    <Users className="w-10 h-10 text-accent mb-3" />
                    <h3 className="text-lg font-semibold text-charcoal">Global Inventory</h3>
                    <p className="text-sm text-gray-500">View inventory across all stores.</p>
                </a>
            </div>

            {/* User Management Section */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-light p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-charcoal">User Management</h2>
                    <button 
                        onClick={() => { setEditingUser(null); resetForm(); setShowUserModal(true); }} 
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        + Add User
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-pale text-dark-grey uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Username</th>
                                <th className="px-4 py-3">Full Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Store</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-light">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-neutral-pale transition-colors">
                                    <td className="px-4 py-3 font-medium">{user.username}</td>
                                    <td className="px-4 py-3">{user.first_name} {user.last_name}</td>
                                    <td className="px-4 py-3 capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                                              user.role === 'it' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{user.store_name || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => startEdit(user)} className="text-secondary hover:text-secondary-dark mr-3">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Create User'}</h2>
                        <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input 
                                    type="text" 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.first_name}
                                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input 
                                    type="text" 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.last_name}
                                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="admin">Store Admin</option>
                                    <option value="it">IT Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Store</label>
                                <select 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.store}
                                    onChange={e => setFormData({...formData, store: e.target.value})}
                                >
                                    <option value="">No Store (Global/IT)</option>
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password {editingUser && '(Leave blank to keep current)'}</label>
                                <input 
                                    type="password" 
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    required={!editingUser}
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setShowUserModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ITDashboard;

