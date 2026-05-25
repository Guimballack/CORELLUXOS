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
                        <path d="M50 5 L90 28.09 L90 74.27 L50 97.36 L10 74.27 L10 28.09 Z" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        <path d="M10 28.09 L50 51.18 L90 28.09" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        <path d="M50 51.18 L50 97.36" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        <path d="M50 18 L63 25.5 L50 33 L37 25.5 Z" stroke="#f97316" strokeWidth="5.5" strokeLinejoin="round"/>
                        <path d="M28 65 L40 72 L40 85" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M28 65 L28 48 L36 43.5" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M72 65 L60 72 L60 85" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M72 65 L72 48 L64 43.5" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
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
