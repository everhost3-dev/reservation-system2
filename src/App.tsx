import React, { useState, useEffect, useCallback } from 'react';
import { View } from './types';
import BookingView from './components/BookingView';
import AdminLoginView from './components/AdminLoginView';
import AdminDashboardView from './components/AdminDashboardView';
import CheckinLoginView from './components/CheckinLoginView';
import CheckinView from './components/CheckinView';
import { ADMIN_PASSWORD, CHECKIN_PASSWORD } from './constants';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.Booking);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
    const [isCheckInAuthenticated, setIsCheckInAuthenticated] = useState<boolean>(false);
    const [darkMode, setDarkMode] = useState<boolean>(false);

    useEffect(() => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(isDarkMode);
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);
    
    const handleAdminLogin = useCallback((password: string) => {
        if (password === ADMIN_PASSWORD) {
            setIsAdminAuthenticated(true);
            setCurrentView(View.AdminDashboard);
            return true;
        }
        return false;
    }, []);

    const handleCheckInLogin = useCallback((password: string) => {
        if (password === CHECKIN_PASSWORD) {
            setIsCheckInAuthenticated(true);
            setCurrentView(View.Checkin);
            return true;
        }
        return false;
    }, []);

    const handleLogout = useCallback(() => {
        setIsAdminAuthenticated(false);
        setIsCheckInAuthenticated(false);
        setCurrentView(View.Booking);
    }, []);

    const renderView = () => {
        switch (currentView) {
            case View.AdminLogin:
                return <AdminLoginView onLogin={handleAdminLogin} onExit={() => setCurrentView(View.Booking)} />;
            case View.AdminDashboard:
                return isAdminAuthenticated ? <AdminDashboardView onLogout={handleLogout} /> : <AdminLoginView onLogin={handleAdminLogin} onExit={() => setCurrentView(View.Booking)} />;
            case View.CheckinLogin:
                return <CheckinLoginView onLogin={handleCheckInLogin} onExit={() => setCurrentView(View.Booking)} />;
            case View.Checkin:
                return isCheckInAuthenticated ? <CheckinView onExit={handleLogout} /> : <CheckinLoginView onLogin={handleCheckInLogin} onExit={() => setCurrentView(View.Booking)} />;
            case View.Booking:
            default:
                return <BookingView setView={setCurrentView} darkMode={darkMode} setDarkMode={setDarkMode} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
                {renderView()}
            </main>
            <footer className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
                Study Room Reservation System v2.4
            </footer>
        </div>
    );
};

export default App;