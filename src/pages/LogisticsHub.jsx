/**
 * Corellux OS - Logistics Hub (Inventory, WMS, and Requests)
 * Módulo operacional de controle de estoque reativo em React.
 */

import React, { useState, useEffect } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import DbService from '../services/db-service';
import { getUserAvatar } from '../utils/initial-data';
import { 
    Boxes, 
    ArrowUp, 
    ArrowDown, 
    Trash2, 
    ClipboardList, 
    Search, 
    Check, 
    X, 
    ChevronRight, 
    AlertTriangle, 
    CheckCircle2, 
    ArrowLeft, 
    ShoppingCart,
    Send,
    Eye,
    ShieldCheck,
    FileText,
    History
} from 'lucide-react';

const indirectEval = eval;

export default function LogisticsHub() {
    const [state, setKey] = useCorelluxState(['currentUser']);
    
    // Core Data States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab Navigation
    const [activeTab, setActiveTab] = useState('estoque'); // 'estoque', 'movimentar', 'solicitacao', 'aprovacoes'
    
    // Flow state for Movements/Requests
    const [flowType, setFlowType] = useState('entrada'); // 'entrada', 'saida', 'perdas', 'solicitacao'
    const [flowStep, setFlowStep] = useState('category'); // 'category', 'product'
    const [currentCategory, setCurrentCategory] = useState(null);
    
    // Numpad Modal States
    const [showNumpad, setShowNumpad] = useState(false);
    const [numpadProduct, setNumpadProduct] = useState(null);
    const [numpadValue, setNumpadValue] = useState('');

    // Confirmation Modal States
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingQty, setPendingQty] = useState(0);
    const [pendingProduct, setPendingProduct] = useState(null);
    
    // Reason Modal States (for Perdas)
    const [showReason, setShowReason] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');

    // Inventory Filtering & Sorting
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventoryCategory, setInventoryCategory] = useState('ALL');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Cart for requests
    const [cart, setCart] = useState([]);

    // Load Data
    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                const [prodsData, catsData] = await Promise.all([
                    DbService.getProducts(),
                    DbService.getCategories()
                ]);
                setProducts(prodsData);
                setCategories(catsData.filter(c => c.status === 'Ativo'));
                
                // Load requests from LocalStorage
                const savedRequests = localStorage.getItem('corellux_item_requests');
                if (savedRequests) {
                    setRequests(JSON.parse(savedRequests));
                } else {
                    setRequests([]);
                }
            } catch (err) {
                console.error('[LogisticsHub] Error loading initial data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Save requests to LocalStorage when changed
    const saveRequests = (newRequests) => {
        setRequests(newRequests);
        localStorage.setItem('corellux_item_requests', JSON.stringify(newRequests));
    };

    // =============================================
    // HELPER FUNCTIONS & RENDERS
    // =============================================

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Sort products
    const sortedProducts = [...products].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (valA === undefined) valA = '';
        if (valB === undefined) valB = '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Filter products for general inventory view
    const filteredInventory = sortedProducts.filter(p => {
        if (p.status !== 'Ativo') return false;
        const matchesSearch = 
            p.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
            p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
            (p.brand && p.brand.toLowerCase().includes(inventorySearch.toLowerCase()));
        
        const matchesCat = inventoryCategory === 'ALL' || p.category === inventoryCategory;
        return matchesSearch && matchesCat;
    });

    // XML Import logic
    const handleXmlImport = () => {
        alert('Funcionalidade de importar XML de Nota Fiscal (NF-e) em desenvolvimento. A integração com APIs SEFAZ estará disponível em breve.');
    };

    // =============================================
    // NUMPAD LOGIC
    // =============================================

    const openNumpad = (product) => {
        setNumpadProduct(product);
        // Find existing value if it is a request in cart
        if (flowType === 'solicitacao') {
            const existing = cart.find(c => c.sku === product.sku);
            setNumpadValue(existing ? existing.quantity.toString() : '');
        } else {
            setNumpadValue('');
        }
        setShowNumpad(true);
    };

    const handleNumpadKey = (key) => {
        if (key === 'C') {
            setNumpadValue('');
        } else if (key === 'del') {
            setNumpadValue(prev => prev.slice(0, -1));
        } else if (key === '=') {
            // Evaluate basic expressions if any
            try {
                const exp = numpadValue.replace(/,/g, '.');
                const calculated = indirectEval(exp);
                if (calculated !== undefined && !isNaN(calculated)) {
                    setNumpadValue(calculated.toFixed(2).replace(/\.00$/, '').replace('.', ','));
                }
            } catch (e) {
                // Ignore errors
            }
        } else {
            // Limit to reasonable input
            if (numpadValue.length < 8) {
                setNumpadValue(prev => prev + key);
            }
        }
    };

    const confirmNumpad = () => {
        if (!numpadProduct || !numpadValue) {
            setShowNumpad(false);
            return;
        }

        let parsedVal = 0;
        try {
            const normalized = numpadValue.replace(/,/g, '.');
            parsedVal = indirectEval(normalized);
            if (parsedVal === undefined || isNaN(parsedVal)) parsedVal = 0;
        } catch (e) {
            parsedVal = parseFloat(numpadValue.replace(/,/g, '.'));
            if (isNaN(parsedVal)) parsedVal = 0;
        }

        if (parsedVal <= 0) {
            alert('Quantidade deve ser maior que zero.');
            return;
        }

        setShowNumpad(false);

        if (flowType === 'solicitacao') {
            // Validate availability
            if (parsedVal > numpadProduct.stock) {
                alert(`Quantidade solicitada (${parsedVal}) maior que o estoque atual (${numpadProduct.stock} ${numpadProduct.unit}).`);
                return;
            }

            // Add or update cart
            setCart(prev => {
                const existing = prev.find(item => item.sku === numpadProduct.sku);
                if (existing) {
                    return prev.map(item => item.sku === numpadProduct.sku ? { ...item, quantity: parsedVal } : item);
                } else {
                    return [...prev, {
                        sku: numpadProduct.sku,
                        name: numpadProduct.name,
                        brand: numpadProduct.brand,
                        unit: numpadProduct.unit,
                        quantity: parsedVal
                    }];
                }
            });
        } else {
            // Open confirmation
            setPendingQty(parsedVal);
            setPendingProduct(numpadProduct);
            setShowConfirm(true);
        }
    };

    // =============================================
    // STOCK TRANSACTION LOGIC
    // =============================================

    const handleConfirmAction = async () => {
        setShowConfirm(false);
        if (!pendingProduct || pendingQty <= 0) return;

        if (flowType === 'perdas') {
            // Needs discard reason first
            setShowReason(true);
            return;
        }

        await processStockUpdate();
    };

    const processStockUpdate = async (reason = '') => {
        const sku = pendingProduct.sku;
        const currentStock = pendingProduct.stock;
        let newStock = currentStock;

        if (flowType === 'entrada') {
            newStock += pendingQty;
        } else if (flowType === 'saida' || flowType === 'perdas') {
            newStock -= pendingQty;
            if (newStock < 0) newStock = 0;
        }

        // 1. Update on Supabase
        const result = await DbService.updateProductStock(sku, newStock);

        // 2. Update local state copy
        if (result.success) {
            setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
            alert(`Estoque atualizado com sucesso para o item: ${pendingProduct.name}. Novo estoque: ${newStock} ${pendingProduct.unit}`);
        } else {
            // Even if Supabase fails (e.g. anon key blocked), we update local memory to let the user play with the app.
            setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
            alert(`[Aviso] Salvo localmente (offline): estoque de ${pendingProduct.name} alterado para ${newStock}.`);
        }

        // Log transaction locally (mock log)
        console.log(`[Logistics] ${flowType.toUpperCase()} - SKU: ${sku}, Qtd: ${pendingQty}, Motivo: ${reason}`);

        // Reset flow
        setFlowStep('category');
        setCurrentCategory(null);
        setPendingProduct(null);
        setPendingQty(0);
        setSelectedReason('');
    };

    const handleConfirmReason = () => {
        if (!selectedReason) {
            alert('Por favor, selecione um motivo para o descarte.');
            return;
        }
        setShowReason(false);
        processStockUpdate(selectedReason);
    };

    // =============================================
    // REQUESTS CART LOGIC
    // =============================================

    const handleRemoveFromCart = (sku) => {
        setCart(prev => prev.filter(c => c.sku !== sku));
    };

    const handleSubmitRequests = () => {
        if (cart.length === 0) return;

        const confirmMsg = `Deseja enviar essa lista com ${cart.length} produto(s) para aprovação?`;
        if (window.confirm(confirmMsg)) {
            const userName = state.currentUser ? state.currentUser.name : 'Operador';
            const userRole = state.currentUser ? state.currentUser.role : 'Geral';
            
            const newRequests = [...requests];
            cart.forEach((item, index) => {
                newRequests.push({
                    id: Date.now() + index,
                    itemSku: item.sku,
                    itemName: item.name,
                    quantity: item.quantity,
                    requestedBy: userName,
                    requestedAt: new Date().toLocaleString('pt-BR'),
                    status: 'Pendente',
                    approvedBy: null,
                    approvedAt: null,
                    sector: 'COZINHA', // Default operational sector
                    area: userRole
                });
            });

            saveRequests(newRequests);
            setCart([]);
            alert('Solicitação de insumos enviada com sucesso!');
            setActiveTab('estoque');
        }
    };

    // =============================================
    // SUPERVISOR APPROVAL LOGIC
    // =============================================

    const handleApproveRequest = async (reqId) => {
        const req = requests.find(r => r.id === reqId);
        if (!req || req.status !== 'Pendente') return;

        const product = products.find(p => p.sku === req.itemSku);
        if (!product) {
            alert('Erro: Produto não encontrado no estoque.');
            return;
        }

        if (product.stock < req.quantity) {
            alert(`Estoque insuficiente! Disponível: ${product.stock} ${product.unit}. Solicitado: ${req.quantity} ${product.unit}.`);
            return;
        }

        if (window.confirm(`Aprovar entrega de ${req.quantity} ${product.unit} de "${req.itemName}"?`)) {
            const newStock = product.stock - req.quantity;
            
            // Update db
            await DbService.updateProductStock(req.itemSku, newStock);
            setProducts(prev => prev.map(p => p.sku === req.itemSku ? { ...p, stock: newStock } : p));

            // Update request status
            const updatedRequests = requests.map(r => r.id === reqId ? {
                ...r,
                status: 'Entregue',
                approvedBy: state.currentUser ? state.currentUser.name : 'Supervisor',
                approvedAt: new Date().toLocaleString('pt-BR')
            } : r);

            saveRequests(updatedRequests);
            alert('Solicitação aprovada e insumo baixado do estoque!');
        }
    };

    const handleRejectRequest = (reqId) => {
        const req = requests.find(r => r.id === reqId);
        if (!req || req.status !== 'Pendente') return;

        if (window.confirm(`Recusar a solicitação de ${req.quantity} de "${req.itemName}"?`)) {
            const updatedRequests = requests.map(r => r.id === reqId ? {
                ...r,
                status: 'Recusado',
                approvedBy: state.currentUser ? state.currentUser.name : 'Supervisor',
                approvedAt: new Date().toLocaleString('pt-BR')
            } : r);

            saveRequests(updatedRequests);
            alert('Solicitação recusada.');
        }
    };

    // Check permissions
    const canApprove = state.currentUser && (
        state.currentUser.permissions?.chkApprove || 
        state.currentUser.permissions?.approveRequests ||
        state.currentUser.accessLevel === 'Administrador'
    );

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Header / Sub-nav tab indicators */}
            <div className="tab-navigation-bar" style={{
                display: 'flex',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-color)',
                padding: '0 2rem',
                gap: '2rem'
            }}>
                <button 
                    className={`tab-nav-btn ${activeTab === 'estoque' ? 'active' : ''}`}
                    onClick={() => setActiveTab('estoque')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'estoque' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'estoque' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Boxes size={16} /> VISÃO GERAL DO ESTOQUE
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'movimentar' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('movimentar');
                        setFlowType('entrada');
                        setFlowStep('category');
                        setCurrentCategory(null);
                    }}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'movimentar' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'movimentar' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <History size={16} /> MOVIMENTAR ESTOQUE
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'solicitacao' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('solicitacao');
                        setFlowType('solicitacao');
                        setFlowStep('category');
                        setCurrentCategory(null);
                    }}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'solicitacao' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'solicitacao' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <ShoppingCart size={16} /> SOLICITAÇÃO DE INSUMOS
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'aprovacoes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('aprovacoes')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'aprovacoes' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'aprovacoes' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <ShieldCheck size={16} /> CONTROLE DE PENDÊNCIAS
                    {requests.filter(r => r.status === 'Pendente').length > 0 && (
                        <span style={{
                            background: 'var(--accent-red)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '0.2rem'
                        }}>
                            {requests.filter(r => r.status === 'Pendente').length}
                        </span>
                    )}
                </button>
            </div>

            {/* Inner Dashboard View */}
            <div className="tab-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto', position: 'relative' }}>
                
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem', color: 'var(--text-secondary)' }}>
                        <div className="loader" style={{ 
                            border: '3px solid rgba(255,255,255,0.1)', 
                            borderTop: '3px solid var(--accent-orange)', 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px', 
                            animation: 'spin 1s linear infinite' 
                        }} />
                        <p>Carregando registros do banco de dados...</p>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: VISÃO GERAL DO ESTOQUE */}
                        {activeTab === 'estoque' && (
                            <div className="products-container">
                                {/* Search and Filter Area */}
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Boxes style={{ color: 'var(--accent-orange)' }} /> Registro Geral de Itens
                                    </h2>

                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flex: '1', justifyContent: 'flex-end', minWidth: '300px' }}>
                                        {/* Category Select */}
                                        <select 
                                            value={inventoryCategory}
                                            onChange={(e) => setInventoryCategory(e.target.value)}
                                            style={{
                                                background: 'var(--bg-input)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="ALL">Todas as Categorias</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>

                                        {/* Search Box */}
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar SKU, nome ou marca..."
                                                value={inventorySearch}
                                                onChange={(e) => setInventorySearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }} className={sortField === 'sku' ? 'active-sort' : ''}>
                                                    SKU {sortField === 'sku' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }} className={sortField === 'name' ? 'active-sort' : ''}>
                                                    Produto {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('brand')} style={{ cursor: 'pointer' }} className={sortField === 'brand' ? 'active-sort' : ''}>
                                                    Marca {sortField === 'brand' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th>Unidade</th>
                                                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }} className={sortField === 'category' ? 'active-sort' : ''}>
                                                    Categoria {sortField === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th style={{ textAlign: 'center' }}>Mínimo</th>
                                                <th style={{ textAlign: 'center' }}>Médio</th>
                                                <th style={{ textAlign: 'center' }}>Máximo</th>
                                                <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer', textAlign: 'center' }} className={sortField === 'stock' ? 'active-sort' : ''}>
                                                    Estoque Atual {sortField === 'stock' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInventory.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum produto correspondente aos filtros foi localizado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredInventory.map(p => {
                                                    const minVal = p.minStock || 0;
                                                    const isLow = p.stock <= minVal;
                                                    const isOut = p.stock <= 0;

                                                    return (
                                                        <tr key={p.sku}>
                                                            <td><strong>{p.sku}</strong></td>
                                                            <td>
                                                                <div className="product-desc">
                                                                    <span style={{ fontWeight: '700' }}>{p.name}</span>
                                                                    <span>{p.desc || 'Nenhuma descrição fornecida.'}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span style={{ 
                                                                    color: 'var(--accent-orange)', 
                                                                    fontWeight: '600', 
                                                                    fontSize: '0.75rem',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {p.brand || 'Sem Marca'}
                                                                </span>
                                                            </td>
                                                            <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                                                            <td><span className="category-tag">{p.category}</span></td>
                                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{minVal}</td>
                                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{p.avgStock || 0}</td>
                                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{p.maxStock || 0}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {isOut ? (
                                                                    <span className="stock-badge stock-out"><X size={12} /> ZERADO</span>
                                                                ) : isLow ? (
                                                                    <span className="stock-badge stock-low"><AlertTriangle size={12} /> {p.stock} {p.unit}</span>
                                                                ) : (
                                                                    <span className="stock-badge stock-ok"><Check size={12} /> {p.stock} {p.unit}</span>
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
                        )}

                        {/* TAB 2 & TAB 3: MOVIMENTAR ESTOQUE & SOLICITAÇÕES */}
                        {(activeTab === 'movimentar' || activeTab === 'solicitacao') && (
                            <div className="flow-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                
                                {/* Flow Selector Header */}
                                <div className="products-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem' }}>
                                    {activeTab === 'movimentar' ? (
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button 
                                                onClick={() => { setFlowType('entrada'); setFlowStep('category'); setCurrentCategory(null); }}
                                                className={`btn-action-selector ${flowType === 'entrada' ? 'active green' : ''}`}
                                                style={{
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: flowType === 'entrada' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-card-hover)',
                                                    color: flowType === 'entrada' ? 'var(--accent-green)' : 'var(--text-secondary)',
                                                    borderColor: flowType === 'entrada' ? 'var(--accent-green)' : 'var(--border-color)',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}
                                            >
                                                <ArrowUp size={16} /> ENTRADA DE ITENS
                                            </button>
                                            
                                            <button 
                                                onClick={() => { setFlowType('saida'); setFlowStep('category'); setCurrentCategory(null); }}
                                                className={`btn-action-selector ${flowType === 'saida' ? 'active red' : ''}`}
                                                style={{
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: flowType === 'saida' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-card-hover)',
                                                    color: flowType === 'saida' ? 'var(--accent-red)' : 'var(--text-secondary)',
                                                    borderColor: flowType === 'saida' ? 'var(--accent-red)' : 'var(--border-color)',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}
                                            >
                                                <ArrowDown size={16} /> SAÍDA OPERACIONAL
                                            </button>

                                            <button 
                                                onClick={() => { setFlowType('perdas'); setFlowStep('category'); setCurrentCategory(null); }}
                                                className={`btn-action-selector ${flowType === 'perdas' ? 'active yellow' : ''}`}
                                                style={{
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: flowType === 'perdas' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card-hover)',
                                                    color: flowType === 'perdas' ? 'var(--accent-yellow)' : 'var(--text-secondary)',
                                                    borderColor: flowType === 'perdas' ? 'var(--accent-yellow)' : 'var(--border-color)',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}
                                            >
                                                <Trash2 size={16} /> DESCARTE E PERDAS
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)' }}>
                                            <ShoppingCart size={18} />
                                            <span style={{ fontWeight: '700' }}>SOLICITAR INSUMOS PARA PREPARAÇÃO (CRIAR LISTA)</span>
                                        </div>
                                    )}

                                    {/* XML Import in Entrada */}
                                    {flowType === 'entrada' && activeTab === 'movimentar' && (
                                        <button 
                                            onClick={handleXmlImport} 
                                            className="btn-primary" 
                                            style={{
                                                marginLeft: 'auto',
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.85rem',
                                                background: 'rgba(255, 90, 0, 0.1)',
                                                border: '1px solid var(--accent-orange)',
                                                color: 'var(--accent-orange)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            <FileText size={16} /> IMPORTAR XML NF-E
                                        </button>
                                    )}
                                </div>

                                {/* FLOW STEP 1: CATEGORY SELECTION */}
                                {flowStep === 'category' && (
                                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '1rem', letterSpacing: '0.05em' }}>
                                            PASSO 1: SELECIONE A CATEGORIA
                                        </h3>
                                        <div id="categories-grid" className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                            {categories.map(cat => (
                                                <button 
                                                    key={cat.id} 
                                                    className="cat-btn"
                                                    onClick={() => {
                                                        setCurrentCategory(cat);
                                                        setFlowStep('product');
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', textAlign: 'left', width: '100%' }}
                                                >
                                                    <div className={`cat-icon-area ${cat.color || 'color-blue'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {/* Simple folder-like or box fallback icon */}
                                                        <Boxes size={20} />
                                                    </div>
                                                    <span className="cat-name" style={{ marginLeft: '1rem', flex: 1, fontWeight: '700' }}>{cat.name}</span>
                                                    <ChevronRight size={18} className="chevron" style={{ color: 'var(--text-secondary)' }} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* FLOW STEP 2: PRODUCT SELECTION & QUANTITY INPUT */}
                                {flowStep === 'product' && currentCategory && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Back to Category breadcrumb */}
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <button 
                                                onClick={() => { setFlowStep('category'); setCurrentCategory(null); }}
                                                className="btn-back"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                            >
                                                <ArrowLeft size={14} /> CATEGORIAS
                                            </button>
                                            <span style={{ margin: '0 0.8rem', color: 'var(--text-secondary)' }}>/</span>
                                            <span style={{ fontWeight: '700', color: 'var(--accent-orange)' }}>{currentCategory.name}</span>
                                        </div>

                                        {/* Products Table inside Category */}
                                        <div className="table-responsive">
                                            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                ITENS EM {currentCategory.name}
                                            </div>
                                            <table className="products-table">
                                                <thead>
                                                    <tr>
                                                        <th>SKU</th>
                                                        <th>Produto</th>
                                                        <th>Marca</th>
                                                        <th>Unidade</th>
                                                        <th>Estoque Atual</th>
                                                        <th style={{ width: '160px', textAlign: 'center' }}>
                                                            {flowType === 'entrada' ? 'Adicionar' : flowType === 'saida' ? 'Retirar' : flowType === 'perdas' ? 'Descartar' : 'Solicitar'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {products.filter(p => p.category === currentCategory.name && p.status === 'Ativo').length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                                Nenhum produto cadastrado nesta categoria.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        products.filter(p => p.category === currentCategory.name && p.status === 'Ativo').map(prod => {
                                                            const cartItem = cart.find(c => c.sku === prod.sku);
                                                            const displayVal = cartItem ? cartItem.quantity.toString() : '';

                                                            return (
                                                                <tr key={prod.sku}>
                                                                    <td><strong>{prod.sku}</strong></td>
                                                                    <td>
                                                                        <div className="product-desc">
                                                                            <span style={{ fontWeight: '700' }}>{prod.name}</span>
                                                                            <span>{prod.desc || 'Sem descrição.'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <span style={{ 
                                                                            color: 'var(--accent-orange)', 
                                                                            fontWeight: '600', 
                                                                            fontSize: '0.75rem',
                                                                            textTransform: 'uppercase'
                                                                        }}>
                                                                            {prod.brand || 'Sem Marca'}
                                                                        </span>
                                                                    </td>
                                                                    <td>{prod.unit}</td>
                                                                    <td>{prod.stock}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input 
                                                                            type="text" 
                                                                            className="qty-input"
                                                                            placeholder="--"
                                                                            value={displayVal}
                                                                            readOnly
                                                                            onClick={() => openNumpad(prod)}
                                                                            style={{ cursor: 'pointer', caretColor: 'transparent' }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Cart Bar for Solicitação tab */}
                                {flowType === 'solicitacao' && cart.length > 0 && (
                                    <div id="solicitacao-cart-bar" className="cart-bar" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'rgba(255, 90, 0, 0.15)',
                                        border: '1px solid var(--accent-orange)',
                                        padding: '1.2rem 2rem',
                                        borderRadius: '12px',
                                        marginTop: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <ShoppingCart style={{ color: 'var(--accent-orange)' }} />
                                            <span id="cart-bar-summary" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {cart.length} item(ns) selecionado(s) para solicitação
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button className="btn-clear-modal" onClick={() => setCart([])}>LIMPAR TUDO</button>
                                            <button className="btn-confirm-modal" onClick={handleSubmitRequests}>ENVIAR SOLICITAÇÃO</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: CONTROLE DE PENDÊNCIAS (SUPERVISOR PANEL) */}
                        {activeTab === 'aprovacoes' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ShieldCheck style={{ color: 'var(--accent-orange)' }} /> Painel de Liberações e Pendências
                                    </h2>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Produto</th>
                                                <th>Quantidade</th>
                                                <th>Solicitado Por</th>
                                                <th>Setor / Função</th>
                                                <th>Data da Solicitação</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        Nenhuma solicitação de insumos registrada no sistema.
                                                    </td>
                                                </tr>
                                            ) : (
                                                [...requests].reverse().map(req => {
                                                    const isPending = req.status === 'Pendente';
                                                    let badgeClass = 'badge-entregue';
                                                    if (req.status === 'Pendente') badgeClass = 'badge-pendente';
                                                    if (req.status === 'Recusado') badgeClass = 'badge-recusado';

                                                    return (
                                                        <tr key={req.id}>
                                                            <td>
                                                                <strong>{req.itemName}</strong>
                                                                <br />
                                                                <small style={{ color: 'var(--text-secondary)' }}>{req.itemSku}</small>
                                                            </td>
                                                            <td><span style={{ fontWeight: '700' }}>{req.quantity}</span></td>
                                                            <td>{req.requestedBy}</td>
                                                            <td>
                                                                <span className="category-tag" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)' }}>
                                                                    {req.sector || 'COZINHA'}
                                                                </span>
                                                                <br />
                                                                <small style={{ color: 'var(--text-secondary)' }}>{req.area || 'Auxiliar'}</small>
                                                            </td>
                                                            <td><small>{req.requestedAt}</small></td>
                                                            <td>
                                                                {/* Map styles manually to match consolidated index.css */}
                                                                <span className={`status-badge ${badgeClass}`} style={{
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase',
                                                                    background: req.status === 'Pendente' ? 'rgba(245, 158, 11, 0.15)' : (req.status === 'Entregue' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                                                    color: req.status === 'Pendente' ? 'var(--accent-orange)' : (req.status === 'Entregue' ? 'var(--accent-green)' : 'var(--accent-red)'),
                                                                    border: req.status === 'Pendente' ? '1px solid rgba(245, 158, 11, 0.3)' : (req.status === 'Entregue' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'),
                                                                }}>
                                                                    {req.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {isPending ? (
                                                                    canApprove ? (
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                            <button 
                                                                                className="action-btn-sm" 
                                                                                onClick={() => handleApproveRequest(req.id)}
                                                                                title="Aprovar entrega"
                                                                                style={{ color: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                            >
                                                                                <Check size={16} />
                                                                            </button>
                                                                            <button 
                                                                                className="action-btn-sm" 
                                                                                onClick={() => handleRejectRequest(req.id)}
                                                                                title="Recusar solicitação"
                                                                                style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                            Aguardando Supervisor
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                        Liberação por: {req.approvedBy}
                                                                    </span>
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
                        )}
                    </>
                )}
            </div>

            {/* =============================================
                MODAL 1: NUMPAD DIALOG
            ============================================= */}
            {showNumpad && numpadProduct && (
                <div className="pin-modal-overlay active" style={{ zIndex: 1000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '400px', border: '1px solid var(--accent-orange)' }}>
                        <button className="btn-close-modal" onClick={() => setShowNumpad(false)} title="Fechar">
                            <X size={18} />
                        </button>
                        
                        <div className="pin-container" style={{ padding: '1rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    DEFINIR QUANTIDADE
                                </span>
                                <h3 style={{ margin: '0.3rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                    {numpadProduct.name}
                                </h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-orange)', fontWeight: '600' }}>
                                    Unidade: {numpadProduct.unit} | Estoque: {numpadProduct.stock}
                                </span>
                            </div>

                            <div className="pin-entry-area" style={{ width: '100%' }}>
                                <input 
                                    type="text" 
                                    value={numpadValue || '0'} 
                                    readOnly 
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        textAlign: 'center',
                                        fontSize: '1.8rem',
                                        fontWeight: '700',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        outline: 'none'
                                    }}
                                />

                                <div className="numpad" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button 
                                            key={num} 
                                            className="num-key" 
                                            onClick={() => handleNumpadKey(num.toString())}
                                            style={{ height: '55px', fontSize: '1.2rem' }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button className="num-key action-key" onClick={() => handleNumpadKey('C')} style={{ height: '55px', fontSize: '0.9rem' }}>C</button>
                                    <button className="num-key" onClick={() => handleNumpadKey('0')} style={{ height: '55px', fontSize: '1.2rem' }}>0</button>
                                    <button className="num-key action-key" onClick={() => handleNumpadKey('del')} style={{ height: '55px' }}>
                                        Apagar
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn-clear-modal" style={{ flex: 1 }} onClick={() => setShowNumpad(false)}>
                                        CANCELAR
                                    </button>
                                    <button className="btn-confirm-modal" style={{ flex: 1 }} onClick={confirmNumpad}>
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =============================================
                MODAL 2: CONFIRMATION DIALOG
            ============================================= */}
            {showConfirm && pendingProduct && (
                <div className="pin-modal-overlay active" style={{ zIndex: 1000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <AlertTriangle size={48} style={{ color: flowType === 'entrada' ? 'var(--accent-green)' : (flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)') }} />
                            
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                Confirmar Movimentação de Estoque
                            </h3>

                            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0.5rem 0' }}>
                                Deseja registrar a {flowType === 'entrada' ? 'entrada' : flowType === 'saida' ? 'retirada' : 'perda/descarte'} de{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{pendingQty} {pendingProduct.unit}</strong> de{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{pendingProduct.name}</strong>?
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
                                <button className="btn-clear-modal" style={{ flex: 1 }} onClick={() => { setShowConfirm(false); setPendingProduct(null); }}>
                                    CANCELAR
                                </button>
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ 
                                        flex: 1,
                                        backgroundColor: flowType === 'entrada' ? 'var(--accent-green)' : (flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)'),
                                        color: flowType === 'perdas' ? '#422006' : 'white'
                                    }} 
                                    onClick={handleConfirmAction}
                                >
                                    CONFIRMAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =============================================
                MODAL 3: REASON DIALOG (FOR LOSSES)
            ============================================= */}
            {showReason && pendingProduct && (
                <div className="pin-modal-overlay active" style={{ zIndex: 1000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trash2 size={24} style={{ color: 'var(--accent-yellow)' }} />
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Motivo do Descarte</h3>
                            </div>
                            
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                Selecione a causa do descarte de <strong>{pendingQty} {pendingProduct.unit}</strong> de <strong>{pendingProduct.name}</strong>:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {[
                                    'Validade Vencida',
                                    'Avaria / Embalagem Danificada',
                                    'Desperdício de Preparação',
                                    'Problema de Temperatura / Armazenamento',
                                    'Outros'
                                ].map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => setSelectedReason(reason)}
                                        className="reason-btn"
                                        style={{
                                            padding: '1rem',
                                            textAlign: 'left',
                                            background: selectedReason === reason ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card-hover)',
                                            border: '1px solid',
                                            borderColor: selectedReason === reason ? 'var(--accent-yellow)' : 'var(--border-color)',
                                            color: selectedReason === reason ? 'var(--accent-yellow)' : 'var(--text-primary)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: selectedReason === reason ? '700' : '500',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.2rem' }}>
                                <button className="btn-clear-modal" style={{ flex: 1 }} onClick={() => { setShowReason(false); setPendingProduct(null); }}>
                                    CANCELAR
                                </button>
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ flex: 1, backgroundColor: 'var(--accent-yellow)', color: '#422006' }} 
                                    onClick={handleConfirmReason}
                                >
                                    REGISTRAR DESCARTE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
