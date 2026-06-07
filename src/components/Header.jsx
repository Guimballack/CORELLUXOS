/**
 * Corellux OS - Header Component
 * Componente do cabeçalho global com exibição de usuário, data/hora e ações.
 * v3.0 — suporte a multi-tenant, impersonação e badge de empresa/filial
 */

import React, { useState, useEffect } from 'react';
import { useCorelluxState, isAuthenticated } from '../store/corellux-state';
import { useTenant } from '../store/tenant-context';
import { getUserAvatar } from '../utils/initial-data';
import { Home, Bell, UserCheck, LogOut, ShieldAlert, ArrowLeft, Search, FileText, Shield, Building2, GitBranch, X } from 'lucide-react';
import DbService from '../services/db-service';

export default function Header() {
    const { empresaData, filialData, isMaster, isImpersonating, sairDoCliente, masterData } = useTenant();
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser', 
        'workstationAuthenticated', 
        'currentScreen',
        'settingsActiveTab',
        'centralActiveTab',
        'checklistSubTab',
        'checklistActiveTab',
        'logisticsActiveTab',
        'logisticsFlowType',
        'logisticsFlowStep',
        'inventorySearch',
        'notifications',
        'patrimonioActiveTab'
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

    const isUserLoggedIn = !!state.currentUser;

    useEffect(() => {
        if (isUserLoggedIn) {
            DbService.getNotifications().then(data => {
                setKey('notifications', data);
            });
        }
    }, [isUserLoggedIn]);
    const isHeaderVisible = state.workstationAuthenticated && state.currentScreen !== 'login' && state.currentScreen !== 'user-select';
    // No painel Master puro, o header nativo não é exibido (MasterHub tem o seu próprio layout)
    const isMasterOnlyScreen = state.currentScreen === 'master-hub' && !isImpersonating;

    if (!isHeaderVisible || isMasterOnlyScreen) return null;

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
            } else if (state.centralActiveTab === 'checklist') {
                if (state.checklistSubTab === 'menu') {
                    setKey('centralActiveTab', 'menu');
                } else if (state.checklistSubTab === 'builder') {
                    setKey('checklistSubTab', 'models');
                } else if (state.checklistSubTab === 'execution') {
                    window.dispatchEvent(new CustomEvent('corellux-checklist-back'));
                } else {
                    setKey('checklistSubTab', 'menu');
                }
            } else {
                setKey('centralActiveTab', 'menu');
            }
        } else if (state.currentScreen === 'checklist-hub') {
            if (state.checklistActiveTab === 'menu') {
                setKey('currentScreen', 'central-hub');
            } else if (state.checklistActiveTab === 'builder') {
                setKey('checklistActiveTab', 'templates');
            } else if (state.checklistActiveTab === 'execution') {
                window.dispatchEvent(new CustomEvent('corellux-checklist-back'));
            } else {
                setKey('checklistActiveTab', 'menu');
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
        } else if (state.currentScreen === 'patrimonio-hub') {
            if (state.patrimonioActiveTab === 'dashboard') {
                setKey('currentScreen', 'dashboard');
            } else {
                setKey('patrimonioActiveTab', 'dashboard');
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



    const notifications = state.notifications || [];

    const canUserSeeNotification = (n) => {
        if (!n || !state.currentUser) return false;
        const isAdmin = state.currentUser.accessLevel === 'Administrador';
        if (n.sender === state.currentUser.name) return true;
        if (n.targetUsers && Array.isArray(n.targetUsers) && n.targetUsers.length > 0) {
            return n.targetUsers.includes(state.currentUser.id) || isAdmin;
        }
        if (isAdmin) return true;
        if (n.type === 'sistema' && !n.targetSector) return true;

        const targetSector = String(n.targetSector || 'Todos').trim();
        if (targetSector === 'Todos') return true;

        const role = String(state.currentUser.role || '').toLowerCase();
        const sector = targetSector.toLowerCase();

        if (sector === 'cozinha' && (role === 'cozinha' || role === 'chef' || role === 'cozinheiro' || role === 'produção')) return true;
        if (sector === 'estoque' && (role === 'estoque' || role === 'estoquista' || role === 'almoxarife')) return true;
        if (sector === 'salão' && (role === 'salão' || role === 'garçom' || role === 'atendente' || role === 'caixa')) return true;
        if (sector === 'administração' && (role === 'administração' || role === 'gerente' || role === 'supervisor' || role === 'administrador')) return true;

        return role === sector;
    };

    const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => {
        if (!n) return false;
        if (!canUserSeeNotification(n)) return false;
        const userId = state.currentUser ? state.currentUser.id : null;
        if (!userId) return false;
        const isReadByMe = n.readBy && n.readBy[userId];
        const currentUserName = state.currentUser ? state.currentUser.name : '';
        return !isReadByMe && n.sender !== currentUserName;
    }).length;

    const handleNotificationClick = () => {
        updatePartial({
            currentScreen: 'central-hub',
            centralActiveTab: 'feed'
        });
    };

    const handleSairDoCliente = async () => {
        await sairDoCliente();
        updatePartial({ currentScreen: 'master-hub' });
    };

    return (
        <>
        {/* BANNER DE IMPERSONAÇÃO */}
        {isImpersonating && isMaster && (
            <div style={{
                background: 'linear-gradient(90deg, #ea580c, #f97316)',
                padding: '0.35rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                fontSize: '0.75rem', fontWeight: '700', color: '#fff',
                zIndex: 100, position: 'relative',
            }}>
                <Shield size={13} />
                <span>Modo Suporte — você está visualizando como:</span>
                <strong style={{ background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                    {empresaData?.nome_fantasia || empresaData?.razao_social || 'Cliente'}
                </strong>
                <button
                    onClick={handleSairDoCliente}
                    style={{
                        marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px', padding: '0.2rem 0.65rem', color: '#fff', cursor: 'pointer',
                        fontWeight: '700', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                >
                    <X size={11} /> Sair do cliente
                </button>
            </div>
        )}
        <header id="global-header">
            {/* COLUNA ESQUERDA: Logo + Info do Usuário + Hora/Data */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                <div className="logo-area" style={{ margin: 0 }}>
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

                {isUserLoggedIn && state.currentUser && (
                    <div className="user-info-area" id="header-user-info" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem', marginLeft: 0, marginRight: 0 }}>
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

                <div className="time-area" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem', marginLeft: 0, marginRight: 0 }}>
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
            </div>

            {/* COLUNA CENTRAL: Nome da Empresa / Filiais */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 5
            }}>
                {empresaData && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transform: 'scale(1.08)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255, 90, 0, 0.08)',
                            border: '1px solid rgba(255, 90, 0, 0.25)',
                            borderRadius: '10px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            boxShadow: '0 0 15px rgba(243, 107, 29, 0.1)',
                            transition: 'all 0.3s ease',
                        }}>
                            <Building2 size={13} style={{ color: '#f97316' }} />
                            <span style={{ color: 'var(--text-primary)', fontWeight: '700', letterSpacing: '0.5px' }}>
                                {empresaData.nome_fantasia || empresaData.razao_social}
                            </span>
                            {filialData && (
                                <>
                                    <span style={{ opacity: 0.4, margin: '0 0.15rem' }}>›</span>
                                    <GitBranch size={12} style={{ color: '#06b6d4' }} />
                                    <span style={{ fontWeight: '600', color: '#06b6d4' }}>{filialData.nome}</span>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* COLUNA DIREITA: Ações (Busca, XML, Notificações, Logout) */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '1.5rem'
            }}>
                <div className="header-actions" id="header-actions" style={{ marginLeft: 0 }}>
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
                    <div className="header-notification-bell" onClick={handleNotificationClick} style={{ marginRight: 0 }}>
                        <Bell size={18} />
                        <span className="notification-badge" id="header-notif-count" style={{ display: unreadCount > 0 ? 'flex' : 'none' }}>
                            {unreadCount}
                        </span>
                    </div>
                    <button className="btn-logout-header orange-lock" onClick={handleLogout} id="btn-logout">
                        <UserCheck size={16} /> Logout
                    </button>
                    <button className="btn-logout-header exit" onClick={handleExit} id="btn-exit">
                        <LogOut size={16} /> Exit
                    </button>
                </div>
            </div>
        </header>
        </>
    );
}
