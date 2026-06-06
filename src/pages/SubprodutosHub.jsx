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
    FlaskConical, Plus, Search, Edit3, Trash2, X, Check, ChevronRight,
    AlertTriangle, Package, TrendingUp, Clock, PlayCircle, CheckCircle,
    XCircle, PauseCircle, ChevronDown, ChevronUp, Info, Layers,
    BarChart2, Calendar, User, ArrowRight, Archive, RefreshCw,
    AlertCircle, BookOpen, Zap, ClipboardList
} from 'lucide-react';

// =============================================
// CONSTANTES
// =============================================
const UNITS = ['UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX', 'BDJ', 'DZ', 'FD'];
const ORDER_STATUS = {
    Planejado:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: Clock },
    'Em Andamento': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: PlayCircle },
    Concluído:   { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  icon: CheckCircle },
    Cancelado:   { color: '#f87171', bg: 'rgba(248,113,113,0.15)', icon: XCircle },
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
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
}

// =============================================
// COMPONENT PRINCIPAL
// =============================================
export default function SubprodutosHub() {
    const [state, setKey] = useCorelluxState(['subprodutosActiveTab', 'products', 'currentUser']);
    const activeTab = state.subprodutosActiveTab || 'dashboard';

    // Data
    const [allProducts, setAllProducts] = useState(state.products || []);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sub-produtos = products with type === 'subproduto'
    const subProducts = useMemo(() => allProducts.filter(p => p.type === 'subproduto'), [allProducts]);
    // Insumos = all products that are NOT subprodutos
    const insumos = useMemo(() => allProducts.filter(p => p.type !== 'subproduto'), [allProducts]);

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

    const setTab = (t) => setKey('subprodutosActiveTab', t);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard',   icon: BarChart2 },
        { id: 'cadastro',  label: 'Cadastro',     icon: BookOpen },
        { id: 'ordens',    label: 'Ordens',       icon: ClipboardList },
        { id: 'estoque',   label: 'Estoque',      icon: Archive },
        { id: 'historico', label: 'Histórico',    icon: Clock },
    ];

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* ── HEADER ── */}
            <div style={{
                padding: '1rem 1.5rem 0',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0,
                background: 'var(--bg-card)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FlaskConical size={20} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            SUB-PRODUTOS
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Fichas técnicas · Ordens de produção · Estoque de semi-acabados
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                    >
                        <RefreshCw size={14} /> Atualizar
                    </button>
                </div>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '0.6rem 1rem', border: 'none', cursor: 'pointer',
                                borderRadius: '8px 8px 0 0',
                                fontWeight: active ? 700 : 500,
                                fontSize: '0.82rem',
                                background: active ? 'var(--bg-main)' : 'transparent',
                                color: active ? '#f97316' : 'var(--text-secondary)',
                                borderBottom: active ? '2px solid #f97316' : '2px solid transparent',
                                transition: 'all 0.18s'
                            }}>
                                <Icon size={14} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-main)' }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                        <div className="loader" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #f97316', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Carregando dados...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && <DashboardTab subProducts={subProducts} orders={orders} onGotoOrdens={() => setTab('ordens')} onGotoCadastro={() => setTab('cadastro')} />}
                        {activeTab === 'cadastro'  && <CadastroTab  subProducts={subProducts} insumos={insumos} onRefresh={loadData} currentUser={state.currentUser} />}
                        {activeTab === 'ordens'    && <OrdensTab    subProducts={subProducts} insumos={insumos} allProducts={allProducts} orders={orders.filter(o => o.status !== 'Concluído' && o.status !== 'Cancelado')} onRefresh={loadData} currentUser={state.currentUser} />}
                        {activeTab === 'estoque'   && <EstoqueTab   subProducts={subProducts} onGotoOrdens={() => setTab('ordens')} />}
                        {activeTab === 'historico' && <HistoricoTab orders={orders} subProducts={subProducts} />}
                    </>
                )}
            </div>
        </div>
    );
}

// =============================================
// ABA: DASHBOARD
// =============================================
function DashboardTab({ subProducts, orders, onGotoOrdens, onGotoCadastro }) {
    const totalSubs   = subProducts.length;
    const criticos    = subProducts.filter(p => p.stock < p.minStock).length;
    const abertas     = orders.filter(o => o.status === 'Planejado' || o.status === 'Em Andamento').length;
    const concluidas  = orders.filter(o => o.status === 'Concluído').length;

    const recentOrders = orders.slice(0, 5);

    const kpis = [
        { label: 'Sub-Produtos Cadastrados', value: totalSubs, icon: FlaskConical, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
        { label: 'Estoque Crítico',          value: criticos,  icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Ordens Abertas',           value: abertas,   icon: ClipboardList, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
        { label: 'Ordens Concluídas',        value: concluidas,icon: CheckCircle,   color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    ];

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {kpis.map(k => {
                    const Icon = k.icon;
                    return (
                        <div key={k.label} style={{
                            background: 'var(--bg-card)', borderRadius: 12,
                            border: '1px solid var(--border-color)', padding: '1.25rem',
                            display: 'flex', alignItems: 'center', gap: '1rem'
                        }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={20} color={k.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{k.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Estoque dos sub-produtos */}
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={15} color="#f97316" /> Estoque de Sub-Produtos
                    </h3>
                    {subProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <FlaskConical size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                            Nenhum sub-produto cadastrado.<br />
                            <button onClick={onGotoCadastro} style={{ marginTop: 8, background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' }}>Cadastrar agora</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {subProducts.slice(0, 6).map(p => {
                                const pct = p.maxStock > 0 ? Math.min(100, (p.stock / p.maxStock) * 100) : 0;
                                const st = stockStatus(p.stock, p.minStock);
                                return (
                                    <div key={p.sku}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: st.color, background: st.bg, padding: '1px 8px', borderRadius: 6, fontWeight: 700 }}>{p.stock} {p.unit}</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                                            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: st.color, transition: 'width 0.4s' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Últimas ordens */}
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClipboardList size={15} color="#f97316" /> Últimas Ordens
                    </h3>
                    {recentOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <ClipboardList size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                            Nenhuma ordem criada.<br />
                            <button onClick={onGotoOrdens} style={{ marginTop: 8, background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' }}>Criar ordem</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {recentOrders.map(o => {
                                const st = ORDER_STATUS[o.status] || ORDER_STATUS.Planejado;
                                const Icon = st.icon;
                                return (
                                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                                        <Icon size={16} color={st.color} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{o.subProductName || o.subProductSku}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{o.qtyBatches} lote(s) · {fmtDate(o.startDate)}</div>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{o.status}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Alertas */}
            {criticos > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                        <AlertTriangle size={16} color="#f59e0b" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>Atenção — {criticos} sub-produto(s) com estoque crítico</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {subProducts.filter(p => p.stock < p.minStock).map(p => (
                            <span key={p.sku} style={{ fontSize: '0.78rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
                                {p.name} ({p.stock} {p.unit})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// ABA: CADASTRO
// =============================================
function CadastroTab({ subProducts, insumos, onRefresh, currentUser }) {
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
        setIngSearch('');
        setNewIng({ ingredientSku: '', quantity: '', unit: 'G' });
    };

    const openEdit = (p) => {
        setEditSku(p.sku);
        setForm({ ...p, recipe: [...(p.recipe || [])] });
        setIngSearch('');
        setNewIng({ ingredientSku: '', quantity: '', unit: 'G' });
    };

    const closeForm = () => { setForm(null); setEditSku(null); };

    const addIngredient = () => {
        if (!newIng.ingredientSku || !newIng.quantity) return;
        if ((form.recipe || []).find(r => r.ingredientSku === newIng.ingredientSku)) return;
        setForm(prev => ({ ...prev, recipe: [...(prev.recipe || []), { ...newIng, quantity: parseFloat(newIng.quantity) }] }));
        setNewIng({ ingredientSku: '', quantity: '', unit: 'G' });
        setIngSearch('');
    };

    const removeIngredient = (sku) => {
        setForm(prev => ({ ...prev, recipe: prev.recipe.filter(r => r.ingredientSku !== sku) }));
    };

    const handleSave = async () => {
        if (!form.name || !form.sku) return;
        setSaving(true);
        try {
            await DbService.saveProduct({ ...form, type: 'subproduto', controlaProducao: true }, editSku || undefined);
            await onRefresh();
            closeForm();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (sku) => {
        await DbService.deleteProduct(sku);
        setDeleteConfirm(null);
        await onRefresh();
    };

    const ingOptions = insumos.filter(i =>
        (i.name.toLowerCase().includes(ingSearch.toLowerCase()) || i.sku.toLowerCase().includes(ingSearch.toLowerCase())) &&
        !(form?.recipe || []).find(r => r.ingredientSku === i.sku) &&
        i.sku !== form?.sku
    ).slice(0, 8);

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        placeholder="Buscar sub-produto..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 38, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>
                <button onClick={openNew} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0 1.25rem', height: 38,
                    background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                }}>
                    <Plus size={16} /> Novo Sub-Produto
                </button>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <FlaskConical size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                    <p style={{ margin: 0 }}>Nenhum sub-produto encontrado.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filtered.map(p => {
                        const st = stockStatus(p.stock, p.minStock);
                        return (
                            <div key={p.sku} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700, background: 'rgba(249,115,22,0.12)', padding: '1px 8px', borderRadius: 5 }}>{p.sku}</span>
                                            <span style={{ fontSize: '0.7rem', color: st.color, background: st.bg, padding: '1px 8px', borderRadius: 5, fontWeight: 700 }}>{st.label}</span>
                                        </div>
                                        <h4 style={{ margin: '6px 0 2px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{p.desc || '—'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => openEdit(p)} style={{ background: 'rgba(249,115,22,0.1)', border: 'none', borderRadius: 7, padding: '0.4rem', color: '#f97316', cursor: 'pointer' }}><Edit3 size={14} /></button>
                                        <button onClick={() => setDeleteConfirm(p.sku)} style={{ background: 'rgba(248,113,113,0.1)', border: 'none', borderRadius: 7, padding: '0.4rem', color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {[
                                        { label: 'Estoque', val: `${p.stock} ${p.unit}` },
                                        { label: 'Mínimo', val: `${p.minStock} ${p.unit}` },
                                        { label: 'Rendimento/Lote', val: `${p.yieldPerBatch ?? 1} ${p.unit}` },
                                        { label: 'Ingredientes', val: `${(p.recipe || []).length}` },
                                    ].map(it => (
                                        <div key={it.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '0.4rem 0.75rem' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{it.label}</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{it.val}</div>
                                        </div>
                                    ))}
                                </div>
                                {(p.recipe || []).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                        {p.recipe.map(r => {
                                            const ing = insumos.find(i => i.sku === r.ingredientSku);
                                            return (
                                                <span key={r.ingredientSku} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 5 }}>
                                                    {ing?.name || r.ingredientSku} · {r.quantity}{r.unit}
                                                </span>
                                            );
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', padding: '2rem', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{editSku ? 'Editar Sub-Produto' : 'Novo Sub-Produto'}</h3>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            {[
                                { label: 'SKU *', field: 'sku', disabled: !!editSku },
                                { label: 'Nome *', field: 'name' },
                                { label: 'Unidade', field: 'unit', type: 'select', options: UNITS },
                                { label: 'Categoria', field: 'category' },
                                { label: 'Estoque Atual', field: 'stock', type: 'number' },
                                { label: 'Estoque Mínimo', field: 'minStock', type: 'number' },
                                { label: 'Estoque Máximo', field: 'maxStock', type: 'number' },
                                { label: 'Rendimento por Lote (unids)', field: 'yieldPerBatch', type: 'number' },
                                { label: 'Tempo de Produção (min)', field: 'productionTime', type: 'number' },
                            ].map(f => (
                                <div key={f.field} style={f.field === 'name' || f.field === 'category' ? { gridColumn: 'span 2' } : {}}>
                                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>{f.label}</label>
                                    {f.type === 'select' ? (
                                        <select value={form[f.field] || ''} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : (
                                        <input type={f.type || 'text'} disabled={f.disabled}
                                            value={form[f.field] ?? ''} onChange={e => setForm(p => ({ ...p, [f.field]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: f.disabled ? 'rgba(255,255,255,0.04)' : 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', opacity: f.disabled ? 0.6 : 1 }}
                                        />
                                    )}
                                </div>
                            ))}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Descrição</label>
                                <textarea value={form.desc || ''} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={2}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>
                        </div>

                        {/* Ficha Técnica / Receita */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Layers size={15} /> Ficha Técnica (Receita)
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                    — ingredientes para produzir {form.yieldPerBatch || 1} {form.unit}
                                </span>
                            </h4>

                            {/* Add ingredient */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input placeholder="Buscar insumo pelo nome ou SKU..."
                                        value={ingSearch} onChange={e => { setIngSearch(e.target.value); setNewIng(p => ({ ...p, ingredientSku: '' })); }}
                                        style={{ width: '100%', paddingLeft: 30, height: 36, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                                    {ingSearch && ingOptions.length > 0 && !newIng.ingredientSku && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 200, overflow: 'auto' }}>
                                            {ingOptions.map(i => (
                                                <div key={i.sku} onClick={() => { setNewIng(p => ({ ...p, ingredientSku: i.sku })); setIngSearch(i.name); }}
                                                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <strong>{i.name}</strong> <span style={{ color: 'var(--text-secondary)' }}>({i.sku}) — Estoque: {i.stock} {i.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input type="number" placeholder="Qtde" value={newIng.quantity}
                                    onChange={e => setNewIng(p => ({ ...p, quantity: e.target.value }))}
                                    style={{ width: 80, padding: '0 0.5rem', height: 36, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }} />
                                <select value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}
                                    style={{ width: 70, height: 36, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <button onClick={addIngredient} disabled={!newIng.ingredientSku || !newIng.quantity}
                                    style={{ height: 36, padding: '0 0.75rem', borderRadius: 8, border: 'none', background: newIng.ingredientSku && newIng.quantity ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.06)', color: '#fff', cursor: newIng.ingredientSku && newIng.quantity ? 'pointer' : 'not-allowed', fontSize: '0.82rem', fontWeight: 700 }}>
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Ingredients list */}
                            {(form.recipe || []).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--border-color)' }}>
                                    Nenhum ingrediente adicionado. Busque insumos acima.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {form.recipe.map(r => {
                                        const ing = insumos.find(i => i.sku === r.ingredientSku);
                                        const available = ing ? ing.stock : 0;
                                        const ok = available >= r.quantity;
                                        return (
                                            <div key={r.ingredientSku} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${ok ? 'var(--border-color)' : 'rgba(248,113,113,0.3)'}` }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ing?.name || r.ingredientSku}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 8 }}>{r.quantity} {r.unit}</span>
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: ok ? '#34d399' : '#f87171' }}>
                                                    {ok ? `✓ ${available} disponível` : `⚠ apenas ${available} disponível`}
                                                </span>
                                                <button onClick={() => removeIngredient(r.ingredientSku)}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeForm} style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleSave} disabled={saving || !form.name || !form.sku}
                                style={{ padding: '0.6rem 1.75rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || !form.name || !form.sku ? 0.6 : 1 }}>
                                {saving ? 'Salvando...' : 'Salvar Sub-Produto'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete confirm */}
            {deleteConfirm && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '2rem', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                        <AlertTriangle size={40} color="#f87171" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Excluir Sub-Produto</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>Esta ação é irreversível. O sub-produto e sua ficha técnica serão removidos.</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Excluir</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
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

    const selectedSub = form ? subProducts.find(p => p.sku === form.subProductSku) : null;
    const recipe = selectedSub?.recipe || [];
    const yieldPerBatch = selectedSub?.yieldPerBatch || 1;
    const batchesQty = parseFloat(form?.qtyBatches) || 1;

    const ingredients = recipe.map(r => {
        const ing = insumos.find(i => i.sku === r.ingredientSku);
        const needed = r.quantity * batchesQty;
        const available = ing?.stock || 0;
        return { ...r, ingName: ing?.name || r.ingredientSku, needed, available, ok: available >= needed };
    });
    const canProduce = ingredients.every(i => i.ok) && ingredients.length > 0;
    const totalProduced = batchesQty * yieldPerBatch;

    const handleSave = async () => {
        if (!form.subProductSku) return;
        setSaving(true);
        try {
            const order = {
                ...form,
                subProductName: selectedSub?.name || form.subProductSku,
                totalProduced,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.name || 'Sistema',
                ingredientsSnapshot: ingredients
            };
            await DbService.saveProductionOrder(order);
            await onRefresh();
            closeForm();
        } finally {
            setSaving(false);
        }
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
            } finally {
                setExecuting(null);
            }
        } else {
            await DbService.saveProductionOrder({ ...order, status: newStatus });
            await onRefresh();
        }
    };

    const handleCancel = async (order) => {
        await DbService.saveProductionOrder({ ...order, status: 'Cancelado' });
        await onRefresh();
    };

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 1.25rem', height: 38, background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Plus size={16} /> Nova Ordem
                </button>
            </div>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <ClipboardList size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                    <p style={{ margin: 0 }}>Nenhuma ordem de produção ativa.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {orders.map(o => {
                        const st = ORDER_STATUS[o.status] || ORDER_STATUS.Planejado;
                        const Icon = st.icon;
                        const isExec = executing === o.id;
                        return (
                            <div key={o.id} style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${st.color}33`, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={20} color={st.color} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{o.subProductName || o.subProductSku}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: 4 }}>
                                            <span>🗓 {fmtDate(o.startDate)}</span>
                                            <span>📦 {o.qtyBatches} lote(s) → {o.totalProduced} {subProducts.find(p=>p.sku===o.subProductSku)?.unit || 'UN'}</span>
                                            <span>👤 {o.responsible || '—'}</span>
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: st.color, background: st.bg }}>{o.status}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                            <button onClick={() => handleCancel(o)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', background: 'rgba(248,113,113,0.12)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                                <XCircle size={13} /> Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {o.notes && (
                                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        📝 {o.notes}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {form && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: '2rem', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 700 }}>Nova Ordem de Produção</h3>
                            <button onClick={closeForm} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Sub-Produto *</label>
                                <select value={form.subProductSku} onChange={e => setForm(p => ({ ...p, subProductSku: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                                    <option value="">Selecione um sub-produto...</option>
                                    {subProducts.filter(p => p.status !== 'Inativo').map(p => (
                                        <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Quantidade de Lotes *</label>
                                <input type="number" min={1} value={form.qtyBatches} onChange={e => setForm(p => ({ ...p, qtyBatches: parseFloat(e.target.value) || 1 }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Data Prevista</label>
                                <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Responsável</label>
                                <input type="text" value={form.responsible} onChange={e => setForm(p => ({ ...p, responsible: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 5 }}>Observações</label>
                                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>
                        </div>

                        {/* Production preview */}
                        {selectedSub && (
                            <div style={{ background: canProduce ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${canProduce ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                                    <Zap size={15} color={canProduce ? '#34d399' : '#f87171'} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: canProduce ? '#34d399' : '#f87171' }}>
                                        {canProduce ? `✓ Produção viável — gerará ${totalProduced} ${selectedSub.unit}` : '⚠ Estoque insuficiente para esta ordem'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {ingredients.map(i => (
                                        <div key={i.ingredientSku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.4rem 0.5rem', borderRadius: 6, background: i.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)' }}>
                                            <span style={{ color: 'var(--text-primary)' }}>{i.ingName}</span>
                                            <span style={{ color: i.ok ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                                Necessário: {i.needed}{i.unit} / Disponível: {i.available}{i.unit}
                                            </span>
                                        </div>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <div style={{ fontSize: '0.8rem', color: '#f59e0b', textAlign: 'center' }}>⚠ Este sub-produto não tem ficha técnica cadastrada.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={closeForm} style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button onClick={handleSave} disabled={saving || !form.subProductSku}
                                style={{ padding: '0.6rem 1.75rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: saving || !form.subProductSku ? 0.6 : 1 }}>
                                {saving ? 'Salvando...' : 'Criar Ordem'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// =============================================
// ABA: ESTOQUE ATUAL
// =============================================
function EstoqueTab({ subProducts, onGotoOrdens }) {
    return (
        <div style={{ padding: '1.5rem' }}>
            {subProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Archive size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                    <p>Nenhum sub-produto cadastrado.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                                {['Sub-Produto', 'SKU', 'Unidade', 'Estoque Atual', 'Mínimo', 'Máximo', 'Status', 'Ação'].map(h => (
                                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {subProducts.sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock)).map((p, idx) => {
                                const st = stockStatus(p.stock, p.minStock);
                                const pct = p.maxStock > 0 ? Math.min(100, (p.stock / p.maxStock) * 100) : 0;
                                return (
                                    <tr key={p.sku} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{p.name}</td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#f97316', background: 'rgba(249,115,22,0.12)', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>{p.sku}</span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.unit}</td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: st.color, marginBottom: 4 }}>{p.stock}</div>
                                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', width: 80 }}>
                                                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: st.color }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.minStock}</td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.maxStock}</td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{st.label}</span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            {p.stock < p.minStock && (
                                                <button onClick={onGotoOrdens}
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
        </div>
    );
}

// =============================================
// ABA: HISTÓRICO
// =============================================
function HistoricoTab({ orders, subProducts }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const concluded = orders.filter(o =>
        (o.status === 'Concluído' || o.status === 'Cancelado') &&
        (!statusFilter || o.status === statusFilter) &&
        (!search || (o.subProductName || o.subProductSku || '').toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input placeholder="Filtrar por sub-produto..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: 32, height: 36, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ height: 36, padding: '0 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}>
                    <option value="">Todos os status</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
            </div>

            {concluded.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <Clock size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                    <p>Nenhum histórico encontrado.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {concluded.map(o => {
                        const st = ORDER_STATUS[o.status] || ORDER_STATUS.Concluído;
                        const Icon = st.icon;
                        const sub = subProducts.find(p => p.sku === o.subProductSku);
                        return (
                            <div key={o.id} style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${st.color}22`, padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: o.ingredientsSnapshot?.length ? '0.75rem' : 0 }}>
                                    <Icon size={18} color={st.color} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{o.subProductName || o.subProductSku}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: 3 }}>
                                            <span>📅 {fmtDate(o.startDate)}</span>
                                            {o.status === 'Concluído' && <span>✅ Produziu {o.totalProduced} {sub?.unit || 'UN'}</span>}
                                            {o.responsible && <span>👤 {o.responsible}</span>}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: st.color, background: st.bg, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{o.status}</span>
                                </div>
                                {o.status === 'Concluído' && o.ingredientsSnapshot && o.ingredientsSnapshot.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginRight: 4 }}>Consumido:</span>
                                        {o.ingredientsSnapshot.map(i => (
                                            <span key={i.ingredientSku} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 5 }}>
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
        </div>
    );
}
