import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Auth from './components/Auth';
import './App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user has a token
        const token = localStorage.getItem('access_token');
        setIsAuthenticated(!!token);
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return (
            <div className="App loading-screen">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div className="App">
            {isAuthenticated ? (
                <ChatInterface onLogout={handleLogout} />
            ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App;
