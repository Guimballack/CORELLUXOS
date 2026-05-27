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
    FolderOpen,
    Paperclip,
    Camera,
    Calendar,
    Eye,
    Download,
    ChevronRight,
    LayoutGrid,
    Briefcase,
    ShoppingBag
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
    const [fornecedores, setFornecedores] = useState([]);
    const [setores, setSetores] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Modals control
    const [showColabModal, setShowColabModal] = useState(false);
    const [editingColab, setEditingColab] = useState(null);
    const [colabToDelete, setColabToDelete] = useState(null);
    const [prodToDelete, setProdToDelete] = useState(null);
    const [catToDelete, setCatToDelete] = useState(null);
    const [fornToDelete, setFornToDelete] = useState(null);
    const [sectorToDelete, setSectorToDelete] = useState(null);
    const [cargoToDelete, setCargoToDelete] = useState(null);
    const [genericConfirm, setGenericConfirm] = useState(null);
    const [toast, setToast] = useState(null);

    const [showProdModal, setShowProdModal] = useState(false);
    const [editingProd, setEditingProd] = useState(null);

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
        name: '', description: '', status: 'Ativo'
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
            const [usersData, prodsData, catsData, supsData, sectorsData] = await Promise.all([
                loadUsers(),
                DbService.getProducts(),
                DbService.getCategories(),
                DbService.getSuppliers(),
                DbService.getSectors()
            ]);
            setColaboradores(usersData);
            setProdutos(prodsData);
            setCategorias(catsData);
            setFornecedores(supsData);
            setSetores(sectorsData);

            // Load cargos
            const savedCargos = localStorage.getItem('corellux_cargos');
            if (savedCargos) {
                setCargos(JSON.parse(savedCargos));
            } else {
                const defaultCargos = [
                    { id: 1, name: 'Administrador', description: 'Acesso total ao sistema', status: 'Ativo' },
                    { id: 2, name: 'Gerente', description: 'Gestão operacional e aprovações', status: 'Ativo' },
                    { id: 3, name: 'Estoquista', description: 'Controle de entrada e saída', status: 'Ativo' },
                    { id: 4, name: 'Cozinha', description: 'Solicitação de insumos', status: 'Ativo' }
                ];
                setCargos(defaultCargos);
                localStorage.setItem('corellux_cargos', JSON.stringify(defaultCargos));
            }
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

    const [prodForm, setProdForm] = useState({
        sku: '', name: '', brand: '', category: '', 
        unit: 'KG', stock: 0, minStock: 0, avgStock: 0, maxStock: 0,
        status: 'Ativo', desc: ''
    });

    const openProdModalForEdit = (prod) => {
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
            desc: prod.desc || ''
        });
        setShowProdModal(true);
    };

    const openProdModalForCreate = () => {
        setEditingProd(null);
        setProdForm({
            sku: '', name: '', brand: '', 
            category: categorias[0]?.name || '', 
            unit: 'KG', stock: 0, minStock: 0, avgStock: 0, maxStock: 0,
            status: 'Ativo', desc: ''
        });
        setShowProdModal(true);
    };

    const handleSaveProd = async (e) => {
        e.preventDefault();
        
        if (!editingProd && produtos.some(p => p.sku.toLowerCase() === prodForm.sku.toLowerCase())) {
            showToast('Erro: Já existe um produto cadastrado com este SKU.', 'error');
            return;
        }

        const result = await DbService.saveProduct(prodForm, editingProd ? editingProd.sku : null);
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
            name: '', icon: 'fa-cheese', color: 'color-blue', desc: '', status: 'Ativo'
        });
        setShowCatModal(true);
    };

    const handleSaveCat = async (e) => {
        e.preventDefault();
        
        const payload = {
            ...catForm,
            name: catForm.name.toUpperCase().trim()
        };

        const result = await DbService.saveCategory(payload);
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

        const result = await DbService.deleteCategory(cat.id);
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
        
        // Optimistic local update
        setCategorias(prev => prev.map(c => String(c.id) === String(cat.id) ? updated : c));
        
        await DbService.saveCategory(updated);
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
            description: car.description || '',
            status: car.status || 'Ativo'
        });
        setShowCargoModal(true);
    };

    const openCargoModalForCreate = () => {
        setEditingCargo(null);
        setCargoForm({
            name: '', description: '', status: 'Ativo'
        });
        setShowCargoModal(true);
    };

    const handleSaveCargo = (e) => {
        e.preventDefault();
        
        let updatedCargos = [...cargos];
        if (editingCargo) {
            updatedCargos = cargos.map(c => String(c.id) === String(editingCargo.id) ? { ...c, ...cargoForm, name: cargoForm.name.trim() } : c);
        } else {
            const newCargo = {
                ...cargoForm,
                name: cargoForm.name.trim(),
                id: Date.now()
            };
            updatedCargos.push(newCargo);
        }

        setCargos(updatedCargos);
        localStorage.setItem('corellux_cargos', JSON.stringify(updatedCargos));
        showToast('Cargo gravado com sucesso!', 'success');
        setShowCargoModal(false);
    };

    // Confirm modals delete helpers
    const confirmDeleteCargo = () => {
        if (!cargoToDelete) return;
        const car = cargoToDelete;
        setCargoToDelete(null);

        const updatedCargos = cargos.filter(c => String(c.id) !== String(car.id));
        setCargos(updatedCargos);
        localStorage.setItem('corellux_cargos', JSON.stringify(updatedCargos));
        showToast('Cargo excluído com sucesso.', 'success');
    };

    const handleToggleCargoStatus = (car) => {
        const newStatus = car.status === 'Ativo' ? 'Inativo' : 'Ativo';
        const updatedCargos = cargos.map(c => String(c.id) === String(car.id) ? { ...c, status: newStatus } : c);
        setCargos(updatedCargos);
        localStorage.setItem('corellux_cargos', JSON.stringify(updatedCargos));
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
        blockInfo: { status: 'Ativo', motivo: '' }
    });

    const openFornModalForEdit = (sup) => {
        setEditingForn(sup);
        const resolvedContatos = (() => {
            let list = [];
            if (sup.contato?.listaContatos && Array.isArray(sup.contato.listaContatos) && sup.contato.listaContatos.length > 0) {
                list = sup.contato.listaContatos.map(c => ({
                    nome: c.nome || '',
                    setor: c.setor || '',
                    email: c.email || '',
                    telefoneComercial: c.telefoneComercial || '',
                    whatsapp: c.whatsapp || '',
                    site: c.site || '',
                    observacao: c.observacao || '',
                    observacaoSalva: c.observacaoSalva || c.observacao || ''
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
                        observacaoSalva: ''
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
                        observacao: ''
                    });
                }
            }
            if (list.length === 0) {
                list = [{ nome: '', setor: 'Comercial', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '' }];
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
            blockInfo: sup.blockInfo || { status: 'Ativo', motivo: '' }
        });
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
            contatos: [{ nome: '', setor: 'Comercial', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '', observacaoSalva: '' }],
            endereco: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
            financeiro: { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
            logistica: { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
            ratings: { qualidade: 8, prazo: 8, atendimento: 8, preco: 8 },
            blockInfo: { status: 'Ativo', motivo: '' }
        });
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
        const primaryContact = fornForm.contatos?.[0] || { nome: '', setor: '', email: '', whatsapp: '', site: '', telefoneComercial: '', observacao: '' };
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

        const primaryContact = list[0] || { nome: '', setor: '', email: '', whatsapp: '', site: '', telefoneComercial: '', observacao: '', observacaoSalva: '' };
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
        p.category.toLowerCase().includes(searchProd.toLowerCase())
    );

    const filteredCats = categorias.filter(c => 
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
                                                <th>Categoria</th>
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
                                                            <span style={{ fontWeight: '700' }}>{prod.name}</span>
                                                            <span>{prod.desc || 'Sem descrição.'}</span>
                                                        </div>
                                                    </td>
                                                    <td><span style={{ color: 'var(--accent-orange)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>{prod.brand || '-'}</span></td>
                                                    <td>{prod.unit}</td>
                                                    <td><span className="category-tag">{prod.category}</span></td>
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

                        {/* =============================================
                            TAB 3: CATEGORIAS
                        ============================================= */}
                        {activeTab === 'categorias' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Tag style={{ color: 'var(--accent-orange)' }} /> Cadastro de Categorias
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
                                            <button className="btn-header-action" onClick={openCatModalForCreate}>
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
                                                            <div className={`cat-icon-area ${cat.color || 'color-blue'}`} style={{ width: '35px', height: '35px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Tag size={16} />
                                                            </div>
                                                            <strong style={{ fontSize: '1rem' }}>{cat.name}</strong>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{cat.desc || '-'}</td>
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
                                                <th>Descrição</th>
                                                <th style={{ width: '120px' }}>Status</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCargos.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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
                                                        <td style={{ color: 'var(--text-secondary)' }}>{car.description || '-'}</td>
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
                                        <ShoppingBag style={{ color: 'var(--accent-orange)' }} /> Cadastro de Produto
                                    </h2>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '5rem 2rem',
                                    background: 'rgba(0, 0, 0, 0.12)',
                                    borderRadius: '12px',
                                    border: '1.5px dashed var(--border-color)',
                                    textAlign: 'center',
                                    gap: '1rem'
                                }}>
                                    <ShoppingBag size={48} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Módulo de Produtos para Venda</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
                                        Esta funcionalidade está em fase de planejamento e estará disponível em breve para o cadastro de produtos finais e cardápio.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

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
                                                        onChange={(e) => setColabForm(prev => ({ ...prev, role: e.target.value }))} 
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
                    <div className="pin-modal-card" style={{ maxWidth: '650px', width: '90%' }}>
                        <button className="btn-close-modal" onClick={() => setShowProdModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveProd} style={{ padding: '1.5rem' }}>
                            <h3 id="item-modal-title" style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingProd ? 'Editar Produto' : 'Novo Produto'}
                            </h3>

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
                                        <option value="KG">Kilograma (KG)</option>
                                        <option value="Unidade">Unidade (UN)</option>
                                        <option value="Litro">Litro (L)</option>
                                        <option value="Pacote">Pacote (PCT)</option>
                                        <option value="Bandeja">Bandeja (BDJ)</option>
                                        <option value="Fardo">Fardo (FRD)</option>
                                        <option value="Galão">Galão (GL)</option>
                                    </select>
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

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descrição do Insumo</label>
                                <textarea 
                                    value={prodForm.desc} 
                                    onChange={(e) => setProdForm(prev => ({ ...prev, desc: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none', height: '80px', resize: 'vertical' }}
                                />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-clear-modal" onClick={() => setShowProdModal(false)}>CANCELAR</button>
                                <button type="submit" className="btn-confirm-modal">SALVAR PRODUTO</button>
                            </div>
                        </form>
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
                                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Contato #{index + 1}</span>
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
                                                                        list.splice(index, 1);
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
                                                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                                        />
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
                                            setFornForm(prev => ({
                                                ...prev,
                                                contatos: [...(prev.contatos || []), { nome: '', setor: '', email: '', telefoneComercial: '', whatsapp: '', site: '', observacao: '' }]
                                            }));
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
        </div>
    );
}
