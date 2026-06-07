/**
 * Corellux OS - Logistics Hub (Inventory, WMS, and Requests)
 * Módulo operacional de controle de estoque reativo em React.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCorelluxState } from '../store/corellux-state';
import DbService from '../services/db-service';
import { getUserAvatar } from '../utils/initial-data';
import { runSupplyChainEngine, calculateABC } from '../utils/supply-chain-engine';
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
    Warehouse,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    AlertCircle,
    RefreshCw,
    Barcode,
    Lock,
    Map
} from 'lucide-react';



const indirectEval = eval;

const parseWarehouseDescription = (desc) => {
    try {
        if (desc && desc.trim().startsWith('{')) {
            const parsed = JSON.parse(desc);
            return {
                text: parsed.text || '',
                usablePercentage: parsed.usablePercentage !== undefined ? parseFloat(parsed.usablePercentage) : 90,
                defaultHeight: parsed.defaultHeight !== undefined ? parseFloat(parsed.defaultHeight) : 0,
                defaultLength: parsed.defaultLength !== undefined ? parseFloat(parsed.defaultLength) : 0,
                defaultDepth: parsed.defaultDepth !== undefined ? parseFloat(parsed.defaultDepth) : 0
            };
        }
    } catch (e) {
        console.warn('Failed to parse warehouse description JSON:', e);
    }
    return {
        text: desc || '',
        usablePercentage: 90,
        defaultHeight: 0,
        defaultLength: 0,
        defaultDepth: 0
    };
};

const parseZoneDescription = (desc) => {
    try {
        if (desc && desc.trim().startsWith('{')) {
            const parsed = JSON.parse(desc);
            return {
                text: parsed.text || '',
                height: parsed.height !== undefined ? parseFloat(parsed.height) : 0,
                length: parsed.length !== undefined ? parseFloat(parsed.length) : 0,
                depth: parsed.depth !== undefined ? parseFloat(parsed.depth) : 0
            };
        }
    } catch (e) {
        console.warn('Failed to parse zone description JSON:', e);
    }
    return {
        text: desc || '',
        height: 0,
        length: 0,
        depth: 0
    };
};

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
    const [suppliers, setSuppliers] = useState([]);
    const [wmsWarehouses, setWmsWarehouses] = useState([]);
    const [wmsZones, setWmsZones] = useState([]);
    const [wmsLocations, setWmsLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // WMS/FEFO States
    const [stockBatches, setStockBatches] = useState([]);
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchModalMode, setBatchModalMode] = useState('add'); // 'add', 'edit'
    const [editingBatch, setEditingBatch] = useState(null);
    const [batchProduct, setBatchProduct] = useState(null);

    // Supply Chain States
    const [scSubTab, setScSubTab] = useState('overview');
    const [scTargetDays, setScTargetDays] = useState(() => {
        // Inicializa do cache local para exibição imediata; o useEffect sincroniza com Supabase
        try {
            const cached = localStorage.getItem('corellux_setting_sc_target_days');
            if (cached) return parseInt(JSON.parse(cached)) || 30;
            // fallback chave antiga
            const old = localStorage.getItem('corellux_sc_target_days');
            return old ? parseInt(old) : 30;
        } catch { return 30; }
    });
    const [scTargetInput, setScTargetInput] = useState(() => {
        try {
            const cached = localStorage.getItem('corellux_setting_sc_target_days');
            if (cached) return String(parseInt(JSON.parse(cached)) || 30);
            const old = localStorage.getItem('corellux_sc_target_days');
            return old || '30';
        } catch { return '30'; }
    });
    const [scSearch, setScSearch] = useState('');
    const [scRecalcKey, setScRecalcKey] = useState(0);
    const [resolvedAnomalies, setResolvedAnomalies] = useState([]);
    const [scSettingSaving, setScSettingSaving] = useState(false);
    const [scHelpPopup, setScHelpPopup] = useState(null); // id da aba ou null

    // Filtro de período global — afeta Visão Geral, Sugestões, Cobertura e Curva ABC
    const [scStartDate, setScStartDate] = useState('');
    const [scEndDate, setScEndDate] = useState('');

    // Carrega meta de dias do Supabase ao montar o componente
    useEffect(() => {
        let cancelled = false;
        DbService.getSetting('sc_target_days', 30).then(val => {
            if (cancelled) return;
            const days = parseInt(val) || 30;
            setScTargetDays(days);
            setScTargetInput(String(days));
            setScRecalcKey(k => k + 1);
        });
        return () => { cancelled = true; };
    }, []);

    // Sincroniza configuração offline com Supabase ao retomar internet
    useEffect(() => {
        const handleOnline = async () => {
            const pendingKey = 'corellux_setting_sc_target_days_pending_sync';
            const pending = localStorage.getItem(pendingKey);
            if (pending) {
                try {
                    const val = parseInt(JSON.parse(pending)) || 30;
                    const result = await DbService.setSetting('sc_target_days', val);
                    if (result.success) {
                        localStorage.removeItem(pendingKey);
                        console.log('[CorelluxOS] Meta de dias sincronizada com Supabase após retomar conexão.');
                    }
                } catch (e) {
                    console.warn('[CorelluxOS] Falha ao sincronizar offline setting:', e);
                }
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // Motor de Supply Chain com filtro global de período
    const supplyChainData = useMemo(() => {
        try {
            const allLogs = (() => {
                try {
                    const raw = localStorage.getItem('corellux_movement_logs');
                    return raw ? JSON.parse(raw) : [];
                } catch { return []; }
            })();
            // Aplica filtro de período global
            const movementLogs = allLogs.filter(r => {
                if (scStartDate && r.date < scStartDate) return false;
                if (scEndDate && r.date > scEndDate) return false;
                return true;
            });
            const suppliers = (() => {
                try {
                    return JSON.parse(localStorage.getItem('corellux_suppliers') || '[]');
                } catch { return []; }
            })();
            return runSupplyChainEngine(
                products,
                stockBatches,
                suppliers,
                movementLogs,
                scTargetDays
            );
        } catch (e) {
            console.error('[SupplyChain] Hook run error:', e);
            return {
                inventoryMetrics: [],
                abcData: [],
                purchaseSuggestions: [],
                pendingAnomalies: [],
                seasonalityMetrics: {}
            };
        }
    }, [products, stockBatches, scTargetDays, scRecalcKey, scStartDate, scEndDate]);

    // filteredAbcData agora usa o mesmo engine filtrado por período
    const filteredAbcData = useMemo(() => {
        return supplyChainData.abcData || [];
    }, [supplyChainData]);
    
    // Form fields for Batch Modal
    const [batchLot, setBatchLot] = useState('');
    const [batchQty, setBatchQty] = useState('');
    const [batchPricePerUnit, setBatchPricePerUnit] = useState('');
    const [batchAddress, setBatchAddress] = useState('');
    const [batchBrand, setBatchBrand] = useState('');
    const [batchSupplier, setBatchSupplier] = useState('');
    const [batchMfgDate, setBatchMfgDate] = useState('');
    const [batchExpDate, setBatchExpDate] = useState('');

    const [entryPricePerUnit, setEntryPricePerUnit] = useState('');
    const [entryLot, setEntryLot] = useState('');
    const [entryExpDate, setEntryExpDate] = useState('');
    const [entrySupplier, setEntrySupplier] = useState('');
    const [entryBrand, setEntryBrand] = useState('');
    const [entryAddress, setEntryAddress] = useState('');
    const [entryMfgDate, setEntryMfgDate] = useState('');
    const [entryBatches, setEntryBatches] = useState([]);

    // Barcode & packaging conversion states
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeEntryMode, setBarcodeEntryMode] = useState(false);
    const [barcodePackageType, setBarcodePackageType] = useState('unidade'); // 'unidade', 'fardo', 'caixa', 'pallet'
    const [barcodePackageQty, setBarcodePackageQty] = useState(1);
    const [barcodeConversionFactor, setBarcodeConversionFactor] = useState(1);

    // WMS Visual Map States (Logistics tab)
    const [wmsViewWarehouseId, setWmsViewWarehouseId] = useState('');
    const [wmsViewZoneId, setWmsViewZoneId] = useState('');
    const [wmsViewAisle, setWmsViewAisle] = useState('');
    const [wmsViewRow, setWmsViewRow] = useState('A');
    const [selectedCellDetail, setSelectedCellDetail] = useState(null);

    // Cascading selection sync for WMS Visual Map
    useEffect(() => {
        if (!wmsViewWarehouseId && wmsWarehouses.length > 0) {
            setWmsViewWarehouseId(String(wmsWarehouses[0].id));
        }
    }, [wmsWarehouses, wmsViewWarehouseId]);

    useEffect(() => {
        if (wmsViewWarehouseId && wmsZones.length > 0) {
            const whZones = wmsZones.filter(z => String(z.warehouseId) === String(wmsViewWarehouseId));
            if (whZones.length > 0) {
                const currentZoneIsValid = whZones.some(z => String(z.id) === String(wmsViewZoneId));
                if (!currentZoneIsValid) {
                    setWmsViewZoneId(String(whZones[0].id));
                }
            } else {
                setWmsViewZoneId('');
            }
        }
    }, [wmsViewWarehouseId, wmsZones, wmsViewZoneId]);

    useEffect(() => {
        if (wmsViewZoneId && wmsLocations.length > 0) {
            const zoneLocs = wmsLocations.filter(l => String(l.zoneId) === String(wmsViewZoneId));
            if (zoneLocs.length > 0) {
                const aisles = [...new Set(zoneLocs.map(l => l.aisle))].sort((a,b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.localeCompare(b);
                });
                const currentAisleIsValid = aisles.includes(wmsViewAisle);
                if (!currentAisleIsValid && aisles.length > 0) {
                    setWmsViewAisle(aisles[0]);
                }
            } else {
                setWmsViewAisle('');
            }
        }
    }, [wmsViewZoneId, wmsLocations, wmsViewAisle]);

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

    // Stock Flow Log state
    const [movements, setMovements] = useState([]);
    const [movSearchQuery, setMovSearchQuery] = useState('');
    const [movFilterType, setMovFilterType] = useState('todos');
    const [isLoadingMovements, setIsLoadingMovements] = useState(false);

    const loadStockMovements = async () => {
        setIsLoadingMovements(true);
        try {
            const list = await DbService.getStockMovements();
            setMovements(list || []);
        } catch (e) {
            console.error('[LogisticsHub] Erro ao buscar movimentações:', e);
        } finally {
            setIsLoadingMovements(false);
        }
    };
    
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
    const [lossMaterialType, setLossMaterialType] = useState('estoque'); // 'estoque' ou 'processo'

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

    // Custom Approval States
    const [activeApprovalRequest, setActiveApprovalRequest] = useState(null);
    const [followFefoSuggestion, setFollowFefoSuggestion] = useState(true);
    const [manualAddress, setManualAddress] = useState('');
    const [manualLot, setManualLot] = useState('');
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);
    const [showLotDropdown, setShowLotDropdown] = useState(false);
    const [addressReadOnly, setAddressReadOnly] = useState(true);
    const [lotReadOnly, setLotReadOnly] = useState(true);
    const [customAllocations, setCustomAllocations] = useState([]);
    const [activeAddressDropdownId, setActiveAddressDropdownId] = useState(null);
    const [activeLotDropdownId, setActiveLotDropdownId] = useState(null);

    // WMS Address formatting and mapping
    const formattedWmsAddresses = useMemo(() => {
        if (!wmsLocations || !wmsZones || !wmsWarehouses) return [];
        return wmsLocations.map(loc => {
            const zone = wmsZones.find(z => String(z.id) === String(loc.zoneId));
            const wh = wmsWarehouses.find(w => String(w.id) === String(zone?.warehouseId));
            
            const whAcronym = (wh?.acronym || 'AC').substring(0, 2).toUpperCase();
            const zoneName = (zone?.name || 'ESA').substring(0, 3).toUpperCase();
            const parts = [`${whAcronym}-${zoneName}`];
            if (loc.aisle || loc.row) {
                parts.push(`${loc.aisle || ''}${loc.row || ''}`);
            }
            if (loc.shelf) parts.push(loc.shelf);
            if (loc.position) parts.push(loc.position);
            
            return {
                id: loc.id,
                formatted: parts.join('-'),
                zoneName: zone?.name,
                zoneType: zone?.type || 'Seco',
                status: loc.status
            };
        }).filter(loc => loc.status === 'Ativo');
    }, [wmsLocations, wmsZones, wmsWarehouses]);

    const suggestWmsLocation = (product, quantity) => {
        if (!product || !wmsLocations || wmsLocations.length === 0) return '';
        const qty = parseFloat(quantity) || 0;
        const incomingVolume = qty * (parseFloat(product.volumeOcupado) || 0);

        const allowedZones = product.allowedZones || [];
        const allowedCells = product.allowedCells || [];

        // Map locations with their occupied volume
        const locationsWithOccupiedVolume = wmsLocations.map(loc => {
            const zone = wmsZones.find(z => String(z.id) === String(loc.zoneId));
            const wh = wmsWarehouses.find(w => String(w.id) === String(zone?.warehouseId));
            
            const whAcronym = (wh?.acronym || 'AC').substring(0, 2).toUpperCase();
            const zoneName = (zone?.name || 'ESA').substring(0, 3).toUpperCase();
            const parts = [`${whAcronym}-${zoneName}`];
            if (loc.aisle || loc.row) {
                parts.push(`${loc.aisle || ''}${loc.row || ''}`);
            }
            if (loc.shelf) parts.push(loc.shelf);
            if (loc.position) parts.push(loc.position);
            
            const formatted = parts.join('-');

            // Get batches in this location
            const batchesInLoc = stockBatches.filter(b => b.address === formatted);
            
            // Sum occupied volume
            let occupiedVolume = 0;
            batchesInLoc.forEach(b => {
                const batchProd = products.find(p => p.sku === b.itemSku);
                const prodVolUnit = batchProd ? (parseFloat(batchProd.volumeOcupado) || 0) : 0;
                occupiedVolume += (parseFloat(b.quantity) || 0) * prodVolUnit;
            });

            // Parse warehouse usablePercentage if exists
            let usablePercentage = 90;
            if (wh && wh.description && wh.description.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(wh.description);
                    if (parsed.usablePercentage !== undefined) {
                        usablePercentage = parseFloat(parsed.usablePercentage) || 90;
                    }
                } catch (e) {
                    console.warn('Failed to parse wh description in suggestion:', e);
                }
            }

            const totalVol = parseFloat(loc.volumeCubico) || 0;
            const usableVol = totalVol * (usablePercentage / 100);

            return {
                ...loc,
                formatted,
                occupiedVolume,
                totalVol,
                usableVol,
                remainingVolume: Math.max(0, usableVol - occupiedVolume)
            };
        });

        // Filter zoning constraints helper
        const passesZoningConstraints = (loc) => {
            if (loc.status !== 'Ativo') return false;

            // Restrict by allowedZones
            if (allowedZones.length > 0) {
                const hasZone = allowedZones.some(z => Number(z) === Number(loc.zoneId));
                if (!hasZone) return false;
            }

            // Restrict by allowedCells (format zoneId_aisle_row_shelf)
            if (allowedCells.length > 0) {
                const matchesAnyCell = allowedCells.some(cellStr => {
                    const parts = cellStr.split('_');
                    if (parts.length < 4) return false;
                    const cZoneId = Number(parts[0]);
                    const cAisle = parts[1];
                    const cRow = parts[2];
                    const cShelf = parts[3];
                    return Number(cZoneId) === Number(loc.zoneId) &&
                           String(cAisle || '') === String(loc.aisle || '') &&
                           String(cRow || '') === String(loc.row || '') &&
                           String(cShelf || '') === String(loc.shelf || '');
                });
                if (!matchesAnyCell) return false;
            }

            return true;
        };

        // Filter candidates WITH volume limit
        let candidates = locationsWithOccupiedVolume.filter(loc => {
            if (!passesZoningConstraints(loc)) return false;

            // Check usable volume limit
            if (loc.totalVol > 0 && incomingVolume > 0) {
                if (loc.remainingVolume + 0.0001 < incomingVolume) return false;
            }

            return true;
        });

        // Fallback: If no candidate satisfies the volume constraint, filter ONLY by zoning constraints
        if (candidates.length === 0) {
            candidates = locationsWithOccupiedVolume.filter(passesZoningConstraints);
        }

        if (candidates.length === 0) return '';

        // Sort candidates:
        // 1. Prioritize locations that already have the same SKU
        // 2. Prioritize locations with more remaining volume
        candidates.sort((a, b) => {
            const aHasSameSKU = stockBatches.some(bat => bat.address === a.formatted && bat.itemSku === product.sku);
            const bHasSameSKU = stockBatches.some(bat => bat.address === b.formatted && bat.itemSku === product.sku);

            if (aHasSameSKU && !bHasSameSKU) return -1;
            if (!aHasSameSKU && bHasSameSKU) return 1;

            return b.remainingVolume - a.remainingVolume;
        });

        return candidates[0].formatted;
    };

    // WMS Address selector helper component
    const renderAddressSelector = (value, onChange, placeholder = "Selecione o endereço...") => {
        if (formattedWmsAddresses.length === 0) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%' }}>
                    <input 
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
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
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertCircle size={10} /> Nenhum endereço cadastrado no WMS. Usando entrada manual.
                    </span>
                </div>
            );
        }

        const valueExists = formattedWmsAddresses.some(loc => loc.formatted === value);
        
        return (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                style={{
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    cursor: 'pointer'
                }}
            >
                <option value="">-- Selecione o Endereço --</option>
                {value && !valueExists && (
                    <option value={value}>{value} (Endereço Atual / Não cadastrado)</option>
                )}
                {formattedWmsAddresses.map(loc => (
                    <option key={loc.id} value={loc.formatted}>
                        {loc.formatted} ({loc.zoneType})
                    </option>
                ))}
            </select>
        );
    };

    // Currency Helpers
    const formatCurrency = (val) => {
        if (val === null || val === undefined || val === '') return '0,00';
        const num = parseFloat(val);
        if (isNaN(num)) return '0,00';
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const parseCurrencyToFloat = (str) => {
        if (!str) return 0.00;
        let clean = String(str).replace(/[^\d,.-]/g, '');
        if (clean.includes(',') && clean.includes('.')) {
            // e.g. "1.234,56" -> remove dots, replace comma with dot
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (clean.includes(',')) {
            // e.g. "8,50" -> replace comma with dot
            clean = clean.replace(',', '.');
        }
        return parseFloat(clean) || 0.00;
    };

    const handleCurrencyInputChange = (value, setter) => {
        let clean = value.replace(/\D/g, '');
        if (clean === '') {
            setter('0,00');
            return;
        }
        const cents = parseInt(clean, 10);
        const formatted = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setter(formatted);
    };

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
                const [prodsData, catsData, batchesData, sectorsData, suppliersData, whsData, zonesData, locsData] = await Promise.all([
                    DbService.getProducts(),
                    DbService.getCategories(),
                    DbService.getStockBatches(),
                    DbService.getSectors(),
                    DbService.getSuppliers(),
                    DbService.getWmsWarehouses(),
                    DbService.getWmsZones(),
                    DbService.getWmsLocations()
                ]);
                setProducts(prodsData);
                setCategories(catsData.filter(c => c.status === 'Ativo'));
                setStockBatches(batchesData);
                setSectors(sectorsData || []);
                setSuppliers(suppliersData || []);
                setWmsWarehouses(whsData || []);
                setWmsZones(zonesData || []);
                setWmsLocations(locsData || []);
                
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

    const deductStockManually = async (sku, qty, address, lot) => {
        const targetAddress = (address || '').trim().toUpperCase();
        const targetLot = (lot || '').trim().toUpperCase();
        
        // 1. Try to find a batch of this SKU with exact address and lot match
        let batch = stockBatches.find(b => 
            b.itemSku === sku && 
            (b.address || '').trim().toUpperCase() === targetAddress && 
            (b.lot || '').trim().toUpperCase() === targetLot
        );
        
        // 2. If not found, try to find by SKU and address (ignoring lot)
        if (!batch) {
            batch = stockBatches.find(b => 
                b.itemSku === sku && 
                (b.address || '').trim().toUpperCase() === targetAddress
            );
        }
        
        if (batch) {
            // Update the existing batch
            const newQty = batch.quantity - qty;
            if (newQty <= 0) {
                await DbService.deleteStockBatch(batch.id);
            } else {
                await DbService.updateStockBatch(batch.id, {
                    quantity: newQty,
                    updatedAt: new Date().toISOString()
                });
            }
        } else {
            // 3. If no batch exists at that address, we can create a negative/new entry or adjust overall stock.
            const product = products.find(p => p.sku === sku);
            if (product) {
                const newStock = Math.max(0, product.stock - qty);
                await DbService.updateProductStock(sku, newStock);
            }
        }
        
        // Refresh all state from db
        await recalculateProductStockFromBatches();
    };

    const deductCustomAllocations = async (sku, allocations) => {
        for (const alloc of allocations) {
            const qty = parseFloat(alloc.quantity || 0);
            if (qty <= 0) continue;

            if (!alloc.isCustom) {
                // Deduct from the specific batch ID
                const batch = stockBatches.find(b => b.id === alloc.id);
                if (batch) {
                    const newQty = batch.quantity - qty;
                    if (newQty <= 0) {
                        await DbService.deleteStockBatch(batch.id);
                    } else {
                        await DbService.updateStockBatch(batch.id, {
                            quantity: newQty,
                            updatedAt: new Date().toISOString()
                        });
                    }
                } else {
                    // Fallback: if batch was somehow deleted, deduct from general
                    const product = products.find(p => p.sku === sku);
                    if (product) {
                        const newStock = Math.max(0, product.stock - qty);
                        await DbService.updateProductStock(sku, newStock);
                    }
                }
            } else {
                // Custom input: match by address and lot
                const targetAddress = (alloc.address || '').trim().toUpperCase();
                const targetLot = (alloc.lot || '').trim().toUpperCase();

                let batch = stockBatches.find(b => 
                    b.itemSku === sku && 
                    (b.address || '').trim().toUpperCase() === targetAddress && 
                    (b.lot || '').trim().toUpperCase() === targetLot
                );

                if (!batch) {
                    // Try to find by SKU and address only (lot ignored)
                    batch = stockBatches.find(b => 
                        b.itemSku === sku && 
                        (b.address || '').trim().toUpperCase() === targetAddress
                    );
                }

                if (batch) {
                    const newQty = batch.quantity - qty;
                    if (newQty <= 0) {
                        await DbService.deleteStockBatch(batch.id);
                    } else {
                        await DbService.updateStockBatch(batch.id, {
                            quantity: newQty,
                            updatedAt: new Date().toISOString()
                        });
                    }
                } else {
                    // Deduct from general product stock
                    const product = products.find(p => p.sku === sku);
                    if (product) {
                        const newStock = Math.max(0, product.stock - qty);
                        await DbService.updateProductStock(sku, newStock);
                    }
                }
            }
        }

        // Refresh all state from db
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
        setBatchPricePerUnit('0,00');
        setBatchAddress(suggestWmsLocation(product, 0));
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
        setBatchPricePerUnit(formatCurrency(batch.pricePerUnit !== undefined ? batch.pricePerUnit : batch.price_per_unit));
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
            pricePerUnit: parseCurrencyToFloat(batchPricePerUnit),
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
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Preço Unitário</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Valor Total</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Validade</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Endereço</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Marca / Fornecedor</th>
                            <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemBatches.map(b => {
                            const expiry = getBatchExpiryStatus(b.expirationDate);
                            const priceVal = b.pricePerUnit !== undefined ? b.pricePerUnit : (b.price_per_unit || 0);
                            const unitPriceFormatted = `R$ ${parseFloat(priceVal).toFixed(2).replace('.', ',')}`;
                            const totalPriceFormatted = `R$ ${parseFloat(priceVal * b.quantity).toFixed(2).replace('.', ',')}`;

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
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: '600', color: 'var(--accent-green)' }}>
                                        {unitPriceFormatted}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--accent-teal)' }}>
                                        {totalPriceFormatted}
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
                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                                            <button 
                                                type="button"
                                                onClick={() => handleOpenEditBatch(product, b)}
                                                style={{
                                                    background: 'rgba(168, 85, 247, 0.1)',
                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                                    color: '#c084fc',
                                                    padding: '0.35rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Editar Lote"
                                            >
                                                <Edit size={13} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDeleteBatch(b)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: 'var(--accent-red)',
                                                    padding: '0.35rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Excluir Lote"
                                            >
                                                <Trash2 size={13} />
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

    const formatDailyConsumption = (val, unit) => {
        if (val === undefined || val === null || isNaN(val)) return '0';
        const lowerUnit = (unit || '').toLowerCase();
        if (lowerUnit === 'kg' || lowerUnit === 'l' || lowerUnit === 'litro' || lowerUnit === 'litros') {
            return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
        }
        return Math.round(val).toString();
    };

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
        let valA, valB;
        if (sortField === 'avgDailyConsumption') {
            const metricA = supplyChainData.inventoryMetrics?.find(m => m.sku === a.sku);
            const metricB = supplyChainData.inventoryMetrics?.find(m => m.sku === b.sku);
            valA = metricA ? metricA.avgDailyConsumption : 0;
            valB = metricB ? metricB.avgDailyConsumption : 0;
        } else {
            valA = a[sortField];
            valB = b[sortField];
        }
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
            (p.brand && p.brand.toLowerCase().includes(searchVal.toLowerCase())) ||
            (p.gtinUnidade && p.gtinUnidade.includes(searchVal)) ||
            (p.gtinFardo && p.gtinFardo.includes(searchVal)) ||
            (p.gtinCaixa && p.gtinCaixa.includes(searchVal)) ||
            (p.gtinPallet && p.gtinPallet.includes(searchVal));
        
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
            
            if (flowType === 'entrada') {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                setEntryLot(`LT-${year}${month}${day}`);
                setEntryPricePerUnit('0,00');
                setEntryExpDate('');
                setEntrySupplier('');
                setEntryBrand(numpadProduct.brand || '');
                const initialAddr = suggestWmsLocation(numpadProduct, parsedVal);
                setEntryAddress(initialAddr);
                setEntryMfgDate('');
                
                setEntryBatches([
                    {
                        id: Date.now(),
                        lot: `LT-${year}${month}${day}`,
                        quantity: parsedVal.toString(),
                        pricePerUnit: '0,00',
                        expirationDate: '',
                        manufacturingDate: '',
                        supplier: '',
                        address: initialAddr
                    }
                ]);
            }
            
            setShowConfirm(true);
        }
    };

    // =============================================
    // STOCK TRANSACTION LOGIC
    // =============================================

    const closeConfirmModal = () => {
        setShowConfirm(false);
        setPendingProduct(null);
        setPendingQty(0);
        setBarcodeEntryMode(false);
        setBarcodePackageType('unidade');
        setBarcodePackageQty(1);
        setBarcodeConversionFactor(1);
    };

    const handleBarcodeSearch = (e) => {
        if (e) e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        // Find product matching any EAN code
        const matched = products.find(p => 
            p.gtinUnidade === code || 
            (p.gtin_unidade && p.gtin_unidade === code) ||
            p.gtinFardo === code || 
            (p.gtin_fardo && p.gtin_fardo === code) ||
            p.gtinCaixa === code || 
            (p.gtin_caixa && p.gtin_caixa === code) ||
            p.gtinPallet === code || 
            (p.gtin_pallet && p.gtin_pallet === code)
        );

        if (!matched) {
            showSystemAlert(`Nenhum produto correspondente ao código EAN/GTIN "${code}" foi encontrado.`, 'Código Não Encontrado');
            setBarcodeInput('');
            return;
        }

        // Determine packaging type and conversion factor
        let pkgType = 'unidade';
        let factor = 1;
        if (matched.gtinFardo === code || matched.gtin_fardo === code) {
            pkgType = 'fardo';
            factor = Number(matched.itensFardo !== undefined ? matched.itensFardo : (matched.itens_fardo || 1));
        } else if (matched.gtinCaixa === code || matched.gtin_caixa === code) {
            pkgType = 'caixa';
            factor = Number(matched.itensCaixa !== undefined ? matched.itensCaixa : (matched.itens_caixa || 1));
        } else if (matched.gtinPallet === code || matched.gtin_pallet === code) {
            pkgType = 'pallet';
            factor = Number(matched.itensPallet !== undefined ? matched.itensPallet : (matched.itens_pallet || 1));
        }

        // Set pending product details
        setPendingProduct(matched);
        setPendingQty(factor);
        
        // Setup barcode packaging states
        setBarcodeEntryMode(true);
        setBarcodePackageType(pkgType);
        setBarcodePackageQty(1);
        setBarcodeConversionFactor(factor);

        if (flowType === 'entrada') {
            // Setup fields for stock batch entry modal
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            setEntryLot(`LT-${year}${month}${day}`);
            setEntryPricePerUnit('0,00');
            setEntryExpDate('');
            setEntrySupplier('');
            setEntryBrand(matched.brand || '');
            const initialAddr = suggestWmsLocation(matched, factor);
            setEntryAddress(initialAddr);
            setEntryMfgDate('');

            setEntryBatches([
                {
                    id: Date.now(),
                    lot: `LT-${year}${month}${day}`,
                    quantity: factor.toString(),
                    pricePerUnit: '0,00',
                    expirationDate: '',
                    manufacturingDate: '',
                    supplier: '',
                    address: initialAddr
                }
            ]);
        } else if (flowType === 'perdas') {
            // Reset loss values
            setSelectedReason('');
            setCustomReasonText('');
            setSelectedLossSector('');
            setLossMaterialType('estoque');
        }

        // Open confirm modal directly
        setShowConfirm(true);

        // Clear search input
        setBarcodeInput('');
    };

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

        // PERDAS: only saves a loss record. If it is 'estoque', also deducts stock.
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
                materialType: lossMaterialType,
                registeredBy: state.currentUser ? state.currentUser.name : 'Operador',
                registeredAt: new Date().toLocaleString('pt-BR')
            };
            saveLossRecord(lossEntry);

            // Registrar log de movimentação de descarte
            try {
                await DbService.saveStockMovement({
                    sku: sku,
                    productName: pendingProduct.name,
                    type: 'Perda',
                    quantity: pendingQty,
                    userName: state.currentUser ? state.currentUser.name : 'Operador',
                    details: `Descarte: ${reason === 'Outros' ? (customReasonText.trim() || 'Outros') : reason}. Setor: ${selectedLossSector || 'Cozinha'}. Tipo Material: ${lossMaterialType}.`
                });
            } catch (err) {
                console.error('[Logistics] Erro ao registrar movimentação de descarte:', err);
            }

            if (lossMaterialType === 'estoque') {
                const productBatches = stockBatches.filter(b => b.itemSku === sku);
                if (productBatches.length > 0) {
                    await deductStockFromBatchesFefo(sku, pendingQty);
                    showSystemAlert(`Perda registrada: ${pendingQty} ${pendingProduct.unit} de "${pendingProduct.name}" (Material de Estoque). Estoque atualizado via FEFO.`, 'Sucesso');
                } else {
                    newStock -= pendingQty;
                    if (newStock < 0) newStock = 0;
                    const result = await DbService.updateProductStock(sku, newStock);
                    if (result.success) {
                        setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
                        showSystemAlert(`Perda registrada: ${pendingQty} ${pendingProduct.unit} de "${pendingProduct.name}" (Material de Estoque). Estoque atualizado. Novo estoque: ${newStock} ${pendingProduct.unit}`, 'Sucesso');
                    } else {
                        setProducts(prev => prev.map(p => p.sku === sku ? { ...p, stock: newStock } : p));
                        showSystemAlert(`[Aviso] Salvo localmente: estoque de ${pendingProduct.name} reduzido para ${newStock} por perda de estoque.`, 'Salvo Localmente');
                    }
                }
            } else {
                showSystemAlert(`Perda registrada: ${pendingQty} ${pendingProduct.unit} de "${pendingProduct.name}" (${reason === 'Outros' && customReasonText ? customReasonText : reason}). Estoque não foi alterado (Material em Processo).`, 'Descarte Registrado');
            }

            // Reset flow
            setFlowStep('category');
            setCurrentCategory(null);
            setPendingProduct(null);
            setPendingQty(0);
            setSelectedReason('');
            setCustomReasonText('');
            setSelectedLossSector('');
            setLossMaterialType('estoque');
            return;
        }

        // ENTRADA / SAIDA: change stock normally
        if (flowType === 'entrada') {
            // Validar distribuição dos lotes
            const totalDistributed = entryBatches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
            if (Math.abs(totalDistributed - pendingQty) > 0.0001) {
                showSystemAlert(`A soma das quantidades dos lotes (${totalDistributed.toFixed(2)}) deve ser exatamente igual à quantidade total informada (${pendingQty}).`, 'Atenção');
                return;
            }

            // Validar se todos os lotes têm código e quantidade válida
            for (let i = 0; i < entryBatches.length; i++) {
                const b = entryBatches[i];
                if (!b.lot.trim()) {
                    showSystemAlert(`O lote #${i+1} deve ter um código identificador.`, 'Atenção');
                    return;
                }
                const bQty = parseFloat(b.quantity) || 0;
                if (bQty <= 0) {
                    showSystemAlert(`A quantidade do lote "${b.lot}" deve ser maior que zero.`, 'Atenção');
                    return;
                }
            }

            // Salvar cada lote no banco de dados
            let allSuccess = true;
            let savedLots = [];

            for (const b of entryBatches) {
                const batchData = {
                    itemSku: sku,
                    lot: b.lot.trim(),
                    quantity: parseFloat(b.quantity) || 0,
                    unit: pendingProduct.unit,
                    pricePerUnit: parseCurrencyToFloat(b.pricePerUnit),
                    expirationDate: b.expirationDate || null,
                    manufacturingDate: b.manufacturingDate || null,
                    supplier: b.supplier || null,
                    brand: pendingProduct.brand || null,
                    address: b.address || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const result = await DbService.addStockBatch(batchData);
                if (result.success) {
                    savedLots.push(b.lot);
                } else {
                    allSuccess = false;
                }
            }

            await recalculateProductStockFromBatches();

            if (allSuccess || savedLots.length > 0) {
                // Registrar log de movimentação de entrada
                try {
                    const lotsStr = entryBatches.map(b => `Lote: ${b.lot} (Qtd: ${b.quantity} ${pendingProduct.unit}, Forn: ${b.supplier || 'Não informado'})`).join('; ');
                    await DbService.saveStockMovement({
                        sku: sku,
                        productName: pendingProduct.name,
                        type: 'Entrada',
                        quantity: pendingQty,
                        userName: state.currentUser ? state.currentUser.name : 'Operador',
                        details: `Entrada de Lote(s): ${lotsStr}`
                    });
                } catch (err) {
                    console.error('[Logistics] Erro ao registrar movimentação de entrada:', err);
                }
            }

            if (allSuccess) {
                showSystemAlert(`Entrada registrada com sucesso! ${entryBatches.length} lote(s) cadastrado(s): ${savedLots.join(', ')}.`, 'Sucesso');
            } else if (savedLots.length > 0) {
                showSystemAlert(`Entrada registrada parcialmente. Lotes cadastrados: ${savedLots.join(', ')}. Alguns lotes falharam ao salvar no servidor.`, 'Salvo Parcialmente');
            } else {
                showSystemAlert(`Erro ao registrar entrada dos lotes.`, 'Erro');
            }
        } else if (flowType === 'saida') {
            let newStock = currentStock - pendingQty;
            if (newStock < 0) newStock = 0;

            const productBatches = stockBatches.filter(b => b.itemSku === sku);

            if (productBatches.length > 0) {
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

            // Registrar log de movimentação de saída
            try {
                await DbService.saveStockMovement({
                    sku: sku,
                    productName: pendingProduct.name,
                    type: 'Saída',
                    quantity: pendingQty,
                    userName: state.currentUser ? state.currentUser.name : 'Operador',
                    details: 'Retirada para WMS / consumo operacional interno.'
                });
            } catch (err) {
                console.error('[Logistics] Erro ao registrar movimentação de saída:', err);
            }
        }

        // Log transaction
        if (flowType === 'saida') {
            try {
                const logsRaw = localStorage.getItem('corellux_movement_logs');
                const logs = logsRaw ? JSON.parse(logsRaw) : [];
                const today = new Date();
                const newLog = {
                    id: 'mov_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    sku: sku,
                    date: today.toISOString().split('T')[0],
                    qty: pendingQty,
                    dayOfWeek: today.getDay()
                };
                logs.push(newLog);
                localStorage.setItem('corellux_movement_logs', JSON.stringify(logs));
                setScRecalcKey(prev => prev + 1);
            } catch (err) {
                console.error('[Logistics] Error logging movement to localStorage:', err);
            }
        }

        console.log(`[Logistics] ${flowType.toUpperCase()} - SKU: ${sku}, Qtd: ${pendingQty}`);

        // Reset flow
        setFlowStep('category');
        setCurrentCategory(null);
        setPendingProduct(null);
        setPendingQty(0);
        setSelectedReason('');
        
        // Reset entry form fields
        setEntryPricePerUnit('');
        setEntryLot('');
        setEntryExpDate('');
        setEntrySupplier('');
        setEntryBrand('');
        setEntryAddress('');
        setEntryMfgDate('');

        // Reset barcode states
        setBarcodeEntryMode(false);
        setBarcodePackageType('unidade');
        setBarcodePackageQty(1);
        setBarcodeConversionFactor(1);
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
            setActiveTab('menu');
        });
    };

    // =============================================
    // SUPERVISOR APPROVAL LOGIC
    // =============================================

    const handleApproveRequest = (reqId) => {
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

        // Initialize allocations with the available stock batches
        const initialBatches = stockBatches.filter(b => b.itemSku === req.itemSku && b.quantity > 0);
        setCustomAllocations(initialBatches.map(b => ({
            id: b.id,
            address: b.address || '',
            lot: b.lot || '',
            quantity: '',
            isCustom: false,
            availableQty: b.quantity
        })));

        // Open the custom modal
        setActiveApprovalRequest(req);
        setFollowFefoSuggestion(true);
        setManualAddress('');
        setManualLot('');
    };

    const handleUpdateAllocation = (id, field, value) => {
        setCustomAllocations(prev => prev.map(a => {
            if (a.id === id) {
                return { ...a, [field]: value };
            }
            return a;
        }));
    };

    const handleRemoveAllocation = (id) => {
        setCustomAllocations(prev => prev.filter(a => a.id !== id));
    };

    const handleAddCustomAllocation = () => {
        const newId = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        setCustomAllocations(prev => [
            ...prev,
            {
                id: newId,
                address: '',
                lot: '',
                quantity: '',
                isCustom: true,
                availableQty: 999999
            }
        ]);
    };

    const confirmApproveRequest = async () => {
        if (!activeApprovalRequest) return;
        
        const req = activeApprovalRequest;
        const reqId = req.id;
        const product = products.find(p => p.sku === req.itemSku);
        
        if (!product) return;

        const productBatches = stockBatches.filter(b => b.itemSku === req.itemSku && b.quantity > 0);
        const hasBatches = productBatches.length > 0;
        
        // Proceed to approve and deduct stock
        const activeAllocations = customAllocations.filter(a => parseFloat(a.quantity || 0) > 0);
        if (hasBatches && followFefoSuggestion) {
            // 1. Follow FEFO Suggestion
            await deductStockFromBatchesFefo(req.itemSku, req.quantity);
        } else {
            // 2. Custom allocations (Manual input)
            const totalAllocated = activeAllocations.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
            if (Math.abs(totalAllocated - req.quantity) > 0.0001) {
                showSystemAlert(`Erro: A quantidade total alocada (${totalAllocated}) deve ser exatamente igual à quantidade solicitada (${req.quantity}).`, 'Erro');
                return;
            }

            const missingAddress = activeAllocations.some(a => !(a.address || '').trim());
            if (missingAddress) {
                showSystemAlert('Erro: Todos os lotes/endereços selecionados para retirada devem possuir um endereço preenchido.', 'Erro');
                return;
            }

            await deductCustomAllocations(req.itemSku, customAllocations);
        }

        // Update request status
        const updatedRequests = requests.map(r => r.id === reqId ? {
            ...r,
            status: 'Entregue',
            approvedBy: state.currentUser ? state.currentUser.name : 'Supervisor',
            approvedAt: new Date().toLocaleString('pt-BR'),
            withdrawalAddress: hasBatches && followFefoSuggestion 
                ? calculateFefoPlan(req.itemSku, req.quantity).plan.map(item => item.batch.address).join(', ')
                : activeAllocations.map(a => a.address.trim()).join(', '),
            withdrawalLot: hasBatches && followFefoSuggestion
                ? calculateFefoPlan(req.itemSku, req.quantity).plan.map(item => item.batch.lot || 'Sem Lote').join(', ')
                : activeAllocations.map(a => (a.lot || '').trim() || 'Sem Lote').join(', ')
        } : r);

        saveRequests(updatedRequests);

        // Registrar log de movimentação de saída para requisição aprovada
        try {
            const detailsText = hasBatches && followFefoSuggestion
                ? `FEFO. Destino: ${req.destinationSector || 'Não informado'}. Solic: ${req.userName}.`
                : `Manual (Alocações: ${activeAllocations.map(a => `${a.address.trim()}:${(a.lot || '').trim() || 'Sem Lote'}(${a.quantity})`).join(', ')}). Destino: ${req.destinationSector || 'Não informado'}. Solic: ${req.userName}.`;

            await DbService.saveStockMovement({
                sku: req.itemSku,
                productName: req.itemName,
                type: 'Saída',
                quantity: req.quantity,
                userName: state.currentUser ? state.currentUser.name : 'Supervisor',
                details: `Req. Aprovada. ${detailsText}`
            });
        } catch (err) {
            console.error('[Logistics] Erro ao registrar movimentação de requisição:', err);
        }

        // Log transaction to movement logs
        try {
            const logsRaw = localStorage.getItem('corellux_movement_logs');
            const logs = logsRaw ? JSON.parse(logsRaw) : [];
            const today = new Date();
            const newLog = {
                id: 'mov_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                sku: req.itemSku,
                date: today.toISOString().split('T')[0],
                qty: req.quantity,
                dayOfWeek: today.getDay()
            };
            logs.push(newLog);
            localStorage.setItem('corellux_movement_logs', JSON.stringify(logs));
            setScRecalcKey(prev => prev + 1);
        } catch (err) {
            console.error('[Logistics] Error logging movement to localStorage:', err);
        }

        // Close modal and alert success
        setActiveApprovalRequest(null);
        showSystemAlert('Solicitação aprovada e insumo baixado do estoque!', 'Sucesso');
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

                                <button 
                                    className="menu-card teal"
                                    onClick={() => { setActiveTab('supply-chain'); setScSubTab('overview'); }}
                                >
                                    <div className="card-icon"><BarChart3 size={24} /></div>
                                    <div className="card-content">
                                        <h3>SUPPLY CHAIN</h3>
                                        <p>Inteligência preditiva, sugestões de compra e análise de cobertura.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card gray"
                                    onClick={() => setActiveTab('wip')}
                                >
                                    <div className="card-icon"><Clock size={24} /></div>
                                    <div className="card-content">
                                        <h3>WIP</h3>
                                        <p>Módulo em desenvolvimento. Novas funcionalidades em breve.</p>
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
                                                <th style={{ textAlign: 'center', minWidth: '120px' }}>Preço Unit. Médio</th>
                                                <th style={{ textAlign: 'center' }}>Médio</th>
                                                <th onClick={() => handleSort('avgDailyConsumption')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '130px' }} className={sortField === 'avgDailyConsumption' ? 'active-sort' : ''}>
                                                    Uso Diário Méd. {sortField === 'avgDailyConsumption' && (sortOrder === 'asc' ? '▲' : '▼')}
                                                </th>
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
                                                    const scMetric = supplyChainData.inventoryMetrics?.find(m => m.sku === p.sku);
                                                    const avgDaily = scMetric ? scMetric.avgDailyConsumption : 0;
                                                    
                                                    const useDynamic = scMetric && scMetric.hasHistory;
                                                    
                                                    const avgVal = useDynamic 
                                                        ? Math.round(scTargetDays * avgDaily) 
                                                        : (p.avgStock || 0);
                                                    
                                                    const minVal = useDynamic 
                                                        ? Math.round(avgVal * 0.5) 
                                                        : (p.minStock || 0);
                                                        
                                                    const maxVal = useDynamic 
                                                        ? Math.round(avgVal * 1.5) 
                                                        : (p.maxStock || 0);

                                                    const isLow = p.stock <= minVal;
                                                    const isOut = p.stock <= 0;
                                                    const isExpanded = expandedItems.has(p.sku);
                                                    
                                                    // Expiration checks for FEFO warning tags
                                                    const productBatches = stockBatches.filter(b => b.itemSku === p.sku);
                                                    const hasExpired = productBatches.some(b => getBatchExpiryStatus(b.expirationDate).label === 'VENCIDO');

                                                    // Calcular preço médio ponderado dos lotes
                                                    let totalQty = 0;
                                                    let totalCost = 0;
                                                    productBatches.forEach(b => {
                                                        const qty = parseFloat(b.quantity) || 0;
                                                        const priceVal = b.pricePerUnit !== undefined ? b.pricePerUnit : (b.price_per_unit || 0);
                                                        const price = parseFloat(priceVal) || 0;
                                                        totalQty += qty;
                                                        totalCost += qty * price;
                                                    });
                                                    const avgUnitPrice = totalQty > 0 ? (totalCost / totalQty) : 0;
                                                    const avgUnitPriceFormatted = `R$ ${avgUnitPrice.toFixed(2).replace('.', ',')}`;

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
                                                                <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--accent-green)' }}>
                                                                    {avgUnitPriceFormatted}
                                                                </td>
                                                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                                    <div className="sc-tooltip" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                                                        <span style={{ borderBottom: '1px dotted var(--accent-orange)', paddingBottom: '1px' }}>{avgVal}</span>
                                                                        <div className="sc-tooltip-content" style={{ minWidth: '160px', padding: '0.8rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', zIndex: 1000 }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                                                                    <span style={{ color: '#94a3b8' }}>Mínimo:</span>
                                                                                    <strong style={{ color: '#f87171' }}>{minVal} {p.unit}</strong>
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                                                                    <span style={{ color: '#94a3b8' }}>Médio (Ideal):</span>
                                                                                    <strong style={{ color: 'var(--accent-teal)' }}>{avgVal} {p.unit}</strong>
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                                                                    <span style={{ color: '#94a3b8' }}>Máximo:</span>
                                                                                    <strong style={{ color: '#4ade80' }}>{maxVal} {p.unit}</strong>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                                    {formatDailyConsumption(avgDaily, p.unit)} {p.unit}/dia
                                                                </td>
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
                                                                    <td colSpan="8" style={{ padding: '1rem 1.5rem', borderLeft: '4px solid var(--accent-orange)' }}>
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
                                                                            
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenAddBatch(p)}
                                                                                style={{
                                                                                    background: 'rgba(168, 85, 247, 0.12)',
                                                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                                                                    color: '#c084fc',
                                                                                    padding: '0.35rem 0.75rem',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '0.78rem',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.3rem',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                                                                                    e.currentTarget.style.transform = 'none';
                                                                                }}
                                                                            >
                                                                                <Boxes size={13} />
                                                                                + Novo Lote
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

                                <button 
                                    className="menu-card blue" 
                                    onClick={() => {
                                        setFlowType('historico');
                                        loadStockMovements();
                                    }}
                                >
                                    <div className="card-icon"><ClipboardList size={24} /></div>
                                    <div className="card-content">
                                        <h3>HISTÓRICO LOG</h3>
                                        <p>Visualizar logs completos de todas as movimentações de estoque (entradas, saídas, perdas).</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>
                            </div>
                        )}

                        {/* TAB 2 & TAB 3: MOVIMENTAR ESTOQUE & SOLICITAÇÕES */}
                        {((activeTab === 'movimentar' && flowType) || activeTab === 'solicitacao') && (
                            <div className="flow-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                
                                {activeTab === 'movimentar' && flowType && flowType !== 'historico' && (
                                    <div style={{
                                        background: 'var(--bg-card)',
                                        padding: '1.2rem 1.5rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.8rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <Barcode size={20} style={{ color: flowType === 'entrada' ? 'var(--accent-green)' : flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)' }} />
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Leitor de Código de Barras (GTIN/EAN) - {flowType === 'entrada' ? 'Entrada' : flowType === 'saida' ? 'Saída' : 'Perdas'}
                                            </h4>
                                        </div>
                                        <form onSubmit={handleBarcodeSearch} style={{ display: 'flex', gap: '0.8rem', width: '100%' }}>
                                            <input 
                                                type="text"
                                                placeholder={`Escaneie ou digite o GTIN/EAN da embalagem (unidade, fardo, caixa ou pallet) para registrar ${flowType === 'entrada' ? 'entrada' : flowType === 'saida' ? 'saída' : 'perda'}...`}
                                                value={barcodeInput}
                                                onChange={(e) => setBarcodeInput(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-input)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600'
                                                }}
                                                autoFocus
                                            />
                                            <button 
                                                type="submit"
                                                style={{
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '8px',
                                                    background: flowType === 'entrada' ? 'var(--accent-green)' : flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                                    color: flowType === 'perdas' ? '#422006' : '#ffffff',
                                                    border: 'none',
                                                    fontWeight: '800',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                            >
                                                BUSCAR
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* FLOW STEP 1: CATEGORY SELECTION */}
                                {flowStep === 'category' && flowType !== 'historico' && (
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
                                {flowStep === 'product' && currentCategory && flowType !== 'historico' && (
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

                                {/* WMS STOCK FLOW LOG (HISTÓRICO) */}
                                {flowType === 'historico' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Cabeçalho Local do Histórico */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                            <button 
                                                onClick={() => setFlowType(null)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <ArrowLeft size={16} /> Voltar ao Menu
                                            </button>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>HISTÓRICO DE MOVIMENTAÇÕES (STOCK FLOW LOG)</h3>
                                        </div>

                                        {/* Filtros e Barra de Pesquisa */}
                                        <div style={{
                                            background: 'var(--bg-card)',
                                            padding: '1.25rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color)',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por SKU, Produto ou Operador..."
                                                        value={movSearchQuery}
                                                        onChange={(e) => setMovSearchQuery(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.65rem 1rem 0.65rem 2.2rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border-color)',
                                                            background: 'var(--bg-input)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Filtro:</span>
                                                {['todos', 'entrada', 'saida', 'perda'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setMovFilterType(type)}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            borderRadius: '6px',
                                                            background: movFilterType === type ? 'var(--accent-orange)' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid ' + (movFilterType === type ? 'var(--accent-orange)' : 'var(--border-color)'),
                                                            color: movFilterType === type ? '#ffffff' : 'var(--text-secondary)',
                                                            fontSize: '0.78rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            textTransform: 'uppercase',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {type === 'todos' ? 'Todos' : type === 'saida' ? 'Saídas' : type === 'perda' ? 'Perdas' : 'Entradas'}
                                                    </button>
                                                ))}
                                                
                                                <button
                                                    onClick={loadStockMovements}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        marginLeft: '0.5rem'
                                                    }}
                                                    title="Atualizar Logs"
                                                >
                                                    <RefreshCw size={16} className={isLoadingMovements ? 'spin' : ''} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tabela de Logs */}
                                        <div className="table-responsive" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                            {isLoadingMovements ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                                    <RefreshCw size={36} className="spin" style={{ marginBottom: '1rem', color: 'var(--accent-orange)' }} />
                                                    <p style={{ fontWeight: '600' }}>Carregando histórico do estoque...</p>
                                                </div>
                                            ) : (() => {
                                                const filtered = movements.filter(m => {
                                                    const query = movSearchQuery.toLowerCase().trim();
                                                    const matchText = (m.sku || '').toLowerCase().includes(query) || 
                                                                      (m.productName || '').toLowerCase().includes(query) || 
                                                                      (m.userName || '').toLowerCase().includes(query);
                                                    if (!matchText) return false;
                                                    if (movFilterType !== 'todos') {
                                                        const normalizedType = m.type === 'Saída' ? 'saida' : (m.type || '').toLowerCase();
                                                        return normalizedType === movFilterType;
                                                    }
                                                    return true;
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                                            <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                            <p style={{ fontWeight: '600' }}>Nenhuma movimentação de estoque encontrada.</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <table className="products-table" style={{ width: '100%' }}>
                                                        <thead>
                                                            <tr>
                                                                <th>Data/Hora</th>
                                                                <th>SKU</th>
                                                                <th>Produto</th>
                                                                <th style={{ textAlign: 'center' }}>Tipo</th>
                                                                <th style={{ textAlign: 'right' }}>Qtd</th>
                                                                <th>Operador</th>
                                                                <th>Detalhes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filtered.map((m, idx) => {
                                                                const typeColor = m.type === 'Entrada' ? 'var(--accent-green)' : m.type === 'Saída' ? 'var(--accent-red)' : 'var(--accent-yellow)';
                                                                const typeBg = m.type === 'Entrada' ? 'rgba(46,212,191,0.08)' : m.type === 'Saída' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)';
                                                                
                                                                const formattedDate = m.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                                                                const formattedTime = m.time ? m.time.slice(0, 5) : '';

                                                                return (
                                                                    <tr key={m.id || idx}>
                                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formattedDate}</span>
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>{formattedTime}</span>
                                                                        </td>
                                                                        <td>
                                                                            <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '800' }}>{m.sku}</code>
                                                                        </td>
                                                                        <td>
                                                                            <span style={{ fontWeight: '700' }}>{m.productName}</span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span style={{
                                                                                display: 'inline-block',
                                                                                padding: '3px 8px',
                                                                                borderRadius: '12px',
                                                                                fontSize: '0.72rem',
                                                                                fontWeight: '800',
                                                                                color: typeColor,
                                                                                background: typeBg,
                                                                                border: `1px solid ${typeColor}20`
                                                                            }}>
                                                                                {m.type.toUpperCase()}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'right', fontWeight: '800', color: typeColor }}>
                                                                            {m.type === 'Entrada' ? '+' : '-'}{m.quantity}
                                                                        </td>
                                                                        <td>
                                                                            <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>{m.userName}</span>
                                                                        </td>
                                                                        <td>
                                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.details || '—'}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                );
                                            })()}
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
                                                <th>Sugestão (FEFO)</th>
                                                <th>Qtd</th>
                                                <th>Solicitado Por</th>
                                                <th>Setor / Área</th>
                                                <th>Data/Hora</th>
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
                                                                                <strong style={{ color: 'var(--text-primary)' }}>{item.batch.lot}</strong> (-{item.quantityToTake} {product?.unit || ''})
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
                                                            <td>
                                                                <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '600' }}>
                                                                    {req.requestedBy}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="category-tag" style={{ 
                                                                    background: 'rgba(255,255,255,0.02)', 
                                                                    color: 'var(--text-primary)',
                                                                    fontSize: '0.7rem',
                                                                    padding: '0.25rem 0.5rem'
                                                                }}>
                                                                    {(() => {
                                                                        const s = (req.sector || 'COZINHA').toUpperCase();
                                                                        if (s === 'ADMINISTRATIVO E FINANCEIRO') return 'ADM / FIN';
                                                                        if (s === 'ESTOQUE E SUPRIMENTOS') return 'ESTOQUE';
                                                                        return s;
                                                                    })()}
                                                                </span>
                                                                <br />
                                                                <small style={{ color: 'var(--text-secondary)' }}>{req.area || 'Auxiliar'}</small>
                                                            </td>
                                                            <td>
                                                                {(() => {
                                                                    const parts = (req.requestedAt || '').split(',');
                                                                    if (parts.length === 2) {
                                                                        return (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', lineHeight: '1.2' }}>
                                                                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{parts[0].trim()}</span>
                                                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{parts[1].trim()}</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <small>{req.requestedAt}</small>;
                                                                })()}
                                                            </td>
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
                                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {isPending ? (
                                                                    canApprove ? (
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                            <button 
                                                                                className="action-btn-sm" 
                                                                                onClick={() => handleApproveRequest(req.id)}
                                                                                title="Aprovar entrega"
                                                                                style={{ color: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            >
                                                                                <Check size={16} />
                                                                            </button>
                                                                            <button 
                                                                                className="action-btn-sm" 
                                                                                onClick={() => handleRejectRequest(req.id)}
                                                                                title="Recusar solicitação"
                                                                                style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                            Aguardando Supervisor
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', lineHeight: '1.2' }}>
                                                                        <span style={{ fontWeight: '600' }}>{req.status === 'Recusado' ? 'Recusado: ' : 'Liberação: '}</span>
                                                                        <br />
                                                                        <span style={{ textTransform: 'uppercase' }}>{req.approvedBy}</span>
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
                                                <th>Origem</th>
                                                <th>Setor</th>
                                                <th>Motivo</th>
                                                <th>Registrado Por</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lossRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
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
                                                            {rec.materialType === 'processo' ? (
                                                                <span style={{
                                                                    background: 'rgba(168, 85, 247, 0.12)',
                                                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                                                    color: '#c084fc',
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700'
                                                                }}>Processo</span>
                                                            ) : (
                                                                <span style={{
                                                                    background: 'rgba(243, 107, 29, 0.12)',
                                                                    border: '1px solid rgba(243, 107, 29, 0.35)',
                                                                    color: 'var(--accent-orange)',
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700'
                                                                }}>Estoque</span>
                                                            )}
                                                        </td>
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
                        {activeTab === 'wms' && (() => {
                            // Encontrar armazém selecionado
                            const selectedWh = wmsWarehouses.find(w => String(w.id) === String(wmsViewWarehouseId));
                            // Zonas do armazém selecionado
                            const whZones = wmsZones.filter(z => String(z.warehouseId) === String(wmsViewWarehouseId));
                            const selectedZ = wmsZones.find(z => String(z.id) === String(wmsViewZoneId));

                            // Filtrar localizações da zona selecionada
                            const zoneLocs = wmsLocations.filter(l => String(l.zoneId) === String(wmsViewZoneId));

                            // Ruas (Corredores) disponíveis
                            const availableAisles = [...new Set(zoneLocs.map(l => l.aisle))].sort((a, b) => {
                                const numA = parseInt(a, 10);
                                const numB = parseInt(b, 10);
                                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                return a.localeCompare(b);
                            });

                            // Endereços filtrados pela Rua e Fileira (Lado)
                            const filteredLocs = zoneLocs.filter(l => 
                                l.aisle === wmsViewAisle && 
                                l.row === wmsViewRow
                            );

                            const parseShelf = (shelfCode) => {
                                const match = String(shelfCode).match(/^(\d+)([A-Z]?)$/);
                                if (match) return { num: parseInt(match[1], 10), height: match[2] || '' };
                                return { num: NaN, height: '' };
                            };

                            // Prateleiras ordenadas
                            const shelfNums = [...new Set(filteredLocs.map(l => parseShelf(l.shelf).num))]
                                .filter(n => !isNaN(n))
                                .sort((a, b) => a - b);

                            // Alturas ordenadas (D > C > B > A)
                            const heightLetters = [...new Set(filteredLocs.map(l => parseShelf(l.shelf).height))]
                                .filter(h => h !== '')
                                .sort((a, b) => b.localeCompare(a));

                            const hasHeights = heightLetters.length > 0;

                            return (
                                <div className="products-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Warehouse size={20} /> WMS &mdash; Mapa 2D de Armazenamento
                                            </h2>
                                            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                Visualização em tempo real das posições físicas e lotes estocados no armazém.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Selectors Bar */}
                                    <div style={{ 
                                        background: 'rgba(30, 41, 59, 0.25)', 
                                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                                        borderRadius: '12px', 
                                        padding: '1.25rem', 
                                        display: 'flex', 
                                        flexWrap: 'wrap', 
                                        gap: '1.5rem', 
                                        alignItems: 'center',
                                        backdropFilter: 'blur(10px)'
                                    }}>
                                        {/* Armazém */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Armazém:</span>
                                            <select 
                                                value={wmsViewWarehouseId} 
                                                onChange={e => setWmsViewWarehouseId(e.target.value)}
                                                style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                {wmsWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Zona */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Zona:</span>
                                            <select 
                                                value={wmsViewZoneId} 
                                                onChange={e => setWmsViewZoneId(e.target.value)}
                                                style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                            >
                                                {whZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Rua (Corredor) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Rua (Corredor):</span>
                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                {availableAisles.length === 0 ? (
                                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhuma rua configurada</span>
                                                ) : (
                                                    availableAisles.map(aisle => (
                                                        <button
                                                            key={aisle}
                                                            onClick={() => setWmsViewAisle(aisle)}
                                                            style={{
                                                                padding: '0.35rem 0.75rem',
                                                                borderRadius: '6px',
                                                                border: wmsViewAisle === aisle ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                                                                background: wmsViewAisle === aisle ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                                                                color: wmsViewAisle === aisle ? 'white' : 'var(--text-secondary)',
                                                                fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            Rua {aisle}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Fileira (Lado) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fileira (Lado):</span>
                                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                {['A', 'B'].map(row => (
                                                    <button
                                                        key={row}
                                                        onClick={() => setWmsViewRow(row)}
                                                        style={{
                                                            padding: '0.35rem 0.9rem',
                                                            borderRadius: '6px',
                                                            border: wmsViewRow === row ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                                                            background: wmsViewRow === row ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                                                            color: wmsViewRow === row ? 'white' : 'var(--text-secondary)',
                                                            fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {row === 'A' ? '← Lado A (Esquerdo)' : 'Lado B (Direito) →'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid Visual Map */}
                                    {wmsLocations.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                            Nenhum endereço cadastrado nesta zona.
                                        </div>
                                    ) : !wmsViewAisle ? (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                            Selecione uma rua e lado para visualizar o mapa.
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            background: 'rgba(0,0,0,0.25)', 
                                            padding: '1.25rem', 
                                            borderRadius: '12px', 
                                            border: '1px solid var(--border-color)', 
                                            overflowX: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}>
                                            {/* Subtitle / Legend */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Map size={14} /> Corredor: Rua {wmsViewAisle} &mdash; Lado {wmsViewRow === 'A' ? 'A (Esquerdo)' : 'B (Direito)'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(34,197,94,0.12)', border: '1px solid var(--accent-green)' }} /> Ocupado</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }} /> Livre</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(239,68,68,0.12)', border: '1px solid var(--accent-red)' }} /> Bloqueado</span>
                                                </div>
                                            </div>

                                            {/* Axis labels guide */}
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>↕ Altura (topo = mais alto)</span>
                                                <span>Prateleiras 1 &rarr; N (esquerda para a direita) &rarr;</span>
                                            </div>

                                            {/* Grid layout */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* Y-axis (height letters column) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* Spacer for columns header */}
                                                    <div style={{ height: '28px' }} />
                                                    {(hasHeights ? heightLetters : ['—']).map(h => (
                                                        <div key={h} style={{ height: '125px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-purple)', minWidth: '45px' }}>
                                                            Alt. {h}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Main Grid content */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                                                    {/* X-axis (shelf numbers) */}
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {shelfNums.map(num => (
                                                            <div key={num} style={{ flex: 1, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-purple)', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '6px', minWidth: '160px' }}>
                                                                Prat. {num}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Grid Rows */}
                                                    {(hasHeights ? heightLetters : ['']).map(h => (
                                                        <div key={h} style={{ display: 'flex', gap: '8px' }}>
                                                            {shelfNums.map(num => {
                                                                const shelfCode = hasHeights ? `${num}${h}` : String(num);
                                                                // Localizações correspondentes a esta prateleira
                                                                const cellLocs = filteredLocs
                                                                    .filter(l => l.shelf === shelfCode)
                                                                    .sort((a, b) => (a.position || '').localeCompare(b.position || ''));

                                                                const allBloq = cellLocs.length > 0 && cellLocs.every(l => l.status === 'Bloqueado');

                                                                return (
                                                                    <div 
                                                                        key={num}
                                                                        style={{
                                                                            flex: 1,
                                                                            minWidth: '160px',
                                                                            height: '125px',
                                                                            borderRadius: '8px',
                                                                            border: cellLocs.length === 0 
                                                                                ? '1px dashed rgba(255,255,255,0.05)'
                                                                                : allBloq 
                                                                                    ? '1px solid rgba(239,68,68,0.35)' 
                                                                                    : '1px solid rgba(255,255,255,0.08)',
                                                                            background: cellLocs.length === 0 
                                                                                ? 'rgba(255,255,255,0.005)' 
                                                                                : 'rgba(15,23,42,0.3)',
                                                                            padding: '6px',
                                                                            boxSizing: 'border-box',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '4px',
                                                                            overflow: 'hidden'
                                                                        }}
                                                                    >
                                                                        {cellLocs.length === 0 ? (
                                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.1)' }}>—</span>
                                                                            </div>
                                                                        ) : (
                                                                            cellLocs.map(loc => {
                                                                                // Endereço completo formatado
                                                                                const whAcronym = (selectedWh?.acronym || 'AC').substring(0, 2).toUpperCase();
                                                                                const zoneName = (selectedZ?.name || 'ESA').substring(0, 3).toUpperCase();
                                                                                const parts = [`${whAcronym}-${zoneName}`];
                                                                                if (loc.aisle || loc.row) {
                                                                                    parts.push(`${loc.aisle || ''}${loc.row || ''}`);
                                                                                }
                                                                                if (loc.shelf) parts.push(loc.shelf);
                                                                                if (loc.position) parts.push(loc.position);
                                                                                const formattedAddress = parts.join('-');

                                                                                // Filtrar lotes no endereço
                                                                                const cellBatches = stockBatches.filter(b => b.address === formattedAddress && (parseFloat(b.quantity) || 0) > 0);
                                                                                const isAtivo = loc.status === 'Ativo';
                                                                                const isOcupado = cellBatches.length > 0;

                                                                                // Cores e bordas da subdivisão (posição)
                                                                                const bgStyle = !isAtivo 
                                                                                    ? 'rgba(239, 68, 68, 0.08)' // Bloqueado
                                                                                    : isOcupado 
                                                                                        ? 'rgba(34, 197, 94, 0.08)' // Ocupado
                                                                                        : 'rgba(255, 255, 255, 0.01)'; // Livre

                                                                                const borderStyle = !isAtivo
                                                                                    ? '1px solid rgba(239, 68, 68, 0.25)'
                                                                                    : isOcupado
                                                                                        ? '1px solid rgba(34, 197, 94, 0.25)'
                                                                                        : '1px solid rgba(255,255,255,0.05)';

                                                                                const badgeColor = !isAtivo
                                                                                    ? 'var(--accent-red)'
                                                                                    : isOcupado
                                                                                        ? 'var(--accent-green)'
                                                                                        : 'var(--text-secondary)';

                                                                                const visibleBatches = cellBatches.slice(0, 2);
                                                                                const remainingCount = cellBatches.length - 2;

                                                                                const tooltipItemsText = cellBatches.length > 0 
                                                                                    ? `\n\nLotes estocados:\n` + cellBatches.map(b => {
                                                                                        const prod = products.find(p => p.sku === b.itemSku);
                                                                                        return `• ${prod?.name || b.itemSku} (Lote: ${b.lot} | Qtd: ${b.quantity} ${prod?.unit || b.unit})`;
                                                                                      }).join('\n')
                                                                                    : '\n\nStatus: Vazio/Livre';
                                                                                
                                                                                const hoverTitle = `Endereço WMS: ${formattedAddress}\nStatus: ${loc.status}${tooltipItemsText}\n\nClique para abrir detalhes completos.`;

                                                                                return (
                                                                                    <div 
                                                                                        key={loc.id}
                                                                                        title={hoverTitle}
                                                                                        onClick={() => setSelectedCellDetail({ 
                                                                                            address: formattedAddress, 
                                                                                            batches: cellBatches, 
                                                                                            location: loc,
                                                                                            warehouse: selectedWh,
                                                                                            zone: selectedZ
                                                                                        })}
                                                                                        style={{
                                                                                            padding: '4px 6px',
                                                                                            borderRadius: '6px',
                                                                                            background: bgStyle,
                                                                                            border: borderStyle,
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '2px',
                                                                                            transition: 'all 0.15s',
                                                                                            cursor: 'pointer',
                                                                                            userSelect: 'none'
                                                                                        }}
                                                                                        onMouseEnter={e => {
                                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                                                                            e.currentTarget.style.background = isOcupado ? 'rgba(34, 197, 94, 0.12)' : (!isAtivo ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)');
                                                                                        }}
                                                                                        onMouseLeave={e => {
                                                                                            e.currentTarget.style.transform = 'none';
                                                                                            e.currentTarget.style.boxShadow = 'none';
                                                                                            e.currentTarget.style.background = bgStyle;
                                                                                        }}
                                                                                    >
                                                                                        {/* Linha superior: Posição + Status */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: badgeColor }}>
                                                                                                Pos. {loc.position || '—'}
                                                                                            </span>
                                                                                            {!isAtivo && (
                                                                                                <Lock size={8} style={{ color: 'var(--accent-red)' }} />
                                                                                            )}
                                                                                            {isAtivo && isOcupado && (
                                                                                                <span style={{ fontSize: '0.58rem', fontWeight: '700', color: 'var(--accent-green)', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>OCUPADO</span>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Lotes/Itens */}
                                                                                        {isAtivo && (
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                                                                                {cellBatches.length === 0 ? (
                                                                                                    <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Livre</span>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        {visibleBatches.map(b => {
                                                                                                            const prod = products.find(p => p.sku === b.itemSku);
                                                                                                            return (
                                                                                                                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.62rem', borderLeft: '1.5px solid var(--accent-green)', paddingLeft: '4px', margin: '1px 0' }}>
                                                                                                                    <span style={{ fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prod?.name || b.itemSku}>
                                                                                                                        {prod?.name || b.itemSku}
                                                                                                                    </span>
                                                                                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.58rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                                                        Lote: {b.lot} &middot; Qtd: <strong style={{ color: '#fff' }}>{b.quantity} {prod?.unit || b.unit}</strong>
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            );
                                                                                                        })}
                                                                                                        {remainingCount > 0 && (
                                                                                                            <div style={{ 
                                                                                                                fontSize: '0.58rem', 
                                                                                                                fontWeight: '700', 
                                                                                                                color: 'var(--accent-purple)', 
                                                                                                                background: 'rgba(168, 85, 247, 0.15)', 
                                                                                                                border: '1px dashed rgba(168, 85, 247, 0.3)',
                                                                                                                padding: '2px 4px', 
                                                                                                                borderRadius: '4px',
                                                                                                                textAlign: 'center',
                                                                                                                marginTop: '2px'
                                                                                                            }}>
                                                                                                                + {remainingCount} lote{remainingCount > 1 ? 's' : ''} (Clique/Passe)
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* TAB: WIP */}
                        {activeTab === 'wip' && (
                            <div className="products-container">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={20} /> WIP
                                        </h2>
                                        <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Módulo em desenvolvimento. Novas funcionalidades serão adicionadas em breve.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--text-secondary)', background: 'rgba(148, 163, 184, 0.04)', border: '1px dashed rgba(148, 163, 184, 0.3)', borderRadius: '16px', padding: '3rem' }}>
                                    <Clock size={48} style={{ color: 'rgba(148, 163, 184, 0.4)' }} />
                                    <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>Nenhum conteúdo disponível ainda.</p>
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Este espaço está reservado para novas implementações e testes.</p>
                                </div>
                            </div>
                        )}

                        {/* TAB: SUPPLY CHAIN */}
                        {activeTab === 'supply-chain' && (() => {
                            const { inventoryMetrics, purchaseSuggestions, pendingAnomalies } = supplyChainData;
                            const abcData = filteredAbcData;

                            const criticalItems = inventoryMetrics.filter(m => m.status === 'CRÍTICO');
                            const avgCoverage = inventoryMetrics.length ? (inventoryMetrics.reduce((s,m) => s + m.coverageDays, 0) / inventoryMetrics.length) : 0;
                            const unresolvedAnomalies = pendingAnomalies.filter(a => !resolvedAnomalies.includes(a.id || a.date + a.sku));

                            const scSearchLower = scSearch.toLowerCase();
                            const filteredMetrics = scSearch
                                ? inventoryMetrics.filter(m => m.name.toLowerCase().includes(scSearchLower) || m.sku.toLowerCase().includes(scSearchLower))
                                : inventoryMetrics;

                            const statusColor = (status) => ({
                                'CRÍTICO': '#f87171', 'ALERTA': '#fbbf24', 'OK': '#4ade80'
                            })[status] || '#94a3b8';

                            const statusBg = (status) => ({
                                'CRÍTICO': 'rgba(239,68,68,0.12)', 'ALERTA': 'rgba(245,158,11,0.12)', 'OK': 'rgba(34,197,94,0.12)'
                            })[status] || 'rgba(148,163,184,0.1)';

                            return (
                                <div className="products-container">
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <h2 style={{ margin: 0, color: 'var(--accent-teal)', fontSize: '1.3rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <BarChart3 size={22} /> SUPPLY CHAIN — Inteligência Preditiva
                                            </h2>
                                            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                Sugestão automática de compras e cálculo de cobertura com base no consumo.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Meta (Dias):</span>
                                            <input
                                                type="number" min="1" max="365"
                                                value={scTargetInput}
                                                onChange={e => setScTargetInput(e.target.value)}
                                                style={{ width: '70px', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', textAlign: 'center' }}
                                            />
                                            <button
                                                onClick={() => { setScTargetDays(parseInt(scTargetInput) || 30); setScRecalcKey(k => k+1); }}
                                                style={{ padding: '0.4rem 0.9rem', background: 'var(--accent-teal)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                            >
                                                <RefreshCw size={14} /> Recalcular
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const val = parseInt(scTargetInput) || 30;
                                                    setScSettingSaving(true);
                                                    const result = await DbService.setSetting('sc_target_days', val);
                                                    setScTargetDays(val);
                                                    setScRecalcKey(k => k + 1);
                                                    setScSettingSaving(false);
                                                    if (result.success) {
                                                        showSystemAlert(`Meta de ${val} dias salva no banco de dados com sucesso!`, 'Sucesso');
                                                    } else {
                                                        showSystemAlert(`Meta de ${val} dias salva localmente (sem conexão com o banco).`, 'Aviso');
                                                    }
                                                }}
                                                disabled={scSettingSaving}
                                                style={{ padding: '0.4rem 0.9rem', background: scSettingSaving ? '#666' : 'var(--accent-orange)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '700', fontSize: '0.82rem', cursor: scSettingSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: scSettingSaving ? 0.7 : 1, transition: 'all 0.2s' }}
                                            >
                                                {scSettingSaving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                                                {scSettingSaving ? 'Salvando...' : 'Salvar'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filtro de Período Global */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        background: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(0,0,0,0.25) 100%)',
                                        border: '1px solid rgba(20,184,166,0.2)',
                                        borderRadius: '14px',
                                        padding: '0.85rem 1.25rem',
                                        marginBottom: '1.5rem',
                                        flexWrap: 'wrap',
                                        boxShadow: '0 2px 16px rgba(20,184,166,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
                                        backdropFilter: 'blur(8px)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Glow accent */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.5), transparent)', pointerEvents: 'none' }} />

                                        {/* Label */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <div style={{
                                                width: '28px', height: '28px',
                                                background: 'rgba(20,184,166,0.15)',
                                                border: '1px solid rgba(20,184,166,0.3)',
                                                borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem'
                                            }}>📅</div>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: '800',
                                                color: 'rgba(20,184,166,0.9)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                            }}>Período de Análise</span>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

                                        {/* Date inputs */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>De</label>
                                                <input
                                                    type="date"
                                                    value={scStartDate}
                                                    onChange={e => setScStartDate(e.target.value)}
                                                    style={{
                                                        background: 'rgba(0,0,0,0.35)',
                                                        border: `1px solid ${scStartDate ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: '9px',
                                                        color: scStartDate ? '#fff' : 'rgba(255,255,255,0.5)',
                                                        padding: '0.4rem 0.8rem',
                                                        fontSize: '0.82rem',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'border-color 0.2s',
                                                        colorScheme: 'dark',
                                                        minWidth: '140px',
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', flexShrink: 0 }}>
                                                <div style={{ width: '12px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(20,184,166,0.6)', marginLeft: '2px' }} />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Até</label>
                                                <input
                                                    type="date"
                                                    value={scEndDate}
                                                    onChange={e => setScEndDate(e.target.value)}
                                                    style={{
                                                        background: 'rgba(0,0,0,0.35)',
                                                        border: `1px solid ${scEndDate ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: '9px',
                                                        color: scEndDate ? '#fff' : 'rgba(255,255,255,0.5)',
                                                        padding: '0.4rem 0.8rem',
                                                        fontSize: '0.82rem',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'border-color 0.2s',
                                                        colorScheme: 'dark',
                                                        minWidth: '140px',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Clear button */}
                                        {(scStartDate || scEndDate) && (
                                            <button
                                                onClick={() => { setScStartDate(''); setScEndDate(''); }}
                                                style={{
                                                    padding: '0.38rem 0.85rem',
                                                    background: 'rgba(239,68,68,0.1)',
                                                    border: '1px solid rgba(239,68,68,0.25)',
                                                    borderRadius: '8px',
                                                    color: '#f87171',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    transition: 'all 0.2s',
                                                    letterSpacing: '0.02em',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                                            >
                                                <span style={{ fontSize: '0.7rem' }}>✕</span> Limpar
                                            </button>
                                        )}

                                        {/* Status text */}
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                width: '6px', height: '6px', borderRadius: '50%',
                                                background: scStartDate || scEndDate ? 'var(--accent-teal)' : 'rgba(255,255,255,0.2)',
                                                boxShadow: scStartDate || scEndDate ? '0 0 6px rgba(20,184,166,0.6)' : 'none',
                                                flexShrink: 0,
                                                transition: 'all 0.3s',
                                            }} />
                                            <span style={{
                                                fontSize: '0.78rem',
                                                color: scStartDate || scEndDate ? 'rgba(20,184,166,0.9)' : 'var(--text-secondary)',
                                                fontWeight: scStartDate || scEndDate ? '700' : '400',
                                                transition: 'all 0.3s',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {scStartDate && scEndDate
                                                    ? `${new Date(scStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(scEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                    : scStartDate
                                                        ? `A partir de ${new Date(scStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                        : scEndDate
                                                            ? `Até ${new Date(scEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                            : 'Todo o histórico disponível'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sub-tab navigation */}
                                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {[
                                            { id: 'overview', label: 'Visão Geral' },
                                            { id: 'suggestions', label: `Sugestões (${purchaseSuggestions.length})` },
                                            { id: 'coverage', label: 'Cobertura' },
                                            { id: 'abc', label: 'Curva ABC' },
                                            { id: 'anomalies', label: `Anomalias (${unresolvedAnomalies.length})` },
                                        ].map(tab => {
                                            const isActive = scSubTab === tab.id;
                                            return (
                                                <div key={tab.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                                                    <button
                                                        onClick={() => setScSubTab(tab.id)}
                                                        style={{
                                                            padding: '0.5rem 0.75rem 0.5rem 1.1rem',
                                                            borderRadius: '20px 0 0 20px',
                                                            borderTop: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderBottom: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderLeft: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderRight: 'none',
                                                            background: isActive ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.04)',
                                                            color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                                                            fontWeight: isActive ? '700' : '500',
                                                            fontSize: '0.82rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            letterSpacing: '0.02em',
                                                        }}
                                                    >{tab.label}</button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setScHelpPopup(tab.id); }}
                                                        title={`O que é ${tab.label}?`}
                                                        style={{
                                                            width: '28px',
                                                            borderRadius: '0 20px 20px 0',
                                                            borderTop: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderBottom: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderRight: isActive ? '1px solid var(--accent-teal)' : '1px solid rgba(255,255,255,0.1)',
                                                            borderLeft: isActive ? '1px solid rgba(20,184,166,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                                            background: isActive ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.02)',
                                                            color: isActive ? 'rgba(20,184,166,0.8)' : 'rgba(255,255,255,0.25)',
                                                            fontWeight: '800',
                                                            fontSize: '0.72rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            padding: 0,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.25)'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = isActive ? 'rgba(20,184,166,0.8)' : 'rgba(255,255,255,0.25)'; }}
                                                    >?</button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ---- Help Popup Modal ---- */}
                                    {scHelpPopup && (() => {
                                        const helpContent = {
                                            overview: {
                                                title: '📊 Visão Geral — O que você vai ver aqui?',
                                                color: 'var(--accent-teal)',
                                                colorHex: '#14b8a6',
                                                intro: 'Esta é a tela principal do Supply Chain. Aqui você tem um resumo rápido da situação do seu estoque — o que está bem, o que está acabando e o que precisa de compra urgente.',
                                                sections: [
                                                    { icon: '🔴', title: 'Itens Críticos — Compre AGORA', text: 'São produtos com estoque tão baixo que vão acabar antes de o fornecedor conseguir entregar. Exemplo: o fornecedor leva 5 dias pra entregar, mas você só tem estoque pra 2 dias. Isso é um item crítico. Se não comprar hoje, vai faltar.' },
                                                    { icon: '🟡', title: 'Abaixo da Meta — Compre em breve', text: 'O estoque ainda aguenta por alguns dias, mas está abaixo do ideal que você configurou. Precisa de atenção, mas ainda tem margem para incluir no próximo pedido sem emergência.' },
                                                    { icon: '🟢', title: 'Estoque Saudável — Tudo certo', text: 'Produtos com quantidade suficiente para o período configurado. Não precisa de nenhuma ação agora.' },
                                                    { icon: '⚙️', title: 'Meta de Dias — O que é isso?', text: 'É o número de dias que você quer sempre ter em estoque. Exemplo: se você colocar 30 dias, o sistema vai avisar sempre que algum produto estiver com menos de 30 dias de reserva. Configure esse número conforme a frequência dos seus pedidos ao fornecedor.' },
                                                    { icon: '📈', title: 'Consumo Médio — Como é calculado?', text: 'O sistema analisa o histórico de saídas aprovadas e calcula quanto você usa de cada produto por dia, em média. Quanto mais histórico registrado, mais preciso fica esse cálculo.' },
                                                ]
                                            },
                                            suggestions: {
                                                title: '🛒 Sugestões de Compra — O que fazer aqui?',
                                                color: 'var(--accent-orange)',
                                                colorHex: '#f36b1d',
                                                intro: 'Esta aba mostra uma lista de produtos que precisam ser comprados. O sistema calculou automaticamente o que está faltando com base no seu consumo diário e na meta de dias configurada.',
                                                sections: [
                                                    { icon: '🚨', title: 'URGENTE — Compre hoje', text: 'Esses produtos estão perigosamente baixos. O sistema detectou que o estoque está abaixo do mínimo aceitável. Se não comprar logo, a operação pode parar por falta desse item.' },
                                                    { icon: '📋', title: 'NORMAL — Próximo pedido', text: 'Estão abaixo do ideal, mas ainda há tempo. Inclua esses itens no seu próximo pedido regular ao fornecedor.' },
                                                    { icon: '📦', title: 'Quantidade Sugerida — De onde vem esse número?', text: 'É exatamente quanto você precisa comprar para atingir a meta configurada. Exemplo: se a meta é 30 dias e você tem estoque para 10 dias, o sistema sugere comprar o equivalente a 20 dias de consumo.' },
                                                    { icon: '🔄', title: 'A lista se atualiza automaticamente', text: 'Sempre que uma entrada ou saída for aprovada no sistema, as sugestões são recalculadas na hora. Não precisa fazer nada manualmente.' },
                                                ]
                                            },
                                            coverage: {
                                                title: '📅 Cobertura de Estoque — O que é isso?',
                                                color: '#a78bfa',
                                                colorHex: '#a78bfa',
                                                intro: 'Cobertura é a resposta para a pergunta: "quantos dias esse estoque vai durar?". Aqui você vê isso para cada produto individualmente, com uma barra visual que mostra a situação de forma clara.',
                                                sections: [
                                                    { icon: '🟢', title: 'Barra verde — Estoque OK', text: 'A barra cheia em verde significa que o produto tem estoque suficiente para a meta de dias que você configurou. Não precisa de ação.' },
                                                    { icon: '🟡', title: 'Barra amarela — Reposição em breve', text: 'O estoque ainda não vai acabar antes do próximo pedido chegar, mas está abaixo do ideal. Coloque no próximo pedido.' },
                                                    { icon: '🔴', title: 'Barra vermelha — Risco de faltar', text: 'O estoque vai acabar antes de o fornecedor conseguir entregar. Precisa comprar com urgência. Se essa barra aparecer, aja o quanto antes.' },
                                                    { icon: '📊', title: 'Mín / Média / Máx — O que significam?', text: 'São referências calculadas pelo sistema. Mínimo = quantidade de alerta (abaixo disso, está crítico). Média = quantidade ideal para a meta configurada. Máximo = acima disso, você está com estoque em excesso e pode estar imobilizando dinheiro desnecessariamente.' },
                                                ]
                                            },
                                            abc: {
                                                title: '📉 Curva ABC — Para que serve?',
                                                color: '#fbbf24',
                                                colorHex: '#fbbf24',
                                                intro: 'A Curva ABC classifica seus produtos por importância financeira. A ideia é simples: nem todo produto merece a mesma atenção. Essa análise diz quais você deve monitorar de perto e quais podem ter controle mais simples.',
                                                sections: [
                                                    { icon: '🅰️', title: 'Classe A — Os mais importantes', text: 'São poucos produtos (cerca de 20%), mas representam a maior parte do que você gasta (cerca de 80%). Exemplo: o frango que vai em todo prato do restaurante. Esses precisam de controle diário, bom fornecedor e nunca podem faltar.' },
                                                    { icon: '🅱️', title: 'Classe B — Importância média', text: 'Produtos com consumo e custo intermediários. Merecem atenção regular, mas não precisam de monitoramento tão intenso quanto os da Classe A.' },
                                                    { icon: '🇨', title: 'Classe C — Menor impacto', text: 'São muitos produtos, mas representam uma fatia pequena do gasto total. Podem ser pedidos em maior quantidade e com menos frequência. Não vale gastar muito tempo gerenciando esses itens.' },
                                                    { icon: '📆', title: 'Filtro por Período', text: 'Quer saber quais produtos foram mais usados em dezembro (época de festas)? Use o filtro de data para ver a curva ABC de um intervalo específico e identificar sazonalidades.' },
                                                    { icon: '💡', title: 'Dica prática', text: 'Foque sua energia e negociação com fornecedores nos itens Classe A. Para os itens C, simplifique: compre mais de uma vez, negocie um preço fixo e diminua a frequência dos pedidos.' },
                                                ]
                                            },
                                            anomalies: {
                                                title: '⚠️ Anomalias — O que o sistema detectou?',
                                                color: '#f87171',
                                                colorHex: '#f87171',
                                                intro: 'O sistema monitora o consumo diário de cada produto e avisa quando algo saiu do padrão. Pode ser um dia em que saiu muito mais do que o normal, ou um dia em que não saiu nada quando devia.',
                                                sections: [
                                                    { icon: '📈', title: 'Consumo muito acima do normal', text: 'Exemplo: você usa em média 10kg de carne por dia, mas num dia específico saíram 50kg. O sistema registra isso como anomalia. Pode ter sido um evento especial, um erro de lançamento ou um desperdício. Você decide o que fazer.' },
                                                    { icon: '📉', title: 'Consumo muito abaixo ou zero', text: 'Exemplo: todo dia sai farinha, mas num dia não saiu nada. Pode indicar que a operação parou, que o produto estava em falta, ou que alguém esqueceu de registrar a saída.' },
                                                    { icon: '🛡️', title: 'Essas anomalias não afetam os cálculos', text: 'Enquanto não forem resolvidas, elas ficam fora do cálculo da média diária. Isso evita que um dia atípico distorça as sugestões de compra e os alertas de estoque.' },
                                                    { icon: '✅', title: 'O que fazer com cada anomalia?', text: 'Clique em "Resolver" se o consumo foi real (ex: teve um evento, banquete ou promoção especial). O sistema vai incorporar esse dado ao histórico. Se foi erro de lançamento ou dado incorreto, você pode descartar — o dia fica excluído permanentemente dos cálculos.' },
                                                ]
                                            },
                                        };
                                        const help = helpContent[scHelpPopup];
                                        if (!help) return null;
                                        return createPortal(
                                            <div
                                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)' }}
                                                onClick={() => setScHelpPopup(null)}
                                            >
                                                <div
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ background: 'var(--surface)', border: `1px solid ${help.colorHex}50`, borderRadius: '20px', padding: '2rem', maxWidth: '560px', width: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: `0 0 80px ${help.colorHex}20, 0 24px 48px rgba(0,0,0,0.6)` }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: help.color }}>{help.title}</h2>
                                                        <button
                                                            onClick={() => setScHelpPopup(null)}
                                                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}
                                                        >✕</button>
                                                    </div>
                                                    {help.intro && (
                                                        <p style={{
                                                            margin: '0 0 1.25rem',
                                                            fontSize: '0.88rem',
                                                            color: 'var(--text-primary)',
                                                            lineHeight: '1.7',
                                                            background: `${help.colorHex}0d`,
                                                            border: `1px solid ${help.colorHex}25`,
                                                            borderLeft: `3px solid ${help.colorHex}`,
                                                            borderRadius: '10px',
                                                            padding: '0.85rem 1rem',
                                                            opacity: 0.9,
                                                        }}>{help.intro}</p>
                                                    )}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                                        {help.sections.map((sec, i) => (
                                                            <div key={i} style={{ background: `${help.colorHex}08`, border: `1px solid ${help.colorHex}20`, borderRadius: '12px', padding: '1rem 1.1rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                                    <span style={{ fontSize: '1rem' }}>{sec.icon}</span>
                                                                    <span style={{ fontWeight: '700', fontSize: '0.87rem', color: help.color }}>{sec.title}</span>
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>{sec.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => setScHelpPopup(null)}
                                                            style={{ padding: '0.6rem 2.2rem', background: `${help.colorHex}20`, border: `1px solid ${help.colorHex}50`, borderRadius: '12px', color: help.color, fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}
                                                        >Entendido ✓</button>
                                                    </div>
                                                </div>
                                            </div>,
                                            document.body
                                        );
                                    })()}

                                    {/* ---- ABA: VISÃO GERAL ---- */}
                                    {scSubTab === 'overview' && (
                                        <div>
                                            {/* KPI Cards */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '1.2rem' }}>
                                                    <div style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <AlertCircle size={14} /> Itens Críticos
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#f87171' }}>{criticalItems.length}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>cobertura abaixo do lead time</div>
                                                </div>
                                                <div style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '14px', padding: '1.2rem' }}>
                                                    <div style={{ color: 'var(--accent-teal)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Package size={14} /> Cobertura Média
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--accent-teal)' }}>{avgCoverage.toFixed(0)}<span style={{ fontSize: '1rem', fontWeight: '600' }}> dias</span></div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>média geral dos produtos</div>
                                                </div>
                                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '1.2rem' }}>
                                                    <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <TrendingUp size={14} /> Sugestões de Compra
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fbbf24' }}>{purchaseSuggestions.length}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>itens abaixo da meta de {scTargetDays} dias</div>
                                                </div>
                                                <div style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '14px', padding: '1.2rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <AlertCircle size={14} /> Anomalias
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#94a3b8' }}>{unresolvedAnomalies.length}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>registros fora do padrão</div>
                                                </div>
                                            </div>

                                            {/* Top Urgentes */}
                                            {purchaseSuggestions.length > 0 && (
                                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.2rem' }}>
                                                    <h3 style={{ margin: '0 0 1rem', color: '#e2e8f0', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <AlertCircle size={16} style={{ color: '#f87171' }} /> Itens que precisam de atenção imediata
                                                    </h3>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                        {purchaseSuggestions.slice(0, 5).map(s => (
                                                            <div key={s.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: `3px solid ${s.status === 'URGENTE' ? '#f87171' : '#fbbf24'}` }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '0.9rem' }}>{s.name}</div>
                                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>SKU: {s.sku} · Fornecedor: {s.supplier} · Lead Time: {s.leadTime} dias</div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontWeight: '700', color: s.status === 'URGENTE' ? '#f87171' : '#fbbf24', fontSize: '0.9rem' }}>{s.currentCoverage.toFixed(1)} dias</div>
                                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>cobertura atual</div>
                                                                    </div>
                                                                    <span style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', background: s.status === 'URGENTE' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'URGENTE' ? '#f87171' : '#fbbf24', border: `1px solid ${s.status === 'URGENTE' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>{s.status}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {purchaseSuggestions.length > 5 && (
                                                        <button onClick={() => setScSubTab('suggestions')} style={{ marginTop: '0.8rem', background: 'none', border: 'none', color: 'var(--accent-teal)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>
                                                            + {purchaseSuggestions.length - 5} itens precisam de reposição — Ver todos
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {purchaseSuggestions.length === 0 && inventoryMetrics.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1.2rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' }}>
                                                    <CheckCircle2 size={20} style={{ color: '#4ade80' }} />
                                                    <span style={{ color: '#4ade80', fontWeight: '600' }}>Estoque saudável. Nenhuma ruptura prevista para a meta de {scTargetDays} dias.</span>
                                                </div>
                                            )}
                                            {inventoryMetrics.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                    <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                                                    <p style={{ margin: 0 }}>Nenhum produto ativo encontrado. Cadastre produtos para ver as métricas.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ---- ABA: SUGESTÕES DE COMPRA ---- */}
                                    {scSubTab === 'suggestions' && (
                                        <div>
                                            <div className="sc-table-container">
                                                <table className="sc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th>Fornecedor</th>
                                                            <th>Cobertura</th>
                                                            <th>Lead Time</th>
                                                            <th>Média / Dia</th>
                                                            <th>Cálculo de Compra</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {purchaseSuggestions.length === 0 ? (
                                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#4ade80' }}>✓ Nenhuma ruptura prevista para a meta de {scTargetDays} dias.</td></tr>
                                                        ) : purchaseSuggestions.map(s => (
                                                            <tr key={s.sku}>
                                                                <td>
                                                                    <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{s.name}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SKU: {s.sku} · {s.category}</div>
                                                                </td>
                                                                <td style={{ color: '#e2e8f0' }}>{s.supplier}</td>
                                                                <td style={{ color: '#f87171', fontWeight: '700' }}>{s.currentCoverage.toFixed(1)} dias</td>
                                                                <td style={{ color: '#94a3b8' }}>{s.leadTime} dias</td>
                                                                <td style={{ color: '#e2e8f0' }}>{formatDailyConsumption(s.avgDailyConsumption, s.unit)}</td>
                                                                <td>
                                                                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{s.suggestedQty} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '400' }}>{s.unit}</span></div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Ciclo: {s.cycleQty} <span style={{ opacity: 0.4 }}>|</span> <span style={{ color: '#fbbf24' }}>Seg: +{s.safetyQty}</span></div>
                                                                </td>
                                                                <td>
                                                                    <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', background: s.status === 'URGENTE' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'URGENTE' ? '#f87171' : '#fbbf24', border: `1px solid ${s.status === 'URGENTE' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>{s.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* ---- ABA: COBERTURA DE ESTOQUE ---- */}
                                    {scSubTab === 'coverage' && (
                                        <div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ position: 'relative', maxWidth: '320px' }}>
                                                    <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                    <input
                                                        placeholder="Buscar produto ou SKU..."
                                                        value={scSearch}
                                                        onChange={e => setScSearch(e.target.value)}
                                                        style={{ paddingLeft: '2.2rem', padding: '0.55rem 0.8rem 0.55rem 2.2rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', width: '100%', fontSize: '0.88rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="sc-table-container">
                                                <table className="sc-table">
                                                    <thead>
                                                        <tr>
                                                            <th>SKU</th>
                                                            <th>Produto</th>
                                                            <th>Unidade</th>
                                                            <th>Disponível</th>
                                                            <th>Média / Dia</th>
                                                            <th>Sazonalidade</th>
                                                            <th>Dias Cobertura</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredMetrics
                                                            .sort((a,b) => a.coverageDays - b.coverageDays)
                                                            .map(m => (
                                                            <tr key={m.sku}>
                                                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{m.sku}</td>
                                                                <td style={{ fontWeight: '600', color: '#e2e8f0' }}>{m.name}</td>
                                                                <td style={{ color: '#94a3b8' }}>{m.unit}</td>
                                                                <td style={{ color: '#e2e8f0' }}>{m.availableStock}</td>
                                                                <td style={{ color: '#e2e8f0' }}>{formatDailyConsumption(m.avgDailyConsumption, m.unit)}</td>
                                                                <td>
                                                                    {m.volatilityScore !== 'LOW' ? (
                                                                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '5px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontWeight: '600' }}>{m.volatilityScore}</span>
                                                                    ) : <span style={{ opacity: 0.3 }}>–</span>}
                                                                </td>
                                                                <td>
                                                                    <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: statusBg(m.status), color: statusColor(m.status), border: `1px solid ${statusColor(m.status)}33` }}>
                                                                        {m.coverageDays >= 999 ? '∞' : `${m.coverageDays.toFixed(1)} dias`}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* ---- ABA: CURVA ABC ---- */}
                                    {scSubTab === 'abc' && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                    {abcData.length} produtos classificados
                                                </span>
                                                {(scStartDate || scEndDate) && (
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', fontWeight: '700' }}>
                                                        📅 {scStartDate && scEndDate
                                                            ? `${new Date(scStartDate + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(scEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                            : scStartDate
                                                                ? `A partir de ${new Date(scStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                                : `Até ${new Date(scEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                                                    </span>
                                                )}
                                            </div>

                                            {abcData.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Sem histórico de consumo para calcular a curva ABC.</div>
                                            ) : (
                                                <div className="sc-table-container">
                                                    <table className="sc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Produto</th>
                                                                <th>Volume Consumido</th>
                                                                <th>Custo Unit.</th>
                                                                <th>Valor Total</th>
                                                                <th>% Acumulado</th>
                                                                <th>Classe</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {abcData.map(item => {
                                                                const abcColor = { A: '#f87171', B: '#fbbf24', C: '#4ade80' }[item.abcClass] || '#94a3b8';
                                                                return (
                                                                    <tr key={item.sku}>
                                                                        <td>
                                                                            <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{item.name}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.sku}</div>
                                                                        </td>
                                                                        <td style={{ color: '#e2e8f0' }}>{formatDailyConsumption(item.volume, item.unit)} {item.unit}</td>
                                                                        <td style={{ color: '#94a3b8' }}>R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                        <td style={{ color: '#e2e8f0', fontWeight: '600' }}>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                        <td style={{ color: '#94a3b8' }}>{item.cumulativePercentage.toFixed(1)}%</td>
                                                                        <td>
                                                    <span style={{ padding: '0.35rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', background: `${abcColor}20`, color: abcColor, border: `1px solid ${abcColor}44` }}>Classe {item.abcClass}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ---- ABA: ANOMALIAS ---- */}
                                    {scSubTab === 'anomalies' && (
                                        <div>
                                            {unresolvedAnomalies.length === 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1.5rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' }}>
                                                    <CheckCircle2 size={20} style={{ color: '#4ade80' }} />
                                                    <span style={{ color: '#4ade80', fontWeight: '600' }}>Nenhuma anomalia de consumo pendente.</span>
                                                </div>
                                            ) : (
                                                <div className="sc-table-container">
                                                    <table className="sc-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Produto</th>
                                                                <th>Data</th>
                                                                <th>Dia Semana</th>
                                                                <th>Média Diária</th>
                                                                <th>Qtd Registrada</th>
                                                                <th>Faixa Esperada</th>
                                                                <th>Ações</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {unresolvedAnomalies.map((a, i) => {
                                                                const DOW_LABELS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
                                                                const anomalyId = a.id || (a.date + a.sku);
                                                                const product = products.find(p => p.sku === a.sku);
                                                                const productName = product ? product.name : 'Produto Desconhecido';
                                                                const productUnit = product ? product.unit : '';
                                                                const scMetric = supplyChainData.inventoryMetrics?.find(m => m.sku === a.sku);
                                                                const avgDaily = scMetric ? scMetric.avgDailyConsumption : (supplyChainData.seasonalityMetrics?.[a.sku]?.overallAvg || 0);
                                                                const displayMin = Math.max(0, a.expectedMin);
                                                                return (
                                                                    <tr key={i}>
                                                                        <td>
                                                                            <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{productName}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {a.sku}</div>
                                                                        </td>
                                                                        <td style={{ color: '#94a3b8' }}>{a.date}</td>
                                                                        <td style={{ color: '#fbbf24', fontWeight: '600' }}>{DOW_LABELS[a.dayOfWeek] || '–'}</td>
                                                                        <td style={{ color: '#94a3b8' }}>
                                                                            {formatDailyConsumption(avgDaily, productUnit)} {productUnit}/dia
                                                                        </td>
                                                                        <td style={{ color: '#f87171', fontWeight: '700' }}>
                                                                            {a.qty} {productUnit}
                                                                        </td>
                                                                        <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                                                            Entre {displayMin} e {a.expectedMax} {productUnit}
                                                                        </td>
                                                                        <td>
                                                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                                                <button
                                                                                    onClick={() => setResolvedAnomalies(prev => [...prev, anomalyId])}
                                                                                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                                                                                >✓ Manter</button>
                                                                                <button
                                                                                    onClick={() => setResolvedAnomalies(prev => [...prev, anomalyId])}
                                                                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                                                                                >✕ Excluir</button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
                            <button className="btn-close-modal" onMouseDown={() => setShowNumpad(false)} title="Fechar">
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
                    <div className="pin-modal-card" style={{ maxWidth: flowType === 'entrada' ? '650px' : '450px', width: '90%', padding: '2rem' }}>
                        {flowType === 'entrada' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Boxes size={42} style={{ color: 'var(--accent-green)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                                        Registrar Entrada de Lote
                                    </h3>
                                </div>

                                {barcodeEntryMode ? (
                                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '0.85rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.25)', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'rgba(34, 197, 94, 0.8)' }}>PRODUTO</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)', textTransform: 'uppercase' }}>
                                                    {barcodePackageType}
                                                </span>
                                            </div>
                                            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#fff', margin: '0.15rem 0' }}>{pendingProduct.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>SKU: {pendingProduct.sku}</div>
                                        </div>
                                        
                                        <div style={{ borderTop: '1px dashed rgba(34, 197, 94, 0.2)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                                                    Quantidade de {barcodePackageType}(s) a receber *
                                                </label>
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={barcodePackageQty}
                                                    onChange={(e) => {
                                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                                        setBarcodePackageQty(val);
                                                        setPendingQty(val * barcodeConversionFactor);
                                                    }}
                                                    required
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '700',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                    1 {barcodePackageType} = {barcodeConversionFactor} {pendingProduct.unit}
                                                </span>
                                                <span style={{ fontWeight: '800', color: 'var(--accent-green)' }}>
                                                    Total Entrada: {pendingQty} {pendingProduct.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '0.85rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.25)', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>PRODUTO</div>
                                        <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#fff', margin: '0.15rem 0' }}>{pendingProduct.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', fontWeight: '500' }}>
                                            <span>SKU: {pendingProduct.sku}</span>
                                            <span style={{ fontWeight: '800', color: 'var(--accent-green)' }}>Entrada: {pendingQty} {pendingProduct.unit}</span>
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const totalDistributed = entryBatches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                                    const isMatched = Math.abs(totalDistributed - pendingQty) < 0.0001;
                                    return (
                                        <div style={{
                                            background: isMatched ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${isMatched ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            borderRadius: '8px',
                                            padding: '0.6rem 0.9rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Total Informado:</span>
                                            <span style={{ color: isMatched ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                {totalDistributed.toFixed(2)} / {pendingQty.toFixed(2)} {pendingProduct.unit}
                                            </span>
                                        </div>
                                    );
                                })()}

                                <form onSubmit={(e) => { e.preventDefault(); processStockUpdate(); }} style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left' }}>
                                    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '6px', marginBottom: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {entryBatches.map((batch, index) => {
                                            return (
                                                <div key={batch.id} style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1.5px solid var(--border-color)',
                                                    borderRadius: '10px',
                                                    padding: '1rem',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.8rem'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-orange)' }}>
                                                            LOTE #{index + 1}
                                                        </span>
                                                        {entryBatches.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEntryBatches(prev => prev.filter(b => b.id !== batch.id));
                                                                }}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: 'var(--accent-red)',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px'
                                                                }}
                                                            >
                                                                <Trash2 size={12} /> REMOVER
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.8rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>CÓDIGO DO LOTE *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="Ex: LT-2026-A"
                                                                value={batch.lot}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, lot: val } : b));
                                                                }}
                                                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>QTD ({pendingProduct.unit}) *</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                required
                                                                placeholder="Ex: 50"
                                                                value={batch.quantity}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, quantity: val } : b));
                                                                }}
                                                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>PREÇO UNIT. *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="R$ 0,00"
                                                                value={batch.pricePerUnit}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value;
                                                                    const clean = raw.replace(/\D/g, '');
                                                                    let formatted = '0,00';
                                                                    if (clean !== '') {
                                                                        const cents = parseInt(clean, 10);
                                                                        formatted = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                    }
                                                                    setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, pricePerUnit: formatted } : b));
                                                                }}
                                                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE VALIDADE</label>
                                                            <input
                                                                type="date"
                                                                value={batch.expirationDate}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, expirationDate: val } : b));
                                                                }}
                                                                style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE FABRICAÇÃO</label>
                                                            <input
                                                                type="date"
                                                                value={batch.manufacturingDate}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, manufacturingDate: val } : b));
                                                                }}
                                                                style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>FORNECEDOR</label>
                                                        <select
                                                            value={batch.supplier}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, supplier: val } : b));
                                                            }}
                                                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                                                        >
                                                            <option value="">Selecione o fornecedor...</option>
                                                            {suppliers.map(s => (
                                                                <option key={s.id} value={s.nomeFantasia || s.razaoSocial}>
                                                                    {s.nomeFantasia || s.razaoSocial}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>ENDEREÇO WMS</label>
                                                        {renderAddressSelector(batch.address, (val) => {
                                                            setEntryBatches(prev => prev.map(b => b.id === batch.id ? { ...b, address: val } : b));
                                                        }, "Selecione o endereço...")}
                                                        {(() => {
                                                            const suggestion = suggestWmsLocation(pendingProduct, batch.quantity);
                                                            if (suggestion) {
                                                                return (
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.1rem' }}>
                                                                        💡 Sugestão WMS: <strong>{suggestion}</strong> (Posição recomendada)
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const totalDistributed = entryBatches.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                                            const remaining = Math.max(0, pendingQty - totalDistributed);
                                            const today = new Date();
                                            const year = today.getFullYear();
                                            const month = String(today.getMonth() + 1).padStart(2, '0');
                                            const day = String(today.getDate()).padStart(2, '0');
                                            
                                            setEntryBatches(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now() + Math.random(),
                                                    lot: `LT-${year}${month}${day}-${prev.length + 1}`,
                                                    quantity: remaining > 0 ? remaining.toString() : '0',
                                                    pricePerUnit: '0,00',
                                                    expirationDate: '',
                                                    manufacturingDate: '',
                                                    supplier: '',
                                                    address: suggestWmsLocation(pendingProduct, remaining > 0 ? remaining : 1)
                                                }
                                            ]);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '1px dashed var(--accent-orange)',
                                            background: 'rgba(235, 94, 40, 0.05)',
                                            color: 'var(--accent-orange)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '1rem',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        ➕ DIVIDIR ENTRADA / ADICIONAR LOTE ADICIONAL
                                    </button>

                                    <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.2rem' }}>
                                        <button type="button" className="btn-clear-modal" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }} onClick={closeConfirmModal}>
                                            CANCELAR
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="btn-confirm-modal" 
                                            style={{ 
                                                flex: 1,
                                                backgroundColor: 'var(--accent-green)',
                                                color: 'white',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                fontWeight: '800'
                                            }} 
                                        >
                                            CONFIRMAR ENTRADA
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                <AlertTriangle size={48} style={{ color: flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)' }} />
                                
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                                    Confirmar Movimentação de Estoque
                                </h3>

                                {barcodeEntryMode ? (
                                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>PRODUTO</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--border-color)', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                                                {barcodePackageType}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: '800', fontSize: '1rem', color: '#fff' }}>{pendingProduct.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>SKU: {pendingProduct.sku}</span>
                                            <span>Estoque atual: {pendingProduct.stock} {pendingProduct.unit}</span>
                                        </div>
                                        
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                    Quantidade de {barcodePackageType}(s) a {flowType === 'saida' ? 'retirar' : 'descartar'} *
                                                </label>
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={barcodePackageQty}
                                                    onChange={(e) => {
                                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                                        setBarcodePackageQty(val);
                                                        setPendingQty(val * barcodeConversionFactor);
                                                    }}
                                                    required
                                                    style={{
                                                        padding: '0.6rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-color)',
                                                        background: 'var(--bg-input)',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '700',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                    Fator: 1 {barcodePackageType} = {barcodeConversionFactor} {pendingProduct.unit}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                                                    Total: {pendingQty} {pendingProduct.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0.5rem 0' }}>
                                        Deseja registrar a {flowType === 'saida' ? 'retirada' : 'perda/descarte'} de{' '}
                                        <strong style={{ color: 'var(--text-primary)' }}>{pendingQty} {pendingProduct.unit}</strong> de{' '}
                                        <strong style={{ color: 'var(--text-primary)' }}>{pendingProduct.name}</strong>?
                                    </p>
                                )}
 
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
                                    <button type="button" className="btn-clear-modal" style={{ flex: 1 }} onClick={closeConfirmModal}>
                                        CANCELAR
                                    </button>
                                    <button 
                                        type="button"
                                        className="btn-confirm-modal" 
                                        style={{ 
                                            flex: 1,
                                            backgroundColor: flowType === 'saida' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                            color: flowType === 'perdas' ? '#422006' : 'white'
                                        }} 
                                        onClick={handleConfirmAction}
                                    >
                                        CONFIRMAR
                                    </button>
                                </div>
                            </div>
                        )}
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origem do Insumo</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setLossMaterialType('estoque')}
                                        style={{
                                            flex: 1,
                                            padding: '0.65rem 0.5rem',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            background: lossMaterialType === 'estoque' ? 'rgba(243, 107, 29, 0.15)' : 'var(--bg-card-hover)',
                                            border: '1px solid',
                                            borderColor: lossMaterialType === 'estoque' ? 'var(--accent-orange)' : 'var(--border-color)',
                                            color: lossMaterialType === 'estoque' ? 'var(--accent-orange)' : 'var(--text-primary)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        Material de Estoque
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLossMaterialType('processo')}
                                        style={{
                                            flex: 1,
                                            padding: '0.65rem 0.5rem',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            background: lossMaterialType === 'processo' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-card-hover)',
                                            border: '1px solid',
                                            borderColor: lossMaterialType === 'processo' ? 'rgba(168, 85, 247, 0.5)' : 'var(--border-color)',
                                            color: lossMaterialType === 'processo' ? '#c084fc' : 'var(--text-primary)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        Material em Processo
                                    </button>
                                </div>
                                <small style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                    {lossMaterialType === 'estoque' 
                                        ? '✓ Decrementa o estoque atual deste produto.' 
                                        : 'ℹ Estoque não será alterado (insumo já saiu anteriormente).'}
                                </small>
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
                                <button className="btn-clear-modal" style={{ flex: 1 }} onClick={() => { setShowReason(false); setPendingProduct(null); setLossMaterialType('estoque'); }}>
                                    CANCELAR
                                </button>
                                <button 
                                    type="button"
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
                    <div className="pin-modal-card" style={{ maxWidth: '520px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onMouseDown={() => setShowBatchModal(false)} title="Fechar">
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>CÓDIGO DO LOTE *</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: LOT-2026-A"
                                        value={batchLot}
                                        onChange={(e) => setBatchLot(e.target.value.toUpperCase())}
                                        required
                                        maxLength="20"
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                                outline: 'none',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>PREÇO UNIT. (R$) *</label>
                                        <input 
                                            type="text"
                                            placeholder="Ex: 34,90"
                                            value={batchPricePerUnit}
                                            onChange={(e) => handleCurrencyInputChange(e.target.value, setBatchPricePerUnit)}
                                            required
                                            style={{
                                                padding: '0.6rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-primary)',
                                                outline: 'none',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>ENDEREÇO WMS</label>
                                {renderAddressSelector(batchAddress, setBatchAddress, "Selecione o endereço...")}
                                {(() => {
                                    const suggestion = suggestWmsLocation(batchProduct, batchQty);
                                    if (suggestion) {
                                        return (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.1rem' }}>
                                                💡 Sugestão WMS: <strong>{suggestion}</strong> (Posição recomendada)
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>FORNECEDOR</label>
                                <select
                                    value={batchSupplier}
                                    onChange={(e) => setBatchSupplier(e.target.value)}
                                    style={{
                                        padding: '0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        width: '100%',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Selecione o fornecedor...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.nomeFantasia || s.razaoSocial}>{s.nomeFantasia || s.razaoSocial}</option>
                                    ))}
                                </select>
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
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA DE VALIDADE</label>
                                    <div className="custom-date-picker-wrapper">
                                        <Calendar className="custom-date-picker-icon" size={16} />
                                        <input 
                                            type="date"
                                            value={batchExpDate}
                                            onChange={(e) => setBatchExpDate(e.target.value)}
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
                        <button className="btn-close-modal" onMouseDown={() => setBatchToDelete(null)} title="Fechar">
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
                                        style={{ flex: 1, backgroundColor: 'var(--accent-orange)', color: '#ffffff' }} 
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
                MODAL: CUSTOM APPROVAL CONFIRMATION DIALOG
            ============================================= */}
            {activeApprovalRequest && (() => {
                const productBatches = stockBatches.filter(b => b.itemSku === activeApprovalRequest.itemSku && b.quantity > 0);
                const hasBatches = productBatches.length > 0;
                const showManualInputs = !hasBatches || !followFefoSuggestion;
                const totalRequired = activeApprovalRequest.quantity;
                const totalAllocated = customAllocations.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
                const isConfirmDisabled = showManualInputs && (Math.abs(totalAllocated - totalRequired) > 0.0001);

                return createPortal(
                    <div className="pin-modal-overlay active" style={{ zIndex: 11000 }}>
                        <div className="pin-modal-card" style={{ maxWidth: showManualInputs ? '600px' : '520px', width: '95%', padding: '2rem', transition: 'max-width 0.2s ease-in-out' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Check size={24} style={{ color: 'var(--accent-green)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '800' }}>Confirmar Aprovação de Entrega</h3>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Produto:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{activeApprovalRequest.itemName}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Quantidade Solicitada:</span>
                                        <strong style={{ color: 'var(--accent-orange)' }}>
                                            {activeApprovalRequest.quantity} {products.find(p => p.sku === activeApprovalRequest.itemSku)?.unit || ''}
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Solicitado Por:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{activeApprovalRequest.requestedBy}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Setor Destino:</span>
                                        <span className="category-tag" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                                            {activeApprovalRequest.sector || 'COZINHA'}
                                        </span>
                                    </div>
                                </div>

                                {/* Suggestion plan display if product has batches */}
                                {(() => {
                                    if (!hasBatches) {
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: '700' }}>
                                                    Nenhum lote registrado para este produto.
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    A retirada manual é obrigatória. Por favor, preencha o endereço.
                                                </span>
                                            </div>
                                        );
                                    }

                                    const fefo = calculateFefoPlan(activeApprovalRequest.itemSku, activeApprovalRequest.quantity);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Sugestão FEFO do Sistema:</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', background: 'rgba(192, 132, 252, 0.04)', border: '1px solid rgba(192, 132, 252, 0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                                                {fefo.plan.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                            <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.72rem' }}>
                                                                {item.batch.address || 'Sem end.'}
                                                            </span>
                                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                                Lote: <strong style={{ color: 'var(--text-primary)' }}>{item.batch.lot || 'Sem lote'}</strong>
                                                            </span>
                                                        </div>
                                                        <strong style={{ color: '#c084fc' }}>-{item.quantityToTake}</strong>
                                                    </div>
                                                ))}
                                                {fefo.remainingUnallocated > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                                                        <span>Dedução do Saldo Geral (Sem lote específico)</span>
                                                        <strong>-{fefo.remainingUnallocated}</strong>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Toggle selection */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.3rem' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Opção de Retirada:</span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFollowFefoSuggestion(true)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.6rem',
                                                            borderRadius: '6px',
                                                            background: followFefoSuggestion ? 'var(--accent-orange)' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid ' + (followFefoSuggestion ? 'var(--accent-orange)' : 'var(--border-color)'),
                                                            color: followFefoSuggestion ? '#ffffff' : 'var(--text-secondary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Seguir Sugestão FEFO
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFollowFefoSuggestion(false)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.6rem',
                                                            borderRadius: '6px',
                                                            background: !followFefoSuggestion ? 'var(--accent-orange)' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid ' + (!followFefoSuggestion ? 'var(--accent-orange)' : 'var(--border-color)'),
                                                            color: !followFefoSuggestion ? '#ffffff' : 'var(--text-secondary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Retirada Personalizada
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Custom Allocations Multi-Input and list */}
                                {showManualInputs && (() => {
                                    const productBatchesInStock = stockBatches.filter(b => b.itemSku === activeApprovalRequest.itemSku && b.quantity > 0);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid rgba(243, 107, 29, 0.2)', background: 'rgba(243, 107, 29, 0.02)', padding: '1rem', borderRadius: '8px', marginTop: '0.2rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-orange)' }}>
                                                    Especificar Lotes e Endereços de Retirada:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomAllocation}
                                                    style={{
                                                        background: 'rgba(243, 107, 29, 0.1)',
                                                        border: '1px solid var(--accent-orange)',
                                                        color: 'var(--accent-orange)',
                                                        borderRadius: '4px',
                                                        padding: '0.25rem 0.6rem',
                                                        fontSize: '0.72rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(243, 107, 29, 0.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(243, 107, 29, 0.1)'}
                                                >
                                                    + Retirada Avulsa
                                                </button>
                                            </div>

                                            {/* Scrollable list of custom allocations */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.2rem', paddingBottom: '0.5rem' }}>
                                                {customAllocations.length === 0 ? (
                                                    <div style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                                                        Nenhuma alocação inserida. Adicione uma retirada avulsa.
                                                    </div>
                                                ) : (
                                                    customAllocations.map((alloc) => {
                                                        if (!alloc.isCustom) {
                                                            return (
                                                                <div key={alloc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.2rem', minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                            <span style={{ background: 'rgba(243, 107, 29, 0.12)', color: 'var(--accent-orange)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>
                                                                                {alloc.address || 'Sem Endereço'}
                                                                            </span>
                                                                            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                Lote: {alloc.lot || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Sem Lote</span>}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                                            Saldo Disponível: <strong style={{ color: '#fff' }}>{alloc.availableQty}</strong>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: '90px', flexShrink: 0 }}>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={alloc.availableQty}
                                                                            step="any"
                                                                            placeholder="Qtd"
                                                                            value={alloc.quantity}
                                                                            onChange={(e) => handleUpdateAllocation(alloc.id, 'quantity', e.target.value)}
                                                                            style={{
                                                                                width: '100%',
                                                                                background: 'var(--bg-input)',
                                                                                border: '1.5px solid var(--border-color)',
                                                                                color: 'var(--text-primary)',
                                                                                borderRadius: '6px',
                                                                                padding: '0.35rem 0.5rem',
                                                                                fontSize: '0.8rem',
                                                                                textAlign: 'right',
                                                                                outline: 'none',
                                                                                fontWeight: '600'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        } else {
                                                            const filteredAddresses = productBatchesInStock.filter(b => 
                                                                (b.address || '').toLowerCase().includes((alloc.address || '').toLowerCase()) ||
                                                                (b.lot || '').toLowerCase().includes((alloc.address || '').toLowerCase())
                                                            );
                                                            const filteredLots = productBatchesInStock.filter(b => 
                                                                (b.address || '').toLowerCase().includes((alloc.lot || '').toLowerCase()) ||
                                                                (b.lot || '').toLowerCase().includes((alloc.lot || '').toLowerCase())
                                                            );

                                                            return (
                                                                <div key={alloc.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(243, 107, 29, 0.04)', border: '1px solid rgba(243, 107, 29, 0.15)', borderRadius: '6px', padding: '0.6rem', position: 'relative' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-orange)', textTransform: 'uppercase' }}>
                                                                            Retirada Avulsa
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveAllocation(alloc.id)}
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: 'var(--accent-red)',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                padding: '0.1rem'
                                                                            }}
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>

                                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                        <div style={{ flex: 1.2, minWidth: '110px', position: 'relative' }}>
                                                                            <input
                                                                                type="text"
                                                                                autoComplete="one-time-code"
                                                                                name={`alloc-address-${alloc.id}`}
                                                                                placeholder="Endereço *"
                                                                                value={alloc.address}
                                                                                onFocus={() => setActiveAddressDropdownId(alloc.id)}
                                                                                onBlur={() => setTimeout(() => setActiveAddressDropdownId(null), 200)}
                                                                                onChange={(e) => handleUpdateAllocation(alloc.id, 'address', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    background: 'var(--bg-input)',
                                                                                    border: '1.5px solid var(--border-color)',
                                                                                    color: 'var(--text-primary)',
                                                                                    borderRadius: '6px',
                                                                                    padding: '0.35rem 0.5rem',
                                                                                    fontSize: '0.78rem',
                                                                                    outline: 'none',
                                                                                    fontWeight: '600'
                                                                                }}
                                                                            />
                                                                            {activeAddressDropdownId === alloc.id && (
                                                                                <div className="custom-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto', padding: '0.2rem', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                                                                                    {filteredAddresses.length === 0 ? (
                                                                                        <div style={{ padding: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                                            Usar valor personalizado
                                                                                        </div>
                                                                                    ) : (
                                                                                        filteredAddresses.map((b, idx) => (
                                                                                            <div key={idx} onMouseDown={() => {
                                                                                                handleUpdateAllocation(alloc.id, 'address', b.address || '');
                                                                                                handleUpdateAllocation(alloc.id, 'lot', b.lot || '');
                                                                                                setActiveAddressDropdownId(null);
                                                                                            }} style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: '#fff' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                                                <span style={{ fontWeight: '700', color: 'var(--accent-orange)' }}>{b.address}</span>
                                                                                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Lote: {b.lot || 'Sem lote'}</span>
                                                                                            </div>
                                                                                        ))
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div style={{ flex: 1, minWidth: '90px', position: 'relative' }}>
                                                                            <input
                                                                                type="text"
                                                                                autoComplete="one-time-code"
                                                                                name={`alloc-lot-${alloc.id}`}
                                                                                placeholder="Lote"
                                                                                value={alloc.lot}
                                                                                onFocus={() => setActiveLotDropdownId(alloc.id)}
                                                                                onBlur={() => setTimeout(() => setActiveLotDropdownId(null), 200)}
                                                                                onChange={(e) => handleUpdateAllocation(alloc.id, 'lot', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    background: 'var(--bg-input)',
                                                                                    border: '1.5px solid var(--border-color)',
                                                                                    color: 'var(--text-primary)',
                                                                                    borderRadius: '6px',
                                                                                    padding: '0.35rem 0.5rem',
                                                                                    fontSize: '0.78rem',
                                                                                    outline: 'none',
                                                                                    fontWeight: '600'
                                                                                }}
                                                                            />
                                                                            {activeLotDropdownId === alloc.id && (
                                                                                <div className="custom-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto', padding: '0.2rem', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                                                                                    {filteredLots.length === 0 ? (
                                                                                        <div style={{ padding: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                                            Usar valor personalizado
                                                                                        </div>
                                                                                    ) : (
                                                                                        filteredLots.map((b, idx) => (
                                                                                            <div key={idx} onMouseDown={() => {
                                                                                                handleUpdateAllocation(alloc.id, 'address', b.address || '');
                                                                                                handleUpdateAllocation(alloc.id, 'lot', b.lot || '');
                                                                                                setActiveLotDropdownId(null);
                                                                                            }} style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: '#fff' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                                                <span style={{ fontWeight: '700' }}>Lote: {b.lot}</span>
                                                                                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>{b.address}</span>
                                                                                            </div>
                                                                                        ))
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div style={{ width: '80px', flexShrink: 0 }}>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="any"
                                                                                placeholder="Qtd"
                                                                                value={alloc.quantity}
                                                                                onChange={(e) => handleUpdateAllocation(alloc.id, 'quantity', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    background: 'var(--bg-input)',
                                                                                    border: '1.5px solid var(--border-color)',
                                                                                    color: 'var(--text-primary)',
                                                                                    borderRadius: '6px',
                                                                                    padding: '0.35rem 0.5rem',
                                                                                    fontSize: '0.78rem',
                                                                                    outline: 'none',
                                                                                    fontWeight: '600'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    })
                                                )}
                                            </div>

                                            {/* Totalizer Consolidation Footer */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isAllocationCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(243, 107, 29, 0.08)', border: '1px solid ' + (isAllocationCorrect ? 'rgba(34, 197, 94, 0.25)' : 'rgba(243, 107, 29, 0.25)'), padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        Status da Alocação
                                                    </span>
                                                    <div style={{ fontWeight: '700', color: isAllocationCorrect ? 'var(--accent-green)' : 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        {isAllocationCorrect ? (
                                                            <>
                                                                <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                                                                Alocação Concluída
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle size={14} style={{ color: 'var(--accent-orange)' }} />
                                                                Alocação Divergente
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', display: 'block' }}>Total Alocado:</span>
                                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: isAllocationCorrect ? 'var(--accent-green)' : '#fff' }}>
                                                        {totalAllocated} / {totalRequired} {products.find(p => p.sku === activeApprovalRequest.itemSku)?.unit || ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Modal Actions */}
                                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.8rem' }}>
                                    <button 
                                        className="btn-clear-modal" 
                                        style={{ 
                                            flex: 1, 
                                            background: 'rgba(255, 255, 255, 0.03)', 
                                            border: '1.5px solid var(--border-color)', 
                                            color: 'var(--text-primary)',
                                            fontWeight: '700',
                                            height: '42px',
                                            cursor: 'pointer'
                                        }} 
                                        onClick={() => setActiveApprovalRequest(null)}
                                    >
                                        CANCELAR
                                    </button>
                                    <button 
                                        className="btn-confirm-modal" 
                                        disabled={isConfirmDisabled}
                                        style={{ 
                                            flex: 1, 
                                            backgroundColor: isConfirmDisabled ? 'rgba(255,255,255,0.05)' : 'var(--accent-orange)', 
                                            color: isConfirmDisabled ? 'var(--text-secondary)' : '#ffffff',
                                            border: isConfirmDisabled ? '1px solid var(--border-color)' : 'none',
                                            fontWeight: '800',
                                            height: '42px',
                                            cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isConfirmDisabled ? 0.6 : 1,
                                            transition: 'all 0.2s ease'
                                        }} 
                                        onClick={confirmApproveRequest}
                                    >
                                        APROVAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>, document.body)
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
                MODAL: WMS CELL DETAIL DIALOG
            ============================================= */}
            {selectedCellDetail && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 15000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)' }}>
                                    <Warehouse size={24} />
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Detalhes do Endereço</h3>
                                </div>
                                <button 
                                    className="btn-close-modal" 
                                    onClick={() => setSelectedCellDetail(null)} 
                                    title="Fechar"
                                    style={{ position: 'static', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Endereço WMS</div>
                                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '700' }}>{selectedCellDetail.address}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Status da Posição</div>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        fontWeight: '800', 
                                        color: selectedCellDetail.location?.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                        background: selectedCellDetail.location?.status === 'Ativo' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: selectedCellDetail.location?.status === 'Ativo' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        {selectedCellDetail.location?.status === 'Ativo' ? 'ATIVO' : 'BLOQUEADO'}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Armazém / Zona</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                        {selectedCellDetail.warehouse?.name || 'N/A'} &middot; {selectedCellDetail.zone?.name || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Estrutura Física</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                        Rua {selectedCellDetail.location?.aisle || '—'} &middot; Lado {selectedCellDetail.location?.row || '—'} &middot; Prat. {selectedCellDetail.location?.shelf || '—'} &middot; Pos. {selectedCellDetail.location?.position || '—'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '700' }}>
                                    Lotes Armazenados ({selectedCellDetail.batches?.length || 0})
                                </h4>
                                {selectedCellDetail.batches?.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }}>
                                        Nenhum lote estocado nesta posição.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {selectedCellDetail.batches.map((b) => {
                                            const prod = products.find(p => p.sku === b.itemSku);
                                            const expStatus = b.expiryDate || b.expDate ? getBatchExpiryStatus(b.expiryDate || b.expDate) : null;
                                            return (
                                                <div key={b.id} style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    padding: '0.8rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.3rem'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                                            {prod?.name || b.itemSku}
                                                        </span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                            SKU: {b.itemSku}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        <span>Lote: <strong style={{ color: 'var(--text-primary)' }}>{b.lot}</strong></span>
                                                        <span>Qtd: <strong style={{ color: 'var(--accent-green)' }}>{b.quantity} {prod?.unit || b.unit}</strong></span>
                                                    </div>
                                                    {expStatus && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
                                                            <span>Vencimento: <strong>{b.expiryDate || b.expDate}</strong></span>
                                                            <span className={expStatus.className} style={{ fontSize: '0.62rem', fontWeight: '800', padding: '1px 4px', borderRadius: '3px' }}>
                                                                {expStatus.label} ({expStatus.days}d)
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <button 
                                    className="btn-confirm-modal"
                                    style={{ 
                                        background: 'var(--accent-purple)', 
                                        color: '#ffffff',
                                        fontWeight: '800',
                                        height: '38px',
                                        padding: '0 1.5rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }} 
                                    onClick={() => setSelectedCellDetail(null)}
                                >
                                    FECHAR
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
