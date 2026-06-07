/**
 * Corellux OS — Master Hub
 * Painel exclusivo do Super Administrador (MASTER).
 * Contém todos os menus e sub-telas de gestão global.
 * v1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard, Building2, GitBranch, Users, CreditCard,
    Package, DollarSign, Key, ClipboardList, Terminal,
    BarChart3, LogOut, Shield, ChevronRight, Search,
    Plus, Edit3, Trash2, CheckCircle, XCircle, AlertTriangle,
    Eye, RefreshCw, ArrowRight, TrendingUp, Activity,
    Globe, Zap, HardDrive, FileText, ShoppingBag,
    ExternalLink, Clock, Filter, Download, Star,
    ToggleLeft, ToggleRight, Server
} from 'lucide-react';
import { useTenant } from '../../store/tenant-context.jsx';
import { useCorelluxState } from '../../store/corellux-state.js';
import EmpresasService from '../../services/empresas-service.js';
import ModulosService from '../../services/modulos-service.js';
import AuditService from '../../services/audit-service.js';
import MasterAuthService from '../../services/master-auth-service.js';
import supabase from '../../services/supabase-client.js';

// ─── MENU ITEMS ────────────────────────────────────────────────
const MENU_ITEMS = [
    { id: 'dashboard',  label: 'Dashboard',      icon: LayoutDashboard, color: '#6366f1' },
    { id: 'empresas',   label: 'Empresas',        icon: Building2,       color: '#10b981' },
    { id: 'filiais',    label: 'Filiais',         icon: GitBranch,       color: '#06b6d4' },
    { id: 'usuarios',   label: 'Usuários',        icon: Users,           color: '#f59e0b' },
    { id: 'planos',     label: 'Planos',          icon: Star,            color: '#8b5cf6' },
    { id: 'modulos',    label: 'Módulos',         icon: Package,         color: '#ec4899' },
    { id: 'cobrancas',  label: 'Cobranças',       icon: DollarSign,      color: '#22c55e' },
    { id: 'licencas',   label: 'Licenças',        icon: Key,             color: '#f97316' },
    { id: 'auditoria',  label: 'Auditoria',       icon: ClipboardList,   color: '#94a3b8' },
    { id: 'logs',       label: 'Logs do Sistema', icon: Terminal,        color: '#64748b' },
    { id: 'metricas',   label: 'Métricas de Uso', icon: BarChart3,       color: '#06b6d4' },
];

// ─── STATUS BADGE ───────────────────────────────────────────────
function StatusBadge({ status }) {
    const configs = {
        'Ativo':     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
        'Suspenso':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: AlertTriangle },
        'Bloqueado': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
        'Pendente':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
        'Pago':      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
        'Atrasado':  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
    };
    const conf = configs[status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Activity };
    const Icon = conf.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: conf.bg, color: conf.color,
            padding: '0.2rem 0.7rem', borderRadius: '100px',
            fontSize: '0.72rem', fontWeight: '700',
        }}>
            <Icon size={10} />{status}
        </span>
    );
}

// ─── CARD KPI ───────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub, trend }) {
    return (
        <div style={{
            background: 'var(--bg-card, rgba(255,255,255,0.04))',
            border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            position: 'relative', overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${color}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${color}18, transparent)`, borderRadius: '14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                <div style={{ background: `${color}18`, borderRadius: '10px', padding: '0.5rem', color }}><Icon size={16} /></div>
            </div>
            <div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary, #fff)', lineHeight: 1 }}>{value ?? '—'}</div>
                {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.3rem' }}>{sub}</div>}
            </div>
            {trend && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: trend > 0 ? '#22c55e' : '#ef4444' }}>
                    <TrendingUp size={11} />{trend > 0 ? '+' : ''}{trend}% este mês
                </div>
            )}
        </div>
    );
}

// ─── DASHBOARD MASTER ───────────────────────────────────────────
function MasterDashboard({ onNavigate }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        EmpresasService.getEstatisticasGlobais().then(data => {
            setStats(data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
    );

    const kpis = [
        { label: 'Empresas Ativas',    value: stats?.ativas,          icon: CheckCircle,  color: '#22c55e', sub: `${stats?.suspensas || 0} suspensas · ${stats?.bloqueadas || 0} bloqueadas` },
        { label: 'Total de Usuários',  value: stats?.totalUsuarios,   icon: Users,        color: '#6366f1' },
        { label: 'Faturamento Mensal', value: `R$ ${(stats?.faturamentoMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#22c55e', trend: 12 },
        { label: 'Total de Empresas',  value: stats?.totalEmpresas,   icon: Building2,    color: '#f97316' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
            </div>

            {/* Empresas por Plano */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
            }}>
                <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary, #fff)' }}>Empresas por Plano</h3>
                    {(stats?.empresasPorPlano || []).map((ep, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{ep.plano}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${stats.totalEmpresas ? (ep.total / stats.totalEmpresas * 100) : 0}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }} />
                                </div>
                                <span style={{ color: 'var(--text-primary, #fff)', fontWeight: '700', minWidth: '20px', textAlign: 'right', fontSize: '0.85rem' }}>{ep.total}</span>
                            </div>
                        </div>
                    ))}
                    {(!stats?.empresasPorPlano?.length) && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Nenhum dado disponível</p>
                    )}
                </div>

                {/* Acesso Rápido */}
                <div style={{ background: 'var(--bg-card, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary, #fff)' }}>Acesso Rápido</h3>
                    {[
                        { label: 'Nova Empresa', icon: Plus, action: () => onNavigate('empresas'), color: '#10b981' },
                        { label: 'Ver Cobranças', icon: DollarSign, action: () => onNavigate('cobrancas'), color: '#22c55e' },
                        { label: 'Auditoria', icon: ClipboardList, action: () => onNavigate('auditoria'), color: '#94a3b8' },
                        { label: 'Métricas', icon: BarChart3, action: () => onNavigate('metricas'), color: '#06b6d4' },
                    ].map((item, i) => (
                        <button key={i} onClick={item.action} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            width: '100%', background: 'none', border: 'none',
                            padding: '0.6rem 0', cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                            color: 'var(--text-secondary)', textAlign: 'left',
                            transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.color = item.color}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                            <item.icon size={14} style={{ color: item.color }} />
                            <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
                            <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── EMPRESAS MANAGER ───────────────────────────────────────────
function EmpresasManager({ onEntrarComoCliente }) {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [showForm, setShowForm]  = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [planos, setPlanos]      = useState([]);
    const [form, setForm]          = useState({
        razao_social: '', nome_fantasia: '', cnpj: '',
        email: '', telefone: '', plano_id: '', data_vencimento: '',
        login_usuario: '', login_senha: '',
    });
    const [saving, setSaving]    = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [empRes, planosRes] = await Promise.all([
            EmpresasService.getEmpresas({ search, status: filtroStatus || undefined }),
            supabase.from('planos').select('*').order('preco_mensal'),
        ]);
        setEmpresas(empRes.data || []);
        setPlanos(planosRes.data || []);
        setLoading(false);
    }, [search, filtroStatus]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        setSaving(true);
        const result = editingEmpresa
            ? await EmpresasService.editarEmpresa(editingEmpresa.id, form)
            : await EmpresasService.criarEmpresa(form);
        setSaving(false);
        if (result.error) {
            alert('Erro ao salvar empresa: ' + (result.error.message || JSON.stringify(result.error)));
            console.error('[MasterHub] Erro ao salvar:', result.error);
        } else {
            setShowForm(false);
            setEditingEmpresa(null);
            setForm({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', plano_id: '', data_vencimento: '', login_usuario: '', login_senha: '' });
            load();
        }
    };

    const handleAltStatus = async (empresa, novoStatus) => {
        setActionLoading(empresa.id + novoStatus);
        await EmpresasService.alterarStatusEmpresa(empresa.id, novoStatus);
        setActionLoading(null);
        load();
    };

    const handleDelete = async () => {
        if (!confirmModal) return;
        await EmpresasService.excluirEmpresa(confirmModal.id);
        setConfirmModal(null);
        load();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Barra de ações */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa, CNPJ..."
                        style={{ width: '100%', paddingLeft: '2.2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem 0.6rem 2.2rem', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                </div>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    <option value="">Todos os status</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Bloqueado">Bloqueado</option>
                </select>
                <button onClick={() => { setShowForm(true); setEditingEmpresa(null); setForm({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', plano_id: '', data_vencimento: '', login_usuario: 'admin', login_senha: 'password' }); }} style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '8px',
                    padding: '0.6rem 1.2rem', color: '#fff', fontWeight: '700', fontSize: '0.82rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                    <Plus size={14} /> Nova Empresa
                </button>
            </div>

            {/* Formulário */}
            {showForm && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {[
                            { key: 'razao_social', label: 'Razão Social*', required: true },
                            { key: 'nome_fantasia', label: 'Nome Fantasia' },
                            { key: 'cnpj', label: 'CNPJ' },
                            { key: 'email', label: 'E-mail', type: 'email' },
                            { key: 'telefone', label: 'Telefone' },
                            { key: 'login_usuario', label: 'Usuário Login*', required: true },
                            { key: 'login_senha', label: 'Senha Login*', type: 'text', required: true },
                            { key: 'data_vencimento', label: 'Vencimento', type: 'date' },
                        ].map(({ key, label, type = 'text', required }) => (
                            <div key={key}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600', textTransform: 'uppercase' }}>{label}</label>
                                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                            </div>
                        ))}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600', textTransform: 'uppercase' }}>Plano</label>
                            <select value={form.plano_id} onChange={e => setForm(f => ({ ...f, plano_id: e.target.value }))}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                <option value="">Sem plano</option>
                                {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco_mensal}/mês</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowForm(false); setEditingEmpresa(null); }} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1.2rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '8px', padding: '0.5rem 1.5rem', color: '#fff', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabela */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['Empresa', 'CNPJ', 'Plano', 'Status', 'Vencimento', 'Ações'].map(col => (
                                    <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhuma empresa encontrada</td></tr>
                            )}
                            {empresas.map(emp => (
                                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '0.85rem 1rem' }}>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{emp.nome_fantasia || emp.razao_social}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{emp.razao_social}</div>
                                        <div style={{ color: '#f97316', fontSize: '0.68rem', marginTop: '0.2rem', fontWeight: '600' }}>Login: {emp.login_usuario || 'admin'}</div>
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontFamily: 'monospace' }}>{emp.cnpj || '—'}</td>
                                    <td style={{ padding: '0.85rem 1rem' }}>
                                        {emp.planos ? (
                                            <span style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>
                                                {emp.planos.nome}
                                            </span>
                                        ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={emp.status} /></td>
                                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {emp.data_vencimento ? new Date(emp.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                                    </td>
                                    <td style={{ padding: '0.85rem 1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {/* Entrar como cliente */}
                                            <button onClick={() => onEntrarComoCliente(emp)} title="Entrar como Cliente" style={{ background: 'rgba(249,115,22,0.12)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#f97316', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <ExternalLink size={11} /> Entrar
                                            </button>
                                            {/* Editar */}
                                            <button onClick={() => { setEditingEmpresa(emp); setForm({ razao_social: emp.razao_social, nome_fantasia: emp.nome_fantasia || '', cnpj: emp.cnpj || '', email: emp.email || '', telefone: emp.telefone || '', plano_id: emp.plano_id || '', data_vencimento: emp.data_vencimento || '', login_usuario: emp.login_usuario || 'admin', login_senha: emp.login_senha || 'password' }); setShowForm(true); }} title="Editar" style={{ background: 'rgba(99,102,241,0.12)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#818cf8', cursor: 'pointer' }}>
                                                <Edit3 size={12} />
                                            </button>
                                            {/* Ativar/Suspender */}
                                            {emp.status !== 'Ativo' && (
                                                <button onClick={() => handleAltStatus(emp, 'Ativo')} disabled={actionLoading === emp.id + 'Ativo'} title="Reativar" style={{ background: 'rgba(34,197,94,0.12)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#22c55e', cursor: 'pointer' }}>
                                                    <CheckCircle size={12} />
                                                </button>
                                            )}
                                            {emp.status === 'Ativo' && (
                                                <button onClick={() => handleAltStatus(emp, 'Suspenso')} disabled={actionLoading === emp.id + 'Suspenso'} title="Suspender" style={{ background: 'rgba(245,158,11,0.12)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#f59e0b', cursor: 'pointer' }}>
                                                    <AlertTriangle size={12} />
                                                </button>
                                            )}
                                            {/* Excluir */}
                                            <button onClick={() => setConfirmModal(emp)} title="Excluir" style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de confirmação de exclusão */}
            {confirmModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary, #1e293b)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Excluir Empresa?</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Esta ação é <strong>irreversível</strong>. Todos os dados de <strong>{confirmModal.nome_fantasia || confirmModal.razao_social}</strong> serão perdidos.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={() => setConfirmModal(null)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={handleDelete} style={{ background: '#ef4444', border: 'none', borderRadius: '8px', padding: '0.6rem 1.5rem', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── AUDITORIA VIEWER ───────────────────────────────────────────
function AuditoriaViewer() {
    const [logs, setLogs]   = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ acao: '', usuario_nome: '', data_inicio: '', data_fim: '' });

    const load = useCallback(async () => {
        setLoading(true);
        const { data, count: c } = await AuditService.getAuditLogs({ ...filtros, limit: 100 });
        setLogs(data);
        setCount(c || 0);
        setLoading(false);
    }, [filtros]);

    useEffect(() => { load(); }, [load]);

    const ACAO_COLORS = {
        LOGIN:       '#22c55e', LOGOUT: '#94a3b8', CREATE: '#6366f1',
        UPDATE:      '#f59e0b', DELETE: '#ef4444', IMPERSONATE: '#f97316',
        ACCESS:      '#06b6d4',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input value={filtros.usuario_nome} onChange={e => setFiltros(f => ({ ...f, usuario_nome: e.target.value }))} placeholder="Filtrar por usuário..."
                    style={{ flex: '1 1 140px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                <select value={filtros.acao} onChange={e => setFiltros(f => ({ ...f, acao: e.target.value }))}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                    <option value="">Todas as ações</option>
                    {['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','IMPERSONATE','ACCESS'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input type="date" value={filtros.data_inicio} onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                <input type="date" value={filtros.data_fim} onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.82rem' }} />
                <button onClick={load} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <Filter size={13} /> Filtrar
                </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{count} registro(s) encontrado(s)</div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['Data/Hora', 'Usuário', 'Tipo', 'Ação', 'Entidade', 'Empresa', 'IP'].map(col => (
                                    <th key={col} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 && <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Nenhum registro</td></tr>}
                            {logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>{log.usuario_nome || '—'}</td>
                                    <td style={{ padding: '0.6rem 0.85rem' }}>
                                        <span style={{ background: log.usuario_tipo === 'MASTER' ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.1)', color: log.usuario_tipo === 'MASTER' ? '#f97316' : '#818cf8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' }}>
                                            {log.usuario_tipo || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.85rem' }}>
                                        <span style={{ color: ACAO_COLORS[log.acao] || '#94a3b8', fontSize: '0.75rem', fontWeight: '700', fontFamily: 'monospace' }}>{log.acao}</span>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.entidade || '—'}</td>
                                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.empresas?.nome_fantasia || '—'}</td>
                                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{log.ip || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ─── PLANOS MANAGER ─────────────────────────────────────────────
function PlanosManager() {
    const [planos, setPlanos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('planos').select('*').order('preco_mensal').then(({ data }) => {
            setPlanos(data || []);
            setLoading(false);
        });
    }, []);

    const CORES = ['#6366f1', '#10b981', '#f97316'];

    return (
        <div>
            {loading ? <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /></div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {planos.map((plano, i) => (
                        <div key={plano.id} style={{
                            background: 'var(--bg-card)', border: `1px solid ${CORES[i % CORES.length]}44`,
                            borderRadius: '16px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                            boxShadow: `0 4px 20px ${CORES[i % CORES.length]}11`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800' }}>{plano.nome}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{plano.descricao}</p>
                                </div>
                                <StatusBadge status={plano.status} />
                            </div>
                            <div>
                                <span style={{ fontSize: '2rem', fontWeight: '900', color: CORES[i % CORES.length] }}>R$ {plano.preco_mensal?.toFixed(2).replace('.', ',')}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>/mês</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {[
                                    { label: 'Usuários', value: plano.max_usuarios === 999 ? '∞' : plano.max_usuarios },
                                    { label: 'Filiais',  value: plano.max_filiais  === 999 ? '∞' : plano.max_filiais },
                                    { label: 'Storage',  value: plano.max_storage_gb === 999 ? '∞ GB' : `${plano.max_storage_gb} GB` },
                                ].map((item, j) => (
                                    <div key={j} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{item.value}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{item.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: '600' }}>Módulos inclusos:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    {(plano.modulos_inclusos || []).map(mod => (
                                        <span key={mod} style={{ background: `${CORES[i % CORES.length]}18`, color: CORES[i % CORES.length], padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '600' }}>{mod}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── MÓDULOS MANAGER ────────────────────────────────────────────
function ModulosManager() {
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState('');
    const [modulos, setModulos]   = useState([]);
    const [loading, setLoading]   = useState(false);

    useEffect(() => {
        EmpresasService.getEmpresas({ limit: 200 }).then(({ data }) => setEmpresas(data || []));
    }, []);

    useEffect(() => {
        if (!selectedEmpresa) return;
        setLoading(true);
        ModulosService.getAllModulosComStatus(selectedEmpresa).then(data => {
            setModulos(data);
            setLoading(false);
        });
    }, [selectedEmpresa]);

    const toggleModulo = async (moduloId, atualHabilitado) => {
        await ModulosService.setModuloStatus(selectedEmpresa, moduloId, !atualHabilitado);
        setModulos(prev => prev.map(m => m.id === moduloId ? { ...m, habilitado: !atualHabilitado } : m));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase' }}>Selecione a Empresa</label>
                <select value={selectedEmpresa} onChange={e => setSelectedEmpresa(e.target.value)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '280px' }}>
                    <option value="">— Selecione uma empresa —</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
                </select>
            </div>

            {selectedEmpresa && (
                loading ? <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /></div> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        {modulos.map(mod => (
                            <div key={mod.id} onClick={() => toggleModulo(mod.id, mod.habilitado)} style={{
                                background: mod.habilitado ? 'rgba(34,197,94,0.08)' : 'var(--bg-card)',
                                border: `1px solid ${mod.habilitado ? 'rgba(34,197,94,0.3)' : 'var(--border-color)'}`,
                                borderRadius: '12px', padding: '1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ fontSize: '1.5rem' }}>{
                                    { estoque: '📦', producao: '🏭', pdv: '🛒', financeiro: '💰', fiscal: '📄', checklist: '✅', patrimonio: '🏷️', rh: '👥', crm: '❤️', delivery: '🚚', ged: '📁', kpi: '📊' }[mod.codigo] || '⚙️'
                                }</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{mod.nome}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{mod.versao}</div>
                                </div>
                                {mod.habilitado
                                    ? <ToggleRight size={20} style={{ color: '#22c55e' }} />
                                    : <ToggleLeft  size={20} style={{ color: '#64748b' }} />
                                }
                            </div>
                        ))}
                    </div>
                )
            )}

            {!selectedEmpresa && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <Package size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                    <p style={{ fontSize: '0.9rem' }}>Selecione uma empresa para gerenciar seus módulos</p>
                </div>
            )}
        </div>
    );
}

// ─── PLACEHOLDER ────────────────────────────────────────────────
function ComingSoon({ title, icon: Icon }) {
    return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Icon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ fontSize: '0.85rem' }}>Esta seção está sendo desenvolvida.</p>
        </div>
    );
}

// ─── MODAL ENTRAR COMO CLIENTE ──────────────────────────────────
function EntrarComoClienteModal({ empresa, onConfirm, onClose }) {
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        await onConfirm(empresa.id, motivo);
        setLoading(false);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-secondary, #1e293b)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '16px', padding: '2rem', maxWidth: '440px', width: '90%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(249,115,22,0.12)', borderRadius: '10px', padding: '0.6rem', color: '#f97316' }}>
                        <ExternalLink size={20} />
                    </div>
                    <div>
                        <h3 style={{ color: 'var(--text-primary)', fontWeight: '800' }}>Entrar como Cliente</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{empresa?.nome_fantasia || empresa?.razao_social}</p>
                    </div>
                </div>

                <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#f97316' }}>
                    ⚠️ Esta ação será registrada na auditoria com seu usuário, IP, data e hora.
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase' }}>Motivo (obrigatório)</label>
                    <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Suporte técnico solicitado pelo cliente..." rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleConfirm} disabled={!motivo.trim() || loading} style={{
                        background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '8px',
                        padding: '0.6rem 1.5rem', color: '#fff', fontWeight: '700', cursor: 'pointer',
                        opacity: !motivo.trim() || loading ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                        <ExternalLink size={14} />{loading ? 'Entrando...' : 'Confirmar Acesso'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MASTER HUB (PRINCIPAL) ─────────────────────────────────────
export default function MasterHub() {
    const [, , updatePartial] = useCorelluxState(['currentScreen', 'workstationAuthenticated']);
    const { masterData, isMaster, entrarComoCliente, sairDoCliente } = useTenant();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [impersonModal, setImpersonModal] = useState(null);

    // Garante que só Master acessa
    if (!isMaster) {
        updatePartial({ currentScreen: 'login' });
        return null;
    }

    const handleLogout = async () => {
        await MasterAuthService.logoutMaster(masterData);
        updatePartial({ workstationAuthenticated: false, currentScreen: 'login' });
    };

    const handleEntrarComoCliente = async (empresaId, motivo) => {
        const result = await entrarComoCliente(empresaId, motivo);
        if (result.success) {
            setImpersonModal(null);
            updatePartial({ currentScreen: 'dashboard' });
        }
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard': return <MasterDashboard onNavigate={setActiveSection} />;
            case 'empresas':  return <EmpresasManager onEntrarComoCliente={emp => setImpersonModal(emp)} />;
            case 'planos':    return <PlanosManager />;
            case 'modulos':   return <ModulosManager />;
            case 'auditoria': return <AuditoriaViewer />;
            case 'filiais':   return <ComingSoon title="Filiais" icon={GitBranch} />;
            case 'usuarios':  return <ComingSoon title="Usuários Master" icon={Users} />;
            case 'cobrancas': return <ComingSoon title="Cobranças" icon={DollarSign} />;
            case 'licencas':  return <ComingSoon title="Licenças" icon={Key} />;
            case 'logs':      return <ComingSoon title="Logs do Sistema" icon={Terminal} />;
            case 'metricas':  return <ComingSoon title="Métricas de Uso" icon={BarChart3} />;
            default: return null;
        }
    };

    const activeItem = MENU_ITEMS.find(m => m.id === activeSection);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-primary, #0f172a)', overflow: 'hidden' }}>
            {/* SIDEBAR */}
            <aside style={{
                width: sidebarCollapsed ? '64px' : '230px',
                minWidth: sidebarCollapsed ? '64px' : '230px',
                background: 'var(--bg-secondary, #1e293b)',
                borderRight: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                display: 'flex', flexDirection: 'column',
                transition: 'width 0.25s ease, min-width 0.25s ease',
                overflow: 'hidden',
            }}>
                {/* Logo / Header sidebar */}
                <div style={{ padding: sidebarCollapsed ? '1rem 0.75rem' : '1.25rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
                    {!sidebarCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '8px', padding: '0.35rem', display: 'flex' }}>
                                <Shield size={16} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '800', fontSize: '0.82rem', color: '#fff', lineHeight: 1 }}>CORELLUX</div>
                                <div style={{ fontSize: '0.6rem', color: '#f97316', fontWeight: '700', letterSpacing: '1px' }}>MASTER PANEL</div>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && <div style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '8px', padding: '0.35rem', display: 'flex' }}><Shield size={16} color="#fff" /></div>}
                    <button onClick={() => setSidebarCollapsed(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
                        <ChevronRight size={14} style={{ transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s' }} />
                    </button>
                </div>

                {/* Menu */}
                <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
                    {MENU_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button key={item.id} onClick={() => setActiveSection(item.id)} title={sidebarCollapsed ? item.label : undefined}
                                style={{
                                    width: '100%', background: isActive ? `${item.color}16` : 'none',
                                    border: 'none', borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                                    padding: sidebarCollapsed ? '0.7rem 0' : '0.7rem 1.25rem',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    color: isActive ? item.color : 'var(--text-secondary)',
                                    cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.15s', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    fontWeight: isActive ? '700' : '500', fontSize: '0.83rem',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
                            >
                                <Icon size={16} />
                                {!sidebarCollapsed && item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* User / Logout */}
                <div style={{ padding: sidebarCollapsed ? '0.75rem 0' : '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!sidebarCollapsed && masterData && (
                        <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.25rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{masterData.nome}</div>
                            <div style={{ fontSize: '0.68rem', color: '#f97316' }}>{masterData.nivel}</div>
                        </div>
                    )}
                    <button onClick={handleLogout} title="Sair"
                        style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: sidebarCollapsed ? '0.5rem' : '0.5rem 0.75rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', fontSize: '0.8rem' }}>
                        <LogOut size={14} />
                        {!sidebarCollapsed && 'Sair'}
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top bar */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary, #1e293b)' }}>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #fff)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {activeItem && <activeItem.icon size={18} style={{ color: activeItem.color }} />}
                            {activeItem?.label}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Painel de Administração Global — Corellux OS</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '100px', padding: '0.3rem 0.9rem', fontSize: '0.72rem', color: '#f97316', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Shield size={11} /> MASTER
                        </div>
                    </div>
                </div>

                {/* Área de conteúdo */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                    {renderContent()}
                </div>
            </main>

            {/* Modal entrar como cliente */}
            {impersonModal && (
                <EntrarComoClienteModal
                    empresa={impersonModal}
                    onConfirm={handleEntrarComoCliente}
                    onClose={() => setImpersonModal(null)}
                />
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}
