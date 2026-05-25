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
                <div className="login-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem' }}>
                    <img src="/logo_completa.png" alt="CORELUX OS Logo" style={{ width: '100%', maxWidth: '320px', height: 'auto', display: 'block' }} />
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
