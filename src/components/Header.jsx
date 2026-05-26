/**
 * Corellux OS - Header Component
 * Componente do cabeçalho global com exibição de usuário, data/hora e ações.
 */

import React, { useState, useEffect } from 'react';
import { useCorelluxState, isAuthenticated } from '../store/corellux-state';
import { getUserAvatar } from '../utils/initial-data';
import { Home, Bell, UserCheck, LogOut, ShieldAlert, ArrowLeft, Search, FileText } from 'lucide-react';

export default function Header() {
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser', 
        'workstationAuthenticated', 
        'currentScreen',
        'settingsActiveTab',
        'centralActiveTab',
        'logisticsActiveTab',
        'logisticsFlowType',
        'logisticsFlowStep',
        'inventorySearch'
    ]);
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

    const handleBackClick = () => {
        if (state.currentScreen === 'settings') {
            if (state.settingsActiveTab === 'menu') {
                setKey('currentScreen', 'dashboard');
            } else {
                setKey('settingsActiveTab', 'menu');
            }
        } else if (state.currentScreen === 'central-hub') {
            if (state.centralActiveTab === 'menu') {
                setKey('currentScreen', 'dashboard');
            } else {
                setKey('centralActiveTab', 'menu');
            }
        } else if (state.currentScreen === 'logistics-hub') {
            if (state.logisticsActiveTab === 'menu') {
                setKey('currentScreen', 'dashboard');
            } else if (state.logisticsActiveTab === 'movimentar' || state.logisticsActiveTab === 'solicitacao') {
                if (state.logisticsFlowStep === 'product') {
                    window.dispatchEvent(new CustomEvent('corellux-back-step'));
                } else if (state.logisticsActiveTab === 'movimentar' && state.logisticsFlowType !== null) {
                    window.dispatchEvent(new CustomEvent('corellux-back-flow'));
                } else {
                    setKey('logisticsActiveTab', 'menu');
                }
            } else {
                setKey('logisticsActiveTab', 'menu');
            }
        } else if (state.currentScreen !== 'dashboard') {
            setKey('currentScreen', 'dashboard');
        }
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
                {state.currentScreen !== 'dashboard' && (
                    <button className="btn-home-header" onClick={handleBackClick} title="Voltar" style={{ marginRight: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <button className="btn-home-header" onClick={handleHomeClick} title="Início">
                    <Home size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo_cubo.png?v=5" alt="Logo" style={{ height: '52px', width: 'auto', display: 'block' }} />
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
                {state.currentScreen === 'logistics-hub' && state.logisticsActiveTab === 'movimentar' && state.logisticsFlowType === 'entrada' && (
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('corellux-import-xml'))}
                        className="btn-primary" 
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            background: 'rgba(255, 90, 0, 0.1)',
                            border: '1px solid var(--accent-orange)',
                            color: 'var(--accent-orange)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            marginRight: '0.8rem',
                            height: '34px'
                        }}
                    >
                        <FileText size={14} /> IMPORTAR XML
                    </button>
                )}
                {state.currentScreen === 'logistics-hub' && state.logisticsActiveTab === 'estoque' && (
                    <div className="search-box" style={{ margin: '0 1rem 0 0', width: '250px' }}>
                        <Search size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar SKU, nome ou marca..."
                            value={state.inventorySearch || ''}
                            onChange={(e) => setKey('inventorySearch', e.target.value)}
                        />
                    </div>
                )}
                <div className="header-notification-bell" onClick={handleNotificationClick}>
                    <Bell size={18} />
                    <span className="notification-badge" id="header-notif-count">0</span>
                </div>
                <button className="btn-logout-header orange-lock" onClick={handleLogout} id="btn-logout">
                    <UserCheck size={16} /> Logout
                </button>
                <button className="btn-logout-header exit" onClick={handleExit} id="btn-exit">
                    <LogOut size={16} /> Exit
                </button>
            </div>
        </header>
    );
}
