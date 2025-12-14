import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Dashboard = () => {
    const [message, setMessage] = useState('Loading...');

    useEffect(() => {
        api.get('test/')
            .then(response => {
                setMessage(response.data.message);
            })
            .catch(error => {
                console.error('API Error:', error);
                setMessage('Error connecting to backend');
            });
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="p-4 bg-gray-200 rounded">Backend Status: {message}</p>
        </div>
    );
};

export default Dashboard;
