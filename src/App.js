import React from 'react';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import MainApp from './components/MainApp';
import LoginPage from './components/LoginPage';

function AppContent() {
    const { user, userProfile, isLoading } = useAuthContext();

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
    }

    if (user && userProfile) {
        return <MainApp />;
    }

    return <LoginPage />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}