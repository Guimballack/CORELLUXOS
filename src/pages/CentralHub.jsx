/**
 * Corellux OS - Central de Comunicação e Checklists (Gestão Operacional)
 * Permite a visualização, leitura e disparo de avisos, bem como a criação
 * e execução de checklists operacionais e vistorias de auditoria.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCorelluxState, loadUsers } from '../store/corellux-state';
import DbService from '../services/db-service';
import { getUserAvatar } from '../utils/initial-data';
import { 
    Bell, 
    Send, 
    Paperclip, 
    ArrowLeft, 
    Search, 
    Eye, 
    Download, 
    X, 
    CheckSquare, 
    CheckCheck, 
    Clock, 
    FileText, 
    Trash2, 
    AlertTriangle,
    Check,
    Signature,
    ClipboardList,
    Plus,
    Compass,
    Settings,
    FileSpreadsheet,
    Camera,
    MapPin,
    AlertCircle,
    UserCheck,
    CheckCircle2,
    ChevronRight,
    Lock,
    Info
} from 'lucide-react';

export default function CentralHub() {
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser', 
        'appUsers', 
        'notifications', 
        'selectedUserIds', 
        'pendingAttachment',
        'checklistModels',
        'checklistExecutions',
        'builderItems',
        'centralActiveTab'
    ]);

    // Local UI States (Avisos e Geral)
    const activeTab = state.centralActiveTab;
    const setActiveTab = (tabName) => setKey('centralActiveTab', tabName);
    const [recipientSubTab, setRecipientSubTab] = useState('users'); // 'users', 'sectors', 'areas'
    const [searchQuery, setSearchQuery] = useState('');
    const [feedFilter, setFeedFilter] = useState('todos'); // 'todos', 'unread', 'sent', 'sistema'
    const [activeNotification, setActiveNotification] = useState(null);
    const [sectors, setSectors] = useState([]);
    const [areas, setAreas] = useState([]);
    
    // Checklist Sub-Tabs
    const [checklistSubTab, setChecklistSubTab] = useState('dashboard'); // 'dashboard', 'history', 'models', 'builder', 'execution'
    const [activeExecutionDetail, setActiveExecutionDetail] = useState(null);

    // Form States (Avisos)
    const [composeTitle, setComposeTitle] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composePriority, setComposePriority] = useState('normal'); // 'normal', 'urgente'
    const [charCount, setCharCount] = useState(0);

    // Checklist Execution States
    const [activeModelForExecution, setActiveModelForExecution] = useState(null);
    const [execAnswers, setExecAnswers] = useState({}); // { [itemId]: { answer: '', photo: null, obs: '' } }
    const [gpsCoordinates, setGpsCoordinates] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [execStartTime, setExecStartTime] = useState(null);

    // Checklist Builder States
    const [builderEditId, setBuilderEditId] = useState(null);
    const [builderName, setBuilderName] = useState('');
    const [builderSector, setBuilderSector] = useState('COZINHA');
    const [builderFrequency, setBuilderFrequency] = useState('Diário');
    const [builderStatus, setBuilderStatus] = useState('Ativo');
    const [builderQuestions, setBuilderQuestions] = useState([]); // Array of { id, type, label, required, conditionalPhoto, conditionalObs }

    const fileInputRef = useRef(null);

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

    // Load initial data
    useEffect(() => {
        // Load employees
        if (!state.appUsers || state.appUsers.length === 0) {
            loadUsers();
        }
        
        // Load notifications
        DbService.getNotifications().then(data => {
            setKey('notifications', data);
        });

        // Load sectors and areas
        DbService.getSectors().then(data => setSectors(data));
        DbService.getAreas().then(data => setAreas(data));

        // Load checklists
        DbService.getChecklistModels().then(data => {
            setKey('checklistModels', data);
        });
        DbService.getChecklistExecutions().then(data => {
            setKey('checklistExecutions', data);
        });
        setKey('centralActiveTab', 'menu');
    }, []);

    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente', permissions: {} };
    const notifications = state.notifications || [];
    const appUsers = state.appUsers || [];
    const checklistModels = state.checklistModels || [];
    const checklistExecutions = state.checklistExecutions || [];

    // =============================================
    // AVISOS / NOTIFICAÇÕES LOGIC
    // =============================================
    const canUserSeeNotification = (n) => {
        if (!currentUser) return false;
        const isAdmin = currentUser.accessLevel === 'Administrador';
        if (n.sender === currentUser.name) return true;
        if (n.targetUsers && Array.isArray(n.targetUsers) && n.targetUsers.length > 0) {
            return n.targetUsers.includes(currentUser.id) || isAdmin;
        }
        if (isAdmin) return true;
        if (n.type === 'sistema' && !n.targetSector) return true;

        const targetSector = (n.targetSector || 'Todos').trim();
        if (targetSector === 'Todos') return true;

        const role = (currentUser.role || '').toLowerCase();
        const sector = targetSector.toLowerCase();

        if (sector === 'cozinha' && (role === 'cozinha' || role === 'chef' || role === 'cozinheiro' || role === 'produção')) return true;
        if (sector === 'estoque' && (role === 'estoque' || role === 'estoquista' || role === 'almoxarife')) return true;
        if (sector === 'salão' && (role === 'salão' || role === 'garçom' || role === 'atendente' || role === 'caixa')) return true;
        if (sector === 'administração' && (role === 'administração' || role === 'gerente' || role === 'supervisor' || role === 'administrador')) return true;

        return role === sector;
    };

    const filteredNotifications = notifications.filter(n => {
        if (!canUserSeeNotification(n)) return false;
        if (feedFilter === 'unread') {
            const isReadByMe = n.readBy && n.readBy[currentUser.id];
            if (isReadByMe || n.sender === currentUser.name) return false;
        } else if (feedFilter === 'sent') {
            if (n.sender !== currentUser.name) return false;
        } else if (feedFilter === 'sistema') {
            if (n.type !== 'sistema') return false;
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const titleMatch = (n.title || '').toLowerCase().includes(query);
            const msgMatch = (n.message || '').toLowerCase().includes(query);
            const senderMatch = (n.sender || '').toLowerCase().includes(query);
            return titleMatch || msgMatch || senderMatch;
        }
        return true;
    });

    const handleOpenNotification = async (n) => {
        setActiveNotification(n);
        const isReadByMe = n.readBy && n.readBy[currentUser.id];
        if (!isReadByMe && n.sender !== currentUser.name) {
            const result = await DbService.markNotificationRead(n.id, currentUser.id);
            if (result.success) {
                const updatedList = notifications.map(item => item.id === n.id ? result.data : item);
                setKey('notifications', updatedList);
                setActiveNotification(result.data);
            }
        }
    };

    // Recipients MultiSelect helpers
    const selectedUserIds = state.selectedUserIds || [];

    const handleToggleUser = (userId) => {
        if (selectedUserIds.includes(userId)) {
            setKey('selectedUserIds', selectedUserIds.filter(id => id !== userId));
        } else {
            setKey('selectedUserIds', [...selectedUserIds, userId]);
        }
    };

    const handleSelectAll = () => {
        const activeUsers = appUsers.filter(u => u.status === 'Ativo');
        if (selectedUserIds.length === activeUsers.length) {
            setKey('selectedUserIds', []);
        } else {
            setKey('selectedUserIds', activeUsers.map(u => u.id));
        }
    };

    const handleSelectBySector = (sectorName) => {
        const matchedUsers = appUsers.filter(u => {
            if (u.status !== 'Ativo') return false;
            const role = (u.role || '').toLowerCase();
            const sector = sectorName.toLowerCase();
            if (sector === 'cozinha' && (role === 'cozinha' || role === 'chef' || role === 'cozinheiro' || role === 'produção')) return true;
            if (sector === 'estoque' && (role === 'estoque' || role === 'estoquista' || role === 'almoxarife')) return true;
            if (sector === 'salão' && (role === 'salão' || role === 'garçom' || role === 'atendente' || role === 'caixa')) return true;
            if (sector === 'administração' && (role === 'administração' || role === 'gerente' || role === 'supervisor' || role === 'administrador')) return true;
            return role === sector;
        });

        const matchedIds = matchedUsers.map(u => u.id);
        const allSelected = matchedIds.every(id => selectedUserIds.includes(id));

        if (allSelected) {
            setKey('selectedUserIds', selectedUserIds.filter(id => !matchedIds.includes(id)));
        } else {
            setKey('selectedUserIds', [...new Set([...selectedUserIds, ...matchedIds])]);
        }
    };

    const handleSelectByArea = (areaId) => {
        let matchedUsers = [];
        if ([1, 2, 3].includes(areaId)) {
            matchedUsers = appUsers.filter(u => ['cozinha', 'chef', 'cozinheiro', 'produção'].includes((u.role || '').toLowerCase()));
        } else if ([4, 5, 6].includes(areaId)) {
            matchedUsers = appUsers.filter(u => ['garçom', 'atendente', 'caixa', 'salão'].includes((u.role || '').toLowerCase()));
        } else if ([7, 8, 9].includes(areaId)) {
            matchedUsers = appUsers.filter(u => ['estoquista', 'almoxarife', 'estoque'].includes((u.role || '').toLowerCase()));
        } else if (areaId === 10) {
            matchedUsers = appUsers.filter(u => ['administrador', 'gerente', 'supervisor', 'administração'].includes((u.role || '').toLowerCase()));
        }

        const matchedIds = matchedUsers.filter(u => u.status === 'Ativo').map(u => u.id);
        const allSelected = matchedIds.every(id => selectedUserIds.includes(id));

        if (allSelected) {
            setKey('selectedUserIds', selectedUserIds.filter(id => !matchedIds.includes(id)));
        } else {
            setKey('selectedUserIds', [...new Set([...selectedUserIds, ...matchedIds])]);
        }
    };

    const handleMessageChange = (e) => {
        const text = e.target.value;
        if (text.length <= 500) {
            setComposeMessage(text);
            setCharCount(text.length);
        }
    };

    const handleInsertGovSignature = () => {
        const signatureText = "\n\nPor favor, assine este documento digitalmente no portal ITI: https://assinador.iti.br/assinatura/index.xhtml e reenvie o arquivo assinado para o RH.";
        if (composeMessage.length + signatureText.length <= 500) {
            setComposeMessage(prev => prev + signatureText);
            setCharCount(prev => prev + signatureText.length);
        } else {
            showSystemAlert('Limite de caracteres excedido.', 'Atenção');
        }
    };

    const handleAttachmentSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showSystemAlert('O anexo deve ter no máximo 5MB.', 'Atenção');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setKey('pendingAttachment', {
                name: file.name,
                type: file.type,
                data: event.target.result
            });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAttachment = () => {
        setKey('pendingAttachment', null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendNotification = async () => {
        if (!currentUser.permissions.sendNotif) {
            showSystemAlert('Você não tem permissão para enviar avisos.', 'Acesso Negado');
            return;
        }
        if (!composeTitle.trim() || !composeMessage.trim() || selectedUserIds.length === 0) {
            showSystemAlert('Preencha todos os campos obrigatórios.', 'Atenção');
            return;
        }

        const notif = {
            id: Date.now(),
            type: 'sistema',
            title: composeTitle.toUpperCase(),
            message: composeMessage,
            priority: composePriority,
            sender: currentUser.name,
            senderRole: currentUser.role,
            targetSector: null,
            targetUsers: selectedUserIds,
            readBy: {},
            attachment: state.pendingAttachment,
            timestamp: new Date().toISOString(),
            read: false
        };

        const result = await DbService.saveNotification(notif);
        if (result.success) {
            setKey('notifications', [result.data, ...notifications]);
            setComposeTitle('');
            setComposeMessage('');
            setComposePriority('normal');
            setCharCount(0);
            setKey('selectedUserIds', []);
            setKey('pendingAttachment', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            showSystemAlert('Aviso enviado com sucesso!', 'Sucesso');
            setActiveTab('feed');
        }
    };

    const formatRelativeTime = (isoString) => {
        try {
            const date = new Date(isoString);
            const diffMs = Date.now() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Agora mesmo';
            if (diffMins < 60) return `Há ${diffMins} min`;
            if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
            if (diffDays === 1) return 'Ontem';
            if (diffDays < 7) return `Há ${diffDays} dias`;
            
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    // =============================================
    // CHECKLIST BUILDER LOGIC
    // =============================================
    const handleOpenBuilder = (model = null) => {
        if (model) {
            setBuilderEditId(model.id);
            setBuilderName(model.name);
            setBuilderSector(model.sector);
            setBuilderFrequency(model.frequency);
            setBuilderStatus(model.status);
            setBuilderQuestions([...model.items]);
        } else {
            setBuilderEditId(null);
            setBuilderName('');
            setBuilderSector('COZINHA');
            setBuilderFrequency('Diário');
            setBuilderStatus('Ativo');
            setBuilderQuestions([]);
        }
        setChecklistSubTab('builder');
    };

    const handleAddBuilderItem = (type) => {
        const newItem = {
            id: 'item_' + Date.now() + Math.floor(Math.random() * 100),
            type: type,
            label: '',
            required: true,
            conditionalPhoto: false,
            conditionalObs: false
        };
        setBuilderQuestions([...builderQuestions, newItem]);
    };

    const handleRemoveBuilderItem = (id) => {
        setBuilderQuestions(builderQuestions.filter(q => q.id !== id));
    };

    const handleUpdateBuilderItem = (id, field, value) => {
        setBuilderQuestions(builderQuestions.map(q => {
            if (q.id === id) {
                return { ...q, [field]: value };
            }
            return q;
        }));
    };

    const handleSaveChecklistModel = async () => {
        if (!builderName.trim()) {
            showSystemAlert('Por favor, digite o nome do modelo.', 'Atenção');
            return;
        }
        if (builderQuestions.length === 0) {
            showSystemAlert('Adicione pelo menos um item ao checklist.', 'Atenção');
            return;
        }
        if (builderQuestions.some(q => !q.label.trim())) {
            showSystemAlert('Preencha a descrição/pergunta de todos os itens.', 'Atenção');
            return;
        }

        const model = {
            id: builderEditId,
            name: builderName.toUpperCase(),
            sector: builderSector,
            frequency: builderFrequency,
            status: builderStatus,
            items: builderQuestions
        };

        const result = await DbService.saveChecklistModel(model);
        if (result.success) {
            showSystemAlert('Modelo de checklist salvo com sucesso!', 'Sucesso');
            
            // Refresh models from db/localStorage
            const data = await DbService.getChecklistModels();
            setKey('checklistModels', data);
            
            setChecklistSubTab('models');
        }
    };

    const handleDeleteChecklistModel = (id) => {
        showSystemConfirm('Tem certeza que deseja excluir este modelo?', async () => {
            const result = await DbService.deleteChecklistModel(id);
            if (result.success) {
                const data = await DbService.getChecklistModels();
                setKey('checklistModels', data);
                showSystemAlert('Modelo de checklist excluído.', 'Sucesso');
            }
        });
    };

    // =============================================
    // CHECKLIST EXECUTION LOGIC
    // =============================================
    const handleStartExecution = (model) => {
        setGpsLoading(true);
        setGpsCoordinates('Coordenadas em sincronização...');
        setExecStartTime(new Date().toISOString());
        setActiveModelForExecution(model);

        // Fetch location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setGpsCoordinates(`Latitude: ${position.coords.latitude.toFixed(4)}, Longitude: ${position.coords.longitude.toFixed(4)}`);
                    setGpsLoading(false);
                },
                (err) => {
                    console.warn('Geolocation blocked. Using mock location.');
                    setGpsCoordinates('Rua Fictícia, 123 (Lat: -23.5489, Lng: -46.6388)');
                    setGpsLoading(false);
                },
                { timeout: 8000 }
            );
        } else {
            setGpsCoordinates('Rua Fictícia, 123 (Lat: -23.5489, Lng: -46.6388)');
            setGpsLoading(false);
        }

        // Initialize empty answers dictionary
        const initialAnswers = {};
        model.items.forEach(item => {
            initialAnswers[item.id] = {
                answer: item.type === 'checkbox' ? 'Não' : '', // Checkbox defaults to unchecked (Não)
                photo: null,
                obs: ''
            };
        });
        setExecAnswers(initialAnswers);
        setChecklistSubTab('execution');
    };

    const handleSetAnswerValue = (itemId, field, value) => {
        setExecAnswers(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const handleSimNaoClick = (itemId, val, hasPhotoRule, hasObsRule) => {
        setExecAnswers(prev => {
            const current = prev[itemId] || { answer: '', photo: null, obs: '' };
            // Se mudou para SIM, pode zerar foto e obs condicionais
            const updated = {
                ...current,
                answer: val,
                photo: val === 'Sim' ? null : current.photo,
                obs: val === 'Sim' ? '' : current.obs
            };
            return { ...prev, [itemId]: updated };
        });
    };

    const handleCaptureMockPhoto = (itemId) => {
        // Mock capture photo as a dummy dataURL (colored box)
        const dummyPhoto = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' font-size='14' fill='%2394a3b8' dominant-baseline='middle' text-anchor='middle'>📷 FOTO REGISTRADA POR WEBCAM</text></svg>";
        handleSetAnswerValue(itemId, 'photo', dummyPhoto);
        showSystemAlert('Foto registrada com sucesso!', 'Sucesso');
    };

    const handleChecklistPhotoUpload = (itemId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            handleSetAnswerValue(itemId, 'photo', event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFinishExecution = async () => {
        // Validate
        for (const item of activeModelForExecution.items) {
            const stateAns = execAnswers[item.id];
            
            // Check required
            if (item.required) {
                if (item.type === 'sim_nao' && !stateAns.answer) {
                    showSystemAlert(`O item "${item.label}" é obrigatório.`, 'Atenção');
                    return;
                }
                if (item.type === 'texto' && !stateAns.answer.trim()) {
                    showSystemAlert(`O item "${item.label}" exige uma resposta de texto.`, 'Atenção');
                    return;
                }
                if (item.type === 'numero' && stateAns.answer === '') {
                    showSystemAlert(`O item "${item.label}" exige uma resposta numérica.`, 'Atenção');
                    return;
                }
                if (item.type === 'foto' && !stateAns.photo) {
                    showSystemAlert(`O item "${item.label}" exige uma foto obrigatória.`, 'Atenção');
                    return;
                }
            }

            // Conditional rules for "Não"
            if (item.type === 'sim_nao' && stateAns.answer === 'Não') {
                if (item.conditionalPhoto && !stateAns.photo) {
                    showSystemAlert(`Foto obrigatória para a não conformidade no item: "${item.label}".`, 'Atenção');
                    return;
                }
                if (item.conditionalObs && !stateAns.obs.trim()) {
                    showSystemAlert(`Justificativa obrigatória para a não conformidade no item: "${item.label}".`, 'Atenção');
                    return;
                }
            }
        }

        // Calculate conformity: percentage of 'Sim' and Checked Checkbox over total Sim/Nao + Checkbox questions
        const scorableItems = activeModelForExecution.items.filter(i => i.type === 'sim_nao' || i.type === 'checkbox');
        let correctCount = 0;
        
        scorableItems.forEach(item => {
            const ansObj = execAnswers[item.id];
            if (item.type === 'sim_nao' && ansObj.answer === 'Sim') correctCount++;
            if (item.type === 'checkbox' && ansObj.answer === 'Sim') correctCount++;
        });

        const conformity = scorableItems.length > 0 ? Math.round((correctCount / scorableItems.length) * 100) : 100;

        const execution = {
            id: 'exec_' + Date.now(),
            modelId: activeModelForExecution.id,
            modelName: activeModelForExecution.name,
            sector: activeModelForExecution.sector,
            executor: currentUser.name,
            startTime: execStartTime,
            endTime: new Date().toISOString(),
            location: gpsCoordinates,
            answers: execAnswers,
            status: 'Concluído',
            conformity: conformity
        };

        const result = await DbService.saveChecklistExecution(execution);
        if (result.success) {
            // Post system announcement automatically
            const systemNotif = {
                id: Date.now(),
                type: 'sistema',
                title: 'AUDITORIA DE CHECKLIST',
                message: `Checklist "${activeModelForExecution.name}" finalizado com conformidade de ${conformity}% por ${currentUser.name}. Setor: ${activeModelForExecution.sector}.`,
                priority: conformity < 80 ? 'urgente' : 'normal',
                sender: 'Sistema',
                senderRole: 'Auditoria',
                targetSector: activeModelForExecution.sector,
                targetUsers: [],
                readBy: {},
                timestamp: new Date().toISOString(),
                read: false
            };
            await DbService.saveNotification(systemNotif);

            // Reload lists
            const execs = await DbService.getChecklistExecutions();
            setKey('checklistExecutions', execs);

            const notifsData = await DbService.getNotifications();
            setKey('notifications', notifsData);

            showSystemAlert('Checklist finalizado e salvo com sucesso!', 'Sucesso');
            setActiveModelForExecution(null);
            setChecklistSubTab('dashboard');
        }
    };

    // Calculate general conformity average
    const calculateAverageConformity = () => {
        if (checklistExecutions.length === 0) return 0;
        const sum = checklistExecutions.reduce((acc, curr) => acc + (curr.conformity || 0), 0);
        return Math.round(sum / checklistExecutions.length);
    };

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* INCLUIR STYLES ADICIONAIS DO CHECKLIST E CONSTRUTOR */}
            <style dangerouslySetInnerHTML={{__html: `
                .central-content-container {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    padding: 1.5rem;
                }

                .composer-panel {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 1.5rem;
                    height: calc(100vh - 200px);
                    min-height: 400px;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                @media (max-width: 900px) {
                    .composer-panel {
                        grid-template-columns: 1fr;
                        height: auto;
                        overflow: visible;
                    }
                }

                .composer-main {
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    overflow-y: auto;
                    box-sizing: border-box;
                }

                .composer-sidebar {
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    overflow-y: auto;
                    box-sizing: border-box;
                }

                .checklist-subnav {
                    display: flex;
                    gap: 0.5rem;
                    background: rgba(15, 23, 42, 0.4);
                    padding: 0.5rem 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }

                .checklist-subnav-btn {
                    padding: 0.4rem 1rem;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    transition: all 0.2s;
                }

                .checklist-subnav-btn:hover {
                    color: #fff;
                    background: rgba(255,255,255,0.03);
                }

                .checklist-subnav-btn.active {
                    background: rgba(243, 107, 29, 0.1);
                    color: var(--accent-orange);
                }

                /* GRID DE KPIS */
                .kpi-row-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 1.5rem;
                }

                .kpi-stat-card {
                    background: rgba(30, 41, 59, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .kpi-stat-card h6 {
                    margin: 0;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .kpi-stat-card h3 {
                    margin: 0;
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #fff;
                }

                .kpi-stat-card.green h3 { color: #4ade80; }
                .kpi-stat-card.orange h3 { color: var(--accent-orange); }
                .kpi-stat-card.blue h3 { color: #60a5fa; }
                .kpi-stat-card.yellow h3 { color: #facc15; }

                /* MODEL CARDS */
                .models-list-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.25rem;
                }

                .model-item-card {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    transition: all 0.2s;
                }

                .model-item-card:hover {
                    border-color: rgba(243, 107, 29, 0.25);
                    background: rgba(30, 41, 59, 0.35);
                }

                .model-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .model-item-header h4 {
                    margin: 0 0 0.2rem 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: 0.2px;
                }

                .model-badge-sector {
                    padding: 0.2rem 0.6rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    color: var(--text-secondary);
                }

                .model-badge-sector.cozinha { background: rgba(243, 107, 29, 0.1); border-color: rgba(243, 107, 29, 0.2); color: var(--accent-orange); }
                .model-badge-sector.salão { background: rgba(20, 184, 166, 0.1); border-color: rgba(20, 184, 166, 0.2); color: #2dd4bf; }
                .model-badge-sector.estoque { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
                .model-badge-sector.administração { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.2); color: #c084fc; }

                .btn-start-run {
                    background: var(--accent-orange);
                    color: #fff;
                    border: none;
                    padding: 0.6rem 1.2rem;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    transition: all 0.2s;
                }

                .btn-start-run:hover {
                    box-shadow: 0 4px 12px rgba(243, 107, 29, 0.25);
                }

                /* BUILDER STYLES */
                .builder-container {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 2rem;
                }

                @media (max-width: 800px) {
                    .builder-container { grid-template-columns: 1fr; }
                }

                .builder-sidebar {
                    background: rgba(15, 23, 42, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .btn-builder-add-item {
                    width: 100%;
                    padding: 0.6rem 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    color: #fff;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }

                .btn-builder-add-item:hover {
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.15);
                }

                .builder-questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .builder-item-card {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 10px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .builder-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .builder-type-pill {
                    padding: 0.15rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    background: rgba(243, 107, 29, 0.12);
                    color: var(--accent-orange);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .conditional-block {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 8px;
                    padding: 0.8rem 1rem;
                }

                /* EXECUTION STYLES */
                .exec-panel {
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .exec-info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 1rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .exec-item-row {
                    background: rgba(255, 255, 255, 0.01);
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .exec-item-question {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #fff;
                }

                .sim-nao-group {
                    display: flex;
                    gap: 0.8rem;
                }

                .btn-sim-nao {
                    flex: 1;
                    max-width: 120px;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(15, 23, 42, 0.4);
                    color: var(--text-secondary);
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    outline: none;
                }

                .btn-sim-nao.sim:hover, .btn-sim-nao.sim.selected {
                    background: rgba(34, 197, 94, 0.15);
                    border-color: rgba(34, 197, 94, 0.4);
                    color: #4ade80;
                }

                .btn-sim-nao.nao:hover, .btn-sim-nao.nao.selected {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: rgba(239, 68, 68, 0.4);
                    color: #f87171;
                }

                .checkbox-slider-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    cursor: pointer;
                    user-select: none;
                    width: fit-content;
                }

                .checkbox-slider {
                    width: 44px;
                    height: 22px;
                    border-radius: 11px;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative;
                    transition: all 0.2s;
                }

                .checkbox-slider-thumb {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--text-secondary);
                    transition: all 0.2s;
                }

                .checkbox-slider-wrapper.active .checkbox-slider {
                    background: rgba(34, 197, 94, 0.15);
                    border-color: rgba(34, 197, 94, 0.4);
                }

                .checkbox-slider-wrapper.active .checkbox-slider-thumb {
                    left: 24px;
                    background: #4ade80;
                }

                .input-exec-text, .input-exec-number, .textarea-exec-obs {
                    width: 100%;
                    max-width: 450px;
                    padding: 0.6rem 0.8rem;
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 6px;
                    color: #fff;
                    outline: none;
                    font-size: 0.9rem;
                }

                .textarea-exec-obs {
                    max-width: 100%;
                    min-height: 80px;
                    font-family: inherit;
                }

                .input-exec-text:focus, .input-exec-number:focus, .textarea-exec-obs:focus {
                    border-color: var(--accent-orange);
                }

                .btn-exec-photo-capture {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #fff;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-exec-photo-capture:hover {
                    background: rgba(255, 255, 255, 0.08);
                }

                .exec-photo-preview {
                    max-width: 280px;
                    max-height: 180px;
                    border-radius: 6px;
                    object-fit: contain;
                    border: 1px solid rgba(255,255,255,0.1);
                    margin-top: 0.5rem;
                    display: block;
                }
            `}} />

            {/* HEADER DA TELA COM NAVEGAÇÃO DE VOLTA */}
            {activeTab !== 'menu' && (
                <div className="screen-header-bar" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <button className="btn-back" onClick={() => setActiveTab('menu')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                        <ArrowLeft size={14} /> VOLTAR
                    </button>
                    <div className="category-title-area" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div className={`cat-icon-area ${activeTab === 'feed' ? 'color-blue' : activeTab === 'compose' ? 'color-orange' : 'color-teal'}`} style={{ width: '45px', height: '45px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: activeTab === 'feed' ? 'rgba(59, 130, 246, 0.1)' : activeTab === 'compose' ? 'rgba(243, 107, 29, 0.1)' : 'rgba(20, 184, 166, 0.1)', color: activeTab === 'feed' ? 'var(--accent-blue)' : activeTab === 'compose' ? 'var(--accent-orange)' : '#2dd4bf' }}>
                            {activeTab === 'feed' ? <Bell size={18} /> : activeTab === 'compose' ? <Send size={18} /> : <CheckSquare size={18} />}
                        </div>
                        <div className="category-title-text" style={{ textAlign: 'left' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                                {activeTab === 'feed' ? 'MEUS AVISOS' : activeTab === 'compose' ? 'ENVIAR NOVO AVISO' : 'CHECKLIST OPERACIONAL'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {activeTab === 'feed' ? 'Feed de notificações e atividades' : activeTab === 'compose' ? 'Disparar comunicação para a equipe' : 'Rotinas, vistorias, tarefas diárias e auditorias setoriais'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-NAV SE FOR CHECKLIST */}
            {activeTab === 'checklist' && (
                <div className="checklist-subnav">
                    <button 
                        className={`checklist-subnav-btn ${['dashboard', 'execution'].includes(checklistSubTab) ? 'active' : ''}`}
                        onClick={() => {
                            if (activeModelForExecution) {
                                showSystemConfirm('Um checklist está em andamento. Voltar para o painel descartará suas respostas atuais. Continuar?', () => {
                                    setActiveModelForExecution(null);
                                    setChecklistSubTab('dashboard');
                                });
                            } else {
                                setChecklistSubTab('dashboard');
                            }
                        }}
                    >
                        <Compass size={14} /> Painel & Vistorias
                    </button>
                    <button 
                        className={`checklist-subnav-btn ${checklistSubTab === 'history' ? 'active' : ''}`}
                        onClick={() => {
                            if (activeModelForExecution) {
                                showSystemConfirm('Um checklist está em andamento. Ir para o histórico descartará suas respostas atuais. Continuar?', () => {
                                    setActiveModelForExecution(null);
                                    setChecklistSubTab('history');
                                });
                            } else {
                                setChecklistSubTab('history');
                            }
                        }}
                    >
                        <FileSpreadsheet size={14} /> Histórico de Auditoria
                    </button>
                    <button 
                        className={`checklist-subnav-btn ${['models', 'builder'].includes(checklistSubTab) ? 'active' : ''}`}
                        onClick={() => {
                            if (activeModelForExecution) {
                                showSystemConfirm('Um checklist está em andamento. Ir para modelos descartará suas respostas atuais. Continuar?', () => {
                                    setActiveModelForExecution(null);
                                    setChecklistSubTab('models');
                                });
                            } else {
                                setChecklistSubTab('models');
                            }
                        }}
                    >
                        <Settings size={14} /> Modelos de Checklist
                    </button>
                </div>
            )}

            {/* CONTEÚDO PRINCIPAL */}
            <div className="central-content-container">
                {activeTab === 'menu' && (
                    <div className="dashboard-menu">
                        <button 
                            className="menu-card dark-blue" 
                            onClick={() => setActiveTab('feed')}
                        >
                            <div className="card-icon"><Bell size={24} /></div>
                            <div className="card-content">
                                <h3>MEUS AVISOS</h3>
                                <p>Ver comunicados, notificações do sistema e avisos importantes.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>

                        {!currentUser.permissions.sendNotif ? (
                            <div 
                                className="menu-card blue" 
                                style={{ opacity: 0.65, cursor: 'not-allowed' }}
                            >
                                <div className="card-icon"><Send size={24} /></div>
                                <div className="card-content">
                                    <h3>ENVIAR AVISOS</h3>
                                    <p>Disparar novos avisos, criar comunicados e definir destinatários.</p>
                                </div>
                                <Lock size={16} style={{ opacity: 0.5, marginRight: '1rem' }} />
                            </div>
                        ) : (
                            <button 
                                className="menu-card blue" 
                                onClick={() => setActiveTab('compose')}
                            >
                                <div className="card-icon"><Send size={24} /></div>
                                <div className="card-content">
                                    <h3>ENVIAR AVISOS</h3>
                                    <p>Disparar novos avisos, criar comunicados e definir destinatários.</p>
                                </div>
                                <ChevronRight className="chevron" size={20} />
                            </button>
                        )}

                        <button 
                            className="menu-card teal" 
                            onClick={() => {
                                setActiveTab('checklist');
                                setChecklistSubTab('dashboard');
                            }}
                        >
                            <div className="card-icon"><CheckSquare size={24} /></div>
                            <div className="card-content">
                                <h3>CHECK-LIST</h3>
                                <p>Executar vistorias, checklists operacionais e auditorias de conformidade.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    </div>
                )}

                {activeTab === 'feed' && (
                    /* ABA FEED DE AVISOS */
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div className="notif-filters">
                                <button className={`filter-btn ${feedFilter === 'todos' ? 'active' : ''}`} onClick={() => setFeedFilter('todos')}>Todos</button>
                                <button className={`filter-btn ${feedFilter === 'unread' ? 'active' : ''}`} onClick={() => setFeedFilter('unread')}>Não Lidos</button>
                            </div>
                            
                            <div className="search-box">
                                <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                                <input type="text" placeholder="Pesquisar título, conteúdo ou remetente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>

                        {filteredNotifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(30, 41, 59, 0.1)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                <AlertTriangle size={36} style={{ color: 'var(--accent-orange)', marginBottom: '1rem', opacity: 0.7 }} />
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>Nenhum aviso encontrado</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Não há comunicados para exibir com os filtros atuais.</p>
                            </div>
                        ) : (
                            <div className="notifications-list">
                                {filteredNotifications.map((n) => {
                                    const isRead = n.readBy && n.readBy[currentUser.id];
                                    const showUnreadMarker = !isRead && n.sender !== currentUser.name;
                                    const senderUser = appUsers.find(u => u.name === n.sender);
                                    const avatar = getUserAvatar(senderUser ? senderUser.img : '');

                                    return (
                                        <div 
                                            key={n.id} 
                                            className={`notif-card ${showUnreadMarker ? 'unread' : ''}`} 
                                            onClick={() => handleOpenNotification(n)}
                                        >
                                            {n.attachment && (
                                                <div className="has-attachment-icon">
                                                    <Paperclip size={16} />
                                                </div>
                                            )}
                                            <img 
                                                src={avatar} 
                                                style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', marginRight: '1rem' }} 
                                                alt=""
                                            />
                                            <div className="notif-content">
                                                <div className="notif-header">
                                                    <span className="notif-title">{n.title || 'AVISO'}</span>
                                                    <span className="notif-time">{formatRelativeTime(n.timestamp)}</span>
                                                </div>
                                                <div className="notif-body">
                                                    {n.message.substring(0, 80)}{n.message.length > 80 ? '...' : ''}
                                                </div>
                                                <div className="notif-footer-info" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                                                    <span className="notif-sender-info">
                                                        Enviado por: <strong>{n.sender}</strong>
                                                    </span>
                                                    <span className="notif-target-tag">
                                                        PARA: {(n.targetUsers && n.targetUsers.length > 0) ? `${n.targetUsers.length} FUNCIONÁRIOS` : (n.targetSector || 'GERAL').toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            {showUnreadMarker && <div className="unread-dot"></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'compose' && (
                    /* ABA ENVIAR AVISO */
                    <div className="composer-panel">
                        <div className="composer-main">
                            <div className="composer-field-group">
                                <label>Título do Comunicado *</label>
                                <input type="text" className="input-title" placeholder="Ex: REUNIÃO GERAL DE EQUIPE" value={composeTitle} onChange={(e) => setComposeTitle(e.target.value.toUpperCase())} />
                            </div>

                            <div className="composer-field-group">
                                <div style={{ display: 'flex', justifySpaceBetween: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label>Mensagem *</label>
                                    <span style={{ fontSize: '0.75rem', color: charCount > 450 ? '#ef4444' : 'var(--text-secondary)' }}>{charCount} / 500 caracteres</span>
                                </div>
                                <textarea className="textarea-body" placeholder="O que você gostaria de comunicar aos colaboradores selecionados?" value={composeMessage} onChange={handleMessageChange} maxLength={500} />
                            </div>

                            <div className="composer-field-group">
                                <label>Prioridade do Alerta</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: '#fff', fontSize: '0.88rem', fontWeight: 500 }}><input type="radio" name="priority" value="normal" checked={composePriority === 'normal'} onChange={() => setComposePriority('normal')} style={{ accentColor: 'var(--accent-orange)' }} /> Normal</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: '#f87171', fontSize: '0.88rem', fontWeight: 500 }}><input type="radio" name="priority" value="urgente" checked={composePriority === 'urgente'} onChange={() => setComposePriority('urgente')} style={{ accentColor: '#ef4444' }} /> Urgente (Exibe em destaque vermelho)</label>
                                </div>
                            </div>

                            <div className="composer-toolbar">
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachmentSelect} accept="image/*,.pdf" />
                                    <button className="btn-tool" onClick={() => fileInputRef.current.click()}><Paperclip size={14} /> Anexar Imagem/PDF</button>
                                    <button className="btn-tool" onClick={handleInsertGovSignature} style={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' }}><Signature size={14} /> Pedir Assinatura Digital</button>
                                    {state.pendingAttachment && (
                                        <div className="attachment-preview-box">
                                            <FileText size={14} />
                                            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.pendingAttachment.name}</span>
                                            <button className="btn-remove-att" onClick={handleRemoveAttachment}><X size={12} /></button>
                                        </div>
                                    )}
                                </div>

                                <button className="btn-send-aviso" disabled={!composeTitle.trim() || !composeMessage.trim() || selectedUserIds.length === 0} onClick={handleSendNotification}><Send size={15} /> DISPARAR AVISO</button>
                            </div>
                        </div>

                        {/* LISTA LATERAL DE SELEÇÃO */}
                        <div className="composer-sidebar">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DESTINATÁRIOS ({selectedUserIds.length})</label>
                                <button onClick={handleSelectAll} style={{ background: 'transparent', border: 'none', color: 'var(--accent-orange)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                    {selectedUserIds.length === appUsers.filter(u => u.status === 'Ativo').length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </button>
                            </div>

                            <div className="recipients-tabs">
                                <button className={`recipients-tab-btn ${recipientSubTab === 'users' ? 'active' : ''}`} onClick={() => setRecipientSubTab('users')}>Colaboradores</button>
                                <button className={`recipients-tab-btn ${recipientSubTab === 'sectors' ? 'active' : ''}`} onClick={() => setRecipientSubTab('sectors')}>Setores</button>
                                <button className={`recipients-tab-btn ${recipientSubTab === 'areas' ? 'active' : ''}`} onClick={() => setRecipientSubTab('areas')}>Áreas</button>
                            </div>

                            <div className="recipients-list-scroll">
                                {recipientSubTab === 'users' && (
                                    appUsers.filter(u => u.status === 'Ativo').map(u => {
                                        const isSelected = selectedUserIds.includes(u.id);
                                        return (
                                            <div key={u.id} className={`recipient-item-card ${isSelected ? 'selected' : ''}`} onClick={() => handleToggleUser(u.id)}>
                                                <img src={getUserAvatar(u.img)} className="recipient-avatar-mini" alt="" />
                                                <div className="recipient-info-text">
                                                    <h5>{u.displayName || u.name}</h5>
                                                    <p>{u.role}</p>
                                                </div>
                                                <div className="recipient-check"><Check size={12} strokeWidth={3} /></div>
                                            </div>
                                        );
                                    })
                                )}

                                {recipientSubTab === 'sectors' && (
                                    sectors.filter(s => s.status === 'Ativo').map(s => {
                                        const sectorUsers = appUsers.filter(u => {
                                            if (u.status !== 'Ativo') return false;
                                            const role = (u.role || '').toLowerCase();
                                            const sector = s.name.toLowerCase();
                                            if (sector === 'cozinha' && ['cozinha', 'chef', 'cozinheiro', 'produção'].includes(role)) return true;
                                            if (sector === 'estoque' && ['estoque', 'estoquista', 'almoxarife'].includes(role)) return true;
                                            if (sector === 'salão' && ['salão', 'garçom', 'atendente', 'caixa'].includes(role)) return true;
                                            if (sector === 'administração' && ['administração', 'gerente', 'supervisor', 'administrador'].includes(role)) return true;
                                            return role === sector;
                                        });
                                        const sectorUserIds = sectorUsers.map(u => u.id);
                                        const allSelected = sectorUserIds.length > 0 && sectorUserIds.every(id => selectedUserIds.includes(id));
                                        
                                        return (
                                            <div key={s.id} className={`recipient-item-card ${allSelected ? 'selected' : ''}`} onClick={() => handleSelectBySector(s.name)}>
                                                <div className="recipient-info-text">
                                                    <h5>Setor: {s.name}</h5>
                                                    <p>{sectorUsers.length} colaboradores ativos</p>
                                                </div>
                                                <div className="recipient-check"><Check size={12} strokeWidth={3} /></div>
                                            </div>
                                        );
                                    })
                                )}

                                {recipientSubTab === 'areas' && (
                                    areas.filter(a => a.status === 'Ativo').map(a => {
                                        let areaUserCount = 0;
                                        if ([1, 2, 3].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['cozinha', 'chef', 'cozinheiro', 'produção'].includes((u.role || '').toLowerCase())).length;
                                        else if ([4, 5, 6].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['garçom', 'atendente', 'caixa', 'salão'].includes((u.role || '').toLowerCase())).length;
                                        else if ([7, 8, 9].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['estoquista', 'almoxarife', 'estoque'].includes((u.role || '').toLowerCase())).length;
                                        else if (a.id === 10) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['administrador', 'gerente', 'supervisor', 'administração'].includes((u.role || '').toLowerCase())).length;

                                        return (
                                            <div key={a.id} className="recipient-item-card" onClick={() => handleSelectByArea(a.id)}>
                                                <div className="recipient-info-text">
                                                    <h5>Área: {a.name}</h5>
                                                    <p>{areaUserCount} colaboradores possíveis</p>
                                                </div>
                                                <div className="recipient-check"><Check size={12} strokeWidth={3} /></div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'checklist' && (
                    /* PRINCIPAL DE CHECKLISTS */
                    <>
                        {checklistSubTab === 'dashboard' && (
                            /* INTERFACE DO DASHBOARD DE CHECKLISTS */
                            <>
                                <div className="kpi-row-grid">
                                    <div className="kpi-stat-card green">
                                        <h6>Vistorias Finalizadas</h6>
                                        <h3>{checklistExecutions.length}</h3>
                                    </div>
                                    <div className="kpi-stat-card blue">
                                        <h6>Modelos Ativos</h6>
                                        <h3>{checklistModels.filter(m => m.status === 'Ativo').length}</h3>
                                    </div>
                                    <div className="kpi-stat-card yellow">
                                        <h6>Pendentes Simulado</h6>
                                        <h3>2</h3>
                                    </div>
                                    <div className="kpi-stat-card orange">
                                        <h6>Conformidade Média Geral</h6>
                                        <h3>{calculateAverageConformity()}%</h3>
                                    </div>
                                </div>

                                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}><ClipboardList size={16} style={{ color: '#2dd4bf', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> INICIAR NOVA VISTORIA</h3>
                                </div>

                                {checklistModels.filter(m => m.status === 'Ativo').length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Nenhum modelo de checklist ativo no momento.</div>
                                ) : (
                                    <div className="models-list-grid">
                                        {checklistModels.filter(m => m.status === 'Ativo').map(m => (
                                            <div key={m.id} className="model-item-card">
                                                <div className="model-item-header">
                                                    <div>
                                                        <h4>{m.name}</h4>
                                                        <span className="model-badge-sector" style={{ fontSize: '0.65rem' }}>Frequência: {m.frequency}</span>
                                                    </div>
                                                    <span className={`model-badge-sector ${m.sector.toLowerCase()}`}>{m.sector}</span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                    Possui <strong>{m.items?.length || 0}</strong> questões de vistoria configuradas.
                                                </div>
                                                <button className="btn-start-run" onClick={() => handleStartExecution(m)} style={{ width: '100%', marginTop: 'auto' }}>
                                                    INICIAR VISTORIA
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {checklistSubTab === 'history' && (
                            /* HISTÓRICO DE AUDITORIA */
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', overflow: 'hidden' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>Histórico de Execuções</h4>
                                </div>

                                {checklistExecutions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Nenhuma vistoria finalizada cadastrada no histórico.</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="products-table">
                                            <thead>
                                                <tr>
                                                    <th>Checklist / Modelo</th>
                                                    <th>Setor</th>
                                                    <th>Data / Hora</th>
                                                    <th>Executor</th>
                                                    <th style={{ textAlign: 'center' }}>Conformidade</th>
                                                    <th style={{ textAlign: 'center' }}>Detalhes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {checklistExecutions.map(e => (
                                                    <tr key={e.id}>
                                                        <td><strong>{e.modelName}</strong></td>
                                                        <td><span className={`model-badge-sector ${e.sector.toLowerCase()}`}>{e.sector}</span></td>
                                                        <td>{new Date(e.endTime).toLocaleString('pt-BR')}</td>
                                                        <td>{e.executor}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ color: (e.conformity || 0) >= 80 ? '#4ade80' : '#f87171', fontWeight: 800, fontSize: '0.92rem' }}>
                                                                {e.conformity || 0}%
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button 
                                                                className="btn-tool" 
                                                                style={{ padding: '0.3rem 0.5rem', margin: '0 auto' }} 
                                                                onClick={() => setActiveExecutionDetail(e)}
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {checklistSubTab === 'models' && (
                            /* MODELOS DE CHECKLIST (TEMPLATES) */
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Templates de Checklists</h3>
                                    {currentUser.permissions.chkCreate && (
                                        <button className="btn-send-aviso" style={{ padding: '0.5rem 1.2rem', fontSize: '0.82rem' }} onClick={() => handleOpenBuilder()}>
                                            <Plus size={14} /> Novo Modelo
                                        </button>
                                    )}
                                </div>

                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Nome do Checklist</th>
                                                <th>Frequência</th>
                                                <th>Setor Destinado</th>
                                                <th style={{ textAlign: 'center' }}>Qtd Perguntas</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklistModels.map(m => (
                                                <tr key={m.id}>
                                                    <td><strong>{m.name}</strong></td>
                                                    <td>{m.frequency}</td>
                                                    <td><span className={`model-badge-sector ${m.sector.toLowerCase()}`}>{m.sector}</span></td>
                                                    <td style={{ textAlign: 'center' }}>{m.items?.length || 0}</td>
                                                    <td>
                                                        <span className={`status-badge ${m.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`}>
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                            <button className="btn-tool" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleOpenBuilder(m)}>Editar</button>
                                                            <button className="btn-tool" style={{ padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteChecklistModel(m.id)}>Excluir</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {checklistSubTab === 'builder' && (
                            /* CONSTRUTOR DE MODELOS DE CHECKLIST */
                            <div className="builder-container">
                                {/* BARRA LATERAL COM OPÇÕES DE ITENS */}
                                <div className="builder-sidebar">
                                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CAMPOS DO CHECKLIST</h5>
                                    
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('sim_nao')}>
                                        <CheckCircle2 size={14} style={{ color: '#4ade80' }} /> Sim / Não (Conformidade)
                                    </button>
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('checkbox')}>
                                        <CheckSquare size={14} style={{ color: '#2dd4bf' }} /> Checkbox (Concluir)
                                    </button>
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('texto')}>
                                        <FileText size={14} style={{ color: '#60a5fa' }} /> Resposta de Texto
                                    </button>
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('numero')}>
                                        <FileSpreadsheet size={14} style={{ color: '#facc15' }} /> Resposta Numérica
                                    </button>
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('foto')}>
                                        <Camera size={14} style={{ color: '#c084fc' }} /> Foto Obrigatória
                                    </button>
                                    <button className="btn-builder-add-item" onClick={() => handleAddBuilderItem('observacao')}>
                                        <AlertCircle size={14} style={{ color: '#f87171' }} /> Justificativa/Obs
                                    </button>

                                    <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-tool" style={{ flex: 1, padding: '0.6rem' }} onClick={() => setChecklistSubTab('models')}>Cancelar</button>
                                        <button className="btn-send-aviso" style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.8rem' }} onClick={handleSaveChecklistModel}>Salvar</button>
                                    </div>
                                </div>

                                {/* GRADE CENTRAL DO FORMULÁRIO */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                                            {builderEditId ? 'EDITAR MODELO DE CHECKLIST' : 'CONSTRUIR NOVO CHECKLIST'}
                                        </h4>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div className="composer-field-group">
                                                <label>Nome do Checklist *</label>
                                                <input type="text" className="input-title" placeholder="EX: VISTORIA DO SALÃO" value={builderName} onChange={(e) => setBuilderName(e.target.value.toUpperCase())} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
                                            </div>

                                            <div className="composer-field-group">
                                                <label>Setor Destinado</label>
                                                <select className="input-title" value={builderSector} onChange={(e) => setBuilderSector(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                                    <option value="COZINHA">COZINHA</option>
                                                    <option value="SALÃO">SALÃO</option>
                                                    <option value="ESTOQUE">ESTOQUE</option>
                                                    <option value="ADMINISTRAÇÃO">ADMINISTRAÇÃO</option>
                                                </select>
                                            </div>

                                            <div className="composer-field-group">
                                                <label>Frequência</label>
                                                <select className="input-title" value={builderFrequency} onChange={(e) => setBuilderFrequency(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                                    <option value="Diário">Diário</option>
                                                    <option value="Semanal">Semanal</option>
                                                    <option value="Mensal">Mensal</option>
                                                    <option value="Sob Demanda">Sob Demanda</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="builder-questions-list">
                                        {builderQuestions.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(30, 41, 59, 0.1)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                                                <ClipboardList size={32} style={{ marginBottom: '0.8rem', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum item de vistoria adicionado ainda.</p>
                                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem' }}>Use a barra lateral para inserir perguntas.</p>
                                            </div>
                                        ) : (
                                            builderQuestions.map((q, idx) => (
                                                <div key={q.id} className="builder-item-card">
                                                    <div className="builder-item-header">
                                                        <span className="builder-type-pill">{q.type === 'sim_nao' ? 'Sim / Não' : q.type}</span>
                                                        <button 
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                            onClick={() => handleRemoveBuilderItem(q.id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>

                                                    <div className="composer-field-group">
                                                        <input 
                                                            type="text" 
                                                            className="input-title" 
                                                            placeholder={`Digite a instrução ou pergunta #${idx + 1}...`}
                                                            value={q.label}
                                                            onChange={(e) => handleUpdateBuilderItem(q.id, 'label', e.target.value)}
                                                            style={{ padding: '0.5rem 0.8rem', fontSize: '0.92rem', background: 'rgba(0,0,0,0.15)' }}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                        <label className="checkbox-slider-wrapper active" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={q.required} 
                                                                onChange={(e) => handleUpdateBuilderItem(q.id, 'required', e.target.checked)}
                                                                style={{ display: 'none' }}
                                                            />
                                                            <div className={`checkbox-slider-thumb`}></div>
                                                            <div className={`checkbox-slider`} style={{ width: '32px', height: '18px', borderRadius: '9px', background: q.required ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)', borderColor: q.required ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)' }}>
                                                                <div className="checkbox-slider-thumb" style={{ width: '12px', height: '12px', top: '2px', left: q.required ? '16px' : '2px', background: q.required ? '#4ade80' : 'var(--text-secondary)' }}></div>
                                                            </div>
                                                            <span>Obrigatório</span>
                                                        </label>
                                                    </div>

                                                    {/* REGRAS CONDICIONAIS SE FOR SIM/NÃO */}
                                                    {q.type === 'sim_nao' && (
                                                        <div className="conditional-block">
                                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                <Compass size={12} /> REGRAS SE A RESPOSTA FOR "NÃO":
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: '#fff' }}>
                                                                    <input type="checkbox" checked={q.conditionalPhoto} onChange={(e) => handleUpdateBuilderItem(q.id, 'conditionalPhoto', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} /> Exigir Anexo de Foto
                                                                </label>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: '#fff' }}>
                                                                    <input type="checkbox" checked={q.conditionalObs} onChange={(e) => handleUpdateBuilderItem(q.id, 'conditionalObs', e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} /> Exigir Justificativa por Escrito
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {checklistSubTab === 'execution' && activeModelForExecution && (
                            /* EXECUÇÃO DO CHECKLIST */
                            <div className="exec-panel">
                                <div className="exec-info-row">
                                    <div>
                                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>{activeModelForExecution.name}</h3>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Setor: <strong>{activeModelForExecution.sector}</strong> | Executor: <strong>{currentUser.name}</strong>
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <MapPin size={16} style={{ color: gpsLoading ? 'var(--accent-orange)' : '#4ade80' }} />
                                        <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>{gpsCoordinates}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {activeModelForExecution.items.map((item, idx) => {
                                        const ansObj = execAnswers[item.id] || { answer: '', photo: null, obs: '' };
                                        
                                        return (
                                            <div key={item.id} className="exec-item-row">
                                                <div className="exec-item-question">
                                                    {idx + 1}. {item.label}
                                                    {item.required && <span style={{ color: '#ef4444', marginLeft: '0.2rem' }}>*</span>}
                                                </div>

                                                {/* INPUT CORRESPONDENTE */}
                                                {item.type === 'sim_nao' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div className="sim-nao-group">
                                                            <button 
                                                                className={`btn-sim-nao sim ${ansObj.answer === 'Sim' ? 'selected' : ''}`}
                                                                onClick={() => handleSimNaoClick(item.id, 'Sim', item.conditionalPhoto, item.conditionalObs)}
                                                            >
                                                                SIM
                                                            </button>
                                                            <button 
                                                                className={`btn-sim-nao nao ${ansObj.answer === 'Não' ? 'selected' : ''}`}
                                                                onClick={() => handleSimNaoClick(item.id, 'Não', item.conditionalPhoto, item.conditionalObs)}
                                                            >
                                                                NÃO
                                                            </button>
                                                        </div>

                                                        {/* MOSTRAR CONDICIONAIS SE FOR NÃO */}
                                                        {ansObj.answer === 'Não' && (item.conditionalPhoto || item.conditionalObs) && (
                                                            <div className="conditional-block" style={{ borderLeft: '3px solid #ef4444' }}>
                                                                {item.conditionalPhoto && (
                                                                    <div style={{ marginBottom: '1rem' }}>
                                                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.4rem' }}>FOTO DA IRREGULARIDADE *</label>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                            <button className="btn-exec-photo-capture" onClick={() => handleCaptureMockPhoto(item.id)}>
                                                                                <Camera size={14} /> Usar Câmera
                                                                            </button>
                                                                            <label className="btn-exec-photo-capture" style={{ cursor: 'pointer' }}>
                                                                                <Paperclip size={14} /> Escolher Arquivo
                                                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleChecklistPhotoUpload(item.id, e)} />
                                                                            </label>
                                                                        </div>
                                                                        {ansObj.photo && (
                                                                            <img src={ansObj.photo} className="exec-photo-preview" alt="Preview" />
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {item.conditionalObs && (
                                                                    <div>
                                                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.4rem' }}>JUSTIFICATIVA POR ESCRITO *</label>
                                                                        <textarea 
                                                                            className="textarea-exec-obs" 
                                                                            placeholder="Digite o motivo ou a ação corretiva tomada..."
                                                                            value={ansObj.obs}
                                                                            onChange={(e) => handleSetAnswerValue(item.id, 'obs', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {item.type === 'checkbox' && (
                                                    <div 
                                                        className={`checkbox-slider-wrapper ${ansObj.answer === 'Sim' ? 'active' : ''}`}
                                                        onClick={() => handleSetAnswerValue(item.id, 'answer', ansObj.answer === 'Sim' ? 'Não' : 'Sim')}
                                                    >
                                                        <div className="checkbox-slider">
                                                            <div className="checkbox-slider-thumb"></div>
                                                        </div>
                                                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: ansObj.answer === 'Sim' ? '#4ade80' : 'var(--text-secondary)' }}>
                                                            {ansObj.answer === 'Sim' ? 'REALIZADO' : 'PENDENTE'}
                                                        </span>
                                                    </div>
                                                )}

                                                {item.type === 'texto' && (
                                                    <input 
                                                        type="text" 
                                                        className="input-exec-text" 
                                                        placeholder="Digite sua resposta por extenso..."
                                                        value={ansObj.answer}
                                                        onChange={(e) => handleSetAnswerValue(item.id, 'answer', e.target.value)}
                                                    />
                                                )}

                                                {item.type === 'numero' && (
                                                    <input 
                                                        type="number" 
                                                        className="input-exec-number" 
                                                        placeholder="0.00"
                                                        value={ansObj.answer}
                                                        onChange={(e) => handleSetAnswerValue(item.id, 'answer', e.target.value)}
                                                    />
                                                )}

                                                {item.type === 'observacao' && (
                                                    <textarea 
                                                        className="textarea-exec-obs" 
                                                        placeholder="Digite observações ou anotações..."
                                                        value={ansObj.answer}
                                                        onChange={(e) => handleSetAnswerValue(item.id, 'answer', e.target.value)}
                                                    />
                                                )}

                                                {item.type === 'foto' && (
                                                    <div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <button className="btn-exec-photo-capture" onClick={() => handleCaptureMockPhoto(item.id)}>
                                                                <Camera size={14} /> Capturar Foto
                                                            </button>
                                                            <label className="btn-exec-photo-capture" style={{ cursor: 'pointer' }}>
                                                                <Paperclip size={14} /> Carregar Arquivo
                                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleChecklistPhotoUpload(item.id, e)} />
                                                            </label>
                                                        </div>
                                                        {ansObj.photo && (
                                                            <img src={ansObj.photo} className="exec-photo-preview" alt="Anexo" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', justifyContent: 'flex-end' }}>
                                    <button 
                                        className="btn-tool" 
                                        style={{ padding: '0.7rem 1.5rem' }} 
                                        onClick={() => {
                                            showSystemConfirm('Deseja realmente cancelar? Suas respostas atuais serão apagadas.', () => {
                                                setActiveModelForExecution(null);
                                                setChecklistSubTab('dashboard');
                                            });
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    
                                    <button 
                                        className="btn-send-aviso" 
                                        style={{ padding: '0.7rem 2rem' }}
                                        onClick={handleFinishExecution}
                                    >
                                        FINALIZAR VISTORIA
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL DETALHADO DO AVISO */}
            {activeNotification && createPortal(
                <div className="modal-overlay" onClick={() => setActiveNotification(null)} style={{ zIndex: 10000 }}>
                    <div className="confirm-modal-content notification-viewer-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3 id="view-notif-title">{activeNotification.title || 'AVISO'}</h3>
                            <button className="btn-close" onClick={() => setActiveNotification(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', textAlign: 'left', padding: '2rem' }}>
                            <div className="notif-meta-info" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Enviado por</span>
                                    <div id="view-notif-sender" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activeNotification.sender}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Data / Hora</span>
                                    <div id="view-notif-time" style={{ fontWeight: 'bold' }}>{new Date(activeNotification.timestamp).toLocaleString('pt-BR')}</div>
                                </div>
                            </div>
                            
                            <div id="view-notif-message" style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>{activeNotification.message}</div>

                            {activeNotification.attachment && (
                                <div id="view-notif-attachment-container" style={{ marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-main)', textAlign: 'center' }}>
                                    {activeNotification.attachment.type.startsWith('image/') ? (
                                        <img src={activeNotification.attachment.data} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }} alt="" />
                                    ) : (
                                        <div style={{ padding: '2rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', width: '100%', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)' }}>Documento PDF / Arquivo</div>
                                    )}
                                    <div style={{ marginTop: '1rem', padding: '1rem' }}>
                                        <a href={activeNotification.attachment.data} download={activeNotification.attachment.name} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', width: 'auto' }}><Download size={14} /> Baixar Arquivo</a>
                                    </div>
                                </div>
                            )}

                            {/* Read Receipts Section (Only for sender) */}
                            {activeNotification.sender === currentUser.name && activeNotification.targetUsers && activeNotification.targetUsers.length > 0 && (
                                <div id="view-notif-receipts-container" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--accent-orange)' }}>Confirmação de Leitura</h4>
                                    <div id="view-notif-receipts-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {activeNotification.targetUsers.map(uid => {
                                            const targetUser = appUsers.find(u => u.id === uid);
                                            if (!targetUser) return null;
                                            const readTime = activeNotification.readBy && activeNotification.readBy[uid];
                                            return (
                                                <div key={uid} className={`receipt-card ${readTime ? 'read' : 'unread'}`}>
                                                    <img src={getUserAvatar(targetUser.img)} className="receipt-avatar" alt="" />
                                                    <div className="receipt-info">
                                                        <h5>{targetUser.displayName || targetUser.name}</h5>
                                                        <span>
                                                            {readTime ? `Lido em ${new Date(readTime).toLocaleString('pt-BR')}` : 'Não lido'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* MODAL DETALHADO DO HISTÓRICO DE CHECKLIST */}
            {activeExecutionDetail && createPortal(
                <div className="modal-overlay" onClick={() => setActiveExecutionDetail(null)} style={{ zIndex: 10000 }}>
                    <div className="notif-detail-card" onClick={(e) => e.stopPropagation()} style={{ width: '850px' }}>
                        <div className="modal-header-notif">
                            <div>
                                <h3 style={{ margin: 0 }}>VISTORIA: {activeExecutionDetail.modelName}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID da execução: {activeExecutionDetail.id}</span>
                            </div>
                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }} onClick={() => setActiveExecutionDetail(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-scroll">
                            <div className="notif-detail-meta" style={{ paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <div className="sender-profile-detail">
                                    <div className="sender-info-text">
                                        <p>Setor Auditoria</p>
                                        <h4 style={{ fontSize: '1.05rem' }}>{activeExecutionDetail.executor} (Executor)</h4>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>CONFORMIDADE GERAL</span>
                                        <h4 style={{ margin: 0, fontSize: '1.3rem', color: activeExecutionDetail.conformity >= 80 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                                            {activeExecutionDetail.conformity}%
                                        </h4>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>FINALIZADO EM</span>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{new Date(activeExecutionDetail.endTime).toLocaleString('pt-BR')}</h4>
                                    </div>
                                </div>
                            </div>

                            {activeExecutionDetail.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.82rem', color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>
                                    <MapPin size={14} style={{ color: '#2dd4bf' }} />
                                    <span>Geolocalização: {activeExecutionDetail.location}</span>
                                </div>
                            )}

                            {/* Respostas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ margin: 0, color: 'var(--accent-orange)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>RESPOSTAS REGISTRADAS</h4>
                                
                                {activeModelForExecution || checklistModels.find(m => m.id === activeExecutionDetail.modelId) ? (
                                    (activeModelForExecution || checklistModels.find(m => m.id === activeExecutionDetail.modelId)).items.map((item, idx) => {
                                        const ans = activeExecutionDetail.answers[item.id] || { answer: '', photo: null, obs: '' };
                                        
                                        return (
                                            <div key={item.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff', marginBottom: '0.5rem' }}>
                                                    {idx + 1}. {item.label}
                                                </div>
                                                
                                                {item.type === 'sim_nao' && (
                                                    <div>
                                                        <span style={{ 
                                                            display: 'inline-block', 
                                                            padding: '0.2rem 0.6rem', 
                                                            borderRadius: '4px', 
                                                            fontSize: '0.8rem', 
                                                            fontWeight: 800,
                                                            background: ans.answer === 'Sim' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                                            color: ans.answer === 'Sim' ? '#4ade80' : '#f87171'
                                                        }}>
                                                            {ans.answer || 'NÃO RESPONDIDO'}
                                                        </span>
                                                        
                                                        {ans.answer === 'Não' && (ans.photo || ans.obs) && (
                                                            <div style={{ borderLeft: '2px solid #ef4444', paddingLeft: '0.8rem', marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                {ans.obs && (
                                                                    <div>
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>JUSTIFICATIVA:</span>
                                                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0' }}>{ans.obs}</p>
                                                                    </div>
                                                                )}
                                                                {ans.photo && (
                                                                    <div>
                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>ANEXO DE EVIDÊNCIA:</span>
                                                                        <img src={ans.photo} style={{ maxWidth: '240px', maxHeight: '150px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }} alt="Evidência" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {item.type === 'checkbox' && (
                                                    <span style={{ color: ans.answer === 'Sim' ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>
                                                        {ans.answer === 'Sim' ? '✔️ REALIZADO' : '❌ PENDENTE / NÃO CONCLUÍDO'}
                                                    </span>
                                                )}

                                                {item.type === 'texto' && (
                                                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', borderRadius: '4px' }}>
                                                        {ans.answer || 'Nenhuma resposta inserida.'}
                                                    </div>
                                                )}

                                                {item.type === 'numero' && (
                                                    <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>
                                                        Valor registrado: {ans.answer !== '' ? ans.answer : 'Sem registro'}
                                                    </span>
                                                )}

                                                {item.type === 'observacao' && (
                                                    <div style={{ fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                                                        {ans.answer || 'Sem observações.'}
                                                    </div>
                                                )}

                                                {item.type === 'foto' && (
                                                    <div>
                                                        {ans.photo ? (
                                                            <img src={ans.photo} style={{ maxWidth: '240px', maxHeight: '150px', borderRadius: '4px' }} alt="Anexo" />
                                                        ) : (
                                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nenhuma foto anexada.</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando dados das questões do checklist...</div>
                                )}
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
                                justifyContainer: 'center',
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
        </div>
    );
}
