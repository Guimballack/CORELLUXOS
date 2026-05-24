/**
 * Corellux OS - User Selection Page
 * Exibe um grid de perfis de funcionários ativos para seleção e autenticação com PIN.
 */

import React, { useState, useEffect } from 'react';
import { useCorelluxState, loadUsers } from '../store/corellux-state';
import { getUserAvatar } from '../utils/initial-data';
import PinModal from '../components/PinModal';
import { ShieldAlert, IdCard, LogOut, Loader2 } from 'lucide-react';

export default function UserSelect() {
    const [state, setKey, updatePartial] = useCorelluxState(['currentUser', 'workstationAuthenticated', 'appUsers']);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!state.appUsers || state.appUsers.length === 0) {
            setLoading(true);
            loadUsers().finally(() => setLoading(false));
        }
    }, [state.appUsers]);

    const activeUsers = (state.appUsers || []).filter(u => u.status === 'Ativo');

    const handleSelectUser = (user) => {
        updatePartial({
            currentUser: user,
            pin: ''
        });
        setPinModalOpen(true);
    };

    const handleClosePinModal = () => {
        setPinModalOpen(false);
        setKey('currentUser', null);
    };

    const handleExitStation = () => {
        updatePartial({
            currentUser: null,
            pin: '',
            workstationAuthenticated: false,
            currentScreen: 'login'
        });
    };

    return (
        <div id="screen-user-select" className="screen active with-header">
            <div className="auth-header-container">
                <div className="auth-header-badge">
                    <ShieldAlert size={14} style={{ marginRight: '0.4rem' }} /> ESTAÇÃO DE AUTENTICAÇÃO
                </div>
                <h1 className="auth-header-title">
                    Bem-vindo ao Corellux <span className="brand-orange-text">OS</span>
                </h1>
                <p className="auth-header-subtitle">
                    Selecione seu perfil abaixo para validar suas credenciais de acesso
                </p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '1rem', color: 'var(--text-secondary)' }}>
                    <Loader2 size={36} className="spin-animation" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-orange)' }} />
                    <p>Carregando perfis...</p>
                    <style dangerouslySetInnerHTML={{__html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}} />
                </div>
            ) : activeUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    Nenhum perfil ativo encontrado.
                </div>
            ) : (
                <div className="users-grid" id="users-grid">
                    {activeUsers.map((user) => (
                        <div 
                            key={user.id} 
                            className="user-card" 
                            onClick={() => handleSelectUser(user)}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <img 
                                src={getUserAvatar(user.img)} 
                                alt={user.displayName || user.name} 
                                className="user-avatar" 
                            />
                            <h3>{user.displayName || user.name}</h3>
                            <p>{user.role}</p>
                            <IdCard size={18} style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }} />
                        </div>
                    ))}
                </div>
            )}

            <div className="bottom-actions" style={{ position: 'fixed', bottom: '2rem', right: '3rem' }}>
                <button className="btn-logout" onClick={handleExitStation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <LogOut size={16} /> Fechar Estação
                </button>
            </div>

            <PinModal 
                isOpen={pinModalOpen} 
                onClose={handleClosePinModal} 
            />
        </div>
    );
}
