import React, { useEffect, useState } from 'react';
import { Plus, Edit2, RefreshCw, Shield, Store } from 'lucide-react';
import { getUsers, createUser, updateUser, getStores, createStore } from '../services/api';

interface Account {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    store: number | null;
    store_name: string | null;
    is_superuser?: boolean;
}

interface StoreType {
    id: number;
    name: string;
}

const emptyForm = {
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    store: '',
};

const AccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [savingStore, setSavingStore] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState<typeof emptyForm>(emptyForm);
    const [storeForm, setStoreForm] = useState<{ name: string; address: string }>({ name: '', address: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, storesData] = await Promise.all([getUsers(), getStores()]);
            setAccounts(usersData);
            setStores(storesData);
        } catch (err) {
            console.error('Failed to load accounts data', err);
            alert('Failed to load accounts.');
        } finally {
            setLoading(false);
        }
    };

    const startCreate = () => {
        setEditingAccount(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const startEdit = (account: Account) => {
        setEditingAccount(account);
        setFormData({
            username: account.username,
            email: account.email,
            password: '',
            first_name: account.first_name || '',
            last_name: account.last_name || '',
            role: account.role,
            store: account.store ? account.store.toString() : '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData(emptyForm);
        setEditingAccount(null);
    };

    const startCreateStore = () => {
        setShowStoreModal(true);
        setStoreForm({ name: '', address: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                role: formData.role,
                store: formData.store ? parseInt(formData.store) : null,
            };

            // Only send password when user typed a new one; backend will hash via set_password.
            if (formData.password) {
                payload.password = formData.password;
            }

            if (editingAccount) {
                await updateUser(editingAccount.id, payload);
            } else {
                await createUser(payload);
            }

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            console.error('Failed to save account', err);
            alert('Failed to save account.');
        } finally {
            setSaving(false);
        }
    };

    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingStore(true);
        try {
            await createStore({
                name: storeForm.name,
                address: storeForm.address || undefined,
            });
            setShowStoreModal(false);
            setStoreForm({ name: '', address: '' });
            // Refresh stores list so new store appears in dropdown
            const storesData = await getStores();
            setStores(storesData);
        } catch (err) {
            console.error('Failed to create store', err);
            alert('Failed to create store.');
        } finally {
            setSavingStore(false);
        }
    };

    const roleBadge = (account: Account) => {
        if (account.is_superuser) {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 inline-flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    Superuser
                </span>
            );
        }
        const role = account.role;
        const colors: Record<string, string> = {
            admin: 'bg-purple-100 text-purple-800',
            it: 'bg-blue-100 text-blue-800',
            employee: 'bg-green-100 text-green-800',
        };
        const colorClass = colors[role] || 'bg-gray-100 text-gray-700';
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>{role}</span>;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-charcoal">Accounts</h1>
                    <p className="text-gray-600 mt-1">Manage all users, their roles, and store access.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center px-4 py-2 border border-neutral-light rounded-lg text-sm text-gray-700 hover:bg-neutral-pale transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={startCreateStore}
                        className="flex items-center px-4 py-2 border border-neutral-light text-primary rounded-lg text-sm hover:bg-neutral-pale transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Store
                    </button>
                    <button
                        onClick={startCreate}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Account
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-neutral-light">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-pale text-dark-grey uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Username</th>
                                <th className="px-4 py-3">Full Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Store</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-light">
                            {accounts.map((account) => (
                                <tr key={account.id} className="hover:bg-neutral-pale transition-colors">
                                    <td className="px-4 py-3 font-medium">{account.username}</td>
                                    <td className="px-4 py-3">{`${account.first_name || ''} ${account.last_name || ''}`.trim()}</td>
                                    <td className="px-4 py-3 text-gray-600">{account.email}</td>
                                    <td className="px-4 py-3 capitalize">{roleBadge(account)}</td>
                                    <td className="px-4 py-3 text-gray-600 flex items-center space-x-1">
                                        <Store className="w-4 h-4 text-gray-400" />
                                        <span>{account.store_name || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => startEdit(account)}
                                            className="text-secondary hover:text-secondary-dark inline-flex items-center"
                                        >
                                            <Edit2 className="w-4 h-4 mr-1" />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {accounts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                        No accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {loading && (
                    <div className="p-6 text-center text-gray-500">
                        Loading accounts...
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{editingAccount ? 'Edit Account' : 'Create Account'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
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
                                    onChange={e => setFormData({ ...formData, store: e.target.value })}
                                >
                                    <option value="">No Store (Global)</option>
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Password {editingAccount && '(leave blank to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required={!editingAccount}
                                />
                                <p className="text-xs text-gray-500 mt-1">Passwords are hashed on save; never displayed.</p>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Store Modal */}
            {showStoreModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Create Store</h2>
                        <form onSubmit={handleStoreSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={storeForm.name}
                                    onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                    value={storeForm.address}
                                    onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowStoreModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingStore}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-60"
                                >
                                    {savingStore ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountsPage;

