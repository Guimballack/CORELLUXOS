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
    Plus,
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
    
    // Form States (Avisos)
    const [composeTitle, setComposeTitle] = useState('AVISO DO SISTEMA');
    const [composeMessage, setComposeMessage] = useState('');
    const [composePriority, setComposePriority] = useState('normal'); // 'normal', 'urgente'
    const [charCount, setCharCount] = useState(0);
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

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

        setKey('centralActiveTab', 'menu');
    }, []);

    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente', permissions: {} };
    const notifications = state.notifications || [];
    const appUsers = state.appUsers || [];

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
        const activeUsers = appUsers.filter(u => u.status === 'Ativo' && u.id !== currentUser.id);
        if (selectedUserIds.length === activeUsers.length) {
            setKey('selectedUserIds', []);
        } else {
            setKey('selectedUserIds', activeUsers.map(u => u.id));
        }
    };

    const handleSelectBySector = (sectorName) => {
        const matchedUsers = appUsers.filter(u => {
            if (u.status !== 'Ativo' || u.id === currentUser.id) return false;
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

        const matchedIds = matchedUsers.filter(u => u.status === 'Ativo' && u.id !== currentUser.id).map(u => u.id);
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
        if (!composeMessage.trim() || selectedUserIds.length === 0) {
            showSystemAlert('Preencha todos os campos obrigatórios (mensagem e destinatários).', 'Atenção');
            return;
        }

        const notif = {
            id: Date.now(),
            type: 'sistema',
            title: composeTitle.toUpperCase() || 'AVISO DO SISTEMA',
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
            setComposeTitle('AVISO DO SISTEMA');
            setComposeMessage('');
            setComposePriority('normal');
            setCharCount(0);
            setKey('selectedUserIds', []);
            setKey('pendingAttachment', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            showSystemAlert('Aviso enviado com sucesso!', 'Sucesso');
            setActiveTab('feed');
            setIsComposeModalOpen(false);
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


    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: isComposeModalOpen || activeTab === 'feed' ? 'hidden' : 'auto' }}>
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

                /* Custom employee selection styles inside compose modal */
                .modal-overlay .employee-grid .selection-card {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    transform: none !important;
                }
                .modal-overlay .employee-grid .selection-card:hover {
                    background: transparent !important;
                    transform: translateY(-2px) !important;
                }
                .modal-overlay .employee-grid .selection-card.selected {
                    background: transparent !important;
                    border: none !important;
                }
                .modal-overlay .employee-grid .selection-card.selected::after {
                    display: none !important; /* Hide checkmark icon */
                }
            `}} />



            <div className="central-content-container" style={{ overflowY: isComposeModalOpen || activeTab === 'feed' ? 'hidden' : 'auto' }}>
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
                                onClick={() => setIsComposeModalOpen(true)}
                            >
                                <div className="card-icon"><Send size={24} /></div>
                                <div className="card-content">
                                    <h3>ENVIAR AVISOS</h3>
                                    <p>Disparar novos avisos, criar comunicados e definir destinatários.</p>
                                </div>
                                <ChevronRight className="chevron" size={20} />
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'feed' && (
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
            </div>

            {isComposeModalOpen && createPortal(
                <div className="modal-overlay" onClick={() => setIsComposeModalOpen(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div 
                        className="confirm-modal-content" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                            width: '1100px', 
                            maxWidth: '95vw', 
                            maxHeight: '90vh', 
                            display: 'flex', 
                            flexDirection: 'column',
                            padding: '1.5rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.2rem', flexShrink: 0 }}>
                            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontWeight: 700 }}>
                                <Send size={16} /> COMPOR NOVO AVISO
                            </h3>
                            <button 
                                onClick={() => setIsComposeModalOpen(false)} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div 
                            style={{ 
                                flex: 1,
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1.5rem',
                                overflow: 'hidden',
                                minHeight: 0
                            }}
                        >
                            <div 
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    overflow: 'hidden',
                                    gap: '0.7rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                                        DESTINATÁRIOS <span style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>({selectedUserIds.length})</span>
                                    </label>
                                    <button className="btn-select-all" onClick={handleSelectAll} style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}>
                                        <CheckCheck size={12} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                                        {selectedUserIds.length === appUsers.filter(u => u.status === 'Ativo' && u.id !== currentUser.id).length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.25)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                    {[
                                        { id: 'users', icon: 'fa-user', label: 'Colaboradores' },
                                        { id: 'sectors', icon: 'fa-network-wired', label: 'Setores' },
                                        { id: 'areas', icon: 'fa-layer-group', label: 'Cargos' }
                                    ].map(tab => (
                                        <button 
                                            key={tab.id}
                                            type="button" 
                                            onClick={() => setRecipientSubTab(tab.id)} 
                                            style={{ 
                                                flex: 1, border: 'none', padding: '0.5rem 0.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem',
                                                color: recipientSubTab === tab.id ? 'white' : 'var(--text-secondary)', 
                                                background: recipientSubTab === tab.id ? 'var(--accent-orange)' : 'transparent', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', outline: 'none', transition: 'all 0.2s'
                                            }}
                                        >
                                            <i className={`fas ${tab.icon}`} style={{ fontSize: '0.75rem' }}></i> {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div 
                                    className={`user-selection-grid ${recipientSubTab === 'users' ? 'employee-grid' : 'category-grid'}`}
                                    style={{
                                        gridTemplateColumns: recipientSubTab === 'users' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(140px, 1fr))',
                                        flex: 1,
                                        maxHeight: 'unset',
                                        overflowY: 'auto',
                                        gap: '0.6rem',
                                        alignContent: 'start',
                                        display: 'grid'
                                    }}
                                >
                                    {recipientSubTab === 'users' && (
                                        appUsers.filter(u => u.status === 'Ativo' && u.id !== currentUser.id).map(user => {
                                            const isSelected = selectedUserIds.includes(user.id);
                                            return (
                                                <div 
                                                    key={user.id} 
                                                    className={`selection-card ${isSelected ? 'selected' : ''}`} 
                                                    onClick={() => handleToggleUser(user.id)} 
                                                    style={{ 
                                                        padding: '0.5rem',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        boxShadow: 'none'
                                                    }}
                                                >
                                                    <img 
                                                        src={getUserAvatar(user.img)} 
                                                        alt={user.name} 
                                                        className="sel-avatar" 
                                                        style={{ 
                                                            width: '80px', 
                                                            height: '80px', 
                                                            borderRadius: '50%',
                                                            objectFit: 'cover',
                                                            marginBottom: '0.6rem',
                                                            border: isSelected ? '3px solid var(--accent-orange)' : '3px solid transparent',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: isSelected ? '0 0 12px rgba(243, 107, 29, 0.4)' : 'none'
                                                        }} 
                                                    />
                                                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem', color: 'var(--text-primary)', fontWeight: '600' }}>{user.displayName || user.name}</h4>
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{user.role}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                    {recipientSubTab === 'sectors' && (
                                        sectors.filter(s => s.status === 'Ativo').map(sector => {
                                            const sectorUsers = appUsers.filter(u => {
                                                if (u.status !== 'Ativo' || u.id === currentUser.id) return false;
                                                const role = (u.role || '').toLowerCase().trim();
                                                const sec = sector.name.toLowerCase().trim();
                                                if (sec === 'cozinha' && ['cozinha', 'chef', 'cozinheiro', 'produção'].includes(role)) return true;
                                                if (sec === 'estoque' && ['estoque', 'estoquista', 'almoxarife'].includes(role)) return true;
                                                if (sec === 'salão' && ['salão', 'garçom', 'atendente', 'caixa'].includes(role)) return true;
                                                if (sec === 'administração' && ['administração', 'gerente', 'supervisor', 'administrador'].includes(role)) return true;
                                                return role === sec;
                                            });
                                            const isSelected = sectorUsers.length > 0 && sectorUsers.every(u => selectedUserIds.includes(u.id));
                                            const colorClass = sector.color || 'color-orange';
                                            return (
                                                <div 
                                                    key={sector.id} 
                                                    className={`selection-card ${isSelected ? 'selected' : ''}`} 
                                                    onClick={() => handleSelectBySector(sector.name)} 
                                                    style={{ 
                                                        minHeight: '115px', 
                                                        justifyContent: 'center', 
                                                        padding: '0.85rem 0.6rem',
                                                        background: isSelected ? 'rgba(243, 107, 29, 0.1)' : 'var(--bg-card)',
                                                        border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)'
                                                    }}
                                                >
                                                    <div className={`sector-icon-badge ${colorClass}`} style={{ width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <i className={`fas ${sector.icon || 'fa-network-wired'}`}></i>
                                                    </div>
                                                    <h4 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>{sector.name}</h4>
                                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{sectorUsers.length} colab.</p>
                                                </div>
                                            );
                                        })
                                    )}
                                    {recipientSubTab === 'areas' && (
                                        areas.filter(a => a.status === 'Ativo').map(area => {
                                            let areaUsers = [];
                                            if ([1, 2, 3].includes(area.id)) areaUsers = appUsers.filter(u => ['cozinha', 'chef', 'cozinheiro', 'produção'].includes((u.role || '').toLowerCase()));
                                            else if ([4, 5, 6].includes(area.id)) areaUsers = appUsers.filter(u => ['garçom', 'atendente', 'caixa', 'salão'].includes((u.role || '').toLowerCase()));
                                            else if ([7, 8, 9].includes(area.id)) areaUsers = appUsers.filter(u => ['estoquista', 'almoxarife', 'estoque'].includes((u.role || '').toLowerCase()));
                                            else if (area.id === 10) areaUsers = appUsers.filter(u => ['administrador', 'gerente', 'supervisor', 'administração'].includes((u.role || '').toLowerCase()));
                                            const areaUsersFiltered = areaUsers.filter(u => u.status === 'Ativo' && u.id !== currentUser.id);
                                            const isSelected = areaUsersFiltered.length > 0 && areaUsersFiltered.every(u => selectedUserIds.includes(u.id));
                                            const parentSector = sectors.find(s => s.id === area.sectorId) || { name: 'Geral', color: 'color-blue' };
                                            const colorClass = parentSector.color || 'color-blue';
                                            return (
                                                <div 
                                                    key={area.id} 
                                                    className={`selection-card ${isSelected ? 'selected' : ''}`} 
                                                    onClick={() => handleSelectByArea(area.id)} 
                                                    style={{ 
                                                        minHeight: '115px', 
                                                        justifyContent: 'center', 
                                                        padding: '0.85rem 0.6rem',
                                                        background: isSelected ? 'rgba(243, 107, 29, 0.1)' : 'var(--bg-card)',
                                                        border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)'
                                                    }}
                                                >
                                                    <div className={`area-icon-badge ${colorClass}`} style={{ width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: '0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <i className="fas fa-layer-group"></i>
                                                    </div>
                                                    <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={area.name}>{area.name}</h4>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem', textTransform: 'uppercase' }}>{parentSector.name}</span>
                                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{areaUsersFiltered.length} colab.</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div 
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    overflow: 'hidden',
                                    gap: '0.8rem'
                                }}
                            >
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', flexShrink: 0 }}>MENSAGEM DO AVISO *</label>
                                
                                <div 
                                    className="message-input-wrapper" 
                                    style={{ 
                                        flex: 1, 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '0.8rem', 
                                        padding: '1.2rem',
                                        marginTop: 0,
                                        overflow: 'hidden',
                                        minHeight: 0
                                    }}
                                >
                                    <textarea 
                                        id="notif-message-input" 
                                        placeholder="O que você deseja comunicar à equipe?" 
                                        value={composeMessage} 
                                        onChange={handleMessageChange} 
                                        maxLength={500}
                                        style={{ flex: 1, height: 'auto', minHeight: '60px', resize: 'none', fontSize: '0.95rem' }}
                                    />
                                    
                                    {state.pendingAttachment && (
                                        <div className="attachment-preview" style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.8rem', flexShrink: 0 }}>
                                            <FileText size={13} />
                                            <span style={{ marginLeft: '0.4rem', marginRight: '0.4rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{state.pendingAttachment.name}</span>
                                            <button className="btn-remove-attachment" onClick={handleRemoveAttachment} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flexShrink: 0 }}>
                                         <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachmentSelect} accept="image/*,.pdf" />
                                         <button className="btn-attach" onClick={() => fileInputRef.current.click()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.35rem 0.7rem', borderRadius: '7px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                             <Paperclip size={12} /> Imagem/PDF
                                         </button>
                                         <button className="btn-attach" onClick={handleInsertGovSignature} style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '0.72rem', padding: '0.35rem 0.7rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                             <Signature size={12} /> Assinatura Digital
                                         </button>
                                         
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.8rem' }}>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}>
                                                 <input type="radio" name="priority" value="normal" checked={composePriority === 'normal'} onChange={() => setComposePriority('normal')} style={{ accentColor: 'var(--accent-orange)' }} /> Normal
                                             </label>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#f87171', fontSize: '0.72rem', fontWeight: 500 }}>
                                                 <input type="radio" name="priority" value="urgente" checked={composePriority === 'urgente'} onChange={() => setComposePriority('urgente')} style={{ accentColor: '#ef4444' }} /> Urgente
                                             </label>
                                         </div>

                                         <span style={{ color: charCount > 450 ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.72rem', marginLeft: 'auto' }}>{charCount} / 500</span>
                                         
                                         <button 
                                             className="btn-send-notif" 
                                             disabled={!composeMessage.trim() || selectedUserIds.length === 0} 
                                             onClick={handleSendNotification}
                                             style={{ 
                                                 opacity: (!composeMessage.trim() || selectedUserIds.length === 0) ? 0.6 : 1, 
                                                 cursor: (!composeMessage.trim() || selectedUserIds.length === 0) ? 'not-allowed' : 'pointer',
                                                 padding: '0.5rem 1.2rem',
                                                 fontSize: '0.78rem',
                                                 borderRadius: '8px',
                                                 marginLeft: '0.5rem',
                                                 flexShrink: 0
                                             }}
                                         >
                                             <span>DISPARAR AVISO</span>
                                             <Send size={12} />
                                         </button>
                                     </div>
                                 </div>
                                 
                                 <p className="notif-disclaimer" style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                     <Info size={12} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                                     Aviso enviado instantaneamente para os selecionados.
                                 </p>
                             </div>
                        </div>
                    </div>
                </div>
            , document.body)}

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
