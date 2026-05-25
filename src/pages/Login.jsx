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
                    <img src="/logo_cubo.png?v=5" alt="Corelux Cube" className="login-logo-cube" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '2.0rem', fontWeight: '900', letterSpacing: '0px', lineHeight: '1.1', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#ffffff' }}>CORELUX</span> <span style={{ color: '#f97316' }}>OS</span>
                        </span>
                        <span style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '1px', marginTop: '0.2rem', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            ENTERPRISE CORE
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
