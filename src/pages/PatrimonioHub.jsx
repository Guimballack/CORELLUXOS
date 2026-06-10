/**
 * Corellux OS - Patrimônio e Materiais Operacionais
 * Componente que controla todos os bens físicos permanentes e não consumíveis da empresa.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCorelluxState, loadUsers } from '../store/corellux-state';
import DbService from '../services/db-service';
import { 
    Boxes, 
    FileText, 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    ClipboardList, 
    RefreshCw, 
    AlertTriangle, 
    TrendingUp, 
    UserCheck, 
    PieChart, 
    Calendar, 
    MapPin, 
    User, 
    DollarSign, 
    CheckCircle, 
    XCircle, 
    PlusCircle, 
    ArrowRightLeft, 
    ChevronRight,
    LogOut, 
    ArrowRight, 
    Lock, 
    Settings, 
    Check, 
    Printer,
    FileSpreadsheet,
    X,
    FolderPlus,
    Hammer,
    Eye
} from 'lucide-react';

export default function PatrimonioHub() {
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser',
        'appUsers',
        'patrimonioActiveTab',
        'patrimonyItems',
        'patrimonyCategories',
        'patrimonyMovements',
        'patrimonyResponsibilities',
        'patrimonyInventories',
        'patrimonyAudits'
    ]);

    // Local UI states
    const activeTab = state.patrimonioActiveTab || 'dashboard';
    const setActiveTab = (tab) => setKey('patrimonioActiveTab', tab);

    const hasAccess = (permissionKey) => {
        const user = state.currentUser;
        if (!user) return false;
        if (user.accessLevel === 'Administrador') return true;
        if (!user.permissions) return false;
        if (user.permissions[permissionKey] === undefined) return true;
        return !!user.permissions[permissionKey];
    };

    useEffect(() => {
        const tab = state.patrimonioActiveTab || 'dashboard';
        const tabList = [
            { id: 'dashboard', perm: 'sub_patrimonio_painel' },
            { id: 'cadastro', perm: 'sub_patrimonio_cadastro' },
            { id: 'categorias', perm: 'sub_patrimonio_categorias' },
            { id: 'movimentacoes', perm: 'sub_patrimonio_movimentacoes' },
            { id: 'setores', perm: 'sub_patrimonio_setores' },
            { id: 'responsabilidade', perm: 'sub_patrimonio_responsabilidade' },
            { id: 'inventario', perm: 'sub_patrimonio_inventario' },
            { id: 'relatorios', perm: 'sub_patrimonio_relatorios' },
            { id: 'auditoria', perm: 'sub_patrimonio_auditoria' }
        ];

        const currentTabConfig = tabList.find(t => t.id === tab);
        if (currentTabConfig && !hasAccess(currentTabConfig.perm)) {
            const firstPermitted = tabList.find(t => hasAccess(t.perm));
            if (firstPermitted) {
                setKey('patrimonioActiveTab', firstPermitted.id);
            }
        }
    }, [state.patrimonioActiveTab, state.currentUser]);

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [sectorFilter, setSectorFilter] = useState('Todos');

    // Modals
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    // Dialogs
    const [dialog, setDialog] = useState(null);

    // Form inputs states
    const [itemForm, setItemForm] = useState({
        code: '',
        name: '',
        category: '',
        subcategory: '',
        unit: 'Unidade',
        qtyActual: 0,
        qtyMin: 0,
        valueUnit: 0,
        sectorActual: 'Almoxarifado',
        location: '',
        acquisitionDate: new Date().toISOString().split('T')[0],
        supplier: '',
        notes: '',
        status: 'Ativo'
    });

    const [categoryForm, setCategoryForm] = useState({
        name: '',
        icon: 'fa-box',
        color: 'color-blue',
        status: 'Ativo'
    });

    const [movementForm, setMovementForm] = useState({
        itemSku: '',
        type: 'Entrada', // Entrada, Saída
        subtype: 'Compra', // Compra, Inventário, Devolução, Transferência, Quebra, Perda, Furto, Descarte
        qty: 1,
        reason: '',
        notes: ''
    });

    const [transferForm, setTransferForm] = useState({
        itemSku: '',
        qty: 1,
        fromSector: '',
        toSector: '',
        reason: ''
    });

    const [respForm, setRespForm] = useState({
        employeeId: '',
        itemSku: '',
        qty: 1,
        deliveryDate: new Date().toISOString().split('T')[0],
        notes: '',
        signature: ''
    });

    const [inventoryForm, setInventoryForm] = useState({
        type: 'Mensal', // Diário, Semanal, Mensal, Trimestral, Anual
        category: 'Todos',
        counts: {} // sku: qtyFound
    });

    // Alert helper
    const showAlert = (message, title = 'Aviso', type = 'info', onConfirm = null) => {
        setDialog({
            type: 'alert',
            title,
            message,
            alertType: type,
            onConfirm: () => {
                setDialog(null);
                if (onConfirm) onConfirm();
            }
        });
    };

    const showConfirm = (message, onConfirm, title = 'Confirmação', alertType = 'warning') => {
        setDialog({
            type: 'confirm',
            title,
            message,
            alertType,
            onConfirm: () => {
                setDialog(null);
                onConfirm();
            },
            onCancel: () => setDialog(null)
        });
    };

    // Load initial data
    const loadAllData = async () => {
        setLoading(true);
        try {
            // Load users
            if (!state.appUsers || state.appUsers.length === 0) {
                await loadUsers();
            }
            // Load patrimonio categories
            const cats = await DbService.getPatrimonyCategories();
            setKey('patrimonyCategories', cats);

            // Load patrimonio items
            const items = await DbService.getPatrimonyItems();
            setKey('patrimonyItems', items);

            // Load movements
            const movs = await DbService.getPatrimonyMovements();
            setKey('patrimonyMovements', movs);

            // Load responsibilities
            const resps = await DbService.getPatrimonyResponsibilities();
            setKey('patrimonyResponsibilities', resps);

            // Load inventories
            const invs = await DbService.getPatrimonyInventories();
            setKey('patrimonyInventories', invs);

            // Load audits
            const audits = await DbService.getPatrimonyAudits();
            setKey('patrimonyAudits', audits);
        } catch (e) {
            console.error('[PatrimonioHub] Erro ao carregar dados:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Active User
    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente' };

    // Standard list of sectors
    const defaultSectors = [
        'Cozinha',
        'Salão',
        'Bar',
        'Produção',
        'Administração',
        'Almoxarifado'
    ];

    // standard list of icons/colors for categories
    const availableIcons = ['fa-utensils', 'fa-tools', 'fa-couch', 'fa-laptop', 'fa-tshirt', 'fa-wrench', 'fa-box', 'fa-file-signature', 'fa-print', 'fa-archive'];
    const availableColors = ['color-blue', 'color-green', 'color-yellow', 'color-purple', 'color-orange', 'color-red', 'color-teal', 'color-lightblue', 'color-pink'];

    // Helper functions for logs
    const logAudit = async (operation, itemSku, field, oldValue, newValue) => {
        const log = {
            id: 'aud_' + Date.now(),
            responsible: currentUser.name,
            operation,
            itemSku,
            field,
            oldValue: String(oldValue),
            newValue: String(newValue),
            timestamp: new Date().toISOString()
        };
        const res = await DbService.savePatrimonyAudit(log);
        if (res.success) {
            const list = state.patrimonyAudits || [];
            setKey('patrimonyAudits', [res.data, ...list]);
        }
    };

    // ITEM HANDLERS
    const handleOpenItemCreate = () => {
        setEditingItem(null);
        setItemForm({
            code: 'PAT-' + Math.floor(1000 + Math.random() * 9000),
            name: '',
            category: state.patrimonyCategories[0]?.name || 'Utensílios',
            subcategory: '',
            unit: 'Unidade',
            qtyActual: 0,
            qtyMin: 0,
            valueUnit: 0,
            sectorActual: 'Almoxarifado',
            location: '',
            acquisitionDate: new Date().toISOString().split('T')[0],
            supplier: '',
            notes: '',
            status: 'Ativo'
        });
        setIsItemModalOpen(true);
    };

    const handleOpenItemEdit = (item) => {
        setEditingItem(item);
        setItemForm({ ...item });
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        if (!itemForm.code || !itemForm.name || !itemForm.category) {
            showAlert('Preencha os campos obrigatórios (Código, Nome e Categoria).', 'Validação', 'warning');
            return;
        }

        // Check code uniqueness
        const codeConflict = state.patrimonyItems.find(i => i.code === itemForm.code && (!editingItem || i.id !== editingItem.id));
        if (codeConflict) {
            showAlert('Já existe um item cadastrado com este código interno.', 'Validação', 'warning');
            return;
        }

        const isNew = !editingItem;
        const result = await DbService.saveItem ? DbService.savePatrimonyItem(itemForm) : DbService.savePatrimonyItem(itemForm);
        
        if (result.success) {
            const saved = result.data;
            const currentList = state.patrimonyItems || [];
            
            if (isNew) {
                setKey('patrimonyItems', [...currentList, saved]);
                await logAudit('Cadastro de Item', saved.code, 'Todos', '-', 'Item criado');
                
                // Cria uma movimentação inicial de estoque se qtyActual > 0
                if (saved.qtyActual > 0) {
                    const newMov = {
                        id: 'mov_' + Date.now(),
                        itemSku: saved.code,
                        itemName: saved.name,
                        type: 'Entrada',
                        subtype: 'Inventário',
                        qty: saved.qtyActual,
                        responsible: currentUser.name,
                        reason: 'Quantidade de semente inicial no cadastro.',
                        notes: 'Lançamento automático de cadastro.',
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        timestamp: new Date().toISOString()
                    };
                    await DbService.savePatrimonyMovement(newMov);
                    const currentMovs = state.patrimonyMovements || [];
                    setKey('patrimonyMovements', [newMov, ...currentMovs]);
                }
            } else {
                setKey('patrimonyItems', currentList.map(i => i.id === saved.id ? saved : i));
                
                // Track fields modified
                const old = editingItem;
                const fields = Object.keys(itemForm);
                for (const f of fields) {
                    if (old[f] !== saved[f] && f !== 'valueTotal') {
                        await logAudit('Edição de Item', saved.code, f, old[f], saved[f]);
                    }
                }
            }

            setIsItemModalOpen(false);
            showAlert('Material salvo com sucesso!', 'Sucesso', 'success');
        } else {
            showAlert('Falha ao salvar material operacinal.', 'Erro', 'error');
        }
    };

    const handleDeleteItem = (item) => {
        showConfirm(`Tem certeza que deseja excluir o item "${item.name}"?`, async () => {
            const res = await DbService.deletePatrimonyItem(item.id);
            if (res.success) {
                const updatedList = state.patrimonyItems.filter(i => i.id !== item.id);
                setKey('patrimonyItems', updatedList);
                await logAudit('Exclusão de Item', item.code, 'Todos', 'Ativo', 'Deletado');
                showAlert('Item excluído com sucesso!', 'Sucesso', 'success');
            } else {
                showAlert('Falha ao excluir item.', 'Erro', 'error');
            }
        });
    };

    // CATEGORY HANDLERS
    const handleOpenCategoryCreate = () => {
        setEditingCategory(null);
        setCategoryForm({
            name: '',
            icon: 'fa-box',
            color: 'color-blue',
            status: 'Ativo'
        });
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!categoryForm.name) {
            showAlert('Preencha o nome da categoria.', 'Validação', 'warning');
            return;
        }

        const conflict = state.patrimonyCategories.find(c => c.name.toLowerCase() === categoryForm.name.toLowerCase() && (!editingCategory || c.id !== editingCategory.id));
        if (conflict) {
            showAlert('Já existe uma categoria cadastrada com este nome.', 'Validação', 'warning');
            return;
        }

        const isNew = !editingCategory;
        const res = await DbService.savePatrimonyCategory(categoryForm);

        if (res.success) {
            const saved = res.data;
            const list = state.patrimonyCategories || [];
            if (isNew) {
                setKey('patrimonyCategories', [...list, saved]);
            } else {
                setKey('patrimonyCategories', list.map(c => c.id === saved.id ? saved : c));
            }
            setIsCategoryModalOpen(false);
            showAlert('Categoria salva com sucesso!', 'Sucesso', 'success');
        } else {
            showAlert('Erro ao salvar categoria.', 'Erro', 'error');
        }
    };

    const handleDeleteCategory = (cat) => {
        // Verifica se há itens usando esta categoria
        const linkedItems = state.patrimonyItems.filter(i => i.category === cat.name);
        if (linkedItems.length > 0) {
            showAlert(`Não é possível excluir esta categoria pois ela está associada a ${linkedItems.length} item(ns).`, 'Ação Impedida', 'error');
            return;
        }

        showConfirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`, async () => {
            const res = await DbService.deletePatrimonyCategory(cat.id);
            if (res.success) {
                setKey('patrimonyCategories', state.patrimonyCategories.filter(c => c.id !== cat.id));
                showAlert('Categoria excluída com sucesso!', 'Sucesso', 'success');
            } else {
                showAlert('Falha ao excluir categoria.', 'Erro', 'error');
            }
        });
    };

    // MOVEMENT HANDLERS
    const handleOpenMovementRegister = () => {
        setMovementForm({
            itemSku: state.patrimonyItems[0]?.code || '',
            type: 'Entrada',
            subtype: 'Compra',
            qty: 1,
            reason: '',
            notes: ''
        });
        setIsMovementModalOpen(true);
    };

    const handleSaveMovement = async (e) => {
        e.preventDefault();
        const { itemSku, type, subtype, qty, reason, notes } = movementForm;
        if (!itemSku || qty <= 0) {
            showAlert('Selecione o item e insira uma quantidade maior que zero.', 'Validação', 'warning');
            return;
        }

        const item = state.patrimonyItems.find(i => i.code === itemSku);
        if (!item) return;

        const oldQty = item.qtyActual;
        let newQty = oldQty;

        if (type === 'Saída') {
            if (qty > oldQty) {
                showAlert(`Quantidade de saída indisponível. Saldo atual: ${oldQty} unidades.`, 'Estoque Insuficiente', 'error');
                return;
            }
            newQty = oldQty - qty;
        } else {
            newQty = oldQty + qty;
        }

        // Salva movimentação
        const newMov = {
            id: 'mov_' + Date.now(),
            itemSku,
            itemName: item.name,
            type,
            subtype,
            qty,
            responsible: currentUser.name,
            reason,
            notes,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
        };

        const res = await DbService.savePatrimonyMovement(newMov);
        if (res.success) {
            // Atualiza saldo do item
            item.qtyActual = newQty;
            item.valueTotal = newQty * item.valueUnit;
            if (newQty === 0 && type === 'Saída') {
                item.status = subtype === 'Quebra' ? 'Quebrado' : (subtype === 'Perda' ? 'Perdido' : 'Baixado');
            } else if (newQty > 0 && item.status !== 'Ativo' && item.status !== 'Em uso' && item.status !== 'Em manutenção') {
                item.status = 'Ativo';
            }
            await DbService.savePatrimonyItem(item);

            // Audit
            await logAudit(`Movimentação (${type} - ${subtype})`, item.code, 'qtyActual', oldQty, newQty);

            // Refresh state
            const currentMovs = state.patrimonyMovements || [];
            setKey('patrimonyMovements', [res.data, ...currentMovs]);
            setKey('patrimonyItems', state.patrimonyItems.map(i => i.id === item.id ? item : i));

            setIsMovementModalOpen(false);
            showAlert('Movimentação registrada com sucesso!', 'Sucesso', 'success');
        } else {
            showAlert('Falha ao salvar movimentação.', 'Erro', 'error');
        }
    };

    // TRANSFER HANDLERS
    const handleOpenTransfer = () => {
        setTransferForm({
            itemSku: state.patrimonyItems[0]?.code || '',
            qty: 1,
            fromSector: state.patrimonyItems[0]?.sectorActual || 'Almoxarifado',
            toSector: defaultSectors.find(s => s !== (state.patrimonyItems[0]?.sectorActual || 'Almoxarifado')) || 'Cozinha',
            reason: ''
        });
        setIsTransferModalOpen(true);
    };

    const handleTransferFormChangeSku = (sku) => {
        const item = state.patrimonyItems.find(i => i.code === sku);
        if (item) {
            setTransferForm(prev => ({
                ...prev,
                itemSku: sku,
                fromSector: item.sectorActual,
                toSector: defaultSectors.find(s => s !== item.sectorActual) || 'Cozinha'
            }));
        }
    };

    const handleSaveTransfer = async (e) => {
        e.preventDefault();
        const { itemSku, qty, fromSector, toSector, reason } = transferForm;
        if (!itemSku || qty <= 0 || !toSector || fromSector === toSector) {
            showAlert('Preencha os setores, escolha uma quantidade maior que zero e garanta que os setores sejam diferentes.', 'Validação', 'warning');
            return;
        }

        const item = state.patrimonyItems.find(i => i.code === itemSku);
        if (!item) return;

        if (qty > item.qtyActual) {
            showAlert(`Quantidade insuficiente para transferência. Saldo atual: ${item.qtyActual} unidades.`, 'Estoque Insuficiente', 'error');
            return;
        }

        // Registra saídas e entradas
        const oldQty = item.qtyActual;
        
        // Cria log de movimentação de transferência enviada
        const movOut = {
            id: 'mov_tr_out_' + Date.now(),
            itemSku,
            itemName: item.name,
            type: 'Saída',
            subtype: 'Transferência enviada',
            qty,
            responsible: currentUser.name,
            reason: `Transferência para o setor ${toSector}: ${reason}`,
            notes: `Transferido do setor ${fromSector} para ${toSector}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
        };

        const movIn = {
            id: 'mov_tr_in_' + Date.now(),
            itemSku,
            itemName: item.name,
            type: 'Entrada',
            subtype: 'Transferência recebida',
            qty,
            responsible: currentUser.name,
            reason: `Transferência do setor ${fromSector}: ${reason}`,
            notes: `Transferido de ${fromSector} para ${toSector}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString()
        };

        await DbService.savePatrimonyMovement(movOut);
        await DbService.savePatrimonyMovement(movIn);

        // Atualiza item (Transfere o setor do item e divide se necessário)
        // Como o item tem setorActual fixo no cadastro simplificado, atualizamos o setor do item para o destino.
        const oldSector = item.sectorActual;
        item.sectorActual = toSector;
        await DbService.savePatrimonyItem(item);

        // Audit
        await logAudit('Transferência de Setor', item.code, 'sectorActual', oldSector, toSector);

        // Refresh lists
        const currentMovs = state.patrimonyMovements || [];
        setKey('patrimonyMovements', [movIn, movOut, ...currentMovs]);
        setKey('patrimonyItems', state.patrimonyItems.map(i => i.id === item.id ? item : i));

        setIsTransferModalOpen(false);
        showAlert(`Transferência de ${qty}x ${item.name} realizada com sucesso!`, 'Sucesso', 'success');
    };

    // RESPONSIBILITY HANDLERS (CAUTELAS)
    const handleOpenResponsibility = () => {
        // Encontra primeiro funcionário
        const firstEmployee = state.appUsers.filter(u => u.status === 'Ativo')[0];
        setRespForm({
            employeeId: firstEmployee ? firstEmployee.id : '',
            itemSku: state.patrimonyItems[0]?.code || '',
            qty: 1,
            deliveryDate: new Date().toISOString().split('T')[0],
            notes: '',
            signature: ''
        });
        setIsResponsibilityModalOpen(true);
    };

    const handleSaveResponsibility = async (e) => {
        e.preventDefault();
        const { employeeId, itemSku, qty, deliveryDate, notes, signature } = respForm;
        if (!employeeId || !itemSku || qty <= 0 || !signature.trim()) {
            showAlert('Preencha funcionário, item, quantidade e assinatura digital.', 'Validação', 'warning');
            return;
        }

        const employee = state.appUsers.find(u => String(u.id) === String(employeeId));
        const item = state.patrimonyItems.find(i => i.code === itemSku);
        if (!employee || !item) return;

        if (qty > item.qtyActual) {
            showAlert(`Quantidade indisponível para entrega. Saldo atual: ${item.qtyActual} unidades.`, 'Quantidade Insuficiente', 'error');
            return;
        }

        // Salva Cautela
        const newResp = {
            id: 'resp_' + Date.now(),
            employeeId: parseInt(employeeId),
            employeeName: employee.name,
            itemSku,
            itemName: item.name,
            qty,
            deliveryDate,
            returnDate: null,
            signature,
            status: 'Pendente',
            notes
        };

        const res = await DbService.savePatrimonyResponsibility(newResp);
        if (res.success) {
            // Deduz a quantidade disponível e marca item como "Em uso"
            const oldQty = item.qtyActual;
            const newQty = Math.max(0, oldQty - qty);
            item.qtyActual = newQty;
            item.valueTotal = newQty * item.valueUnit;
            if (newQty === 0) item.status = 'Em uso';
            await DbService.savePatrimonyItem(item);

            // Cria movimentação automática de saída (cautela)
            const newMov = {
                id: 'mov_' + Date.now(),
                itemSku,
                itemName: item.name,
                type: 'Saída',
                subtype: 'Transferência enviada',
                qty,
                responsible: currentUser.name,
                reason: `Item entregue para termo de responsabilidade de: ${employee.name}`,
                notes: `Cautela #${res.data.id} gerada.`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date().toISOString()
            };
            await DbService.savePatrimonyMovement(newMov);

            // Audit
            await logAudit('Entrega de Cautela', item.code, 'qtyActual', oldQty, newQty);

            // Update local state
            const currentResps = state.patrimonyResponsibilities || [];
            setKey('patrimonyResponsibilities', [res.data, ...currentResps]);
            setKey('patrimonyItems', state.patrimonyItems.map(i => i.id === item.id ? item : i));
            const currentMovs = state.patrimonyMovements || [];
            setKey('patrimonyMovements', [newMov, ...currentMovs]);

            setIsResponsibilityModalOpen(false);
            showAlert('Cautela e termo de responsabilidade gerados com sucesso!', 'Sucesso', 'success');
        } else {
            showAlert('Erro ao gerar termo de cautela.', 'Erro', 'error');
        }
    };

    const handleReturnResponsibility = async (resp) => {
        showConfirm(`Deseja registrar a devolução das ${resp.qty} unidade(s) de "${resp.itemName}" entregues para ${resp.employeeName}?`, async () => {
            const item = state.patrimonyItems.find(i => i.code === resp.itemSku);
            if (!item) return;

            resp.returnDate = new Date().toISOString().split('T')[0];
            resp.status = 'Devolvido';

            const res = await DbService.savePatrimonyResponsibility(resp);
            if (res.success) {
                // Devolve a quantidade ao saldo do item e atualiza status
                const oldQty = item.qtyActual;
                const newQty = oldQty + resp.qty;
                item.qtyActual = newQty;
                item.valueTotal = newQty * item.valueUnit;
                if (item.status === 'Em uso') item.status = 'Ativo';
                await DbService.savePatrimonyItem(item);

                // Cria movimentação automática de entrada (devolução cautela)
                const newMov = {
                    id: 'mov_' + Date.now(),
                    itemSku: resp.itemSku,
                    itemName: resp.itemName,
                    type: 'Entrada',
                    subtype: 'Devolução',
                    qty: resp.qty,
                    responsible: currentUser.name,
                    reason: `Item devolvido por ${resp.employeeName}. Fim do termo de responsabilidade.`,
                    notes: `Cautela #${resp.id} baixada.`,
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: new Date().toISOString()
                };
                await DbService.savePatrimonyMovement(newMov);

                // Audit
                await logAudit('Devolução de Cautela', item.code, 'qtyActual', oldQty, newQty);

                // Refresh state
                setKey('patrimonyResponsibilities', state.patrimonyResponsibilities.map(r => r.id === resp.id ? res.data : r));
                setKey('patrimonyItems', state.patrimonyItems.map(i => i.id === item.id ? item : i));
                const currentMovs = state.patrimonyMovements || [];
                setKey('patrimonyMovements', [newMov, ...currentMovs]);

                showAlert('Devolução homologada e cautela concluída!', 'Sucesso', 'success');
            } else {
                showAlert('Erro ao registrar devolução.', 'Erro', 'error');
            }
        });
    };

    // INVENTORY HANDLERS
    const handleOpenInventory = () => {
        const initialCounts = {};
        state.patrimonyItems.forEach(i => {
            initialCounts[i.code] = i.qtyActual;
        });

        setInventoryForm({
            type: 'Mensal',
            category: 'Todos',
            counts: initialCounts
        });
        setIsInventoryModalOpen(true);
    };

    const handleInventoryCountChange = (sku, val) => {
        const cleaned = Math.max(0, parseInt(val) || 0);
        setInventoryForm(prev => ({
            ...prev,
            counts: {
                ...prev.counts,
                [sku]: cleaned
            }
        }));
    };

    const handleSaveInventory = async (e) => {
        e.preventDefault();
        const { type, category, counts } = inventoryForm;
        
        const targetItems = state.patrimonyItems.filter(i => {
            if (i.status !== 'Ativo') return false;
            if (category !== 'Todos' && i.category !== category) return false;
            return true;
        });

        if (targetItems.length === 0) {
            showAlert('Nenhum material ativo nesta categoria para inventariar.', 'Erro', 'error');
            return;
        }

        // Calcula divergências
        const divergencesList = [];
        let totalDivergences = 0;

        for (const item of targetItems) {
            const expected = item.qtyActual;
            const found = counts[item.code] !== undefined ? counts[item.code] : expected;
            const diff = found - expected;

            if (diff !== 0) {
                totalDivergences++;
                divergencesList.push({
                    sku: item.code,
                    name: item.name,
                    expected,
                    found,
                    difference: diff,
                    valueUnit: item.valueUnit,
                    lossValue: diff * item.valueUnit
                });
            }
        }

        showConfirm(
            `Inventário finalizado com ${totalDivergences} divergência(s) encontrada(s). Deseja homologar o relatório e aplicar as correções de saldo automaticamente?`,
            async () => {
                // Salva inventário
                const newInv = {
                    id: 'inv_' + Date.now(),
                    type,
                    category,
                    responsible: currentUser.name,
                    date: new Date().toISOString().split('T')[0],
                    status: 'Concluído',
                    divergences: divergencesList
                };

                const res = await DbService.savePatrimonyInventory(newInv);
                if (res.success) {
                    // Aplica correções
                    for (const div of divergencesList) {
                        const item = state.patrimonyItems.find(i => i.code === div.sku);
                        if (item) {
                            const old = item.qtyActual;
                            item.qtyActual = div.found;
                            item.valueTotal = div.found * item.valueUnit;
                            
                            // Cria movimentação automática
                            const adjMov = {
                                id: 'mov_inv_adj_' + Date.now() + '_' + item.code,
                                itemSku: item.code,
                                itemName: item.name,
                                type: div.difference > 0 ? 'Entrada' : 'Saída',
                                subtype: 'Inventário',
                                qty: Math.abs(div.difference),
                                responsible: currentUser.name,
                                reason: `Ajuste automático de inventário ${type} (${category}).`,
                                notes: `Divergência homologada de ${old} para ${div.found}.`,
                                date: new Date().toISOString().split('T')[0],
                                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                timestamp: new Date().toISOString()
                            };

                            await DbService.savePatrimonyItem(item);
                            await DbService.savePatrimonyMovement(adjMov);
                            await logAudit('Ajuste de Inventário', item.code, 'qtyActual', old, div.found);
                        }
                    }

                    // Refresh
                    await loadAllData();
                    setIsInventoryModalOpen(false);
                    showAlert('Inventário homologado e saldos corrigidos!', 'Sucesso', 'success');
                }
            },
            'Homologar Inventário',
            'info'
        );
    };


    // CALCULATIONS & KPIS
    const items = state.patrimonyItems || [];
    const categories = state.patrimonyCategories || [];
    const movements = state.patrimonyMovements || [];
    const responsibilities = state.patrimonyResponsibilities || [];
    const inventories = state.patrimonyInventories || [];
    const audits = state.patrimonyAudits || [];

    const totalCadastrados = items.length;
    const totalAtivos = items.filter(i => i.status === 'Ativo').length;
    const totalManutencao = items.filter(i => i.status === 'Em manutenção').length;
    const totalPerdidos = items.filter(i => i.status === 'Perdido').length;
    const totalQuebrados = items.filter(i => i.status === 'Quebrado').length;
    const totalValue = items.reduce((acc, i) => acc + (parseFloat(i.valueTotal) || 0), 0);

    // low stock alert list
    const lowStockAlerts = items.filter(i => i.qtyActual < i.qtyMin && i.status === 'Ativo');

    // sector distribution counts
    const distributionBySector = {};
    items.forEach(i => {
        if (i.qtyActual > 0) {
            distributionBySector[i.sectorActual] = (distributionBySector[i.sectorActual] || 0) + i.qtyActual;
        }
    });

    // filtered items list
    const filteredItems = items.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.toLowerCase().includes(searchQuery.toLowerCase()) || (i.supplier && i.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = categoryFilter === 'Todos' || i.category === categoryFilter;
        const matchesStatus = statusFilter === 'Todos' || i.status === statusFilter;
        const matchesSector = sectorFilter === 'Todos' || i.sectorActual === sectorFilter;
        return matchesSearch && matchesCategory && matchesStatus && matchesSector;
    });

    // Print Report helper
    const handlePrint = (reportName) => {
        const printWindow = window.open('', '_blank');
        const content = document.getElementById(reportName)?.innerHTML || '';
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Corellux OS - Relatório de Patrimônio</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 2rem; color: #1e293b; background: #fff; }
                        h1 { color: #f36b1d; margin-bottom: 0.5rem; font-size: 1.5rem; }
                        h2 { color: #64748b; font-size: 1rem; margin-top: 0; margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 0.85rem; }
                        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                        th { background: #f8fafc; font-weight: bold; }
                        .text-right { text-align: right; }
                        .footer { margin-top: 3rem; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; text-align: center; }
                    </style>
                </head>
                <body>
                    ${content}
                    <div class="footer">Relatório gerado pelo Corellux OS em ${new Date().toLocaleString('pt-BR')} por ${currentUser.name}.</div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'row', background: '#090d16', color: '#f3f4f6', height: '100%', overflowY: 'hidden', padding: 0 }}>
            {/* CSS SaaS Premium Styling */}
            <style dangerouslySetInnerHTML={{__html: `
                .pat-sidebar {
                    width: 260px;
                    background: rgba(15, 23, 42, 0.65);
                    border-right: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem 1rem;
                    box-sizing: border-box;
                    backdrop-filter: blur(16px);
                }
                .pat-sidebar-btn {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.8rem 1.1rem;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 0.88rem;
                    font-weight: 600;
                    text-align: left;
                    margin-bottom: 0.45rem;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .pat-sidebar-btn:hover {
                    background: rgba(255, 255, 255, 0.04);
                    color: #fff;
                    transform: translateX(3px);
                }
                .pat-sidebar-btn.active {
                    background: rgba(243, 107, 29, 0.12);
                    color: var(--accent-orange);
                    box-shadow: inset 3px 0 0 var(--accent-orange);
                }
                .pat-main-container {
                    flex: 1;
                    padding: 2.5rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    background: radial-gradient(circle at top right, rgba(243, 107, 29, 0.03), transparent 60%);
                }
                .pat-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .pat-kpi-card {
                    background: rgba(30, 41, 59, 0.22);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(8px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .pat-kpi-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(243, 107, 29, 0.2);
                    box-shadow: 0 8px 30px rgba(243, 107, 29, 0.08);
                    background: rgba(30, 41, 59, 0.35);
                }
                .pat-kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: var(--accent-orange);
                }
                .pat-kpi-card.green::before { background: var(--accent-green); }
                .pat-kpi-card.yellow::before { background: var(--accent-yellow); }
                .pat-kpi-card.red::before { background: var(--accent-red); }
                .pat-kpi-card.blue::before { background: var(--accent-blue); }
                .pat-kpi-card.purple::before { background: var(--accent-purple); }
                
                .pat-kpi-card h6 { margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
                .pat-kpi-card h3 { margin: 0.5rem 0 0 0; font-size: 1.9rem; font-weight: 800; color: #fff; letter-spacing: -0.5px; }

                .pat-grid-dashboard {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.75rem;
                    margin-bottom: 2rem;
                }
                @media(max-width: 900px) {
                    .pat-grid-dashboard {
                        grid-template-columns: 1fr;
                    }
                }
                .pat-panel-card {
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 1.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    backdrop-filter: blur(6px);
                    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                }
                .pat-panel-card:hover {
                    border-color: rgba(255,255,255,0.08);
                    background: rgba(30, 41, 59, 0.2);
                }
                .pat-panel-card h4 { 
                    margin: 0; 
                    color: var(--accent-orange); 
                    font-size: 1.05rem; 
                    font-weight: 800; 
                    border-bottom: 1px solid rgba(255,255,255,0.06); 
                    padding-bottom: 0.75rem;
                    letter-spacing: 0.5px;
                }

                /* Categories Cards styling (chk-menu-card) */
                .chk-menu-card {
                    background: rgba(30, 41, 59, 0.25) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    border-radius: 16px !important;
                    padding: 1.25rem !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 1.25rem !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    position: relative !important;
                    overflow: hidden !important;
                    text-align: left !important;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15) !important;
                    height: 110px !important;
                }
                .chk-menu-card:hover {
                    background: rgba(30, 41, 59, 0.45) !important;
                    border-color: rgba(243, 107, 29, 0.4) !important;
                    transform: translateY(-4px) !important;
                    box-shadow: 0 12px 24px rgba(243, 107, 29, 0.18) !important;
                }
                .chk-menu-card::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 4px !important;
                    height: 100% !important;
                    background: #475569 !important;
                    transition: background 0.3s ease !important;
                }
                .chk-menu-card:hover::before {
                    background: var(--accent-orange) !important;
                }
                .chk-menu-card-icon {
                    width: 48px !important;
                    height: 48px !important;
                    border-radius: 12px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    color: #fff !important;
                    transition: all 0.3s ease !important;
                    flex-shrink: 0 !important;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2) !important;
                }
                .chk-menu-card:hover .chk-menu-card-icon {
                    transform: scale(1.08) !important;
                }

                /* Categories Color Overrides with Gradients */
                .chk-menu-card-icon.color-blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important; }
                .chk-menu-card-icon.color-green { background: linear-gradient(135deg, #10b981, #059669) !important; }
                .chk-menu-card-icon.color-yellow { background: linear-gradient(135deg, #f59e0b, #d97706) !important; }
                .chk-menu-card-icon.color-purple { background: linear-gradient(135deg, #8b5cf6, #6d28d9) !important; }
                .chk-menu-card-icon.color-orange { background: linear-gradient(135deg, #f97316, #ea580c) !important; }
                .chk-menu-card-icon.color-red { background: linear-gradient(135deg, #ef4444, #b91c1c) !important; }
                .chk-menu-card-icon.color-teal { background: linear-gradient(135deg, #14b8a6, #0f766e) !important; }
                .chk-menu-card-icon.color-lightblue { background: linear-gradient(135deg, #0ea5e9, #0284c7) !important; }
                .chk-menu-card-icon.color-pink { background: linear-gradient(135deg, #ec4899, #be185d) !important; }

                .chk-menu-card-content {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 0.25rem !important;
                    flex: 1 !important;
                }
                .chk-menu-card-content h3 {
                    margin: 0 !important;
                    font-size: 0.95rem !important;
                    font-weight: 800 !important;
                    color: #fff !important;
                    letter-spacing: 0.5px !important;
                }
                .chk-menu-card-content p {
                    margin: 0 !important;
                    font-size: 0.78rem !important;
                    color: #94a3b8 !important;
                    line-height: 1.4 !important;
                }

                .chk-menu-card .action-btn-sm {
                    width: 28px !important;
                    height: 28px !important;
                    border-radius: 50% !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: rgba(255, 255, 255, 0.03) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    color: #94a3b8 !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                .chk-menu-card .action-btn-sm:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    color: #fff !important;
                    transform: scale(1.1) !important;
                }
                .chk-menu-card .action-btn-sm.edit:hover {
                    border-color: rgba(243, 107, 29, 0.4) !important;
                    color: var(--accent-orange) !important;
                    background: rgba(243, 107, 29, 0.1) !important;
                }
                .chk-menu-card .action-btn-sm.delete:hover {
                    border-color: rgba(239, 68, 68, 0.4) !important;
                    color: var(--accent-red) !important;
                    background: rgba(239, 68, 68, 0.1) !important;
                }

                /* Dropdown Filters (chk-filter-select) */
                .chk-filter-select {
                    background: rgba(15, 23, 42, 0.6) !important;
                    border: 1px solid rgba(255,255,255,0.08) !important;
                    border-radius: 8px !important;
                    color: #fff !important;
                    padding: 0.5rem 1rem !important;
                    outline: none !important;
                    cursor: pointer !important;
                    font-size: 0.82rem !important;
                    font-weight: 600 !important;
                    transition: all 0.2s ease !important;
                    height: 38px !important;
                }
                .chk-filter-select:hover {
                    border-color: rgba(243, 107, 29, 0.4) !important;
                    background: rgba(30, 41, 59, 0.5) !important;
                }
                .chk-filter-select:focus {
                    border-color: var(--accent-orange) !important;
                    box-shadow: 0 0 0 2px rgba(243, 107, 29, 0.2) !important;
                }
                .chk-filter-select option {
                    background: #0f172a !important;
                    color: #fff !important;
                }

                /* Form Inputs inside Modals (input-title) */
                .input-title {
                    background: rgba(15, 23, 42, 0.6) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: 8px !important;
                    color: #fff !important;
                    padding: 0.65rem 0.85rem !important;
                    outline: none !important;
                    font-size: 0.88rem !important;
                    transition: all 0.2s ease !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                }
                .input-title:focus {
                    border-color: var(--accent-orange) !important;
                    box-shadow: 0 0 0 2px rgba(243, 107, 29, 0.15) !important;
                }
                .input-title::placeholder {
                    color: #475569 !important;
                }
                select.input-title {
                    cursor: pointer !important;
                    appearance: none !important;
                    background-image: url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><polyline points='6 9 12 15 18 9'></polyline></svg>") !important;
                    background-repeat: no-repeat !important;
                    background-position: right 0.85rem center !important;
                    background-size: 1rem !important;
                    padding-right: 2.5rem !important;
                }
                select.input-title option {
                    background: #0f172a !important;
                    color: #fff !important;
                    padding: 0.5rem !important;
                }
                input[type="date"].input-title {
                    color-scheme: dark !important;
                }

                .pat-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.88rem;
                }
                .pat-table th {
                    background: rgba(15, 23, 42, 0.5);
                    color: #94a3b8;
                    font-weight: 700;
                    padding: 0.9rem 1.25rem;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    text-transform: uppercase;
                    font-size: 0.72rem;
                    letter-spacing: 0.8px;
                }
                .pat-table td {
                    padding: 0.9rem 1.25rem;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                    color: #e2e8f0;
                    transition: all 0.15s ease;
                }
                .pat-table tr:hover td {
                    background: rgba(255,255,255,0.02);
                    color: #fff;
                }

                .pat-status-badge {
                    padding: 0.25rem 0.6rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: inline-block;
                }
                .pat-status-badge.ativo { background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
                .pat-status-badge.em-uso { background: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
                .pat-status-badge.em-manutenção { background: rgba(234, 179, 8, 0.12); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.2); }
                .pat-status-badge.quebrado { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
                .pat-status-badge.perdido { background: rgba(249, 115, 22, 0.12); color: #ff9d5c; border: 1px solid rgba(249, 115, 22, 0.2); }
                .pat-status-badge.baixado { background: rgba(100, 116, 139, 0.12); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.2); }

                .pat-report-sheet {
                    background: #ffffff;
                    color: #1e293b;
                    padding: 3rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    font-family: sans-serif;
                    margin-bottom: 2rem;
                    max-width: 900px;
                    align-self: center;
                    width: 100%;
                }
                .pat-report-sheet table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 1.5rem;
                }
                .pat-report-sheet th {
                    background: #f1f5f9;
                    color: #475569;
                    font-weight: bold;
                    padding: 0.6rem;
                    border-bottom: 2px solid #cbd5e1;
                    font-size: 0.8rem;
                }
                .pat-report-sheet td {
                    padding: 0.6rem;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.8rem;
                    color: #334155;
                }
            `}} />

            {/* SIDEBAR */}
            <aside className="pat-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
                    <Boxes size={24} style={{ color: 'var(--accent-orange)' }} />
                    <span style={{ fontStyle: 'normal', fontWeight: 800, fontSize: '0.98rem', color: '#fff', letterSpacing: '0.5px' }}>PATRIMÔNIO</span>
                </div>

                <div style={{ flex: 1 }}>
                    {hasAccess('sub_patrimonio_painel') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                            <PieChart size={18} /> Dashboard
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_cadastro') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'cadastro' ? 'active' : ''}`} onClick={() => setActiveTab('cadastro')}>
                            <Boxes size={18} /> Cadastro de Bens
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_categorias') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}>
                            <FolderPlus size={18} /> Categorias
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_movimentacoes') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'movimentacoes' ? 'active' : ''}`} onClick={() => setActiveTab('movimentacoes')}>
                            <TrendingUp size={18} /> Movimentações
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_setores') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'setores' ? 'active' : ''}`} onClick={() => setActiveTab('setores')}>
                            <MapPin size={18} /> Controle por Setor
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_responsabilidade') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'responsabilidade' ? 'active' : ''}`} onClick={() => setActiveTab('responsabilidade')}>
                            <UserCheck size={18} /> Responsabilidade
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_inventario') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => setActiveTab('inventario')}>
                            <ClipboardList size={18} /> Inventário Físico
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_relatorios') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveTab('relatorios')}>
                            <FileText size={18} /> Relatórios
                        </button>
                    )}
                    {hasAccess('sub_patrimonio_auditoria') && (
                        <button className={`pat-sidebar-btn ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => setActiveTab('auditoria')}>
                            <Hammer size={18} /> Log de Auditoria
                        </button>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="pat-main-container">

                {/* TAB 1: DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <>
                        <div className="pat-kpi-grid">
                            <div className="pat-kpi-card blue">
                                <h6>Bens Cadastrados</h6>
                                <h3>{totalCadastrados}</h3>
                            </div>
                            <div className="pat-kpi-card green">
                                <h6>Bens Ativos</h6>
                                <h3>{totalAtivos}</h3>
                            </div>
                            <div className="pat-kpi-card yellow">
                                <h6>Em Manutenção</h6>
                                <h3>{totalManutencao}</h3>
                            </div>
                            <div className="pat-kpi-card red">
                                <h6>Bens Quebrados</h6>
                                <h3>{totalQuebrados}</h3>
                            </div>
                            <div className="pat-kpi-card red">
                                <h6>Bens Perdidos</h6>
                                <h3>{totalPerdidos}</h3>
                            </div>
                            <div className="pat-kpi-card purple">
                                <h6>Valor Total Patrimônio</h6>
                                <h3>{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                            </div>
                        </div>

                        <div className="pat-grid-dashboard">
                            {/* Alertas de estoque mínimo */}
                            <div className="pat-panel-card">
                                <h4>Alertas de Estoque Mínimo</h4>
                                <div style={{ overflowY: 'auto', maxHeight: '250px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {lowStockAlerts.length === 0 ? (
                                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>Nenhum alerta pendente. Todos os bens acima do mínimo.</p>
                                    ) : (
                                        lowStockAlerts.map(i => (
                                            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>{i.name}</span>
                                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mínimo: {i.qtyMin} | Atual: {i.qtyActual} ({i.unit})</span>
                                                    </div>
                                                </div>
                                                <span style={{ color: 'var(--accent-red)', fontSize: '0.78rem', fontWeight: 700 }}>Faltam {i.qtyMin - i.qtyActual}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quantidade por setor */}
                            <div className="pat-panel-card">
                                <h4>Materiais por Setor</h4>
                                <div style={{ overflowY: 'auto', maxHeight: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {Object.keys(distributionBySector).length === 0 ? (
                                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>Nenhum bem distribuído pelos setores.</p>
                                    ) : (
                                        Object.entries(distributionBySector).map(([sec, qty]) => (
                                            <div key={sec} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sec}</span>
                                                <span style={{ color: 'var(--accent-orange)', fontSize: '0.85rem', fontWeight: 700 }}>{qty} unidades</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ultimas movimentacoes */}
                        <div className="pat-panel-card" style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <h4 style={{ border: 'none', padding: 0, margin: 0 }}>Últimas Movimentações</h4>
                                <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setActiveTab('movimentacoes')}>Ver todas</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="pat-table">
                                    <thead>
                                        <tr>
                                            <th>Data/Hora</th>
                                            <th>Material</th>
                                            <th>Tipo</th>
                                            <th>Origem/Destino</th>
                                            <th>Qtd</th>
                                            <th>Responsável</th>
                                            <th>Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.slice(0, 5).map(m => (
                                            <tr key={m.id}>
                                                <td>{m.date.split('-').reverse().join('/')} {m.time?.substring(0, 5)}</td>
                                                <td>{m.itemName} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>({m.itemSku})</span></td>
                                                <td>
                                                    <span style={{ 
                                                        color: m.type === 'Entrada' ? '#4ade80' : '#f87171', 
                                                        background: m.type === 'Entrada' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 
                                                    }}>
                                                        {m.type} - {m.subtype}
                                                    </span>
                                                </td>
                                                <td>{m.notes || '-'}</td>
                                                <td>{m.qty}</td>
                                                <td>{m.responsible}</td>
                                                <td>{m.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: CADASTRO */}
                {activeTab === 'cadastro' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                <div className="search-box" style={{ width: '220px', margin: 0 }}>
                                    <Search size={16} />
                                    <input type="text" placeholder="Buscar SKU, nome..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <select className="chk-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                    <option value="Todos">Todas Categorias</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <select className="chk-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="Todos">Todos Status</option>
                                    <option value="Ativo">Ativo</option>
                                    <option value="Em uso">Em uso</option>
                                    <option value="Em manutenção">Em manutenção</option>
                                    <option value="Quebrado">Quebrado</option>
                                    <option value="Perdido">Perdido</option>
                                    <option value="Baixado">Baixado</option>
                                </select>
                                <select className="chk-filter-select" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
                                    <option value="Todos">Todos Setores</option>
                                    {defaultSectors.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <button className="btn-secondary" onClick={handleOpenItemCreate} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <Plus size={16} /> NOVO MATERIAL
                            </button>
                        </div>

                        <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="pat-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Nome</th>
                                            <th>Categoria</th>
                                            <th>Setor Atual</th>
                                            <th>Localização</th>
                                            <th>Qtd</th>
                                            <th>Valor Unit.</th>
                                            <th>Valor Total</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map(i => (
                                            <tr key={i.id}>
                                                <td style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>{i.code}</td>
                                                <td style={{ fontWeight: 600 }}>{i.name}</td>
                                                <td>{i.category}</td>
                                                <td>{i.sectorActual}</td>
                                                <td>{i.location || '-'}</td>
                                                <td>{i.qtyActual} {i.unit}</td>
                                                <td>{i.valueUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                <td style={{ fontWeight: 700 }}>{i.valueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                <td>
                                                    <span className={`pat-status-badge ${i.status.toLowerCase().replace(' ', '-')}`}>
                                                        {i.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="action-btn-sm edit" title="Editar" onClick={() => handleOpenItemEdit(i)}><Edit size={14} /></button>
                                                    <button className="action-btn-sm delete" title="Excluir" onClick={() => handleDeleteItem(i)}><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 3: CATEGORIAS */}
                {activeTab === 'categorias' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            <button className="btn-secondary" onClick={handleOpenCategoryCreate} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <Plus size={16} /> NOVA CATEGORIA
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {categories.map(c => (
                                <div key={c.id} className="chk-menu-card" style={{ height: '110px' }}>
                                    <div className={`chk-menu-card-icon ${c.color || 'color-blue'}`}>
                                        <i className={`fas ${c.icon || 'fa-box'}`} style={{ fontSize: '1.1rem' }}></i>
                                    </div>
                                    <div className="chk-menu-card-content">
                                        <h3>{c.name.toUpperCase()}</h3>
                                        <p>Status: {c.status}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
                                        <button className="action-btn-sm edit" style={{ margin: 0 }} onClick={() => { setEditingCategory(c); setCategoryForm({ ...c }); setIsCategoryModalOpen(true); }}><Edit size={14} /></button>
                                        <button className="action-btn-sm delete" style={{ margin: 0 }} onClick={() => handleDeleteCategory(c)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* TAB 4: MOVIMENTAÇÕES */}
                {activeTab === 'movimentacoes' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            <button className="btn-secondary" onClick={handleOpenMovementRegister} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <Plus size={16} /> REGISTRAR MOVIMENTAÇÃO
                            </button>
                        </div>

                        <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ border: 'none', padding: 0 }}>Histórico de Lançamentos</h4>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="pat-table">
                                    <thead>
                                        <tr>
                                            <th>Data/Hora</th>
                                            <th>Item SKU</th>
                                            <th>Nome do Item</th>
                                            <th>Tipo</th>
                                            <th>Subtipo</th>
                                            <th>Qtd</th>
                                            <th>Responsável</th>
                                            <th>Motivo / Ocorrência</th>
                                            <th>Anotações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map(m => (
                                            <tr key={m.id}>
                                                <td>{m.date.split('-').reverse().join('/')} {m.time?.substring(0, 5)}</td>
                                                <td style={{ fontWeight: 700 }}>{m.itemSku}</td>
                                                <td style={{ fontWeight: 600 }}>{m.itemName}</td>
                                                <td>
                                                    <span style={{ 
                                                        color: m.type === 'Entrada' ? '#4ade80' : '#f87171',
                                                        background: m.type === 'Entrada' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 
                                                    }}>
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td>{m.subtype}</td>
                                                <td style={{ fontWeight: 700 }}>{m.qty}</td>
                                                <td>{m.responsible}</td>
                                                <td>{m.reason || '-'}</td>
                                                <td>{m.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 5: SETORES */}
                {activeTab === 'setores' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            <button className="btn-secondary" onClick={handleOpenTransfer} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <ArrowRightLeft size={16} /> TRANSFERIR MATERIAL
                            </button>
                        </div>

                        <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <h4>Inventário Físico Distribuído por Setor</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                {defaultSectors.map(sec => {
                                    const secItems = items.filter(i => i.sectorActual === sec && i.qtyActual > 0);
                                    const secValue = secItems.reduce((acc, i) => acc + i.valueTotal, 0);
                                    const secQty = secItems.reduce((acc, i) => acc + i.qtyActual, 0);

                                    return (
                                        <div key={sec} style={{ background: 'rgba(30,41,59,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', textTransform: 'uppercase' }}>{sec}</span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', fontWeight: 700 }}>{secQty} itens</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', flex: 1 }}>
                                                {secItems.length === 0 ? (
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum material neste setor.</span>
                                                ) : (
                                                    secItems.map(i => (
                                                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span>{i.name}</span>
                                                            <span style={{ fontWeight: 700 }}>{i.qtyActual} {i.unit}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                <span>Valor Patrimonial:</span>
                                                <span style={{ fontWeight: 700, color: '#fff' }}>{secValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 6: RESPONSABILIDADE */}
                {activeTab === 'responsabilidade' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            <button className="btn-secondary" onClick={handleOpenResponsibility} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <UserCheck size={16} /> DISTRIBUIR CAUTELA
                            </button>
                        </div>

                        <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <h4>Termos de Responsabilidade Ativos (Cautelas)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                {responsibilities.map(r => {
                                    const isPendente = r.status === 'Pendente';
                                    return (
                                        <div key={r.id} style={{ background: 'rgba(30,41,59,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <User size={14} style={{ color: 'var(--accent-orange)' }} /> {r.employeeName}
                                                </span>
                                                <span style={{ 
                                                    padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                                    background: isPendente ? 'rgba(234, 179, 8, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                                    color: isPendente ? '#facc15' : '#4ade80'
                                                }}>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem' }}>
                                                <div>Item: <strong>{r.itemName}</strong> <span style={{ opacity: 0.6 }}>({r.itemSku})</span></div>
                                                <div>Quantidade entregue: <strong>{r.qty} unidades</strong></div>
                                                <div>Data Entrega: <strong>{r.deliveryDate.split('-').reverse().join('/')}</strong></div>
                                                {r.returnDate && <div>Data Devolução: <strong>{r.returnDate.split('-').reverse().join('/')}</strong></div>}
                                                <div>Assinatura Termo: <em>{r.signature}</em></div>
                                                {r.notes && <div style={{ fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.3rem', marginTop: '0.3rem' }}>Anotação: {r.notes}</div>}
                                            </div>

                                            {isPendente && (
                                                <button 
                                                    className="btn-secondary" 
                                                    style={{ 
                                                        marginTop: '0.5rem', padding: '0.4rem', width: '100%', fontSize: '0.78rem',
                                                        border: '1px solid var(--accent-green)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                                    }}
                                                    onClick={() => handleReturnResponsibility(r)}
                                                >
                                                    <Check size={14} /> REGISTRAR DEVOLUÇÃO
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 7: INVENTÁRIO */}
                {activeTab === 'inventario' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            <button className="btn-secondary" onClick={handleOpenInventory} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}>
                                <ClipboardList size={16} /> REALIZAR INVENTÁRIO FÍSICO
                            </button>
                        </div>

                        <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                            <h4>Histórico de Inventários Homologados</h4>
                            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                                <table className="pat-table">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Responsável</th>
                                            <th>Frequência</th>
                                            <th>Categoria</th>
                                            <th>Divergências</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventories.map(inv => (
                                            <tr key={inv.id}>
                                                <td style={{ fontWeight: 600 }}>{inv.date.split('-').reverse().join('/')}</td>
                                                <td>{inv.responsible}</td>
                                                <td>{inv.type}</td>
                                                <td>{inv.category}</td>
                                                <td>
                                                    {inv.divergences && inv.divergences.length > 0 ? (
                                                        <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                                                            {inv.divergences.length} itens divergentes
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Sem divergências</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="pat-status-badge ativo">
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 8: RELATÓRIOS */}
                {activeTab === 'relatorios' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => handlePrint('rep-setores')}><Printer size={16} /> Bens por Setor</button>
                            <button className="btn-secondary" onClick={() => handlePrint('rep-categorias')}><Printer size={16} /> Bens por Categoria</button>
                            <button className="btn-secondary" onClick={() => handlePrint('rep-quebras')}><Printer size={16} /> Itens Quebrados / Perdidos</button>
                            <button className="btn-secondary" onClick={() => handlePrint('rep-cautelas')}><Printer size={16} /> Bens sob Responsabilidade</button>
                        </div>

                        {/* PREVIEW DA IMPRESSÃO */}
                        <div className="pat-report-sheet" id="rep-setores">
                            <h1 style={{ borderBottom: '2px solid #ea580c', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>Bens Operacionais por Setor</h1>
                            <h2>Corellux OS - Relatório Executivo de Saldos Físicos</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Setor</th>
                                        <th>Código</th>
                                        <th>Material</th>
                                        <th>Categoria</th>
                                        <th>Qtd Atual</th>
                                        <th>Valor Unit.</th>
                                        <th>Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter(i => i.qtyActual > 0).map(i => (
                                        <tr key={i.id}>
                                            <td>{i.sectorActual}</td>
                                            <td>{i.code}</td>
                                            <td>{i.name}</td>
                                            <td>{i.category}</td>
                                            <td>{i.qtyActual} {i.unit}</td>
                                            <td>{i.valueUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td>{i.valueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pat-report-sheet" id="rep-categorias">
                            <h1 style={{ borderBottom: '2px solid #ea580c', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>Bens por Categoria</h1>
                            <h2>Corellux OS - Distribuição Patrimonial</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Categoria</th>
                                        <th>Subcategoria</th>
                                        <th>Código</th>
                                        <th>Material</th>
                                        <th>Setor Atual</th>
                                        <th>Qtd Atual</th>
                                        <th>Valor Unit.</th>
                                        <th>Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter(i => i.qtyActual > 0).map(i => (
                                        <tr key={i.id}>
                                            <td>{i.category}</td>
                                            <td>{i.subcategory || '-'}</td>
                                            <td>{i.code}</td>
                                            <td>{i.name}</td>
                                            <td>{i.sectorActual}</td>
                                            <td>{i.qtyActual} {i.unit}</td>
                                            <td>{i.valueUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td>{i.valueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pat-report-sheet" id="rep-quebras">
                            <h1 style={{ borderBottom: '2px solid #ea580c', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>Histórico de Quebras e Perdas</h1>
                            <h2>Corellux OS - Ocorrências e Danos Operacionais</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Material (SKU)</th>
                                        <th>Quantidade</th>
                                        <th>Tipo Ocorrência</th>
                                        <th>Responsável</th>
                                        <th>Motivo / Descrição</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.filter(m => ['Quebra', 'Perda', 'Furto', 'Descarte'].includes(m.subtype)).map(m => (
                                        <tr key={m.id}>
                                            <td>{m.date.split('-').reverse().join('/')}</td>
                                            <td>{m.itemName} ({m.itemSku})</td>
                                            <td>{m.qty}</td>
                                            <td>{m.subtype}</td>
                                            <td>{m.responsible}</td>
                                            <td>{m.reason || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pat-report-sheet" id="rep-cautelas">
                            <h1 style={{ borderBottom: '2px solid #ea580c', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>Bens sob Cautela de Funcionários</h1>
                            <h2>Corellux OS - Termos de Responsabilidade</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Funcionário</th>
                                        <th>Item de Patrimônio</th>
                                        <th>Qtd</th>
                                        <th>Entrega</th>
                                        <th>Devolução</th>
                                        <th>Assinatura</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responsibilities.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.employeeName}</td>
                                            <td>{r.itemName} ({r.itemSku})</td>
                                            <td>{r.qty}</td>
                                            <td>{r.deliveryDate.split('-').reverse().join('/')}</td>
                                            <td>{r.returnDate ? r.returnDate.split('-').reverse().join('/') : '-'}</td>
                                            <td>{r.signature}</td>
                                            <td>{r.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 9: AUDITORIA */}
                {activeTab === 'auditoria' && (
                    <div className="pat-panel-card" style={{ flex: 1, overflowY: 'auto' }}>
                        <h4>Rastreabilidade e Log de Auditoria</h4>
                        <div style={{ overflowX: 'auto', marginTop: '1.2rem' }}>
                            <table className="pat-table">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Operação</th>
                                        <th>Material (SKU)</th>
                                        <th>Campo Modificado</th>
                                        <th>Valor Anterior</th>
                                        <th>Valor Novo</th>
                                        <th>Usuário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audits.map(a => (
                                        <tr key={a.id}>
                                            <td>{new Date(a.timestamp).toLocaleString('pt-BR')}</td>
                                            <td style={{ fontWeight: 700 }}>{a.operation}</td>
                                            <td style={{ color: 'var(--accent-orange)' }}>{a.itemSku}</td>
                                            <td>{a.field}</td>
                                            <td style={{ color: 'var(--accent-red)', textDecoration: 'line-through' }}>{a.oldValue}</td>
                                            <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{a.newValue}</td>
                                            <td>{a.responsible}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL: ITEM ADD/EDIT */}
            {isItemModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '680px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <Boxes size={18} /> {editingItem ? 'EDITAR MATERIAL OPERACIONAL' : 'CADASTRAR NOVO MATERIAL'}
                            </h3>
                            <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>CÓDIGO INTERNO *</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={itemForm.code} 
                                        onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })} 
                                        required 
                                        disabled={!!editingItem}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>NOME DO ITEM *</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={itemForm.name} 
                                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>CATEGORIA *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={itemForm.category} 
                                        onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                                        required
                                    >
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>SUBCATEGORIA</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={itemForm.subcategory} 
                                        onChange={(e) => setItemForm({ ...itemForm, subcategory: e.target.value })} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>UNID. MEDIDA</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={itemForm.unit} 
                                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>QTD ATUAL</label>
                                    <input 
                                        type="number" 
                                        className="input-title" 
                                        value={itemForm.qtyActual} 
                                        onChange={(e) => setItemForm({ ...itemForm, qtyActual: parseInt(e.target.value) || 0 })} 
                                        disabled={!!editingItem} // Quantidade de semente só edita no create
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>QTD MÍNIMA</label>
                                    <input 
                                        type="number" 
                                        className="input-title" 
                                        value={itemForm.qtyMin} 
                                        onChange={(e) => setItemForm({ ...itemForm, qtyMin: parseInt(e.target.value) || 0 })} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>VALOR UNIT. (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="input-title" 
                                        value={itemForm.valueUnit} 
                                        onChange={(e) => setItemForm({ ...itemForm, valueUnit: parseFloat(e.target.value) || 0 })} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>SETOR ATUAL *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={itemForm.sectorActual} 
                                        onChange={(e) => setItemForm({ ...itemForm, sectorActual: e.target.value })}
                                        required
                                    >
                                        {defaultSectors.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>LOCALIZAÇÃO FÍSICA</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        placeholder="EX: Gaveta, Prateleira 4"
                                        value={itemForm.location} 
                                        onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>DATA DE AQUISIÇÃO</label>
                                    <input 
                                        type="date" 
                                        className="input-title" 
                                        value={itemForm.acquisitionDate} 
                                        onChange={(e) => setItemForm({ ...itemForm, acquisitionDate: e.target.value })} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>FORNECEDOR</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={itemForm.supplier} 
                                        onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>OBSERVAÇÕES</label>
                                <textarea 
                                    className="input-title" 
                                    rows="3" 
                                    style={{ resize: 'none', padding: '0.5rem' }}
                                    value={itemForm.notes} 
                                    onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>STATUS *</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={itemForm.status} 
                                    onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}
                                    required
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Em uso">Em uso</option>
                                    <option value="Em manutenção">Em manutenção</option>
                                    <option value="Quebrado">Quebrado</option>
                                    <option value="Perdido">Perdido</option>
                                    <option value="Baixado">Baixado</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: CATEGORY ADD/EDIT */}
            {isCategoryModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '450px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <FolderPlus size={18} /> {editingCategory ? 'EDITAR CATEGORIA' : 'NOVA CATEGORIA'}
                            </h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>NOME DA CATEGORIA *</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={categoryForm.name} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                                    required 
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>ÍCONE</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={categoryForm.icon} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                                    required
                                >
                                    {availableIcons.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>COR DE MARCAÇÃO</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={categoryForm.color} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                    required
                                >
                                    {availableColors.map(color => <option key={color} value={color}>{color}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>STATUS</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={categoryForm.status} 
                                    onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })}
                                    required
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsCategoryModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: REGISTER MANUAL MOVEMENT */}
            {isMovementModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsMovementModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <TrendingUp size={18} /> REGISTRAR MOVIMENTAÇÃO DE MATERIAL
                            </h3>
                            <button onClick={() => setIsMovementModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMovement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>ITEM DO PATRIMÔNIO *</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={movementForm.itemSku} 
                                    onChange={(e) => setMovementForm({ ...movementForm, itemSku: e.target.value })}
                                    required
                                >
                                    {items.map(i => <option key={i.id} value={i.code}>{i.name} ({i.code}) - Saldo: {i.qtyActual}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>TIPO *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={movementForm.type} 
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            setMovementForm({ 
                                                ...movementForm, 
                                                type: type,
                                                subtype: type === 'Entrada' ? 'Compra' : 'Quebra' 
                                            });
                                        }}
                                        required
                                    >
                                        <option value="Entrada">Entrada</option>
                                        <option value="Saída">Saída (Baixa)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>SUBTIPO *</label>
                                    {movementForm.type === 'Entrada' ? (
                                        <select 
                                            className="chk-filter-select" 
                                            style={{ height: '38px', width: '100%' }}
                                            value={movementForm.subtype} 
                                            onChange={(e) => setMovementForm({ ...movementForm, subtype: e.target.value })}
                                            required
                                        >
                                            <option value="Compra">Compra</option>
                                            <option value="Inventário">Ajuste de Inventário</option>
                                            <option value="Devolução">Devolução</option>
                                            <option value="Transferência recebida">Transferência recebida</option>
                                        </select>
                                    ) : (
                                        <select 
                                            className="chk-filter-select" 
                                            style={{ height: '38px', width: '100%' }}
                                            value={movementForm.subtype} 
                                            onChange={(e) => setMovementForm({ ...movementForm, subtype: e.target.value })}
                                            required
                                        >
                                            <option value="Quebra">Quebra</option>
                                            <option value="Perda">Perda</option>
                                            <option value="Furto">Furto</option>
                                            <option value="Descarte">Descarte</option>
                                            <option value="Transferência enviada">Transferência enviada</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>QUANTIDADE *</label>
                                <input 
                                    type="number" 
                                    className="input-title" 
                                    min="1"
                                    value={movementForm.qty} 
                                    onChange={(e) => setMovementForm({ ...movementForm, qty: Math.max(1, parseInt(e.target.value) || 1) })} 
                                    required 
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>MOTIVO / JUSTIFICATIVA</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={movementForm.reason} 
                                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} 
                                    placeholder="EX: Quebrou na lavagem"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>NOTAS / ORIGEM OU DESTINO</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={movementForm.notes} 
                                    onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} 
                                    placeholder="EX: NF 1553"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsMovementModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Salvar Lançamento</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: TRANSFER BETWEEN SECTORS */}
            {isTransferModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsTransferModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <ArrowRightLeft size={18} /> TRANSFERÊNCIA ENTRE SETORES
                            </h3>
                            <button onClick={() => setIsTransferModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>ITEM DO PATRIMÔNIO *</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={transferForm.itemSku} 
                                    onChange={(e) => handleTransferFormChangeSku(e.target.value)}
                                    required
                                >
                                    {items.filter(i => i.qtyActual > 0).map(i => <option key={i.id} value={i.code}>{i.name} ({i.code}) - Setor: {i.sectorActual} - Saldo: {i.qtyActual}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>SETOR DE ORIGEM</label>
                                    <input 
                                        type="text" 
                                        className="input-title" 
                                        value={transferForm.fromSector} 
                                        disabled 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>SETOR DE DESTINO *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={transferForm.toSector} 
                                        onChange={(e) => setTransferForm({ ...transferForm, toSector: e.target.value })}
                                        required
                                    >
                                        {defaultSectors.filter(s => s !== transferForm.fromSector).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>QUANTIDADE A TRANSFERIR *</label>
                                <input 
                                    type="number" 
                                    className="input-title" 
                                    min="1"
                                    value={transferForm.qty} 
                                    onChange={(e) => setTransferForm({ ...transferForm, qty: Math.max(1, parseInt(e.target.value) || 1) })} 
                                    required 
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>MOTIVO DA TRANSFERÊNCIA</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={transferForm.reason} 
                                    onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} 
                                    placeholder="EX: Remanejamento para abertura do bar"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsTransferModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Efetuar Transferência</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: RESPONSIBILITY CAUTELA */}
            {isResponsibilityModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsResponsibilityModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <UserCheck size={18} /> CRIAÇÃO DE CAUTELA (ENTREGA DE ITEM)
                            </h3>
                            <button onClick={() => setIsResponsibilityModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveResponsibility} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>FUNCIONÁRIO RESPONSÁVEL *</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={respForm.employeeId} 
                                    onChange={(e) => setRespForm({ ...respForm, employeeId: e.target.value })}
                                    required
                                >
                                    {state.appUsers.filter(u => u.status === 'Ativo').map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>ITEM DO PATRIMÔNIO *</label>
                                <select 
                                    className="chk-filter-select" 
                                    style={{ height: '38px', width: '100%' }}
                                    value={respForm.itemSku} 
                                    onChange={(e) => setRespForm({ ...respForm, itemSku: e.target.value })}
                                    required
                                >
                                    {items.filter(i => i.qtyActual > 0).map(i => <option key={i.id} value={i.code}>{i.name} ({i.code}) - Saldo: {i.qtyActual}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>QUANTIDADE *</label>
                                    <input 
                                        type="number" 
                                        className="input-title" 
                                        min="1"
                                        value={respForm.qty} 
                                        onChange={(e) => setRespForm({ ...respForm, qty: Math.max(1, parseInt(e.target.value) || 1) })} 
                                        required 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>DATA DE CAUTELA</label>
                                    <input 
                                        type="date" 
                                        className="input-title" 
                                        value={respForm.deliveryDate} 
                                        onChange={(e) => setRespForm({ ...respForm, deliveryDate: e.target.value })} 
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>OBSERVAÇÃO / COMPROMISSO</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={respForm.notes} 
                                    onChange={(e) => setRespForm({ ...respForm, notes: e.target.value })} 
                                    placeholder="EX: Uso exclusivo nas dependências do salão"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>ASSINATURA DIGITAL DO TERMO *</label>
                                <input 
                                    type="text" 
                                    className="input-title" 
                                    value={respForm.signature} 
                                    onChange={(e) => setRespForm({ ...respForm, signature: e.target.value })} 
                                    placeholder="Digite o nome completo do funcionário"
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsResponsibilityModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Gerar Cautela</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL: PHYSICAL INVENTORY AUDIT */}
            {isInventoryModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsInventoryModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
                                <ClipboardList size={18} /> SISTEMA DE CONFERÊNCIA FÍSICA (INVENTÁRIO)
                            </h3>
                            <button onClick={() => setIsInventoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveInventory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>TIPO DE INVENTÁRIO *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={inventoryForm.type} 
                                        onChange={(e) => setInventoryForm({ ...inventoryForm, type: e.target.value })}
                                        required
                                    >
                                        <option value="Diário">Diário</option>
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensal">Mensal</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Anual">Anual</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 'bold' }}>CATEGORIA A INVENTARIAR *</label>
                                    <select 
                                        className="chk-filter-select" 
                                        style={{ height: '38px', width: '100%' }}
                                        value={inventoryForm.category} 
                                        onChange={(e) => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                                        required
                                    >
                                        <option value="Todos">Todos os Itens Ativos</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem' }}>
                                <table className="pat-table">
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Item</th>
                                            <th>Setor</th>
                                            <th>Qtd Esperada</th>
                                            <th>Qtd Encontrada</th>
                                            <th>Divergência</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.filter(i => {
                                            if (i.status !== 'Ativo') return false;
                                            if (inventoryForm.category !== 'Todos' && i.category !== inventoryForm.category) return false;
                                            return true;
                                        }).map(i => {
                                            const expected = i.qtyActual;
                                            const found = inventoryForm.counts[i.code] !== undefined ? inventoryForm.counts[i.code] : expected;
                                            const diff = found - expected;

                                            return (
                                                <tr key={i.id}>
                                                    <td style={{ fontWeight: 700 }}>{i.code}</td>
                                                    <td>{i.name}</td>
                                                    <td>{i.sectorActual}</td>
                                                    <td style={{ fontWeight: 700 }}>{expected}</td>
                                                    <td>
                                                        <input 
                                                            type="number" 
                                                            className="input-title"
                                                            style={{ width: '70px', padding: '0.2rem 0.4rem', margin: 0, height: '28px' }}
                                                            value={found}
                                                            onChange={(e) => handleInventoryCountChange(i.code, e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ 
                                                        fontWeight: 700, 
                                                        color: diff === 0 ? 'var(--accent-green)' : (diff > 0 ? 'var(--accent-blue)' : 'var(--accent-red)') 
                                                    }}>
                                                        {diff === 0 ? 'Ok' : (diff > 0 ? `+${diff}` : diff)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsInventoryModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, margin: 0 }}>Homologar Contagem</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* CUSTOM DIALOG */}
            {dialog && createPortal(
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="confirm-modal-content" style={{ width: '400px', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', color: dialog.alertType === 'error' ? 'var(--accent-red)' : (dialog.alertType === 'success' ? 'var(--accent-green)' : 'var(--accent-orange)'), fontSize: '1.1rem', fontWeight: 'bold' }}>{dialog.title}</h4>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{dialog.message}</p>
                        
                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                            {dialog.type === 'confirm' && (
                                <button className="btn-secondary" style={{ padding: '0.5rem 1.2rem', minWidth: '100px' }} onClick={dialog.onCancel}>Cancelar</button>
                            )}
                            <button className="btn-primary" style={{ margin: 0, padding: '0.5rem 1.2rem', minWidth: '100px', background: dialog.alertType === 'error' ? 'var(--accent-red)' : 'var(--border-orange)' }} onClick={dialog.onConfirm}>Confirmar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
