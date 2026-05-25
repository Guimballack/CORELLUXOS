/**
 * Corellux OS - Header Component
 * Componente do cabeçalho global com exibição de usuário, data/hora e ações.
 */

import React, { useState, useEffect } from 'react';
import { useCorelluxState, isAuthenticated } from '../store/corellux-state';
import { getUserAvatar } from '../utils/initial-data';
import { Home, Bell, UserCheck, LogOut, ShieldAlert } from 'lucide-react';

export default function Header() {
    const [state, setKey, updatePartial] = useCorelluxState(['currentUser', 'workstationAuthenticated', 'currentScreen']);
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            // Time format: HH:MM
            setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            
            // Date format: DD/MM/YYYY + Day of week
            const dayOfWeek = now.toLocaleDateString('pt-BR', { weekday: 'long' });
            const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
            const dateFormatted = now.toLocaleDateString('pt-BR');
            setDate({ dateFormatted, capitalizedDay });
        };

        updateDateTime();
        const timer = setInterval(updateDateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    const isUserLoggedIn = state.currentUser !== null;
    const isHeaderVisible = state.workstationAuthenticated && state.currentScreen !== 'login' && state.currentScreen !== 'user-select';

    if (!isHeaderVisible) return null;

    const handleHomeClick = () => {
        setKey('currentScreen', 'dashboard');
    };

    const handleLogout = () => {
        updatePartial({
            currentUser: null,
            pin: '',
            currentScreen: 'user-select'
        });
    };

    const handleExit = () => {
        updatePartial({
            currentUser: null,
            pin: '',
            workstationAuthenticated: false,
            currentScreen: 'login'
        });
    };

    const handleNotificationClick = () => {
        setKey('currentScreen', 'central-view'); // or similar
    };

    return (
        <header id="global-header">
            <div className="logo-area">
                <button className="btn-home-header" onClick={handleHomeClick} title="Início">
                    <Home size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        {/* Outer Hexagon */}
                        <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" stroke="#f97316" strokeWidth="6.5" strokeLinejoin="round"/>
                        
                        {/* Inner Y-lines */}
                        <polyline points="11,27.5 50,50 89,27.5" stroke="#f97316" strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round"/>
                        <line x1="50" y1="50" x2="50" y2="95" stroke="#f97316" strokeWidth="6.5" strokeLinecap="round"/>
                        
                        {/* Top Face Diamond */}
                        <polygon points="50,18 65,26.6 50,35.3 35,26.6" stroke="#f97316" strokeWidth="6.5" strokeLinejoin="round"/>
                        
                        {/* Left Face 'C' with lip */}
                        <path d="M 42.2 56.75 L 26.6 47.75 L 26.6 70.25 L 42.2 79.25 L 42.2 70.25" stroke="#f97316" strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round"/>
                        
                        {/* Right Face 'S' */}
                        <path d="M 57.8 56.75 L 73.4 47.75 L 73.4 59 L 57.8 68 L 57.8 79.25 L 73.4 70.25" stroke="#f97316" strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round"/>
                    </svg>
                </div>
            </div>

            {isUserLoggedIn && (
                <div className="user-info-area" id="header-user-info">
                    <div className="header-avatar-container">
                        <img 
                            src={getUserAvatar(state.currentUser.img)} 
                            alt={state.currentUser.displayName || state.currentUser.name} 
                            className="header-avatar" 
                        />
                    </div>
                    <div className="welcome-text">
                        <span className="bem-vindo">Bem-vindo,</span>
                        <span className="user-name">{state.currentUser.name}</span>
                        <span className="user-role">{state.currentUser.role}</span>
                    </div>
                </div>
            )}

            <div className="time-area">
                <div className="time">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {time}
                    </span>
                </div>
                <div className="date">
                    {date.dateFormatted}<br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{date.capitalizedDay}</span>
                </div>
            </div>

            <div className="header-actions" id="header-actions">
                <div className="header-notification-bell" onClick={handleNotificationClick}>
                    <Bell size={18} />
                    <span className="notification-badge" id="header-notif-count">0</span>
                </div>
                <button className="btn-logout-header" onClick={handleLogout} id="btn-logout">
                    <UserCheck size={16} /> LOCK
                </button>
                <button className="btn-logout-header exit" onClick={handleExit} id="btn-exit">
                    <LogOut size={16} /> LOGOUT
                </button>
            </div>
        </header>
    );
}
