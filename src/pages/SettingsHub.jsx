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
    Eye,
    Download
} from 'lucide-react';

const PERSONAL_DOCS_ITEMS = [
    { id: 'rg', label: 'RG' },
    { id: 'cnh', label: 'CNH' },
    { id: 'address', label: 'Comprovante de Endereço' },
    { id: 'voter', label: 'Título de Eleitor' },
    { id: 'military', label: 'Reservista' },
    { id: 'birth_marriage', label: 'Certidão Nasc/Cas' }
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
    const [globalState] = useCorelluxState(['currentUser']);
    
    // Core data lists
    const [colaboradores, setColaboradores] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab control
    const [activeTab, setActiveTab] = useState('colaboradores'); // colaboradores, produtos, categorias, fornecedores

    // Search filters
    const [searchColab, setSearchColab] = useState('');
    const [searchProd, setSearchProd] = useState('');
    const [searchCat, setSearchCat] = useState('');
    const [searchForn, setSearchForn] = useState('');

    // Modals control
    const [showColabModal, setShowColabModal] = useState(false);
    const [editingColab, setEditingColab] = useState(null);
    const [colabToDelete, setColabToDelete] = useState(null);
    const [prodToDelete, setProdToDelete] = useState(null);
    const [catToDelete, setCatToDelete] = useState(null);
    const [fornToDelete, setFornToDelete] = useState(null);
    const [toast, setToast] = useState(null);

    const [showProdModal, setShowProdModal] = useState(false);
    const [editingProd, setEditingProd] = useState(null);

    const [showCatModal, setShowCatModal] = useState(false);
    const [editingCat, setEditingCat] = useState(null);

    const [showFornModal, setShowFornModal] = useState(false);
    const [editingForn, setEditingForn] = useState(null);
    const [fornActiveSection, setFornActiveSection] = useState('geral'); // geral, contatos, endereco, financeiro, logistica, ratings, notes

    // Local temporary structures for compound items
    const [tempLinkedProducts, setTempLinkedProducts] = useState([]);
    const [tempNotes, setTempNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');

    // Collaborator form states
    const [colabOpenSections, setColabOpenSections] = useState({
        pessoais: true,
        acesso: false,
        trabalhistas: false,
        bancarios: false,
        cargaHoraria: false,
        checklistPessoais: false,
        checklistSaude: false,
        outrosDocs: false,
        permissoes: false
    });
    
    const toggleColabSection = (sectionKey) => {
        setColabOpenSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    };

    const [checklistAttachmentView, setChecklistAttachmentView] = useState(null); // { listType, itemId }
    const [viewerUrl, setViewerUrl] = useState(null);
    const [otherDocName, setOtherDocName] = useState('');

    // Load data from DB
    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, prodsData, catsData, supsData] = await Promise.all([
                loadUsers(),
                DbService.getProducts(),
                DbService.getCategories(),
                DbService.getSuppliers()
            ]);
            setColaboradores(usersData);
            setProdutos(prodsData);
            setCategorias(catsData);
            setFornecedores(supsData);
        } catch (e) {
            console.error('[SettingsHub] Error loading database registries:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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
            phone: user.phone || '',
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
            cpf: user.cpf || '',
            rg: user.rg || '',
            birthDate: user.birthDate || '',
            gender: user.gender || '',
            maritalStatus: user.maritalStatus || '',
            cep: user.cep || '',
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
        await DbService.saveCategory(updated);
        loadData();
    };

    // =============================================
    // CRUD 4: FORNECEDORES (SUPPLIERS)
    // =============================================

    const [fornForm, setFornForm] = useState({
        razaoSocial: '', nomeFantasia: '', cnpj: '', ie: '', im: '', 
        tipoFornecedor: 'Distribuidor', situacao: 'Ativo', dataCadastro: '',
        contato: { responsavelComercial: '', responsavelFinanceiro: '', telefone: '', whatsapp: '', emailComercial: '', emailFinanceiro: '', site: '' },
        endereco: { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
        financeiro: { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
        logistica: { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
        ratings: { qualidade: 8, prazo: 8, atendimento: 8, preco: 8 },
        blockInfo: { status: 'Ativo', motivo: '' }
    });

    const openFornModalForEdit = (sup) => {
        setEditingForn(sup);
        setFornForm({
            id: sup.id,
            razaoSocial: sup.razaoSocial || '',
            nomeFantasia: sup.nomeFantasia || '',
            cnpj: sup.cnpj || '',
            ie: sup.ie || '',
            im: sup.im || '',
            tipoFornecedor: sup.tipoFornecedor || 'Distribuidor',
            situacao: sup.situacao || 'Ativo',
            dataCadastro: sup.dataCadastro || '',
            contato: sup.contato || { responsavelComercial: '', responsavelFinanceiro: '', telefone: '', whatsapp: '', emailComercial: '', emailFinanceiro: '', site: '' },
            endereco: sup.endereco || { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' },
            financeiro: sup.financeiro || { formaPagamento: '', prazoPagamento: '', limiteCredito: 0, banco: '', agencia: '', conta: '', pix: '', tipoChavePix: 'CNPJ' },
            logistica: sup.logistica || { prazoEntrega: '', diasEntrega: '', transportadora: '', pedidoMinimo: 0, freteMinimo: 0, regiaoAtendimento: '' },
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

        const payload = {
            ...fornForm,
            razaoSocial: fornForm.razaoSocial.toUpperCase().trim(),
            nomeFantasia: fornForm.nomeFantasia.toUpperCase().trim(),
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
        f.razaoSocial.toLowerCase().includes(searchForn.toLowerCase()) ||
        (f.nomeFantasia && f.nomeFantasia.toLowerCase().includes(searchForn.toLowerCase())) ||
        f.cnpj.includes(searchForn)
    );

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Top Navigation Bar */}
            <div className="tab-navigation-bar" style={{
                display: 'flex',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-color)',
                padding: '0 2rem',
                gap: '2rem'
            }}>
                <button 
                    className={`tab-nav-btn ${activeTab === 'colaboradores' ? 'active' : ''}`}
                    onClick={() => setActiveTab('colaboradores')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'colaboradores' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'colaboradores' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Users size={16} /> COLABORADORES
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'produtos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('produtos')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'produtos' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'produtos' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Boxes size={16} /> PRODUTOS (INSUMOS)
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'categorias' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categorias')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'categorias' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'categorias' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Tag size={16} /> CATEGORIAS
                </button>

                <button 
                    className={`tab-nav-btn ${activeTab === 'fornecedores' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fornecedores')}
                    style={{
                        padding: '1.2rem 0',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'fornecedores' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                        color: activeTab === 'fornecedores' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Truck size={16} /> FORNECEDORES
                </button>
            </div>

            {/* Inner Content Area */}
            <div className="tab-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                
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
                            TAB 1: COLABORADORES
                        ============================================= */}
                        {activeTab === 'colaboradores' && (
                            <div className="products-container">
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users style={{ color: 'var(--accent-orange)' }} /> Cadastro de Funcionários
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flex: '1', justifyContent: 'flex-end', minWidth: '300px' }}>
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
                                            <button className="btn-primary" onClick={openColabModalForCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                                                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                                                 <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                                     <button className="action-btn-sm edit" onClick={() => openColabModalForEdit(colab)} title="Editar" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                         <Edit size={16} />
                                                                     </button>
                                                                     <button className="action-btn-sm block" onClick={() => handleToggleColabStatus(colab)} title={colab.status === 'Ativo' ? 'Bloquear Funcionário' : 'Ativar Funcionário'} style={{ color: colab.status === 'Ativo' ? 'var(--text-secondary)' : 'var(--accent-red)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                         {colab.status === 'Ativo' ? <Lock size={16} /> : <Unlock size={16} />}
                                                                     </button>
                                                                 </div>
                                                                 <button className="action-btn-sm delete" onClick={() => handleDeleteColab(colab)} title="Excluir" style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Boxes style={{ color: 'var(--accent-orange)' }} /> Cadastro de Insumos / Produtos
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flex: '1', justifyContent: 'flex-end', minWidth: '300px' }}>
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
                                            <button className="btn-primary" onClick={openProdModalForCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <PlusCircle size={16} /> NOVO PRODUTO
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
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                                <button className="action-btn-sm edit" onClick={() => openProdModalForEdit(prod)} title="Editar" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button className="action-btn-sm block" onClick={() => handleToggleProdStatus(prod)} title={prod.status === 'Ativo' ? 'Inativar' : 'Ativar'} style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    {prod.status === 'Ativo' ? <Lock size={16} /> : <Unlock size={16} />}
                                                                </button>
                                                            </div>
                                                            <button className="action-btn-sm delete" onClick={() => handleDeleteProd(prod)} title="Excluir" style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Tag style={{ color: 'var(--accent-orange)' }} /> Cadastro de Categorias
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flex: '1', justifyContent: 'flex-end', minWidth: '300px' }}>
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
                                            <button className="btn-primary" onClick={openCatModalForCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                                <button className="action-btn-sm edit" onClick={() => openCatModalForEdit(cat)} title="Editar" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button className="action-btn-sm block" onClick={() => handleToggleCatStatus(cat)} title={cat.status === 'Ativo' ? 'Inativar' : 'Ativar'} style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    {cat.status === 'Ativo' ? <Lock size={16} /> : <Unlock size={16} />}
                                                                </button>
                                                            </div>
                                                            <button className="action-btn-sm delete" onClick={() => handleDeleteCat(cat)} title="Excluir" style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
                                <div className="products-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Truck style={{ color: 'var(--accent-orange)' }} /> Cadastro de Fornecedores
                                    </h2>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', flex: '1', justifyContent: 'flex-end', minWidth: '300px' }}>
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
                                            <button className="btn-primary" onClick={openFornModalForCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                                                        <td>{forn.logistica?.prazoEntrega || '-'}</td>
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
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                                    <button className="action-btn-sm edit" onClick={() => openFornModalForEdit(forn)} title="Editar/Detalhes" style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button className="action-btn-sm block" onClick={() => handleToggleFornStatus(forn)} title={forn.situacao === 'Ativo' ? 'Bloquear' : 'Desbloquear'} style={{ color: forn.situacao === 'Ativo' ? 'var(--accent-red)' : 'var(--accent-green)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                        {forn.situacao === 'Ativo' ? <Lock size={16} /> : <Unlock size={16} />}
                                                                    </button>
                                                                </div>
                                                                <button className="action-btn-sm delete" onClick={() => handleDeleteForn(forn)} title="Excluir" style={{ color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', padding: '0.4rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
                    </>
                )}
            </div>

            {/* =============================================
                MODAL 1: CADASTRO/EDIÇÃO COLABORADOR
            ============================================= */}
            {showColabModal && createPortal(
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, overflowY: 'auto' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '750px', width: '90%', margin: '2rem auto' }}>
                        <button className="btn-close-modal" onClick={() => setShowColabModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveColab} style={{ padding: '1.5rem' }}>
                            <h3 id="employee-modal-title" style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingColab ? 'Editar Funcionário' : 'Novo Funcionário'}
                            </h3>

                            {/* =======================================
                                ACCORDION CONTAINER
                               ======================================= */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>

                                {/* SEÇÃO: DADOS PESSOAIS E ENDEREÇO */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('pessoais')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <Users size={18} color="var(--accent-orange)" /> Dados Pessoais e Contato
                                        </div>
                                        {colabOpenSections.pessoais ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.pessoais && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                            {/* Foto e Campos Básicos */}
                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-orange)' }}>
                                                        <img src={colabForm.img || 'profile/default-avatar.png'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                        <input type="text" required value={colabForm.role} onChange={(e) => setColabForm(prev => ({ ...prev, role: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CPF</label>
                                                        <input type="text" value={colabForm.cpf} onChange={(e) => setColabForm(prev => ({ ...prev, cpf: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>RG</label>
                                                        <input type="text" value={colabForm.rg} onChange={(e) => setColabForm(prev => ({ ...prev, rg: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Data de Nascimento</label>
                                                        <input type="date" value={colabForm.birthDate} onChange={(e) => setColabForm(prev => ({ ...prev, birthDate: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Sexo / Gênero</label>
                                                        <input type="text" value={colabForm.gender} onChange={(e) => setColabForm(prev => ({ ...prev, gender: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
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
                                                        <input type="text" value={colabForm.phone} onChange={(e) => setColabForm(prev => ({ ...prev, phone: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>E-mail Pessoal / Corporativo</label>
                                                        <input type="email" value={colabForm.email} onChange={(e) => setColabForm(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Endereço */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CEP</label>
                                                    <input type="text" value={colabForm.cep} onChange={(e) => setColabForm(prev => ({ ...prev, cep: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Endereço Completo (Rua, Número, Bairro, Cidade)</label>
                                                    <input type="text" value={colabForm.address} onChange={(e) => setColabForm(prev => ({ ...prev, address: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SEÇÃO: ACESSO E PERMISSÕES */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('acesso')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <Shield size={18} color="var(--accent-orange)" /> Acesso e Permissões do Sistema
                                        </div>
                                        {colabOpenSections.acesso ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.acesso && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
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
                                </div>

                                {/* SEÇÃO: DADOS TRABALHISTAS E REMUNERAÇÃO */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('trabalhistas')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <FileText size={18} color="var(--accent-orange)" /> Dados Trabalhistas e Remuneração
                                        </div>
                                        {colabOpenSections.trabalhistas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.trabalhistas && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Departamento / Setor</label>
                                                <input type="text" value={colabForm.department} onChange={(e) => setColabForm(prev => ({ ...prev, department: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
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
                                                <input type="date" value={colabForm.hireDate} onChange={(e) => setColabForm(prev => ({ ...prev, hireDate: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Salário Base (R$)</label>
                                                <input type="text" value={formatCurrencyValue(colabForm.salary)} onChange={(e) => handleCurrencyInputChange(e, 'salary')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Comissão (%)</label>
                                                <input type="number" step="0.1" value={colabForm.commission} onChange={(e) => setColabForm(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vale Alimentação (R$)</label>
                                                <input type="text" value={formatCurrencyValue(colabForm.va)} onChange={(e) => handleCurrencyInputChange(e, 'va')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vale Transporte (R$)</label>
                                                <input type="text" value={formatCurrencyValue(colabForm.vt)} onChange={(e) => handleCurrencyInputChange(e, 'vt')} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SEÇÃO: CARGA HORÁRIA E ESCALA */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('cargaHoraria')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <History size={18} color="var(--accent-orange)" /> Carga Horária e Escala
                                        </div>
                                        {colabOpenSections.cargaHoraria ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.cargaHoraria && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Escala (Ex: 6x1, 5x2, 12x36)</label>
                                                <input type="text" value={colabForm.scale} onChange={(e) => setColabForm(prev => ({ ...prev, scale: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Turno (Ex: Manhã, Tarde, Noite)</label>
                                                <input type="text" value={colabForm.shift} onChange={(e) => setColabForm(prev => ({ ...prev, shift: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
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
                                </div>

                                {/* SEÇÃO: DADOS BANCÁRIOS */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('bancarios')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <Users size={18} color="var(--accent-orange)" /> Dados Bancários
                                        </div>
                                        {colabOpenSections.bancarios ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.bancarios && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Banco</label>
                                                <input type="text" value={colabForm.bank} onChange={(e) => setColabForm(prev => ({ ...prev, bank: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Agência</label>
                                                <input type="text" value={colabForm.bankAgency} onChange={(e) => setColabForm(prev => ({ ...prev, bankAgency: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Conta com Dígito</label>
                                                <input type="text" value={colabForm.bankAccount} onChange={(e) => setColabForm(prev => ({ ...prev, bankAccount: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Chave PIX</label>
                                                <input type="text" value={colabForm.pix} onChange={(e) => setColabForm(prev => ({ ...prev, pix: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SEÇÃO: CHECKLIST DOCUMENTOS PESSOAIS */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('checklistPessoais')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <FolderOpen size={18} color="var(--accent-orange)" /> Checklist de Documentos Pessoais
                                        </div>
                                        {colabOpenSections.checklistPessoais ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.checklistPessoais && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                            <table className="data-table" style={{ width: '100%', minWidth: '700px', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Documento</th>
                                                        <th style={{ textAlign: 'center' }}>Recebido</th>
                                                        <th style={{ textAlign: 'center' }}>Obrigatório</th>
                                                        <th>Data / Validade</th>
                                                        <th>Anexos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {PERSONAL_DOCS_ITEMS.map(item => {
                                                        const docState = colabForm.docChecklist?.[item.id] || { received: false, mandatory: true, date: '', expiry: '', attachments: [], isIndeterminate: false };
                                                        return (
                                                            <tr key={item.id}>
                                                                <td style={{ fontWeight: '600' }}>{item.label}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input type="checkbox" checked={docState.received} onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'received', e.target.checked)} style={{ accentColor: 'var(--accent-orange)', transform: 'scale(1.2)' }} />
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input type="checkbox" checked={docState.mandatory} onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'mandatory', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} />
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                            <input type="checkbox" checked={docState.isIndeterminate} onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'isIndeterminate', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} />
                                                                            Não possui validade
                                                                        </label>
                                                                        {!docState.isIndeterminate && (
                                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                <input type="date" value={docState.date} onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'date', e.target.value)} title="Data de Recebimento / Emissão" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} />
                                                                                <input type="date" value={docState.expiry} onChange={(e) => handleUpdateChecklistValue('personal', item.id, 'expiry', e.target.value)} title="Data de Validade" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                        {docState.attachments?.map((att, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                                                                <Paperclip size={14} color="var(--accent-orange)" />
                                                                                <span style={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', maxWidth: '100px' }} onClick={() => setViewerUrl(att.url)} title={att.name}>{att.name}</span>
                                                                                <button type="button" onClick={() => handleRemoveChecklistAttachment('personal', item.id, idx)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                            </div>
                                                                        ))}
                                                                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px dashed var(--border-color)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                            <Plus size={14} /> Anexar Arquivo
                                                                            <input type="file" onChange={(e) => handleChecklistFileUpload(e, 'personal', item.id)} style={{ display: 'none' }} />
                                                                        </label>
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

                                {/* SEÇÃO: CHECKLIST SAÚDE E SEGURANÇA */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('checklistSaude')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <AlertTriangle size={18} color="var(--accent-orange)" /> Saúde e Segurança Ocupacional (SST)
                                        </div>
                                        {colabOpenSections.checklistSaude ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.checklistSaude && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                            <table className="data-table" style={{ width: '100%', minWidth: '700px', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Item / Exame / Treinamento</th>
                                                        <th style={{ textAlign: 'center' }}>Realizado</th>
                                                        <th style={{ textAlign: 'center' }}>Obrigatório</th>
                                                        <th>Data / Validade</th>
                                                        <th>Anexos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {HEALTH_SAFETY_ITEMS.map(item => {
                                                        const docState = colabForm.healthSafetyChecklist?.[item.id] || { received: false, mandatory: true, date: '', expiry: '', attachments: [], isIndeterminate: false };
                                                        return (
                                                            <tr key={item.id}>
                                                                <td style={{ fontWeight: '600' }}>{item.label}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input type="checkbox" checked={docState.received} onChange={(e) => handleUpdateChecklistValue('health', item.id, 'received', e.target.checked)} style={{ accentColor: 'var(--accent-orange)', transform: 'scale(1.2)' }} />
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input type="checkbox" checked={docState.mandatory} onChange={(e) => handleUpdateChecklistValue('health', item.id, 'mandatory', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} />
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                            <input type="checkbox" checked={docState.isIndeterminate} onChange={(e) => handleUpdateChecklistValue('health', item.id, 'isIndeterminate', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} />
                                                                            Sem validade (Único)
                                                                        </label>
                                                                        {!docState.isIndeterminate && (
                                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                <input type="date" value={docState.date} onChange={(e) => handleUpdateChecklistValue('health', item.id, 'date', e.target.value)} title="Data de Realização" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} />
                                                                                <input type="date" value={docState.expiry} onChange={(e) => handleUpdateChecklistValue('health', item.id, 'expiry', e.target.value)} title="Data de Vencimento" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                        {docState.attachments?.map((att, idx) => (
                                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                                                                <Paperclip size={14} color="var(--accent-orange)" />
                                                                                <span style={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', maxWidth: '100px' }} onClick={() => setViewerUrl(att.url)} title={att.name}>{att.name}</span>
                                                                                <button type="button" onClick={() => handleRemoveChecklistAttachment('health', item.id, idx)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                            </div>
                                                                        ))}
                                                                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px dashed var(--border-color)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                            <Plus size={14} /> Anexar Arquivo
                                                                            <input type="file" onChange={(e) => handleChecklistFileUpload(e, 'health', item.id)} style={{ display: 'none' }} />
                                                                        </label>
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

                                {/* SEÇÃO: OUTROS DOCUMENTOS E ANEXOS */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button type="button" onClick={() => toggleColabSection('outrosDocs')} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <Paperclip size={18} color="var(--accent-orange)" /> Outros Documentos e Anexos Livres
                                        </div>
                                        {colabOpenSections.outrosDocs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    {colabOpenSections.outrosDocs && (
                                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
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

                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
                <div className="pin-modal-overlay active" style={{ zIndex: 10000, overflowY: 'auto' }}>
                    <div className="pin-modal-card" style={{ maxWidth: '850px', width: '90%', margin: '2rem auto' }}>
                        <button className="btn-close-modal" onClick={() => setShowFornModal(false)}><X size={18} /></button>
                        
                        <form onSubmit={handleSaveForn} style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-orange)', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: '800' }}>
                                {editingForn ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h3>

                            {/* Supplier Menu Layout */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', gap: '1rem' }}>
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
                                                onChange={(e) => setFornForm(prev => ({ ...prev, cnpj: e.target.value }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Inscrição Estadual (I.E)</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.ie} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, ie: e.target.value }))}
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
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: CONTATOS */}
                            {fornActiveSection === 'contatos' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Contato Comercial</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.contato.responsavelComercial} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, contato: { ...prev.contato, responsavelComercial: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Contato Financeiro</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.contato.responsavelFinanceiro} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, contato: { ...prev.contato, responsavelFinanceiro: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>WhatsApp</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.contato.whatsapp} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, contato: { ...prev.contato, whatsapp: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>E-mail Comercial</label>
                                            <input 
                                                type="email" 
                                                value={fornForm.contato.emailComercial} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, contato: { ...prev.contato, emailComercial: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION CONTENT: ENDERECO */}
                            {fornActiveSection === 'endereco' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CEP</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.endereco.cep} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, cep: e.target.value } }))}
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
                                                onChange={(e) => setFornForm(prev => ({ ...prev, endereco: { ...prev.endereco, estado: e.target.value.toUpperCase() } }))}
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
                                            <input 
                                                type="text" placeholder="Ex: 30 dias"
                                                value={fornForm.financeiro.prazoPagamento} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, prazoPagamento: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Limite de Crédito (R$)</label>
                                            <input 
                                                type="number" 
                                                value={fornForm.financeiro.limiteCredito} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, limiteCredito: parseFloat(e.target.value) || 0 } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Banco</label>
                                            <input 
                                                type="text" 
                                                value={fornForm.financeiro.banco} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, financeiro: { ...prev.financeiro, banco: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
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
                                            <input 
                                                type="text" placeholder="Ex: 2 dias"
                                                value={fornForm.logistica.prazoEntrega} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, logistica: { ...prev.logistica, prazoEntrega: e.target.value } }))}
                                                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                                            />
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
                                                type="number" 
                                                value={fornForm.logistica.pedidoMinimo} 
                                                onChange={(e) => setFornForm(prev => ({ ...prev, logistica: { ...prev.logistica, pedidoMinimo: parseFloat(e.target.value) || 0 } }))}
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

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
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
        </div>
    );
}
