/**
 * Corellux OS - Sub-Produtos Hub
 * Gestão de semi-acabados: fichas técnicas, ordens de produção e controle de estoque.
 * Cadeia: Insumos → [Produção] → Sub-Produto → [Receita] → Produto Final
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCorelluxState } from '../store/corellux-state';
import DbService from '../services/db-service';
import {
    FlaskConical, Plus, Search, Edit3, Trash2, X, Check,
    AlertTriangle, Package, TrendingUp, Clock, PlayCircle, CheckCircle,
    XCircle, Info, Layers, BarChart2, Calendar, User, Archive, RefreshCw,
    AlertCircle, BookOpen, Zap, ClipboardList, PieChart
} from 'lucide-react';

// =============================================
// CONSTANTES
// =============================================
const UNITS = ['UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX', 'BDJ', 'DZ', 'FD'];
const ORDER_STATUS = {
    Planejado:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: Clock },
    'Em Andamento':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: PlayCircle },
    Concluído:       { color: '#34d399', bg: 'rgba(52,211,153,0.15)', icon: CheckCircle },
    Cancelado:       { color: '#f87171', bg: 'rgba(248,113,113,0.15)',icon: XCircle },
};

const EMPTY_SUB = {
    sku: '', name: '', desc: '', category: 'SEMI-ACABADOS', unit: 'UN',
    stock: 0, minStock: 0, maxStock: 100, yieldPerBatch: 1, productionTime: 30,
    recipe: [], controlaProducao: true, type: 'subproduto', status: 'Ativo'
};

const EMPTY_ORDER = {
    subProductSku: '', qtyBatches: 1, responsible: '', notes: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'Planejado'
};

// =============================================
// HELPERS
// =============================================
function stockStatus(stock, minStock) {
    if (stock <= 0) return { label: 'Esgotado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
    if (stock < minStock) return { label: 'Crítico', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'OK', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
}

// =============================================
// COMPONENT PRINCIPAL
// =============================================
export default function SubprodutosHub() {
    const [state, setKey] = useCorelluxState(['subprodutosActiveTab', 'currentUser']);

    const activeTab = state.subprodutosActiveTab || 'dashboard';
    const setActiveTab = (tab) => setKey('subprodutosActiveTab', tab);

    const hasAccess = (permissionKey) => {
        const user = state.currentUser;
        if (!user) return false;
        if (user.accessLevel === 'Administrador') return true;
        if (!user.permissions) return false;
        if (user.permissions[permissionKey] === undefined) return true;
        return !!user.permissions[permissionKey];
    };

    useEffect(() => {
        const tab = state.subprodutosActiveTab || 'dashboard';
        const tabList = [
            { id: 'dashboard', perm: 'sub_subprodutos_painel' },
            { id: 'cadastro', perm: 'sub_subprodutos_fichas' },
            { id: 'ordens', perm: 'sub_subprodutos_ordens' },
            { id: 'estoque', perm: 'sub_subprodutos_estoque' },
            { id: 'historico', perm: 'sub_subprodutos_historico' }
        ];

        const currentTabConfig = tabList.find(t => t.id === tab);
        if (currentTabConfig && !hasAccess(currentTabConfig.perm)) {
            const firstPermitted = tabList.find(t => hasAccess(t.perm));
            if (firstPermitted) {
                setKey('subprodutosActiveTab', firstPermitted.id);
            }
        }
    }, [state.subprodutosActiveTab, state.currentUser]);

    // Data
    const [allProducts, setAllProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const subProducts = useMemo(() => allProducts.filter(p => p.type === 'subproduto'), [allProducts]);
    const insumos     = useMemo(() => allProducts.filter(p => p.type !== 'subproduto'), [allProducts]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prods, ords] = await Promise.all([
                DbService.getProducts(),
                DbService.getProductionOrders()
            ]);
            setAllProducts(prods);
            setOrders(ords);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const currentUser = state.currentUser || { name: 'Sistema' };

    // ── NAV ITEMS ─────────────────────────────
    const navItems = [
        { id: 'dashboard', label: 'Dashboard',     icon: PieChart, perm: 'sub_subprodutos_painel' },
        { id: 'cadastro',  label: 'Cadastro',       icon: BookOpen, perm: 'sub_subprodutos_fichas' },
        { id: 'ordens',    label: 'Ordens',         icon: ClipboardList, perm: 'sub_subprodutos_ordens' },
        { id: 'estoque',   label: 'Estoque Atual',  icon: Archive, perm: 'sub_subprodutos_estoque' },
        { id: 'historico', label: 'Histórico',      icon: Clock, perm: 'sub_subprodutos_historico' },
    ];

    return (
        <div className="screen active with-header" style={{
            display: 'flex', flexDirection: 'row',
            background: '#090d16', color: '#f3f4f6',
            height: '100%', overflowY: 'hidden', padding: 0
        }}>
            {/* ── CSS ── */}
            <style dangerouslySetInnerHTML={{__html: `
                .sub-sidebar {
                    width: 260px;
                    background: rgba(15,23,42,0.6);
                    border-right: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem 1rem;
                    box-sizing: border-box;
                    backdrop-filter: blur(10px);
                    flex-shrink: 0;
                }
                .sub-sidebar-btn {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.8rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.88rem;
                    font-weight: 600;
                    text-align: left;
                    margin-bottom: 0.4rem;
                    transition: all 0.2s;
                }
                .sub-sidebar-btn:hover {
                    background: rgba(255,255,255,0.03);
                    color: #fff;
                }
                .sub-sidebar-btn.active {
                    background: rgba(249,115,22,0.12);
                    color: #f97316;
                }
                .sub-main-container {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                .sub-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 2rem;
                }
                .sub-kpi-card {
                    background: rgba(30,41,59,0.25);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                }
                .sub-kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: #f97316;
                }
                .sub-kpi-card.green::before  { background: #34d399; }
                .sub-kpi-card.blue::before   { background: #60a5fa; }
                .sub-kpi-card.yellow::before { background: #f59e0b; }
                .sub-kpi-card.red::before    { background: #f87171; }
                .sub-kpi-card h6 { margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .sub-kpi-card h3 { margin: 0.4rem 0 0 0; font-size: 1.8rem; font-weight: 800; color: #fff; }

                .sub-panel-card {
                    background: rgba(30,41,59,0.15);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .sub-panel-card h4 {
                    margin: 0;
                    color: #f97316;
                    font-size: 1rem;
                    font-weight: 700;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 0.5rem;
                }
                .sub-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.88rem;
                }
                .sub-table th {
                    background: rgba(15,23,42,0.4);
                    color: #94a3b8;
                    font-weight: 600;
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .sub-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    color: #f3f4f6;
                }
                .sub-table tr:hover td { background: rgba(255,255,255,0.02); }
                @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
            `}} />

            {/* ── SIDEBAR ── */}
            <aside className="sub-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
                    <FlaskConical size={24} style={{ color: '#f97316' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', letterSpacing: '0.5px' }}>SUB-PRODUTOS</span>
                </div>

                <div style={{ flex: 1 }}>
                    {navItems.filter(item => hasAccess(item.perm)).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`sub-sidebar-btn ${activeTab === id ? 'active' : ''}`}
                            onClick={() => setActiveTab(id)}
                        >
                            <Icon size={18} /> {label}
                        </button>
                    ))}
                </div>

                {/* Refresh */}
                <button onClick={loadData} className="sub-sidebar-btn" style={{ marginTop: 'auto' }}>
                    <RefreshCw size={16} /> Atualizar dados
                </button>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="sub-main-container">
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #f97316', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ color: '#94a3b8' }}>Carregando dados...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && <DashboardTab subProducts={subProducts} orders={orders} setActiveTab={setActiveTab} />}
                        {activeTab === 'cadastro'  && <CadastroTab  subProducts={subProducts} insumos={insumos} onRefresh={loadData} currentUser={currentUser} />}
                        {activeTab === 'ordens'    && <OrdensTab    subProducts={subProducts} insumos={insumos} allProducts={allProducts} orders={orders.filter(o => o.status !== 'Concluído' && o.status !== 'Cancelado')} onRefresh={loadData} currentUser={currentUser} />}
                        {activeTab === 'estoque'   && <EstoqueTab   subProducts={subProducts} setActiveTab={setActiveTab} />}
                        {activeTab === 'historico' && <HistoricoTab orders={orders} subProducts={subProducts} />}
                    </>
                )}
            </main>
        </div>
    );
}

// =============================================
// ABA: DASHBOARD
// =============================================
function DashboardTab({ subProducts, orders, setActiveTab }) {
    const totalSubs  = subProducts.length;
    const criticos   = subProducts.filter(p => p.stock < p.minStock).length;
    const abertas    = orders.filter(o => o.status === 'Planejado' || o.status === 'Em Andamento').length;
    const concluidas = orders.filter(o => o.status === 'Concluído').length;
    const insumos    = [];

    const kpis = [
        { label: 'Sub-Produtos',    value: totalSubs,  cls: '',       color: '#f97316' },
        { label: 'Estoque Crítico', value: criticos,   cls: 'yellow', color: '#f59e0b' },
        { label: 'Ordens Abertas',  value: abertas,    cls: 'blue',   color: '#60a5fa' },
        { label: 'Concluídas',      value: concluidas, cls: 'green',  color: '#34d399' },
    ];

    const recentOrders = orders.slice(0, 6);

    return (
        <>
            <div className="sub-kpi-grid">
                {kpis.map(k => (
                    <div key={k.label} className={`sub-kpi-card ${k.cls}`}>
                        <h6>{k.label}</h6>
                        <h3 style={{ color: k.color }}>{k.value}</h3>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Estoque */}
                <div className="sub-panel-card">
                    <h4>📦 Estoque de Sub-Produtos</h4>
                    {subProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Nenhum sub-produto cadastrado.<br />
                            <button onClick={() => setActiveTab('cadastro')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' }}>Cadastrar agora</button>
                        </div>
                    ) : subProducts.map(p => {
                        const pct = p.maxStock > 0 ? Math.min(100, (p.stock / p.maxStock) * 100) : 0;
                        const st = stockStatus(p.stock, p.minStock);
                        return (
                            <div key={p.sku}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: '0.82rem', color: '#f3f4f6', fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: st.color, fontWeight: 700 }}>{p.stock} {p.unit}</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: st.color, transition: 'width 0.4s' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Últimas ordens */}
                <div className="sub-panel-card">
                    <h4>🗂 Últimas Ordens</h4>
                    {recentOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Nenhuma ordem criada.<br />
                            <button onClick={() => setActiveTab('ordens')} style={{ marginTop: 8, background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' }}>Criar ordem</button>
                        </div>
                    ) : recentOrders.map(o => {
                        const st = ORDER_STATUS[o.status] || ORDER_STATUS.Planejado;
                        const Icon = st.icon;
                        return (
                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Icon size={15} color={st.color} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.subProductName || o.subProductSku}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{o.qtyBatches} lote(s) · {fmtDate(o.startDate)}</div>
                                </div>
                                <span style={{ fontSize: '0.68rem', color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6, fontWeight: 700, whiteSpace: 'nowrap' }}>{o.status}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Alertas críticos */}
            {criticos > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                        <AlertTriangle size={15} color="#f59e0b" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>{criticos} sub-produto(s) com estoque crítico</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {subProducts.filter(p => p.stock < p.minStock).map(p => (
                            <span key={p.sku} style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                                {p.name} ({p.stock} {p.unit})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// =============================================
// ABA: CADASTRO
// =============================================
function CadastroTab({ subProducts, insumos, onRefresh }) {
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(null);
    const [editSku, setEditSku] = useState(null);
    const [saving, setSaving] = useState(false);
    const [ingSearch, setIngSearch] = useState('');
    const [newIng, setNewIng] = useState({ ingredientSku: '', quantity: '', unit: 'G' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const filtered = subProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => {
        const count = subProducts.length + 1;
        setEditSku(null);
        setForm({ ...EMPTY_SUB, sku: `SUB-${String(count).padStart(3, '0')}` });
        setIngSearch(''); setNewIng({ ingredientSku: '', quantity: '', unit: 'G' });
    };
    const openEdit = (p) => {
        setEditSku(p.sku);
        setForm({ ...p, recipe: [...(p.recipe || [])] });
        setIngSearch(''); setNewIng({ ingredientSku: '', quantity: '', unit: 'G' });
    };
    const closeForm = () => { setForm(null); setEditSku(null); };

    const addIngredient = () => {
        if (!newIng.ingredientSku || !newIng.quantity) return;
        if ((form.recipe || []).find(r => r.ingredientSku === newIng.ingredientSku)) return;
        setForm(prev => ({ ...prev, recipe: [...(prev.recipe || []), { ...newIng, quantity: parseFloat(newIng.quantity) }] }));
        setNewIng({ ingredientSku: '', quantity: '', unit: 'G' }); setIngSearch('');
    };
    const removeIngredient = (sku) => setForm(prev => ({ ...prev, recipe: prev.recipe.filter(r => r.ingredientSku !== sku) }));

    const handleSave = async () => {
        if (!form.name || !form.sku) return;
        setSaving(true);
        try {
            await DbService.saveProduct({ ...form, type: 'subproduto', controlaProducao: true }, editSku || undefined);
            await onRefresh(); closeForm();
        } finally { setSaving(false); }
    };

    const handleDelete = async (sku) => {
        await DbService.deleteProduct(sku);
        setDeleteConfirm(null); await onRefresh();
    };

    const ingOptions = insumos.filter(i =>
        (i.name.toLowerCase().includes(ingSearch.toLowerCase()) || i.sku.toLowerCase().includes(ingSearch.toLowerCase())) &&
        !(form?.recipe || []).find(r => r.ingredientSku === i.sku) && i.sku !== form?.sku
    ).slice(0, 8);

    return (
        <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input placeholder="Buscar sub-produto..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 34, height: 38, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 1.25rem', height: 38, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Plus size={16} /> Novo Sub-Produto
                </button>
            </div>

            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <FlaskConical size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
                    <p style={{ margin: 0 }}>Nenhum sub-produto encontrado.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
                    {filtered.map(p => {
                        const st = stockStatus(p.stock, p.minStock);
                        return (
                            <div key={p.sku} style={{ background: 'rgba(30,41,59,0.25)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                                            <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700, background: 'rgba(249,115,22,0.12)', padding: '1px 8px', borderRadius: 5 }}>{p.sku}</span>
                                            <span style={{ fontSize: '0.7rem', color: st.color, background: st.bg, padding: '1px 8px', borderRadius: 5, fontWeight: 700 }}>{st.label}</span>
                                        </div>
                                        <h4 style={{ margin: '0 0 3px', fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6' }}>{p.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>{p.desc || '—'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => openEdit(p)} style={{ background: 'rgba(249,115,22,0.1)', border: 'none', borderRadius: 7, padding: '0.4rem', color: '#f97316', cursor: 'pointer' }}><Edit3 size={14} /></button>
                                        <button onClick={() => setDeleteConfirm(p.sku)} style={{ background: 'rgba(248,113,113,0.1)', border: 'none', borderRadius: 7, padding: '0.4rem', color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                    {[
                                        ['Estoque', `${p.stock} ${p.unit}`],
                                        ['Mínimo', `${p.minStock} ${p.unit}`],
                                        ['Rendimento/Lote', `${p.yieldPerBatch ?? 1} ${p.unit}`],
                                        ['Ingredientes', `${(p.recipe||[]).length}`],
                                    ].map(([l, v]) => (
                                        <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '0.4rem 0.75rem' }}>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{l}</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                {(p.recipe||[]).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {p.recipe.map(r => {
                                            const ing = insumos.find(i => i.sku === r.ingredientSku);
                                            return <span key={r.ingredientSku} style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 5 }}>{ing?.name || r.ingredientSku} · {r.quantity}{r.unit}</span>;
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {form && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', padding: '2rem', boxShadow: '0 25px 80px rgba(0,0,0,0.7)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>{editSku ? 'Editar Sub-Produto' : 'Novo Sub-Produto'}</h3>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            {[
                                { label: 'SKU *', field: 'sku', disabled: !!editSku },
                                { label: 'Nome *', field: 'name' },
                                { label: 'Categoria', field: 'category', span: true },
                                { label: 'Unidade', field: 'unit', type: 'select', options: UNITS },
                                { label: 'Estoque Atual', field: 'stock', type: 'number' },
                                { label: 'Estoque Mínimo', field: 'minStock', type: 'number' },
                                { label: 'Estoque Máximo', field: 'maxStock', type: 'number' },
                                { label: 'Rendimento por Lote', field: 'yieldPerBatch', type: 'number' },
                                { label: 'Tempo de Produção (min)', field: 'productionTime', type: 'number' },
                            ].map(f => (
                                <div key={f.field} style={f.span ? { gridColumn: 'span 2' } : {}}>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 5 }}>{f.label}</label>
                                    {f.type === 'select' ? (
                                        <select value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none' }}>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input type={f.type || 'text'} disabled={f.disabled} value={form[f.field] ?? ''}
                                            onChange={e => setForm(p => ({ ...p, [f.field]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: f.disabled ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', opacity: f.disabled ? 0.6 : 1 }}
                                        />
                                    )}
                                </div>
                            ))}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 5 }}>Descrição</label>
                                <textarea value={form.desc || ''} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={2}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>
                        </div>

                        {/* Ficha Técnica */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Layers size={15} /> Ficha Técnica
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>— para produzir {form.yieldPerBatch || 1} {form.unit}</span>
                            </h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input placeholder="Buscar insumo..." value={ingSearch}
                                        onChange={e => { setIngSearch(e.target.value); setNewIng(p => ({ ...p, ingredientSku: '' })); }}
                                        style={{ width: '100%', paddingLeft: 30, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                                    {ingSearch && ingOptions.length > 0 && !newIng.ingredientSku && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 200, overflow: 'auto' }}>
                                            {ingOptions.map(i => (
                                                <div key={i.sku} onClick={() => { setNewIng(p => ({ ...p, ingredientSku: i.sku })); setIngSearch(i.name); }}
                                                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.82rem', color: '#f3f4f6', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <strong>{i.name}</strong> <span style={{ color: '#94a3b8' }}>({i.sku}) — {i.stock} {i.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input type="number" placeholder="Qtde" value={newIng.quantity} onChange={e => setNewIng(p => ({ ...p, quantity: e.target.value }))}
                                    style={{ width: 80, padding: '0 0.5rem', height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.82rem', outline: 'none' }} />
                                <select value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}
                                    style={{ width: 70, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.82rem', outline: 'none' }}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <button onClick={addIngredient} disabled={!newIng.ingredientSku || !newIng.quantity}
                                    style={{ height: 36, padding: '0 0.75rem', borderRadius: 8, border: 'none', background: newIng.ingredientSku && newIng.quantity ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(255,255,255,0.06)', color: '#fff', cursor: newIng.ingredientSku && newIng.quantity ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                                    <Plus size={14} />
                                </button>
                            </div>
                            {(form.recipe || []).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.06)' }}>
                                    Nenhum ingrediente adicionado.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {form.recipe.map(r => {
                                        const ing = insumos.find(i => i.sku === r.ingredientSku);
                                        const ok = (ing?.stock || 0) >= r.quantity;
                                        return (
                                            <div key={r.ingredientSku} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${ok ? 'rgba(255,255,255,0.05)' : 'rgba(248,113,113,0.25)'}` }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f3f4f6' }}>{ing?.name || r.ingredientSku}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 8 }}>{r.quantity} {r.unit}</span>
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: ok ? '#34d399' : '#f87171' }}>{ok ? `✓ ${ing?.stock} disp.` : `⚠ ${ing?.stock || 0} disp.`}</span>
                                                <button onClick={() => removeIngredient(r.ingredientSku)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}><X size={14} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeForm} style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleSave} disabled={saving || !form.name || !form.sku}
                                style={{ padding: '0.6rem 1.75rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || !form.name || !form.sku ? 0.5 : 1 }}>
                                {saving ? 'Salvando...' : 'Salvar Sub-Produto'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {deleteConfirm && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem', maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                        <AlertTriangle size={40} color="#f87171" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem', color: '#f3f4f6' }}>Excluir Sub-Produto</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>Esta ação é irreversível.</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Excluir</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// =============================================
// ABA: ORDENS DE PRODUÇÃO
// =============================================
function OrdensTab({ subProducts, insumos, allProducts, orders, onRefresh, currentUser }) {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [executing, setExecuting] = useState(null);

    const openNew = () => setForm({ ...EMPTY_ORDER, responsible: currentUser?.name || '' });
    const closeForm = () => setForm(null);

    const selectedSub    = form ? subProducts.find(p => p.sku === form.subProductSku) : null;
    const recipe         = selectedSub?.recipe || [];
    const yieldPerBatch  = selectedSub?.yieldPerBatch || 1;
    const batchesQty     = parseFloat(form?.qtyBatches) || 1;

    const ingredients = recipe.map(r => {
        const ing    = insumos.find(i => i.sku === r.ingredientSku);
        const needed = r.quantity * batchesQty;
        const avail  = ing?.stock || 0;
        return { ...r, ingName: ing?.name || r.ingredientSku, needed, available: avail, ok: avail >= needed };
    });
    const canProduce   = ingredients.every(i => i.ok) && ingredients.length > 0;
    const totalProduced = batchesQty * yieldPerBatch;

    const handleSave = async () => {
        if (!form.subProductSku) return;
        setSaving(true);
        try {
            await DbService.saveProductionOrder({ ...form, subProductName: selectedSub?.name || form.subProductSku, totalProduced, createdAt: new Date().toISOString(), createdBy: currentUser?.name || 'Sistema', ingredientsSnapshot: ingredients });
            await onRefresh(); closeForm();
        } finally { setSaving(false); }
    };

    const handleStatusChange = async (order, newStatus) => {
        if (newStatus === 'Concluído') {
            setExecuting(order.id);
            try {
                const result = await DbService.executeProductionOrder(order, allProducts);
                if (result.success) {
                    await DbService.saveProductionOrder({ ...order, status: 'Concluído', endDate: new Date().toISOString().split('T')[0] });
                    await onRefresh();
                }
            } finally { setExecuting(null); }
        } else {
            await DbService.saveProductionOrder({ ...order, status: newStatus });
            await onRefresh();
        }
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 1.25rem', height: 38, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Plus size={16} /> Nova Ordem
                </button>
            </div>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <ClipboardList size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
                    <p style={{ margin: 0 }}>Nenhuma ordem de produção ativa.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {orders.map(o => {
                        const st   = ORDER_STATUS[o.status] || ORDER_STATUS.Planejado;
                        const Icon = st.icon;
                        const isExec = executing === o.id;
                        return (
                            <div key={o.id} style={{ background: 'rgba(30,41,59,0.25)', borderRadius: 12, border: `1px solid ${st.color}22`, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={20} color={st.color} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f3f4f6' }}>{o.subProductName || o.subProductSku}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '1rem', marginTop: 4, flexWrap: 'wrap' }}>
                                            <span>🗓 {fmtDate(o.startDate)}</span>
                                            <span>📦 {o.qtyBatches} lote(s) → {o.totalProduced} {subProducts.find(p=>p.sku===o.subProductSku)?.unit||'UN'}</span>
                                            {o.responsible && <span>👤 {o.responsible}</span>}
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: st.color, background: st.bg }}>{o.status}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {o.status === 'Planejado' && (
                                            <button onClick={() => handleStatusChange(o, 'Em Andamento')}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <PlayCircle size={13} /> Iniciar
                                            </button>
                                        )}
                                        {o.status === 'Em Andamento' && (
                                            <button onClick={() => handleStatusChange(o, 'Concluído')} disabled={isExec}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', background: 'rgba(52,211,153,0.15)', color: '#34d399', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, opacity: isExec ? 0.6 : 1 }}>
                                                <CheckCircle size={13} /> {isExec ? 'Processando...' : 'Finalizar'}
                                            </button>
                                        )}
                                        {(o.status === 'Planejado' || o.status === 'Em Andamento') && (
                                            <button onClick={() => handleStatusChange(o, 'Cancelado')}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <XCircle size={13} /> Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {o.notes && <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 7, fontSize: '0.78rem', color: '#94a3b8' }}>📝 {o.notes}</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {form && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: '2rem', boxShadow: '0 25px 80px rgba(0,0,0,0.7)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 700, color: '#f3f4f6' }}>Nova Ordem de Produção</h3>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 5 }}>Sub-Produto *</label>
                                <select value={form.subProductSku} onChange={e => setForm(p => ({ ...p, subProductSku: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none' }}>
                                    <option value="">Selecione...</option>
                                    {subProducts.filter(p => p.status !== 'Inativo').map(p => (
                                        <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            {[
                                { label: 'Qtde de Lotes *', field: 'qtyBatches', type: 'number' },
                                { label: 'Data Prevista', field: 'startDate', type: 'date' },
                                { label: 'Responsável', field: 'responsible', span: true },
                                { label: 'Observações', field: 'notes', span: true, area: true },
                            ].map(f => (
                                <div key={f.field} style={f.span ? { gridColumn: 'span 2' } : {}}>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 5 }}>{f.label}</label>
                                    {f.area ? (
                                        <textarea value={form[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))} rows={2}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                    ) : (
                                        <input type={f.type || 'text'} value={form[f.field]} min={f.type === 'number' ? 1 : undefined}
                                            onChange={e => setForm(p => ({ ...p, [f.field]: f.type === 'number' ? parseFloat(e.target.value) || 1 : e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', color: '#f3f4f6', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {selectedSub && (
                            <div style={{ background: canProduce ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${canProduce ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: canProduce ? '#34d399' : '#f87171', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={15} /> {canProduce ? `✓ Viável — gerará ${totalProduced} ${selectedSub.unit}` : '⚠ Estoque insuficiente'}
                                </div>
                                {ingredients.map(i => (
                                    <div key={i.ingredientSku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', borderRadius: 6, background: i.ok ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', marginBottom: 4 }}>
                                        <span style={{ color: '#f3f4f6' }}>{i.ingName}</span>
                                        <span style={{ color: i.ok ? '#34d399' : '#f87171', fontWeight: 600 }}>Necessário: {i.needed}{i.unit} / Disponível: {i.available}{i.unit}</span>
                                    </div>
                                ))}
                                {ingredients.length === 0 && <div style={{ fontSize: '0.8rem', color: '#f59e0b', textAlign: 'center' }}>⚠ Este sub-produto não tem ficha técnica cadastrada.</div>}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeForm} style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleSave} disabled={saving || !form.subProductSku}
                                style={{ padding: '0.6rem 1.75rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || !form.subProductSku ? 0.5 : 1 }}>
                                {saving ? 'Salvando...' : 'Criar Ordem'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// =============================================
// ABA: ESTOQUE ATUAL
// =============================================
function EstoqueTab({ subProducts, setActiveTab }) {
    return (
        <>
            {subProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <Archive size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
                    <p>Nenhum sub-produto cadastrado.</p>
                </div>
            ) : (
                <div style={{ background: 'rgba(30,41,59,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <table className="sub-table">
                        <thead>
                            <tr>
                                {['Sub-Produto', 'SKU', 'Unidade', 'Estoque', 'Mínimo', 'Máximo', 'Status', 'Ação'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...subProducts].sort((a, b) => (a.stock - a.minStock) - (b.stock - b.minStock)).map(p => {
                                const st  = stockStatus(p.stock, p.minStock);
                                const pct = p.maxStock > 0 ? Math.min(100, (p.stock / p.maxStock) * 100) : 0;
                                return (
                                    <tr key={p.sku}>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td><span style={{ fontSize: '0.72rem', color: '#f97316', background: 'rgba(249,115,22,0.12)', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>{p.sku}</span></td>
                                        <td style={{ color: '#94a3b8' }}>{p.unit}</td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: st.color, marginBottom: 4 }}>{p.stock}</div>
                                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', width: 80 }}>
                                                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: st.color }} />
                                            </div>
                                        </td>
                                        <td style={{ color: '#94a3b8' }}>{p.minStock}</td>
                                        <td style={{ color: '#94a3b8' }}>{p.maxStock}</td>
                                        <td><span style={{ fontSize: '0.72rem', color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{st.label}</span></td>
                                        <td>
                                            {p.stock < p.minStock && (
                                                <button onClick={() => setActiveTab('ordens')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.35rem 0.75rem', borderRadius: 7, border: 'none', background: 'rgba(249,115,22,0.15)', color: '#f97316', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    <Zap size={12} /> Produzir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

// =============================================
// ABA: HISTÓRICO
// =============================================
function HistoricoTab({ orders, subProducts }) {
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const concluded = orders.filter(o =>
        (o.status === 'Concluído' || o.status === 'Cancelado') &&
        (!statusFilter || o.status === statusFilter) &&
        (!search || (o.subProductName || o.subProductSku || '').toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input placeholder="Filtrar por sub-produto..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 32, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)', color: '#f3f4f6', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ height: 36, padding: '0 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.4)', color: '#f3f4f6', fontSize: '0.82rem', outline: 'none' }}>
                    <option value="">Todos</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
            </div>

            {concluded.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <Clock size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
                    <p>Nenhum histórico encontrado.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {concluded.map(o => {
                        const st   = ORDER_STATUS[o.status] || ORDER_STATUS.Concluído;
                        const Icon = st.icon;
                        const sub  = subProducts.find(p => p.sku === o.subProductSku);
                        return (
                            <div key={o.id} style={{ background: 'rgba(30,41,59,0.25)', borderRadius: 12, border: `1px solid ${st.color}18`, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Icon size={18} color={st.color} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>{o.subProductName || o.subProductSku}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '1rem', marginTop: 3, flexWrap: 'wrap' }}>
                                            <span>📅 {fmtDate(o.startDate)}</span>
                                            {o.status === 'Concluído' && <span>✅ {o.totalProduced} {sub?.unit || 'UN'} produzidos</span>}
                                            {o.responsible && <span>👤 {o.responsible}</span>}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{o.status}</span>
                                </div>
                                {o.status === 'Concluído' && o.ingredientsSnapshot?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Consumido:</span>
                                        {o.ingredientsSnapshot.map(i => (
                                            <span key={i.ingredientSku} style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 5 }}>
                                                {i.ingName}: {i.needed}{i.unit}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
