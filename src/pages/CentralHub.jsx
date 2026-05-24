/**
 * Corellux OS - Central de Comunicação (Avisos e Notificações)
 * Permite a visualização, leitura e disparo de comunicados para a equipe.
 * Inclui confirmações de leitura (Read Receipts) em tempo real e anexos.
 */

import React, { useState, useEffect, useRef } from 'react';
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
    Signature
} from 'lucide-react';

export default function CentralHub() {
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser', 
        'appUsers', 
        'notifications', 
        'selectedUserIds', 
        'pendingAttachment'
    ]);

    // Local UI States
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' ou 'compose'
    const [recipientSubTab, setRecipientSubTab] = useState('users'); // 'users', 'sectors', 'areas'
    const [searchQuery, setSearchQuery] = useState('');
    const [feedFilter, setFeedFilter] = useState('todos'); // 'todos', 'unread', 'sent', 'sistema'
    const [activeNotification, setActiveNotification] = useState(null);
    const [sectors, setSectors] = useState([]);
    const [areas, setAreas] = useState([]);
    
    // Form States
    const [composeTitle, setComposeTitle] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composePriority, setComposePriority] = useState('normal'); // 'normal', 'urgente'
    const [charCount, setCharCount] = useState(0);

    const fileInputRef = useRef(null);

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

        // Load sectors and areas for recipient targeting
        DbService.getSectors().then(data => setSectors(data));
        DbService.getAreas().then(data => setAreas(data));
    }, []);

    // Filter and Search logic
    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente', permissions: {} };
    const notifications = state.notifications || [];
    const appUsers = state.appUsers || [];

    const canUserSeeNotification = (n) => {
        if (!currentUser) return false;
        
        const isAdmin = currentUser.accessLevel === 'Administrador';
        
        // Sender always sees it
        if (n.sender === currentUser.name) return true;

        // Targeted to specific users
        if (n.targetUsers && Array.isArray(n.targetUsers) && n.targetUsers.length > 0) {
            return n.targetUsers.includes(currentUser.id) || isAdmin;
        }

        // If admin, sees everything
        if (isAdmin) return true;

        // System notification without sector target (only system-wide)
        if (n.type === 'sistema' && !n.targetSector) return true;

        // Targeted to a sector
        const targetSector = (n.targetSector || 'Todos').trim();
        if (targetSector === 'Todos') return true;

        // Simple check if user's role belongs to target sector
        const role = (currentUser.role || '').toLowerCase();
        const sector = targetSector.toLowerCase();

        if (sector === 'cozinha' && (role === 'cozinha' || role === 'chef' || role === 'cozinheiro' || role === 'produção')) return true;
        if (sector === 'estoque' && (role === 'estoque' || role === 'estoquista' || role === 'almoxarife')) return true;
        if (sector === 'salão' && (role === 'salão' || role === 'garçom' || role === 'atendente' || role === 'caixa')) return true;
        if (sector === 'administração' && (role === 'administração' || role === 'gerente' || role === 'supervisor' || role === 'administrador')) return true;

        return role === sector;
    };

    // Filter notification feed
    const filteredNotifications = notifications.filter(n => {
        // 1. Visibilidade do usuário
        if (!canUserSeeNotification(n)) return false;

        // 2. Filtro de aba/categoria
        if (feedFilter === 'unread') {
            const isReadByMe = n.readBy && n.readBy[currentUser.id];
            if (isReadByMe || n.sender === currentUser.name) return false;
        } else if (feedFilter === 'sent') {
            if (n.sender !== currentUser.name) return false;
        } else if (feedFilter === 'sistema') {
            if (n.type !== 'sistema') return false;
        }

        // 3. Busca por texto
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const titleMatch = (n.title || '').toLowerCase().includes(query);
            const msgMatch = (n.message || '').toLowerCase().includes(query);
            const senderMatch = (n.sender || '').toLowerCase().includes(query);
            return titleMatch || msgMatch || senderMatch;
        }

        return true;
    });

    // Mark as Read
    const handleOpenNotification = async (n) => {
        setActiveNotification(n);

        // Se não foi lido por mim e eu não sou o remetente
        const isReadByMe = n.readBy && n.readBy[currentUser.id];
        if (!isReadByMe && n.sender !== currentUser.name) {
            const result = await DbService.markNotificationRead(n.id, currentUser.id);
            if (result.success) {
                // Update local notifications list
                const updatedList = notifications.map(item => {
                    if (item.id === n.id) {
                        return result.data;
                    }
                    return item;
                });
                setKey('notifications', updatedList);
                
                // Update modal view in real-time
                setActiveNotification(result.data);
            }
        }
    };

    // Recipients Multiselect helpers
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
        // Map old roles to sector
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
            // Remove those users
            setKey('selectedUserIds', selectedUserIds.filter(id => !matchedIds.includes(id)));
        } else {
            // Add missing users
            const newSelection = [...new Set([...selectedUserIds, ...matchedIds])];
            setKey('selectedUserIds', newSelection);
        }
    };

    const handleSelectByArea = (areaId) => {
        // Simple mock mapping based on areaId and roles
        // Area 1, 2, 3 -> Kitchen/Cozinha (Fernanda, Lucas)
        // Area 4, 5, 6 -> Salão/Atendentes (Mariana)
        // Area 7, 8, 9 -> Estoque (Carlos)
        // Area 10 -> Admin (Admin, Rafael, Gustavo)
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

    // Composer input message and length checker
    const handleMessageChange = (e) => {
        const text = e.target.value;
        if (text.length <= 500) {
            setComposeMessage(text);
            setCharCount(text.length);
        }
    };

    // Insert Gov.br Signature instruction helper
    const handleInsertGovSignature = () => {
        const signatureText = "\n\nPor favor, assine este documento digitalmente no portal ITI: https://assinador.iti.br/assinatura/index.xhtml e reenvie o arquivo assinado para o RH.";
        if (composeMessage.length + signatureText.length <= 500) {
            setComposeMessage(prev => prev + signatureText);
            setCharCount(prev => prev + signatureText.length);
        } else {
            alert('Limite de caracteres excedido para adicionar o texto de assinatura.');
        }
    };

    // Attachment uploading
    const handleAttachmentSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('O anexo deve ter no máximo 5MB.');
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

    // Send Message Trigger
    const handleSendNotification = async () => {
        if (!currentUser.permissions.sendNotif) {
            alert('Você não tem permissão para enviar avisos.');
            return;
        }

        if (!composeTitle.trim()) {
            alert('Por favor, defina um título para o aviso.');
            return;
        }

        if (!composeMessage.trim()) {
            alert('Por favor, escreva a mensagem do aviso.');
            return;
        }

        if (selectedUserIds.length === 0) {
            alert('Por favor, selecione pelo menos um destinatário.');
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
            // Update store
            setKey('notifications', [result.data, ...notifications]);
            
            // Clear fields
            setComposeTitle('');
            setComposeMessage('');
            setComposePriority('normal');
            setCharCount(0);
            setKey('selectedUserIds', []);
            setKey('pendingAttachment', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            // UI feedback
            alert('Aviso enviado com sucesso!');
            setActiveTab('feed');
        } else {
            alert('Erro ao enviar o aviso. Tente novamente.');
        }
    };

    // Helper: relative time formatting in PT-BR
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
            
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* STYLES EM BEDDED PARA RICH AESTHETICS E ANIMAÇÃO */}
            <style dangerouslySetInnerHTML={{__html: `
                .central-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    height: calc(100vh - 70px);
                    background: var(--bg-main, #0b0f19);
                    overflow: hidden;
                }

                .central-header-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 2rem;
                    background: rgba(30, 41, 59, 0.4);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .category-title-area {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .cat-icon-area {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.3rem;
                    background: rgba(243, 107, 29, 0.15);
                    color: var(--accent-orange, #f36b1d);
                    border: 1px solid rgba(243, 107, 29, 0.25);
                }

                .category-title-text h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-primary, #ffffff);
                    letter-spacing: 0.5px;
                }

                .category-title-text p {
                    font-size: 0.85rem;
                    margin: 0;
                    color: var(--text-secondary, #94a3b8);
                }

                .central-tabs-nav {
                    display: flex;
                    background: rgba(15, 23, 42, 0.6);
                    padding: 0.3rem;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    gap: 0.2rem;
                }

                .tab-btn {
                    padding: 0.6rem 1.5rem;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary, #94a3b8);
                    font-weight: 600;
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    outline: none;
                }

                .tab-btn:hover {
                    color: var(--text-primary, #fff);
                }

                .tab-btn.active {
                    background: var(--accent-orange, #f36b1d);
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(243, 107, 29, 0.3);
                }

                .central-content-container {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    max-width: 1300px;
                    margin: 0 auto;
                    width: 100%;
                }

                /* FEED DE AVISOS */
                .feed-filter-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    flex-wrap: wrap;
                }

                .filter-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .filter-pill {
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(15, 23, 42, 0.4);
                    color: var(--text-secondary, #94a3b8);
                    font-size: 0.82rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .filter-pill:hover {
                    border-color: rgba(255, 255, 255, 0.2);
                    color: #fff;
                }

                .filter-pill.active {
                    background: rgba(243, 107, 29, 0.15);
                    color: var(--accent-orange, #f36b1d);
                    border-color: rgba(243, 107, 29, 0.4);
                }

                .search-input-wrapper {
                    position: relative;
                    min-width: 250px;
                    width: 100%;
                    max-width: 380px;
                }

                .search-input-wrapper input {
                    width: 100%;
                    padding: 0.6rem 1rem 0.6rem 2.5rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(15, 23, 42, 0.6);
                    color: #fff;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                }

                .search-input-wrapper input:focus {
                    border-color: var(--accent-orange);
                    box-shadow: 0 0 0 2px rgba(243, 107, 29, 0.15);
                }

                .search-icon-inside {
                    position: absolute;
                    left: 0.8rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary);
                }

                .notif-cards-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .notif-card {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    align-items: flex-start;
                    gap: 1.25rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .notif-card:hover {
                    transform: translateY(-2px);
                    background: rgba(30, 41, 59, 0.4);
                    border-color: rgba(243, 107, 29, 0.3);
                    box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
                }

                .notif-card.unread {
                    border-left: 4px solid var(--accent-orange, #f36b1d);
                }

                .notif-card.priority-urgente {
                    border-right: 1px solid rgba(239, 68, 68, 0.3);
                    background: linear-gradient(90deg, rgba(30, 41, 59, 0.25) 0%, rgba(239, 68, 68, 0.02) 100%);
                }

                .notif-card.unread::after {
                    content: '';
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-orange, #f36b1d);
                    box-shadow: 0 0 8px var(--accent-orange);
                }

                .notif-card-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: var(--text-secondary);
                }

                .notif-card.unread .notif-card-icon {
                    color: var(--accent-orange);
                    background: rgba(243, 107, 29, 0.05);
                    border-color: rgba(243, 107, 29, 0.15);
                }

                .notif-card-content {
                    flex: 1;
                    min-width: 0;
                }

                .notif-card-meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.4rem;
                }

                .notif-card-sender {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .notif-card-time {
                    font-size: 0.78rem;
                    color: var(--text-secondary);
                }

                .notif-card-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 0 0 0.3rem;
                    letter-spacing: 0.2px;
                }

                .notif-card-title.urgente {
                    color: #f87171;
                }

                .notif-card-body-snippet {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .notif-card-badges {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }

                .badge-card {
                    padding: 0.15rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .badge-card.urgente {
                    background: rgba(239, 68, 68, 0.15);
                    color: #f87171;
                }

                .badge-card.attachment {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                }

                /* COMPOSER */
                .composer-panel {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 2rem;
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 2rem;
                }

                @media (max-width: 900px) {
                    .composer-panel {
                        grid-template-columns: 1fr;
                    }
                }

                .composer-main {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .composer-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .composer-field-group label {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .input-title {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 0.8rem 1rem;
                    color: #fff;
                    font-size: 1rem;
                    outline: none;
                    font-weight: 600;
                }

                .textarea-body {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 1rem;
                    color: #fff;
                    font-size: 0.95rem;
                    outline: none;
                    resize: vertical;
                    min-height: 200px;
                    line-height: 1.6;
                    font-family: inherit;
                }

                .textarea-body:focus, .input-title:focus {
                    border-color: var(--accent-orange);
                }

                .composer-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 1rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .btn-tool {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    transition: all 0.2s;
                }

                .btn-tool:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.15);
                }

                .attachment-preview-box {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    background: rgba(59, 130, 246, 0.08);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    padding: 0.5rem 0.8rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    color: #60a5fa;
                }

                .btn-remove-att {
                    background: transparent;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 0.2rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-remove-att:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                /* DESTINATÁRIOS SIDEBAR */
                .composer-sidebar {
                    background: rgba(15, 23, 42, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    height: 520px;
                }

                .recipients-tabs {
                    display: flex;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 0.2rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .recipients-tab-btn {
                    flex: 1;
                    padding: 0.4rem;
                    text-align: center;
                    font-size: 0.78rem;
                    font-weight: 700;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .recipients-tab-btn.active {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }

                .recipients-list-scroll {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding-right: 0.25rem;
                }

                .recipient-item-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    padding: 0.6rem 0.8rem;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .recipient-item-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .recipient-item-card.selected {
                    background: rgba(243, 107, 29, 0.1);
                    border-color: rgba(243, 107, 29, 0.3);
                }

                .recipient-avatar-mini {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .recipient-info-text {
                    flex: 1;
                    min-width: 0;
                }

                .recipient-info-text h5 {
                    margin: 0;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .recipient-info-text p {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .recipient-check {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: transparent;
                    transition: all 0.1s;
                }

                .recipient-item-card.selected .recipient-check {
                    background: var(--accent-orange);
                    border-color: var(--accent-orange);
                    color: #fff;
                }

                /* MODAL VISUALIZAÇÃO */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1.5rem;
                }

                .notif-detail-card {
                    background: #111827;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    width: 760px;
                    max-width: 100%;
                    max-height: 85vh;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    animation: modalShow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes modalShow {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .modal-header-notif {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .modal-header-notif h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: 0.5px;
                }

                .modal-body-scroll {
                    padding: 2rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .notif-detail-meta {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 1.25rem;
                }

                .sender-profile-detail {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }

                .sender-avatar-large {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid var(--accent-orange);
                }

                .sender-info-text h4 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #fff;
                }

                .sender-info-text p {
                    margin: 0;
                    font-size: 0.78rem;
                    color: var(--text-secondary);
                }

                .notif-detail-time-text {
                    text-align: right;
                }

                .notif-detail-time-text span {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .notif-detail-time-text h5 {
                    margin: 0.15rem 0 0;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #fff;
                }

                .notif-detail-message-body {
                    font-size: 1.05rem;
                    line-height: 1.7;
                    color: #e2e8f0;
                    white-space: pre-wrap;
                }

                .notif-detail-attachment-viewer {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .receipts-receipt-card {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    background: rgba(255, 255, 255, 0.02);
                    padding: 0.5rem 0.8rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                }

                .receipts-receipt-card.read {
                    border-color: rgba(34, 197, 94, 0.2);
                    background: rgba(34, 197, 94, 0.03);
                }

                .receipts-receipt-card.read i {
                    color: #22c55e;
                }

                .receipts-receipt-card.unread {
                    opacity: 0.6;
                }

                .receipts-receipt-card.unread i {
                    color: var(--text-secondary);
                }

                .btn-send-aviso {
                    background: var(--accent-orange);
                    color: #fff;
                    border: none;
                    padding: 0.8rem 2rem;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(243, 107, 29, 0.3);
                }

                .btn-send-aviso:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(243, 107, 29, 0.4);
                }

                .btn-send-aviso:disabled {
                    background: rgba(30, 41, 59, 0.6);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
            `}} />

            {/* HEADER DA TELA */}
            <div className="central-header-bar">
                <div className="category-title-area">
                    <button className="btn-back" onClick={() => setKey('currentScreen', 'dashboard')} style={{ background: 'rgba(255,255,255,0.04)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', marginRight: '0.5rem', display: 'flex', alignItems: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                        <ArrowLeft size={14} style={{ marginRight: '0.4rem' }} /> VOLTAR
                    </button>
                    <div className="cat-icon-area">
                        <Bell size={20} />
                    </div>
                    <div className="category-title-text">
                        <h2>MEUS AVISOS & COMUNICADOS</h2>
                        <p>Gestão e acompanhamento da comunicação interna</p>
                    </div>
                </div>

                <div className="central-tabs-nav">
                    <button 
                        className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('feed')}
                    >
                        <Bell size={15} /> MEUS AVISOS
                    </button>
                    {currentUser.permissions.sendNotif && (
                        <button 
                            className={`tab-btn ${activeTab === 'compose' ? 'active' : ''}`}
                            onClick={() => setActiveTab('compose')}
                        >
                            <Send size={15} /> ENVIAR AVISO
                        </button>
                    )}
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="central-content-container">
                {activeTab === 'feed' ? (
                    /* ABA FEED DE AVISOS */
                    <>
                        <div className="feed-filter-row">
                            <div className="filter-buttons">
                                <button 
                                    className={`filter-pill ${feedFilter === 'todos' ? 'active' : ''}`}
                                    onClick={() => setFeedFilter('todos')}
                                >
                                    Todos
                                </button>
                                <button 
                                    className={`filter-pill ${feedFilter === 'unread' ? 'active' : ''}`}
                                    onClick={() => setFeedFilter('unread')}
                                >
                                    Não Lidos
                                </button>
                                <button 
                                    className={`filter-pill ${feedFilter === 'sent' ? 'active' : ''}`}
                                    onClick={() => setFeedFilter('sent')}
                                >
                                    Enviados por Mim
                                </button>
                                <button 
                                    className={`filter-pill ${feedFilter === 'sistema' ? 'active' : ''}`}
                                    onClick={() => setFeedFilter('sistema')}
                                >
                                    Sistema
                                </button>
                            </div>
                            
                            <div className="search-input-wrapper">
                                <Search size={16} className="search-icon-inside" />
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar título, conteúdo ou remetente..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {filteredNotifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(30, 41, 59, 0.1)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                <AlertTriangle size={36} style={{ color: 'var(--accent-orange)', marginBottom: '1rem', opacity: 0.7 }} />
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>Nenhum aviso encontrado</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                    Não há comunicados para exibir com os filtros atuais.
                                </p>
                            </div>
                        ) : (
                            <div className="notif-cards-grid">
                                {filteredNotifications.map((n) => {
                                    const isRead = n.readBy && n.readBy[currentUser.id];
                                    const showUnreadMarker = !isRead && n.sender !== currentUser.name;
                                    
                                    return (
                                        <div 
                                            key={n.id} 
                                            className={`notif-card ${showUnreadMarker ? 'unread' : ''} priority-${n.priority || 'normal'}`}
                                            onClick={() => handleOpenNotification(n)}
                                        >
                                            <div className="notif-card-icon">
                                                {n.sender === 'Sistema' ? <Bell size={18} /> : <Send size={18} />}
                                            </div>
                                            <div className="notif-card-content">
                                                <div className="notif-card-meta">
                                                    <span className="notif-card-sender">
                                                        {n.sender === currentUser.name ? 'Você' : n.sender}
                                                        {n.senderRole && <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem', marginLeft: '0.4rem' }}>• {n.senderRole}</span>}
                                                    </span>
                                                    <span className="notif-card-time">{formatRelativeTime(n.timestamp)}</span>
                                                </div>
                                                <h4 className={`notif-card-title ${n.priority === 'urgente' ? 'urgente' : ''}`}>
                                                    {n.title}
                                                </h4>
                                                <p className="notif-card-body-snippet">
                                                    {n.message}
                                                </p>
                                                <div className="notif-card-badges">
                                                    {n.priority === 'urgente' && <span className="badge-card urgente">Urgente</span>}
                                                    {n.attachment && <span className="badge-card attachment">Contém Anexo</span>}
                                                    {n.sender === currentUser.name && n.targetUsers && n.targetUsers.length > 0 && (
                                                        <span className="badge-card" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                                            {Object.keys(n.readBy || {}).length} / {n.targetUsers.length} Lidos
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    /* ABA ENVIAR AVISO */
                    <div className="composer-panel">
                        <div className="composer-main">
                            <div className="composer-field-group">
                                <label>Título do Comunicado *</label>
                                <input 
                                    type="text" 
                                    className="input-title"
                                    placeholder="Ex: REUNIÃO GERAL DE EQUIPE"
                                    value={composeTitle}
                                    onChange={(e) => setComposeTitle(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="composer-field-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Mensagem *</label>
                                    <span style={{ fontSize: '0.75rem', color: charCount > 450 ? '#ef4444' : 'var(--text-secondary)' }}>
                                        {charCount} / 500 caracteres
                                    </span>
                                </div>
                                <textarea 
                                    className="textarea-body"
                                    placeholder="O que você gostaria de comunicar aos colaboradores selecionados?"
                                    value={composeMessage}
                                    onChange={handleMessageChange}
                                    maxLength={500}
                                />
                            </div>

                            <div className="composer-field-group">
                                <label>Prioridade do Alerta</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: '#fff', fontSize: '0.88rem', fontWeight: 500 }}>
                                        <input 
                                            type="radio" 
                                            name="priority" 
                                            value="normal" 
                                            checked={composePriority === 'normal'}
                                            onChange={() => setComposePriority('normal')}
                                            style={{ accentColor: 'var(--accent-orange)' }}
                                        /> Normal
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', color: '#f87171', fontSize: '0.88rem', fontWeight: 500 }}>
                                        <input 
                                            type="radio" 
                                            name="priority" 
                                            value="urgente"
                                            checked={composePriority === 'urgente'}
                                            onChange={() => setComposePriority('urgente')}
                                            style={{ accentColor: '#ef4444' }}
                                        /> Urgente (Exibe em destaque vermelho)
                                    </label>
                                </div>
                            </div>

                            <div className="composer-toolbar">
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleAttachmentSelect}
                                        accept="image/*,.pdf"
                                    />
                                    <button 
                                        className="btn-tool"
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <Paperclip size={14} /> Anexar Imagem/PDF
                                    </button>
                                    
                                    <button 
                                        className="btn-tool"
                                        onClick={handleInsertGovSignature}
                                        style={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                                    >
                                        <Signature size={14} /> Pedir Assinatura Digital
                                    </button>

                                    {state.pendingAttachment && (
                                        <div className="attachment-preview-box">
                                            <FileText size={14} />
                                            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {state.pendingAttachment.name}
                                            </span>
                                            <button className="btn-remove-att" onClick={handleRemoveAttachment}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    className="btn-send-aviso"
                                    disabled={!composeTitle.trim() || !composeMessage.trim() || selectedUserIds.length === 0}
                                    onClick={handleSendNotification}
                                >
                                    <Send size={15} /> DISPARAR AVISO
                                </button>
                            </div>
                        </div>

                        {/* LISTA LATERAL DE SELEÇÃO */}
                        <div className="composer-sidebar">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    DESTINATÁRIOS ({selectedUserIds.length})
                                </label>
                                <button 
                                    onClick={handleSelectAll}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-orange)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                >
                                    {selectedUserIds.length === appUsers.filter(u => u.status === 'Ativo').length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </button>
                            </div>

                            <div className="recipients-tabs">
                                <button 
                                    className={`recipients-tab-btn ${recipientSubTab === 'users' ? 'active' : ''}`}
                                    onClick={() => setRecipientSubTab('users')}
                                >
                                    Colaboradores
                                </button>
                                <button 
                                    className={`recipients-tab-btn ${recipientSubTab === 'sectors' ? 'active' : ''}`}
                                    onClick={() => setRecipientSubTab('sectors')}
                                >
                                    Setores
                                </button>
                                <button 
                                    className={`recipients-tab-btn ${recipientSubTab === 'areas' ? 'active' : ''}`}
                                    onClick={() => setRecipientSubTab('areas')}
                                >
                                    Áreas
                                </button>
                            </div>

                            <div className="recipients-list-scroll">
                                {recipientSubTab === 'users' && (
                                    appUsers.filter(u => u.status === 'Ativo').map(u => {
                                        const isSelected = selectedUserIds.includes(u.id);
                                        return (
                                            <div 
                                                key={u.id}
                                                className={`recipient-item-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleToggleUser(u.id)}
                                            >
                                                <img src={getUserAvatar(u.img)} className="recipient-avatar-mini" alt="" />
                                                <div className="recipient-info-text">
                                                    <h5>{u.displayName || u.name}</h5>
                                                    <p>{u.role}</p>
                                                </div>
                                                <div className="recipient-check">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {recipientSubTab === 'sectors' && (
                                    sectors.filter(s => s.status === 'Ativo').map(s => {
                                        // Check if all active members of this sector are selected
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
                                            <div 
                                                key={s.id}
                                                className={`recipient-item-card ${allSelected ? 'selected' : ''}`}
                                                onClick={() => handleSelectBySector(s.name)}
                                            >
                                                <div className="recipient-info-text">
                                                    <h5>Setor: {s.name}</h5>
                                                    <p>{sectorUsers.length} colaboradores ativos</p>
                                                </div>
                                                <div className="recipient-check">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {recipientSubTab === 'areas' && (
                                    areas.filter(a => a.status === 'Ativo').map(a => {
                                        // Mock count mapping
                                        let areaUserCount = 0;
                                        if ([1, 2, 3].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['cozinha', 'chef', 'cozinheiro', 'produção'].includes((u.role || '').toLowerCase())).length;
                                        else if ([4, 5, 6].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['garçom', 'atendente', 'caixa', 'salão'].includes((u.role || '').toLowerCase())).length;
                                        else if ([7, 8, 9].includes(a.id)) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['estoquista', 'almoxarife', 'estoque'].includes((u.role || '').toLowerCase())).length;
                                        else if (a.id === 10) areaUserCount = appUsers.filter(u => u.status === 'Ativo' && ['administrador', 'gerente', 'supervisor', 'administração'].includes((u.role || '').toLowerCase())).length;

                                        // Try to simulate if selected
                                        return (
                                            <div 
                                                key={a.id}
                                                className="recipient-item-card"
                                                onClick={() => handleSelectByArea(a.id)}
                                            >
                                                <div className="recipient-info-text">
                                                    <h5>Área: {a.name}</h5>
                                                    <p>{areaUserCount} colaboradores possíveis</p>
                                                </div>
                                                <div className="recipient-check">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DETALHADO DO AVISO */}
            {activeNotification && (
                <div className="modal-overlay" onClick={() => setActiveNotification(null)}>
                    <div className="notif-detail-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-notif">
                            <h3>{activeNotification.title}</h3>
                            <button 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                                onClick={() => setActiveNotification(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body-scroll">
                            {/* Meta remetente */}
                            <div className="notif-detail-meta">
                                <div className="sender-profile-detail">
                                    <img 
                                        src={getUserAvatar(appUsers.find(u => u.name === activeNotification.sender)?.img)} 
                                        className="sender-avatar-large" 
                                        alt="" 
                                    />
                                    <div className="sender-info-text">
                                        <h4>{activeNotification.sender}</h4>
                                        <p>{activeNotification.senderRole || 'Colaborador'}</p>
                                    </div>
                                </div>
                                <div className="notif-detail-time-text">
                                    <span>ENVIADO EM</span>
                                    <h5>{new Date(activeNotification.timestamp).toLocaleString('pt-BR')}</h5>
                                </div>
                            </div>

                            {/* Conteúdo da mensagem */}
                            <div className="notif-detail-message-body">
                                {activeNotification.message}
                            </div>

                            {/* Anexo se houver */}
                            {activeNotification.attachment && (
                                <div className="notif-detail-attachment-viewer">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 600 }}>
                                        <FileText size={18} />
                                        <span>ANEXO: {activeNotification.attachment.name}</span>
                                    </div>
                                    
                                    {activeNotification.attachment.type.startsWith('image/') ? (
                                        <img 
                                            src={activeNotification.attachment.data} 
                                            style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.05)' }} 
                                            alt="Anexo do aviso" 
                                        />
                                    ) : (
                                        <div style={{ padding: '2rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', width: '100%', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                            Documento PDF / Arquivo externo
                                        </div>
                                    )}

                                    <a 
                                        href={activeNotification.attachment.data} 
                                        download={activeNotification.attachment.name}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', textDecoration: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.5rem' }}
                                    >
                                        <Download size={14} /> Baixar Arquivo
                                    </a>
                                </div>
                            )}

                            {/* RECIBOS DE LEITURA (Apenas para o remetente e se houver alvos específicos) */}
                            {activeNotification.sender === currentUser.name && activeNotification.targetUsers && activeNotification.targetUsers.length > 0 && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-orange)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                        Confirmação de Leitura
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.8rem' }}>
                                        {activeNotification.targetUsers.map(uid => {
                                            const targetUser = appUsers.find(u => u.id === uid);
                                            if (!targetUser) return null;
                                            
                                            const readTime = activeNotification.readBy && activeNotification.readBy[uid];
                                            
                                            return (
                                                <div 
                                                    key={uid} 
                                                    className={`receipts-receipt-card ${readTime ? 'read' : 'unread'}`}
                                                >
                                                    <img src={getUserAvatar(targetUser.img)} style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="" />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <h5 style={{ margin: 0, fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {targetUser.displayName || targetUser.name}
                                                        </h5>
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: readTime ? '#22c55e' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                            {readTime ? (
                                                                <>
                                                                    <CheckCheck size={10} /> Lido {formatRelativeTime(readTime)}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock size={10} /> Pendente
                                                                </>
                                                            )}
                                                        </p>
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
            )}
        </div>
    );
}
