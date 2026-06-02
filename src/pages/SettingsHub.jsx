/**
 * Corellux OS - Settings & Registries Hub (SettingsHub)
 * Painel completo de cadastros e configurações (Funcionários, Produtos, Categorias e Fornecedores)
 * v2.5.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCorelluxState, loadUsers, get, set } from '../store/corellux-state';
import DbService from '../services/db-service';
import { getUserAvatar } from '../utils/initial-data';
import { DEFAULT_BANKS } from '../utils/bank-list';
import { 
    Users, 
    Boxes, 
    Tag, 
    Truck, 
    Search, 
    Plus, 
    Edit, 
    Trash2, 
    Lock, 
    Unlock, 
    X, 
    Check, 
    PlusCircle,
    ChevronDown,
    ChevronUp,
    Star,
    Mail,
    Phone,
    Shield,
    FileText,
    History,
    AlertTriangle,
    Info,
    FolderOpen,
    Paperclip,
    Camera,
    Calendar,
    Eye,
    Download,
    ChevronRight,
    LayoutGrid,
    Briefcase,
    ShoppingBag,
    Warehouse,
    Layers,
    MapPin,
    Grid3X3,
    Wrench,
    Shuffle,
    Settings,
    Map,
    Maximize,
    Edit2
} from 'lucide-react';

const PERSONAL_DOCS_ITEMS = [
    { id: 'rg', label: 'RG' },
    { id: 'cnh', label: 'CNH' },
    { id: 'address', label: 'Comprovante de Endereço' },
    { id: 'voter', label: 'Título de Eleitor' },
    { id: 'military', label: 'Reservista' },
    { id: 'birth_marriage', label: 'Certidão Nasc/Cas' },
    { id: 'work_contract', label: 'Contrato de Trabalho' }
];

const HEALTH_SAFETY_ITEMS = [
    { id: 'aso_adm', label: 'ASO Admissional' },
    { id: 'aso_per', label: 'Periódico' },
    { id: 'aso_ret', label: 'Retorno ao Trabalho' },
    { id: 'aso_mud', label: 'Mudança de Função' },
    { id: 'aso_dem', label: 'Demissional' },
    { id: 'epi_ent', label: 'Entrega EPI' },
    { id: 'training', label: 'Treinamentos' },
    { id: 'norms', label: 'Normas Internas' },
    { id: 'risks', label: 'Ciência de Riscos' },
    { id: 'nrs', label: "NR's" }
];

export default function SettingsHub() {
    const [globalState, setGlobalKey] = useCorelluxState(['currentUser', 'settingsActiveTab']);
    
    // Core data lists
    const [colaboradores, setColaboradores] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriasVenda, setCategoriasVenda] = useState([]);
    const [activeCatScope, setActiveCatScope] = useState('insumos'); // 'insumos' or 'produtos'
    const [fornecedores, setFornecedores] = useState([]);
    const [setores, setSetores] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [saleProducts, setSaleProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // =============================================
    // WMS STATE DECLARATIONS
    // =============================================
    const [armazens, setArmazens] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [wmsZones, setWmsZones] = useState([]);
    const [allZonesList, setAllZonesList] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [wmsLocations, setWmsLocations] = useState([]);
    const [activeWmsSubTab, setActiveWmsSubTab] = useState('geral'); // geral, zonas, enderecos
    const [wmsLocFilterAisle, setWmsLocFilterAisle] = useState('');
    const [wmsLocFilterRow, setWmsLocFilterRow] = useState('A'); // A=esquerdo, B=direito
    const [activeWmsLocView, setActiveWmsLocView] = useState('mapa'); // mapa, lista
    // Modal: editar posições fracionadas de uma célula específica
    const [editCellModal, setEditCellModal] = useState(null); // { aisle, row, shelf, currentLocs }
    const [editCellPositions, setEditCellPositions] = useState(''); // e.g. "A;B;C;D;E"
    const [editCellVolume, setEditCellVolume] = useState('0');

    // WMS Modals & Forms
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [warehouseForm, setWarehouseForm] = useState({ name: '', acronym: '', description: '', status: 'Ativo' });

    const [showZoneModal, setShowZoneModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [zoneForm, setZoneForm] = useState({
        name: '', // Sigla (3 letras)
        acronymDescription: '', // Descrição da sigla
        type: 'Seco',
        description: '',
        status: 'Ativo',
        tempMin: 0,
        tempMax: 30,
        isAmbient: false,
        ambientType: 'fechada', // fechada, externa_aberta, externa_coberta
        volumeCubicoPadrao: 0
    });

    const [showBatchLocationModal, setShowBatchLocationModal] = useState(false);
    const [batchLocationForm, setBatchLocationForm] = useState({
        aisleStart: '1',
        aisleEnd: '3',
        onlyRowAAisles: '',
        // rows are always fixed: A (esquerdo) e B (direito) — os 2 lados de cada corredor
        shelfStart: '1',
        shelfEnd: '5',
        shelfHeightStart: 'A',  // Altura início (A, B, C, D…)
        shelfHeightEnd: 'D',    // Altura fim
        subdivisionType: 'Nenhuma', // Nenhuma, AB, ABC, Customizado
        subdivisionCustom: ''
    });

    // Tab control
    const activeTab = globalState.settingsActiveTab;
    const setActiveTab = (tabName) => setGlobalKey('settingsActiveTab', tabName);

    // Search filters
    const [searchColab, setSearchColab] = useState('');
    const [searchProd, setSearchProd] = useState('');
    const [searchCat, setSearchCat] = useState('');
    const [searchForn, setSearchForn] = useState('');
    const [searchSector, setSearchSector] = useState('');
    const [searchCargo, setSearchCargo] = useState('');
    const [searchSaleProd, setSearchSaleProd] = useState('');
    const [fomentProdSearch, setFomentProdSearch] = useState('');

    // Modals control
    const [showColabModal, setShowColabModal] = useState(false);
    const [editingColab, setEditingColab] = useState(null);
    const [colabToDelete, setColabToDelete] = useState(null);
    const [prodToDelete, setProdToDelete] = useState(null);
    const [catToDelete, setCatToDelete] = useState(null);
    const [fornToDelete, setFornToDelete] = useState(null);
    const [sectorToDelete, setSectorToDelete] = useState(null);
    const [cargoToDelete, setCargoToDelete] = useState(null);
    const [saleProdToDelete, setSaleProdToDelete] = useState(null);
    const [genericConfirm, setGenericConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    const [showProdModal, setShowProdModal] = useState(false);
    const [editingProd, setEditingProd] = useState(null);

    const [showSaleProdModal, setShowSaleProdModal] = useState(false);
    const [editingSaleProd, setEditingSaleProd] = useState(null);
    const [saleProdForm, setSaleProdForm] = useState({
        code: '', name: '', category: '', description: '',
        price: '', unit: 'UN', status: 'Ativo', controlaProducao: false
    });
    const [saleProdActiveSection, setSaleProdActiveSection] = useState('geral'); // geral, receita
    const [prodActiveSection, setProdActiveSection] = useState('geral'); // geral, receita
    const [recipeItems, setRecipeItems] = useState([]); // [{ ingredientSku, name, quantity, unit }]
    const [recipeNewItem, setRecipeNewItem] = useState({ ingredientSku: '', quantity: '', unit: 'G' });
    const [recipeIngredientSearch, setRecipeIngredientSearch] = useState('');

    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState(null);

    const [showSectorModal, setShowSectorModal] = useState(false);
    const [editingSector, setEditingSector] = useState(null);
    const [sectorForm, setSectorForm] = useState({
        name: '', icon: 'fa-folder', color: 'color-blue', description: '', status: 'Ativo'
    });

    const [showCargoModal, setShowCargoModal] = useState(false);
    const [editingCargo, setEditingCargo] = useState(null);
    const [cargoForm, setCargoForm] = useState({
        name: '', description: '', sectorId: '', status: 'Ativo'
    });

    const [showFornModal, setShowFornModal] = useState(false);
    const [editingForn, setEditingForn] = useState(null);
    const [fornActiveSection, setFornActiveSection] = useState('geral'); // geral, contatos, endereco, financeiro, logistica, ratings, notes

    // Local temporary structures for compound items
    const [tempLinkedProducts, setTempLinkedProducts] = useState([]);
    const [tempNotes, setTempNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');

    const [bankList, setBankList] = useState(() => {
        const local = localStorage.getItem('corellux_banks');
        if (local) {
            try {
                return JSON.parse(local);
            } catch (e) {
                console.error('Error parsing corellux_banks:', e);
            }
        }
        localStorage.setItem('corellux_banks', JSON.stringify(DEFAULT_BANKS));
        return DEFAULT_BANKS;
    });
    const [showBancoDropdown, setShowBancoDropdown] = useState(false);
    const [showColabBancoDropdown, setShowColabBancoDropdown] = useState(false);

    // Collaborator form states
    const [colabActiveSection, setColabActiveSection] = useState('pessoais'); // pessoais, acesso, trabalhistas, cargaHoraria, bancarios, checklistPessoais, checklistSaude, outrosDocs

    const [checklistAttachmentView, setChecklistAttachmentView] = useState(null); // { listType, itemId }
    const [viewerUrl, setViewerUrl] = useState(null);
    const [otherDocName, setOtherDocName] = useState('');

    // Load data from DB
    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, prodsData, catsData, supsData, sectorsData, zonesData, saleProdsData, saleCatsData] = await Promise.all([
                loadUsers(),
                DbService.getProducts(),
                DbService.getCategories(),
                DbService.getSuppliers(),
                DbService.getSectors(),
                DbService.getWmsZones(),
                DbService.getSaleProducts(),
                DbService.getSaleProductCategories()
            ]);
            setColaboradores(usersData);
            setProdutos(prodsData);
            setCategorias(catsData);
            setCategoriasVenda(saleCatsData || []);
            setFornecedores(supsData);
            setSetores(sectorsData);
            setAllZonesList(zonesData || []);
            setSaleProducts(saleProdsData || []);

            // Load cargos
            const areasData = await DbService.getAreas();
            setCargos(areasData);
        } catch (e) {
            console.error('[SettingsHub] Error loading database registries:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        setGlobalKey('settingsActiveTab', 'menu');
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // =============================================
    // WMS: LOGIC HANDLERS & OPERATIONS
    // =============================================
    const loadWmsData = async () => {
        setLoading(true);
        try {
            const whList = await DbService.getWmsWarehouses();
            setArmazens(whList);
            if (whList.length > 0) {
                // Determine warehouse to select
                let whToSelect = whList[0];
                if (selectedWarehouse) {
                    const found = whList.find(w => w.id === selectedWarehouse.id);
                    if (found) whToSelect = found;
                }
                setSelectedWarehouse(whToSelect);
                await loadWarehouseZones(whToSelect.id);
            } else {
                setSelectedWarehouse(null);
                setWmsZones([]);
                setSelectedZone(null);
                setWmsLocations([]);
            }
        } catch (e) {
            console.error('[SettingsHub] Error loading WMS warehouses:', e);
            showToast('Erro ao carregar armazéns.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadWarehouseZones = async (whId) => {
        try {
            const zones = await DbService.getWmsZones(whId);
            setWmsZones(zones);
            if (zones.length > 0) {
                let zoneToSelect = zones[0];
                if (selectedZone) {
                    const found = zones.find(z => z.id === selectedZone.id);
                    if (found) zoneToSelect = found;
                }
                setSelectedZone(zoneToSelect);
                await loadZoneLocations(zoneToSelect.id);
            } else {
                setSelectedZone(null);
                setWmsLocations([]);
            }
        } catch (e) {
            console.error('[SettingsHub] Error loading WMS zones:', e);
        }
    };

    const loadZoneLocations = async (zId) => {
        try {
            const locs = await DbService.getWmsLocations(zId);
            setWmsLocations(locs);
            if (locs.length > 0) {
                const uniqueAisles = [...new Set(locs.map(l => l.aisle))].sort((a,b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.localeCompare(b);
                });
                if (!uniqueAisles.includes(wmsLocFilterAisle)) {
                    setWmsLocFilterAisle(uniqueAisles[0] || '');
                }
            } else {
                setWmsLocFilterAisle('');
            }
        } catch (e) {
            console.error('[SettingsHub] Error loading WMS locations:', e);
        }
    };

    useEffect(() => {
        if (activeTab === 'wms') {
            loadWmsData();
        }
    }, [activeTab]);

    // Handle Warehouse Selection
    const handleSelectWarehouse = async (wh) => {
        setSelectedWarehouse(wh);
        setActiveWmsSubTab('geral');
        await loadWarehouseZones(wh.id);
    };

    // Handle Zone Selection
    const handleSelectZone = async (zone) => {
        setSelectedZone(zone);
        await loadZoneLocations(zone.id);
    };

    // Warehouse CRUD Handlers
    const openWarehouseModalForCreate = () => {
        setEditingWarehouse(null);
        setWarehouseForm({ name: '', acronym: '', description: '', status: 'Ativo' });
        setShowWarehouseModal(true);
    };

    const openWarehouseModalForEdit = (wh) => {
        setEditingWarehouse(wh);
        setWarehouseForm({ name: wh.name, acronym: wh.acronym || '', description: wh.description || '', status: wh.status || 'Ativo' });
        setShowWarehouseModal(true);
    };

    const handleSaveWarehouse = async (e) => {
        e.preventDefault();
        if (!warehouseForm.name.trim()) {
            showToast('O nome do armazém é obrigatório.', 'error');
            return;
        }
        const acroVal = warehouseForm.acronym.trim().toUpperCase();
        if (acroVal.length !== 2 || !/^[A-Z]{2}$/.test(acroVal)) {
            showToast('A sigla do armazém deve conter exatamente 2 letras (A-Z).', 'error');
            return;
        }
        const payload = {
            ...warehouseForm,
            name: warehouseForm.name.trim(),
            acronym: acroVal
        };
        if (editingWarehouse) {
            payload.id = editingWarehouse.id;
        }
        const result = await DbService.saveWmsWarehouse(payload);
        if (result.success) {
            showToast('Armazém gravado com sucesso!', 'success');
            setShowWarehouseModal(false);
            await loadWmsData();
        } else {
            showToast('Erro ao salvar armazém.', 'error');
        }
    };

    const handleDeleteWarehouse = async (whId) => {
        if (window.confirm('Tem certeza que deseja excluir este armazém? Todas as zonas e endereços vinculados serão excluídos permanentemente.')) {
            const result = await DbService.deleteWmsWarehouse(whId);
            if (result.success) {
                showToast('Armazém excluído com sucesso.', 'success');
                if (selectedWarehouse?.id === whId) {
                    setSelectedWarehouse(null);
                    setSelectedZone(null);
                }
                await loadWmsData();
            } else {
                showToast('Erro ao excluir armazém.', 'error');
            }
        }
    };

    // Zone CRUD Handlers
    const openZoneModalForCreate = () => {
        setEditingZone(null);
        setZoneForm({
            name: '',
            acronymDescription: '',
            type: 'Seco',
            description: '',
            status: 'Ativo',
            tempMin: 0,
            tempMax: 30,
            isAmbient: false,
            ambientType: 'fechada',
            volumeCubicoPadrao: 0
        });
        setShowZoneModal(true);
    };

    const openZoneModalForEdit = (zone) => {
        setEditingZone(zone);
        setZoneForm({
            name: zone.name || '',
            acronymDescription: zone.acronymDescription || '',
            type: zone.type || 'Seco',
            description: zone.description || zone.desc || '',
            status: zone.status || 'Ativo',
            tempMin: zone.tempMin !== undefined ? zone.tempMin : 0,
            tempMax: zone.tempMax !== undefined ? zone.tempMax : 30,
            isAmbient: zone.isAmbient !== undefined ? zone.isAmbient : false,
            ambientType: zone.ambientType || 'fechada',
            volumeCubicoPadrao: zone.volumeCubicoPadrao || 0
        });
        setShowZoneModal(true);
    };

    const handleSaveZone = async (e) => {
        e.preventDefault();
        if (!selectedWarehouse) return;
        
        const nameVal = zoneForm.name.trim().toUpperCase();
        if (nameVal.length !== 3 || !/^[A-Z]{3}$/.test(nameVal)) {
            showToast('A sigla da zona deve conter exatamente 3 letras (A-Z).', 'error');
            return;
        }

        const payload = {
            ...zoneForm,
            warehouseId: selectedWarehouse.id,
            name: nameVal,
            acronymDescription: zoneForm.acronymDescription.trim(),
            tempMin: zoneForm.tempMin !== '' && zoneForm.tempMin !== null && zoneForm.tempMin !== undefined ? parseInt(zoneForm.tempMin, 10) : null,
            tempMax: zoneForm.tempMax !== '' && zoneForm.tempMax !== null && zoneForm.tempMax !== undefined ? parseInt(zoneForm.tempMax, 10) : null,
            isAmbient: zoneForm.isAmbient,
            ambientType: zoneForm.isAmbient ? zoneForm.ambientType : null,
            volumeCubicoPadrao: parseFloat(zoneForm.volumeCubicoPadrao) || 0
        };
        
        if (editingZone) {
            payload.id = editingZone.id;
        }
        
        const result = await DbService.saveWmsZone(payload);
        if (result.success) {
            showToast('Zona gravada com sucesso!', 'success');
            setShowZoneModal(false);
            await loadWarehouseZones(selectedWarehouse.id);
            const allZ = await DbService.getWmsZones();
            setAllZonesList(allZ || []);
        } else {
            showToast('Erro ao salvar zona.', 'error');
        }
    };

    const handleDeleteZone = async (zoneId) => {
        if (window.confirm('Tem certeza que deseja excluir esta zona? Todos os endereços vinculados serão excluídos permanentemente.')) {
            const result = await DbService.deleteWmsZone(zoneId);
            if (result.success) {
                showToast('Zona excluída com sucesso.', 'success');
                if (selectedZone?.id === zoneId) {
                    setSelectedZone(null);
                }
                await loadWarehouseZones(selectedWarehouse.id);
            } else {
                showToast('Erro ao excluir zona.', 'error');
            }
        }
    };

    // Location Address Generator Helpers
    const generateNumericRange = (start, end) => {
        const s = parseInt(start, 10);
        const e = parseInt(end, 10);
        if (isNaN(s) || isNaN(e) || s > e) return [];
        const arr = [];
        for (let i = s; i <= e; i++) {
            const useZeroPad = start.startsWith('0') || end.startsWith('0');
            const str = String(i);
            arr.push(useZeroPad ? str.padStart(Math.max(start.length, end.length), '0') : str);
        }
        return arr;
    };

    const generateCharRange = (start, end) => {
        const sCode = start.toUpperCase().charCodeAt(0);
        const eCode = end.toUpperCase().charCodeAt(0);
        if (isNaN(sCode) || isNaN(eCode) || sCode > eCode) return [];
        const arr = [];
        for (let code = sCode; code <= eCode; code++) {
            arr.push(String.fromCharCode(code));
        }
        return arr;
    };

    const getRange = (startVal, endVal) => {
        if (!startVal || !endVal) return [''];
        const isNumStart = /^\d+$/.test(startVal);
        const isNumEnd = /^\d+$/.test(endVal);
        if (isNumStart && isNumEnd) {
            return generateNumericRange(startVal, endVal);
        } else {
            return generateCharRange(startVal, endVal);
        }
    };

    // Batch Location Generation
    const handleGenerateLocationsBatch = async (e) => {
        e.preventDefault();
        if (!selectedZone) return;

        if (wmsLocations.length > 0) {
            const confirmReset = window.confirm(
                'Atenção: Esta zona já possui endereços cadastrados. A geração em lote irá apagar todos os endereços existentes nesta zona e reiniciar com esta nova configuração. Deseja prosseguir?'
            );
            if (!confirmReset) return;
        }

        const aisles = getRange(batchLocationForm.aisleStart, batchLocationForm.aisleEnd);
        const shelves = getRange(batchLocationForm.shelfStart, batchLocationForm.shelfEnd);
        const heights = getRange(batchLocationForm.shelfHeightStart, batchLocationForm.shelfHeightEnd);
        
        // Parse rules for aisles that only have row A (e.g. "5;8;12")
        const onlyRowAAislesList = batchLocationForm.onlyRowAAisles
            ? batchLocationForm.onlyRowAAisles.split(';').map(x => x.trim()).filter(Boolean)
            : [];
        
        let positions = [];
        if (batchLocationForm.subdivisionType === 'AB') {
            positions = ['A', 'B'];
        } else if (batchLocationForm.subdivisionType === 'ABC') {
            positions = ['A', 'B', 'C'];
        } else if (batchLocationForm.subdivisionType === 'Customizado') {
            positions = batchLocationForm.subdivisionCustom
                ? batchLocationForm.subdivisionCustom.split(';').map(p => p.trim()).filter(Boolean)
                : [];
        }

        if (aisles.length === 0 || shelves.length === 0 || heights.length === 0) {
            showToast('Intervalos inválidos. Verifique os valores.', 'error');
            return;
        }

        // Limit positions A–J (max 10)
        const ALLOWED_POSITIONS = ['A','B','C','D','E','F','G','H','I','J'];
        if (positions.length > 10) {
            showToast('Máximo de 10 posições fracionadas (A a J) permitidas.', 'error');
            return;
        }
        if (positions.some(p => !ALLOWED_POSITIONS.includes(p.toUpperCase()))) {
            showToast('Posições fracionadas devem ser letras de A a J.', 'error');
            return;
        }

        const zoneVolPadrao = parseFloat(selectedZone?.volumeCubicoPadrao) || 0;
        const volPerPos = zoneVolPadrao / (positions.length || 1);

        const combinations = [];
        for (const aisle of aisles) {
            const currentRows = onlyRowAAislesList.includes(String(aisle)) ? ['A'] : ['A', 'B'];
            for (const row of currentRows) {
                for (const shelf of shelves) {
                    for (const height of heights) {
                        // shelf stored as "shelf+height" compound e.g. "5D"
                        const shelfCode = `${shelf}${height}`;
                        if (positions.length > 0) {
                            for (const pos of positions) {
                                combinations.push({ aisle, row, shelf: shelfCode, position: pos, status: 'Ativo', volumeCubico: volPerPos });
                            }
                        } else {
                            combinations.push({ aisle, row, shelf: shelfCode, position: null, status: 'Ativo', volumeCubico: zoneVolPadrao });
                        }
                    }
                }
            }
        }

        if (combinations.length === 0) {
            showToast('Nenhum endereço a ser gerado.', 'error');
            return;
        }

        if (combinations.length > 1000) {
            showToast('Limite de geração excedido (máximo 1000 endereços por vez). Reduza os intervalos.', 'error');
            return;
        }

        setLoading(true);
        const result = await DbService.saveWmsLocationsBatch(selectedZone.id, combinations);
        setLoading(false);

        if (result.success) {
            showToast(`${combinations.length} endereços gerados com sucesso!`, 'success');
            setShowBatchLocationModal(false);
            await loadZoneLocations(selectedZone.id);
        } else {
            showToast('Erro ao gerar endereços em lote. Pode haver conflito de duplicidade.', 'error');
        }
    };
    // === EDITAR POSIÇÕES FRACIONADAS DE UMA CÉLULA ESPECÍFICA ===
    const handleOpenCellEdit = (cellLocs, aisle, row, shelf) => {
        const currentPositions = cellLocs.map(l => l.position).filter(Boolean);
        setEditCellPositions(currentPositions.join(';'));
        
        const existingVol = cellLocs.reduce((sum, l) => sum + (parseFloat(l.volumeCubico) || 0), 0);
        const initialVol = existingVol > 0 ? existingVol : (selectedZone?.volumeCubicoPadrao || 0);
        setEditCellVolume(initialVol.toString());
        
        setEditCellModal({ aisle, row, shelf, currentLocs: cellLocs });
    };

    const handleSaveCellPositions = async (e) => {
        e.preventDefault();
        if (!editCellModal || !selectedZone) return;

        const ALLOWED = ['A','B','C','D','E','F','G','H','I','J'];
        const rawPositions = editCellPositions
            .toUpperCase()
            .split(';')
            .map(p => p.trim())
            .filter(Boolean);

        if (rawPositions.length === 0) {
            showToast('Informe ao menos uma posição (ex: A;B;C).', 'error');
            return;
        }
        if (rawPositions.length > 10) {
            showToast('Máximo de 10 posições fracionadas (A a J).', 'error');
            return;
        }
        const invalidPos = rawPositions.filter(p => !ALLOWED.includes(p));
        if (invalidPos.length > 0) {
            showToast(`Posições inválidas: ${invalidPos.join(', ')}. Use apenas A até J.`, 'error');
            return;
        }
        const uniquePositions = [...new Set(rawPositions)];

        setLoading(true);

        // 1. Deleta todos os registros existentes desse shelf específico
        const deletePromises = editCellModal.currentLocs.map(l => DbService.deleteWmsLocation(l.id));
        await Promise.all(deletePromises);

        const totalCellVol = parseFloat(editCellVolume) || 0;
        const volPerPos = totalCellVol / uniquePositions.length;

        // 2. Insere novos registros com as posições definidas
        const newLocs = uniquePositions.map(pos => ({
            zoneId: selectedZone.id,
            aisle: editCellModal.aisle,
            row: editCellModal.row,
            shelf: editCellModal.shelf,
            position: pos,
            status: 'Ativo',
            volumeCubico: volPerPos,
        }));
        const insertPromises = newLocs.map(l => DbService.saveWmsLocation(l));
        await Promise.all(insertPromises);

        // 3. Recarrega localizações da zona (getWmsLocations retorna array direto, não {success, data})
        await loadZoneLocations(selectedZone.id);

        setLoading(false);
        setEditCellModal(null);
        showToast(`Célula ${editCellModal.shelf} atualizada com ${uniquePositions.length} posição(ões)!`, 'success');
    };

    // Single Location Handlers
    const handleDeleteLocation = async (locId) => {
        if (window.confirm('Excluir este endereço?')) {
            const result = await DbService.deleteWmsLocation(locId);
            if (result.success) {
                showToast('Endereço excluído.', 'success');
                await loadZoneLocations(selectedZone.id);
            } else {
                showToast('Erro ao excluir endereço.', 'error');
            }
        }
    };

    const handleToggleLocationStatus = async (loc) => {
        const newStatus = loc.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
        const updated = { ...loc, status: newStatus };
        const result = await DbService.saveWmsLocation(updated);
        if (result.success) {
            showToast(`Endereço ${newStatus === 'Ativo' ? 'ativado' : 'bloqueado'}.`, 'success');
            await loadZoneLocations(selectedZone.id);
        } else {
            showToast('Erro ao alterar status do endereço.', 'error');
        }
    };

    const formatAddressVisual = (zone, aisle, row, shelf, position) => {
        // shelf already contains the compound code e.g. "5D" (number=prateleira, letter=altura)
        const whAcronym = (selectedWarehouse?.acronym || 'BC').substring(0, 2).toUpperCase();
        const zoneName = (zone?.name || 'EMC').substring(0, 3).toUpperCase();
        const parts = [`${whAcronym}-${zoneName}`];
        if (aisle || row) {
            parts.push(`${aisle || ''}${row || ''}`);
        }
        if (shelf) parts.push(shelf);      // e.g. 5D  (prateleira 5, altura D)
        if (position) parts.push(position); // e.g. A   (fracionado)
        return parts.join('-');
        // Result example: BC-EMC-2B-5D-A
    };


    // Helper: Check if logged in user is admin or has config permission
    const isAdminUser = globalState.currentUser && (
        globalState.currentUser.accessLevel === 'Administrador' || 
        globalState.currentUser.permissions?.config === true
    );

    // =============================================
    // CRUD 1: COLABORADORES (USERS)
    // =============================================

    const [colabForm, setColabForm] = useState({
        name: '', displayName: '', role: '', accessLevel: 'Colaborador', 
        status: 'Ativo', pin: '1234', phone: '', email: '',
        shift: '', workStart: '', workEnd: '', scale: '',
        salary: 0, bank: '', bankAgency: '', bankAccount: '', pix: '',
        cpf: '', rg: '', birthDate: '', gender: '', maritalStatus: '',
        cep: '', address: '', department: '', contractType: '', hireDate: '',
        commission: 0, va: 0, vt: 0, workBreak: '',
        img: 'profile/default-avatar.png',
        docChecklist: {},
        healthSafetyChecklist: {},
        otherDocs: [],
        permissions: {
            entrada: true, saida: true, perdas: true, editar: false,
            relatorios: false, config: false, sendNotif: false, receiveNotif: true,
            approveRequests: false, requestItems: true, supplierView: true,
            supplierCreate: false, supplierEdit: false, supplierBlock: false,
            supplierDelete: false, chkCreate: false, chkAnswer: true,
            chkApprove: false, chkReports: false
        }
    });

    const openColabModalForEdit = (user) => {
        setEditingColab(user);
        setColabForm({
            id: user.id,
            name: user.name || '',
            displayName: user.displayName || '',
            role: user.role || '',
            accessLevel: user.accessLevel || 'Colaborador',
            status: user.status || 'Ativo',
            pin: user.pin || '1234',
            phone: maskPhone(user.phone || ''),
            email: user.email || '',
            shift: user.shift || '',
            workStart: user.workStart || '',
            workEnd: user.workEnd || '',
            scale: user.scale || '',
            salary: user.salary || 0,
            bank: user.bank || '',
            bankAgency: user.bankAgency || '',
            bankAccount: user.bankAccount || '',
            pix: user.pix || '',
            cpf: maskCPF(user.cpf || ''),
            rg: maskRG(user.rg || ''),
            birthDate: user.birthDate || '',
            gender: user.gender || '',
            maritalStatus: user.maritalStatus || '',
            cep: maskCEP(user.cep || ''),
            address: user.address || '',
            department: user.department || '',
            contractType: user.contractType || '',
            hireDate: user.hireDate || '',
            commission: user.commission || 0,
            va: user.va || 0,
            vt: user.vt || 0,
            workBreak: user.workBreak || '',
            img: user.img || 'profile/default-avatar.png',
            docChecklist: user.docChecklist || {},
            healthSafetyChecklist: user.healthSafetyChecklist || {},
            otherDocs: user.otherDocs || [],
            permissions: user.permissions || {
                entrada: true, saida: true, perdas: true, editar: false,
                relatorios: false, config: false, sendNotif: false, receiveNotif: true,
                approveRequests: false, requestItems: true, supplierView: true,
                supplierCreate: false, supplierEdit: false, supplierBlock: false,
                supplierDelete: false, chkCreate: false, chkAnswer: true,
                chkApprove: false, chkReports: false
            }
        });
        setColabActiveSection('pessoais');
        setShowColabModal(true);
    };

    const openColabModalForCreate = () => {
        setEditingColab(null);
        setColabForm({
            name: '', displayName: '', role: '', accessLevel: 'Colaborador', 
            status: 'Ativo', pin: '1234', phone: '', email: '',
            shift: '', workStart: '', workEnd: '', scale: '',
            salary: 0, bank: '', bankAgency: '', bankAccount: '', pix: '',
            cpf: '', rg: '', birthDate: '', gender: '', maritalStatus: '',
            cep: '', address: '', department: '', contractType: '', hireDate: '',
            commission: 0, va: 0, vt: 0, workBreak: '',
            img: 'profile/default-avatar.png',
            docChecklist: {},
            healthSafetyChecklist: {},
            otherDocs: [],
            permissions: {
                entrada: true, saida: true, perdas: true, editar: false,
                relatorios: false, config: false, sendNotif: false, receiveNotif: true,
                approveRequests: false, requestItems: true, supplierView: true,
                supplierCreate: false, supplierEdit: false, supplierBlock: false,
                supplierDelete: false, chkCreate: false, chkAnswer: true,
                chkApprove: false, chkReports: false
            }
        });
        setColabActiveSection('pessoais');
        setShowColabModal(true);
    };

    const handleColabPermissionChange = (permKey) => {
        if (!isAdminUser) return;
        setColabForm(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permKey]: !prev.permissions[permKey]
            }
        }));
    };

    const handleRoleAccessPreset = (accessLevel) => {
        if (!isAdminUser) return;
        
        const presetPermissions = {
            entrada: true, saida: true, perdas: true, editar: false,
            relatorios: false, config: false, sendNotif: false, receiveNotif: true,
            approveRequests: false, requestItems: true, supplierView: true,
            supplierCreate: false, supplierEdit: false, supplierBlock: false,
            supplierDelete: false, chkCreate: false, chkAnswer: true,
            chkApprove: false, chkReports: false
        };

        if (accessLevel === 'Administrador') {
            Object.keys(presetPermissions).forEach(k => presetPermissions[k] = true);
        }

        setColabForm(prev => ({
            ...prev,
            accessLevel,
            permissions: presetPermissions
        }));
    };

    const handleSaveColab = async (e) => {
        e.preventDefault();
        
        // Safety lock for main administrator
        if (editingColab && editingColab.accessLevel === 'Administrador' && editingColab.status === 'Ativo') {
            const hasOtherAdmins = colaboradores.some(c => c.accessLevel === 'Administrador' && c.status === 'Ativo' && c.id !== editingColab.id);
            if (!hasOtherAdmins && (colabForm.status !== 'Ativo' || colabForm.accessLevel !== 'Administrador')) {
                showToast('Ação bloqueada por segurança: Você não pode inativar ou alterar o nível de acesso do único Administrador ativo no sistema.', 'error');
                return;
            }
        }

        const payload = {
            ...colabForm,
            img: colabForm.img || 'profile/default-avatar.png',
            avatarFallback: colabForm.name.charAt(0).toUpperCase()
        };

        const result = await DbService.saveUser(payload);
        if (result.success) {
            showToast('Funcionário gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }

        setShowColabModal(false);
        loadData();
    };

    const handleDeleteColab = (user) => {
        if (user.accessLevel === 'Administrador') {
            const adminCount = colaboradores.filter(c => c.accessLevel === 'Administrador').length;
            if (adminCount <= 1) {
                showToast('Ação bloqueada: Não é possível deletar o único Administrador do sistema.', 'error');
                return;
            }
        }
        setColabToDelete(user);
    };

    const confirmDeleteColab = async () => {
        if (!colabToDelete) return;
        const user = colabToDelete;
        setColabToDelete(null);

        // Optimistic local update
        setColaboradores(prev => prev.filter(c => String(c.id) !== String(user.id)));

        // Optimistic global update
        const currentAppUsers = get('appUsers') || [];
        const updatedAppUsers = currentAppUsers.filter(c => String(c.id) !== String(user.id));
        set('appUsers', updatedAppUsers);

        const result = await DbService.deleteUser(user.id);
        if (result.success) {
            showToast('Funcionário removido com sucesso.', 'success');
        } else {
            showToast('[Aviso] Excluído no cache local offline.', 'warning');
        }
        loadData();
    };

    const handleToggleColabStatus = async (user) => {
        if (user.accessLevel === 'Administrador' && user.status === 'Ativo') {
            const adminCount = colaboradores.filter(c => c.accessLevel === 'Administrador' && c.status === 'Ativo').length;
            if (adminCount <= 1) {
                showToast('Ação bloqueada: Não é possível desativar o único Administrador ativo.', 'error');
                return;
            }
        }

        const newStatus = user.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
        const updatedUser = { ...user, status: newStatus };
        
        // Optimistic local update
        setColaboradores(prev => prev.map(c => String(c.id) === String(user.id) ? updatedUser : c));

        // Optimistic global update
        const currentAppUsers = get('appUsers') || [];
        const updatedAppUsers = currentAppUsers.map(c => String(c.id) === String(user.id) ? updatedUser : c);
        set('appUsers', updatedAppUsers);

        await DbService.saveUser(updatedUser);
        loadData();
    };

    // Collaborator helper methods
    const handleUpdateChecklistValue = (listType, itemId, key, value) => {
        setColabForm(prev => {
            const listKey = listType === 'personal' ? 'docChecklist' : 'healthSafetyChecklist';
            const currentList = { ...(prev[listKey] || {}) };
            const currentItem = {
                received: false, mandatory: true, date: '', expiry: '',
                isIndeterminate: false, isDateIndeterminate: false, notifyExpiry: false, notifyDays: 30, attachments: [],
                ...(currentList[itemId] || {})
            };
            currentItem[key] = value;
            return {
                ...prev,
                [listKey]: {
                    ...currentList,
                    [itemId]: currentItem
                }
            };
        });
    };

    const handleChecklistFileUpload = (e, listType, itemId) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            const url = uploadEvent.target.result;
            setColabForm(prev => {
                const listKey = listType === 'personal' ? 'docChecklist' : 'healthSafetyChecklist';
                const currentList = { ...(prev[listKey] || {}) };
                const currentItem = {
                    received: false, mandatory: true, date: '', expiry: '',
                    isIndeterminate: false, isDateIndeterminate: false, notifyExpiry: false, notifyDays: 30, attachments: [],
                    ...(currentList[itemId] || {})
                };
                const currentAttachments = [...(currentItem.attachments || [])];
                currentAttachments.push({
                    name: file.name,
                    url: url
                });
                currentItem.attachments = currentAttachments;
                currentItem.received = true; // Auto-check received when attaching

                return {
                    ...prev,
                    [listKey]: {
                        ...currentList,
                        [itemId]: currentItem
                    }
                };
            });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveChecklistAttachment = (listType, itemId, index) => {
        setColabForm(prev => {
            const listKey = listType === 'personal' ? 'docChecklist' : 'healthSafetyChecklist';
            const currentList = { ...(prev[listKey] || {}) };
            if (!currentList[itemId] || !currentList[itemId].attachments) return prev;
            
            const currentAttachments = [...currentList[itemId].attachments];
            currentAttachments.splice(index, 1);
            
            const currentItem = {
                ...currentList[itemId],
                attachments: currentAttachments
            };
            
            if (currentAttachments.length === 0) {
                currentItem.received = false;
            }
            
            return {
                ...prev,
                [listKey]: {
                    ...currentList,
                    [itemId]: currentItem
                }
            };
        });
    };

    const handleOtherDocUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const name = otherDocName.trim() || file.name;
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            const url = uploadEvent.target.result;
            setColabForm(prev => {
                const currentDocs = [...(prev.otherDocs || [])];
                currentDocs.push({
                    name,
                    url,
                    date: new Date().toLocaleDateString('pt-BR')
                });
                return {
                    ...prev,
                    otherDocs: currentDocs
                };
            });
            setOtherDocName('');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveOtherDoc = (index) => {
        setColabForm(prev => {
            const currentDocs = [...(prev.otherDocs || [])];
            currentDocs.splice(index, 1);
            return {
                ...prev,
                otherDocs: currentDocs
            };
        });
    };

    const formatCurrencyValue = (num) => {
        if (num === undefined || num === null) return '0,00';
        return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getDocStatus = (docState) => {
        if (!docState) return { label: 'Pendente', className: 'status-pendente' };
        if (docState.received) {
            if (!docState.isIndeterminate && docState.expiry) {
                const expiryDate = new Date(docState.expiry);
                const today = new Date();
                expiryDate.setHours(0,0,0,0);
                today.setHours(0,0,0,0);
                if (expiryDate < today) {
                    return { label: 'Expirado', className: 'status-expirado' };
                }
            }
            return { label: 'Recebido', className: 'status-recebido' };
        }
        if (docState.mandatory !== false) {
            return { label: 'Pendente', className: 'status-pendente' };
        }
        return { label: 'Opcional', className: 'status-opcional' };
    };

    const handleCurrencyInputChange = (e, field) => {
        let val = e.target.value;
        val = val.replace(/\D/g, '');
        if (!val) {
            setColabForm(prev => ({ ...prev, [field]: 0 }));
            return;
        }
        const floatVal = parseFloat(val) / 100;
        setColabForm(prev => ({ ...prev, [field]: floatVal }));
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            setColabForm(prev => ({
                ...prev,
                img: uploadEvent.target.result
            }));
        };
        reader.readAsDataURL(file);
    };

    // =============================================
    // CRUD 2: PRODUTOS (PRODUCTS)
    // =============================================

    const [showContentTooltip, setShowContentTooltip] = useState(false);
    const [prodForm, setProdForm] = useState({
        sku: '', name: '', brand: '', category: '', 
        unit: 'KG', stock: 0, minStock: 0, avgStock: 0, maxStock: 0,
        status: 'Ativo', desc: '', primarySupplierId: '',
        controlaProducao: false,
        volumeOcupado: 0,
        allowedZones: [],
        podeEmpilhar: false,
        maxEmpilhamento: 1,
        allowedCells: [],
        otherSupplierIds: [],
        contentQty: 1.00,
        contentUnit: '',
        gtinUnidade: '',
        gtinFardo: '',
        itensFardo: 1,
        gtinCaixa: '',
        itensCaixa: 1,
        gtinPallet: '',
        itensPallet: 1
    });

    const [limitToSpecificCells, setLimitToSpecificCells] = useState(false);
    const [showCellSelectorModal, setShowCellSelectorModal] = useState(false);
    const [selectorWarehouses, setSelectorWarehouses] = useState([]);
    const [selectorZones, setSelectorZones] = useState([]);
    const [selectorLocations, setSelectorLocations] = useState([]);
    const [selectorSelectedWarehouseId, setSelectorSelectedWarehouseId] = useState('');
    const [selectorSelectedZoneId, setSelectorSelectedZoneId] = useState('');
    const [selectorSelectedAisle, setSelectorSelectedAisle] = useState('');
    const [selectorSelectedRow, setSelectorSelectedRow] = useState('A');

    const loadWmsDataForSelector = async () => {
        try {
            const whs = await DbService.getWmsWarehouses();
            setSelectorWarehouses(whs);
            if (whs.length > 0) {
                const defaultWhId = whs[0].id;
                setSelectorSelectedWarehouseId(defaultWhId);
                
                const zones = await DbService.getWmsZones(defaultWhId);
                setSelectorZones(zones);
                if (zones.length > 0) {
                    const defaultZoneId = zones[0].id;
                    setSelectorSelectedZoneId(defaultZoneId);
                    
                    const locs = await DbService.getWmsLocations(defaultZoneId);
                    setSelectorLocations(locs);
                    
                    if (locs.length > 0) {
                        const uniqueAisles = [...new Set(locs.map(l => l.aisle))].sort((a,b) => {
                            const numA = parseInt(a, 10);
                            const numB = parseInt(b, 10);
                            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                            return a.localeCompare(b);
                        });
                        setSelectorSelectedAisle(uniqueAisles[0] || '');
                        setSelectorSelectedRow('A');
                    } else {
                        setSelectorSelectedAisle('');
                    }
                } else {
                    setSelectorZones([]);
                    setSelectorLocations([]);
                    setSelectorSelectedZoneId('');
                    setSelectorSelectedAisle('');
                }
            } else {
                setSelectorWarehouses([]);
                setSelectorZones([]);
                setSelectorLocations([]);
                setSelectorSelectedWarehouseId('');
                setSelectorSelectedZoneId('');
                setSelectorSelectedAisle('');
            }
        } catch (e) {
            console.error('[SettingsHub] Error loading selector WMS data:', e);
        }
    };

    const handleSelectorWarehouseChange = async (whId) => {
        setSelectorSelectedWarehouseId(whId);
        const zones = await DbService.getWmsZones(whId);
        setSelectorZones(zones);
        if (zones.length > 0) {
            const defaultZoneId = zones[0].id;
            setSelectorSelectedZoneId(defaultZoneId);
            const locs = await DbService.getWmsLocations(defaultZoneId);
            setSelectorLocations(locs);
            if (locs.length > 0) {
                const uniqueAisles = [...new Set(locs.map(l => l.aisle))].sort((a,b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.localeCompare(b);
                });
                setSelectorSelectedAisle(uniqueAisles[0] || '');
                setSelectorSelectedRow('A');
            } else {
                setSelectorSelectedAisle('');
            }
        } else {
            setSelectorZones([]);
            setSelectorLocations([]);
            setSelectorSelectedZoneId('');
            setSelectorSelectedAisle('');
        }
    };

    const handleSelectorZoneChange = async (zoneId) => {
        setSelectorSelectedZoneId(zoneId);
        const locs = await DbService.getWmsLocations(zoneId);
        setSelectorLocations(locs);
        if (locs.length > 0) {
            const uniqueAisles = [...new Set(locs.map(l => l.aisle))].sort((a,b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
            });
            setSelectorSelectedAisle(uniqueAisles[0] || '');
            setSelectorSelectedRow('A');
        } else {
            setSelectorSelectedAisle('');
        }
    };

    const openProdModalForEdit = (prod) => {
        DbService.getWmsZones().then(setAllZonesList).catch(e => console.warn(e));
        setEditingProd(prod);
        setProdForm({
            sku: prod.sku || '',
            name: prod.name || '',
            brand: prod.brand || '',
            category: prod.category || '',
            unit: prod.unit || 'KG',
            stock: prod.stock || 0,
            minStock: prod.minStock || 0,
            avgStock: prod.avgStock || 0,
            maxStock: prod.maxStock || 0,
            status: prod.status || 'Ativo',
            desc: prod.desc || '',
            primarySupplierId: prod.primarySupplierId || '',
            controlaProducao: !!prod.controlaProducao,
            volumeOcupado: prod.volumeOcupado || 0,
            allowedZones: prod.allowedZones || [],
            podeEmpilhar: !!prod.podeEmpilhar,
            maxEmpilhamento: prod.maxEmpilhamento || 1,
            allowedCells: prod.allowedCells || [],
            otherSupplierIds: prod.otherSupplierIds || [],
            contentQty: prod.contentQty !== undefined ? prod.contentQty : (prod.content_qty || 1),
            contentUnit: prod.contentUnit || prod.content_unit || '',
            gtinUnidade: prod.gtinUnidade || prod.gtin_unidade || '',
            gtinFardo: prod.gtinFardo || prod.gtin_fardo || '',
            itensFardo: prod.itensFardo !== undefined ? prod.itensFardo : (prod.itens_fardo || 1),
            gtinCaixa: prod.gtinCaixa || prod.gtin_caixa || '',
            itensCaixa: prod.itensCaixa !== undefined ? prod.itensCaixa : (prod.itens_caixa || 1),
            gtinPallet: prod.gtinPallet || prod.gtin_pallet || '',
            itensPallet: prod.itensPallet !== undefined ? prod.itensPallet : (prod.itens_pallet || 1)
        });
        setLimitToSpecificCells(prod.allowedCells && prod.allowedCells.length > 0);
        
        // Load recipe if it exists
        const existingRecipe = Array.isArray(prod.recipe) ? prod.recipe.map(r => ({
            ingredientSku: r.ingredientSku || r.ingredient_sku || '',
            name: r.name || '',
            quantity: r.quantity !== undefined ? String(r.quantity) : '',
            unit: r.unit || 'G'
        })) : [];
        setRecipeItems(existingRecipe);
        setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
        setRecipeIngredientSearch('');
        setProdActiveSection('geral');

        setShowProdModal(true);
    };

    const openProdModalForCreate = () => {
        DbService.getWmsZones().then(setAllZonesList).catch(e => console.warn(e));
        setEditingProd(null);
        setProdForm({
            sku: '', name: '', brand: '', 
            category: categorias[0]?.name || '', 
            unit: 'KG', stock: 0, minStock: 0, avgStock: 0, maxStock: 0,
            status: 'Ativo', desc: '', primarySupplierId: '',
            controlaProducao: false,
            volumeOcupado: 0,
            allowedZones: [],
            podeEmpilhar: false,
            maxEmpilhamento: 1,
            allowedCells: [],
            otherSupplierIds: [],
            contentQty: 1,
            contentUnit: '',
            gtinUnidade: '',
            gtinFardo: '',
            itensFardo: 1,
            gtinCaixa: '',
            itensCaixa: 1,
            gtinPallet: '',
            itensPallet: 1
        });
        setLimitToSpecificCells(false);
        setRecipeItems([]);
        setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
        setRecipeIngredientSearch('');
        setProdActiveSection('geral');
        setShowProdModal(true);
    };

    const handleSaveProd = async (e) => {
        e.preventDefault();
        
        if (!editingProd && produtos.some(p => p.sku.toLowerCase() === prodForm.sku.toLowerCase())) {
            showToast('Erro: Já existe um produto cadastrado com este SKU.', 'error');
            return;
        }

        const recipePayload = recipeItems
            .filter(r => r.ingredientSku && parseFloat(r.quantity) > 0)
            .map(r => ({
                ingredientSku: r.ingredientSku,
                name: r.name || '',
                quantity: parseFloat(r.quantity),
                unit: r.unit
            }));

        const payload = {
            ...prodForm,
            primarySupplierId: prodForm.primarySupplierId ? Number(prodForm.primarySupplierId) : null,
            secondarySupplierId: null,
            volumeOcupado: parseFloat(prodForm.volumeOcupado) || 0,
            allowedZones: prodForm.allowedZones || [],
            podeEmpilhar: !!prodForm.podeEmpilhar,
            maxEmpilhamento: parseInt(prodForm.maxEmpilhamento, 10) || 1,
            allowedCells: prodForm.allowedCells || [],
            otherSupplierIds: (prodForm.otherSupplierIds || []).map(Number),
            recipe: recipePayload,
            itensFardo: parseFloat(prodForm.itensFardo) || 1,
            itensCaixa: parseFloat(prodForm.itensCaixa) || 1,
            itensPallet: parseFloat(prodForm.itensPallet) || 1
        };

        const result = await DbService.saveProduct(payload, editingProd ? editingProd.sku : null);
        if (result.success) {
            showToast('Produto gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }

        setShowProdModal(false);
        loadData();
    };

    const handleDeleteProd = (prod) => {
        setProdToDelete(prod);
    };

    const confirmDeleteProd = async () => {
        if (!prodToDelete) return;
        const prod = prodToDelete;
        setProdToDelete(null);

        const result = await DbService.deleteProduct(prod.sku);
        if (result.success) {
            showToast('Produto excluído com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removido no cache local offline.', 'warning');
        }
        loadData();
    };

    const handleToggleProdStatus = async (prod) => {
        const newStatus = prod.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updated = { ...prod, status: newStatus };
        
        // Optimistic local update
        setProdutos(prev => prev.map(p => p.sku === prod.sku ? updated : p));
        
        await DbService.saveProduct(updated, prod.sku);
        loadData();
    };

    // =============================================
    // CRUD 2.5: PRODUTOS FINAIS (SALE PRODUCTS)
    // =============================================
    const openSaleProdModalForEdit = (prod) => {
        setEditingSaleProd(prod);
        setSaleProdForm({
            code: prod.code || '',
            name: prod.name || '',
            category: prod.category || '',
            description: prod.description || '',
            price: prod.price !== undefined ? String(prod.price) : '',
            unit: prod.unit || 'UN',
            status: prod.status || 'Ativo',
            controlaProducao: !!prod.controlaProducao
        });
        // Load recipe if it exists
        const existingRecipe = Array.isArray(prod.recipe) ? prod.recipe.map(r => ({
            ingredientSku: r.ingredientSku || '',
            name: r.name || '',
            quantity: r.quantity !== undefined ? String(r.quantity) : '',
            unit: r.unit || 'G'
        })) : [];
        setRecipeItems(existingRecipe);
        setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
        setRecipeIngredientSearch('');
        setSaleProdActiveSection('geral');
        setShowSaleProdModal(true);
    };

    const openSaleProdModalForCreate = () => {
        setEditingSaleProd(null);
        setSaleProdForm({
            code: '', name: '', category: '', description: '',
            price: '', unit: 'UN', status: 'Ativo', controlaProducao: false
        });
        setRecipeItems([]);
        setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
        setRecipeIngredientSearch('');
        setSaleProdActiveSection('geral');
        setShowSaleProdModal(true);
    };

    const handleSaveSaleProd = async (e) => {
        e.preventDefault();
        
        const codeClean = saleProdForm.code.trim().toUpperCase();
        const nameClean = saleProdForm.name.trim();
        const categoryClean = saleProdForm.category.trim().toUpperCase();
        const descriptionClean = saleProdForm.description.trim();
        
        let priceFloat = 0;
        if (typeof saleProdForm.price === 'string') {
            let val = saleProdForm.price.replace('R$', '').replace(/\s/g, '');
            if (val.includes(',') && val.includes('.')) {
                val = val.replace(/\./g, '').replace(',', '.');
            } else if (val.includes(',')) {
                val = val.replace(',', '.');
            }
            priceFloat = parseFloat(val) || 0;
        } else {
            priceFloat = parseFloat(saleProdForm.price) || 0;
        }

        if (!editingSaleProd && saleProducts.some(p => p.code.toLowerCase() === codeClean.toLowerCase())) {
            showToast('Erro: Já existe um produto de venda cadastrado com este Código.', 'error');
            return;
        }

        // Build recipe payload — only include items with valid sku and quantity
        const recipePayload = recipeItems
            .filter(r => r.ingredientSku && parseFloat(r.quantity) > 0)
            .map(r => ({
                ingredientSku: r.ingredientSku,
                name: r.name || '',
                quantity: parseFloat(r.quantity),
                unit: r.unit
            }));

        const payload = {
            code: codeClean,
            name: nameClean,
            category: categoryClean,
            description: descriptionClean,
            price: priceFloat,
            unit: saleProdForm.unit,
            status: saleProdForm.status,
            controlaProducao: !!saleProdForm.controlaProducao,
            recipe: recipePayload
        };

        const result = await DbService.saveSaleProduct(payload, editingSaleProd ? editingSaleProd.code : null);
        if (result.success) {
            showToast('Produto final gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }

        setShowSaleProdModal(false);
        const saleProdsData = await DbService.getSaleProducts();
        setSaleProducts(saleProdsData || []);
    };

    const handleDeleteSaleProd = (prod) => {
        setSaleProdToDelete(prod);
    };

    const confirmDeleteSaleProd = async () => {
        if (!saleProdToDelete) return;
        const prod = saleProdToDelete;
        setSaleProdToDelete(null);

        const result = await DbService.deleteSaleProduct(prod.code);
        if (result.success) {
            showToast('Produto final excluído com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removido no cache local offline.', 'warning');
        }
        
        const saleProdsData = await DbService.getSaleProducts();
        setSaleProducts(saleProdsData || []);
    };

    const handleToggleSaleProdStatus = async (prod) => {
        const newStatus = prod.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updated = { ...prod, status: newStatus };
        
        setSaleProducts(prev => prev.map(p => p.code === prod.code ? updated : p));
        
        await DbService.saveSaleProduct(updated, prod.code);
        const saleProdsData = await DbService.getSaleProducts();
        setSaleProducts(saleProdsData || []);
    };

    // =============================================
    // CRUD 3: CATEGORIAS (CATEGORIES)
    // =============================================

    const [catForm, setCatForm] = useState({
        name: '', icon: 'fa-cheese', color: 'color-blue', desc: '', status: 'Ativo'
    });

    const openCatModalForEdit = (cat) => {
        setEditingCat(cat);
        setCatForm({
            id: cat.id,
            name: cat.name || '',
            icon: cat.icon || 'fa-cheese',
            color: cat.color || 'color-blue',
            desc: cat.desc || '',
            status: cat.status || 'Ativo'
        });
        setShowCatModal(true);
    };

    const openCatModalForCreate = () => {
        setEditingCat(null);
        setCatForm({
            name: '', icon: activeCatScope === 'produtos' ? 'fa-pizza-slice' : 'fa-cheese', color: activeCatScope === 'produtos' ? 'color-pink' : 'color-blue', desc: '', status: 'Ativo'
        });
        setShowCatModal(true);
    };

    const handleSaveCat = async (e) => {
        e.preventDefault();
        
        const payload = {
            ...catForm,
            name: catForm.name.toUpperCase().trim()
        };

        let result;
        if (activeCatScope === 'produtos') {
            result = await DbService.saveSaleProductCategory(payload);
        } else {
            result = await DbService.saveCategory(payload);
        }

        if (result.success) {
            showToast('Categoria gravada com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravada em cache local offline.', 'warning');
        }

        setShowCatModal(false);
        loadData();
    };

    const handleDeleteCat = (cat) => {
        setCatToDelete(cat);
    };

    const confirmDeleteCat = async () => {
        if (!catToDelete) return;
        const cat = catToDelete;
        setCatToDelete(null);

        let result;
        if (activeCatScope === 'produtos') {
            result = await DbService.deleteSaleProductCategory(cat.id);
        } else {
            result = await DbService.deleteCategory(cat.id);
        }

        if (result.success) {
            showToast('Categoria excluída com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removida no cache local offline.', 'warning');
        }
        loadData();
    };

    const handleToggleCatStatus = async (cat) => {
        const newStatus = cat.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updated = { ...cat, status: newStatus };
        
        if (activeCatScope === 'produtos') {
            setCategoriasVenda(prev => prev.map(c => String(c.id) === String(cat.id) ? updated : c));
            await DbService.saveSaleProductCategory(updated);
        } else {
            setCategorias(prev => prev.map(c => String(c.id) === String(cat.id) ? updated : c));
            await DbService.saveCategory(updated);
        }
        loadData();
    };

    // =============================================
    // CRUD 3.5: SETORES (SECTORS)
    // =============================================
    const openSectorModalForEdit = (sec) => {
        setEditingSector(sec);
        setSectorForm({
            id: sec.id,
            name: sec.name || '',
            icon: sec.icon || 'fa-folder',
            color: sec.color || 'color-blue',
            description: sec.description || '',
            status: sec.status || 'Ativo'
        });
        setShowSectorModal(true);
    };

    const openSectorModalForCreate = () => {
        setEditingSector(null);
        setSectorForm({
            name: '', icon: 'fa-folder', color: 'color-blue', description: '', status: 'Ativo'
        });
        setShowSectorModal(true);
    };

    const handleSaveSector = async (e) => {
        e.preventDefault();
        const payload = {
            ...sectorForm,
            name: sectorForm.name.toUpperCase().trim()
        };

        const result = await DbService.saveSector(payload);
        if (result.success) {
            showToast('Setor gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }
        setShowSectorModal(false);
        loadData();
    };

    const handleDeleteSector = (sec) => {
        setSectorToDelete(sec);
    };

    const confirmDeleteSector = async () => {
        if (!sectorToDelete) return;
        const sec = sectorToDelete;
        setSectorToDelete(null);

        const result = await DbService.deleteSector(sec.id);
        if (result.success) {
            showToast('Setor excluído com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removido no cache local offline.', 'warning');
        }
        loadData();
    };

    const handleToggleSectorStatus = async (sec) => {
        const newStatus = sec.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updated = { ...sec, status: newStatus };
        setSetores(prev => prev.map(s => String(s.id) === String(sec.id) ? updated : s));
        await DbService.saveSector(updated);
        loadData();
    };

    // =============================================
    // CRUD 3.6: CARGOS (ROLES)
    // =============================================
    const openCargoModalForEdit = (car) => {
        setEditingCargo(car);
        setCargoForm({
            id: car.id,
            name: car.name || '',
            description: car.description || car.desc || '',
            sectorId: car.sectorId || '',
            status: car.status || 'Ativo'
        });
        setShowCargoModal(true);
    };

    const openCargoModalForCreate = () => {
        setEditingCargo(null);
        setCargoForm({
            name: '', description: '', sectorId: '', status: 'Ativo'
        });
        setShowCargoModal(true);
    };

    const handleSaveCargo = async (e) => {
        e.preventDefault();
        
        const payload = {
            ...cargoForm,
            name: cargoForm.name.trim(),
            sectorId: cargoForm.sectorId ? Number(cargoForm.sectorId) : null
        };
        if (editingCargo) {
            payload.id = editingCargo.id;
        } else {
            delete payload.id;
        }

        const result = await DbService.saveArea(payload);
        if (result.success) {
            showToast('Cargo gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }
        setShowCargoModal(false);
        // Refresh cargo list
        const areasData = await DbService.getAreas();
        setCargos(areasData);
    };

    // Confirm modals delete helpers
    const confirmDeleteCargo = async () => {
        if (!cargoToDelete) return;
        const car = cargoToDelete;
        setCargoToDelete(null);

        const result = await DbService.deleteArea(car.id);
        if (result.success) {
            showToast('Cargo excluído com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removido no cache local offline.', 'warning');
        }
        // Refresh cargo list
        const areasData = await DbService.getAreas();
        setCargos(areasData);
    };

    const handleToggleCargoStatus = async (car) => {
        const newStatus = car.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updated = { 
            ...car, 
            status: newStatus,
            sectorId: car.sectorId ? Number(car.sectorId) : null
        };
        setCargos(prev => prev.map(c => String(c.id) === String(car.id) ? { ...c, status: newStatus } : c));
        
        const result = await DbService.saveArea(updated);
        // Refresh cargo list
        const areasData = await DbService.getAreas();
        setCargos(areasData);
    };

    const handleDeleteCargo = (car) => {
        setCargoToDelete(car);
    };

    // =============================================
    // CRUD 4: FORNECEDORES (SUPPLIERS)
    // =============================================

    const [fornForm, setFornForm] = useState({
        razaoSocial: '', nomeFantasia: '', cnpj: '', ie: '', im: '', 
        tipoFornecedor: 'Distribuidor', situacao: 'Ativo', dataCadastro: '',
        contato: { responsavelComercial: '', responsavelFinanceiro: '', telefone: '', whatsapp: '', emailComercial: '', emailFinanceiro: '', site: '' },
        contatos: [{ nome: '', setor: 'Comercial', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '', observacaoSalva: '' }],
        endereco: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
        financeiro: { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
        logistica: { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
        ratings: { qualidade: 8, prazo: 8, atendimento: 8, preco: 8 },
        blockInfo: { status: 'Ativo', motivo: '' },
        fomentCategories: [],
        fomentProducts: []
    });

    const openFornModalForEdit = (sup) => {
        setEditingForn(sup);
        const resolvedContatos = (() => {
            let list = [];
            if (sup.contato?.listaContatos && Array.isArray(sup.contato.listaContatos) && sup.contato.listaContatos.length > 0) {
                list = sup.contato.listaContatos.map((c, idx) => ({
                    nome: c.nome || '',
                    setor: c.setor || '',
                    email: c.email || '',
                    telefoneComercial: c.telefoneComercial || '',
                    whatsapp: c.whatsapp || '',
                    site: c.site || '',
                    observacao: c.observacao || '',
                    observacaoSalva: c.observacaoSalva || c.observacao || '',
                    isPrimary: c.isPrimary !== undefined ? c.isPrimary : (idx === 0)
                }));
            } else if (sup.contato) {
                list = [
                    {
                        nome: sup.contato.responsavelComercial || '',
                        setor: 'Comercial',
                        email: sup.contato.emailComercial || '',
                        telefoneComercial: sup.contato.telefone || '',
                        whatsapp: sup.contato.whatsapp || '',
                        site: sup.contato.site || '',
                        observacao: '',
                        observacaoSalva: '',
                        isPrimary: true
                    }
                ];
                if (sup.contato.responsavelFinanceiro || sup.contato.emailFinanceiro) {
                    list.push({
                        nome: sup.contato.responsavelFinanceiro || '',
                        setor: 'Financeiro',
                        email: sup.contato.emailFinanceiro || '',
                        telefoneComercial: '',
                        whatsapp: '',
                        site: '',
                        observacao: '',
                        isPrimary: false
                    });
                }
            }
            if (list.length === 0) {
                list = [{ nome: '', setor: 'Comercial', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '', isPrimary: true }];
            }
            if (!list.some(c => c.isPrimary)) {
                list[0].isPrimary = true;
            }
            return list;
        })();

        setFornForm({
            id: sup.id,
            razaoSocial: sup.razaoSocial || '',
            nomeFantasia: sup.nomeFantasia || '',
            cnpj: maskCNPJ(sup.cnpj || ''),
            ie: maskIE(sup.ie || '', sup.endereco?.estado || ''),
            im: sup.im || '',
            tipoFornecedor: sup.tipoFornecedor || 'Distribuidor',
            situacao: sup.situacao || 'Ativo',
            dataCadastro: sup.dataCadastro || '',
            contato: sup.contato || { responsavelComercial: '', responsavelFinanceiro: '', telefone: '', whatsapp: '', emailComercial: '', emailFinanceiro: '', site: '' },
            contatos: resolvedContatos,
            endereco: sup.endereco ? { ...sup.endereco, cep: maskCEP(sup.endereco.cep || '') } : { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
            financeiro: sup.financeiro ? {
                ...sup.financeiro,
                prazoPagamento: sup.financeiro.prazoPagamento ? String(sup.financeiro.prazoPagamento).replace(/\D/g, '') : ''
            } : { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
            logistica: sup.logistica ? {
                ...sup.logistica,
                prazoEntrega: sup.logistica.prazoEntrega ? String(sup.logistica.prazoEntrega).replace(/\D/g, '') : ''
            } : { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
            ratings: sup.ratings || { qualidade: 8, prazo: 8, atendimento: 8, preco: 8 },
            blockInfo: sup.blockInfo || { status: 'Ativo', motivo: '' },
            fomentCategories: sup.fomentCategories || [],
            fomentProducts: sup.fomentProducts || []
        });
        setFomentProdSearch('');
        setTempLinkedProducts(sup.linkedProducts || []);
        setTempNotes(sup.notes || []);
        setFornActiveSection('geral');
        setShowFornModal(true);
    };

    const openFornModalForCreate = () => {
        setEditingForn(null);
        setFornForm({
            razaoSocial: '', nomeFantasia: '', cnpj: '', ie: '', im: '', 
            tipoFornecedor: 'Distribuidor', situacao: 'Ativo', 
            dataCadastro: new Date().toISOString().split('T')[0],
            contato: { responsavelComercial: '', responsavelFinanceiro: '', telefone: '', whatsapp: '', emailComercial: '', emailFinanceiro: '', site: '' },
            contatos: [{ nome: '', setor: 'Comercial', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '', observacaoSalva: '', isPrimary: true }],
            endereco: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
            financeiro: { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
            logistica: { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
            ratings: { qualidade: 8, prazo: 8, atendimento: 8, preco: 8 },
            blockInfo: { status: 'Ativo', motivo: '' },
            fomentCategories: [],
            fomentProducts: []
        });
        setFomentProdSearch('');
        setTempLinkedProducts([]);
        setTempNotes([]);
        setFornActiveSection('geral');
        setShowFornModal(true);
    };

    const handleSaveForn = async (e) => {
        e.preventDefault();

        const cleanedPrazoEntrega = fornForm.logistica.prazoEntrega ? String(fornForm.logistica.prazoEntrega).replace(/\D/g, '') : '';
        const cleanedPrazoPagamento = fornForm.financeiro.prazoPagamento ? String(fornForm.financeiro.prazoPagamento).replace(/\D/g, '') : '';

        // Build backward-compatible contato object from the list of contatos
        const primaryContact = fornForm.contatos?.find(c => c.isPrimary) || fornForm.contatos?.[0] || { nome: '', setor: '', email: '', whatsapp: '', site: '', telefoneComercial: '', observacao: '' };
        const financeContact = fornForm.contatos?.find(c => c.setor && c.setor.toLowerCase().includes('finan')) || fornForm.contatos?.[1] || { nome: '', email: '' };

        const legacyContato = {
            responsavelComercial: primaryContact.nome || '',
            responsavelFinanceiro: financeContact.nome || '',
            telefone: primaryContact.telefoneComercial || '',
            whatsapp: primaryContact.whatsapp || '',
            emailComercial: primaryContact.email || '',
            emailFinanceiro: financeContact.email || '',
            site: primaryContact.site || '',
            listaContatos: fornForm.contatos
        };

        const payload = {
            ...fornForm,
            razaoSocial: fornForm.razaoSocial.toUpperCase().trim(),
            nomeFantasia: fornForm.nomeFantasia.toUpperCase().trim(),
            contato: legacyContato,
            financeiro: {
                ...fornForm.financeiro,
                prazoPagamento: cleanedPrazoPagamento
            },
            logistica: {
                ...fornForm.logistica,
                prazoEntrega: cleanedPrazoEntrega
            },
            linkedProducts: tempLinkedProducts,
            notes: tempNotes
        };

        const result = await DbService.saveSupplier(payload);
        if (result.success) {
            showToast('Fornecedor gravado com sucesso!', 'success');
        } else {
            showToast('[Aviso] Gravado em cache local offline.', 'warning');
        }

        setShowFornModal(false);
        loadData();
    };

    const handleSaveContactObservation = async (index) => {
        if (!editingForn) return;

        const currentObservation = fornForm.contatos[index]?.observacao || '';
        const list = [...fornForm.contatos];
        list[index] = { ...list[index], observacaoSalva: currentObservation };

        setFornForm(prev => ({ ...prev, contatos: list }));

        const primaryContact = list.find(c => c.isPrimary) || list[0] || { nome: '', setor: '', email: '', whatsapp: '', site: '', telefoneComercial: '', observacao: '', observacaoSalva: '' };
        const financeContact = list.find(c => c.setor && c.setor.toLowerCase().includes('finan')) || list[1] || { nome: '', email: '' };

        const legacyContato = {
            responsavelComercial: primaryContact.nome || '',
            responsavelFinanceiro: financeContact.nome || '',
            telefone: primaryContact.telefoneComercial || '',
            whatsapp: primaryContact.whatsapp || '',
            emailComercial: primaryContact.email || '',
            emailFinanceiro: financeContact.email || '',
            site: primaryContact.site || '',
            listaContatos: list
        };

        const cleanedPrazoEntrega = fornForm.logistica.prazoEntrega ? String(fornForm.logistica.prazoEntrega).replace(/\D/g, '') : '';
        const cleanedPrazoPagamento = fornForm.financeiro.prazoPagamento ? String(fornForm.financeiro.prazoPagamento).replace(/\D/g, '') : '';

        const payload = {
            ...fornForm,
            contatos: list,
            contato: legacyContato,
            razaoSocial: fornForm.razaoSocial.toUpperCase().trim(),
            nomeFantasia: fornForm.nomeFantasia.toUpperCase().trim(),
            financeiro: {
                ...fornForm.financeiro,
                prazoPagamento: cleanedPrazoPagamento
            },
            logistica: {
                ...fornForm.logistica,
                prazoEntrega: cleanedPrazoEntrega
            },
            linkedProducts: tempLinkedProducts,
            notes: tempNotes
        };

        const result = await DbService.saveSupplier(payload);
        if (result.success) {
            showToast('Observação do contato salva com sucesso!', 'success');
        } else {
            showToast('[Aviso] Observação salva em cache local offline.', 'warning');
        }

        setEditingForn(payload);
        loadData();
    };

    const handleDeleteForn = (sup) => {
        setFornToDelete(sup);
    };

    const confirmDeleteForn = async () => {
        if (!fornToDelete) return;
        const sup = fornToDelete;
        setFornToDelete(null);

        const result = await DbService.deleteSupplier(sup.id);
        if (result.success) {
            showToast('Fornecedor removido com sucesso.', 'success');
        } else {
            showToast('[Aviso] Removido no cache local offline.', 'warning');
        }
        loadData();
    };

    const handleToggleFornStatus = async (sup) => {
        const newStatus = sup.situacao === 'Ativo' ? 'Bloqueado' : 'Ativo';
        const updated = { ...sup, situacao: newStatus, blockInfo: { ...sup.blockInfo, status: newStatus } };
        
        // Optimistic local update
        setFornecedores(prev => prev.map(f => String(f.id) === String(sup.id) ? updated : f));
        
        await DbService.saveSupplier(updated);
        loadData();
    };

    const handleAddNote = () => {
        if (!newNoteText.trim()) return;
        const author = globalState.currentUser ? globalState.currentUser.name : 'Sistema';
        const newNote = {
            text: newNoteText.trim(),
            author,
            date: new Date().toLocaleString('pt-BR')
        };
        setTempNotes(prev => [newNote, ...prev]);
        setNewNoteText('');
    };

    const handleToggleFomentCategory = (catName) => {
        setFornForm(prev => {
            const current = prev.fomentCategories || [];
            const next = current.includes(catName)
                ? current.filter(c => c !== catName)
                : [...current, catName];
            return { ...prev, fomentCategories: next };
        });
    };

    const handleToggleFomentProduct = (prodSku) => {
        setFornForm(prev => {
            const current = prev.fomentProducts || [];
            const next = current.includes(prodSku)
                ? current.filter(p => p !== prodSku)
                : [...current, prodSku];
            return { ...prev, fomentProducts: next };
        });
    };

    // Mappings and ratings helpers
    const calculateRatingAverage = (ratings) => {
        if (!ratings) return 0;
        const total = (ratings.qualidade || 0) + (ratings.prazo || 0) + (ratings.atendimento || 0) + (ratings.preco || 0);
        return total / 4;
    };

    const formatPrazoEntrega = (prazo) => {
        if (!prazo) return '-';
        const num = parseInt(prazo);
        if (isNaN(num)) return prazo;
        return `${num} ${num === 1 ? 'dia' : 'dias'}`;
    };
    const maskCPF = (val) => {
        if (!val) return '';
        const d = val.replace(/\D/g, '').slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
        if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    };

    const maskRG = (val) => {
        if (!val) return '';
        const d = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9);
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
        if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
        return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
    };

    const maskPhone = (val) => {
        if (!val) return '';
        const d = val.replace(/\D/g, '').slice(0, 11);
        if (d.length === 0) return '';
        if (d.length <= 2) return `(${d}`;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };

    const maskCEP = (val) => {
        if (!val) return '';
        const d = val.replace(/\D/g, '').slice(0, 8);
        if (d.length <= 5) return d;
        return `${d.slice(0, 5)}-${d.slice(5)}`;
    };

    const maskCNPJ = (val) => {
        if (!val) return '';
        const d = val.replace(/\D/g, '').slice(0, 14);
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
        if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
        if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
        return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    };

    const maskIE = (val, uf) => {
        if (!val) return '';
        const d = val.replace(/\D/g, '');
        const state = (uf || '').toUpperCase().trim();

        switch (state) {
            case 'SP':
                {
                    const clean = val.replace(/[^0-9P]/gi, '').toUpperCase().slice(0, 13);
                    if (clean.startsWith('P')) {
                        const pDigits = clean.slice(1, 13);
                        if (pDigits.length <= 8) return `P-${pDigits}`;
                        if (pDigits.length <= 9) return `P-${pDigits.slice(0, 8)}.${pDigits.slice(8)}`;
                        return `P-${pDigits.slice(0, 8)}.${pDigits.slice(8, 9)}/${pDigits.slice(9)}`;
                    } else {
                        const digits = clean.slice(0, 12);
                        if (digits.length <= 3) return digits;
                        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
                        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
                        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}.${digits.slice(9)}`;
                    }
                }
            case 'RJ':
                if (d.length <= 2) return d;
                if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                if (d.length <= 7) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 7)}-${d.slice(7, 8)}`;
            case 'MG':
                if (d.length <= 3) return d;
                if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
                if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
                return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}/${d.slice(9, 13)}`;
            case 'DF':
                if (d.length <= 2) return d;
                if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                if (d.length <= 11) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
                return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 11)}-${d.slice(11, 13)}`;
            case 'PR':
                if (d.length <= 3) return d;
                if (d.length <= 8) return `${d.slice(0, 3)}.${d.slice(3)}`;
                return `${d.slice(0, 3)}.${d.slice(3, 8)}-${d.slice(8, 10)}`;
            case 'RS':
                if (d.length <= 3) return d;
                return `${d.slice(0, 3)}-${d.slice(3, 10)}`;
            case 'BA':
                if (d.length <= 8) {
                    if (d.length <= 6) return d;
                    return `${d.slice(0, 6)}-${d.slice(6, 8)}`;
                } else {
                    if (d.length <= 7) return d;
                    return `${d.slice(0, 7)}-${d.slice(7, 9)}`;
                }
            case 'SC':
                if (d.length <= 3) return d;
                if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
                return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}`;
            case 'PE':
                if (d.length <= 9) {
                    if (d.length <= 7) return d;
                    return `${d.slice(0, 7)}-${d.slice(7, 9)}`;
                } else {
                    if (d.length <= 2) return d;
                    if (d.length <= 3) return `${d.slice(0, 2)}.${d.slice(2)}`;
                    if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3)}`;
                    if (d.length <= 13) return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
                    return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3, 6)}.${d.slice(6, 13)}-${d.slice(13, 14)}`;
                }
            case 'CE':
                if (d.length <= 2) return d;
                if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2)}`;
                return `${d.slice(0, 2)}.${d.slice(2, 8)}-${d.slice(8, 9)}`;
            case 'GO':
            case 'MT':
            case 'MS':
            case 'AM':
            case 'AP':
                if (d.length <= 2) return d;
                if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8, 9)}`;
            case 'PA':
                if (d.length <= 2) return d;
                if (d.length <= 8) return `${d.slice(0, 2)}-${d.slice(2)}`;
                return `${d.slice(0, 2)}-${d.slice(2, 8)}-${d.slice(8, 9)}`;
            case 'RN':
                if (d.length <= 9) {
                    if (d.length <= 2) return d;
                    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8, 9)}`;
                } else {
                    if (d.length <= 2) return d;
                    if (d.length <= 3) return `${d.slice(0, 2)}.${d.slice(2)}`;
                    if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3)}`;
                    if (d.length <= 9) return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
                    return `${d.slice(0, 2)}.${d.slice(2, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 10)}`;
                }
            case 'PB':
            case 'SE':
                if (d.length <= 7) return d;
                return `${d.slice(0, 7)}-${d.slice(7, 9)}`;
            case 'ES':
                if (d.length <= 3) return d;
                if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
                if (d.length <= 8) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
                return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 8)}-${d.slice(8, 9)}`;
            case 'AC':
                if (d.length <= 2) return d;
                if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                if (d.length <= 11) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
                return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 11)}-${d.slice(11, 13)}`;
            case 'AL':
            case 'RR':
                return d.slice(0, 9);
            case 'RO':
                return d.slice(0, 14);
            case 'TO':
                return d.slice(0, 11);
            default:
                if (d.length <= 8) return d;
                if (d.length <= 12) return `${d.slice(0, 8)}-${d.slice(8)}`;
                return `${d.slice(0, 8)}-${d.slice(8, 12)}/${d.slice(12)}`;
        }
    };


    const handleSelectBank = (bank) => {
        setFornForm(prev => ({
            ...prev,
            financeiro: { ...prev.financeiro, banco: bank }
        }));
        setShowBancoDropdown(false);
    };

    const handleBancoKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const typedValue = (fornForm.financeiro.banco || '').trim();
            if (!typedValue) return;

            const match = bankList.find(b => b.toLowerCase() === typedValue.toLowerCase());
            if (match) {
                setFornForm(prev => ({
                    ...prev,
                    financeiro: { ...prev.financeiro, banco: match }
                }));
                setShowBancoDropdown(false);
            } else {
                setGenericConfirm({
                    title: 'Adicionar Novo Banco?',
                    message: `O banco "${typedValue}" não está cadastrado. Deseja adicionar este novo banco à lista?`,
                    confirmText: 'ADICIONAR',
                    cancelText: 'CANCELAR',
                    isDanger: false,
                    onConfirm: () => {
                        const newList = [...bankList, typedValue].sort();
                        setBankList(newList);
                        localStorage.setItem('corellux_banks', JSON.stringify(newList));
                        setFornForm(prev => ({
                            ...prev,
                            financeiro: { ...prev.financeiro, banco: typedValue }
                        }));
                        setShowBancoDropdown(false);
                    }
                });
            }
        }
    };

    const handleSelectColabBank = (bank) => {
        setColabForm(prev => ({
            ...prev,
            bank: bank
        }));
        setShowColabBancoDropdown(false);
    };

    const handleColabBancoKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const typedValue = (colabForm.bank || '').trim();
            if (!typedValue) return;

            const match = bankList.find(b => b.toLowerCase() === typedValue.toLowerCase());
            if (match) {
                setColabForm(prev => ({
                    ...prev,
                    bank: match
                }));
                setShowColabBancoDropdown(false);
            } else {
                setGenericConfirm({
                    title: 'Adicionar Novo Banco?',
                    message: `O banco "${typedValue}" não está cadastrado. Deseja adicionar este novo banco à lista?`,
                    confirmText: 'ADICIONAR',
                    cancelText: 'CANCELAR',
                    isDanger: false,
                    onConfirm: () => {
                        const newList = [...bankList, typedValue].sort();
                        setBankList(newList);
                        localStorage.setItem('corellux_banks', JSON.stringify(newList));
                        setColabForm(prev => ({
                            ...prev,
                            bank: typedValue
                        }));
                        setShowColabBancoDropdown(false);
                    }
                });
            }
        }
    };

    // =============================================
    // LIST FILTERS
    // =============================================

    const filteredColabs = colaboradores.filter(c => 
        c.name.toLowerCase().includes(searchColab.toLowerCase()) ||
        (c.displayName && c.displayName.toLowerCase().includes(searchColab.toLowerCase())) ||
        c.role.toLowerCase().includes(searchColab.toLowerCase())
    );

    const filteredProds = produtos.filter(p => 
        p.sku.toLowerCase().includes(searchProd.toLowerCase()) ||
        p.name.toLowerCase().includes(searchProd.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchProd.toLowerCase())) ||
        p.category.toLowerCase().includes(searchProd.toLowerCase()) ||
        (p.gtinUnidade && p.gtinUnidade.includes(searchProd)) ||
        (p.gtinFardo && p.gtinFardo.includes(searchProd)) ||
        (p.gtinCaixa && p.gtinCaixa.includes(searchProd)) ||
        (p.gtinPallet && p.gtinPallet.includes(searchProd))
    );

    const filteredCats = (activeCatScope === 'produtos' ? categoriasVenda : categorias).filter(c => 
        c.name.toLowerCase().includes(searchCat.toLowerCase()) ||
        (c.desc && c.desc.toLowerCase().includes(searchCat.toLowerCase()))
    );

    const filteredForns = fornecedores.filter(f => 
        (f.razaoSocial || '').toLowerCase().includes(searchForn.toLowerCase()) ||
        (f.nomeFantasia && f.nomeFantasia.toLowerCase().includes(searchForn.toLowerCase())) ||
        (f.cnpj || '').includes(searchForn)
    );

    const filteredSectors = setores.filter(s => 
        s.name.toLowerCase().includes(searchSector.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchSector.toLowerCase()))
    );

    const filteredCargos = cargos.filter(c => 
        c.name.toLowerCase().includes(searchCargo.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchCargo.toLowerCase()))
    );

    const filteredSaleProducts = saleProducts.filter(p => 
        (p.code || '').toLowerCase().includes(searchSaleProd.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(searchSaleProd.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchSaleProd.toLowerCase())
    );

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Navegação orientada exclusivamente a Cards e Botões de Voltar */}

            {/* Inner Content Area */}
            <div className="tab-content" style={{ flex: 1, padding: activeTab === 'menu' ? '0' : '2rem', overflowY: 'auto' }}>
                
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
                        <p>Buscando registros do servidor...</p>
                    </div>
                ) : (
                    <>
                        {/* =============================================
                            DASHBOARD DE CADASTROS (MENU)
                        ============================================= */}
                        {activeTab === 'menu' && (
                            <div className="dashboard-menu">
                                <button 
                                    className="menu-card orange" 
                                    onClick={() => setActiveTab('colaboradores')}
                                >
                                    <div className="card-icon"><Users size={24} /></div>
                                    <div className="card-content">
                                        <h3>COLABORADORES</h3>
                                        <p>Funcionários, cargos, salários, horários e checklists.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card blue" 
                                    onClick={() => setActiveTab('produtos')}
                                >
                                    <div className="card-icon"><Boxes size={24} /></div>
                                    <div className="card-content">
                                        <h3>INSUMOS</h3>
                                        <p>Insumos, controle de estoque, unidades e SKUs.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card pink" 
                                    onClick={() => setActiveTab('produto')}
                                >
                                    <div className="card-icon"><ShoppingBag size={24} /></div>
                                    <div className="card-content">
                                        <h3>PRODUTO</h3>
                                        <p>Gestão de produtos finais de venda e cardápio.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card green" 
                                    onClick={() => setActiveTab('categorias')}
                                >
                                    <div className="card-icon"><Tag size={24} /></div>
                                    <div className="card-content">
                                        <h3>CATEGORIAS</h3>
                                        <p>Organização de insumos e vinculações de cores.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card purple" 
                                    onClick={() => setActiveTab('fornecedores')}
                                >
                                    <div className="card-icon"><Truck size={24} /></div>
                                    <div className="card-content">
                                        <h3>FORNECEDORES</h3>
                                        <p>CGC, contatos comerciais, avaliações e prazos.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card teal" 
                                    onClick={() => setActiveTab('setores')}
                                >
                                    <div className="card-icon"><LayoutGrid size={24} /></div>
                                    <div className="card-content">
                                        <h3>SETORES</h3>
                                        <p>Criação e gestão de setores operacionais da empresa.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card yellow" 
                                    onClick={() => setActiveTab('cargos')}
                                >
                                    <div className="card-icon"><Briefcase size={24} /></div>
                                    <div className="card-content">
                                        <h3>CARGOS</h3>
                                        <p>Cargos, permissões padrão e funções organizacionais.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>

                                <button 
                                    className="menu-card dark-blue" 
                                    onClick={() => setActiveTab('wms')}
                                >
                                    <div className="card-icon"><Warehouse size={24} /></div>
                                    <div className="card-content">
                                        <h3>ARMAZÉNS (WMS)</h3>
                                        <p>Cadastro de armazéns, zonas (frio/seco) e endereçamentos.</p>
                                    </div>
                                    <ChevronRight className="chevron" size={20} />
                                </button>
                            </div>
                        )}

                        {/* =============================================
                            TAB 1: COLABORADORES
                        ============================================= */}
                        {activeTab === 'colaboradores' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users style={{ color: 'var(--accent-orange)' }} /> Cadastro de Funcionários
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar nome ou cargo..."
                                                value={searchColab}
                                                onChange={(e) => setSearchColab(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action" onClick={openColabModalForCreate}>
                                                <PlusCircle size={16} /> NOVO COLABORADOR
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Foto</th>
                                                <th>Nome</th>
                                                <th>Cargo</th>
                                                <th>Nível Acesso</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredColabs.map(colab => {
                                                let statusBadge = 'badge-ativo';
                                                if (colab.status === 'Bloqueado') statusBadge = 'badge-bloqueado';
                                                
                                                return (
                                                    <tr key={colab.id}>
                                                        <td>
                                                            <img 
                                                                src={getUserAvatar(colab.img)} 
                                                                alt={colab.name} 
                                                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                                                            />
                                                        </td>
                                                        <td>
                                                            <strong>{colab.displayName || colab.name}</strong>
                                                            <br />
                                                            <small style={{ color: 'var(--text-secondary)' }}>{colab.name}</small>
                                                        </td>
                                                        <td>{colab.role}</td>
                                                        <td>{colab.accessLevel}</td>
                                                        <td style={{ width: '120px' }}>
                                                            <span className={`status-badge ${statusBadge}`} style={{
                                                                background: colab.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: colab.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                border: colab.status === 'Ativo' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                                                width: '95px',
                                                                display: 'inline-block',
                                                                textAlign: 'center'
                                                            }}>
                                                                {colab.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', width: '130px' }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                 <button className="action-btn-sm edit" onClick={() => openColabModalForEdit(colab)} title="Editar">
                                                                     <Edit size={16} />
                                                                 </button>
                                                                 <button 
                                                                     className={`switch-toggle-btn ${colab.status === 'Ativo' ? 'active' : ''}`}
                                                                     onClick={() => handleToggleColabStatus(colab)}
                                                                     title={colab.status === 'Ativo' ? 'Bloquear Funcionário' : 'Ativar Funcionário'}
                                                                 >
                                                                     <div className="switch-toggle-track">
                                                                         <div className="switch-toggle-handle"></div>
                                                                     </div>
                                                                 </button>
                                                                 <button className="action-btn-sm delete" onClick={() => handleDeleteColab(colab)} title="Excluir">
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </div>
                                                         </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* =============================================
                            TAB 2: PRODUTOS
                        ============================================= */}
                        {activeTab === 'produtos' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Boxes style={{ color: 'var(--accent-orange)' }} /> Cadastro de Insumos
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar SKU, nome, marca ou categoria..."
                                                value={searchProd}
                                                onChange={(e) => setSearchProd(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action" onClick={openProdModalForCreate}>
                                                <PlusCircle size={16} /> NOVO INSUMO
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>SKU</th>
                                                <th>Nome</th>
                                                <th>Marca</th>
                                                <th>Unidade</th>
                                                <th>Vol. (m³/un)</th>
                                                <th>Categoria</th>
                                                <th>Fornecedores</th>
                                                <th>Estoque</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProds.map(prod => (
                                                <tr key={prod.sku}>
                                                    <td><strong>{prod.sku}</strong></td>
                                                    <td>
                                                        <div className="product-desc">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: '700' }}>{prod.name}</span>
                                                                {prod.recipe && prod.recipe.length > 0 && (
                                                                    <span style={{ 
                                                                        background: 'rgba(243, 107, 29, 0.15)', 
                                                                        color: 'var(--accent-orange)', 
                                                                        padding: '0.1rem 0.4rem', 
                                                                        borderRadius: '4px', 
                                                                        fontSize: '0.65rem', 
                                                                        fontWeight: '700',
                                                                        letterSpacing: '0.5px'
                                                                    }}>
                                                                        PRODUÇÃO
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span>{prod.desc || 'Sem descrição.'}</span>
                                                            {prod.allowedZones && prod.allowedZones.length > 0 && (
                                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.35rem', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Zonas:</span>
                                                                    {prod.allowedZones.map(zId => {
                                                                        const z = allZonesList.find(x => x.id === zId);
                                                                        return z ? (
                                                                            <span key={zId} style={{
                                                                                fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px',
                                                                                background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)',
                                                                                border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: '800',
                                                                                textTransform: 'uppercase'
                                                                            }} title={z.acronymDescription || z.description || ''}>
                                                                                {z.name}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            )}
                                                            {(prod.podeEmpilhar || (prod.allowedCells && prod.allowedCells.length > 0)) && (
                                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem', alignItems: 'center' }}>
                                                                    {prod.podeEmpilhar && (
                                                                        <span style={{
                                                                            fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px',
                                                                            background: 'rgba(243, 107, 29, 0.12)', color: 'var(--accent-orange)',
                                                                            border: '1px solid rgba(243, 107, 29, 0.25)', fontWeight: '800',
                                                                            textTransform: 'uppercase'
                                                                        }}>
                                                                            Empilhável (Lte: {prod.maxEmpilhamento})
                                                                        </span>
                                                                    )}
                                                                    {prod.allowedCells && prod.allowedCells.length > 0 && (
                                                                        <span style={{
                                                                            fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px',
                                                                            background: 'rgba(34, 197, 94, 0.12)', color: 'var(--accent-green)',
                                                                            border: '1px solid rgba(34, 197, 94, 0.25)', fontWeight: '800',
                                                                            textTransform: 'uppercase'
                                                                        }} title={`${prod.allowedCells.length} célula(s) específica(s) permitida(s)`}>
                                                                            Células Permitidas: {prod.allowedCells.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>{prod.brand || '-'}</span></td>
                                                    <td>{prod.unit}</td>
                                                    <td>{(Number(prod.volumeOcupado) || 0).toFixed(4)} m³</td>
                                                    <td><span className="category-tag">{prod.category}</span></td>
                                                    <td>
                                                        <div style={{ fontSize: '0.8rem' }}>
                                                            <strong>{(() => {
                                                                const f = fornecedores.find(sup => String(sup.id) === String(prod.primarySupplierId));
                                                                return f ? (f.nomeFantasia || f.razaoSocial) : 'Sem Fornecedor';
                                                            })()}</strong>
                                                        </div>
                                                    </td>
                                                    <td>{prod.stock}</td>
                                                    <td style={{ width: '120px' }}>
                                                        <span className={`status-badge ${prod.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`} style={{
                                                            background: prod.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: prod.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                            width: '95px',
                                                            display: 'inline-block',
                                                            textAlign: 'center'
                                                        }}>
                                                            {prod.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', width: '130px' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                             <button className="action-btn-sm edit" onClick={() => openProdModalForEdit(prod)} title="Editar">
                                                                 <Edit size={16} />
                                                             </button>
                                                             <button 
                                                                 className={`switch-toggle-btn ${prod.status === 'Ativo' ? 'active' : ''}`}
                                                                 onClick={() => handleToggleProdStatus(prod)}
                                                                 title={prod.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                             >
                                                                 <div className="switch-toggle-track">
                                                                     <div className="switch-toggle-handle"></div>
                                                                 </div>
                                                             </button>
                                                             <button className="action-btn-sm delete" onClick={() => handleDeleteProd(prod)} title="Excluir">
                                                                 <Trash2 size={16} />
                                                             </button>
                                                         </div>
                                                     </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                                           {activeTab === 'categorias' && (
                            <div className="products-container">
                                {/* Menu Cards de Escopo */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                                    gap: '1.25rem', 
                                    marginBottom: '2rem' 
                                }}>
                                    {/* Card 1: Categorias de Insumos */}
                                    <div 
                                        onClick={() => setActiveCatScope('insumos')}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            border: activeCatScope === 'insumos' 
                                                ? '1px solid var(--accent-orange)' 
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: activeCatScope === 'insumos'
                                                ? 'linear-gradient(135deg, rgba(243, 107, 29, 0.15) 0%, rgba(243, 107, 29, 0.03) 100%)'
                                                : 'rgba(255, 255, 255, 0.02)',
                                            boxShadow: activeCatScope === 'insumos'
                                                ? '0 8px 32px rgba(243, 107, 29, 0.1)'
                                                : 'none',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.25rem'
                                        }}
                                        className="category-menu-card"
                                    >
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: activeCatScope === 'insumos' ? 'var(--accent-orange)' : 'rgba(255, 255, 255, 0.06)',
                                            color: activeCatScope === 'insumos' ? '#fff' : 'var(--text-secondary)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <Layers size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: activeCatScope === 'insumos' ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
                                                Categorias de Insumos
                                            </h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                                                Ingredientes, embalagens e estoque
                                            </p>
                                            <span style={{ 
                                                display: 'inline-block',
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                background: activeCatScope === 'insumos' ? 'rgba(243, 107, 29, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                color: activeCatScope === 'insumos' ? 'var(--accent-orange)' : 'var(--text-secondary)'
                                            }}>
                                                {categorias.length} {categorias.length === 1 ? 'Categoria' : 'Categorias'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card 2: Categorias de Produtos */}
                                    <div 
                                        onClick={() => setActiveCatScope('produtos')}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            border: activeCatScope === 'produtos' 
                                                ? '1px solid var(--accent-pink)' 
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: activeCatScope === 'produtos'
                                                ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.03) 100%)'
                                                : 'rgba(255, 255, 255, 0.02)',
                                            boxShadow: activeCatScope === 'produtos'
                                                ? '0 8px 32px rgba(236, 72, 153, 0.1)'
                                                : 'none',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.25rem'
                                        }}
                                        className="category-menu-card"
                                    >
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: activeCatScope === 'produtos' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.06)',
                                            color: activeCatScope === 'produtos' ? '#fff' : 'var(--text-secondary)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <ShoppingBag size={24} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: activeCatScope === 'produtos' ? 'var(--accent-pink)' : 'var(--text-primary)' }}>
                                                Categorias de Produtos
                                            </h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                                                Produtos finais de cardápio e venda
                                            </p>
                                            <span style={{ 
                                                display: 'inline-block',
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                background: activeCatScope === 'produtos' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                color: activeCatScope === 'produtos' ? 'var(--accent-pink)' : 'var(--text-secondary)'
                                            }}>
                                                {categoriasVenda.length} {categoriasVenda.length === 1 ? 'Categoria' : 'Categorias'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {activeCatScope === 'produtos' ? (
                                            <>
                                                <ShoppingBag style={{ color: 'var(--accent-pink)' }} /> Cadastro de Categorias de Produtos
                                            </>
                                        ) : (
                                            <>
                                                <Tag style={{ color: 'var(--accent-orange)' }} /> Cadastro de Categorias de Insumos
                                            </>
                                        )}
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar categoria..."
                                                value={searchCat}
                                                onChange={(e) => setSearchCat(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className={`btn-header-action ${activeCatScope === 'produtos' ? 'pink' : ''}`} onClick={openCatModalForCreate}>
                                                <PlusCircle size={16} /> NOVA CATEGORIA
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>Descrição</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCats.map(cat => (
                                                <tr key={cat.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                            <div className={`cat-icon-area ${cat.color || (activeCatScope === 'produtos' ? 'color-pink' : 'color-blue')}`} style={{ width: '35px', height: '35px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {activeCatScope === 'produtos' ? <ShoppingBag size={16} /> : <Tag size={16} />}
                                                            </div>
                                                            <strong style={{ fontSize: '1rem' }}>{cat.name}</strong>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{cat.desc || cat.description || '-'}</td>
                                                    <td style={{ width: '120px' }}>
                                                        <span className={`status-badge ${cat.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`} style={{
                                                            background: cat.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: cat.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                            width: '95px',
                                                            display: 'inline-block',
                                                            textAlign: 'center'
                                                        }}>
                                                            {cat.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', width: '130px' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                             <button className="action-btn-sm edit" onClick={() => openCatModalForEdit(cat)} title="Editar">
                                                                 <Edit size={16} />
                                                             </button>
                                                             <button 
                                                                 className={`switch-toggle-btn ${cat.status === 'Ativo' ? 'active' : ''}`}
                                                                 onClick={() => handleToggleCatStatus(cat)}
                                                                 title={cat.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                             >
                                                                 <div className="switch-toggle-track">
                                                                     <div className="switch-toggle-handle"></div>
                                                                 </div>
                                                             </button>
                                                             <button className="action-btn-sm delete" onClick={() => handleDeleteCat(cat)} title="Excluir">
                                                                 <Trash2 size={16} />
                                                             </button>
                                                         </div>
                                                     </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* =============================================
                            TAB 4: FORNECEDORES
                        ============================================= */}
                        {activeTab === 'fornecedores' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Truck style={{ color: 'var(--accent-orange)' }} /> Cadastro de Fornecedores
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar CNPJ, Razão Social ou Fantasia..."
                                                value={searchForn}
                                                onChange={(e) => setSearchForn(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action" onClick={openFornModalForCreate}>
                                                <PlusCircle size={16} /> NOVO FORNECEDOR
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Nome Fantasia / Razão Social</th>
                                                <th>CNPJ</th>
                                                <th>Contato Comercial</th>
                                                <th>Prazo Logístico</th>
                                                <th>Avaliação Média</th>
                                                <th style={{ width: '120px' }}>Situação</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredForns.map(forn => {
                                                const avgRating = calculateRatingAverage(forn.ratings);
                                                let badge = 'badge-ativo';
                                                if (forn.situacao === 'Bloqueado') badge = 'badge-bloqueado';

                                                return (
                                                    <tr key={forn.id}>
                                                        <td>
                                                            <strong>{forn.nomeFantasia || forn.razaoSocial}</strong>
                                                            <br />
                                                            <small style={{ color: 'var(--text-secondary)' }}>{forn.razaoSocial}</small>
                                                        </td>
                                                        <td>{forn.cnpj}</td>
                                                        <td>
                                                            {forn.contato?.responsavelComercial || '-'}
                                                            <br />
                                                            <small style={{ color: 'var(--text-secondary)' }}>{forn.contato?.whatsapp || forn.contato?.telefone || ''}</small>
                                                        </td>
                                                        <td>{formatPrazoEntrega(forn.logistica?.prazoEntrega)}</td>
                                                        <td>
                                                            <span style={{ color: 'var(--accent-orange)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                                <Star size={14} style={{ fill: 'var(--accent-orange)' }} /> {avgRating.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td style={{ width: '120px' }}>
                                                            <span className={`status-badge ${badge}`} style={{
                                                                background: forn.situacao === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: forn.situacao === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                width: '95px',
                                                                display: 'inline-block',
                                                                textAlign: 'center'
                                                            }}>
                                                                {forn.situacao}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', width: '130px' }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                 <button className="action-btn-sm edit" onClick={() => openFornModalForEdit(forn)} title="Editar/Detalhes">
                                                                     <Edit size={16} />
                                                                 </button>
                                                                 <button 
                                                                     className={`switch-toggle-btn ${forn.situacao === 'Ativo' ? 'active' : ''}`}
                                                                     onClick={() => handleToggleFornStatus(forn)}
                                                                     title={forn.situacao === 'Ativo' ? 'Bloquear' : 'Desbloquear'}
                                                                 >
                                                                     <div className="switch-toggle-track">
                                                                         <div className="switch-toggle-handle"></div>
                                                                     </div>
                                                                 </button>
                                                                 <button className="action-btn-sm delete" onClick={() => handleDeleteForn(forn)} title="Excluir">
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </div>
                                                         </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* =============================================
                            TAB 4.5: SETORES
                        ============================================= */}
                        {activeTab === 'setores' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <LayoutGrid style={{ color: 'var(--accent-teal)' }} /> Cadastro de Setores
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar setor..."
                                                value={searchSector}
                                                onChange={(e) => setSearchSector(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action teal" onClick={openSectorModalForCreate}>
                                                <PlusCircle size={16} /> NOVO SETOR
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>Descrição</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSectors.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum setor encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredSectors.map(sec => (
                                                    <tr key={sec.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <div className={`cat-icon-area ${sec.color || 'color-blue'}`} style={{ width: '35px', height: '35px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <LayoutGrid size={16} />
                                                                </div>
                                                                <strong style={{ fontSize: '1rem' }}>{sec.name}</strong>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{sec.description || '-'}</td>
                                                        <td style={{ width: '120px' }}>
                                                            <span className={`status-badge ${sec.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`} style={{
                                                                background: sec.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: sec.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                width: '95px',
                                                                display: 'inline-block',
                                                                textAlign: 'center'
                                                            }}>
                                                                {sec.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', width: '130px' }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                 <button className="action-btn-sm edit" onClick={() => openSectorModalForEdit(sec)} title="Editar">
                                                                     <Edit size={16} />
                                                                 </button>
                                                                 <button 
                                                                     className={`switch-toggle-btn ${sec.status === 'Ativo' ? 'active' : ''}`}
                                                                     onClick={() => handleToggleSectorStatus(sec)}
                                                                     title={sec.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                                 >
                                                                     <div className="switch-toggle-track">
                                                                         <div className="switch-toggle-handle"></div>
                                                                     </div>
                                                                 </button>
                                                                 <button className="action-btn-sm delete" onClick={() => handleDeleteSector(sec)} title="Excluir">
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </div>
                                                         </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* =============================================
                            TAB 4.6: CARGOS
                        ============================================= */}
                        {activeTab === 'cargos' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Briefcase style={{ color: 'var(--accent-yellow)' }} /> Cadastro de Cargos
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar cargo..."
                                                value={searchCargo}
                                                onChange={(e) => setSearchCargo(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action yellow" onClick={openCargoModalForCreate}>
                                                <PlusCircle size={16} /> NOVO CARGO
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>Setor</th>
                                                <th>Descrição</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCargos.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum cargo encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredCargos.map(car => (
                                                    <tr key={car.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <div className="cat-icon-area color-yellow" style={{ width: '35px', height: '35px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Briefcase size={16} />
                                                                </div>
                                                                <strong style={{ fontSize: '1rem' }}>{car.name}</strong>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>
                                                            {(() => {
                                                                const s = setores.find(sec => String(sec.id) === String(car.sectorId));
                                                                return s ? s.name : '-';
                                                            })()}
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{car.description || car.desc || '-'}</td>
                                                        <td style={{ width: '120px' }}>
                                                            <span className={`status-badge ${car.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`} style={{
                                                                background: car.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: car.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                width: '95px',
                                                                display: 'inline-block',
                                                                textAlign: 'center'
                                                            }}>
                                                                {car.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', width: '130px' }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                 <button className="action-btn-sm edit" onClick={() => openCargoModalForEdit(car)} title="Editar">
                                                                     <Edit size={16} />
                                                                 </button>
                                                                 <button 
                                                                     className={`switch-toggle-btn ${car.status === 'Ativo' ? 'active' : ''}`}
                                                                     onClick={() => handleToggleCargoStatus(car)}
                                                                     title={car.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                                 >
                                                                     <div className="switch-toggle-track">
                                                                         <div className="switch-toggle-handle"></div>
                                                                     </div>
                                                                 </button>
                                                                 <button className="action-btn-sm delete" onClick={() => handleDeleteCargo(car)} title="Excluir">
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </div>
                                                         </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'produto' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ShoppingBag style={{ color: 'var(--accent-pink)' }} /> Cadastro de Produtos Finais
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div className="search-box" style={{ margin: 0 }}>
                                            <Search size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar produto..."
                                                value={searchSaleProd}
                                                onChange={(e) => setSearchSaleProd(e.target.value)}
                                            />
                                        </div>
                                        {isAdminUser && (
                                            <button className="btn-header-action pink" onClick={openSaleProdModalForCreate}>
                                                <PlusCircle size={16} /> NOVO PRODUTO
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '120px' }}>Código</th>
                                                <th>Nome</th>
                                                <th>Categoria</th>
                                                <th>Descrição</th>
                                                <th style={{ textAlign: 'right', width: '120px' }}>Preço Venda</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Unidade</th>
                                                <th style={{ width: '100px', textAlign: 'center' }}>Tem Receita?</th>
                                                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSaleProducts.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum produto final encontrado.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredSaleProducts.map(prod => (
                                                    <tr key={prod.code}>
                                                        <td style={{ fontWeight: '700', color: 'var(--accent-pink)' }}>{prod.code}</td>
                                                        <td>
                                                            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{prod.name}</strong>
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                background: 'rgba(236, 72, 153, 0.12)', 
                                                                color: 'var(--accent-pink)', 
                                                                padding: '3px 8px', 
                                                                borderRadius: '4px', 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {prod.category}
                                                            </span>
                                                        </td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {prod.description || '-'}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-green)' }}>
                                                            R$ {formatCurrencyValue(prod.price)}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                            {prod.unit}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{
                                                                color: (prod.recipe && prod.recipe.length > 0) ? 'var(--accent-green)' : 'var(--text-secondary)',
                                                                fontWeight: '700',
                                                                fontSize: '0.85rem'
                                                            }}>
                                                                {(prod.recipe && prod.recipe.length > 0) ? 'Sim' : 'Não'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={`status-badge ${prod.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`} style={{
                                                                background: prod.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: prod.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                                width: '85px',
                                                                display: 'inline-block',
                                                                textAlign: 'center'
                                                            }}>
                                                                {prod.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                <button className="action-btn-sm edit" onClick={() => openSaleProdModalForEdit(prod)} title="Editar">
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button 
                                                                    className={`switch-toggle-btn ${prod.status === 'Ativo' ? 'active' : ''}`}
                                                                    onClick={() => handleToggleSaleProdStatus(prod)}
                                                                    title={prod.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                                                                >
                                                                    <div className="switch-toggle-track">
                                                                        <div className="switch-toggle-handle"></div>
                                                                    </div>
                                                                </button>
                                                                <button className="action-btn-sm delete" onClick={() => handleDeleteSaleProd(prod)} title="Excluir">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'wms' && (
                            <div className="wms-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Warehouse style={{ color: 'var(--accent-blue)' }} /> Configuração WMS (Armazéns)
                                    </h2>
                                    {isAdminUser && (
                                        <button className="btn-header-action" onClick={openWarehouseModalForCreate} style={{ marginLeft: 'auto' }}>
                                            <PlusCircle size={16} /> NOVO ARMAZÉM
                                        </button>
                                    )}
                                </div>

                                {/* Main Split-Screen Layout */}
                                <div style={{ display: 'flex', flex: 1, gap: '1.5rem', overflow: 'hidden', minHeight: '500px' }}>
                                    {/* Left Panel: Warehouse List */}
                                    <div style={{
                                        width: '320px',
                                        background: 'rgba(19, 27, 39, 0.6)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        backdropFilter: 'blur(10px)'
                                    }}>
                                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Armazéns Disponíveis</h4>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {armazens.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                                                    Nenhum armazém cadastrado.
                                                </div>
                                            ) : (
                                                armazens.map(wh => (
                                                    <div 
                                                        key={wh.id}
                                                        onClick={() => handleSelectWarehouse(wh)}
                                                        style={{
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            background: selectedWarehouse?.id === wh.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                                                            border: selectedWarehouse?.id === wh.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    {wh.name}
                                                                    {wh.acronym && (
                                                                        <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                            {wh.acronym}
                                                                        </span>
                                                                    )}
                                                                </h4>
                                                                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                                    {wh.description || 'Sem descrição.'}
                                                                </p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openWarehouseModalForEdit(wh); }}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(wh.id); }}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '2px' }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: wh.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: wh.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)'
                                                            }}>
                                                                {wh.status || 'Ativo'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Panel: Selected Warehouse Details */}
                                    <div style={{
                                        flex: 1,
                                        background: 'rgba(19, 27, 39, 0.4)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        backdropFilter: 'blur(10px)'
                                    }}>
                                        {!selectedWarehouse ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)', padding: '2rem' }}>
                                                <Warehouse size={48} style={{ opacity: 0.3 }} />
                                                <p>Selecione um armazém à esquerda para configurar zonas e endereçamentos.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Tabs Header */}
                                                <div style={{
                                                    display: 'flex',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    background: 'rgba(0,0,0,0.15)',
                                                    padding: '0 1rem',
                                                    alignItems: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <h3 style={{ fontSize: '1.1rem', margin: '0 1.5rem 0 0', color: 'var(--accent-blue)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {selectedWarehouse.name}
                                                        {selectedWarehouse.acronym && (
                                                            <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                {selectedWarehouse.acronym}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        {[
                                                            { id: 'geral', label: 'Geral', icon: <Settings size={14} /> },
                                                            { id: 'zonas', label: 'Zonas / Estoques', icon: <Layers size={14} /> },
                                                            { id: 'enderecos', label: 'Endereçamentos', icon: <MapPin size={14} /> }
                                                        ].map(tab => (
                                                            <button
                                                                key={tab.id}
                                                                onClick={() => setActiveWmsSubTab(tab.id)}
                                                                style={{
                                                                    padding: '1rem 0.75rem',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    borderBottom: activeWmsSubTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                                                                    color: activeWmsSubTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: activeWmsSubTab === tab.id ? '600' : '400',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.4rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {tab.icon} {tab.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Sub-tab content area */}
                                                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                                    {/* WMS SUB-TAB 1: GERAL */}
                                                    {activeWmsSubTab === 'geral' && (
                                                        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                            <div>
                                                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Configurações Gerais</h4>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visualize e edite as informações gerais do armazém.</p>
                                                            </div>
                                                            <div className="card-input-group">
                                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nome do Armazém</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={selectedWarehouse.name}
                                                                    disabled
                                                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', opacity: 0.7 }}
                                                                />
                                                            </div>
                                                            <div className="card-input-group">
                                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descrição</label>
                                                                <textarea 
                                                                    value={selectedWarehouse.description || ''}
                                                                    disabled
                                                                    rows={3}
                                                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', opacity: 0.7, resize: 'none' }}
                                                                />
                                                            </div>
                                                            <div className="card-input-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <h5 style={{ margin: 0, color: 'var(--text-primary)' }}>Status Operacional</h5>
                                                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Define se o armazém pode receber ou expedir insumos.</p>
                                                                </div>
                                                                <span className={`status-badge ${selectedWarehouse.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`}>
                                                                    {selectedWarehouse.status || 'Ativo'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* WMS SUB-TAB 2: ZONAS */}
                                                    {activeWmsSubTab === 'zonas' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Zonas de Armazenamento</h4>
                                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cada armazém possui divisões físicas específicas (ex: câmaras frias, estoques secos).</p>
                                                                </div>
                                                                {isAdminUser && (
                                                                    <button className="btn-secondary" onClick={openZoneModalForCreate} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                                                        <Plus size={14} /> NOVA ZONA
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                                {wmsZones.length === 0 ? (
                                                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
                                                                        Nenhuma zona de armazenamento cadastrada para este armazém.
                                                                    </div>
                                                                ) : (
                                                                    wmsZones.map(zone => {
                                                                        let typeColor = 'var(--accent-orange)';
                                                                        if (zone.type === 'Resfriado' || zone.type === 'Congelado') typeColor = 'var(--accent-blue)';
                                                                        if (zone.type === 'Climatizado') typeColor = 'var(--accent-teal)';

                                                                        return (
                                                                            <div 
                                                                                key={zone.id}
                                                                                style={{
                                                                                    background: 'rgba(255,255,255,0.02)',
                                                                                    border: selectedZone?.id === zone.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                                                    borderRadius: '10px',
                                                                                    padding: '1.2rem',
                                                                                    position: 'relative',
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    justifyContent: 'space-between',
                                                                                    minHeight: '160px',
                                                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onClick={() => handleSelectZone(zone)}
                                                                            >
                                                                                <div>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                                                                                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700' }}>{zone.name}</h4>
                                                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                                            <button onClick={(e) => { e.stopPropagation(); openZoneModalForEdit(zone); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }} title="Editar">
                                                                                                <Edit size={14} />
                                                                                            </button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '2px' }} title="Excluir">
                                                                                                <Trash2 size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {zone.acronymDescription && (
                                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '600', marginBottom: '0.5rem' }}>
                                                                                            {zone.acronymDescription}
                                                                                        </div>
                                                                                    )}
                                                                                    <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                                                        {zone.description || zone.desc || 'Sem descrição.'}
                                                                                    </p>
                                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '0.75rem' }}>
                                                                                        {zone.isAmbient ? (
                                                                                            <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
                                                                                                Temp. Ambiente ({zone.ambientType === 'fechada' ? 'Área Fechada' : zone.ambientType === 'externa_aberta' ? 'Externa Aberta' : 'Externa Coberta'})
                                                                                            </span>
                                                                                        ) : (
                                                                                            (zone.tempMin !== null || zone.tempMax !== null) && (
                                                                                                <span>
                                                                                                    Temperatura: <strong style={{ color: 'var(--text-primary)' }}>{zone.tempMin ?? '?'}°C a {zone.tempMax ?? '?'}°C</strong>
                                                                                                </span>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: typeColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: typeColor }} />
                                                                                            {zone.type}
                                                                                        </span>
                                                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                                                            Ex: <code style={{ color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px' }}>
                                                                                                {formatAddressVisual(zone, '01', 'A', '03', null)}
                                                                                            </code>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* WMS SUB-TAB 3: ENDEREÇOS */}
                                                    {activeWmsSubTab === 'enderecos' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                                                            {wmsZones.length === 0 ? (
                                                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                                                    Crie primeiro uma Zona de armazenamento antes de gerenciar os endereços.
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {/* Control bar: Zone dropdown, view selector, batch generate button */}
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Zona:</span>
                                                                            <select 
                                                                                value={selectedZone?.id || ''} 
                                                                                onChange={(e) => {
                                                                                    const z = wmsZones.find(x => String(x.id) === String(e.target.value));
                                                                                    if (z) handleSelectZone(z);
                                                                                }}
                                                                                style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                                                            >
                                                                                {wmsZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                                                            </select>
                                                                        </div>

                                                                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
                                                                            <button 
                                                                                onClick={() => setActiveWmsLocView('mapa')}
                                                                                style={{
                                                                                    padding: '0.4rem 0.8rem',
                                                                                    background: activeWmsLocView === 'mapa' ? 'var(--accent-blue)' : 'none',
                                                                                    color: activeWmsLocView === 'mapa' ? 'white' : 'var(--text-secondary)',
                                                                                    border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                                                }}
                                                                            >
                                                                                <Map size={14} /> Mapa 2D
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => setActiveWmsLocView('lista')}
                                                                                style={{
                                                                                    padding: '0.4rem 0.8rem',
                                                                                    background: activeWmsLocView === 'lista' ? 'var(--accent-blue)' : 'none',
                                                                                    color: activeWmsLocView === 'lista' ? 'white' : 'var(--text-secondary)',
                                                                                    border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                                                }}
                                                                            >
                                                                                <Grid3X3 size={14} /> Lista
                                                                            </button>
                                                                        </div>

                                                                        {isAdminUser && (
                                                                            <button 
                                                                                className="btn-header-action"
                                                                                onClick={() => {
                                                                                    setBatchLocationForm({ 
                                                                                        aisleStart: '1', 
                                                                                        aisleEnd: '3', 
                                                                                        onlyRowAAisles: '', 
                                                                                        shelfStart: '1', 
                                                                                        shelfEnd: '5', 
                                                                                        shelfHeightStart: 'A', 
                                                                                        shelfHeightEnd: 'D', 
                                                                                        subdivisionType: 'Nenhuma', 
                                                                                        subdivisionCustom: '' 
                                                                                    });
                                                                                    setShowBatchLocationModal(true);
                                                                                }}
                                                                                style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                                                            >
                                                                                <Shuffle size={14} /> GERAR EM LOTE
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Content for WMS Active View */}
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                                                        {activeWmsLocView === 'lista' ? (
                                                                            // List view
                                                                            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                                                <table className="products-table">
                                                                                    <thead>
                                                                                        <tr>
                                                                                            <th>Endereço Formatado</th>
                                                                                            <th>Rua</th>
                                                                                            <th>Fileira</th>
                                                                                            <th>Prateleira</th>
                                                                                            <th>Posição</th>
                                                                                            <th>Status</th>
                                                                                            <th style={{ textAlign: 'center', width: '120px' }}>Ações</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {wmsLocations.length === 0 ? (
                                                                                            <tr>
                                                                                                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                                                                                    Nenhum endereço cadastrado nesta zona. Clique em "Gerar em Lote" para cadastrar posições.
                                                                                                </td>
                                                                                            </tr>
                                                                                        ) : (
                                                                                            wmsLocations.map(loc => (
                                                                                                <tr key={loc.id}>
                                                                                                    <td style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                                                                                                        {formatAddressVisual(selectedZone, loc.aisle, loc.row, loc.shelf, loc.position)}
                                                                                                    </td>
                                                                                                    <td>{loc.aisle}</td>
                                                                                                    <td>{loc.row}</td>
                                                                                                    <td>{loc.shelf}</td>
                                                                                                    <td>{loc.position || '-'}</td>
                                                                                                    <td>
                                                                                                        <span style={{
                                                                                                            fontSize: '0.75rem',
                                                                                                            padding: '2px 6px',
                                                                                                            borderRadius: '4px',
                                                                                                            background: loc.status === 'Ativo' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                                                            color: loc.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)'
                                                                                                        }}>
                                                                                                            {loc.status}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                                                                                            <button 
                                                                                                                className={`switch-toggle-btn ${loc.status === 'Ativo' ? 'active' : ''}`}
                                                                                                                onClick={() => handleToggleLocationStatus(loc)}
                                                                                                                title={loc.status === 'Ativo' ? 'Bloquear endereço' : 'Ativar endereço'}
                                                                                                            >
                                                                                                                <div className="switch-toggle-track">
                                                                                                                    <div className="switch-toggle-handle"></div>
                                                                                                                </div>
                                                                                                            </button>
                                                                                                            <button className="action-btn-sm delete" onClick={() => handleDeleteLocation(loc.id)} title="Excluir">
                                                                                                                <Trash2 size={14} />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        ) : (
                                                                            // Visual map view (2D Grid)
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                                                                {wmsLocations.length === 0 ? (
                                                                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                                                                        Nenhum endereço cadastrado nesta zona. Use o botão "Gerar em Lote" para preencher a estrutura física.
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        {/* === STEP 1: Selecionar Corredor (Rua) === */}
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>1️⃣ Corredor (Rua):</span>
                                                                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                                                {[...new Set(wmsLocations.map(l => l.aisle))].sort((a,b) => {
                                                                                                    const numA = parseInt(a, 10);
                                                                                                    const numB = parseInt(b, 10);
                                                                                                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                                                                                    return a.localeCompare(b);
                                                                                                }).map(aisle => (
                                                                                                    <button
                                                                                                        key={aisle}
                                                                                                        onClick={() => setWmsLocFilterAisle(aisle)}
                                                                                                        style={{
                                                                                                            padding: '0.3rem 0.8rem',
                                                                                                            borderRadius: '6px',
                                                                                                            border: wmsLocFilterAisle === aisle ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                                                                            background: wmsLocFilterAisle === aisle ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                                                                            color: wmsLocFilterAisle === aisle ? 'white' : 'var(--text-secondary)',
                                                                                                            fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                                                                                                        }}
                                                                                                    >
                                                                                                        Rua {aisle}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* === STEP 2: Selecionar Fileira (Lado A ou B) === */}
                                                                                        {wmsLocFilterAisle && (
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>2️⃣ Fileira (Lado):</span>
                                                                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                                                    {['A', 'B'].map(row => (
                                                                                                        <button
                                                                                                            key={row}
                                                                                                            onClick={() => setWmsLocFilterRow(row)}
                                                                                                            style={{
                                                                                                                padding: '0.3rem 1rem',
                                                                                                                borderRadius: '6px',
                                                                                                                border: wmsLocFilterRow === row ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                                                                                background: wmsLocFilterRow === row ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                                                                                color: wmsLocFilterRow === row ? 'white' : 'var(--text-secondary)',
                                                                                                                fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                                                                                                            }}
                                                                                                        >
                                                                                                            {row === 'A' ? '← Fileira A (Esquerdo)' : 'Fileira B (Direito) →'}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* === STEP 3: Mapa 2D (Prateleiras x Alturas) === */}
                                                                                        {wmsLocFilterAisle && (() => {
                                                                                            // Filter by aisle + row (fileira)
                                                                                            const filtered = wmsLocations.filter(l => l.aisle === wmsLocFilterAisle && l.row === wmsLocFilterRow);

                                                                                            if (filtered.length === 0) {
                                                                                                return (
                                                                                                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                                                                                                        Nenhum endereço encontrado para Rua {wmsLocFilterAisle} / Fileira {wmsLocFilterRow}.
                                                                                                    </div>
                                                                                                );
                                                                                            }

                                                                                            // Extract unique shelf numbers (numeric part) and height letters from compound shelf code e.g. "5D"
                                                                                            const parseShelf = (shelfCode) => {
                                                                                                const match = String(shelfCode).match(/^(\d+)([A-Z]?)$/);
                                                                                                if (match) return { num: parseInt(match[1], 10), height: match[2] || '' };
                                                                                                return { num: NaN, height: '' };
                                                                                            };

                                                                                            // Unique shelf numbers sorted ascending (left=1)
                                                                                            const shelfNums = [...new Set(filtered.map(l => parseShelf(l.shelf).num))]
                                                                                                .filter(n => !isNaN(n))
                                                                                                .sort((a, b) => a - b);

                                                                                            // Unique height letters sorted descending (top=highest)
                                                                                            const heightLetters = [...new Set(filtered.map(l => parseShelf(l.shelf).height))]
                                                                                                .filter(h => h !== '')
                                                                                                .sort((a, b) => b.localeCompare(a)); // D > C > B > A (top to bottom)

                                                                                            // If no height letters (old data without compound code) fall back
                                                                                            const hasHeights = heightLetters.length > 0;

                                                                                            return (
                                                                                                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                                                                                    {/* Header */}
                                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                                                        <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                            <Map size={14} /> Rua {wmsLocFilterAisle} &mdash; Fileira {wmsLocFilterRow === 'A' ? 'A (Esquerdo)' : 'B (Direito)'}
                                                                                                        </span>
                                                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                                                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(34,197,94,0.3)', border: '1px solid var(--accent-green)', display: 'inline-block' }} /> Ativo</span>
                                                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(239,68,68,0.3)', border: '1px solid var(--accent-red)', display: 'inline-block' }} /> Bloqueado</span>
                                                                                                        </span>
                                                                                                    </div>

                                                                                                    {/* Axis labels helper */}
                                                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                                                                                        <span>↕ Altura (topo = mais alta)</span>
                                                                                                        <span>Prateleiras 1 → N (esquerda para direita) →</span>
                                                                                                    </div>

                                                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                                                        {/* Y-axis label column */}
                                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-start' }}>
                                                                                                            {/* spacer for header row */}
                                                                                                            <div style={{ height: '28px' }} />
                                                                                                            {(hasHeights ? heightLetters : ['—']).map(h => (
                                                                                                                <div key={h} style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-blue)', minWidth: '40px' }}>
                                                                                                                    Alt. {h}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>

                                                                                                        {/* Main grid */}
                                                                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                                                                                            {/* X-axis header (shelf numbers) */}
                                                                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                                                                {shelfNums.map(num => (
                                                                                                                    <div key={num} style={{ flex: 1, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)', borderRadius: '4px', minWidth: '70px' }}>
                                                                                                                        Prat. {num}
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>

                                                                                                            {/* Grid rows: one per height letter (top = highest) */}
                                                                                                            {(hasHeights ? heightLetters : ['']).map(h => (
                                                                                                                <div key={h} style={{ display: 'flex', gap: '4px' }}>
                                                                                                                    {shelfNums.map(num => {
                                                                                                                        const shelfCode = hasHeights ? `${num}${h}` : String(num);
                                                                                                                        const cellLocs = filtered
                                                                                                                            .filter(l => l.shelf === shelfCode)
                                                                                                                            .sort((a,b) => (a.position||'').localeCompare(b.position||''));

                                                                                                                        const allAtivo = cellLocs.length > 0 && cellLocs.every(l => l.status === 'Ativo');
                                                                                                                        const allBloq  = cellLocs.length > 0 && cellLocs.every(l => l.status === 'Bloqueado');
                                                                                                                        const outerBorder = cellLocs.length === 0
                                                                                                                            ? 'rgba(255,255,255,0.04)'
                                                                                                                            : allAtivo  ? 'rgba(34,197,94,0.45)'
                                                                                                                            : allBloq   ? 'rgba(239,68,68,0.45)'
                                                                                                                            : 'rgba(251,191,36,0.45)';
                                                                                                                        const outerBg = cellLocs.length === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.18)';

                                                                                                                        return (
                                                                                                                            /*
                                                                                                                             * CELL: flex-column layout
                                                                                                                             *   ┌─────────────────┐
                                                                                                                             *   │  A  │  B  │  C  │  ← strips (flex:1, ~48px)
                                                                                                                             *   ├─────────────────┤
                                                                                                                             *   │  ✏ EDITAR       │  ← fixed bar (20px, always visible)
                                                                                                                             *   └─────────────────┘
                                                                                                                             */
                                                                                                                            <div
                                                                                                                                key={num}
                                                                                                                                style={{
                                                                                                                                    flex: 1, minWidth: '70px',
                                                                                                                                    display: 'flex', flexDirection: 'column',
                                                                                                                                    borderRadius: '6px', overflow: 'hidden',
                                                                                                                                    border: `1px solid ${outerBorder}`,
                                                                                                                                    background: outerBg,
                                                                                                                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                                                                                                                    boxSizing: 'border-box',
                                                                                                                                }}
                                                                                                                                onMouseEnter={e => {
                                                                                                                                    if (cellLocs.length === 0) return;
                                                                                                                                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.55)';
                                                                                                                                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.65)';
                                                                                                                                }}
                                                                                                                                onMouseLeave={e => {
                                                                                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                                                                                    e.currentTarget.style.borderColor = outerBorder;
                                                                                                                                }}
                                                                                                                            >
                                                                                                                                {/* ── TOP: position strips ── */}
                                                                                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: '44px' }}>
                                                                                                                                    {cellLocs.length === 0 ? (
                                                                                                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.08)' }}>—</span>
                                                                                                                                        </div>
                                                                                                                                    ) : (
                                                                                                                                        cellLocs.slice(0, 10).map((loc, idx) => {
                                                                                                                                            const isAtivo = loc.status === 'Ativo';
                                                                                                                                            const stripColor = isAtivo ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                                                                                                                                            const stripBorder = isAtivo ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
                                                                                                                                            const textClr = isAtivo ? 'var(--accent-green)' : 'var(--accent-red)';
                                                                                                                                            return (
                                                                                                                                                <div
                                                                                                                                                    key={loc.id}
                                                                                                                                                    onClick={() => handleToggleLocationStatus(loc)}
                                                                                                                                                    title={`${formatAddressVisual(selectedZone,loc.aisle,loc.row,loc.shelf,loc.position)} · Volume: ${(Number(loc.volumeCubico) || 0).toFixed(3)} m³ — clique para alterar status`}
                                                                                                                                                    style={{
                                                                                                                                                        flex: 1, height: '100%',
                                                                                                                                                        display: 'flex', flexDirection: 'column',
                                                                                                                                                        alignItems: 'center', justifyContent: 'center',
                                                                                                                                                        background: stripColor,
                                                                                                                                                        borderLeft: idx > 0 ? `1px solid ${stripBorder}` : 'none',
                                                                                                                                                        cursor: 'pointer',
                                                                                                                                                        transition: 'background 0.12s',
                                                                                                                                                    }}
                                                                                                                                                    onMouseEnter={e => e.currentTarget.style.background = isAtivo ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}
                                                                                                                                                    onMouseLeave={e => e.currentTarget.style.background = stripColor}
                                                                                                                                                >
                                                                                                                                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: textClr, lineHeight: 1 }}>{loc.position || '1'}</span>
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        })
                                                                                                                                    )}
                                                                                                                                </div>

                                                                                                                                {/* ── BOTTOM: fixed EDITAR button (only when cell has locations) ── */}
                                                                                                                                {cellLocs.length > 0 && (
                                                                                                                                    <button
                                                                                                                                        onClick={ev => { ev.stopPropagation(); handleOpenCellEdit(cellLocs, wmsLocFilterAisle, wmsLocFilterRow, shelfCode); }}
                                                                                                                                        title={`Editar posições fracionadas de ${shelfCode}`}
                                                                                                                                        style={{
                                                                                                                                            flexShrink: 0,
                                                                                                                                            height: '20px',
                                                                                                                                            width: '100%',
                                                                                                                                            background: 'rgba(15,23,42,0.75)',
                                                                                                                                            borderTop: '1px solid rgba(59,130,246,0.25)',
                                                                                                                                            border: 'none',
                                                                                                                                            color: 'rgba(147,197,253,0.85)',
                                                                                                                                            cursor: 'pointer',
                                                                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                                                                                                            fontSize: '0.58rem', fontWeight: '800', letterSpacing: '0.09em', textTransform: 'uppercase',
                                                                                                                                            transition: 'background 0.15s, color 0.15s',
                                                                                                                                            padding: 0, margin: 0,
                                                                                                                                            borderTop: '1px solid rgba(59,130,246,0.2)',
                                                                                                                                        }}
                                                                                                                                        onMouseEnter={e => {
                                                                                                                                            e.currentTarget.style.background = 'rgba(37,99,235,0.85)';
                                                                                                                                            e.currentTarget.style.color = 'white';
                                                                                                                                        }}
                                                                                                                                        onMouseLeave={e => {
                                                                                                                                            e.currentTarget.style.background = 'rgba(15,23,42,0.75)';
                                                                                                                                            e.currentTarget.style.color = 'rgba(147,197,253,0.85)';
                                                                                                                                        }}
                                                                                                                                    >
                                                                                                                                        <Edit2 size={8} strokeWidth={2.5} />
                                                                                                                                        EDITAR
                                                                                                                                    </button>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* =============================================
                MODAL: EDITAR POSIÇÕES DE CÉLULA ESPECÍFICA
            ============================================= */}
            {editCellModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '420px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setEditCellModal(null)}><X size={18} /></button>
                        <form onSubmit={handleSaveCellPositions} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ✏️ Editar Posições da Célula
                            </h3>

                            {/* Info da célula */}
                            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Célula selecionada</div>
                                <div style={{ fontWeight: '800', fontSize: '1rem', color: 'white', letterSpacing: '0.05em' }}>
                                    {editCellModal && formatAddressVisual(selectedZone, editCellModal.aisle, editCellModal.row, editCellModal.shelf, null)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Rua {editCellModal?.aisle} · Fileira {editCellModal?.row} · Prateleira {editCellModal?.shelf}
                                </div>
                            </div>

                            {/* Preview das posições atuais */}
                            {editCellModal?.currentLocs?.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Atual:</span>
                                    {editCellModal.currentLocs.map(l => (
                                        <span key={l.id} style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700',
                                            background: l.status === 'Ativo' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: l.status === 'Ativo' ? 'var(--accent-green)' : 'var(--accent-red)',
                                            border: l.status === 'Ativo' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
                                        }}>
                                            {l.position}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Input novas posições */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Novas Posições (A a J, separadas por ;)
                                </label>
                                <input
                                    type="text"
                                    value={editCellPositions}
                                    onChange={e => setEditCellPositions(e.target.value.toUpperCase())}
                                    placeholder="Ex: A;B;C;D;E"
                                    className="form-input"
                                    style={{ fontSize: '1rem', letterSpacing: '0.1em', fontWeight: '700', textAlign: 'center' }}
                                    autoFocus
                                />
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    Máximo 10 posições (A;B;C;D;E;F;G;H;I;J). Todas serão criadas como <strong>Ativo</strong>.
                                </div>
                            </div>

                            {/* Quick-select buttons */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {['A', 'A;B', 'A;B;C', 'A;B;C;D', 'A;B;C;D;E'].map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setEditCellPositions(preset)}
                                        style={{
                                            padding: '0.25rem 0.6rem', borderRadius: '5px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                                            border: editCellPositions === preset ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                            background: editCellPositions === preset ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                                            color: editCellPositions === preset ? 'white' : 'var(--text-secondary)',
                                        }}
                                    >
                                        {preset.split(';').length}x ({preset})
                                    </button>
                                ))}
                            </div>

                            {/* Input Volume Cúbico Total */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Volume Cúbico Total da Célula (m³)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={editCellVolume}
                                    onChange={e => setEditCellVolume(e.target.value)}
                                    placeholder="Ex: 12.0"
                                    className="form-input"
                                    style={{ fontSize: '1rem', fontWeight: '700', textAlign: 'center' }}
                                />
                                {(() => {
                                    const numPositions = editCellPositions.toUpperCase().split(';').map(p => p.trim()).filter(Boolean).length || 1;
                                    const parsedVol = parseFloat(editCellVolume) || 0;
                                    const perPos = parsedVol / numPositions;
                                    return (
                                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: '600' }}>
                                            💡 Cada uma das {numPositions} posições receberá automaticamente: {perPos.toFixed(3)} m³
                                        </div>
                                    );
                                })()}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditCellModal(null)} style={{ flex: 1, padding: '0.75rem' }}>CANCELAR</button>
                                <button type="submit" className="btn-header-action" style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', margin: 0, justifyContent: 'center' }}>
                                    SALVAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL 1: CADASTRO/EDIÇÃO COLABORADOR
            ============================================= */}
            {showColabModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', margin: 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                        <button className="btn-close-modal" onClick={() => setShowColabModal(false)} style={{ zIndex: 10001 }}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveColab} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1, boxSizing: 'border-box' }}>
                            <h3 id="employee-modal-title" style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800', flexShrink: 0 }}>
                                {editingColab ? 'Editar Funcionário' : 'Novo Funcionário'}
                            </h3>

                            {/* Collaborator Menu Layout */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.8rem', paddingBottom: '0.5rem', flexShrink: 0 }}>
                                {[
                                    { id: 'pessoais', label: 'Dados Pessoais' },
                                    { id: 'acesso', label: 'Acesso & Permissões' },
                                    { id: 'trabalhistas', label: 'Contrato & Salário' },
                                    { id: 'cargaHoraria', label: 'Jornada & Escala' },
                                    { id: 'bancarios', label: 'Dados Bancários' },
                                    { id: 'checklistPessoais', label: 'Doc. Pessoais' },
                                    { id: 'checklistSaude', label: 'Saúde & SST' },
                                    { id: 'outrosDocs', label: 'Anexos' }
                                ].map((sec) => (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => setColabActiveSection(sec.id)}
                                        style={{
                                            padding: '0.6rem 0',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: colabActiveSection === sec.id ? '2px solid var(--accent-orange)' : '2px solid transparent',
                                            color: colabActiveSection === sec.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {sec.label}
                                    </button>
                                ))}
                            </div>

                            <div className="modal-scrollable-content" style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                                {/* SECTION: PESSOAIS */}
                                {colabActiveSection === 'pessoais' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        {/* Foto e Campos Básicos */}
                                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-orange)' }}>
                                                    <img src={getUserAvatar(colabForm.img)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-input)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                                                    <Camera size={12} /> Alterar Foto
                                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                                </label>
                                            </div>
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome Completo</label>
                                                    <input type="text" required value={colabForm.name} onChange={(e) => setColabForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome de Exibição (Crachá)</label>
                                                    <input type="text" required value={colabForm.displayName} onChange={(e) => setColabForm(prev => ({ ...prev, displayName: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Cargo / Função</label>
                                                    <select 
                                                        required 
                                                        value={colabForm.role} 
                                                        onChange={(e) => {
                                                             const val = e.target.value;
                                                             const cargoObj = cargos.find(c => c.name === val);
                                                             let sectorName = colabForm.department;
                                                             if (cargoObj && cargoObj.sectorId) {
                                                                 const sec = setores.find(s => String(s.id) === String(cargoObj.sectorId));
                                                                 if (sec) sectorName = sec.name;
                                                             }
                                                             setColabForm(prev => ({ ...prev, role: val, department: sectorName }));
                                                         }} 
                                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {cargos.map(cargo => (
                                                            <option key={cargo.id} value={cargo.name}>{cargo.name}</option>
                                                        ))}
                                                        {colabForm.role && !cargos.some(c => c.name === colabForm.role) && (
                                                            <option value={colabForm.role}>{colabForm.role} (Não Cadastrado)</option>
                                                        )}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CPF</label>
                                                    <input type="text" placeholder="000.000.000-00" value={colabForm.cpf} onChange={(e) => setColabForm(prev => ({ ...prev, cpf: maskCPF(e.target.value) }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>RG</label>
                                                    <input type="text" placeholder="00.000.000-0" value={colabForm.rg} onChange={(e) => setColabForm(prev => ({ ...prev, rg: maskRG(e.target.value) }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Data de Nascimento</label>
                                                    <div className="custom-date-picker-wrapper">
                                                        <Calendar className="custom-date-picker-icon" size={16} />
                                                        <input 
                                                            type="date" 
                                                            value={colabForm.birthDate} 
                                                            onChange={(e) => setColabForm(prev => ({ ...prev, birthDate: e.target.value }))} 
                                                            className="custom-date-picker-input" 
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Sexo / Gênero</label>
                                                    <select 
                                                        value={colabForm.gender} 
                                                        onChange={(e) => setColabForm(prev => ({ ...prev, gender: e.target.value }))} 
                                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        <option value="Masculino">Masculino</option>
                                                        <option value="Feminino">Feminino</option>
                                                        <option value="Não Definido">Não Definido</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estado Civil</label>
                                                    <select value={colabForm.maritalStatus} onChange={(e) => setColabForm(prev => ({ ...prev, maritalStatus: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
                                                        <option value="">Selecione...</option>
                                                        <option value="Solteiro(a)">Solteiro(a)</option>
                                                        <option value="Casado(a)">Casado(a)</option>
                                                        <option value="Divorciado(a)">Divorciado(a)</option>
                                                        <option value="Viúvo(a)">Viúvo(a)</option>
                                                        <option value="União Estável">União Estável</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Telefone / WhatsApp</label>
                                                    <input type="text" placeholder="(00) 00000-0000" value={colabForm.phone} onChange={(e) => setColabForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>E-mail Pessoal / Corporativo</label>
                                                    <input type="email" placeholder="exemplo@empresa.com" value={colabForm.email} onChange={(e) => setColabForm(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Endereço */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CEP</label>
                                                <input type="text" placeholder="00000-000" value={colabForm.cep} onChange={(e) => setColabForm(prev => ({ ...prev, cep: maskCEP(e.target.value) }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Endereço Completo (Rua, Número, Bairro, Cidade)</label>
                                                <input type="text" value={colabForm.address} onChange={(e) => setColabForm(prev => ({ ...prev, address: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: ACESSO */}
                                {colabActiveSection === 'acesso' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nível de Acesso</label>
                                                <select value={colabForm.accessLevel} onChange={(e) => handleRoleAccessPreset(e.target.value)} disabled={!isAdminUser} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
                                                    <option value="Colaborador">Colaborador (Operador)</option>
                                                    <option value="Administrador">Administrador (Total)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>PIN Numérico (Acesso App)</label>
                                                <input type="text" maxLength="4" required value={colabForm.pin} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setColabForm(prev => ({ ...prev, pin: e.target.value })); }} disabled={!isAdminUser} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center', letterSpacing: '0.2em', fontWeight: '700' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Status da Conta</label>
                                                <select value={colabForm.status} onChange={(e) => setColabForm(prev => ({ ...prev, status: e.target.value }))} disabled={!isAdminUser} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
                                                    <option value="Ativo">Ativo</option>
                                                    <option value="Bloqueado">Bloqueado</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1.2rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem', fontWeight: '700' }}>Matriz de Permissões Específicas</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px' }}>
                                                {[
                                                    { label: 'Entrada Estoque', key: 'entrada' },
                                                    { label: 'Saída Estoque', key: 'saida' },
                                                    { label: 'Registrar Perdas', key: 'perdas' },
                                                    { label: 'Aprovar Pedidos', key: 'approveRequests' },
                                                    { label: 'Configurações', key: 'config' },
                                                    { label: 'Ver Relatórios', key: 'relatorios' },
                                                    { label: 'Editar Cadastros', key: 'editar' },
                                                    { label: 'Criar Fornecedores', key: 'supplierCreate' }
                                                ].map((perm) => (
                                                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: isAdminUser ? 'pointer' : 'default', color: colabForm.permissions[perm.key] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                        <input type="checkbox" checked={colabForm.permissions[perm.key]} disabled={!isAdminUser} onChange={() => handleColabPermissionChange(perm.key)} style={{ accentColor: 'var(--accent-orange)' }} />
                                                        {perm.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: TRABALHISTAS */}
                                {colabActiveSection === 'trabalhistas' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Setor</label>
                                            <select 
                                                value={colabForm.department} 
                                                onChange={(e) => setColabForm(prev => ({ ...prev, department: e.target.value }))} 
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione...</option>
                                                {setores.map(setor => (
                                                    <option key={setor.id} value={setor.name}>{setor.name}</option>
                                                ))}
                                                {colabForm.department && !setores.some(s => s.name === colabForm.department) && (
                                                    <option value={colabForm.department}>{colabForm.department} (Não Cadastrado)</option>
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Tipo de Contrato</label>
                                            <select value={colabForm.contractType} onChange={(e) => setColabForm(prev => ({ ...prev, contractType: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}>
                                                <option value="">Selecione...</option>
                                                <option value="CLT">CLT</option>
                                                <option value="PJ">PJ</option>
                                                <option value="Estágio">Estágio</option>
                                                <option value="Temporário">Temporário</option>
                                                <option value="Freelancer">Freelancer / Extra</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Data de Admissão</label>
                                            <div className="custom-date-picker-wrapper">
                                                <Calendar className="custom-date-picker-icon" size={16} />
                                                <input 
                                                    type="date" 
                                                    value={colabForm.hireDate} 
                                                    onChange={(e) => setColabForm(prev => ({ ...prev, hireDate: e.target.value }))} 
                                                    className="custom-date-picker-input" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Salário Base (R$)</label>
                                            <input type="text" placeholder="0,00" value={formatCurrencyValue(colabForm.salary)} onChange={(e) => handleCurrencyInputChange(e, 'salary')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Comissão (%)</label>
                                            <input type="number" step="0.1" placeholder="0,0" value={colabForm.commission} onChange={(e) => setColabForm(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vale Alimentação Diário (R$)</label>
                                            <input type="text" placeholder="0,00" value={formatCurrencyValue(colabForm.va)} onChange={(e) => handleCurrencyInputChange(e, 'va')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vale Transporte Diário (R$)</label>
                                            <input type="text" placeholder="0,00" value={formatCurrencyValue(colabForm.vt)} onChange={(e) => handleCurrencyInputChange(e, 'vt')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: CARGA HORÁRIA */}
                                {colabActiveSection === 'cargaHoraria' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Escala</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="6" 
                                                    value={(() => {
                                                        const parts = (colabForm.scale || '').split(/x/i);
                                                        return parts[0] || '';
                                                    })()} 
                                                    onChange={(e) => {
                                                        const num = e.target.value.replace(/\D/g, '');
                                                        const parts = (colabForm.scale || '').split(/x/i);
                                                        const right = parts[1] || '';
                                                        setColabForm(prev => ({ ...prev, scale: num ? `${num}x${right}` : '' }));
                                                    }} 
                                                    style={{ width: '45%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center' }} 
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>X</span>
                                                <input 
                                                    type="text" 
                                                    placeholder="1" 
                                                    value={(() => {
                                                        const parts = (colabForm.scale || '').split(/x/i);
                                                        return parts[1] || '';
                                                    })()} 
                                                    onChange={(e) => {
                                                        const num = e.target.value.replace(/\D/g, '');
                                                        const parts = (colabForm.scale || '').split(/x/i);
                                                        const left = parts[0] || '';
                                                        setColabForm(prev => ({ ...prev, scale: left ? `${left}x${num}` : num }));
                                                    }} 
                                                    style={{ width: '45%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center' }} 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Turno</label>
                                            <select 
                                                value={colabForm.shift} 
                                                onChange={(e) => setColabForm(prev => ({ ...prev, shift: e.target.value }))} 
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Manhã">Manhã</option>
                                                <option value="Tarde">Tarde</option>
                                                <option value="Noite">Noite</option>
                                                <option value="Integral">Integral</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Horário de Início</label>
                                            <input type="time" value={colabForm.workStart} onChange={(e) => setColabForm(prev => ({ ...prev, workStart: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Horário de Término</label>
                                            <input type="time" value={colabForm.workEnd} onChange={(e) => setColabForm(prev => ({ ...prev, workEnd: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Pausa / Almoço</label>
                                            <input type="text" placeholder="Ex: 1 hora" value={colabForm.workBreak} onChange={(e) => setColabForm(prev => ({ ...prev, workBreak: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: DADOS BANCÁRIOS */}
                                {colabActiveSection === 'bancarios' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Banco</label>
                                            <input 
                                                type="text" 
                                                value={colabForm.bank} 
                                                onChange={(e) => {
                                                    setColabForm(prev => ({ ...prev, bank: e.target.value }));
                                                    setShowColabBancoDropdown(true);
                                                }}
                                                onFocus={() => setShowColabBancoDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowColabBancoDropdown(false), 200)}
                                                onKeyDown={handleColabBancoKeyDown}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                placeholder="Busque ou digite o banco..."
                                            />
                                            {showColabBancoDropdown && (
                                                (() => {
                                                    const filtered = bankList.filter(b => 
                                                        b.toLowerCase().includes((colabForm.bank || '').toLowerCase())
                                                    );
                                                    return (
                                                        <div className="bank-dropdown-container">
                                                            {filtered.length > 0 ? (
                                                                filtered.map((bank, idx) => (
                                                                    <div 
                                                                        key={idx} 
                                                                        className="bank-dropdown-item"
                                                                        onMouseDown={() => handleSelectColabBank(bank)}
                                                                    >
                                                                        {bank}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                                    Pressione [Enter] para cadastrar: "{(colabForm.bank || '').trim()}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Agência</label>
                                            <input type="text" placeholder="0000" value={colabForm.bankAgency} onChange={(e) => setColabForm(prev => ({ ...prev, bankAgency: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Conta com Dígito</label>
                                            <input type="text" placeholder="00000-0" value={colabForm.bankAccount} onChange={(e) => setColabForm(prev => ({ ...prev, bankAccount: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Chave PIX</label>
                                            <input type="text" placeholder="CPF, Celular, E-mail ou Chave Aleatória" value={colabForm.pix} onChange={(e) => setColabForm(prev => ({ ...prev, pix: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: CHECKLIST PESSOAIS */}
                                {colabActiveSection === 'checklistPessoais' && (
                                    <div className="colab-docs-grid">
                                        {PERSONAL_DOCS_ITEMS.map(item => {
                                            const docState = colabForm.docChecklist?.[item.id] || { received: false, mandatory: true, date: '', expiry: '', attachments: [], isIndeterminate: false };
                                            const status = getDocStatus(docState);
                                            return (
                                                <div key={item.id} className={`colab-doc-card ${docState.mandatory ? 'mandatory' : ''}`}>
                                                    {/* Header */}
                                                    <div className="colab-doc-header">
                                                        <h4 className="colab-doc-title">
                                                            {item.label}
                                                            {docState.mandatory && <span style={{ color: 'var(--accent-orange)', marginLeft: '0.2rem' }}>*</span>}
                                                        </h4>
                                                        <span className={`colab-doc-badge ${status.className}`}>
                                                            {status.label === 'Recebido' && <Check size={12} />}
                                                            {status.label === 'Pendente' && <AlertTriangle size={12} />}
                                                            {status.label === 'Expirado' && <AlertTriangle size={12} />}
                                                            {status.label === 'Opcional' && <Shield size={12} />}
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    {/* Controls (Toggles) */}
                                                    <div className="colab-doc-controls">
                                                        <label className="colab-doc-toggle">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.received} 
                                                                onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'received', e.target.checked)} 
                                                            />
                                                            Entregue
                                                        </label>
                                                        <label className="colab-doc-toggle">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.mandatory} 
                                                                onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'mandatory', e.target.checked)} 
                                                            />
                                                            Obrigatório
                                                        </label>
                                                    </div>

                                                    {/* Seção de Validade (Datas) */}
                                                    <div className="colab-doc-dates">
                                                        <label className="colab-doc-toggle" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.isIndeterminate} 
                                                                onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'isIndeterminate', e.target.checked)} 
                                                            />
                                                            Não possui validade
                                                        </label>
                                                        
                                                        {!docState.isIndeterminate && (
                                                            <div className="colab-doc-dates-inputs">
                                                                <div className="colab-doc-date-field">
                                                                    <span className="colab-doc-date-label">Emissão / Recebimento</span>
                                                                    <div className="custom-date-picker-wrapper">
                                                                        <Calendar className="custom-date-picker-icon" size={14} style={{ left: '0.6rem' }} />
                                                                        <input 
                                                                            type="date" 
                                                                            value={docState.date} 
                                                                            onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'date', e.target.value)} 
                                                                            className="custom-date-picker-input"
                                                                            style={{ paddingLeft: '1.8rem', fontSize: '0.8rem', height: '32px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="colab-doc-date-field">
                                                                    <span className="colab-doc-date-label">Vencimento / Validade</span>
                                                                    <div className="custom-date-picker-wrapper">
                                                                        <Calendar className="custom-date-picker-icon" size={14} style={{ left: '0.6rem' }} />
                                                                        <input 
                                                                            type="date" 
                                                                            value={docState.expiry} 
                                                                            onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'expiry', e.target.value)} 
                                                                            className="custom-date-picker-input"
                                                                            style={{ paddingLeft: '1.8rem', fontSize: '0.8rem', height: '32px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Anexos */}
                                                    <div className="colab-doc-attachments">
                                                        <span className="colab-doc-date-label">Anexos / Arquivos</span>
                                                        
                                                        <div className="colab-doc-attachments-list">
                                                            {docState.attachments?.map((att, idx) => (
                                                                <div key={idx} className="colab-doc-attachment-pill">
                                                                    <Paperclip size={12} color="var(--accent-orange)" />
                                                                    <span 
                                                                        className="colab-doc-attachment-name" 
                                                                        onClick={() => setViewerUrl(att.url)} 
                                                                        title={att.name}
                                                                    >
                                                                        {att.name}
                                                                    </span>
                                                                    <button 
                                                                        type="button" 
                                                                        className="colab-doc-attachment-delete"
                                                                        onClick={() => handleRemoveChecklistAttachment('personal', item.id, idx)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <label className="colab-doc-upload-btn">
                                                            <Plus size={14} /> Anexar Documento
                                                            <input 
                                                                type="file" 
                                                                onChange={(e) => handleChecklistFileUpload(e, 'personal', item.id)} 
                                                                style={{ display: 'none' }} 
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* SECTION: CHECKLIST SAÚDE */}
                                {colabActiveSection === 'checklistSaude' && (
                                    <div className="colab-docs-grid">
                                        {HEALTH_SAFETY_ITEMS.map(item => {
                                            const docState = colabForm.healthSafetyChecklist?.[item.id] || { received: false, mandatory: true, date: '', expiry: '', attachments: [], isIndeterminate: false };
                                            const status = getDocStatus(docState);
                                            return (
                                                <div key={item.id} className={`colab-doc-card ${docState.mandatory ? 'mandatory' : ''}`}>
                                                    {/* Header */}
                                                    <div className="colab-doc-header">
                                                        <h4 className="colab-doc-title">
                                                            {item.label}
                                                            {docState.mandatory && <span style={{ color: 'var(--accent-orange)', marginLeft: '0.2rem' }}>*</span>}
                                                        </h4>
                                                        <span className={`colab-doc-badge ${status.className}`}>
                                                            {status.label === 'Recebido' && <Check size={12} />}
                                                            {status.label === 'Pendente' && <AlertTriangle size={12} />}
                                                            {status.label === 'Expirado' && <AlertTriangle size={12} />}
                                                            {status.label === 'Opcional' && <Shield size={12} />}
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    {/* Controls (Toggles) */}
                                                    <div className="colab-doc-controls">
                                                        <label className="colab-doc-toggle">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.received} 
                                                                onChange={(e) => handleUpdateChecklistValue('health', item.id, 'received', e.target.checked)} 
                                                            />
                                                            Realizado
                                                        </label>
                                                        <label className="colab-doc-toggle">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.mandatory} 
                                                                onChange={(e) => handleUpdateChecklistValue('health', item.id, 'mandatory', e.target.checked)} 
                                                            />
                                                            Obrigatório
                                                        </label>
                                                    </div>

                                                    {/* Seção de Validade (Datas) */}
                                                    <div className="colab-doc-dates">
                                                        <label className="colab-doc-toggle" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={docState.isIndeterminate} 
                                                                onChange={(e) => handleUpdateChecklistValue('health', item.id, 'isIndeterminate', e.target.checked)} 
                                                            />
                                                            Sem validade (Único)
                                                        </label>
                                                        
                                                        {!docState.isIndeterminate && (
                                                            <div className="colab-doc-dates-inputs">
                                                                <div className="colab-doc-date-field">
                                                                    <span className="colab-doc-date-label">Data Realização</span>
                                                                    <div className="custom-date-picker-wrapper">
                                                                        <Calendar className="custom-date-picker-icon" size={14} style={{ left: '0.6rem' }} />
                                                                        <input 
                                                                            type="date" 
                                                                            value={docState.date} 
                                                                            onChange={(e) => handleUpdateChecklistValue('health', item.id, 'date', e.target.value)} 
                                                                            className="custom-date-picker-input"
                                                                            style={{ paddingLeft: '1.8rem', fontSize: '0.8rem', height: '32px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="colab-doc-date-field">
                                                                    <span className="colab-doc-date-label">Data Vencimento</span>
                                                                    <div className="custom-date-picker-wrapper">
                                                                        <Calendar className="custom-date-picker-icon" size={14} style={{ left: '0.6rem' }} />
                                                                        <input 
                                                                            type="date" 
                                                                            value={docState.expiry} 
                                                                            onChange={(e) => handleUpdateChecklistValue('health', item.id, 'expiry', e.target.value)} 
                                                                            className="custom-date-picker-input"
                                                                            style={{ paddingLeft: '1.8rem', fontSize: '0.8rem', height: '32px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Anexos */}
                                                    <div className="colab-doc-attachments">
                                                        <span className="colab-doc-date-label">Anexos / Arquivos</span>
                                                        
                                                        <div className="colab-doc-attachments-list">
                                                            {docState.attachments?.map((att, idx) => (
                                                                <div key={idx} className="colab-doc-attachment-pill">
                                                                    <Paperclip size={12} color="var(--accent-orange)" />
                                                                    <span 
                                                                        className="colab-doc-attachment-name" 
                                                                        onClick={() => setViewerUrl(att.url)} 
                                                                        title={att.name}
                                                                    >
                                                                        {att.name}
                                                                    </span>
                                                                    <button 
                                                                        type="button" 
                                                                        className="colab-doc-attachment-delete"
                                                                        onClick={() => handleRemoveChecklistAttachment('health', item.id, idx)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <label className="colab-doc-upload-btn">
                                                            <Plus size={14} /> Anexar Documento
                                                            <input 
                                                                type="file" 
                                                                onChange={(e) => handleChecklistFileUpload(e, 'health', item.id)} 
                                                                style={{ display: 'none' }} 
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* SECTION: OUTROS DOCS */}
                                {colabActiveSection === 'outrosDocs' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome / Descrição do Documento</label>
                                                <input type="text" value={otherDocName} onChange={(e) => setOtherDocName(e.target.value)} placeholder="Ex: Certificado de Curso de Vendas" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-orange)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', height: '38px' }}>
                                                <Plus size={16} /> Selecionar e Anexar
                                                <input type="file" onChange={handleOtherDocUpload} style={{ display: 'none' }} />
                                            </label>
                                        </div>

                                        {colabForm.otherDocs && colabForm.otherDocs.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                                                {colabForm.otherDocs.map((doc, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                        <FileText size={24} color="var(--accent-orange)" />
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} onClick={() => setViewerUrl(doc.url)} title={doc.name}>{doc.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Anexado em: {doc.date}</div>
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveOtherDoc(idx)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem' }} title="Remover"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                                                Nenhum documento extra anexado.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', flexShrink: 0 }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowColabModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal">SALVAR CADASTRO</button>
                            </div>
                        </form>
                    </div>

                    {/* Viewer Overlay for Attachments */}
                    {viewerUrl && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setViewerUrl(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}><X size={24} /> Fechar</button>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '2rem', overflow: 'hidden' }}>
                                {viewerUrl.startsWith('data:image/') ? (
                                    <img src={viewerUrl} alt="Visualização" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <iframe src={viewerUrl} title="Documento" style={{ width: '90%', height: '90%', background: '#fff', border: 'none', borderRadius: '8px' }} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            , document.body)}

            {/* =============================================
                MODAL 2: CADASTRO/EDIÇÃO PRODUTO
            ============================================= */}
            {showProdModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '650px', width: '90%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <button className="btn-close-modal" onClick={() => setShowProdModal(false)}><X size={18} /></button>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', flexShrink: 0 }}>
                            <h3 id="item-modal-title" style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingProd ? 'Editar Produto' : 'Novo Produto'}
                            </h3>

                            {/* Tab Navigation */}
                            <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color)', marginBottom: '0' }}>
                                {[{ id: 'geral', label: 'Dados Gerais' }, { id: 'receita', label: `Receita (${recipeItems.length})` }].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setProdActiveSection(tab.id)}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            border: 'none',
                                            borderBottom: prodActiveSection === tab.id ? '2px solid var(--accent-orange)' : '2px solid transparent',
                                            marginBottom: '-2px',
                                            background: 'transparent',
                                            color: prodActiveSection === tab.id ? 'var(--accent-orange)' : 'var(--text-secondary)',
                                            fontWeight: prodActiveSection === tab.id ? '700' : '400',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            letterSpacing: '0.03em',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSaveProd} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                            {prodActiveSection === 'geral' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>SKU (Código Único)</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="12"
                                                disabled={!!editingProd} // SKU cannot be changed after creation
                                                placeholder="Ex: INS-001"
                                                value={prodForm.sku} 
                                                onChange={(e) => setProdForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome do Produto</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="35"
                                                value={prodForm.name} 
                                                onChange={(e) => setProdForm(prev => ({ ...prev, name: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Marca / Fabricante</label>
                                            <input 
                                                type="text" 
                                                maxLength="15"
                                                value={prodForm.brand} 
                                                onChange={(e) => setProdForm(prev => ({ ...prev, brand: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Categoria</label>
                                            <select 
                                                value={prodForm.category}
                                                onChange={(e) => setProdForm(prev => ({ ...prev, category: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                {categorias.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Unidade de Medida</label>
                                            <select 
                                                value={prodForm.unit}
                                                onChange={(e) => setProdForm(prev => ({ ...prev, unit: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="UN">UN (Unidade)</option>
                                                <option value="KG">KG (Quilograma)</option>
                                                <option value="G">G (Grama)</option>
                                                <option value="L">L (Litro)</option>
                                                <option value="ML">ML (Mililitro)</option>
                                                <option value="PCT">PCT (Pacote)</option>
                                                <option value="BDJ">BDJ (Bandeja)</option>
                                                <option value="FRD">FRD (Fardo)</option>
                                                <option value="GL">GL (Galão)</option>
                                                <option value="CX">CX (Caixa)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Volume Ocupado (m³/un)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                min="0"
                                                placeholder="Ex: 0.005"
                                                value={prodForm.volumeOcupado || ''} 
                                                onChange={(e) => setProdForm(prev => ({ ...prev, volumeOcupado: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Equivalência de Conteúdo (Estoque vs Consumo) */}
                                    <div style={{ 
                                        background: 'rgba(255, 255, 255, 0.02)', 
                                        border: '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        padding: '1rem', 
                                        marginBottom: '1rem' 
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                            <input 
                                                type="checkbox"
                                                id="chkHasContentEquiv"
                                                checked={!!(prodForm.contentUnit && prodForm.contentUnit !== prodForm.unit)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setProdForm(prev => ({
                                                        ...prev,
                                                        contentUnit: checked ? (prev.unit === 'UN' ? 'ML' : 'G') : '',
                                                        contentQty: checked ? 350 : 1
                                                    }));
                                                }}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-orange)' }}
                                            />
                                            <label htmlFor="chkHasContentEquiv" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span>Embalagem com conteúdo mensurável (Ex: Lata de 350ML)</span>
                                                <div 
                                                    onMouseEnter={() => setShowContentTooltip(true)}
                                                    onMouseLeave={() => setShowContentTooltip(false)}
                                                    style={{ position: 'relative', display: 'inline-flex', cursor: 'help', alignItems: 'center' }}
                                                >
                                                    <Info size={14} style={{ color: 'var(--accent-orange)' }} />
                                                    {showContentTooltip && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '125%',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            width: '320px',
                                                            backgroundColor: '#0f172a',
                                                            color: '#e2e8f0',
                                                            textAlign: 'left',
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid #334155',
                                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 'normal',
                                                            lineHeight: '1.5',
                                                            zIndex: 9999,
                                                            pointerEvents: 'none'
                                                        }}>
                                                            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.4rem', fontSize: '0.82rem' }}>Equivalência de Conteúdo:</strong>
                                                            Ative para insumos comprados em embalagens fechadas (ex: latas, caixas, pacotes) mas consumidos em unidades de volume/peso (ex: ML, Gramas) em suas receitas.<br/><br/>
                                                            <strong>Exemplo:</strong> Coca Lata (estocada em UN) contendo 350 ML. Se uma receita de drink usar 150 ML, o sistema deduzirá automaticamente 0,43 latas do estoque.
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        </div>

                                        {!!(prodForm.contentUnit && prodForm.contentUnit !== prodForm.unit) && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Quantidade de Conteúdo por Embalagem</label>
                                                    <input 
                                                        type="number"
                                                        step="any"
                                                        min="0.01"
                                                        value={prodForm.contentQty || 1}
                                                        onChange={(e) => setProdForm(prev => ({ ...prev, contentQty: parseFloat(e.target.value) || 1 }))}
                                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Unidade do Conteúdo (Consumo/Receita)</label>
                                                    <select
                                                        value={prodForm.contentUnit || 'ML'}
                                                        onChange={(e) => setProdForm(prev => ({ ...prev, contentUnit: e.target.value }))}
                                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.5rem', borderRadius: '7px', outline: 'none', fontSize: '0.82rem', cursor: 'pointer' }}
                                                    >
                                                        <option value="UN">UN (Unidade)</option>
                                                        <option value="KG">KG (Quilograma)</option>
                                                        <option value="G">G (Grama)</option>
                                                        <option value="L">L (Litro)</option>
                                                        <option value="ML">ML (Mililitro)</option>
                                                        <option value="PCT">PCT (Pacote)</option>
                                                        <option value="BDJ">BDJ (Bandeja)</option>
                                                        <option value="FRD">FRD (Fardo)</option>
                                                        <option value="GL">GL (Galão)</option>
                                                        <option value="CX">CX (Caixa)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Códigos de Barras (GTIN/EAN) e Conversão de Entrada */}
                                    <div style={{ 
                                        background: 'rgba(255, 255, 255, 0.02)', 
                                        border: '1px solid var(--border-color)', 
                                        borderRadius: '8px', 
                                        padding: '1rem', 
                                        marginBottom: '1rem' 
                                    }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: '700', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                                            Códigos de Barras (GTIN/EAN) e Conversões
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>GTIN/EAN Unidade</label>
                                                <input 
                                                    type="text" 
                                                    maxLength="14"
                                                    placeholder="Ex: 7891234567890"
                                                    value={prodForm.gtinUnidade || ''} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, gtinUnidade: e.target.value.replace(/\D/g, '') }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>GTIN/EAN Fardo (Pack)</label>
                                                <input 
                                                    type="text" 
                                                    maxLength="14"
                                                    placeholder="Ex: 7891234567891"
                                                    value={prodForm.gtinFardo || ''} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, gtinFardo: e.target.value.replace(/\D/g, '') }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Qtd. de Unidades no Fardo</label>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={prodForm.itensFardo || 1} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, itensFardo: parseFloat(e.target.value) || 1 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>GTIN/EAN Caixa (Box)</label>
                                                <input 
                                                    type="text" 
                                                    maxLength="14"
                                                    placeholder="Ex: 7891234567892"
                                                    value={prodForm.gtinCaixa || ''} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, gtinCaixa: e.target.value.replace(/\D/g, '') }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Qtd. de Unidades na Caixa</label>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={prodForm.itensCaixa || 1} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, itensCaixa: parseFloat(e.target.value) || 1 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>GTIN/EAN Pallet</label>
                                                <input 
                                                    type="text" 
                                                    maxLength="14"
                                                    placeholder="Ex: 7891234567893"
                                                    value={prodForm.gtinPallet || ''} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, gtinPallet: e.target.value.replace(/\D/g, '') }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Qtd. de Unidades no Pallet</label>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={prodForm.itensPallet || 1} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, itensPallet: parseFloat(e.target.value) || 1 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Fornecedor Principal</label>
                                        <select 
                                            value={prodForm.primarySupplierId || ''}
                                            onChange={(e) => setProdForm(prev => ({ ...prev, primarySupplierId: e.target.value }))}
                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="">Sem Fornecedor</option>
                                            {fornecedores.map(f => (
                                                <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '1.2rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Outros Fornecedores Adicionais (Opcional)</label>
                                        <div style={{ 
                                            maxHeight: '120px', 
                                            overflowY: 'auto', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '8px', 
                                            padding: '0.5rem 0.8rem', 
                                            background: 'var(--bg-input)',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '0.4rem'
                                        }}>
                                            {fornecedores
                                                .filter(f => String(f.id) !== String(prodForm.primarySupplierId))
                                                .map(f => {
                                                    const isChecked = (prodForm.otherSupplierIds || []).includes(f.id);
                                                    return (
                                                        <label key={f.id} style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.5rem', 
                                                            fontSize: '0.75rem', 
                                                            color: 'var(--text-primary)', 
                                                            cursor: 'pointer',
                                                            padding: '0.2rem 0.4rem',
                                                            borderRadius: '4px',
                                                            background: isChecked ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                                                        }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setProdForm(prev => {
                                                                        const current = prev.otherSupplierIds || [];
                                                                        if (checked) {
                                                                            return { ...prev, otherSupplierIds: [...current, f.id] };
                                                                        } else {
                                                                            return { ...prev, otherSupplierIds: current.filter(id => id !== f.id) };
                                                                        }
                                                                    });
                                                                }}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.nomeFantasia || f.razaoSocial}>
                                                                {f.nomeFantasia || f.razaoSocial}
                                                            </span>
                                                        </label>
                                                    );
                                                })
                                            }
                                            {fornecedores.filter(f => String(f.id) !== String(prodForm.primarySupplierId)).length === 0 && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.2rem' }}>
                                                    Nenhum outro fornecedor disponível.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section: Stock triggers */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.8rem' }}>
                                            LIMITES ALERTA DE ESTOQUE ({prodForm.unit})
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estoque Mínimo</label>
                                                <input 
                                                    type="number" 
                                                    required 
                                                    value={prodForm.minStock} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, minStock: parseFloat(e.target.value) || 0 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estoque Médio</label>
                                                <input 
                                                    type="number" 
                                                    required 
                                                    value={prodForm.avgStock} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, avgStock: parseFloat(e.target.value) || 0 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estoque Máximo</label>
                                                <input 
                                                    type="number" 
                                                    required 
                                                    value={prodForm.maxStock} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, maxStock: parseFloat(e.target.value) || 0 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                />
                                            </div>
                                            {!editingProd && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estoque Inicial</label>
                                                    <input 
                                                        type="number" 
                                                        required 
                                                        value={prodForm.stock} 
                                                        onChange={(e) => setProdForm(prev => ({ ...prev, stock: parseFloat(e.target.value) || 0 }))}
                                                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Controla produção flag removed - recipes are always editable */}

                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                                            Zonas Permitidas de Armazenamento
                                        </div>
                                        {allZonesList.length === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma zona WMS cadastrada no sistema.</div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem' }}>
                                                {allZonesList.map(zone => {
                                                    const isChecked = prodForm.allowedZones?.includes(zone.id);
                                                    return (
                                                        <label key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setProdForm(prev => {
                                                                        const current = prev.allowedZones || [];
                                                                        const updated = checked 
                                                                            ? [...current, zone.id]
                                                                            : current.filter(id => id !== zone.id);
                                                                        return { ...prev, allowedZones: updated };
                                                                    });
                                                                }}
                                                                style={{ accentColor: 'var(--accent-blue)', width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                            <span><strong>{zone.name}</strong> · <span style={{ color: 'var(--text-secondary)' }}>{zone.acronymDescription || zone.description || ''}</span></span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stacking Options */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Pode ser empilhado?</label>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: !prodForm.podeEmpilhar ? 'var(--accent-orange)' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', fontWeight: '700' }}>
                                                    <input 
                                                        type="radio"
                                                        name="podeEmpilhar"
                                                        checked={!prodForm.podeEmpilhar}
                                                        onChange={() => setProdForm(prev => ({ ...prev, podeEmpilhar: false, maxEmpilhamento: 1 }))}
                                                        style={{ accentColor: 'var(--accent-orange)', cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                    Não
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: prodForm.podeEmpilhar ? 'var(--accent-orange)' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', fontWeight: '700' }}>
                                                    <input 
                                                        type="radio"
                                                        name="podeEmpilhar"
                                                        checked={prodForm.podeEmpilhar}
                                                        onChange={() => setProdForm(prev => ({ ...prev, podeEmpilhar: true }))}
                                                        style={{ accentColor: 'var(--accent-orange)', cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                    Sim
                                                </label>
                                            </div>
                                        </div>
                                        {prodForm.podeEmpilhar && (
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Quantas unidades (empilhamento máx.)?</label>
                                                <input 
                                                    type="number" 
                                                    required 
                                                    min="1"
                                                    value={prodForm.maxEmpilhamento} 
                                                    onChange={(e) => setProdForm(prev => ({ ...prev, maxEmpilhamento: parseInt(e.target.value, 10) || 1 }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* WMS Cell Restrictions */}
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                                            Restrição de Células no WMS
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={limitToSpecificCells}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setLimitToSpecificCells(checked);
                                                        if (!checked) {
                                                            setProdForm(prev => ({ ...prev, allowedCells: [] }));
                                                        }
                                                    }}
                                                    style={{ accentColor: 'var(--accent-blue)', width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <span>Limitar este insumo a células específicas?</span>
                                            </label>
                                            
                                            {limitToSpecificCells && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            loadWmsDataForSelector().then(() => {
                                                                setShowCellSelectorModal(true);
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            background: 'var(--accent-blue)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <Grid3X3 size={14} /> Selecionar Células Permitidas
                                                    </button>
                                                    
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {prodForm.allowedCells?.length > 0 
                                                            ? `${prodForm.allowedCells.length} célula(s) selecionada(s)`
                                                            : 'Nenhuma célula selecionada (insumo não poderá ser guardado!)'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição do Insumo</label>
                                        <textarea 
                                            value={prodForm.desc} 
                                            onChange={(e) => setProdForm(prev => ({ ...prev, desc: e.target.value }))}
                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', height: '80px', resize: 'vertical' }}
                                        />
                                    </div>
                                </>
                            )}

                            {prodActiveSection === 'receita' && (
                                <>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                                        Defina os insumos que compõem <strong style={{ color: 'var(--text-primary)' }}>{prodForm.name || 'este insumo'}</strong>. Selecione apenas insumos cadastrados no estoque.
                                    </p>

                                    {/* Ingredient Adder */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Adicionar Insumo</div>

                                        {/* Ingredient search dropdown */}
                                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Insumo (Estoque)</label>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar insumo pelo nome ou SKU..."
                                                    value={recipeIngredientSearch}
                                                    onChange={e => {
                                                        setRecipeIngredientSearch(e.target.value);
                                                        setRecipeNewItem(prev => ({ ...prev, ingredientSku: '', name: '' }));
                                                    }}
                                                    style={{ width: '100%', paddingLeft: '2rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            {/* Dropdown list of matching products */}
                                            {recipeIngredientSearch.length > 1 && !recipeNewItem.ingredientSku && (() => {
                                                const q = recipeIngredientSearch.toLowerCase();
                                                const matches = produtos.filter(p =>
                                                    p.sku !== prodForm.sku && ( // Prevent self-referencing in recipe
                                                        (p.name && p.name.toLowerCase().includes(q)) ||
                                                        (p.sku && p.sku.toLowerCase().includes(q))
                                                    )
                                                ).slice(0, 8);
                                                if (matches.length === 0) return (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1000, padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum insumo encontrado.
                                                    </div>
                                                );
                                                return (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                        {matches.map(p => (
                                                            <div
                                                                key={p.sku}
                                                                onClick={() => {
                                                                    setRecipeNewItem(prev => ({ ...prev, ingredientSku: p.sku, name: p.name, unit: p.unit || 'G' }));
                                                                    setRecipeIngredientSearch(p.name);
                                                                }}
                                                                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', transition: 'background 0.15s' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{p.name}</span>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.sku} · {p.unit || 'UN'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Quantity + unit + Add button */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                                            <div>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Quantidade</label>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="any"
                                                    placeholder="Ex: 300"
                                                    value={recipeNewItem.quantity}
                                                    onChange={e => setRecipeNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Unidade</label>
                                                <select
                                                    value={recipeNewItem.unit}
                                                    onChange={e => setRecipeNewItem(prev => ({ ...prev, unit: e.target.value }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.5rem', borderRadius: '7px', outline: 'none', fontSize: '0.82rem', cursor: 'pointer' }}
                                                >
                                                    <option value="UN">UN</option>
                                                    <option value="KG">KG</option>
                                                    <option value="G">G</option>
                                                    <option value="L">L</option>
                                                    <option value="ML">ML</option>
                                                    <option value="PCT">PCT</option>
                                                    <option value="BDJ">BDJ</option>
                                                    <option value="FRD">FRD</option>
                                                    <option value="GL">GL</option>
                                                    <option value="CX">CX</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!recipeNewItem.ingredientSku) { showToast('Selecione um insumo da lista.', 'error'); return; }
                                                    if (!recipeNewItem.quantity || parseFloat(recipeNewItem.quantity) <= 0) { showToast('Informe uma quantidade válida.', 'error'); return; }
                                                    if (recipeItems.some(r => r.ingredientSku === recipeNewItem.ingredientSku)) { showToast('Este insumo já foi adicionado.', 'error'); return; }
                                                    setRecipeItems(prev => [...prev, { ...recipeNewItem }]);
                                                    setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
                                                    setRecipeIngredientSearch('');
                                                }}
                                                style={{
                                                    padding: '0.45rem 1rem',
                                                    background: 'var(--accent-orange)',
                                                    border: 'none',
                                                    borderRadius: '7px',
                                                    color: '#fff',
                                                    fontWeight: '700',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <Plus size={14} /> Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recipe Items List */}
                                    {recipeItems.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                                            <Layers size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                                            <div>Nenhum insumo adicionado à receita ainda.</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {recipeItems.map((item, idx) => (
                                                <div key={item.ingredientSku} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    padding: '0.6rem 0.9rem'
                                                }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(243, 107, 29, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-orange)' }}>{idx + 1}</span>
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || item.ingredientSku}</div>
                                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>SKU: {item.ingredientSku}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                        <input
                                                            type="number"
                                                            min="0.001"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, quantity: e.target.value } : r))}
                                                            style={{ width: '70px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.5rem', borderRadius: '6px', outline: 'none', fontSize: '0.82rem', textAlign: 'right' }}
                                                        />
                                                        <select
                                                            value={item.unit}
                                                            onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))}
                                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.4rem', borderRadius: '6px', outline: 'none', fontSize: '0.78rem', cursor: 'pointer' }}
                                                        >
                                                            <option value="UN">UN</option>
                                                            <option value="KG">KG</option>
                                                            <option value="G">G</option>
                                                            <option value="L">L</option>
                                                            <option value="ML">ML</option>
                                                            <option value="PCT">PCT</option>
                                                            <option value="BDJ">BDJ</option>
                                                            <option value="FRD">FRD</option>
                                                            <option value="GL">GL</option>
                                                            <option value="CX">CX</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRecipeItems(prev => prev.filter((_, i) => i !== idx))}
                                                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowProdModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal">SALVAR PRODUTO</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {showCellSelectorModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 11000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '800px', width: '95%' }}>
                        <button type="button" className="btn-close-modal" onClick={() => setShowCellSelectorModal(false)}><X size={18} /></button>
                        
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.3rem', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: '800', margin: 0 }}>
                                Selecionar Células Permitidas
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Selecione as células 2D para limitar a armazenagem deste insumo. As células marcadas em <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>verde</span> serão as únicas permitidas.
                            </p>

                            {/* Dropdowns Filter */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '700' }}>ARMAZÉM</label>
                                    <select 
                                        value={selectorSelectedWarehouseId} 
                                        onChange={(e) => handleSelectorWarehouseChange(Number(e.target.value))}
                                        style={{ width: '100%', padding: '0.4rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    >
                                        {selectorWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '700' }}>ZONA</label>
                                    <select 
                                        value={selectorSelectedZoneId} 
                                        onChange={(e) => handleSelectorZoneChange(Number(e.target.value))}
                                        style={{ width: '100%', padding: '0.4rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    >
                                        {selectorZones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.type})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Aisle & Row Filters */}
                            {selectorSelectedZoneId && selectorLocations.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Corredor (Rua):</span>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {[...new Set(selectorLocations.map(l => l.aisle))].sort((a,b) => {
                                                const numA = parseInt(a, 10);
                                                const numB = parseInt(b, 10);
                                                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                                return a.localeCompare(b);
                                            }).map(aisle => (
                                                <button
                                                    key={aisle}
                                                    type="button"
                                                    onClick={() => setSelectorSelectedAisle(aisle)}
                                                    style={{
                                                        padding: '0.3rem 0.8rem',
                                                        borderRadius: '6px',
                                                        border: selectorSelectedAisle === aisle ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                        background: selectorSelectedAisle === aisle ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                        color: selectorSelectedAisle === aisle ? 'white' : 'var(--text-secondary)',
                                                        fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                                                    }}
                                                >
                                                    Rua {aisle}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fileira (Lado):</span>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            {['A', 'B'].map(row => (
                                                <button
                                                    key={row}
                                                    type="button"
                                                    onClick={() => setSelectorSelectedRow(row)}
                                                    style={{
                                                        padding: '0.3rem 1rem',
                                                        borderRadius: '6px',
                                                        border: selectorSelectedRow === row ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                        background: selectorSelectedRow === row ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                        color: selectorSelectedRow === row ? 'white' : 'var(--text-secondary)',
                                                        fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                                                    }}
                                                >
                                                    {row === 'A' ? 'Fileira A (Esquerdo)' : 'Fileira B (Direito)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2D Matrix Rendering */}
                            <div style={{ flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
                                {selectorLocations.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        Nenhuma célula cadastrada nesta zona.
                                    </div>
                                ) : !selectorSelectedAisle ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        Selecione um corredor (rua) para visualizar o mapa 2D.
                                    </div>
                                ) : (() => {
                                    const filtered = selectorLocations.filter(l => l.aisle === selectorSelectedAisle && l.row === selectorSelectedRow);
                                    if (filtered.length === 0) {
                                        return (
                                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                                                Nenhum endereço encontrado para Rua {selectorSelectedAisle} / Fileira {selectorSelectedRow}.
                                            </div>
                                        );
                                    }

                                    const parseShelf = (shelfCode) => {
                                        const match = String(shelfCode).match(/^(\d+)([A-Z]?)$/);
                                        if (match) return { num: parseInt(match[1], 10), height: match[2] || '' };
                                        return { num: NaN, height: '' };
                                    };

                                    const shelfNums = [...new Set(filtered.map(l => parseShelf(l.shelf).num))]
                                        .filter(n => !isNaN(n))
                                        .sort((a, b) => a - b);

                                    const heightLetters = [...new Set(filtered.map(l => parseShelf(l.shelf).height))]
                                        .filter(h => h !== '')
                                        .sort((a, b) => b.localeCompare(a));

                                    const hasHeights = heightLetters.length > 0;

                                    return (
                                        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {/* Y axis */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ height: '28px' }} />
                                                    {(hasHeights ? heightLetters : ['—']).map(h => (
                                                        <div key={h} style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-blue)', minWidth: '40px' }}>
                                                            Alt. {h}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Grid */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {/* X axis (Shelves) */}
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {shelfNums.map(num => (
                                                            <div key={num} style={{ flex: 1, height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)', borderRadius: '4px', minWidth: '70px' }}>
                                                                Prat. {num}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Grid Rows */}
                                                    {(hasHeights ? heightLetters : ['']).map(h => (
                                                        <div key={h} style={{ display: 'flex', gap: '4px' }}>
                                                            {shelfNums.map(num => {
                                                                const shelfCode = hasHeights ? `${num}${h}` : String(num);
                                                                
                                                                // Check if this shelf code exists in filtered locations
                                                                const cellLocs = filtered
                                                                    .filter(l => l.shelf === shelfCode)
                                                                    .sort((a,b) => (a.position||'').localeCompare(b.position||''));
                                                                
                                                                if (cellLocs.length === 0) {
                                                                    return (
                                                                        <div key={num} style={{ flex: 1, minWidth: '70px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.05)' }}>—</span>
                                                                        </div>
                                                                    );
                                                                }

                                                                const cellKey = `${selectorSelectedZoneId}_${selectorSelectedAisle}_${selectorSelectedRow}_${shelfCode}`;
                                                                const isSelected = prodForm.allowedCells?.includes(cellKey);
                                                                
                                                                const allAtivo = cellLocs.every(l => l.status === 'Ativo');
                                                                const allBloq  = cellLocs.every(l => l.status === 'Bloqueado');
                                                                
                                                                const outerBorder = isSelected 
                                                                    ? 'var(--accent-green)' 
                                                                    : allAtivo  ? 'rgba(34,197,94,0.45)'
                                                                    : allBloq   ? 'rgba(239,68,68,0.45)'
                                                                    : 'rgba(251,191,36,0.45)';
                                                                
                                                                const outerBg = isSelected 
                                                                    ? 'rgba(34, 197, 94, 0.08)' 
                                                                    : 'rgba(0,0,0,0.18)';

                                                                return (
                                                                    <div
                                                                        key={num}
                                                                        onClick={() => {
                                                                            setProdForm(prev => {
                                                                                const current = prev.allowedCells || [];
                                                                                const updated = isSelected
                                                                                    ? current.filter(key => key !== cellKey)
                                                                                    : [...current, cellKey];
                                                                                return { ...prev, allowedCells: updated };
                                                                            });
                                                                        }}
                                                                        style={{
                                                                            flex: 1, minWidth: '70px', height: '64px',
                                                                            display: 'flex', flexDirection: 'column',
                                                                            borderRadius: '6px', overflow: 'hidden',
                                                                            border: isSelected ? '2px solid var(--accent-green)' : `1px solid ${outerBorder}`,
                                                                            background: outerBg,
                                                                            boxShadow: isSelected ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none',
                                                                            transition: 'border-color 0.15s, box-shadow 0.15s',
                                                                            boxSizing: 'border-box',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        onMouseEnter={e => {
                                                                            if (!isSelected) {
                                                                                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                                                                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.3)';
                                                                            }
                                                                        }}
                                                                        onMouseLeave={e => {
                                                                            e.currentTarget.style.borderColor = isSelected ? 'var(--accent-green)' : `1px solid ${outerBorder}`;
                                                                            e.currentTarget.style.boxShadow = isSelected ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none';
                                                                        }}
                                                                        title={`Célula ${shelfCode} · Clique para marcar/desmarcar`}
                                                                    >
                                                                        {/* ── TOP: position strips ── */}
                                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: '44px' }}>
                                                                            {cellLocs.map((loc, idx) => {
                                                                                const isAtivo = loc.status === 'Ativo';
                                                                                const stripColor = isAtivo ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                                                                                const stripBorder = isAtivo ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
                                                                                const textClr = isAtivo ? 'var(--accent-green)' : 'var(--accent-red)';
                                                                                return (
                                                                                    <div
                                                                                        key={loc.id}
                                                                                        style={{
                                                                                            flex: 1, height: '100%',
                                                                                            display: 'flex', flexDirection: 'column',
                                                                                            alignItems: 'center', justifyContent: 'center',
                                                                                            background: stripColor,
                                                                                            borderLeft: idx > 0 ? `1px solid ${stripBorder}` : 'none',
                                                                                            transition: 'background 0.12s',
                                                                                        }}
                                                                                    >
                                                                                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: textClr, lineHeight: 1 }}>{loc.position || '1'}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* ── BOTTOM: fixed shelfCode label ── */}
                                                                        <div
                                                                            style={{
                                                                                flexShrink: 0,
                                                                                height: '20px',
                                                                                width: '100%',
                                                                                background: isSelected ? 'var(--accent-green)' : 'rgba(15,23,42,0.75)',
                                                                                borderTop: isSelected ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(59,130,246,0.25)',
                                                                                color: isSelected ? 'white' : 'rgba(147,197,253,0.85)',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                                                fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.09em', textTransform: 'uppercase',
                                                                                boxSizing: 'border-box'
                                                                            }}
                                                                        >
                                                                            {isSelected && <Check size={8} strokeWidth={3} />}
                                                                            {shelfCode}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Modal actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button type="button" className="btn-confirm-modal" onClick={() => setShowCellSelectorModal(false)}>CONFIRMAR SELEÇÃO</button>
                            </div>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL 3: CADASTRO/EDIÇÃO CATEGORIA
            ============================================= */}
            {showCatModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%' }}>
                        <button className="btn-close-modal" onClick={() => setShowCatModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveCat} style={{ padding: '1.5rem' }}>
                            <h3 id="category-modal-title" style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingCat ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome da Categoria</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength="20"
                                    placeholder="Ex: PROTEÍNAS"
                                    value={catForm.name} 
                                    onChange={(e) => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição</label>
                                <input 
                                    type="text" 
                                    value={catForm.desc} 
                                    onChange={(e) => setCatForm(prev => ({ ...prev, desc: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Tema (Cor Visual)</label>
                                <select 
                                    value={catForm.color}
                                    onChange={(e) => setCatForm(prev => ({ ...prev, color: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="color-blue">Azul Glacial</option>
                                    <option value="color-red">Vermelho Alerta</option>
                                    <option value="color-green">Verde Higiene</option>
                                    <option value="color-teal">Turquesa Delivery</option>
                                    <option value="color-yellow">Amarelo Produção</option>
                                    <option value="color-orange">Laranja Corellux</option>
                                    <option value="color-purple">Roxo Admin</option>
                                    <option value="color-pink">Rosa Sobremesas</option>
                                    <option value="color-indigo">Índigo Limpeza</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowCatModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal">SALVAR CATEGORIA</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: CADASTRO/EDIÇÃO PRODUTO FINAL
            ============================================= */}
            {showSaleProdModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <button className="btn-close-modal" onClick={() => setShowSaleProdModal(false)}><X size={18} /></button>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', flexShrink: 0 }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-pink)', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingSaleProd ? 'Editar Produto Final' : 'Novo Produto Final'}
                            </h3>

                            {/* Tab Navigation */}
                            <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color)', marginBottom: '0' }}>
                                {[{ id: 'geral', label: 'Dados Gerais' }, { id: 'receita', label: `Receita (${recipeItems.length})` }].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSaleProdActiveSection(tab.id)}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            border: 'none',
                                            borderBottom: saleProdActiveSection === tab.id ? '2px solid var(--accent-pink)' : '2px solid transparent',
                                            marginBottom: '-2px',
                                            background: 'transparent',
                                            color: saleProdActiveSection === tab.id ? 'var(--accent-pink)' : 'var(--text-secondary)',
                                            fontWeight: saleProdActiveSection === tab.id ? '700' : '400',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            letterSpacing: '0.03em',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Body — scrollable */}
                        <form onSubmit={handleSaveSaleProd} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

                            {/* ========== TAB: DADOS GERAIS ========== */}
                            {saleProdActiveSection === 'geral' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Código</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="15"
                                                disabled={!!editingSaleProd}
                                                placeholder="Ex: PIZ001"
                                                value={saleProdForm.code} 
                                                onChange={(e) => setSaleProdForm(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome do Produto</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="100"
                                                placeholder="Ex: Pizza Calabresa G"
                                                value={saleProdForm.name} 
                                                onChange={(e) => setSaleProdForm(prev => ({ ...prev, name: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Categoria</label>
                                            <select 
                                                required
                                                value={saleProdForm.category}
                                                onChange={(e) => setSaleProdForm(prev => ({ ...prev, category: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="PIZZAS">PIZZAS</option>
                                                <option value="BEBIDAS">BEBIDAS</option>
                                                <option value="SOBREMESAS">SOBREMESAS</option>
                                                <option value="LANCHES">LANCHES</option>
                                                <option value="OUTROS">OUTROS</option>
                                                {categorias.filter(c => !['PIZZAS', 'BEBIDAS', 'SOBREMESAS', 'LANCHES', 'OUTROS'].includes(c.name.toUpperCase())).map(c => (
                                                    <option key={c.id} value={c.name.toUpperCase()}>{c.name.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Unidade</label>
                                            <select 
                                                required
                                                value={saleProdForm.unit}
                                                onChange={(e) => setSaleProdForm(prev => ({ ...prev, unit: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="UN">UN (Unidade)</option>
                                                <option value="KG">KG (Quilograma)</option>
                                                <option value="G">G (Grama)</option>
                                                <option value="L">L (Litro)</option>
                                                <option value="ML">ML (Mililitro)</option>
                                                <option value="PCT">PCT (Pacote)</option>
                                                <option value="BDJ">BDJ (Bandeja)</option>
                                                <option value="FRD">FRD (Fardo)</option>
                                                <option value="GL">GL (Galão)</option>
                                                <option value="CX">CX (Caixa)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Preço de Venda (R$)</label>
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="Ex: 49,90"
                                                value={saleProdForm.price} 
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    val = val.replace(/[^\d.,R$\s]/g, '');
                                                    setSaleProdForm(prev => ({ ...prev, price: val }));
                                                }}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Status</label>
                                            <select 
                                                required
                                                value={saleProdForm.status}
                                                onChange={(e) => setSaleProdForm(prev => ({ ...prev, status: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="Ativo">Ativo</option>
                                                <option value="Inativo">Inativo</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1.2rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição</label>
                                        <textarea 
                                            rows="3"
                                            placeholder="Descrição detalhada do produto final..."
                                            value={saleProdForm.description} 
                                            onChange={(e) => setSaleProdForm(prev => ({ ...prev, description: e.target.value }))}
                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    {/* Controla Produção toggle removed - recipes are always editable */}
                                </>
                            )}

                            {/* ========== TAB: RECEITA ========== */}
                            {saleProdActiveSection === 'receita' && (
                                <>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                                        Defina os insumos que compõem <strong style={{ color: 'var(--text-primary)' }}>{saleProdForm.name || 'este produto'}</strong>. Selecione apenas insumos cadastrados no estoque.
                                    </p>

                                    {/* Ingredient Adder */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Adicionar Insumo</div>

                                        {/* Ingredient search dropdown */}
                                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Insumo (Estoque)</label>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar insumo pelo nome ou SKU..."
                                                    value={recipeIngredientSearch}
                                                    onChange={e => {
                                                        setRecipeIngredientSearch(e.target.value);
                                                        setRecipeNewItem(prev => ({ ...prev, ingredientSku: '', name: '' }));
                                                    }}
                                                    style={{ width: '100%', paddingLeft: '2rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            {/* Dropdown list of matching products */}
                                            {recipeIngredientSearch.length > 1 && !recipeNewItem.ingredientSku && (() => {
                                                const q = recipeIngredientSearch.toLowerCase();
                                                const matches = produtos.filter(p =>
                                                    (p.name && p.name.toLowerCase().includes(q)) ||
                                                    (p.sku && p.sku.toLowerCase().includes(q))
                                                ).slice(0, 8);
                                                if (matches.length === 0) return (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1000, padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        Nenhum insumo encontrado.
                                                    </div>
                                                );
                                                return (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                        {matches.map(p => (
                                                            <div
                                                                key={p.sku}
                                                                onClick={() => {
                                                                    setRecipeNewItem(prev => ({ ...prev, ingredientSku: p.sku, name: p.name, unit: p.unit || 'G' }));
                                                                    setRecipeIngredientSearch(p.name);
                                                                }}
                                                                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', transition: 'background 0.15s' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{p.name}</span>
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{p.sku} · {p.unit || 'UN'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Quantity + unit + Add button */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                                            <div>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Quantidade</label>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="any"
                                                    placeholder="Ex: 300"
                                                    value={recipeNewItem.quantity}
                                                    onChange={e => setRecipeNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '7px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Unidade</label>
                                                <select
                                                    value={recipeNewItem.unit}
                                                    onChange={e => setRecipeNewItem(prev => ({ ...prev, unit: e.target.value }))}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.5rem', borderRadius: '7px', outline: 'none', fontSize: '0.82rem', cursor: 'pointer' }}
                                                >
                                                    <option value="UN">UN</option>
                                                    <option value="KG">KG</option>
                                                    <option value="G">G</option>
                                                    <option value="L">L</option>
                                                    <option value="ML">ML</option>
                                                    <option value="PCT">PCT</option>
                                                    <option value="BDJ">BDJ</option>
                                                    <option value="FRD">FRD</option>
                                                    <option value="GL">GL</option>
                                                    <option value="CX">CX</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!recipeNewItem.ingredientSku) { showToast('Selecione um insumo da lista.', 'error'); return; }
                                                    if (!recipeNewItem.quantity || parseFloat(recipeNewItem.quantity) <= 0) { showToast('Informe uma quantidade válida.', 'error'); return; }
                                                    if (recipeItems.some(r => r.ingredientSku === recipeNewItem.ingredientSku)) { showToast('Este insumo já foi adicionado.', 'error'); return; }
                                                    setRecipeItems(prev => [...prev, { ...recipeNewItem }]);
                                                    setRecipeNewItem({ ingredientSku: '', quantity: '', unit: 'G' });
                                                    setRecipeIngredientSearch('');
                                                }}
                                                style={{
                                                    padding: '0.45rem 1rem',
                                                    background: 'var(--accent-pink)',
                                                    border: 'none',
                                                    borderRadius: '7px',
                                                    color: '#fff',
                                                    fontWeight: '700',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <Plus size={14} /> Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recipe Items List */}
                                    {recipeItems.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                                            <Layers size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                                            <div>Nenhum insumo adicionado à receita ainda.</div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {recipeItems.map((item, idx) => (
                                                <div key={item.ingredientSku} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    padding: '0.6rem 0.9rem'
                                                }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-pink)' }}>{idx + 1}</span>
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || item.ingredientSku}</div>
                                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>SKU: {item.ingredientSku}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                        <input
                                                            type="number"
                                                            min="0.001"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, quantity: e.target.value } : r))}
                                                            style={{ width: '70px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.5rem', borderRadius: '6px', outline: 'none', fontSize: '0.82rem', textAlign: 'right' }}
                                                        />
                                                        <select
                                                            value={item.unit}
                                                            onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))}
                                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.4rem', borderRadius: '6px', outline: 'none', fontSize: '0.78rem', cursor: 'pointer' }}
                                                        >
                                                            <option value="UN">UN</option>
                                                            <option value="KG">KG</option>
                                                            <option value="G">G</option>
                                                            <option value="L">L</option>
                                                            <option value="ML">ML</option>
                                                            <option value="PCT">PCT</option>
                                                            <option value="BDJ">BDJ</option>
                                                            <option value="FRD">FRD</option>
                                                            <option value="GL">GL</option>
                                                            <option value="CX">CX</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRecipeItems(prev => prev.filter((_, i) => i !== idx))}
                                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--accent-red)', cursor: 'pointer', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Footer Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowSaleProdModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal" style={{ backgroundColor: 'var(--accent-pink)', borderColor: 'var(--accent-pink)', color: '#ffffff' }}>
                                    SALVAR PRODUTO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* MODAL: CONFIRMAR EXCLUSÃO DE PRODUTO FINAL */}
            {saleProdToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Produto Final?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o produto <strong style={{ color: 'var(--text-primary)' }}>{saleProdToDelete.name} ({saleProdToDelete.code})</strong>?<br/>
                            Esta ação removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setSaleProdToDelete(null)}
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
                                onClick={confirmDeleteSaleProd}
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
                MODAL 4: CADASTRO/EDIÇÃO FORNECEDOR (COMPLEX MODAL)
            ============================================= */}
            {showFornModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', margin: 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                        <button className="btn-close-modal" onClick={() => setShowFornModal(false)} style={{ zIndex: 10001 }}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveForn} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1, boxSizing: 'border-box' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: '800', flexShrink: 0 }}>
                                {editingForn ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h3>

                            {/* Supplier Menu Layout */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.8rem', paddingBottom: '0.5rem', flexShrink: 0 }}>
                                {[
                                    { id: 'geral', label: 'Dados Gerais' },
                                    { id: 'contatos', label: 'Contatos' },
                                    { id: 'endereco', label: 'Endereço' },
                                    { id: 'financeiro', label: 'Financeiro' },
                                    { id: 'logistica', label: 'Logística' },
                                    { id: 'ratings', label: 'Avaliações' },
                                    { id: 'fomento', label: 'Categorias/Insumos' },
                                    { id: 'notes', label: 'Observações' }
                                ].map((sec) => (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => setFornActiveSection(sec.id)}
                                        style={{
                                            padding: '0.6rem 0',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: fornActiveSection === sec.id ? '2px solid var(--accent-orange)' : '2px solid transparent',
                                            color: fornActiveSection === sec.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {sec.label}
                                    </button>
                                ))}
                            </div>

                            <div className="modal-scrollable-content" style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                                {/* SECTION CONTENT: GERAL */}
                                {fornActiveSection === 'geral' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Razão Social</label>
                                            <input 
                                                type="text" required
                                                value={fornForm.razaoSocial} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, razaoSocial: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome Fantasia</label>
                                            <input 
                                                type="text" required
                                                value={fornForm.nomeFantasia} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CNPJ</label>
                                            <input 
                                                type="text" placeholder="00.000.000/0000-00" required
                                                value={fornForm.cnpj} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Inscrição Estadual (I.E)</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.ie} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, ie: maskIE(e.target.value, prev.endereco?.estado) }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Tipo Fornecedor</label>
                                            <select 
                                                value={fornForm.tipoFornecedor} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, tipoFornecedor: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="Distribuidor">Distribuidor</option>
                                                <option value="Produtor Local">Produtor Local</option>
                                                <option value="Atacadista">Atacadista</option>
                                                <option value="Indústria">Indústria</option>
                                                <option value="Comércio">Comércio</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: CONTATOS */}
                            {fornActiveSection === 'contatos' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {fornForm.contatos && fornForm.contatos.map((cont, index) => (
                                        <div key={index} style={{ 
                                            background: 'rgba(255, 255, 255, 0.02)', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '8px', 
                                            padding: '1.2rem', 
                                            position: 'relative' 
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Contato #{index + 1}</span>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: cont.isPrimary ? 'var(--accent-orange)' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', fontWeight: '700' }}>
                                                        <input 
                                                            type="radio"
                                                            name="primary_contact_group"
                                                            checked={!!cont.isPrimary}
                                                            onChange={() => {
                                                                setFornForm(prev => {
                                                                    const list = prev.contatos.map((c, i) => ({
                                                                        ...c,
                                                                        isPrimary: i === index
                                                                    }));
                                                                    return { ...prev, contatos: list };
                                                                });
                                                            }}
                                                            style={{ accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
                                                        />
                                                        Contato Principal
                                                    </label>
                                                </div>
                                                {fornForm.contatos.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGenericConfirm({
                                                                title: 'Remover Contato?',
                                                                message: `Tem certeza de que deseja remover o Contato #${index + 1} (${cont.nome || 'Sem nome'})?`,
                                                                confirmText: 'REMOVER',
                                                                cancelText: 'CANCELAR',
                                                                isDanger: true,
                                                                onConfirm: () => {
                                                                    setFornForm(prev => {
                                                                        const list = [...prev.contatos];
                                                                        const [removed] = list.splice(index, 1);
                                                                        if (removed.isPrimary && list.length > 0) {
                                                                            list[0].isPrimary = true;
                                                                        }
                                                                        return { ...prev, contatos: list };
                                                                    });
                                                                }
                                                            });
                                                        }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.08)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            color: '#ef4444',
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.background = 'rgba(239, 68, 68, 0.16)';
                                                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.background = 'rgba(239, 68, 68, 0.08)';
                                                            e.target.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                                        }}
                                                    >
                                                        <Trash2 size={13} /> Remover Contato
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome / Responsável</label>
                                                        <input 
                                                            type="text" required
                                                            value={cont.nome} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFornForm(prev => {
                                                                    const list = [...prev.contatos];
                                                                    list[index] = { ...list[index], nome: val };
                                                                    return { ...prev, contatos: list };
                                                                });
                                                            }}
                                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Setor / Cargo</label>
                                                        <input 
                                                            type="text" placeholder="Ex: Comercial, Financeiro, Vendas..."
                                                            value={cont.setor} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFornForm(prev => {
                                                                    const list = [...prev.contatos];
                                                                    list[index] = { ...list[index], setor: val };
                                                                    return { ...prev, contatos: list };
                                                                });
                                                            }}
                                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>E-mail</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input 
                                                                type="email"
                                                                value={cont.email} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFornForm(prev => {
                                                                        const list = [...prev.contatos];
                                                                        list[index] = { ...list[index], email: val };
                                                                        return { ...prev, contatos: list };
                                                                    });
                                                                }}
                                                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', width: '100%' }}
                                                            />
                                                            {(cont.email || '').trim().length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        window.open(`mailto:${cont.email.trim()}`, '_blank');
                                                                    }}
                                                                    title="Enviar E-mail"
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '38px',
                                                                        height: '38px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        background: '#EA4335',
                                                                        color: '#fff',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        flexShrink: 0
                                                                    }}
                                                                    onMouseOver={(e) => {
                                                                        e.currentTarget.style.background = '#d93025';
                                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                                    }}
                                                                    onMouseOut={(e) => {
                                                                        e.currentTarget.style.background = '#EA4335';
                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                    }}
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                                        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Telefone Comercial</label>
                                                        <input 
                                                            type="text" placeholder="(00) 0000-0000"
                                                            value={cont.telefoneComercial} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFornForm(prev => {
                                                                    const list = [...prev.contatos];
                                                                    list[index] = { ...list[index], telefoneComercial: val };
                                                                    return { ...prev, contatos: list };
                                                                });
                                                            }}
                                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>WhatsApp</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input 
                                                                type="text" placeholder="(00) 00000-0000"
                                                                value={cont.whatsapp} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFornForm(prev => {
                                                                        const list = [...prev.contatos];
                                                                        list[index] = { ...list[index], whatsapp: val };
                                                                        return { ...prev, contatos: list };
                                                                    });
                                                                }}
                                                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', width: '100%' }}
                                                            />
                                                            {(cont.whatsapp || '').replace(/\D/g, '').length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        let clean = (cont.whatsapp || '').replace(/\D/g, '');
                                                                        if (clean.length === 10 || clean.length === 11) {
                                                                            clean = '55' + clean;
                                                                        }
                                                                        window.open(`https://wa.me/${clean}`, '_blank');
                                                                    }}
                                                                    title="Abrir WhatsApp"
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '38px',
                                                                        height: '38px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        background: '#25D366',
                                                                        color: '#fff',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        flexShrink: 0
                                                                    }}
                                                                    onMouseOver={(e) => {
                                                                        e.currentTarget.style.background = '#20ba56';
                                                                        e.currentTarget.style.transform = 'scale(1.05)';
                                                                    }}
                                                                    onMouseOut={(e) => {
                                                                        e.currentTarget.style.background = '#25D366';
                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                    }}
                                                                >
                                                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.977 14.113 1.96 11.517 1.96c-5.44 0-9.866 4.372-9.87 9.802 0 1.964.517 3.598 1.502 5.093l-1.015 3.702 3.833-.983zm12.305-6.095c-.328-.163-1.94-.949-2.24-1.058-.3-.109-.519-.163-.737.163-.219.327-.848 1.058-1.038 1.277-.19.218-.38.245-.708.082-.328-.163-1.383-.504-2.63-1.602-.971-.856-1.627-1.914-1.817-2.241-.19-.327-.02-.504.144-.666.148-.146.328-.382.492-.573.164-.19.219-.327.328-.545.11-.218.055-.408-.027-.573-.082-.164-.737-1.748-1.01-2.403-.266-.632-.537-.547-.737-.557l-.629-.01c-.218 0-.573.082-.873.408-.3.327-1.147 1.107-1.147 2.698 0 1.59 1.173 3.125 1.336 3.342.164.218 2.308 3.486 5.592 4.887.781.332 1.39.53 1.868.68.784.246 1.498.211 2.062.128.629-.092 1.94-.784 2.212-1.543.273-.76.273-1.41.19-1.543-.082-.132-.3-.218-.627-.382z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Site</label>
                                                        <input 
                                                            type="text" placeholder="www.exemplo.com.br"
                                                            value={cont.site} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFornForm(prev => {
                                                                    const list = [...prev.contatos];
                                                                    list[index] = { ...list[index], site: val };
                                                                    return { ...prev, contatos: list };
                                                                });
                                                            }}
                                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Observação</label>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <input 
                                                                type="text" placeholder="Ex: Contato preferencial por e-mail..."
                                                                value={cont.observacao} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFornForm(prev => {
                                                                        const list = [...prev.contatos];
                                                                        list[index] = { ...list[index], observacao: val };
                                                                        return { ...prev, contatos: list };
                                                                    });
                                                                }}
                                                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                            />
                                                            {editingForn && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveContactObservation(index)}
                                                                    style={{
                                                                        background: 'var(--accent-orange)',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '8px',
                                                                        padding: '0.5rem 1rem',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '600',
                                                                        fontSize: '0.8rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.4rem',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    <Check size={14} /> Salvar Obs
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {cont.observacaoSalva && (
                                                    <div style={{ 
                                                        marginTop: '0.8rem', 
                                                        padding: '0.6rem 1rem', 
                                                        background: 'rgba(235, 94, 40, 0.05)', 
                                                        borderLeft: '4px solid var(--accent-orange)', 
                                                        borderRadius: '4px', 
                                                        fontSize: '0.85rem', 
                                                        color: 'var(--text-primary)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.2rem'
                                                    }}>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Observação Salva</span>
                                                        <span>{cont.observacaoSalva}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFornForm(prev => {
                                                const list = [...(prev.contatos || [])];
                                                const isFirst = list.length === 0;
                                                list.push({ 
                                                    nome: '', 
                                                    setor: '', 
                                                    email: '', 
                                                    telefoneComercial: '', 
                                                    whatsapp: '', 
                                                    site: '', 
                                                    observacao: '',
                                                    isPrimary: isFirst
                                                });
                                                return { ...prev, contatos: list };
                                            });
                                        }}
                                        style={{
                                            padding: '0.8rem',
                                            background: 'transparent',
                                            border: '2px dashed var(--border-color)',
                                            color: 'var(--accent-orange)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            transition: 'all 0.2s',
                                            marginTop: '0.5rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(235, 94, 40, 0.05)';
                                            e.target.style.borderColor = 'var(--accent-orange)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'transparent';
                                            e.target.style.borderColor = 'var(--border-color)';
                                        }}
                                    >
                                        + Adicionar Novo Contato
                                    </button>
                                </div>
                            )}

                            {/* SECTION CONTENT: ENDERECO */}
                            {fornActiveSection === 'endereco' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CEP</label>
                                            <input 
                                                type="text" placeholder="00000-000"
                                                value={fornForm.endereco.cep} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, cep: maskCEP(e.target.value) } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Rua</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.endereco.rua} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, rua: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Número</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.endereco.numero} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, numero: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Bairro</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.endereco.bairro} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, bairro: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Cidade</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.endereco.cidade} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, cidade: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Estado (UF)</label>
                                            <input 
                                                type="text" maxLength="2" placeholder="UF"
                                                value={fornForm.endereco.estado} 
                                                onChange={(e) => {
                                                    const nextEstado = e.target.value.toUpperCase();
                                                    setFornForm(prev => ({
                                                        ...prev,
                                                        endereco: { ...prev.endereco, estado: nextEstado },
                                                        ie: maskIE(prev.ie, nextEstado)
                                                    }));
                                                }}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: FINANCEIRO */}
                            {fornActiveSection === 'financeiro' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Forma de Pagamento</label>
                                            <input 
                                                type="text" placeholder="Boleto, Pix, Cartão"
                                                value={fornForm.financeiro.formaPagamento} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, formaPagamento: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Prazo Faturamento</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    placeholder="Ex: 30"
                                                    required
                                                    value={fornForm.financeiro.prazoPagamento ? String(fornForm.financeiro.prazoPagamento).replace(/\D/g, '') : ''} 
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFornForm(prev => ({ 
                                                            ...prev, 
                                                            financeiro: { 
                                                                ...prev.financeiro, 
                                                                prazoPagamento: val 
                                                            } 
                                                        }));
                                                    }}
                                                    style={{ width: '100px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem' }}>DIAS</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Limite de Crédito (R$)</label>
                                            <input 
                                                type="text" 
                                                value={formatCurrencyValue(fornForm.financeiro.limiteCredito)} 
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (!val) {
                                                        setFornForm(prev => ({ 
                                                            ...prev, 
                                                            financeiro: { ...prev.financeiro, limiteCredito: 0 } 
                                                        }));
                                                        return;
                                                    }
                                                    const floatVal = parseFloat(val) / 100;
                                                    setFornForm(prev => ({ 
                                                        ...prev, 
                                                        financeiro: { ...prev.financeiro, limiteCredito: floatVal } 
                                                    }));
                                                }}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Banco</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.financeiro.banco} 
                                                onChange={(e) => {
                                                    setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, banco: e.target.value } }));
                                                    setShowBancoDropdown(true);
                                                }}
                                                onFocus={() => setShowBancoDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowBancoDropdown(false), 200)}
                                                onKeyDown={handleBancoKeyDown}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                placeholder="Busque ou digite o banco..."
                                            />
                                            {showBancoDropdown && (
                                                (() => {
                                                    const filtered = bankList.filter(b => 
                                                        b.toLowerCase().includes((fornForm.financeiro.banco || '').toLowerCase())
                                                    );
                                                    return (
                                                        <div className="bank-dropdown-container">
                                                            {filtered.length > 0 ? (
                                                                filtered.map((bank, idx) => (
                                                                    <div 
                                                                        key={idx} 
                                                                        className="bank-dropdown-item"
                                                                        onMouseDown={() => handleSelectBank(bank)}
                                                                    >
                                                                        {bank}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                                    Pressione [Enter] para cadastrar: "{(fornForm.financeiro.banco || '').trim()}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Chave PIX</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.financeiro.pix} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, pix: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: LOGISTICA */}
                            {fornActiveSection === 'logistica' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Prazo de Entrega</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    placeholder="Ex: 2"
                                                    required
                                                    value={fornForm.logistica.prazoEntrega ? String(fornForm.logistica.prazoEntrega).replace(/\D/g, '') : ''} 
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFornForm(prev => ({ 
                                                            ...prev, 
                                                            logistica: { 
                                                                ...prev.logistica, 
                                                                prazoEntrega: val 
                                                            } 
                                                        }));
                                                    }}
                                                    style={{ width: '100px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem' }}>DIAS</span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', marginTop: '0.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Info size={11} style={{ flexShrink: 0 }} />
                                                <span>Define o Lead Time de abastecimento usado no Supply Chain</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Dias de Entrega</label>
                                            <input 
                                                type="text" placeholder="Ex: Seg, Qua, Sex"
                                                value={fornForm.logistica.diasEntrega} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, logistica: { ...prev.logistica, diasEntrega: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Pedido Mínimo (R$)</label>
                                            <input 
                                                type="text" 
                                                value={formatCurrencyValue(fornForm.logistica.pedidoMinimo)} 
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (!val) {
                                                        setFornForm(prev => ({ 
                                                            ...prev, 
                                                            logistica: { ...prev.logistica, pedidoMinimo: 0 } 
                                                        }));
                                                        return;
                                                    }
                                                    const floatVal = parseFloat(val) / 100;
                                                    setFornForm(prev => ({ 
                                                        ...prev, 
                                                        logistica: { ...prev.logistica, pedidoMinimo: floatVal } 
                                                    }));
                                                }}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: RATINGS */}
                            {fornActiveSection === 'ratings' && (
                                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)', fontWeight: '700', marginBottom: '1.2rem' }}>
                                        <Star size={16} /> CLASSIFICAÇÃO DE QUALIDADE (0 A 10)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                        {['qualidade', 'prazo', 'atendimento', 'preco'].map((field) => (
                                            <div key={field}>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', textTransform: 'capitalize' }}>{field}</label>
                                                <input 
                                                    type="number" min="0" max="10"
                                                    value={fornForm.ratings[field]} 
                                                    onChange={(e) => {
                                                        const val = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                                                        setFornForm(prev => ({ 
                                                            ...prev, 
                                                            ratings: { ...prev.ratings, [field]: val } 
                                                        }));
                                                    }}
                                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', textAlign: 'center', fontWeight: '700' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>MÉDIA GERAL DO FORNECEDOR:</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-orange)' }}>
                                            {calculateRatingAverage(fornForm.ratings).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: NOTES */}
                            {fornActiveSection === 'notes' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Adicionar anotação comercial sobre o fornecedor..."
                                            value={newNoteText}
                                            onChange={(e) => setNewNoteText(e.target.value)}
                                            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.6rem 1rem', borderRadius: '8px', outline: 'none' }}
                                        />
                                        <button type="button" onClick={handleAddNote} className="btn-confirm-modal" style={{ width: 'auto', padding: '0 1.2rem' }}>
                                            ANOTAR
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                        {tempNotes.length === 0 ? (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                                                Nenhuma observação comercial registrada.
                                            </p>
                                        ) : (
                                            tempNotes.map((n, i) => (
                                                <div key={i} style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                                    <p style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0' }}>{n.text}</p>
                                                    <small style={{ color: 'var(--text-secondary)' }}>
                                                        Autor: <strong>{n.author}</strong> · {n.date}
                                                    </small>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: FOMENTO (CATEGORIAS E INSUMOS) */}
                            {fornActiveSection === 'fomento' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem', height: '100%', minHeight: '380px' }}>
                                    {/* Left Column: Categories */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                                        <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-orange)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <span>Categorias Fomentadas</span>
                                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,145,0,0.1)', color: 'var(--accent-orange)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,145,0,0.2)' }}>
                                                {(fornForm.fomentCategories || []).length} selecionadas
                                            </span>
                                        </h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Selecione quais categorias este fornecedor distribui:</p>
                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', maxHeight: '300px', paddingRight: '0.2rem' }}>
                                            {categorias.length === 0 ? (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhuma categoria cadastrada.</p>
                                            ) : (
                                                categorias.map(cat => {
                                                    const isChecked = (fornForm.fomentCategories || []).includes(cat.name);
                                                    return (
                                                        <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.8rem', background: isChecked ? 'rgba(255,145,0,0.05)' : 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleFomentCategory(cat.name)}
                                                                style={{ accentColor: 'var(--accent-orange)' }}
                                                            />
                                                            <span style={{ fontWeight: isChecked ? '700' : 'normal', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                                {cat.name}
                                                            </span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Insumos (Products) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-orange)', fontWeight: '700', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flex: 1 }}>
                                                <span>Insumos Fomentados</span>
                                                <span style={{ fontSize: '0.75rem', background: 'rgba(255,145,0,0.1)', color: 'var(--accent-orange)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,145,0,0.2)' }}>
                                                    {(fornForm.fomentProducts || []).length} selecionados
                                                </span>
                                            </h4>
                                        </div>
                                        
                                        {/* Product Search Input */}
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Filtrar por nome ou SKU..."
                                                value={fomentProdSearch}
                                                onChange={(e) => setFomentProdSearch(e.target.value)}
                                                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
                                            />
                                        </div>

                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', paddingRight: '0.2rem' }}>
                                            {(() => {
                                                const selectedCats = fornForm.fomentCategories || [];
                                                if (selectedCats.length === 0) {
                                                    return (
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 1rem' }}>
                                                            Selecione uma ou mais categorias ao lado para listar os insumos correspondentes.
                                                        </p>
                                                    );
                                                }
                                                const filteredProds = produtos.filter(p => {
                                                    if (!selectedCats.includes(p.category)) return false;
                                                    const s = fomentProdSearch.toLowerCase().trim();
                                                    if (!s) return true;
                                                    return (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s);
                                                });
                                                if (filteredProds.length === 0) {
                                                    return <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>Nenhum insumo correspondente.</p>;
                                                }
                                                return filteredProds.map(prod => {
                                                    const isChecked = (fornForm.fomentProducts || []).includes(prod.sku);
                                                    return (
                                                        <label key={prod.sku} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.8rem', background: isChecked ? 'rgba(255,145,0,0.05)' : 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleFomentProduct(prod.sku)}
                                                                style={{ accentColor: 'var(--accent-orange)' }}
                                                            />
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                                <span style={{ fontWeight: isChecked ? '700' : 'normal', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                                    {prod.name}
                                                                </span>
                                                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                                                                    SKU: {prod.sku} {prod.brand ? `· ${prod.brand}` : ''} · Categoria: {prod.category}
                                                                </small>
                                                            </div>
                                                        </label>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', flexShrink: 0 }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowFornModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal">SALVAR FORNECEDOR</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Custom confirm modal and toast notifications style */}
            <style>{`
                @keyframes toastSlideIn {
                    from {
                        transform: translateY(20px) scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                .bank-dropdown-item {
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    color: var(--text-primary);
                    font-size: 0.85rem;
                    transition: background 0.2s;
                }
                .bank-dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.08);
                }
                .bank-dropdown-container {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(20, 20, 25, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    z-index: 10000;
                    max-height: 200px;
                    overflow-y: auto;
                    margin-top: 0.2rem;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                }
            `}</style>

            {/* MODAL: CONFIRMAR EXCLUSÃO DE COLABORADOR */}
            {colabToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Funcionário?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o funcionário <strong style={{ color: 'var(--text-primary)' }}>{colabToDelete.displayName || colabToDelete.name}</strong>?<br/>
                            Esta ação removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setColabToDelete(null)}
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
                                onClick={confirmDeleteColab}
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

            {/* TOAST NOTIFICATION SYSTEM */}
            {toast && createPortal(
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 10020,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem 1.5rem',
                    background: 'rgba(18, 24, 38, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: `1.5px solid ${toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#14b8a6'}`,
                    boxShadow: `0 8px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(20, 184, 166, 0.15)'}`,
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    animation: 'toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    maxWidth: '400px'
                }}>
                    {toast.type === 'success' && <Check size={18} color="#14b8a6" />}
                    {toast.type === 'warning' && <AlertTriangle size={18} color="#f59e0b" />}
                    {toast.type === 'error' && <AlertTriangle size={18} color="#ef4444" />}
                    
                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.message}</span>
                    
                    <button 
                        onClick={() => setToast(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '0.5rem'
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            , document.body)}

            {/* MODAL: CONFIRMAR EXCLUSÃO DE PRODUTO */}
            {prodToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Produto?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o produto <strong style={{ color: 'var(--text-primary)' }}>{prodToDelete.name}</strong> ({prodToDelete.sku})?<br/>
                            Esta ação removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setProdToDelete(null)}
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
                                onClick={confirmDeleteProd}
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

            {/* MODAL: CONFIRMAR EXCLUSÃO DE CATEGORIA */}
            {catToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Categoria?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir a categoria <strong style={{ color: 'var(--text-primary)' }}>{catToDelete.name}</strong>?<br/>
                            Isso não apagará os produtos dela, mas removerá o vínculo. Esta ação não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setCatToDelete(null)}
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
                                onClick={confirmDeleteCat}
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

            {/* MODAL: CONFIRMAR EXCLUSÃO DE FORNECEDOR */}
            {fornToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Fornecedor?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o fornecedor <strong style={{ color: 'var(--text-primary)' }}>{fornToDelete.nomeFantasia || fornToDelete.razaoSocial}</strong>?<br/>
                            Esta ação removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setFornToDelete(null)}
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
                                onClick={confirmDeleteForn}
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
                MODAL: CADASTRO/EDIÇÃO SETOR
            ============================================= */}
            {showSectorModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%' }}>
                        <button className="btn-close-modal" onClick={() => setShowSectorModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveSector} style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-teal)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingSector ? 'Editar Setor' : 'Novo Setor'}
                            </h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome do Setor</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength="50"
                                    placeholder="Ex: SALÃO"
                                    value={sectorForm.name} 
                                    onChange={(e) => setSectorForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição</label>
                                <input 
                                    type="text" 
                                    value={sectorForm.description} 
                                    onChange={(e) => setSectorForm(prev => ({ ...prev, description: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Tema (Cor Visual)</label>
                                <select 
                                    value={sectorForm.color}
                                    onChange={(e) => setSectorForm(prev => ({ ...prev, color: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="color-teal">Azul Turquesa</option>
                                    <option value="color-blue">Azul Glacial</option>
                                    <option value="color-red">Vermelho Alerta</option>
                                    <option value="color-green">Verde Higiene</option>
                                    <option value="color-yellow">Amarelo Produção</option>
                                    <option value="color-orange">Laranja Corellux</option>
                                    <option value="color-purple">Roxo Admin</option>
                                    <option value="color-pink">Rosa Sobremesas</option>
                                    <option value="color-indigo">Índigo Limpeza</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowSectorModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal" style={{ backgroundColor: 'var(--accent-teal)', borderColor: 'var(--accent-teal)' }}>SALVAR SETOR</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: CADASTRO/EDIÇÃO CARGO
            ============================================= */}
            {showCargoModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%' }}>
                        <button className="btn-close-modal" onClick={() => setShowCargoModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveCargo} style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-yellow)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingCargo ? 'Editar Cargo' : 'Novo Cargo'}
                            </h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nome do Cargo</label>
                                <input 
                                    type="text" 
                                    required 
                                    maxLength="50"
                                    placeholder="Ex: Cozinheiro"
                                    value={cargoForm.name} 
                                    onChange={(e) => setCargoForm(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Setor Vinculado</label>
                                <select 
                                    required 
                                    value={cargoForm.sectorId || ''} 
                                    onChange={(e) => setCargoForm(prev => ({ ...prev, sectorId: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="">Selecione um setor...</option>
                                    {setores.map(sec => (
                                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição / Responsabilidades</label>
                                <input 
                                    type="text" 
                                    value={cargoForm.description} 
                                    onChange={(e) => setCargoForm(prev => ({ ...prev, description: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowCargoModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal" style={{ backgroundColor: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)', color: '#000000' }}>SALVAR CARGO</button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* MODAL: CONFIRMAR EXCLUSÃO DE SETOR */}
            {sectorToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Setor?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o setor <strong style={{ color: 'var(--text-primary)' }}>{sectorToDelete.name}</strong>?<br/>
                            Isso removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setSectorToDelete(null)}
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
                                onClick={confirmDeleteSector}
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

            {/* MODAL: CONFIRMAR EXCLUSÃO DE CARGO */}
            {cargoToDelete && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10010 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
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
                            Excluir Cargo?
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            Tem certeza que deseja excluir o cargo <strong style={{ color: 'var(--text-primary)' }}>{cargoToDelete.name}</strong>?<br/>
                            Isso removerá permanentemente o cadastro e não poderá ser desfeita.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => setCargoToDelete(null)}
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
                                onClick={confirmDeleteCargo}
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

            {/* MODAL: GENERIC CONFIRMATION DIALOG */}
            {genericConfirm && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10020 }}>
                    <div className="pin-modal-card" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2rem' }}>
                        <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: genericConfirm.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(235, 94, 40, 0.1)',
                            border: `2px solid ${genericConfirm.isDanger ? '#ef4444' : 'var(--accent-orange)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto',
                            boxShadow: `0 0 20px ${genericConfirm.isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(235, 94, 40, 0.2)'}`
                        }}>
                            {genericConfirm.isDanger ? (
                                <Trash2 size={36} color="#ef4444" />
                            ) : (
                                <AlertTriangle size={36} color="var(--accent-orange)" />
                            )}
                        </div>
                        
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.8rem', fontWeight: '800' }}>
                            {genericConfirm.title}
                        </h3>
                        
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                            {genericConfirm.message}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn-confirm-modal" 
                                onClick={() => {
                                    if (genericConfirm.onCancel) genericConfirm.onCancel();
                                    setGenericConfirm(null);
                                }}
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
                                {genericConfirm.cancelText || 'CANCELAR'}
                            </button>
                            <button 
                                type="button" 
                                className="btn-clear-modal" 
                                onClick={() => {
                                    if (genericConfirm.onConfirm) genericConfirm.onConfirm();
                                    setGenericConfirm(null);
                                }}
                                style={{ 
                                    flex: 1, 
                                    background: genericConfirm.isDanger ? '#ef4444' : 'var(--accent-orange)', 
                                    border: '1.5px solid #000000', 
                                    color: '#ffffff',
                                    boxShadow: '0 4px 0px #000000',
                                    height: '42px',
                                    padding: '0 1rem'
                                }}
                            >
                                {genericConfirm.confirmText || 'SIM'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: CADASTRO/EDIÇÃO ARMAZÉM (WMS)
            ============================================= */}
            {showWarehouseModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setShowWarehouseModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: '800', margin: 0 }}>
                                {editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}
                            </h3>
                            
                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nome do Armazém</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ex: Armazém Central"
                                    value={warehouseForm.name}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sigla do Armazém (2 Letras)</label>
                                <input 
                                    type="text" 
                                    required
                                    maxLength={2}
                                    placeholder="Ex: BC"
                                    value={warehouseForm.acronym}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, acronym: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', textTransform: 'uppercase' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descrição</label>
                                <textarea 
                                    placeholder="Descrição ou observações..."
                                    rows={3}
                                    value={warehouseForm.description}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', resize: 'none' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</label>
                                <select 
                                    value={warehouseForm.status}
                                    onChange={(e) => setWarehouseForm({ ...warehouseForm, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={() => setShowWarehouseModal(false)}
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-header-action" 
                                    style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', margin: 0, justifyContent: 'center' }}
                                >
                                    SALVAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: CADASTRO/EDIÇÃO ZONA / ESTOQUE (WMS)
            ============================================= */}
            {showZoneModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setShowZoneModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveZone} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: '800', margin: 0 }}>
                                {editingZone ? 'Editar Zona' : 'Nova Zona / Estoque'}
                            </h3>
                            
                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nome da Zona (Sigla de 3 Letras)</label>
                                <input 
                                    type="text" 
                                    required
                                    maxLength={3}
                                    placeholder="Ex: EMC"
                                    value={zoneForm.name}
                                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', textTransform: 'uppercase' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descrição da Sigla</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ex: Estoque Manutenção Circular"
                                    value={zoneForm.acronymDescription}
                                    onChange={(e) => setZoneForm({ ...zoneForm, acronymDescription: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tipo de Armazenamento</label>
                                <select 
                                    value={zoneForm.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        const isCold = newType === 'Resfriado' || newType === 'Congelado';
                                        setZoneForm({ 
                                            ...zoneForm, 
                                            type: newType,
                                            isAmbient: isCold ? false : zoneForm.isAmbient,
                                            ambientType: isCold ? null : zoneForm.ambientType
                                        });
                                    }}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                >
                                    <option value="Seco">Seco</option>
                                    <option value="Resfriado">Resfriado</option>
                                    <option value="Congelado">Congelado</option>
                                    <option value="Climatizado">Climatizado</option>
                                </select>
                            </div>

                            {/* Temperatura Mínima & Máxima */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Temp. Mínima (°C)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: -18"
                                        value={zoneForm.tempMin === null || zoneForm.tempMin === undefined ? '' : zoneForm.tempMin}
                                        onChange={(e) => setZoneForm({ ...zoneForm, tempMin: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Temp. Máxima (°C)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: 8"
                                        value={zoneForm.tempMax === null || zoneForm.tempMax === undefined ? '' : zoneForm.tempMax}
                                        onChange={(e) => setZoneForm({ ...zoneForm, tempMax: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Temperatura Ambiente */}
                            <div className="card-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    fontSize: '0.9rem', 
                                    color: (zoneForm.type === 'Resfriado' || zoneForm.type === 'Congelado') ? 'var(--text-muted)' : 'var(--text-primary)', 
                                    cursor: (zoneForm.type === 'Resfriado' || zoneForm.type === 'Congelado') ? 'not-allowed' : 'pointer', 
                                    fontWeight: '600',
                                    opacity: (zoneForm.type === 'Resfriado' || zoneForm.type === 'Congelado') ? 0.5 : 1
                                }}>
                                    <input 
                                        type="checkbox"
                                        disabled={zoneForm.type === 'Resfriado' || zoneForm.type === 'Congelado'}
                                        checked={zoneForm.isAmbient}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setZoneForm({ 
                                                ...zoneForm, 
                                                isAmbient: checked,
                                                ambientType: checked ? (zoneForm.ambientType || 'fechada') : null 
                                            });
                                        }}
                                        style={{ cursor: (zoneForm.type === 'Resfriado' || zoneForm.type === 'Congelado') ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                                    />
                                    Temperatura Ambiente
                                </label>

                                {zoneForm.isAmbient && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ambiente da Zona:</span>
                                        
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setZoneForm({ ...zoneForm, ambientType: 'fechada' })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem',
                                                    background: zoneForm.ambientType === 'fechada' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                    border: zoneForm.ambientType === 'fechada' ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: zoneForm.ambientType === 'fechada' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Área Fechada
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setZoneForm({ ...zoneForm, ambientType: zoneForm.ambientType && zoneForm.ambientType.startsWith('externa') ? zoneForm.ambientType : 'externa_aberta' })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem',
                                                    background: zoneForm.ambientType && zoneForm.ambientType.startsWith('externa') ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                    border: zoneForm.ambientType && zoneForm.ambientType.startsWith('externa') ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: zoneForm.ambientType && zoneForm.ambientType.startsWith('externa') ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                Área Externa
                                            </button>
                                        </div>

                                        {zoneForm.ambientType && zoneForm.ambientType.startsWith('externa') && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', marginTop: '0.2rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Tipo de Área Externa:</span>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setZoneForm({ ...zoneForm, ambientType: 'externa_aberta' })}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.5rem',
                                                            background: zoneForm.ambientType === 'externa_aberta' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                                            border: zoneForm.ambientType === 'externa_aberta' ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            color: zoneForm.ambientType === 'externa_aberta' ? 'var(--accent-green)' : 'var(--text-secondary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Externa Aberta
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setZoneForm({ ...zoneForm, ambientType: 'externa_coberta' })}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.5rem',
                                                            background: zoneForm.ambientType === 'externa_coberta' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                                            border: zoneForm.ambientType === 'externa_coberta' ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                                                            borderRadius: '6px',
                                                            color: zoneForm.ambientType === 'externa_coberta' ? 'var(--accent-green)' : 'var(--text-secondary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Externa Coberta
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="card-input-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-blue)', margin: 0 }}>Pré-visualização do Endereço</label>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.2rem' }}>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Pré-visualização:</span>
                                    <code style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 'bold', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {formatAddressVisual(
                                            {
                                                name: zoneForm.name || 'EMC',
                                            },
                                            '2', 'B', '5D', 'D'
                                        )}
                                    </code>
                                </div>
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Volume Cúbico Padrão por Célula (m³)</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    min="0"
                                    placeholder="Ex: 10.0"
                                    value={zoneForm.volumeCubicoPadrao || ''}
                                    onChange={(e) => setZoneForm({ ...zoneForm, volumeCubicoPadrao: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                />
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                    Este valor será usado como capacidade total padrão para cada célula individual (alt x prat) nesta zona.
                                </div>
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descrição</label>
                                <textarea 
                                    placeholder="Descrição detalhada..."
                                    rows={2}
                                    value={zoneForm.description}
                                    onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', resize: 'none' }}
                                />
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</label>
                                <select 
                                    value={zoneForm.status}
                                    onChange={(e) => setZoneForm({ ...zoneForm, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={() => setShowZoneModal(false)}
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-header-action" 
                                    style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', margin: 0, justifyContent: 'center' }}
                                >
                                    SALVAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* =============================================
                MODAL: GERADOR EM LOTE DE ENDEREÇOS (WMS)
            ============================================= */}
            {showBatchLocationModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '550px', width: '90%', padding: '2rem' }}>
                        <button className="btn-close-modal" onClick={() => setShowBatchLocationModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleGenerateLocationsBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Shuffle size={20} /> Gerar Endereços em Lote
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Configure os intervalos abaixo para gerar automaticamente múltiplas coordenadas para a zona <strong style={{ color: 'var(--text-primary)' }}>{selectedZone?.name}</strong>.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rua/Corredor (Início)</label>
                                    <input 
                                        type="text" required placeholder="Ex: 1 ou A"
                                        value={batchLocationForm.aisleStart}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, aisleStart: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rua/Corredor (Fim)</label>
                                    <input 
                                        type="text" required placeholder="Ex: 3 ou C"
                                        value={batchLocationForm.aisleEnd}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, aisleEnd: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Fileira: sempre A e B (lados do corredor) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '1.1rem' }}>↔️</span>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fileira (Lado do Corredor)</span>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Fixo: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>A</code> = Esquerdo &nbsp;|&nbsp; <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>B</code> = Direito — cada corredor tem exatamente 2 lados.
                                    </div>
                                </div>
                            </div>

                            <div className="card-input-group">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ruas com somente Fileira A (opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: 5;8;12 (separe por ponto e vírgula)"
                                    value={batchLocationForm.onlyRowAAisles}
                                    onChange={(e) => setBatchLocationForm({ ...batchLocationForm, onlyRowAAisles: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                />
                                <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Essas ruas terão apenas a Fileira A gerada (ex: encostadas na parede). Outras ruas terão A e B.
                                </small>
                            </div>

                            {/* Prateleira (número) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prateleira/Nível (Início)</label>
                                    <input 
                                        type="text" required placeholder="Ex: 1"
                                        value={batchLocationForm.shelfStart}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, shelfStart: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prateleira/Nível (Fim)</label>
                                    <input 
                                        type="text" required placeholder="Ex: 5"
                                        value={batchLocationForm.shelfEnd}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, shelfEnd: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Altura dentro da prateleira (letra) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Altura na Prateleira (Início)</label>
                                    <input 
                                        type="text" required placeholder="Ex: A"
                                        value={batchLocationForm.shelfHeightStart}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, shelfHeightStart: e.target.value.toUpperCase() })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div className="card-input-group">
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Altura na Prateleira (Fim)</label>
                                    <input 
                                        type="text" required placeholder="Ex: D"
                                        value={batchLocationForm.shelfHeightEnd}
                                        onChange={(e) => setBatchLocationForm({ ...batchLocationForm, shelfHeightEnd: e.target.value.toUpperCase() })}
                                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>
                            <small style={{ display: 'block', marginTop: '-0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                A altura é concatenada ao número da prateleira. Ex: prateleira <code>5</code> + altura <code>D</code> → código <code>5D</code> no endereço.
                            </small>

                                 <div className="card-input-group">
                                     <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subdivisão Interna da Prateleira (Lados)</label>
                                     <select 
                                         value={batchLocationForm.subdivisionType}
                                         onChange={(e) => setBatchLocationForm({ ...batchLocationForm, subdivisionType: e.target.value })}
                                         style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                     >
                                         <option value="Nenhuma">Nenhuma subdivisão (Rua-Fileira-Prateleira)</option>
                                         <option value="AB">Lados A e B (ex: Lado A, Lado B)</option>
                                         <option value="ABC">Lados A, B e C (ex: Lado A, Lado B, Lado C)</option>
                                         <option value="Customizado">Personalizado (separado por ponto e vírgula)</option>
                                     </select>
                                 </div>

                                 {batchLocationForm.subdivisionType === 'Customizado' && (
                                     <div className="card-input-group">
                                         <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lados/Compartimentos Personalizados (Separe por ;)</label>
                                         <input 
                                             type="text" 
                                             required
                                             placeholder="Ex: Esquerda;Centro;Direita ou A;B;C;D"
                                             value={batchLocationForm.subdivisionCustom}
                                             onChange={(e) => setBatchLocationForm({ ...batchLocationForm, subdivisionCustom: e.target.value })}
                                             style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                         />
                                         <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                             Insira cada lado desejado separado por ponto e vírgula (ex: <code>Esq;Dir</code>).
                                         </small>
                                     </div>
                                 )}

                                 {/* Live calculation and summary */}
                                 {(() => {
                                     const aisles = getRange(batchLocationForm.aisleStart, batchLocationForm.aisleEnd);
                                     const shelves = getRange(batchLocationForm.shelfStart, batchLocationForm.shelfEnd);
                                     const heights = getRange(batchLocationForm.shelfHeightStart, batchLocationForm.shelfHeightEnd);
                                     
                                     // Parse rules for aisles that only have row A
                                     const onlyRowAAislesList = batchLocationForm.onlyRowAAisles
                                         ? batchLocationForm.onlyRowAAisles.split(';').map(x => x.trim()).filter(Boolean)
                                         : [];

                                     let positions = [];
                                     if (batchLocationForm.subdivisionType === 'AB') {
                                         positions = ['A', 'B'];
                                     } else if (batchLocationForm.subdivisionType === 'ABC') {
                                         positions = ['A', 'B', 'C'];
                                     } else if (batchLocationForm.subdivisionType === 'Customizado') {
                                         positions = batchLocationForm.subdivisionCustom
                                             ? batchLocationForm.subdivisionCustom.split(';').map(p => p.trim()).filter(Boolean)
                                             : [];
                                     }
                                     
                                     let count = 0;
                                     for (const aisle of aisles) {
                                         const currentRows = onlyRowAAislesList.includes(String(aisle)) ? ['A'] : ['A', 'B'];
                                         count += currentRows.length * shelves.length * heights.length * (positions.length || 1);
                                     }
                                     
                                     const previewShelf = shelves[0] && heights[0] ? `${shelves[0]}${heights[0]}` : (shelves[0] || '');

                                     const isValid = count > 0 && aisles[0] !== '' && shelves[0] !== '' && heights[0] !== '' && (batchLocationForm.subdivisionType !== 'Customizado' || positions.length > 0);
                                     
                                     return (
                                         <div style={{
                                             background: isValid ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                             border: isValid ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                             borderRadius: '8px',
                                             padding: '1rem',
                                             fontSize: '0.85rem',
                                             color: isValid ? 'var(--text-primary)' : 'var(--accent-red)'
                                         }}>
                                             {isValid ? (
                                                 <>
                                                     <strong>Resumo da Geração:</strong>
                                                     <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                                                         Serão inseridos <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{count}</span> novos endereços físicos.
                                                     </div>
                                                     <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                         Exemplo de endereço gerado: <code style={{ color: 'var(--accent-green)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                             {formatAddressVisual(
                                                                 selectedZone, 
                                                                 aisles[0], 
                                                                 'A', 
                                                                 previewShelf, 
                                                                 positions[0] || null
                                                             )}
                                                         </code>
                                                     </div>
                                                 </>
                                             ) : (
                                                 <div>
                                                     <strong>Atenção:</strong> Os intervalos ou subdivisões informadas são inválidos ou incompletos. A contagem de geração é 0.
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })()}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={() => setShowBatchLocationModal(false)}
                                    style={{ flex: 1, padding: '0.75rem' }}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-header-action" 
                                    style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', margin: 0, justifyContent: 'center' }}
                                >
                                    GERAR ENDEREÇOS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
