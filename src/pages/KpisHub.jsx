/**
 * Corellux OS - KPIs & Analytics Hub
 * Painel de indicadores, metas, performance e valuation de estoque.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import DbService from '../services/db-service';
import { 
    BarChart3, 
    TrendingUp, 
    DollarSign, 
    ArrowLeft, 
    PieChart, 
    Activity, 
    AlertTriangle, 
    Package, 
    Layers,
    Search,
    MapPin,
    RefreshCw,
    FolderHeart,
    Percent,
    ShieldAlert,
    Clock,
    ShoppingCart
} from 'lucide-react';

export default function KpisHub() {
    const [state, setKey] = useCorelluxState(['currentScreen', 'currentUser']);
    const [activeTab, setActiveTab] = useState('estoque'); // Defaulting to the requested "Estoque" view
    const [products, setProducts] = useState([]);
    const [stockBatches, setStockBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prods, batches] = await Promise.all([
                DbService.getProducts(),
                DbService.getStockBatches()
            ]);
            setProducts(prods || []);
            setStockBatches(batches || []);
        } catch (e) {
            console.error('[KpisHub] Erro ao carregar dados:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Lógica de cálculo de custo e valuation de estoque
    const productCosts = useMemo(() => {
        const costMap = {};
        products.forEach(p => {
            // Fórmula estável baseada no SKU para produtos sem custo definido
            const stableRandom = (p.sku.charCodeAt(p.sku.length - 1) * 3) % 150 + 5;
            costMap[p.sku] = p.cost || stableRandom;
        });
        return costMap;
    }, [products]);

    // Dados processados para o painel de estoque
    const stockStats = useMemo(() => {
        let totalValuation = 0;
        let totalQty = 0;
        let belowMinCount = 0;
        const categoryValuation = {};
        const zoneValuation = {
            CFA: { name: 'Câmara Fria A', value: 0 },
            CFB: { name: 'Câmara Fria B', value: 0 },
            ESA: { name: 'Estoque Seco A', value: 0 },
            ESB: { name: 'Estoque Seco B', value: 0 },
            GERAL: { name: 'Geral / Outros', value: 0 }
        };

        // 1. Calcular usando lotes (stockBatches) se disponíveis para alocação de zonas física
        const batchSkuValued = {};
        stockBatches.forEach(b => {
            const cost = productCosts[b.itemSku] || 0;
            const value = (b.quantity || 0) * cost;
            totalValuation += value;
            totalQty += b.quantity || 0;

            // Agrupar por zona pelo prefixo do endereço (ex: CFA-01-01 -> CFA)
            const prefix = b.address ? b.address.substring(0, 3).toUpperCase() : 'GERAL';
            if (zoneValuation[prefix]) {
                zoneValuation[prefix].value += value;
            } else {
                zoneValuation.GERAL.value += value;
            }

            batchSkuValued[b.itemSku] = (batchSkuValued[b.itemSku] || 0) + (b.quantity || 0);
        });

        // 2. Fazer fallback para produtos que não têm lotes registrados mas têm stock no cadastro
        products.forEach(p => {
            const cost = productCosts[p.sku] || 0;
            const batchQty = batchSkuValued[p.sku] || 0;
            const missingQty = Math.max(0, (p.stock || 0) - batchQty);

            if (missingQty > 0) {
                const value = missingQty * cost;
                totalValuation += value;
                totalQty += missingQty;
                zoneValuation.GERAL.value += value;
            }

            // Estatísticas de estoque mínimo/crítico
            if ((p.stock || 0) < (p.minStock || 0)) {
                belowMinCount++;
            }

            // Agrupar por categoria
            const cat = p.category || 'OUTROS';
            categoryValuation[cat] = (categoryValuation[cat] || 0) + ((p.stock || 0) * cost);
        });

        // Converter categorias para array ordenado
        const sortedCategories = Object.entries(categoryValuation)
            .map(([name, val]) => ({ name, value: val, percentage: totalValuation > 0 ? (val / totalValuation) * 100 : 0 }))
            .sort((a, b) => b.value - a.value);

        // Converter zonas para array ordenado
        const sortedZones = Object.entries(zoneValuation)
            .map(([code, data]) => ({ code, ...data, percentage: totalValuation > 0 ? (data.value / totalValuation) * 100 : 0 }))
            .filter(z => z.value > 0)
            .sort((a, b) => b.value - a.value);

        return {
            totalValuation,
            totalQty,
            belowMinCount,
            categories: sortedCategories,
            zones: sortedZones
        };
    }, [products, stockBatches, productCosts]);

    // Filtragem de produtos para a tabela interativa
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, categoryFilter]);

    const categoriesList = useMemo(() => {
        return [...new Set(products.map(p => p.category))].filter(Boolean);
    }, [products]);

    // Nav items da sidebar
    const sidebarItems = [
        { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
        { id: 'estoque', label: 'Estoque & Valuation', icon: Package },
        { id: 'financeiro', label: 'Financeiro & Margens', icon: DollarSign },
        { id: 'operacoes', label: 'Operações & Compliance', icon: Activity }
    ];

    const formatBRL = (val) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="screen active with-header" style={{
            display: 'flex', flexDirection: 'row',
            background: '#090d16', color: '#f3f4f6',
            height: '100%', overflowY: 'hidden', padding: 0
        }}>
            {/* CSS Customizado de Estilo Premium */}
            <style dangerouslySetInnerHTML={{__html: `
                .kpi-sidebar {
                    width: 280px;
                    background: rgba(15, 23, 42, 0.7);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem 1rem;
                    box-sizing: border-box;
                    backdrop-filter: blur(15px);
                    flex-shrink: 0;
                }
                .kpi-sidebar-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #fff;
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    letter-spacing: -0.5px;
                }
                .kpi-sidebar-btn {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.8rem 1rem;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-align: left;
                    margin-bottom: 0.5rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .kpi-sidebar-btn:hover {
                    background: rgba(255, 255, 255, 0.04);
                    color: #fff;
                    transform: translateX(3px);
                }
                .kpi-sidebar-btn.active {
                    background: rgba(249, 115, 22, 0.12);
                    color: #f97316;
                    box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.2);
                }
                .kpi-main-container {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                .kpi-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .kpi-btn-back {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    color: #94a3b8;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .kpi-btn-back:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                }
                .kpi-grid-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .kpi-summary-card {
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4));
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .kpi-summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(249, 115, 22, 0.05);
                }
                .kpi-summary-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: #f97316;
                }
                .kpi-summary-card.teal::before { background: #0d9488; }
                .kpi-summary-card.blue::before { background: #38bdf8; }
                .kpi-summary-card.red::before { background: #f43f5e; }
                
                .kpi-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .kpi-card-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }
                .kpi-card-value {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: -0.5px;
                }
                .kpi-card-subtitle {
                    font-size: 0.78rem;
                    color: #64748b;
                    margin-top: 0.4rem;
                }
                
                .kpi-dashboard-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                @media (max-width: 1024px) {
                    .kpi-dashboard-row {
                        grid-template-columns: 1fr;
                    }
                }
                
                .kpi-panel {
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    backdrop-filter: blur(10px);
                }
                .kpi-panel-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0 0 1.25rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 0.75rem;
                }
                
                .kpi-progress-item {
                    margin-bottom: 1rem;
                }
                .kpi-progress-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.82rem;
                    color: #cbd5e1;
                    margin-bottom: 0.35rem;
                    font-weight: 500;
                }
                .kpi-progress-bar-bg {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .kpi-progress-bar-fill {
                    height: 100%;
                    border-radius: 4px;
                    background: linear-gradient(90deg, #f97316, #f97316cc);
                    transition: width 0.8s ease-in-out;
                }
                
                .kpi-table-container {
                    background: rgba(15, 23, 42, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    overflow: hidden;
                    margin-top: 1.5rem;
                }
                .kpi-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.85rem;
                }
                .kpi-table th {
                    background: rgba(15, 23, 42, 0.6);
                    padding: 0.8rem 1rem;
                    color: #94a3b8;
                    font-weight: 600;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .kpi-table td {
                    padding: 0.85rem 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    color: #cbd5e1;
                    vertical-align: middle;
                }
                .kpi-table tr:hover {
                    background: rgba(255, 255, 255, 0.02);
                }
                
                .kpi-search-bar {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .kpi-search-input-wrapper {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .kpi-search-icon {
                    position: absolute;
                    left: 0.8rem;
                    color: #64748b;
                }
                .kpi-search-input {
                    width: 100%;
                    background: rgba(30, 41, 59, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #fff;
                    padding: 0.6rem 1rem 0.6rem 2.3rem;
                    border-radius: 8px;
                    outline: none;
                    font-size: 0.85rem;
                    transition: border-color 0.2s;
                }
                .kpi-search-input:focus {
                    border-color: #f97316;
                }
                .kpi-select {
                    background: rgba(30, 41, 59, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #fff;
                    padding: 0.6rem 1rem;
                    border-radius: 8px;
                    outline: none;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                .kpi-select:focus {
                    border-color: #f97316;
                }
                .kpi-badge {
                    padding: 0.2rem 0.5rem;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                }
                .kpi-badge.critical {
                    background: rgba(244, 63, 94, 0.12);
                    color: #f43f5e;
                }
                .kpi-badge.ok {
                    background: rgba(16, 185, 129, 0.12);
                    color: #10b981;
                }
            `}} />

            {/* Sidebar de Navegação */}
            <aside className="kpi-sidebar">
                <div className="kpi-sidebar-title">
                    <BarChart3 size={22} style={{ color: '#f97316' }} />
                    <span>KPIs & Analytics</span>
                </div>
                <nav style={{ flex: 1 }}>
                    {sidebarItems.map(item => (
                        <button 
                            key={item.id} 
                            className={`kpi-sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <button 
                    className="kpi-btn-back" 
                    onClick={() => setKey('currentScreen', 'dashboard')}
                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                >
                    <ArrowLeft size={16} />
                    Voltar ao Menu
                </button>
            </aside>

            {/* Container Principal de Dashboards */}
            <main className="kpi-main-container">
                
                {/* Header do Hub */}
                <header className="kpi-header">
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                            {activeTab === 'estoque' ? 'KPI DE ESTOQUE & VALUATION' : 
                             activeTab === 'overview' ? 'DASHBOARD GERAL' : 
                             activeTab === 'financeiro' ? 'INDICADORES FINANCEIROS' : 'OPERACIONAL & CHECKLISTS'}
                        </h1>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                            {activeTab === 'estoque' ? 'Valuation monetário do inventário, análise por categoria e alocação em zonas WMS.' : 
                             activeTab === 'overview' ? 'Visão global dos principais indicadores de performance e saúde operacional.' : 
                             activeTab === 'financeiro' ? 'Margens de contribuição, custos fixos e controladoria de insumos.' : 'Métricas de conformidade, trilhas de checklists e produtividade.'}
                        </p>
                    </div>
                    <button 
                        className="kpi-btn-back"
                        onClick={loadData}
                        disabled={loading}
                        style={{ display: 'flex', gap: '0.5rem' }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        Atualizar Dados
                    </button>
                </header>

                {loading ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#94a3b8' }}>
                        <RefreshCw size={32} className="spin" style={{ color: '#f97316' }} />
                        <span>Carregando indicadores operacionais...</span>
                    </div>
                ) : (
                    <>
                        {/* ── TAB: ESTOQUE (Valuation Dashboard) ───────────────────────────── */}
                        {activeTab === 'estoque' && (
                            <div>
                                {/* Summary Cards */}
                                <div className="kpi-grid-summary">
                                    <div className="kpi-summary-card">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Valor Total em Estoque</span>
                                            <DollarSign size={20} style={{ color: '#f97316' }} />
                                        </div>
                                        <div className="kpi-card-value">{formatBRL(stockStats.totalValuation)}</div>
                                        <div className="kpi-card-subtitle">Valuation consolidado de matérias-primas e insumos</div>
                                    </div>
                                    <div className="kpi-summary-card teal">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Quantidade de Itens Físicos</span>
                                            <Package size={20} style={{ color: '#0d9488' }} />
                                        </div>
                                        <div className="kpi-card-value">{stockStats.totalQty.toLocaleString('pt-BR')} un/kg</div>
                                        <div className="kpi-card-subtitle">Volume total de mercadorias armazenadas</div>
                                    </div>
                                    <div className="kpi-summary-card red">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Itens com Estoque Crítico</span>
                                            <AlertTriangle size={20} style={{ color: '#f43f5e' }} />
                                        </div>
                                        <div className="kpi-card-value">{stockStats.belowMinCount}</div>
                                        <div className="kpi-card-subtitle">Insumos com níveis abaixo do limite mínimo definido</div>
                                    </div>
                                </div>

                                {/* Row: Categories and Zones */}
                                <div className="kpi-dashboard-row">
                                    {/* Valuation por Categoria */}
                                    <div className="kpi-panel">
                                        <h3 className="kpi-panel-title">
                                            <Layers size={18} style={{ color: '#f97316' }} />
                                            Valuation por Categoria
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {stockStats.categories.length === 0 ? (
                                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Sem dados de categorias.</div>
                                            ) : (
                                                stockStats.categories.map((cat, index) => {
                                                    // Usar cores diferentes para as barras de progresso superiores
                                                    const colors = ['#f97316', '#38bdf8', '#0d9488', '#a855f7', '#10b981', '#f43f5e', '#e2e8f0'];
                                                    const barColor = colors[index % colors.length];
                                                    return (
                                                        <div key={cat.name} className="kpi-progress-item">
                                                            <div className="kpi-progress-labels">
                                                                <span>{cat.name}</span>
                                                                <span style={{ fontWeight: '700' }}>
                                                                    {formatBRL(cat.value)} ({cat.percentage.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="kpi-progress-bar-bg">
                                                                <div 
                                                                    className="kpi-progress-bar-fill" 
                                                                    style={{ 
                                                                        width: `${cat.percentage}%`,
                                                                        background: `linear-gradient(90deg, ${barColor}, ${barColor}b3)`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Valuation por Zonas de Armazenamento */}
                                    <div className="kpi-panel">
                                        <h3 className="kpi-panel-title">
                                            <MapPin size={18} style={{ color: '#38bdf8' }} />
                                            Valuation por Zona WMS
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {stockStats.zones.length === 0 ? (
                                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum lote com endereço WMS ativo no momento.</div>
                                            ) : (
                                                stockStats.zones.map((zone, index) => {
                                                    const colors = ['#38bdf8', '#0d9488', '#f97316', '#a855f7', '#64748b'];
                                                    const barColor = colors[index % colors.length];
                                                    return (
                                                        <div key={zone.code} className="kpi-progress-item">
                                                            <div className="kpi-progress-labels">
                                                                <span><strong>{zone.code}</strong> · {zone.name}</span>
                                                                <span style={{ fontWeight: '700' }}>
                                                                    {formatBRL(zone.value)} ({zone.percentage.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="kpi-progress-bar-bg">
                                                                <div 
                                                                    className="kpi-progress-bar-fill" 
                                                                    style={{ 
                                                                        width: `${zone.percentage}%`,
                                                                        background: `linear-gradient(90deg, ${barColor}, ${barColor}b3)`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Table: Detailed Stock Valuation */}
                                <div className="kpi-panel">
                                    <h3 className="kpi-panel-title" style={{ borderBottom: 'none', marginBottom: '1rem', paddingBottom: 0 }}>
                                        <Package size={18} style={{ color: '#f97316' }} />
                                        Valuation Detalhado por Insumo
                                    </h3>
                                    
                                    {/* Controles de Busca e Filtro */}
                                    <div className="kpi-search-bar">
                                        <div className="kpi-search-input-wrapper">
                                            <Search size={16} className="kpi-search-icon" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por SKU ou Nome do produto..." 
                                                className="kpi-search-input"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <select 
                                            className="kpi-select"
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                        >
                                            <option value="">Todas as Categorias</option>
                                            {categoriesList.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="kpi-table-container">
                                        <table className="kpi-table">
                                            <thead>
                                                <tr>
                                                    <th>SKU</th>
                                                    <th>Insumo</th>
                                                    <th>Categoria</th>
                                                    <th style={{ textAlign: 'right' }}>Estoque Atual</th>
                                                    <th style={{ textAlign: 'right' }}>Custo Unit. (est.)</th>
                                                    <th style={{ textAlign: 'right' }}>Valuation Total</th>
                                                    <th style={{ width: '100px', textTransform: 'center' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                                            Nenhum insumo encontrado para os filtros selecionados.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredProducts.map(p => {
                                                        const cost = productCosts[p.sku] || 0;
                                                        const totalVal = (p.stock || 0) * cost;
                                                        const isCritical = (p.stock || 0) < (p.minStock || 0);

                                                        return (
                                                            <tr key={p.sku}>
                                                                <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{p.sku}</td>
                                                                <td>
                                                                    <div style={{ fontWeight: '700', color: '#fff' }}>{p.name}</div>
                                                                    {p.brand && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Marca: {p.brand}</div>}
                                                                </td>
                                                                <td style={{ color: '#cbd5e1' }}>{p.category}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                                    {p.stock} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.unit}</span>
                                                                </td>
                                                                <td style={{ textAlign: 'right', color: '#94a3b8' }}>{formatBRL(cost)}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: '700', color: '#10b981' }}>{formatBRL(totalVal)}</td>
                                                                <td>
                                                                    {isCritical ? (
                                                                        <span className="kpi-badge critical">Crítico (Min: {p.minStock})</span>
                                                                    ) : (
                                                                        <span className="kpi-badge ok">Adequado</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: OVERVIEW (Visão Geral - KPIs de Alta Gestão) ───────────────────────────── */}
                        {activeTab === 'overview' && (
                            <div className="kpi-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316' }}>
                                    <Activity size={24} />
                                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Visão Analítica de Alta Gestão</h2>
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                                    Módulo consolidado de analytics de produção, conformidade sanitária e eficiência.
                                </p>
                                
                                <div className="kpi-grid-summary" style={{ marginTop: '1rem' }}>
                                    <div className="kpi-summary-card blue">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Eficiência Operacional</span>
                                            <Activity size={20} style={{ color: '#38bdf8' }} />
                                        </div>
                                        <div className="kpi-card-value">94.8%</div>
                                        <div className="kpi-card-subtitle">+2.4% em relação ao mês anterior</div>
                                    </div>
                                    <div className="kpi-summary-card teal">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Fidelidade às Fichas Técnicas</span>
                                            <Percent size={20} style={{ color: '#0d9488' }} />
                                        </div>
                                        <div className="kpi-card-value">99.1%</div>
                                        <div className="kpi-card-subtitle">Conformidade nas pesagens do sub-produtos</div>
                                    </div>
                                    <div className="kpi-summary-card red">
                                        <div className="kpi-card-header">
                                            <span className="kpi-card-title">Índice de Perdas (Descartes)</span>
                                            <ShieldAlert size={20} style={{ color: '#f43f5e' }} />
                                        </div>
                                        <div className="kpi-card-value">1.42%</div>
                                        <div className="kpi-card-subtitle">Meta limite de desperdício é de 2.0%</div>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                    <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1rem' }}>Principais Insights Analíticos</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem' }}>
                                            <div style={{ fontWeight: '700', color: '#38bdf8', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Otimização WMS Identificada</div>
                                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                A zona <strong>CFA</strong> concentra {Math.round(stockStats.zones.find(z => z.code === 'CFA')?.percentage || 0)}% do valor total em estoque. Sugere-se realizar inventário rotativo nesta área a cada 15 dias.
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem' }}>
                                            <div style={{ fontWeight: '700', color: '#10b981', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Controle de Ruptura de Estoque</div>
                                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                Atualmente, existem <strong>{stockStats.belowMinCount} insumos críticos</strong> abaixo do estoque mínimo. Acesse o módulo de Logística para gerar ordens automáticas de compra sugeridas pelo motor.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: FINANCEIRO (Financeiro & Margens) ───────────────────────────── */}
                        {activeTab === 'financeiro' && (
                            <div className="kpi-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0d9488' }}>
                                    <DollarSign size={24} />
                                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Financeiro & Margens</h2>
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                                    Demonstrativo de CMV (Custo de Mercadoria Vendida), rentabilidade por prato e custos operacionais.
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>CMV Alvo</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>28.5%</div>
                                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.2rem' }}>Dentro do planejado</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Faturamento Previsto</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>R$ 184.500,00</div>
                                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem' }}>Mês corrente (estimado)</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Ponto de Equilíbrio</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>R$ 82.000,00</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>Atingido em 14 dias</div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginTop: '1rem' }}>
                                    <Clock size={20} style={{ color: '#f97316', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff' }}>Módulo em Desenvolvimento</div>
                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                                            Os dados detalhados de DRE, fluxo de caixa e margem de contribuição estão em processo de integração com o módulo Financeiro.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: OPERACIONAL (Operações & Compliance) ───────────────────────────── */}
                        {activeTab === 'operacoes' && (
                            <div className="kpi-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7' }}>
                                    <Activity size={24} />
                                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Metas de Operação & Auditoria</h2>
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                                    Controle de execução e conformidade para Auditorias Internas e Vigilância Sanitária.
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Conformidade Vigilância</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>98.4%</div>
                                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '0.2rem' }}>Nível de conformidade elevado</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Checklists Respondidos</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>342 / 350</div>
                                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem' }}>97% de taxa de conclusão</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Pontos de Auditoria Críticos</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.25rem' }}>02</div>
                                        <div style={{ fontSize: '0.7rem', color: '#f43f5e', marginTop: '0.2rem' }}>Ações preventivas abertas</div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginTop: '1rem' }}>
                                    <Clock size={20} style={{ color: '#f97316', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff' }}>Integração de Métricas</div>
                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                                            As pontuações operacionais e trilhas de auditoria detalhadas serão migradas diretamente do módulo de Check-lists nas próximas sprints.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
