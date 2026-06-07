/**
 * Corellux OS — Login Page (Multi-tenant + Master)
 * Detecta automaticamente se é login Master ou de empresa.
 * Credenciais Master: master@corellux.com.br / Master@2026
 * v3.0.0
 */

import React, { useState, useRef } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import { useTenant } from '../store/tenant-context';
import { User, Lock, Eye, EyeOff, AlertCircle, Shield, Building2 } from 'lucide-react';
import MasterAuthService from '../services/master-auth-service.js';
import TenantService from '../services/tenant-service.js';
import DbService from '../services/db-service.js';
import AuditService from '../services/audit-service.js';
import supabase from '../services/supabase-client.js';

// UUID fixo da empresa padrão (Bella Italia) — mesma do SQL seed
const EMPRESA_PADRAO_ID = '00000000-0000-0000-0000-000000000001';

export default function Login() {
    const [state, setKey, updatePartial] = useCorelluxState(['workstationAuthenticated']);
    const { refreshTenant } = useTenant();

    const [email, setEmail]       = useState('');
    const [senha, setSenha]       = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [isMasterMode, setIsMasterMode] = useState(false);
    const [clickCount, setClickCount]     = useState(0);
    const clickTimerRef = useRef(null);

    // Cliques no logo para revelar modo Master (easter egg: 5 cliques rápidos)
    const handleLogoClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);

        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => setClickCount(0), 2000);

        if (newCount >= 5) {
            setClickCount(0);
            setIsMasterMode(true);
            setEmail('master@corellux.com.br');
            setSenha('');
            setError('');
        }
    };

    // Detecta automaticamente se é email Master
    const handleEmailChange = (e) => {
        const val = e.target.value;
        setEmail(val);
        setIsMasterMode(MasterAuthService.isMasterCredentials(val));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isMasterMode) {
                // ── FLUXO MASTER ──────────────────────────────────
                const result = await MasterAuthService.loginMaster(email, senha);

                if (!result.success) {
                    setError(result.error);
                    setLoading(false);
                    return;
                }

                TenantService.initMasterContext(result.masterUser);
                refreshTenant();

                updatePartial({
                    workstationAuthenticated: true,
                    currentScreen: 'master-hub',
                });

            } else {
                // ── FLUXO EMPRESA (login legado por enquanto) ─────
                // Para o projeto atual, a autenticação de empresa é feita
                // pelo email/senha do app_users + PIN individual
                // O campo email aqui é o "email de estação" (admin@empresa.com)

                // Tenta autenticar como usuário da empresa padrão
                // TODO: Em versão futura, buscar empresa pelo email do domínio
                const result = await initEmpresaLogin(email, senha);

                if (!result.success) {
                    setError(result.error);
                    setLoading(false);
                    return;
                }

                refreshTenant();

                updatePartial({
                    workstationAuthenticated: true,
                    currentScreen: 'user-select',
                });
            }
        } catch (err) {
            setError('Erro ao autenticar. Verifique sua conexão.');
            console.error('[Login] Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    // Login de empresa (busca empresa pelo login/senha, inicializa contexto)
    const initEmpresaLogin = async (email, senha) => {
        try {
            // Tenta consultar a tabela de empresas no banco
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, status, nome_fantasia, razao_social')
                .eq('login_usuario', email.trim())
                .eq('login_senha', senha)
                .maybeSingle();

            if (!error && empresa) {
                if (empresa.status === 'Bloqueado') {
                    return { success: false, error: 'Esta empresa está bloqueada no sistema. Entre em contato com o suporte.' };
                }
                if (empresa.status === 'Suspenso') {
                    return { success: false, error: 'Esta empresa está suspensa por inadimplência. Entre em contato com o financeiro.' };
                }

                const result = await TenantService.initTenantContext(empresa.id);
                if (result.success) {
                    await AuditService.logLogin(`Estação de Trabalho (${empresa.nome_fantasia || empresa.razao_social})`, empresa.id);
                }
                return result;
            }
        } catch (err) {
            console.warn('[Login] Erro ao autenticar via banco, testando fallback local:', err);
        }

        // ── FALLBACK LOCAL (Desenvolvimento) ────────────────────────
        if (email.trim() === 'admin' && senha === 'password') {
            // Inicializa contexto da empresa padrão
            const result = await TenantService.initTenantContext(EMPRESA_PADRAO_ID);
            if (result.success) {
                await AuditService.logLogin('Estação de Trabalho (Bella Italia - Fallback)', EMPRESA_PADRAO_ID);
            }
            return result;
        }

        return { success: false, error: 'Usuário ou senha de empresa incorretos.' };
    };

    return (
        <div id="screen-login" className="screen active">
            <div className="login-box">

                {/* LOGO */}
                <div
                    className="login-logo"
                    onClick={handleLogoClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '2.5rem',
                        cursor: 'default',
                        userSelect: 'none',
                    }}
                >
                    <img src="/logo_cubo.png?v=5" alt="Corelux Cube" className="login-logo-cube" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '2.0rem', fontWeight: '900', letterSpacing: '0px', lineHeight: '1.1', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#ffffff' }}>CORELUX</span>{' '}
                            <span style={{ color: '#f97316' }}>OS</span>
                        </span>
                        <span style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '1px', marginTop: '0.2rem', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            ENTERPRISE CORE
                        </span>
                    </div>
                </div>

                {/* BADGE DE MODO */}
                {isMasterMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
                        border: '1px solid rgba(249,115,22,0.4)',
                        borderRadius: '100px',
                        padding: '0.4rem 1.2rem',
                        color: '#f97316',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        animation: 'pulse 2s infinite',
                    }}>
                        <Shield size={13} />
                        Acesso Master — Painel Administrativo Global
                    </div>
                )}

                {/* SUBTÍTULO */}
                {!isMasterMode && (
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                    }}>
                        <Building2 size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                        Acesso da empresa
                    </p>
                )}

                {/* FORMULÁRIO */}
                <form id="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--accent-red, #ef4444)',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px',
                            padding: '0.6rem 1rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                        }}>
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    {/* EMAIL */}
                    <div className="input-group">
                        <User size={16} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            id="login-username"
                            placeholder={isMasterMode ? 'E-mail Master' : 'Usuário / E-mail'}
                            value={email}
                            onChange={handleEmailChange}
                            autoComplete="email"
                            style={{
                                borderColor: isMasterMode ? 'rgba(249,115,22,0.4)' : undefined,
                            }}
                        />
                    </div>

                    {/* SENHA */}
                    <div className="input-group" style={{ position: 'relative' }}>
                        <Lock size={16} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 1 }} />
                        <input
                            type={showSenha ? 'text' : 'password'}
                            id="login-password"
                            placeholder="••••••••"
                            value={senha}
                            onChange={e => { setSenha(e.target.value); setError(''); }}
                            autoComplete="current-password"
                            style={{
                                paddingRight: '3rem',
                                borderColor: isMasterMode ? 'rgba(249,115,22,0.4)' : undefined,
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowSenha(v => !v)}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>

                    {/* BOTÃO */}
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            background: isMasterMode
                                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                : undefined,
                            opacity: loading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: '14px', height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTop: '2px solid #fff',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    display: 'inline-block',
                                }} />
                                Autenticando...
                            </>
                        ) : (
                            <>
                                {isMasterMode && <Shield size={15} />}
                                {isMasterMode ? 'ACESSAR PAINEL MASTER' : 'ENTRAR'}
                            </>
                        )}
                    </button>

                    {!isMasterMode && (
                        <a href="#" className="forgot-password">Esqueci minha senha</a>
                    )}

                    {isMasterMode && (
                        <button
                            type="button"
                            onClick={() => { setIsMasterMode(false); setEmail(''); setSenha(''); setError(''); }}
                            style={{
                                marginTop: '0.75rem',
                                background: 'none',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                width: '100%',
                                fontSize: '0.8rem',
                            }}
                        >
                            ← Voltar ao login da empresa
                        </button>
                    )}
                </form>
            </div>

            <div className="login-footer">
                <span>Versão 3.0.0 | &copy; 2026 Corellux Systems</span>
                <a href="#">Suporte Técnico</a>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}} />
        </div>
    );
}
