/**
 * Corellux OS - Login Page (Workstation Authentication)
 * Tela de login para autenticação da estação de trabalho.
 */

import React, { useState } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import { User, Lock } from 'lucide-react';

export default function Login() {
    const [state, setKey, updatePartial] = useCorelluxState(['workstationAuthenticated']);
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (username.trim() === 'admin' && password === 'password') {
            updatePartial({
                workstationAuthenticated: true,
                currentScreen: 'user-select'
            });
        } else {
            setError('Usuário ou senha incorretos.');
            setPassword('');
        }
    };

    return (
        <div id="screen-login" className="screen active">
            <div className="login-box">
                <div className="login-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '0px', lineHeight: '1', fontFamily: 'Inter, sans-serif' }}>
                            <span style={{ color: '#ffffff' }}>CORELUX</span> <span style={{ color: '#f97316' }}>OS</span>
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '1px', marginTop: '0.3rem', fontFamily: 'Inter, sans-serif' }}>
                            GESTÃO OPERACIONAL
                        </span>
                    </div>
                </div>
                
                <form id="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                    
                    <div className="input-group">
                        <User size={16} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input 
                            type="text" 
                            id="login-username" 
                            placeholder="Usuário/E-mail" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    
                    <div className="input-group">
                        <Lock size={16} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input 
                            type="password" 
                            id="login-password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className="btn-primary">ENTRAR</button>
                    <a href="#" className="forgot-password">Esqueci minha senha</a>
                </form>
            </div>
            
            <div className="login-footer">
                <span>Versão 2.5.0 | &copy; 2026 Corellux Systems</span>
                <a href="#">Suporte Técnico</a>
            </div>
        </div>
    );
}
