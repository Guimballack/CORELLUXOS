/**
 * Corellux OS - Logistics Hub (Inventory, WMS, and Requests)
 * Módulo operacional de controle de estoque reativo em React.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    ChevronDown,
    Clock,
    AlertTriangle, 
    CheckCircle2, 
    ArrowLeft, 
    ShoppingCart,
    Send,
    Eye,
    ShieldCheck,
    FileText,
    History,
    Delete
} from 'lucide-react';

const indirectEval = eval;

export default function LogisticsHub() {
    const [state, setKey] = useCorelluxState(['currentUser', 'logisticsActiveTab', 'inventorySearch']);
    
    // Core Data States
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // WMS/FEFO States
    const [stockBatches, setStockBatches] = useState([]);
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchModalMode, setBatchModalMode] = useState('add'); // 'add', 'edit'
    const [editingBatch, setEditingBatch] = useState(null);
    const [batchProduct, setBatchProduct] = useState(null);
    
    // Form fields for Batch Modal
    const [batchLot, setBatchLot] = useState('');
    const [batchQty, setBatchQty] = useState('');
    const [batchAddress, setBatchAddress] = useState('');
    const [batchBrand, setBatchBrand] = useState('');
    const [batchSupplier, setBatchSupplier] = useState('');
    const [batchMfgDate, setBatchMfgDate] = useState('');
    const [batchExpDate, setBatchExpDate] = useState('');

    const toggleExpandItem = (sku) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(sku)) {
                next.delete(sku);
            } else {
                next.add(sku);
            }
            return next;
        });
    };

    // Tab Navigation (bound to global state)
    const activeTab = state.logisticsActiveTab || 'menu';
    const setActiveTab = (tab) => setKey('logisticsActiveTab', tab);
    
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
    const [inventoryCategory, setInventoryCategory] = useState('ALL');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    // Cart for requests
    const [cart, setCart] = useState([]);

    // Load Data & Reset Active Tab
    useEffect(() => {
        setKey('logisticsActiveTab', 'menu');
        setKey('inventorySearch', '');
        const loadAllData = async () => {
            setLoading(true);
            try {
                const [prodsData, catsData, batchesData] = await Promise.all([
                    DbService.getProducts(),
                    DbService.getCategories(),
                    DbService.getStockBatches()
                ]);
                setProducts(prodsData);
                setCategories(catsData.filter(c => c.status === 'Ativo'));
                setStockBatches(batchesData);
                
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
    // WMS & FEFO METHODS
    // =============================================

    const getBatchExpiryStatus = (expDateStr) => {
        if (!expDateStr) return { label: 'Sem Validade', className: 'stock-ok', days: 999 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(expDateStr);
        expDate.setHours(0, 0, 0, 0);
        
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { label: 'VENCIDO', className: 'stock-out', days: diffDays };
        } else if (diffDays <= 30) {
            return { label: `Vence em ${diffDays}d`, className: 'stock-low', days: diffDays };
        } else if (diffDays <= 60) {
            return { label: `Atenção (${diffDays}d)`, className: 'stock-low', days: diffDays }; // Usar cores existentes
        } else {
            return { label: 'OK', className: 'stock-ok', days: diffDays };
        }
    };

    const calculateFefoPlan = (sku, qty) => {
        const productBatches = stockBatches
            .filter(b => b.itemSku === sku && b.quantity > 0)
            .sort((a, b) => {
                if (!a.expirationDate) return 1;
                if (!b.expirationDate) return -1;
                return new Date(a.expirationDate) - new Date(b.expirationDate);
            });

        let remainingQty = qty;
        const plan = [];
        
        for (const b of productBatches) {
            if (remainingQty <= 0) break;
            const take = Math.min(b.quantity, remainingQty);
            plan.push({
                batch: b,
                quantityToTake: take
            });
            remainingQty -= take;
        }

        return {
            plan,
            remainingUnallocated: remainingQty
        };
    };

    const deductStockFromBatchesFefo = async (sku, qty) => {
        const result = calculateFefoPlan(sku, qty);
        for (const item of result.plan) {
            const batch = item.batch;
            const newQty = batch.quantity - item.quantityToTake;
            if (newQty <= 0) {
                await DbService.deleteStockBatch(batch.id);
            } else {
                await DbService.updateStockBatch(batch.id, {
                    quantity: newQty,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        await recalculateProductStockFromBatches();
    };

    const recalculateProductStockFromBatches = async () => {
        const latestBatches = await DbService.getStockBatches();
        setStockBatches(latestBatches);

        const stockBySku = {};
        latestBatches.forEach(b => {
            if (!stockBySku[b.itemSku]) {
                stockBySku[b.itemSku] = 0;
            }
            stockBySku[b.itemSku] += parseFloat(b.quantity || 0);
        });

        const latestProducts = await DbService.getProducts();
        for (const p of latestProducts) {
            const hasBatches = latestBatches.some(b => b.itemSku === p.sku);
            if (hasBatches) {
                const newStock = stockBySku[p.sku] || 0;
                if (p.stock !== newStock) {
                    await DbService.updateProductStock(p.sku, newStock);
                }
            }
        }

        const refreshedProducts = await DbService.getProducts();
        setProducts(refreshedProducts);
    };

    const handleOpenAddBatch = (product) => {
        setBatchProduct(product);
        setBatchModalMode('add');
        setEditingBatch(null);
        
        setBatchLot('');
        setBatchQty('');
        setBatchAddress('');
        setBatchBrand(product.brand || '');
        setBatchSupplier('');
        setBatchMfgDate('');
        setBatchExpDate('');
        
        setShowBatchModal(true);
    };

    const handleOpenEditBatch = (product, batch) => {
        setBatchProduct(product);
        setBatchModalMode('edit');
        setEditingBatch(batch);
        
        setBatchLot(batch.lot);
        setBatchQty(batch.quantity);
        setBatchAddress(batch.address || '');
        setBatchBrand(batch.brand || '');
        setBatchSupplier(batch.supplier || '');
        setBatchMfgDate(batch.manufacturingDate ? batch.manufacturingDate.substring(0, 10) : '');
        setBatchExpDate(batch.expirationDate ? batch.expirationDate.substring(0, 10) : '');
        
        setShowBatchModal(true);
    };

    const handleDeleteBatch = async (batchId) => {
        if (window.confirm('Tem certeza que deseja remover este lote permanentemente?')) {
            const result = await DbService.deleteStockBatch(batchId);
            if (result.success) {
                setStockBatches(prev => prev.filter(b => b.id !== batchId));
                await recalculateProductStockFromBatches();
                alert('Lote removido com sucesso!');
            } else {
                alert('Falha ao remover o lote.');
            }
        }
    };

    const handleSaveBatch = async (e) => {
        e.preventDefault();
        
        if (!batchLot || !batchQty) {
            alert('Por favor, preencha o código do lote e a quantidade.');
            return;
        }

        const qtyNum = parseFloat(batchQty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            alert('A quantidade deve ser um número maior que zero.');
            return;
        }

        const batchData = {
            itemSku: batchProduct.sku,
            lot: batchLot,
            quantity: qtyNum,
            unit: batchProduct.unit,
            address: batchAddress,
            brand: batchBrand,
            supplier: batchSupplier,
            manufacturingDate: batchMfgDate ? batchMfgDate : null,
            expirationDate: batchExpDate ? batchExpDate : null,
            updatedAt: new Date().toISOString()
        };

        if (batchModalMode === 'add') {
            batchData.createdAt = new Date().toISOString();
            const result = await DbService.addStockBatch(batchData);
            if (result.success) {
                alert('Lote cadastrado com sucesso!');
            } else {
                alert('Erro ao cadastrar lote.');
            }
        } else {
            const result = await DbService.updateStockBatch(editingBatch.id, batchData);
            if (result.success) {
                alert('Lote atualizado com sucesso!');
            } else {
                alert('Erro ao atualizar lote.');
            }
        }

        setShowBatchModal(false);
        await recalculateProductStockFromBatches();
    };

    const renderLotesSection = (product) => {
        const itemBatches = stockBatches.filter(b => b.itemSku === product.sku);

        if (itemBatches.length === 0) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1rem',
                    background: 'rgba(0, 0, 0, 0.12)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)',
                    textAlign: 'center',
                    gap: '1rem',
                    marginTop: '0.5rem',
                    width: '100%'
                }}>
                    <Boxes size={36} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Nenhum lote cadastrado para este item.
                    </span>
                    <button
                        type="button"
                        onClick={() => handleOpenAddBatch(product)}
                        style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid var(--accent-purple)',
                            color: 'var(--accent-purple)',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        + Cadastrar Primeiro Lote
                    </button>
                </div>
            );
        }

        return (
            <div style={{
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                padding: '0.5rem',
                marginTop: '0.5rem',
                overflowX: 'auto',
                width: '100%'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Lote</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Quantidade</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Validade</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Endereço</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Marca / Fornecedor</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemBatches.map(b => {
                            const expiry = getBatchExpiryStatus(b.expirationDate);
                            return (
                                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <strong style={{
                                            fontFamily: 'monospace',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 255, 255, 0.08)'
                                        }}>
                                            {b.lot}
                                        </strong>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: '700' }}>
                                        {b.quantity} {b.unit || product.unit}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                        <span className={`stock-badge ${expiry.className}`} style={{ minWidth: '90px', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                                            {expiry.label}
                                        </span>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                            {b.expirationDate ? new Date(b.expirationDate).toLocaleDateString('pt-BR') : 'Sem Data'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-teal)' }}>
                                        {b.address || 'N/A'}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '500' }}>{b.brand || product.brand || 'Sem Marca'}</span>
                                            <small style={{ color: 'var(--text-secondary)' }}>{b.supplier || 'N/A'}</small>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditBatch(product, b)}
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    color: '#60a5fa',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBatch(b.id)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: '#f87171',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
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
        const searchVal = state.inventorySearch || '';
        const matchesSearch = 
            p.sku.toLowerCase().includes(searchVal.toLowerCase()) ||
            p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
            (p.brand && p.brand.toLowerCase().includes(searchVal.toLowerCase()));
        
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

        const productBatches = stockBatches.filter(b => b.itemSku === sku);

        if (productBatches.length > 0 && (flowType === 'saida' || flowType === 'perdas')) {
            await deductStockFromBatchesFefo(sku, pendingQty);
            alert(`Estoque atualizado com sucesso via FEFO para o item: ${pendingProduct.name}.`);
        } else {
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

        const productBatches = stockBatches.filter(b => b.itemSku === req.itemSku);
        let confirmMsg = `Aprovar entrega de ${req.quantity} ${product.unit} de "${req.itemName}"?`;
        
        if (productBatches.length > 0) {
            const fefo = calculateFefoPlan(req.itemSku, req.quantity);
            const planDetails = fefo.plan.map(item => `  - Lote: ${item.batch.lot} (Val: ${item.batch.expirationDate ? new Date(item.batch.expirationDate).toLocaleDateString('pt-BR') : 'Sem Data'}) -> Qtd: -${item.quantityToTake}`).join('\n');
            confirmMsg += `\n\nResumo de Dedução FEFO:\n${planDetails}`;
            if (fefo.remainingUnallocated > 0) {
                confirmMsg += `\n\nAVISO: ${fefo.remainingUnallocated} ${product.unit} sem lote específico correspondente (será deduzido do saldo global).`;
            }
        }

        if (window.confirm(confirmMsg)) {
            if (productBatches.length > 0) {
                await deductStockFromBatchesFefo(req.itemSku, req.quantity);
            } else {
                const newStock = product.stock - req.quantity;
                await DbService.updateProductStock(req.itemSku, newStock);
                setProducts(prev => prev.map(p => p.sku === req.itemSku ? { ...p, stock: newStock } : p));
            }

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
            
            {/* Inner Dashboard View */}
            <div className="tab-content" style={{ flex: 1, padding: activeTab === 'menu' ? '0' : '2rem', overflowY: 'auto', position: 'relative' }}>
                
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
                        {/* CARD MENU FOR LOGISTICS HUB */}
                        {activeTab === 'menu' && (
                            <div className="dashboard-menu">
                                <button 
                                    className="menu-card blue" 
                                    onClick={() => setActiveTab('estoque')}
                                >
                                    <div className="card-icon"><Boxes size={24} /></div>
                                    <div className="card-content">
                                        <h3>VISÃO GERAL DO ESTOQUE</h3>
                                        <p>Registro geral de itens, consulta de SKU, saldo atual e controle de validades por lote (FEFO).</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card orange" 
                                    onClick={() => {
                                        setActiveTab('movimentar');
                                        setFlowType('entrada');
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><History size={24} /></div>
                                    <div className="card-content">
                                        <h3>MOVIMENTAR ESTOQUE</h3>
                                        <p>Registrar entradas, saídas operacionais e descarte de produtos por perdas.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card yellow" 
                                    onClick={() => {
                                        setActiveTab('solicitacao');
                                        setFlowType('solicitacao');
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><ShoppingCart size={24} /></div>
                                    <div className="card-content">
                                        <h3>SOLICITAÇÃO DE INSUMOS</h3>
                                        <p>Criar solicitações e pedidos de insumos para cozinha ou outros setores operacionais.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card green" 
                                    onClick={() => setActiveTab('aprovacoes')}
                                >
                                    <div className="card-icon">
                                        <ShieldCheck size={24} />
                                        {requests.filter(r => r.status === 'Pendente').length > 0 && (
                                            <span className="notification-badge" style={{ backgroundColor: 'var(--accent-red)' }}>
                                                {requests.filter(r => r.status === 'Pendente').length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="card-content">
                                        <h3>CONTROLE DE PENDÊNCIAS</h3>
                                        <p>Visualizar e autorizar solicitações de retirada de insumos (acesso restrito).</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>
                            </div>
                        )}
                        {/* TAB 1: VISÃO GERAL DO ESTOQUE */}
                        {activeTab === 'estoque' && (
                            <div className="products-container">


                                {/* Table */}
                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '50px' }}></th>
                                                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', minWidth: '100px' }} className={sortField === 'sku' ? 'active-sort' : ''}>
                                                    SKU {sortField === 'sku' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: '220px' }} className={sortField === 'name' ? 'active-sort' : ''}>
                                                    Produto {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('brand')} style={{ cursor: 'pointer', minWidth: '120px' }} className={sortField === 'brand' ? 'active-sort' : ''}>
                                                    Marca {sortField === 'brand' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th style={{ minWidth: '90px' }}>Unidade</th>
                                                <th 
                                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                    style={{ position: 'relative', minWidth: '170px', cursor: 'pointer', userSelect: 'none' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            Categoria
                                                            <ChevronDown size={14} style={{ transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', opacity: 0.8 }} />
                                                        </span>
                                                        {inventoryCategory !== 'ALL' && (
                                                            <span style={{ 
                                                                fontSize: '0.7rem', 
                                                                background: 'var(--accent-orange)', 
                                                                color: '#fff', 
                                                                padding: '0.15rem 0.4rem', 
                                                                borderRadius: '4px',
                                                                textTransform: 'uppercase',
                                                                fontWeight: 'bold',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {inventoryCategory}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {isCategoryDropdownOpen && (
                                                        <div 
                                                            className="custom-dropdown-menu"
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                right: 0,
                                                                left: 0,
                                                                marginTop: '0.3rem',
                                                                background: 'rgba(15, 23, 42, 0.98)',
                                                                backdropFilter: 'blur(12px)',
                                                                WebkitBackdropFilter: 'blur(12px)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                borderRadius: '8px',
                                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                                                zIndex: 100,
                                                                maxHeight: '220px',
                                                                overflowY: 'auto',
                                                                padding: '0.25rem',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '2px',
                                                                textTransform: 'none',
                                                                fontWeight: 'normal'
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div 
                                                                onClick={() => { setInventoryCategory('ALL'); setIsCategoryDropdownOpen(false); }}
                                                                style={{
                                                                    padding: '0.4rem 0.5rem',
                                                                    cursor: 'pointer',
                                                                    background: inventoryCategory === 'ALL' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                                                                    color: inventoryCategory === 'ALL' ? '#fff' : 'var(--text-secondary)',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: inventoryCategory === 'ALL' ? '600' : '400',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                            >
                                                                <span>Todas</span>
                                                                {inventoryCategory === 'ALL' && <Check size={11} color="#c084fc" />}
                                                            </div>
                                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.1rem 0' }} />
                                                            {categories.map(c => (
                                                                <div 
                                                                    key={c.id} 
                                                                    onClick={() => { setInventoryCategory(c.name); setIsCategoryDropdownOpen(false); }}
                                                                    style={{
                                                                        padding: '0.4rem 0.5rem',
                                                                        cursor: 'pointer',
                                                                        background: inventoryCategory === c.name ? 'rgba(243, 107, 29, 0.15)' : 'transparent',
                                                                        color: inventoryCategory === c.name ? '#fff' : 'var(--text-secondary)',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: inventoryCategory === c.name ? '600' : '400',
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between'
                                                                    }}
                                                                >
                                                                    <span>{c.name}</span>
                                                                    {inventoryCategory === c.name && <Check size={11} color="var(--accent-orange)" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </th>
                                                <th style={{ textAlign: 'center' }}>Mínimo</th>
                                                <th style={{ textAlign: 'center' }}>Médio</th>
                                                <th style={{ textAlign: 'center' }}>Máximo</th>
                                                <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '190px' }} className={sortField === 'stock' ? 'active-sort' : ''}>
                                                    Estoque Atual {sortField === 'stock' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInventory.length === 0 ? (
                                                <tr>
                                                    <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum produto correspondente aos filtros foi localizado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredInventory.map(p => {
                                                    const minVal = p.minStock || 0;
                                                    const isLow = p.stock <= minVal;
                                                    const isOut = p.stock <= 0;
                                                    const isExpanded = expandedItems.has(p.sku);
                                                    
                                                    // Expiration checks for FEFO warning tags
                                                    const productBatches = stockBatches.filter(b => b.itemSku === p.sku);
                                                    const hasExpired = productBatches.some(b => getBatchExpiryStatus(b.expirationDate).label === 'VENCIDO');
                                                    const hasExpiringSoon = productBatches.some(b => {
                                                        const status = getBatchExpiryStatus(b.expirationDate);
                                                        return status.label !== 'VENCIDO' && status.label.startsWith('Vence em');
                                                    });

                                                    return (
                                                        <React.Fragment key={p.sku}>
                                                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)' }}>
                                                                <td style={{ textAlign: 'center', paddingLeft: '1rem', paddingRight: '0.5rem' }}>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => toggleExpandItem(p.sku)}
                                                                        style={{
                                                                            background: isExpanded ? 'var(--accent-orange)' : 'rgba(168, 85, 247, 0.12)',
                                                                            border: isExpanded ? '1px solid var(--accent-orange)' : '1px solid rgba(168, 85, 247, 0.3)',
                                                                            color: isExpanded ? '#fff' : '#c084fc',
                                                                            padding: '0.35rem',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            transition: 'all 0.2s',
                                                                            width: '28px',
                                                                            height: '28px'
                                                                        }}
                                                                    >
                                                                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                    </button>
                                                                </td>
                                                                <td><strong>{p.sku}</strong></td>
                                                                <td>
                                                                    <div className="product-desc" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontWeight: '700' }}>{p.name}</span>
                                                                            <span style={{ 
                                                                                background: 'rgba(168, 85, 247, 0.15)', 
                                                                                color: '#c084fc', 
                                                                                border: '1px solid rgba(168, 85, 247, 0.3)', 
                                                                                fontSize: '0.65rem', 
                                                                                fontWeight: '700', 
                                                                                padding: '0.1rem 0.35rem', 
                                                                                borderRadius: '4px',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '0.2rem',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: '0.5px'
                                                                            }}>
                                                                                <Boxes size={10} /> WMS
                                                                            </span>
                                                                        </div>
                                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.desc || 'Nenhuma descrição fornecida.'}</span>
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
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                                                                        {isOut ? (
                                                                            <span className="stock-badge stock-out"><X size={12} /> ZERADO</span>
                                                                        ) : isLow ? (
                                                                            <span className="stock-badge stock-low"><AlertTriangle size={12} /> {p.stock} {p.unit}</span>
                                                                        ) : (
                                                                            <span className="stock-badge stock-ok"><Check size={12} /> {p.stock} {p.unit}</span>
                                                                        )}
                                                                        {hasExpired && (
                                                                            <span className="stock-badge stock-out" style={{ minWidth: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} title="Lote Vencido!">
                                                                                <AlertTriangle size={11} /> LOTE VENCIDO
                                                                            </span>
                                                                        )}
                                                                        {hasExpiringSoon && !hasExpired && (
                                                                            <span className="stock-badge stock-low" style={{ minWidth: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} title="Lote próximo do vencimento">
                                                                                <Clock size={11} /> VENC. PRÓXIMO
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
                                                                    <td></td>
                                                                    <td colSpan="9" style={{ padding: '1rem 1.5rem', borderLeft: '4px solid var(--accent-orange)' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                                    <Boxes size={14} style={{ color: 'var(--accent-orange)' }} /> LOTES — {p.name.toUpperCase()}
                                                                                </span>
                                                                                <span style={{
                                                                                    background: 'rgba(243, 107, 29, 0.15)',
                                                                                    color: 'var(--accent-orange)',
                                                                                    border: '1px solid rgba(243, 107, 29, 0.3)',
                                                                                    padding: '0.15rem 0.4rem',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.7rem',
                                                                                    fontWeight: '700',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.3rem'
                                                                                }}>
                                                                                    <Clock size={10} /> FEFO
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenAddBatch(p)}
                                                                                style={{
                                                                                    padding: '0.4rem 1rem',
                                                                                    fontSize: '0.75rem',
                                                                                    background: 'rgba(168, 85, 247, 0.15)',
                                                                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                                                                    color: '#c084fc',
                                                                                    borderRadius: '6px',
                                                                                    cursor: 'pointer',
                                                                                    fontWeight: 'bold',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.3rem',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                + Adicionar Lote
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        {renderLotesSection(p)}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
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
            {showNumpad && numpadProduct && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '400px', width: '90%', border: '1px solid #10b981', backgroundColor: '#111827', borderRadius: '16px', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '800', textTransform: 'uppercase' }}>
                                {flowType === 'entrada' ? 'ADICIONAR QUANTIDADE' : 'REMOVER QUANTIDADE'}
                            </h3>
                            <button onClick={() => setShowNumpad(false)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0px #b91c1c', transition: 'transform 0.1s, box-shadow 0.1s' }} onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0px #b91c1c'; }} onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0px #b91c1c'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0px #b91c1c'; }}>
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="pin-container" style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 0.4rem 0', color: '#ffffff', fontSize: '1.2rem', fontWeight: '500' }}>
                                    {numpadProduct.name}
                                </h4>
                                <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', marginBottom: '1rem' }}>
                                    Unidade: {numpadProduct.unit} | Estoque: {numpadProduct.stock}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Quantidade</div>
                                <input 
                                    type="text" 
                                    value={numpadValue || ''} 
                                    readOnly 
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#0a0d14',
                                        border: '1px solid #10b981',
                                        color: '#ffffff',
                                        textAlign: 'left',
                                        fontSize: '1.8rem',
                                        fontWeight: '700',
                                        padding: '0.8rem 1rem',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </div>

                            <div className="pin-entry-area" style={{ width: '100%' }}>
                                <div className="numpad" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.8rem', width: '100%' }}>
                                    {[{l:'7',v:'7'},{l:'8',v:'8'},{l:'9',v:'9'},{l:<Delete size={20} />,v:'del'}].map((k, i) => (
                                        <button key={'r1'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '65px', fontSize: '1.4rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'4',v:'4'},{l:'5',v:'5'},{l:'6',v:'6'},{l:'x',v:'*'}].map((k, i) => (
                                        <button key={'r2'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '65px', fontSize: '1.4rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'1',v:'1'},{l:'2',v:'2'},{l:'3',v:'3'},{l:'-',v:'-'}].map((k, i) => (
                                        <button key={'r3'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '65px', fontSize: '1.4rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'0',v:'0'},{l:',',v:','},{l:'+',v:'+'},{l:'=',v:'=', g:true}].map((k, i) => (
                                        <button key={'r4'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '65px', fontSize: '1.5rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: k.g ? '#10b981' : '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn-confirm-modal" onClick={confirmNumpad} style={{ flex: 1, padding: '1rem', fontSize: '1rem', borderRadius: '8px' }}>
                                        Confirmar
                                    </button>
                                    <button className="btn-clear-modal" onClick={() => handleNumpadKey('C')} style={{ flex: 1, padding: '1rem', fontSize: '1rem', borderRadius: '8px' }}>
                                        Limpar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL 2: CONFIRMATION DIALOG
            ============================================= */}
            {showConfirm && pendingProduct && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
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

                            {/* FEFO Allocation Preview */}
                            {(flowType === 'saida' || flowType === 'perdas') && (() => {
                                const productBatches = stockBatches.filter(b => b.itemSku === pendingProduct.sku);
                                if (productBatches.length > 0) {
                                    const fefo = calculateFefoPlan(pendingProduct.sku, pendingQty);
                                    return (
                                        <div style={{ 
                                            width: '100%', 
                                            background: 'rgba(0, 0, 0, 0.25)', 
                                            borderRadius: '8px', 
                                            padding: '0.75rem', 
                                            border: '1px solid var(--border-color)', 
                                            textAlign: 'left',
                                            marginTop: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-orange)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Clock size={12} /> PROPOSTA DE SAÍDA FEFO (VENCIMENTO MAIS PRÓXIMO):
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {fefo.plan.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                        <span>Lote <strong>{item.batch.lot}</strong> (Val. {item.batch.expirationDate ? new Date(item.batch.expirationDate).toLocaleDateString('pt-BR') : 'Sem Data'}):</span>
                                                        <span><strong>-{item.quantityToTake} {pendingProduct.unit}</strong></span>
                                                    </div>
                                                ))}
                                                {fefo.remainingUnallocated > 0 && (
                                                    <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                                        Atenção: {fefo.remainingUnallocated} {pendingProduct.unit} não puderam ser alocados em lotes! (Será deduzido do saldo global)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

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
            , document.body)}

            {/* =============================================
                MODAL 3: REASON DIALOG (FOR LOSSES)
            ============================================= */}
            {showReason && pendingProduct && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
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
            , document.body)}

            {/* =============================================
                MODAL 4: BATCH REGISTRATION/EDIT
            ============================================= */}
            {showBatchModal && batchProduct && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setShowBatchModal(false)} title="Fechar">
                            <X size={18} />
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
                            <Boxes size={22} style={{ color: 'var(--accent-orange)' }} />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                {batchModalMode === 'add' ? 'Cadastrar Novo Lote' : 'Editar Lote'}
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>PRODUTO</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{batchProduct.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {batchProduct.sku}</span>
                        </div>

                        <form onSubmit={handleSaveBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>CÓDIGO DO LOTE *</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: LOT-2026-A"
                                        value={batchLot}
                                        onChange={(e) => setBatchLot(e.target.value.toUpperCase())}
                                        required
                                        maxLength="12"
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>QUANTIDADE ({batchProduct.unit}) *</label>
                                    <input 
                                        type="number"
                                        step="any"
                                        placeholder="Ex: 50"
                                        value={batchQty}
                                        onChange={(e) => setBatchQty(e.target.value)}
                                        required
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>ENDEREÇO WMS</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: A-12-3"
                                        value={batchAddress}
                                        onChange={(e) => setBatchAddress(e.target.value.toUpperCase())}
                                        maxLength="15"
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>MARCA</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: Nestlé"
                                        value={batchBrand}
                                        onChange={(e) => setBatchBrand(e.target.value)}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>FORNECEDOR</label>
                                <input 
                                    type="text"
                                    placeholder="Nome do fornecedor ou distribuidora"
                                    value={batchSupplier}
                                    onChange={(e) => setBatchSupplier(e.target.value)}
                                    style={{
                                        padding: '0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        width: '100%'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE FABRICAÇÃO</label>
                                    <input 
                                        type="date"
                                        value={batchMfgDate}
                                        onChange={(e) => setBatchMfgDate(e.target.value)}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE VALIDADE *</label>
                                    <input 
                                        type="date"
                                        value={batchExpDate}
                                        onChange={(e) => setBatchExpDate(e.target.value)}
                                        required
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.2rem' }}>
                                <button type="button" className="btn-clear-modal" style={{ flex: 1 }} onClick={() => setShowBatchModal(false)}>
                                    CANCELAR
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-confirm-modal" 
                                    style={{ flex: 1, backgroundColor: 'var(--accent-orange)', color: '#fff' }}
                                >
                                    {batchModalMode === 'add' ? 'SALVAR LOTE' : 'ATUALIZAR LOTE'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
