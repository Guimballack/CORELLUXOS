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
    Home,
    Calendar,
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
    Delete,
    Edit,
    Info,
    Warehouse
} from 'lucide-react';


const indirectEval = eval;

const limitChars = (str, limit) => {
    if (!str) return '';
    return str.length > limit ? str.substring(0, limit) + '.' : str;
};

const flowConfig = {
    entrada: {
        color: 'var(--accent-green)',
        bg: 'rgba(34, 197, 94, 0.1)',
        hoverBg: 'rgba(34, 197, 94, 0.2)',
        icon: ArrowUp
    },
    saida: {
        color: 'var(--accent-red)',
        bg: 'rgba(239, 68, 68, 0.1)',
        hoverBg: 'rgba(239, 68, 68, 0.2)',
        icon: ArrowDown
    },
    perdas: {
        color: 'var(--accent-yellow)',
        bg: 'rgba(234, 179, 8, 0.1)',
        hoverBg: 'rgba(234, 179, 8, 0.2)',
        icon: Trash2
    },
    solicitacao: {
        color: 'var(--accent-orange)',
        bg: 'rgba(243, 107, 29, 0.1)',
        hoverBg: 'rgba(243, 107, 29, 0.2)',
        icon: ShoppingCart
    }
};

export default function LogisticsHub() {
    const [state, setKey] = useCorelluxState(['currentUser', 'logisticsActiveTab', 'inventorySearch', 'logisticsFlowType', 'logisticsFlowStep']);
    
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
    const [customReasonText, setCustomReasonText] = useState('');
    const [selectedLossSector, setSelectedLossSector] = useState('');

    // Inventory Filtering & Sorting
    const [inventoryCategory, setInventoryCategory] = useState('ALL');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    // Cart for requests
    const [cart, setCart] = useState([]);

    // Loss records history
    const [lossRecords, setLossRecords] = useState([]);

    // Rejection Dialog States
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionTargetReqId, setRejectionTargetReqId] = useState(null);
    const [rejectionReasonText, setRejectionReasonText] = useState('');

    // Info Dialog States (for Rejection Info)
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoModalRequest, setInfoModalRequest] = useState(null);

    // Info Dialog States (for Loss Detail)
    const [showLossInfoModal, setShowLossInfoModal] = useState(false);
    const [infoModalLoss, setInfoModalLoss] = useState(null);

    // Requisition Sector States
    const [sectors, setSectors] = useState([]);
    const [selectedRequisitionSector, setSelectedRequisitionSector] = useState('');
    const [showCartModal, setShowCartModal] = useState(false);

    // Custom System dialog state
    const [systemDialog, setSystemDialog] = useState(null);

    const showSystemAlert = (message, title = 'Aviso', onConfirm = null) => {
        setSystemDialog({
            type: 'alert',
            title,
            message,
            onConfirm: () => {
                if (onConfirm) onConfirm();
            }
        });
    };

    const showSystemConfirm = (message, onConfirm, onCancel = null, title = 'Confirmação') => {
        setSystemDialog({
            type: 'confirm',
            title,
            message,
            onConfirm,
            onCancel
        });
    };



    // Load Data & Reset Active Tab
    useEffect(() => {
        setKey('logisticsActiveTab', 'menu');
        setKey('inventorySearch', '');
        const loadAllData = async () => {
            setLoading(true);
            try {
                const [prodsData, catsData, batchesData, sectorsData] = await Promise.all([
                    DbService.getProducts(),
                    DbService.getCategories(),
                    DbService.getStockBatches(),
                    DbService.getSectors()
                ]);
                setProducts(prodsData);
                setCategories(catsData.filter(c => c.status === 'Ativo'));
                setStockBatches(batchesData);
                setSectors(sectorsData || []);
                
                // Load requests from LocalStorage
                const savedRequests = localStorage.getItem('corellux_item_requests');
                if (savedRequests) {
                    setRequests(JSON.parse(savedRequests));
                } else {
                    setRequests([]);
                }

                // Load loss records from LocalStorage
                const savedLosses = localStorage.getItem('corellux_loss_records');
                if (savedLosses) {
                    setLossRecords(JSON.parse(savedLosses));
                } else {
                    setLossRecords([]);
                }
            } catch (err) {
                console.error('[LogisticsHub] Error loading initial data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Sync flowType with global store
    useEffect(() => {
        setKey('logisticsFlowType', flowType);
    }, [flowType]);

    // Sync flowStep with global store
    useEffect(() => {
        setKey('logisticsFlowStep', flowStep);
    }, [flowStep]);

    // Reset flowType when returning to menu
    useEffect(() => {
        if (activeTab === 'menu') {
            setFlowType(null);
        }
    }, [activeTab]);

    // Listen to custom XML import event from header
    useEffect(() => {
        const handleImport = () => {
            handleXmlImport();
        };
        window.addEventListener('corellux-import-xml', handleImport);
        return () => window.removeEventListener('corellux-import-xml', handleImport);
    }, []);

    // Listen to custom navigation back events from header
    useEffect(() => {
        const handleBackStep = () => {
            setFlowStep('category');
            setCurrentCategory(null);
        };
        const handleBackFlow = () => {
            setFlowType(null);
        };
        window.addEventListener('corellux-back-step', handleBackStep);
        window.addEventListener('corellux-back-flow', handleBackFlow);
        return () => {
            window.removeEventListener('corellux-back-step', handleBackStep);
            window.removeEventListener('corellux-back-flow', handleBackFlow);
        };
    }, []);

    // Save requests to LocalStorage when changed
    const saveRequests = (newRequests) => {
        setRequests(newRequests);
        localStorage.setItem('corellux_item_requests', JSON.stringify(newRequests));
    };

    // Save a single loss record to LocalStorage
    const saveLossRecord = (record) => {
        setLossRecords(prev => {
            const updated = [record, ...prev];
            localStorage.setItem('corellux_loss_records', JSON.stringify(updated));
            return updated;
        });
    };

    // =============================================
    // WMS & FEFO METHODS
    // =============================================

    const getBatchExpiryStatus = (expDateStr) => {
        if (!expDateStr) return { label: 'OK', className: 'expiry-ok', days: 999 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(expDateStr);
        expDate.setHours(0, 0, 0, 0);
        
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
            return { label: 'VENCE', className: 'expiry-danger', days: diffDays };
        } else if (diffDays <= 60) {
            return { label: 'ATENÇÃO', className: 'expiry-warning', days: diffDays };
        } else {
            return { label: 'OK', className: 'expiry-ok', days: diffDays };
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

    const [batchToDelete, setBatchToDelete] = useState(null);

    const handleDeleteBatch = (batch) => {
        setBatchToDelete(batch);
    };

    const confirmDeleteBatch = async (batchId) => {
        setBatchToDelete(null);
        const result = await DbService.deleteStockBatch(batchId);
        if (result.success) {
            setStockBatches(prev => prev.filter(b => b.id !== batchId));
            await recalculateProductStockFromBatches();
            showSystemAlert('Lote removido com sucesso!', 'Sucesso');
        } else {
            showSystemAlert('Falha ao remover o lote.', 'Erro');
        }
    };

    const handleSaveBatch = async (e) => {
        e.preventDefault();
        
        if (!batchLot || !batchQty) {
            showSystemAlert('Por favor, preencha o código do lote e a quantidade.', 'Atenção');
            return;
        }

        const qtyNum = parseFloat(batchQty);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            showSystemAlert('A quantidade deve ser um número maior que zero.', 'Atenção');
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
                showSystemAlert('Lote cadastrado com sucesso!', 'Sucesso');
            } else {
                showSystemAlert('Erro ao cadastrar lote.', 'Erro');
            }
        } else {
            const result = await DbService.updateStockBatch(editingBatch.id, batchData);
            if (result.success) {
                showSystemAlert('Lote atualizado com sucesso!', 'Sucesso');
            } else {
                showSystemAlert('Erro ao atualizar lote.', 'Erro');
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
                                        {b.address ? limitChars(b.address, 15) : 'N/A'}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '500' }}>{b.brand || product.brand || 'Sem Marca'}</span>
                                            <small style={{ color: 'var(--text-secondary)' }}>{b.supplier ? limitChars(b.supplier, 15) : 'N/A'}</small>
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
        showSystemAlert('Funcionalidade de importar XML de Nota Fiscal (NF-e) em desenvolvimento. A integração com APIs SEFAZ estará disponível em breve.', 'Integração');
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
            showSystemAlert('Quantidade deve ser maior que zero.', 'Atenção');
            return;
        }

        setShowNumpad(false);

        if (flowType === 'solicitacao') {
            // Validate availability
            if (parsedVal > numpadProduct.stock) {
                showSystemAlert(`Quantidade solicitada (${parsedVal}) maior que o estoque atual (${numpadProduct.stock} ${numpadProduct.unit}).`, 'Atenção');
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

        // PERDAS: does NOT change stock — only saves a loss record
        if (flowType === 'perdas') {
            const lossEntry = {
                id: Date.now(),
                sku: sku,
                productName: pendingProduct.name,
                unit: pendingProduct.unit,
                quantity: pendingQty,
                reason: reason || 'Não informado',
                customReason: reason === 'Outros' ? (customReasonText.trim() || 'Não especificado') : '',
                sector: selectedLossSector || 'Não informado',
                registeredBy: state.currentUser ? state.currentUser.name : 'Operador',
                registeredAt: new Date().toLocaleString('pt-BR')
            };
            saveLossRecord(lossEntry);
            showSystemAlert(`Perda registrada: ${pendingQty} ${pendingProduct.unit} de "${pendingProduct.name}" (${reason === 'Outros' && customReasonText ? customReasonText : reason}). Estoque não foi alterado.`, 'Descarte Registrado');

            // Reset flow
            setFlowStep('category');
            setCurrentCategory(null);
            setPendingProduct(null);
            setPendingQty(0);
            setSelectedReason('');
            setCustomReasonText('');
            setSelectedLossSector('');
            return;
        }

        // ENTRADA / SAIDA: change stock normally
        if (flowType === 'entrada') {
            newStock += pendingQty;
        } else if (flowType === 'saida') {
            newStock -= pendingQty;
            if (newStock < 0) newStock = 0;
        }

        const productBatches = stockBatches.filter(b => b.itemSku === sku);

        if (productBatches.length > 0 && flowType === 'saida') {
            await deductStockFromBatchesFefo(sku, pendingQty);
            showSystemAlert(`Estoque atualizado com sucesso via FEFO para o item: ${pendingProduct.name}.`, 'Sucesso');
        } else {
            // 1. Update on Supabase
            const result = await DbService.updateProductStock(sku, newStock);

            // 2. Update local state copy
            if (result.success) {
                setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
                showSystemAlert(`Estoque atualizado com sucesso para o item: ${pendingProduct.name}. Novo estoque: ${newStock} ${pendingProduct.unit}`, 'Sucesso');
            } else {
                // Even if Supabase fails, update local memory so the user sees the change
                setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
                showSystemAlert(`[Aviso] Salvo localmente: estoque de ${pendingProduct.name} alterado para ${newStock}.`, 'Salvo Localmente');
            }
        }

        // Log transaction
        console.log(`[Logistics] ${flowType.toUpperCase()} - SKU: ${sku}, Qtd: ${pendingQty}`);

        // Reset flow
        setFlowStep('category');
        setCurrentCategory(null);
        setPendingProduct(null);
        setPendingQty(0);
        setSelectedReason('');
    };

    const handleConfirmReason = () => {
        if (!selectedReason) {
            showSystemAlert('Por favor, selecione um motivo para o descarte.', 'Atenção');
            return;
        }
        if (selectedReason === 'Outros' && !customReasonText.trim()) {
            showSystemAlert('Por favor, descreva o motivo do descarte.', 'Atenção');
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

    const handleUpdateCartQty = (sku, newQty) => {
        if (newQty <= 0) {
            handleRemoveFromCart(sku);
            return;
        }
        setCart(prev => prev.map(item => item.sku === sku ? { ...item, quantity: newQty } : item));
    };

    const handleSubmitRequests = () => {
        if (cart.length === 0) return;
        if (!selectedRequisitionSector) {
            showSystemAlert('Por favor, selecione o setor da solicitação.', 'Atenção');
            return;
        }

        const confirmMsg = `Deseja enviar essa lista com ${cart.length} produto(s) para aprovação?`;
        showSystemConfirm(confirmMsg, () => {
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
                    sector: selectedRequisitionSector,
                    area: userRole
                });
            });

            saveRequests(newRequests);
            setCart([]);
            setSelectedRequisitionSector('');
            setShowCartModal(false);
            showSystemAlert('Solicitação de insumos enviada com sucesso!', 'Sucesso');
            setActiveTab('estoque');
        });
    };

    // =============================================
    // SUPERVISOR APPROVAL LOGIC
    // =============================================

    const handleApproveRequest = async (reqId) => {
        const req = requests.find(r => r.id === reqId);
        if (!req || req.status !== 'Pendente') return;

        const product = products.find(p => p.sku === req.itemSku);
        if (!product) {
            showSystemAlert('Erro: Produto não encontrado no estoque.', 'Erro');
            return;
        }

        if (product.stock < req.quantity) {
            showSystemAlert(`Estoque insuficiente! Disponível: ${product.stock} ${product.unit}. Solicitado: ${req.quantity} ${product.unit}.`, 'Erro');
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

        showSystemConfirm(confirmMsg, async () => {
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
            showSystemAlert('Solicitação aprovada e insumo baixado do estoque!', 'Sucesso');
        });
    };

    const handleRejectRequest = (reqId) => {
        const req = requests.find(r => r.id === reqId);
        if (!req || req.status !== 'Pendente') return;

        setRejectionTargetReqId(reqId);
        setRejectionReasonText('');
        setShowRejectionModal(true);
    };

    const handleConfirmRejection = () => {
        if (!rejectionTargetReqId) return;

        const updatedRequests = requests.map(r => r.id === rejectionTargetReqId ? {
            ...r,
            status: 'Recusado',
            rejectionReason: rejectionReasonText.trim(),
            approvedBy: state.currentUser ? state.currentUser.name : 'Supervisor',
            approvedAt: new Date().toLocaleString('pt-BR')
        } : r);

        saveRequests(updatedRequests);
        setShowRejectionModal(false);
        setRejectionTargetReqId(null);
        setRejectionReasonText('');
        showSystemAlert('Solicitação recusada.', 'Supervisor');
    };

    const handleCancelRejection = () => {
        setShowRejectionModal(false);
        setRejectionTargetReqId(null);
        setRejectionReasonText('');
    };

    // Check permissions
    const canApprove = state.currentUser && (
        state.currentUser.permissions?.chkApprove || 
        state.currentUser.permissions?.approveRequests ||
        state.currentUser.accessLevel === 'Administrador'
    );

    const renderActionButton = (prod, displayVal) => {
        const config = flowConfig[flowType] || flowConfig['solicitacao'];
        const IconComponent = config.icon;
        
        return (
            <button
                type="button"
                className="qty-action-btn"
                onClick={() => openNumpad(prod)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    height: '38px',
                    minWidth: '60px',
                    padding: '0 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${config.color}`,
                    backgroundColor: config.bg,
                    color: config.color,
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = config.hoverBg;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px ${config.color}`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = config.bg;
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }}
            >
                <IconComponent size={16} />
                {displayVal && <span>{displayVal}</span>}
            </button>
        );
    };

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 }}>
            
            {/* Inner Dashboard View */}
            <div className="tab-content" style={{ flex: 1, padding: activeTab === 'menu' ? '2rem' : '2rem 2rem 3.5rem 2rem', overflowY: 'auto', position: 'relative' }}>
                
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
                                        <h3>STOCK VIEW</h3>
                                        <p>Registro geral de itens, consulta de SKU, saldo atual e controle de validades por lote (FEFO).</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card orange" 
                                    onClick={() => {
                                        setActiveTab('movimentar');
                                        setFlowType(null);
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><History size={24} /></div>
                                    <div className="card-content">
                                        <h3>STOCK FLOW</h3>
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
                                        <h3>REQUISIÇÃO</h3>
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
                                        <h3>APROVAÇÃO</h3>
                                        <p>Visualizar e autorizar solicitações de retirada de insumos (acesso restrito).</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card red" 
                                    onClick={() => setActiveTab('perdas_historico')}
                                >
                                    <div className="card-icon">
                                        <AlertTriangle size={24} />
                                        {lossRecords.length > 0 && (
                                            <span className="notification-badge" style={{ backgroundColor: 'var(--accent-yellow)' }}>
                                                {lossRecords.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="card-content">
                                        <h3>HISTÓRICO DE PERDAS</h3>
                                        <p>Consultar todos os registros de descarte e perdas de insumos.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card purple"
                                    onClick={() => setActiveTab('wms')}
                                >
                                    <div className="card-icon"><Warehouse size={24} /></div>
                                    <div className="card-content">
                                        <h3>WMS</h3>
                                        <p>Gerenciamento de armazém, endereçamento e movimentação de paletes.</p>
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
                                                <th style={{ width: '48px', textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                                                        <Home size={18} style={{ color: '#c084fc' }} />
                                                    </div>
                                                </th>
                                                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', minWidth: '85px' }} className={sortField === 'sku' ? 'active-sort' : ''}>
                                                    SKU {sortField === 'sku' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: '180px' }} className={sortField === 'name' ? 'active-sort' : ''}>
                                                    Produto {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th onClick={() => handleSort('brand')} style={{ cursor: 'pointer', minWidth: '90px' }} className={sortField === 'brand' ? 'active-sort' : ''}>
                                                    Marca {sortField === 'brand' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
                                                <th style={{ minWidth: '70px' }}>Unidade</th>
                                                <th 
                                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                    style={{ position: 'relative', minWidth: '120px', cursor: 'pointer', userSelect: 'none' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            Categoria <ChevronDown size={14} style={{ transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', opacity: 0.8 }} />
                                                        </span>
                                                    </div>
                                                    
                                                    {isCategoryDropdownOpen && (
                                                        <div 
                                                            className="custom-dropdown-menu"
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                right: 0,
                                                                width: '180px',
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
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </th>
                                                <th style={{ textAlign: 'center' }}>Mínimo</th>
                                                <th style={{ textAlign: 'center' }}>Médio</th>
                                                <th style={{ textAlign: 'center' }}>Máximo</th>
                                                <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '120px' }} className={sortField === 'stock' ? 'active-sort' : ''}>
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
                                                                <td><strong>{limitChars(p.sku, 15)}</strong></td>
                                                                <td>
                                                                    <div className="product-desc" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontWeight: '700' }}>{limitChars(p.name, 35)}</span>
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
                                                                        {limitChars(p.brand || 'Sem Marca', 15)}
                                                                    </span>
                                                                </td>
                                                                <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                                                                <td><span className="category-tag">{limitChars(p.category, 20)}</span></td>
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
                                                                                    <Boxes size={14} style={{ color: 'var(--accent-orange)' }} /> LOTES — {limitChars(p.name.toUpperCase(), 30)}
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

                        {/* CARD MENU FOR STOCK FLOW SUB-ACTIONS */}
                        {activeTab === 'movimentar' && !flowType && (
                            <div className="dashboard-menu">
                                <button 
                                    className="menu-card green" 
                                    onClick={() => {
                                        setFlowType('entrada');
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><ArrowUp size={24} /></div>
                                    <div className="card-content">
                                        <h3>ENTRADA</h3>
                                        <p>Registrar entrada de insumos, materiais e novos lotes no estoque.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card red" 
                                    onClick={() => {
                                        setFlowType('saida');
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><ArrowDown size={24} /></div>
                                    <div className="card-content">
                                        <h3>SAIDA</h3>
                                        <p>Registrar saída operacional de insumos e consumo interno.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card yellow" 
                                    onClick={() => {
                                        setFlowType('perdas');
                                        setFlowStep('category');
                                        setCurrentCategory(null);
                                    }}
                                >
                                    <div className="card-icon"><Trash2 size={24} /></div>
                                    <div className="card-content">
                                        <h3>PERDAS</h3>
                                        <p>Registrar descarte, perdas de validade, avarias ou prejuízos no estoque.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>
                            </div>
                        )}

                        {/* TAB 2 & TAB 3: MOVIMENTAR ESTOQUE & SOLICITAÇÕES */}
                        {((activeTab === 'movimentar' && flowType) || activeTab === 'solicitacao') && (
                            <div className="flow-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                
                                {/* FLOW STEP 1: CATEGORY SELECTION */}
                                {flowStep === 'category' && (
                                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        {activeTab === 'solicitacao' && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                                                <button
                                                    onClick={() => setShowCartModal(true)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        background: 'rgba(255, 90, 0, 0.15)',
                                                        border: '1.5px solid var(--accent-orange)',
                                                        color: 'var(--accent-orange)',
                                                        padding: '0.5rem 1.2rem',
                                                        borderRadius: '8px',
                                                        fontWeight: '700',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    <ShoppingCart size={16} />
                                                    <span>MINHAS COMPRAS</span>
                                                    {cart.length > 0 && (
                                                        <span style={{
                                                            background: 'var(--accent-orange)',
                                                            color: '#ffffff',
                                                            borderRadius: '50%',
                                                            padding: '0.1rem 0.4rem',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '800',
                                                            marginLeft: '0.3rem'
                                                        }}>
                                                            {cart.length}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        <div id="categories-grid" className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', margin: '0 auto' }}>
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
                                        {/* Products Table inside Category */}
                                        <div className="table-responsive">
                                            <div style={{ 
                                                padding: '1.2rem 1.5rem', 
                                                borderBottom: '1px solid var(--border-color)', 
                                                fontWeight: '700', 
                                                color: 'var(--text-secondary)', 
                                                textTransform: 'uppercase',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                                gap: '1rem'
                                            }}>
                                                <span>ITENS EM {currentCategory.name}</span>
                                                {activeTab === 'solicitacao' && (
                                                    <button
                                                        onClick={() => setShowCartModal(true)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            background: 'rgba(255, 90, 0, 0.15)',
                                                            border: '1.5px solid var(--accent-orange)',
                                                            color: 'var(--accent-orange)',
                                                            padding: '0.5rem 1.2rem',
                                                            borderRadius: '8px',
                                                            fontWeight: '700',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                                                            textTransform: 'none'
                                                        }}
                                                    >
                                                        <ShoppingCart size={16} />
                                                        <span>MINHAS COMPRAS</span>
                                                        {cart.length > 0 && (
                                                            <span style={{
                                                                background: 'var(--accent-orange)',
                                                                color: '#ffffff',
                                                                borderRadius: '50%',
                                                                padding: '0.1rem 0.4rem',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '800',
                                                                marginLeft: '0.3rem'
                                                            }}>
                                                                {cart.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
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
                                                                        {renderActionButton(prod, displayVal)}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>SETOR:</label>
                                                <select
                                                    value={selectedRequisitionSector}
                                                    onChange={(e) => setSelectedRequisitionSector(e.target.value)}
                                                    style={{
                                                        background: '#111827',
                                                        border: '1.5px solid var(--accent-orange)',
                                                        color: 'var(--text-primary)',
                                                        borderRadius: '8px',
                                                        padding: '0.4rem 0.8rem',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="">Selecione o Setor...</option>
                                                    {sectors.length > 0 ? (
                                                        sectors.map(s => (
                                                            <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>
                                                        ))
                                                    ) : (
                                                        ['Cozinha', 'Salão', 'Bar', 'Logística', 'Administração'].map(s => (
                                                            <option key={s} value={s}>{s.toUpperCase()}</option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button className="btn-clear-modal" onClick={() => setCart([])}>LIMPAR TUDO</button>
                                                <button className="btn-confirm-modal" onClick={handleSubmitRequests}>ENVIAR SOLICITAÇÃO</button>
                                            </div>
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
                                                <th>Sugestão de Retirada (FEFO)</th>
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
                                                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        Nenhuma solicitação de insumos registrada no sistema.
                                                    </td>
                                                </tr>
                                            ) : (
                                                [...requests].reverse().map(req => {
                                                    const isPending = req.status === 'Pendente';
                                                    let badgeClass = 'badge-entregue';
                                                    if (req.status === 'Pendente') badgeClass = 'badge-pendente';
                                                    if (req.status === 'Recusado') badgeClass = 'badge-recusado';

                                                    const product = products.find(p => p.sku === req.itemSku);
                                                    const fefo = calculateFefoPlan(req.itemSku, req.quantity);

                                                    return (
                                                        <tr key={req.id}>
                                                            <td>
                                                                <strong>{req.itemName}</strong>
                                                                <br />
                                                                <small style={{ color: 'var(--text-secondary)' }}>{req.itemSku}</small>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                                    {fefo.plan.length === 0 && fefo.remainingUnallocated === 0 && (
                                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                            Sem lotes cadastrados
                                                                        </span>
                                                                    )}
                                                                    {fefo.plan.map((item, idx) => (
                                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                            <span style={{ 
                                                                                background: 'rgba(192, 132, 252, 0.1)', 
                                                                                border: '1px solid rgba(192, 132, 252, 0.3)',
                                                                                color: '#c084fc', 
                                                                                padding: '0.1rem 0.4rem', 
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: '700',
                                                                                fontFamily: 'monospace'
                                                                            }}>
                                                                                {item.batch.address || 'Sem end.'}
                                                                            </span>
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                                Lote: <strong style={{ color: 'var(--text-primary)' }}>{item.batch.lot}</strong> (-{item.quantityToTake} {product?.unit || ''})
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    {fefo.remainingUnallocated > 0 && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                            <span style={{ 
                                                                                background: 'rgba(239, 68, 68, 0.1)', 
                                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                                color: 'var(--accent-red)', 
                                                                                padding: '0.1rem 0.4rem', 
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: '700',
                                                                                fontFamily: 'monospace'
                                                                            }}>
                                                                                Estoque Geral
                                                                            </span>
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: '600' }}>
                                                                                (-{fefo.remainingUnallocated} {product?.unit || ''})
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
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
                                                                <span 
                                                                    className={`status-badge ${badgeClass}`} 
                                                                    style={{
                                                                        padding: '0.2rem 0.6rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: '700',
                                                                        textTransform: 'uppercase',
                                                                        background: req.status === 'Pendente' ? 'rgba(245, 158, 11, 0.15)' : (req.status === 'Entregue' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                                                        color: req.status === 'Pendente' ? 'var(--accent-orange)' : (req.status === 'Entregue' ? 'var(--accent-green)' : 'var(--accent-red)'),
                                                                        border: req.status === 'Pendente' ? '1px solid rgba(245, 158, 11, 0.3)' : (req.status === 'Entregue' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'),
                                                                        cursor: req.status === 'Recusado' ? 'pointer' : 'default',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (req.status === 'Recusado') {
                                                                            setInfoModalRequest(req);
                                                                            setShowInfoModal(true);
                                                                        }
                                                                    }}
                                                                    title={req.status === 'Recusado' ? (req.rejectionReason ? `Motivo da Recusa: ${req.rejectionReason}` : 'Recusado (Sem motivo informado)') : ''}
                                                                >
                                                                    {req.status}
                                                                    {req.status === 'Recusado' && <Info size={12} />}
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
                                                                        {req.status === 'Recusado' ? 'Recusado por:' : 'Liberação por:'} {req.approvedBy}
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
                        {/* TAB 5: HISTÓRICO DE PERDAS */}
                        {activeTab === 'perdas_historico' && (
                            <div className="products-container">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: 'var(--accent-red)', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertTriangle size={20} /> HISTÓRICO DE PERDAS
                                        </h2>
                                        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {lossRecords.length} registro(s) de descarte e perda de insumos.
                                        </p>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Data / Hora</th>
                                                <th>Produto</th>
                                                <th>SKU</th>
                                                <th>Qtd</th>
                                                <th>Unidade</th>
                                                <th>Setor</th>
                                                <th>Motivo</th>
                                                <th>Registrado Por</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lossRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        <AlertTriangle size={32} style={{ color: 'var(--accent-yellow)', marginBottom: '0.5rem' }} />
                                                        <br />Nenhum registro de perda encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                lossRecords.map(rec => (
                                                    <tr key={rec.id}>
                                                        <td><small style={{ color: 'var(--text-secondary)' }}>{rec.registeredAt}</small></td>
                                                        <td><strong>{rec.productName}</strong></td>
                                                        <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600', fontSize: '0.8rem' }}>{rec.sku}</span></td>
                                                        <td>
                                                            <span style={{
                                                                color: 'var(--accent-red)',
                                                                fontWeight: '800',
                                                                fontSize: '1rem'
                                                            }}>
                                                                -{rec.quantity}
                                                            </span>
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{rec.unit}</td>
                                                        <td>
                                                            <span style={{
                                                                background: 'rgba(99,102,241,0.12)',
                                                                border: '1px solid rgba(99,102,241,0.35)',
                                                                color: '#a5b4fc',
                                                                padding: '0.2rem 0.6rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700'
                                                            }}>{rec.sector || 'N/A'}</span>
                                                        </td>
                                                        <td>
                                                            {rec.reason === 'Outros' ? (
                                                                <span 
                                                                    style={{
                                                                        background: 'rgba(234,179,8,0.15)',
                                                                        border: '1px solid var(--accent-yellow)',
                                                                        color: 'var(--accent-yellow)',
                                                                        padding: '0.2rem 0.6rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem'
                                                                    }}
                                                                    onClick={() => {
                                                                        setInfoModalLoss(rec);
                                                                        setShowLossInfoModal(true);
                                                                    }}
                                                                    title={rec.customReason ? `Motivo: ${rec.customReason} (Clique para detalhes)` : 'Clique para ver o motivo'}
                                                                >
                                                                    {rec.reason}
                                                                    <Info size={12} />
                                                                </span>
                                                            ) : (
                                                                <span style={{
                                                                    background: 'rgba(234,179,8,0.1)',
                                                                    border: '1px solid rgba(234,179,8,0.3)',
                                                                    color: 'var(--accent-yellow)',
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700'
                                                                }}>
                                                                    {rec.reason}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{rec.registeredBy}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB: WMS */}
                        {activeTab === 'wms' && (
                            <div className="products-container">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Warehouse size={20} /> WMS — Warehouse Management System
                                        </h2>
                                        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Módulo em desenvolvimento. Funcionalidades serão adicionadas em breve.
                                        </p>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '300px',
                                    gap: '1rem',
                                    color: 'var(--text-secondary)',
                                    background: 'rgba(168, 85, 247, 0.04)',
                                    border: '1px dashed rgba(168, 85, 247, 0.3)',
                                    borderRadius: '16px',
                                    padding: '3rem'
                                }}>
                                    <Warehouse size={48} style={{ color: 'rgba(168, 85, 247, 0.4)' }} />
                                    <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>
                                        Nenhum conteúdo disponível ainda.
                                    </p>
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>
                                        Este módulo está reservado para o sistema de gerenciamento de armazém.
                                    </p>
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
                    <div className="pin-modal-card" style={{ maxWidth: '380px', width: '90%', border: '1px solid #4b5563', backgroundColor: '#111827', borderRadius: '16px', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: '800', textTransform: 'uppercase' }}>
                                {flowType === 'entrada' ? 'ADICIONAR QUANTIDADE' : 'REMOVER QUANTIDADE'}
                            </h3>
                            <button className="btn-close-modal" onClick={() => setShowNumpad(false)} title="Fechar">
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="pin-container" style={{ padding: '1rem 1.2rem' }}>
                            <div style={{ marginBottom: '0.8rem' }}>
                                <h4 style={{ margin: '0 0 0.3rem 0', color: '#ffffff', fontSize: '1.1rem', fontWeight: '500' }}>
                                    {numpadProduct.name}
                                </h4>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600', marginBottom: '0.6rem' }}>
                                    Unidade: {numpadProduct.unit} | Estoque: {numpadProduct.stock}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Quantidade</div>
                                <input 
                                    type="text" 
                                    value={numpadValue || ''} 
                                    readOnly 
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#0a0d14',
                                        border: '1px solid #4b5563',
                                        color: '#ffffff',
                                        textAlign: 'left',
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        padding: '0.5rem 0.8rem',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </div>

                            <div className="pin-entry-area" style={{ width: '100%' }}>
                                <div className="numpad" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem', width: '100%' }}>
                                    {[{l:'7',v:'7'},{l:'8',v:'8'},{l:'9',v:'9'},{l:<Delete size={18} />,v:'del'}].map((k, i) => (
                                        <button key={'r1'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '48px', fontSize: '1.2rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'4',v:'4'},{l:'5',v:'5'},{l:'6',v:'6'},{l:'x',v:'*'}].map((k, i) => (
                                        <button key={'r2'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '48px', fontSize: '1.2rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'1',v:'1'},{l:'2',v:'2'},{l:'3',v:'3'},{l:'-',v:'-'}].map((k, i) => (
                                        <button key={'r3'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '48px', fontSize: '1.2rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                    {[{l:'0',v:'0'},{l:',',v:','},{l:'+',v:'+'},{l:'=',v:'=', g:true}].map((k, i) => (
                                        <button key={'r4'+i} className="num-key" onClick={() => handleNumpadKey(k.v)} style={{ width: '100%', height: '48px', fontSize: '1.2rem', backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: k.g ? '#6b7280' : '#ffffff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s ease' }}>
                                            {k.l}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn-confirm-modal" onClick={confirmNumpad} style={{ flex: 1, padding: '0.8rem', fontSize: '1rem', borderRadius: '8px' }}>
                                        Confirmar
                                    </button>
                                    <button className="btn-clear-modal" onClick={() => handleNumpadKey('C')} style={{ flex: 1, padding: '0.8rem', fontSize: '1rem', borderRadius: '8px' }}>
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
                            {flowType === 'saida' && (() => {
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setor Responsável</label>
                                <select
                                    value={selectedLossSector}
                                    onChange={(e) => setSelectedLossSector(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        color: selectedLossSector ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Selecione o setor --</option>
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

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

                            {selectedReason === 'Outros' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Descreva o motivo (obrigatório):
                                    </label>
                                    <input
                                        type="text"
                                        value={customReasonText}
                                        onChange={(e) => setCustomReasonText(e.target.value)}
                                        placeholder="Digite o motivo do descarte..."
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                        }}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.2rem' }}>
                                <button className="btn-clear-modal" style={{ flex: 1 }} onClick={() => { setShowReason(false); setPendingProduct(null); }}>
                                    CANCELAR
                                </button>
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ flex: 1, backgroundColor: 'var(--accent-yellow)', color: '#422006' }} 
                                    onClick={handleConfirmReason}
                                >
                                    CONFIRMAR
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
                            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{limitChars(batchProduct.name, 35)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {limitChars(batchProduct.sku, 15)}</span>
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
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>FORNECEDOR</label>
                                <input 
                                    type="text"
                                    placeholder="Nome do fornecedor ou distribuidora"
                                    value={batchSupplier}
                                    onChange={(e) => setBatchSupplier(e.target.value)}
                                    maxLength="15"
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
                                    <div className="custom-date-picker-wrapper">
                                        <Calendar className="custom-date-picker-icon" size={16} />
                                        <input 
                                            type="date"
                                            value={batchMfgDate}
                                            onChange={(e) => setBatchMfgDate(e.target.value)}
                                            className="custom-date-picker-input"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE VALIDADE *</label>
                                    <div className="custom-date-picker-wrapper">
                                        <Calendar className="custom-date-picker-icon" size={16} />
                                        <input 
                                            type="date"
                                            value={batchExpDate}
                                            onChange={(e) => setBatchExpDate(e.target.value)}
                                            required
                                            className="custom-date-picker-input"
                                        />
                                    </div>
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
                                    {batchModalMode === 'add' ? 'SALVAR LOTE' : 'CONFIRMAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* MODAL: CONFIRMAR EXCLUSÃO DE LOTE */}
            {batchToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setBatchToDelete(null)} title="Fechar">
                            <X size={18} />
                        </button>
                        <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '2px solid #ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto',
                            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                        }}>
                            <Trash2 size={36} color="#ef4444" />
                        </div>
                        
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.8rem', fontWeight: '800' }}>
                            Excluir Lote?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja remover o lote <strong style={{ color: 'var(--text-primary)' }}>{batchToDelete.lot}</strong> permanentemente?<br/>
                            Esta ação não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setBatchToDelete(null)}
                                style={{ 
                                    flex: 1, 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    border: '1.5px solid var(--border-color)', 
                                    color: 'var(--text-primary)',
                                    boxShadow: '0 4px 0px rgba(0,0,0,0.3)',
                                    height: '42px',
                                    padding: '0 1rem'
                                }}
                            >
                                CANCELAR
                            </button>
                            <button 
                                type="button" 
                                className="btn-clear-modal" 
                                onClick={() => confirmDeleteBatch(batchToDelete.id)}
                                style={{ 
                                    flex: 1, 
                                    background: '#ef4444', 
                                    border: '1.5px solid #000000', 
                                    color: '#ffffff',
                                    boxShadow: '0 4px 0px #000000',
                                    height: '42px',
                                    padding: '0 1rem'
                                }}
                            >
                                SIM, EXCLUIR
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: REJECTION REASON DIALOG
            ============================================= */}
            {showRejectionModal && rejectionTargetReqId && (() => {
                const req = requests.find(r => r.id === rejectionTargetReqId);
                if (!req) return null;
                return createPortal(
                    <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                        <div className="pin-modal-card" style={{ maxWidth: '450px', padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <X size={24} style={{ color: 'var(--accent-red)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Motivo da Recusa</h3>
                                </div>
                                
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                    Você está recusando a solicitação de <strong>{req.quantity}</strong> unidade(s) de <strong>{req.itemName}</strong> para o setor <strong>{req.sector || 'COZINHA'}</strong>.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Motivo da recusa (opcional):
                                    </label>
                                    <textarea
                                        value={rejectionReasonText}
                                        onChange={(e) => setRejectionReasonText(e.target.value)}
                                        placeholder="Descreva o motivo para o colaborador (opcional)..."
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            resize: 'none',
                                            transition: 'border-color 0.2s',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.8rem' }}>
                                    <button 
                                        className="btn-clear-modal" 
                                        style={{ flex: 1 }} 
                                        onClick={handleCancelRejection}
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        className="btn-confirm-modal" 
                                        style={{ flex: 1, backgroundColor: 'var(--accent-red)', color: '#ffffff' }} 
                                        onClick={handleConfirmRejection}
                                    >
                                        RECUSAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                , document.body);
            })()}

            {/* =============================================
                MODAL: REJECTION INFO DIALOG
            ============================================= */}
            {showInfoModal && infoModalRequest && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info size={24} style={{ color: '#60a5fa' }} />
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Detalhes da Recusa</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Insumo:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.itemName}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Quantidade:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.quantity}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Solicitado por:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.requestedBy}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Setor / Função:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.sector || 'COZINHA'} / {infoModalRequest.area || 'Auxiliar'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Data da Solicitação:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.requestedAt}</strong>
                                </div>
                                <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '0.2rem 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Recusado por:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.approvedBy || 'Supervisor'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Data da Recusa:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalRequest.approvedAt}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Motivo da Recusa:</span>
                                <div style={{ 
                                    padding: '1rem', 
                                    background: 'rgba(239, 68, 68, 0.05)', 
                                    border: '1px solid rgba(239, 68, 68, 0.15)', 
                                    borderRadius: '8px', 
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.4',
                                    whiteSpace: 'pre-wrap',
                                    minHeight: '60px',
                                    fontStyle: infoModalRequest.rejectionReason ? 'normal' : 'italic'
                                }}>
                                    {infoModalRequest.rejectionReason || 'Nenhum motivo específico foi informado.'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ width: '100%', padding: '0.8rem' }} 
                                    onClick={() => {
                                        setShowInfoModal(false);
                                        setInfoModalRequest(null);
                                    }}
                                >
                                    FECHAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>, document.body)}

            {/* =============================================
                MODAL: LOSS DETAILS DIALOG
            ============================================= */}
            {showLossInfoModal && infoModalLoss && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info size={24} style={{ color: 'var(--accent-yellow)' }} />
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Detalhes do Descarte</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Insumo:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalLoss.productName}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>SKU:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalLoss.sku}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Quantidade:</span>
                                    <strong style={{ color: 'var(--accent-red)', fontWeight: '800' }}>-{infoModalLoss.quantity} {infoModalLoss.unit}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Registrado por:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalLoss.registeredBy}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Data / Hora:</span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{infoModalLoss.registeredAt}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Motivo Detalhado:</span>
                                <div style={{ 
                                    padding: '1rem', 
                                    background: 'rgba(234, 179, 8, 0.05)', 
                                    border: '1px solid rgba(234, 179, 8, 0.15)', 
                                    borderRadius: '8px', 
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.4',
                                    whiteSpace: 'pre-wrap',
                                    minHeight: '60px'
                                }}>
                                    {infoModalLoss.customReason || infoModalLoss.reason || 'Nenhum motivo detalhado informado.'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--accent-yellow)', color: '#422006' }} 
                                    onClick={() => {
                                        setShowLossInfoModal(false);
                                        setInfoModalLoss(null);
                                    }}
                                >
                                    FECHAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: SYSTEM GENERIC DIALOG (ALERT / CONFIRM)
            ============================================= */}
            {systemDialog && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 20000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '480px', width: '90%', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: systemDialog.type === 'confirm' ? 'rgba(243, 107, 29, 0.1)' : (systemDialog.title.toLowerCase().includes('erro') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'),
                                border: '2px solid',
                                borderColor: systemDialog.type === 'confirm' ? 'var(--accent-orange)' : (systemDialog.title.toLowerCase().includes('erro') ? 'var(--accent-red)' : 'var(--accent-green)'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: systemDialog.type === 'confirm' ? '0 0 15px rgba(243, 107, 29, 0.2)' : (systemDialog.title.toLowerCase().includes('erro') ? '0 0 15px rgba(239, 68, 68, 0.2)' : '0 0 15px rgba(34, 197, 94, 0.2)')
                            }}>
                                <Info size={28} style={{ color: systemDialog.type === 'confirm' ? 'var(--accent-orange)' : (systemDialog.title.toLowerCase().includes('erro') ? 'var(--accent-red)' : 'var(--accent-green)') }} />
                            </div>

                            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', margin: 0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {systemDialog.title}
                            </h3>

                            <p style={{ 
                                color: 'var(--text-secondary)', 
                                fontSize: '0.95rem', 
                                lineHeight: '1.6', 
                                margin: 0,
                                whiteSpace: 'pre-line',
                                textAlign: 'center',
                                width: '100%',
                                padding: '0 0.5rem'
                            }}>
                                {systemDialog.message}
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                                {systemDialog.type === 'confirm' && (
                                    <button 
                                        className="btn-clear-modal" 
                                        style={{ 
                                            flex: 1, 
                                            background: 'rgba(255, 255, 255, 0.03)', 
                                            border: '1.5px solid var(--border-color)', 
                                            color: 'var(--text-primary)',
                                            fontWeight: '700',
                                            height: '42px'
                                        }} 
                                        onClick={() => {
                                            const cancelCb = systemDialog.onCancel;
                                            setSystemDialog(null);
                                            if (cancelCb) cancelCb();
                                        }}
                                    >
                                        CANCELAR
                                    </button>
                                )}
                                <button 
                                    className="btn-confirm-modal" 
                                    style={{ 
                                        flex: 1, 
                                        backgroundColor: systemDialog.type === 'confirm' ? 'var(--accent-orange)' : (systemDialog.title.toLowerCase().includes('erro') ? 'var(--accent-red)' : 'var(--accent-green)'), 
                                        color: '#ffffff',
                                        fontWeight: '800',
                                        height: '42px'
                                    }} 
                                    onClick={() => {
                                        const confirmCb = systemDialog.onConfirm;
                                        setSystemDialog(null);
                                        if (confirmCb) confirmCb();
                                    }}
                                >
                                    {systemDialog.type === 'confirm' ? 'OK' : 'ENTENDIDO'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}
            {/* =============================================
                MODAL: SHOPPING CART DIALOG
            ============================================= */}
            {showCartModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)' }}>
                                    <ShoppingCart size={24} />
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Minhas Compras</h3>
                                </div>
                                <button 
                                    className="btn-close-modal" 
                                    onClick={() => setShowCartModal(false)} 
                                    title="Fechar"
                                    style={{ position: 'static', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                    <ShoppingCart size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem', opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>Seu carrinho está vazio.</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.4rem' }}>
                                        {cart.map((item) => (
                                            <div 
                                                key={item.sku} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between', 
                                                    background: 'rgba(255, 255, 255, 0.02)', 
                                                    padding: '0.8rem 1rem', 
                                                    borderRadius: '8px', 
                                                    border: '1px solid var(--border-color)',
                                                    gap: '1rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.name}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                        SKU: {item.sku}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <button 
                                                        onClick={() => handleUpdateCartQty(item.sku, item.quantity - 1)}
                                                        style={{ 
                                                            background: 'rgba(255, 255, 255, 0.05)', 
                                                            border: '1px solid var(--border-color)', 
                                                            color: 'var(--text-primary)', 
                                                            width: '28px', 
                                                            height: '28px', 
                                                            borderRadius: '6px', 
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            handleUpdateCartQty(item.sku, isNaN(val) ? 0 : val);
                                                        }}
                                                        style={{ 
                                                            width: '50px', 
                                                            textAlign: 'center', 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            borderBottom: '1px solid var(--border-color)',
                                                            color: 'var(--text-primary)', 
                                                            fontSize: '0.9rem',
                                                            fontWeight: '700',
                                                            outline: 'none',
                                                            padding: '0.2rem 0'
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => handleUpdateCartQty(item.sku, item.quantity + 1)}
                                                        style={{ 
                                                            background: 'rgba(255, 255, 255, 0.05)', 
                                                            border: '1px solid var(--border-color)', 
                                                            color: 'var(--text-primary)', 
                                                            width: '28px', 
                                                            height: '28px', 
                                                            borderRadius: '6px', 
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => handleRemoveFromCart(item.sku)}
                                                    style={{ 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        color: 'var(--accent-red)', 
                                                        cursor: 'pointer',
                                                        padding: '0.4rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Excluir item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sector Selection inside Cart Popup */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            SELECIONE O SETOR OPERACIONAL DA REQUISIÇÃO:
                                        </label>
                                        <select
                                            value={selectedRequisitionSector}
                                            onChange={(e) => setSelectedRequisitionSector(e.target.value)}
                                            style={{
                                                width: '100%',
                                                background: '#111827',
                                                border: '1.5px solid var(--accent-orange)',
                                                color: 'var(--text-primary)',
                                                borderRadius: '8px',
                                                padding: '0.6rem 1rem',
                                                fontSize: '0.9rem',
                                                fontWeight: '700',
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Selecione o Setor...</option>
                                            {sectors.length > 0 ? (
                                                sectors.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>
                                                ))
                                            ) : (
                                                ['Cozinha', 'Salão', 'Bar', 'Logística', 'Administração'].map(s => (
                                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
                                <button 
                                    className="btn-clear-modal" 
                                    style={{ flex: 1 }} 
                                    onClick={() => setShowCartModal(false)}
                                >
                                    FECHAR
                                </button>
                                {cart.length > 0 && (
                                    <button 
                                        className="btn-confirm-modal" 
                                        style={{ flex: 1, backgroundColor: 'var(--accent-orange)', color: '#ffffff' }} 
                                        onClick={handleSubmitRequests}
                                    >
                                        CONFIRMAR COMPRAS
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
