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
                        <path d="M50 5 L90 28.09 L90 74.27 L50 97.36 L10 74.27 L10 28.09 Z" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        {/* Top Face 'Y' Lines forming the 3D edges */}
                        <path d="M10 28.09 L50 51.18 L90 28.09" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        <path d="M50 51.18 L50 97.36" stroke="#f97316" strokeWidth="7" strokeLinejoin="round"/>
                        
                        {/* Smaller top box (Inner rhombus) */}
                        <path d="M50 18 L63 25.5 L50 33 L37 25.5 Z" stroke="#f97316" strokeWidth="5.5" strokeLinejoin="round"/>
                        
                        {/* Left face inner detail */}
                        <path d="M28 65 L40 72 L40 85" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M28 65 L28 48 L36 43.5" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>

                        {/* Right face inner detail */}
                        <path d="M72 65 L60 72 L60 85" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M72 65 L72 48 L64 43.5" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
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
