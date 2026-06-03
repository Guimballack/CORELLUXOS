/**
 * Corellux OS - Módulo Checklist Avançado (ChecklistHub)
 * Solução corporativa SaaS Premium integrada para criação, execução,
 * monitoramento, plano de ação e auditoria de checklists.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCorelluxState, loadUsers } from '../store/corellux-state';
import DbService from '../services/db-service';
import { 
    Compass, 
    Settings, 
    FileSpreadsheet, 
    Eye, 
    Trash2, 
    Plus, 
    Check, 
    X, 
    AlertTriangle, 
    Camera, 
    Signature, 
    MapPin, 
    Wifi, 
    WifiOff, 
    Database, 
    User, 
    Users, 
    Calendar, 
    Clock, 
    ArrowLeft, 
    CheckSquare, 
    Upload, 
    CheckCircle2, 
    Sliders, 
    ShieldAlert,
    AlertCircle,
    Info,
    ChevronRight,
    TrendingUp,
    Play,
    Printer,
    RefreshCw
} from 'lucide-react';

export default function ChecklistHub() {
    const [state, setKey, updatePartial] = useCorelluxState([
        'currentUser',
        'appUsers',
        'checklistModels',
        'checklistExecutions',
        'checklistActiveTab',
        'checklistOfflineMode',
        'checklistOfflineQueue'
    ]);

    const activeTab = state.checklistActiveTab || 'menu';
    const offlineMode = state.checklistOfflineMode || false;
    const offlineQueue = state.checklistOfflineQueue || [];
    
    // UI Local States
    const [theme, setTheme] = useState('dark');
    const [activeExecution, setActiveExecution] = useState(null);
    const [activeExecutionDetail, setActiveExecutionDetail] = useState(null);
    const [activeNcDetail, setActiveNcDetail] = useState(null);
    const [activeActionPlanDetail, setActiveActionPlanDetail] = useState(null);
    
    // Dynamic Filter States
    const [filterSector, setFilterSector] = useState('TODOS');
    const [filterPeriod, setFilterPeriod] = useState('TODOS'); // 'TODOS', 'HOJE', 'SEMANA', 'MES'
    const [filterUser, setFilterUser] = useState('TODOS');

    // DB States
    const [nonConformities, setNonConformities] = useState([]);
    const [actionPlans, setActionPlans] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Construtor (Builder) Local States
    const [builderId, setBuilderId] = useState(null);
    const [builderCode, setBuilderCode] = useState('');
    const [builderName, setBuilderName] = useState('');
    const [builderSector, setBuilderSector] = useState('COZINHA');
    const [builderCategory, setBuilderCategory] = useState('Qualidade');
    const [builderDescription, setBuilderDescription] = useState('');
    const [builderFrequency, setBuilderFrequency] = useState('Diário');
    const [builderVersion, setBuilderVersion] = useState('1.0.0');
    const [builderEffectiveDate, setBuilderEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [builderStatus, setBuilderStatus] = useState('Ativo');
    const [builderQuestions, setBuilderQuestions] = useState([]);

    // Execução Local States
    const [execAnswers, setExecAnswers] = useState({}); // { [itemId]: { answer: '', photo: '', comment: '', barcode: '', signature: '' } }
    const [gpsCoordinates, setGpsCoordinates] = useState('Buscando localização...');
    const [signatureData, setSignatureData] = useState(null);
    const [execStartTime, setExecStartTime] = useState(null);
    
    // Barcode Scanner Simulator State
    const [isScanning, setIsScanning] = useState(false);
    const [activeScanItem, setActiveScanItem] = useState(null);
    const [manualBarcode, setManualBarcode] = useState('');

    // Permissões Customizadas
    const [rolePermissions, setRolePermissions] = useState({
        Administrador: { visualizar: true, executar: true, aprovar: true, reprovar: true, editar: true, excluir: true, auditar: true },
        Gerente: { visualizar: true, executar: true, aprovar: true, reprovar: true, editar: true, excluir: false, auditar: true },
        Operador: { visualizar: true, executar: true, aprovar: false, reprovar: false, editar: false, excluir: false, auditar: false }
    });

    // Canvas Signatures Drawing Ref
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);

    // Initial Loading
    useEffect(() => {
        loadUsers();
        refreshDbData();
        getGeoLocation();
    }, []);

    // Sincronização automática quando voltar Online
    useEffect(() => {
        if (!offlineMode && offlineQueue.length > 0) {
            syncOfflineQueue();
        }
    }, [offlineMode, offlineQueue]);

    const refreshDbData = async () => {
        // Models & Executions
        const models = await DbService.getChecklistModels();
        setKey('checklistModels', models);
        const executions = await DbService.getChecklistExecutions();
        setKey('checklistExecutions', executions);

        // Non Conformities
        const ncs = await DbService.getChecklistNonConformities();
        setNonConformities(ncs);

        // Action Plans
        const plans = await DbService.getChecklistActionPlans();
        setActionPlans(plans);

        // Audit Logs
        const logs = await DbService.getChecklistAuditLogs();
        setAuditLogs(logs);
    };

    const getGeoLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsCoordinates(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
                },
                () => {
                    // Fallback mock
                    setGpsCoordinates('Lat: -23.5505, Lon: -46.6333 (São Paulo, BR)');
                }
            );
        } else {
            setGpsCoordinates('Localização indisponível');
        }
    };

    // Auditoria Log Helper
    const logEvent = async (action, details = {}, changes = {}) => {
        const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente' };
        const newLog = {
            user: currentUser.name,
            timestamp: new Date().toISOString(),
            ip: '192.168.15.' + Math.floor(Math.random() * 254 + 1),
            location: gpsCoordinates,
            action,
            changes
        };
        await DbService.saveChecklistAuditLog(newLog);
        const logs = await DbService.getChecklistAuditLogs();
        setAuditLogs(logs);
    };

    // Sync Offline queue
    const syncOfflineQueue = async () => {
        let count = 0;
        for (const exec of offlineQueue) {
            await DbService.saveChecklistExecution(exec);
            count++;
            
            // Log de Auditoria de Sincronização
            await logEvent('Sincronização Offline', { executionId: exec.id }, { status: 'Online' });
        }
        setKey('checklistOfflineQueue', []);
        localStorage.removeItem('corellux_offline_queue');
        alert(`${count} checklist(s) sincronizados com sucesso na nuvem!`);
        refreshDbData();
    };

    // Toggle offline mode helper
    const toggleOfflineMode = () => {
        const nextMode = !offlineMode;
        setKey('checklistOfflineMode', nextMode);
        logEvent(nextMode ? 'Entrou em Modo Offline' : 'Saiu de Modo Offline');
    };

    // Visualizar abas
    const setTab = (tabName) => {
        setKey('checklistActiveTab', tabName);
    };

    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente', permissions: {} };
    const appUsers = state.appUsers || [];
    const checklistModels = state.checklistModels || [];
    const checklistExecutions = state.checklistExecutions || [];

    // Verificação de permissões do usuário logado
    const hasTabPermission = (permType) => {
        const userRole = currentUser.role || 'Operador';
        const rolePerms = rolePermissions[userRole];
        if (!rolePerms) return false;
        return rolePerms[permType] !== false;
    };

    // Dynamic filtering for execution list
    const filteredExecutions = checklistExecutions.filter(e => {
        const dateMatch = filterPeriod === 'TODOS' || 
            (filterPeriod === 'HOJE' && new Date(e.endTime).toDateString() === new Date().toDateString());
        const sectorMatch = filterSector === 'TODOS' || e.sector === filterSector;
        const userMatch = filterUser === 'TODOS' || e.executor === filterUser;
        return dateMatch && sectorMatch && userMatch;
    });

    // ----------------------------------------------------
    // ACTIONS: TEMPLATES BUILDER
    // ----------------------------------------------------

    const handleOpenBuilder = (model = null) => {
        if (!hasTabPermission('editar')) {
            alert('Acesso negado: Seu cargo não possui permissão para editar templates.');
            return;
        }

        if (model) {
            setBuilderId(model.id);
            setBuilderCode(model.code || 'CK-' + Math.floor(Math.random() * 900 + 100));
            setBuilderName(model.name);
            setBuilderSector(model.sector);
            setBuilderCategory(model.category || 'Qualidade');
            setBuilderDescription(model.description || '');
            setBuilderFrequency(model.frequency);
            setBuilderVersion(model.version || '1.0.0');
            setBuilderEffectiveDate(model.effectiveDate || new Date().toISOString().split('T')[0]);
            setBuilderStatus(model.status);
            setBuilderQuestions(model.items || []);
        } else {
            setBuilderId(null);
            setBuilderCode('CK-' + Math.floor(Math.random() * 900 + 100));
            setBuilderName('');
            setBuilderSector('COZINHA');
            setBuilderCategory('Qualidade');
            setBuilderDescription('');
            setBuilderFrequency('Diário');
            setBuilderVersion('1.0.0');
            setBuilderEffectiveDate(new Date().toISOString().split('T')[0]);
            setBuilderStatus('Ativo');
            setBuilderQuestions([]);
        }
        setTab('builder');
    };

    const handleAddBuilderQuestion = (type) => {
        const newQ = {
            id: 'q_' + Date.now() + Math.random().toString(36).substr(2, 5),
            label: '',
            type,
            required: true,
            weight: 5,
            minVal: 0,
            maxVal: 100,
            evidenceRequired: false,
            commentRequired: false,
            ruleAction: 'none' // 'none', 'create_nc', 'alert', 'block'
        };
        setBuilderQuestions([...builderQuestions, newQ]);
    };

    const handleUpdateBuilderQuestion = (id, field, value) => {
        setBuilderQuestions(builderQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleRemoveBuilderQuestion = (id) => {
        setBuilderQuestions(builderQuestions.filter(q => q.id !== id));
    };

    const handleSaveTemplate = async () => {
        if (!builderName || !builderCode) {
            alert('Por favor, preencha o código e o nome do checklist.');
            return;
        }

        const modelObj = {
            id: builderId,
            code: builderCode,
            name: builderName,
            sector: builderSector,
            category: builderCategory,
            description: builderDescription,
            frequency: builderFrequency,
            version: builderVersion,
            effectiveDate: builderEffectiveDate,
            status: builderStatus,
            items: builderQuestions
        };

        const res = await DbService.saveChecklistModel(modelObj);
        if (res.success) {
            logEvent(builderId ? 'Template editado' : 'Template criado', { code: builderCode, name: builderName });
            alert('Template de checklist salvo com sucesso!');
            refreshDbData();
            setTab('templates');
        } else {
            alert('Falha ao salvar template de checklist.');
        }
    };

    const handleDeleteTemplate = async (id, name) => {
        if (!hasTabPermission('excluir')) {
            alert('Acesso negado: Seu cargo não possui permissão para excluir templates.');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o template "${name}"?`)) {
            const res = await DbService.deleteChecklistModel(id);
            if (res.success) {
                logEvent('Template excluído', { id, name });
                alert('Template excluído com sucesso.');
                refreshDbData();
            } else {
                alert('Falha ao excluir template.');
            }
        }
    };

    // ----------------------------------------------------
    // ACTIONS: EXECUÇÃO DE CHECKLIST
    // ----------------------------------------------------

    const handleStartExecution = (model) => {
        if (!hasTabPermission('executar')) {
            alert('Acesso negado: Seu cargo não possui permissão para executar checklists.');
            return;
        }

        // Check if Vigency is valid
        if (model.effectiveDate && new Date(model.effectiveDate) > new Date()) {
            alert(`Atenção: Este checklist não está em vigência ainda. Vigência a partir de ${new Date(model.effectiveDate).toLocaleDateString()}`);
            return;
        }

        setActiveExecution(model);
        setExecStartTime(new Date().toISOString());
        setExecAnswers({});
        setSignatureData(null);
        getGeoLocation();
        setTab('execution');
    };

    // Handle Sim/Não click
    const handleSimNaoAnswer = (itemId, val, question) => {
        const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
        setExecAnswers({
            ...execAnswers,
            [itemId]: { ...curAns, answer: val }
        });
    };

    // Signature Pad
    const startDrawing = (e) => {
        isDrawing.current = true;
        draw(e);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            setSignatureData(dataUrl);
        }
    };

    const draw = (e) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#38bdf8'; // Sky blue neon brush

        if (e.type === 'mousedown' || e.type === 'touchstart') {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
    };

    // Barcode simulation
    const openBarcodeSimulator = (itemId) => {
        setActiveScanItem(itemId);
        setIsScanning(true);
        setManualBarcode('');
    };

    const handleApplyScan = (code) => {
        const curAns = execAnswers[activeScanItem] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
        setExecAnswers({
            ...execAnswers,
            [activeScanItem]: { ...curAns, barcode: code }
        });
        setIsScanning(false);
        setActiveScanItem(null);
    };

    const handleFinishExecution = async () => {
        // Validate all required fields
        let isMissing = false;
        let ncTriggered = 0;
        const answersList = [];

        for (const item of activeExecution.items) {
            const ans = execAnswers[item.id] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
            
            // Check mandatory
            if (item.required && !ans.answer && item.type !== 'assinatura' && item.type !== 'codigo_barras' && item.type !== 'qr_code') {
                isMissing = true;
                break;
            }

            // Canvas signatures checking
            if (item.type === 'assinatura' && item.required && !signatureData) {
                isMissing = true;
                break;
            }

            // Check comments mandatory
            if (item.commentRequired && !ans.comment) {
                alert(`O item "${item.label}" exige comentário descritivo.`);
                return;
            }

            // Check evidence mandatory (e.g. photo)
            if (item.evidenceRequired && !ans.photo) {
                alert(`O item "${item.label}" exige anexo de foto/evidência.`);
                return;
            }

            // Limits numeric checking
            if (item.type === 'numero' && ans.answer) {
                const num = parseFloat(ans.answer);
                if (num < item.minVal || num > item.maxVal) {
                    alert(`O item "${item.label}" tem valor fora da faixa permitida (${item.minVal} a ${item.maxVal}).`);
                    if (item.ruleAction === 'block') {
                        alert(`Bloqueio de Etapa: Execução cancelada pelo limite de segurança do sensor.`);
                        return;
                    }
                }
            }

            answersList.push({
                itemId: item.id,
                label: item.label,
                type: item.type,
                answer: item.type === 'assinatura' ? signatureData : ans.answer,
                photo: ans.photo,
                comment: ans.comment,
                barcode: ans.barcode || ans.answer,
                weight: item.weight || 1
            });
        }

        if (isMissing) {
            alert('Por favor, preencha todas as perguntas obrigatórias do checklist.');
            return;
        }

        // Compliance score calculation
        let totalWeight = 0;
        let compliantWeight = 0;
        let isApproved = true;

        activeExecution.items.forEach((item, idx) => {
            const userAns = answersList[idx];
            const weight = item.weight || 1;
            totalWeight += weight;

            let isCompliant = true;
            if (item.type === 'sim_nao' && userAns.answer === 'Não') {
                isCompliant = false;
            } else if (item.type === 'numero' && userAns.answer) {
                const num = parseFloat(userAns.answer);
                if (num < item.minVal || num > item.maxVal) {
                    isCompliant = false;
                }
            }

            if (isCompliant) {
                compliantWeight += weight;
            } else {
                // Rule triggered NC
                if (item.ruleAction === 'create_nc' || item.type === 'sim_nao') {
                    ncTriggered++;
                }
            }
        });

        const conformityScore = totalWeight > 0 ? Math.round((compliantWeight / totalWeight) * 100) : 100;
        
        // Threshold for approval is 80% conformity score
        isApproved = conformityScore >= 80;

        const newExecution = {
            id: 'exec_' + Date.now(),
            modelId: activeExecution.id,
            modelName: activeExecution.name,
            sector: activeExecution.sector,
            executor: currentUser.name,
            startTime: execStartTime,
            endTime: new Date().toISOString(),
            conformity: conformityScore,
            status: isApproved ? 'Aprovado' : 'Reprovado',
            gps: gpsCoordinates,
            answers: answersList
        };

        if (offlineMode) {
            // Queue locally
            const updatedQueue = [...offlineQueue, newExecution];
            setKey('checklistOfflineQueue', updatedQueue);
            localStorage.setItem('corellux_offline_queue', JSON.stringify(updatedQueue));
            alert('Checklist salvo localmente na fila offline! Será sincronizado ao reconectar.');
        } else {
            // Cloud db save
            const res = await DbService.saveChecklistExecution(newExecution);
            if (res.success) {
                const dbExec = res.data;

                // Rules Engine: Generates Non Conformities
                if (ncTriggered > 0) {
                    for (let idx = 0; idx < activeExecution.items.length; idx++) {
                        const item = activeExecution.items[idx];
                        const userAns = answersList[idx];
                        
                        let failed = false;
                        if (item.type === 'sim_nao' && userAns.answer === 'Não') failed = true;
                        if (item.type === 'numero' && userAns.answer) {
                            const val = parseFloat(userAns.answer);
                            if (val < item.minVal || val > item.maxVal) failed = true;
                        }

                        if (failed) {
                            const ncObj = {
                                executionId: dbExec.id,
                                modelName: activeExecution.name,
                                itemId: item.id,
                                itemName: item.label,
                                detectedValue: userAns.answer,
                                timestamp: new Date().toISOString(),
                                sector: activeExecution.sector,
                                status: 'Aberto'
                            };
                            await DbService.saveChecklistNonConformity(ncObj);
                        }
                    }
                }

                logEvent('Checklist executado', { name: activeExecution.name, conformity: conformityScore, status: newExecution.status });
                alert(`Checklist enviado! Conformidade: ${conformityScore}% (${newExecution.status})`);
            }
        }

        setActiveExecution(null);
        refreshDbData();
        setTab('dashboard');
    };

    // ----------------------------------------------------
    // ACTIONS: PLANOS DE AÇÃO
    // ----------------------------------------------------

    const handleCreateActionPlan = async (nc) => {
        const desc = prompt('Descreva a ação corretiva necessária (Plano de Ação):');
        if (!desc) return;
        
        const due = prompt('Insira a data limite de resolução (AAAA-MM-DD):', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        if (!due) return;

        const newPlan = {
            nonConformityId: nc.id,
            description: desc,
            assignee: currentUser.name,
            dueDate: due,
            priority: 'Alta',
            status: 'Aberto',
            history: [{ timestamp: new Date().toISOString(), status: 'Aberto', user: currentUser.name, comment: 'Plano criado' }]
        };

        const res = await DbService.saveChecklistActionPlan(newPlan);
        if (res.success) {
            // Update NC status
            nc.status = 'Tratado';
            await DbService.saveChecklistNonConformity(nc);

            logEvent('Plano de Ação criado', { ncId: nc.id, due });
            alert('Plano de ação corretiva gerado com sucesso!');
            refreshDbData();
        }
    };

    const handleUpdateActionPlanStatus = async (plan, nextStatus) => {
        const comment = prompt('Insira um comentário/evidência de status:');
        const updatedHistory = [...(plan.history || []), {
            timestamp: new Date().toISOString(),
            status: nextStatus,
            user: currentUser.name,
            comment: comment || 'Alteração de status'
        }];

        const updatedPlan = {
            ...plan,
            status: nextStatus,
            history: updatedHistory
        };

        const res = await DbService.saveChecklistActionPlan(updatedPlan);
        if (res.success) {
            logEvent('Status do Plano alterado', { planId: plan.id, status: nextStatus });
            alert(`Plano de ação alterado para ${nextStatus}!`);
            refreshDbData();
        }
    };

    // ----------------------------------------------------
    // ACTIONS: SIMULAÇÃO INTEGRAÇÕES ERP
    // ----------------------------------------------------

    const triggerMockERPEvent = async (eventName, sector, modelCode) => {
        // Encontra o modelo do checklist correspondente
        const model = checklistModels.find(m => m.code === modelCode || m.sector === sector);
        if (!model) {
            alert(`Nenhum checklist ativo configurado para o setor "${sector}". Crie um template primeiro.`);
            return;
        }

        const newNotification = {
            id: 'notif_' + Date.now(),
            title: `INTEGRAÇÃO ERP: Evento [${eventName}]`,
            message: `Disparo automático de verificação contextual no setor ${sector}. Executar checklist: ${model.name}.`,
            timestamp: new Date().toISOString(),
            modelToLaunch: model
        };

        setNotifications([newNotification, ...notifications]);
        logEvent(`Trigger ERP: ${eventName}`, { sector, modelCode });
        alert(`Sucesso! Evento ERP [${eventName}] interceptado pelo motor de contexto. Notificação criada!`);
    };

    // ----------------------------------------------------
    // METRICS CALCULATIONS
    // ----------------------------------------------------

    const calcTotalChecklists = checklistExecutions.length;
    const calcApproved = checklistExecutions.filter(e => e.status === 'Aprovado').length;
    const calcReproved = checklistExecutions.filter(e => e.status === 'Reprovado').length;
    const calcApprovalRate = calcTotalChecklists > 0 ? Math.round((calcApproved / calcTotalChecklists) * 100) : 0;
    const calcOpenNcs = nonConformities.filter(nc => nc.status === 'Aberto').length;

    // SLA médio simulado
    const calcSla = 2.4; 

    // Ocorrências por Setor
    const occurrencesBySector = () => {
        const counts = {};
        nonConformities.forEach(nc => {
            counts[nc.sector] = (counts[nc.sector] || 0) + 1;
        });
        return counts;
    };

    return (
        <div className={`screen active with-header theme-${theme}`} style={{ display: 'flex', background: '#090d16', color: '#f3f4f6', height: '100%', overflowY: 'hidden' }}>
            
            {/* CSS SaaS Premium Styling */}
            <style dangerouslySetInnerHTML={{__html: `
                .chk-sidebar {
                    width: 260px;
                    background: rgba(15, 23, 42, 0.6);
                    border-right: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem 1rem;
                    box-sizing: border-box;
                    backdrop-filter: blur(10px);
                }
                .chk-sidebar-btn {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.8rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.88rem;
                    font-weight: 600;
                    text-align: left;
                    margin-bottom: 0.4rem;
                    transition: all 0.2s;
                }
                .chk-sidebar-btn:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: #fff;
                }
                .chk-sidebar-btn.active {
                    background: rgba(45, 212, 191, 0.1);
                    color: #2dd4bf;
                }
                .chk-main-container {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                .chk-menu-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-top: 1rem;
                    margin-bottom: 2rem;
                }
                .chk-menu-card {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    text-align: left;
                }
                .chk-menu-card:hover {
                    background: rgba(30, 41, 59, 0.45);
                    border-color: rgba(45, 212, 191, 0.3);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
                }
                .chk-menu-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: #64748b;
                    transition: background 0.2s ease;
                }
                .chk-menu-card:hover::before {
                    background: #2dd4bf;
                }
                .chk-menu-card.teal::before { background: #2dd4bf; }
                .chk-menu-card.blue::before { background: #3b82f6; }
                .chk-menu-card.yellow::before { background: #facc15; }
                .chk-menu-card.orange::before { background: #f97316; }
                .chk-menu-card.purple::before { background: #a855f7; }
                .chk-menu-card.emerald::before { background: #10b981; }
                .chk-menu-card.slate::before { background: #64748b; }

                .chk-menu-card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.03);
                    color: #94a3b8;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .chk-menu-card:hover .chk-menu-card-icon {
                    background: rgba(45, 212, 191, 0.1);
                    color: #2dd4bf;
                }
                .chk-menu-card.teal:hover .chk-menu-card-icon { background: rgba(45, 212, 191, 0.1); color: #2dd4bf; }
                .chk-menu-card.blue:hover .chk-menu-card-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .chk-menu-card.yellow:hover .chk-menu-card-icon { background: rgba(250, 204, 21, 0.1); color: #facc15; }
                .chk-menu-card.orange:hover .chk-menu-card-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                .chk-menu-card.purple:hover .chk-menu-card-icon { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                .chk-menu-card.emerald:hover .chk-menu-card-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .chk-menu-card.slate:hover .chk-menu-card-icon { background: rgba(100, 116, 139, 0.1); color: #64748b; }

                .chk-menu-card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    flex: 1;
                }
                .chk-menu-card-content h3 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: 0.5px;
                }
                .chk-menu-card-content p {
                    margin: 0;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    line-height: 1.4;
                }
                .chk-header-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .chk-badge-btn {
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .chk-badge-btn.online {
                    background: rgba(16, 185, 129, 0.12);
                    color: #10b981;
                    border-color: rgba(16, 185, 129, 0.2);
                }
                .chk-badge-btn.offline {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                    border-color: rgba(245, 158, 11, 0.2);
                }
                .chk-kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.25rem;
                    margin-bottom: 2rem;
                }
                .chk-kpi-card {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                }
                .chk-kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 4px; height: 100%;
                    background: #2dd4bf;
                }
                .chk-kpi-card.reproved::before { background: #ef4444; }
                .chk-kpi-card.pending::before { background: #facc15; }
                .chk-kpi-card.actions::before { background: #38bdf8; }
                .chk-kpi-card h6 { margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .chk-kpi-card h3 { margin: 0.4rem 0 0 0; font-size: 1.8rem; font-weight: 800; color: #fff; }
                .chk-canvas-pad {
                    border: 2px dashed rgba(255,255,255,0.1);
                    border-radius: 8px;
                    background: rgba(0,0,0,0.3);
                    cursor: crosshair;
                }
                .chk-rule-badge {
                    padding: 0.15rem 0.4rem;
                    border-radius: 4px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                }
                .chk-erp-notif {
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239,68,68,0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    animation: pulseBorder 2s infinite;
                }
                @keyframes pulseBorder {
                    0% { border-color: rgba(239,68,68,0.2); }
                    50% { border-color: rgba(239,68,68,0.5); }
                    100% { border-color: rgba(239,68,68,0.2); }
                }
                .chk-filter-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    background: rgba(30, 41, 59, 0.15);
                    border: 1px solid rgba(255,255,255,0.03);
                    padding: 0.8rem 1.25rem;
                    border-radius: 8px;
                    align-items: center;
                }
                .chk-filter-select {
                    background: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 6px;
                    color: #fff;
                    padding: 0.4rem 0.8rem;
                    outline: none;
                    cursor: pointer;
                    font-size: 0.82rem;
                }
            `}} />

            {/* Sidebar Lateral - REMOVIDA PARA LAYOUT DE CARDS */}

            {/* Container de Conteúdo Principal */}
            <div className="chk-main-container">
                
                {/* Cabeçalho superior do Hub */}
                <div className="chk-header-bar">
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Corellux OS / Módulos</span>
                        <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                            {activeTab === 'menu' && 'Central de Checklists & Conformidade'}
                            {activeTab === 'run_checklist' && 'Iniciar Nova Vistoria'}
                            {activeTab === 'dashboard' && 'Painel de Indicadores'}
                            {activeTab === 'templates' && 'Templates & Modelos'}
                            {activeTab === 'builder' && 'Editor de Checklist'}
                            {activeTab === 'execution' && 'Executando Checklist'}
                            {activeTab === 'nc' && 'Gerenciamento de Não Conformidades'}
                            {activeTab === 'action_plans' && 'Plano de Ação Corretiva'}
                            {activeTab === 'integrations' && 'Motor de Integrações ERP'}
                            {activeTab === 'audit' && 'Logs e Trilhas de Auditoria'}
                            {activeTab === 'permissions' && 'Acessos e Permissões Granulares'}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Conexão Badge */}
                        <div 
                            className={`chk-badge-btn ${offlineMode ? 'offline' : 'online'}`}
                            onClick={toggleOfflineMode}
                            title="Clique para alternar conectividade manual"
                        >
                            {offlineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
                            {offlineMode ? 'MODO OFFLINE' : 'SISTEMA ONLINE'}
                        </div>

                        {offlineQueue.length > 0 && (
                            <button 
                                className="btn-send-aviso" 
                                onClick={syncOfflineQueue}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', background: '#eab308', borderColor: '#facc15', color: '#000', fontWeight: '800' }}
                            >
                                Sincronizar ({offlineQueue.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Notificações de Integração Contextual */}
                {notifications.length > 0 && (
                    <div>
                        {notifications.map(notif => (
                            <div key={notif.id} className="chk-erp-notif">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <AlertCircle size={20} style={{ color: '#ef4444' }} />
                                    <div>
                                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{notif.title}</strong>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>{notif.message}</p>
                                    </div>
                                </div>
                                <button 
                                    className="btn-send-aviso"
                                    onClick={() => {
                                        setNotifications(notifications.filter(n => n.id !== notif.id));
                                        handleStartExecution(notif.modelToLaunch);
                                    }}
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                    <Play size={12} /> INICIAR
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 1: VISÃO GERAL (MENU DE CARDS) */}
                {activeTab === 'menu' && (
                    <>
                        {/* KPIs Rápidos */}
                        <div className="chk-kpi-grid">
                            <div className="chk-kpi-card">
                                <h6>Total Executados</h6>
                                <h3>{calcTotalChecklists}</h3>
                            </div>
                            <div className="chk-kpi-card">
                                <h6>Taxa de Conformidade</h6>
                                <h3>{calcApprovalRate}%</h3>
                            </div>
                            <div className="chk-kpi-card reproved">
                                <h6>NCs Pendentes</h6>
                                <h3>{calcOpenNcs}</h3>
                            </div>
                            <div className="chk-kpi-card actions">
                                <h6>SLA Resolução</h6>
                                <h3>{calcSla} dias</h3>
                            </div>
                        </div>

                        {/* Menu de Navegação por Cards (Premium) */}
                        <div className="chk-menu-grid">
                            <div className="chk-menu-card teal" onClick={() => setTab('run_checklist')}>
                                <div className="chk-menu-card-icon">
                                    <Play size={24} fill="currentColor" style={{ marginLeft: '3px' }} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Executar Checklist</h3>
                                    <p>Iniciar o preenchimento de vistorias e checklists operacionais ativos em tempo real.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card blue" onClick={() => setTab('dashboard')}>
                                <div className="chk-menu-card-icon">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Indicadores & KPIs</h3>
                                    <p>Acompanhe gráficos de conformidade, taxas de aprovação, SLAs e estatísticas por setor.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card purple" onClick={() => setTab('templates')}>
                                <div className="chk-menu-card-icon">
                                    <Settings size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Modelos de Checklist</h3>
                                    <p>Configurar templates, criar novos formulários e gerenciar itens e regras.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card yellow" onClick={() => setTab('nc')}>
                                <div className="chk-menu-card-icon">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Não Conformidades</h3>
                                    <p>Monitore e trate ocorrências abertas automaticamente devido a falhas de conformidade.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card orange" onClick={() => setTab('action_plans')}>
                                <div className="chk-menu-card-icon">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Planos de Ação</h3>
                                    <p>Gerencie ações corretivas (5W2H) com responsáveis, prazos e prioridades.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card emerald" onClick={() => setTab('integrations')}>
                                <div className="chk-menu-card-icon">
                                    <RefreshCw size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Integrações ERP</h3>
                                    <p>Configure disparos automáticos inteligentes baseados em eventos do ERP.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card slate" onClick={() => setTab('audit')}>
                                <div className="chk-menu-card-icon">
                                    <Database size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Trilha de Auditoria</h3>
                                    <p>Logs detalhados de auditoria contendo dados de GPS, executor e IP.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card slate" onClick={() => setTab('permissions')}>
                                <div className="chk-menu-card-icon">
                                    <Sliders size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Acessos e Permissões</h3>
                                    <p>Defina permissões de visualização, edição, execução e auditoria por cargos.</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB: EXECUTAR CHECKLIST (SELEÇÃO DE MODELOS) */}
                {activeTab === 'run_checklist' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                                Selecione um dos modelos de checklist operacionais ativos abaixo para iniciar o preenchimento.
                            </p>
                            <button className="btn-tool" onClick={() => setTab('menu')} style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                <ArrowLeft size={13} /> Voltar ao Menu
                            </button>
                        </div>

                        {checklistModels.filter(m => m.status === 'Ativo').length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(30, 41, 59, 0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                                <AlertTriangle size={32} style={{ color: '#facc15', marginBottom: '1rem' }} />
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>Nenhum Checklist Ativo</h3>
                                <p style={{ margin: 0, fontSize: '0.88rem' }}>Crie e ative um modelo de checklist na área de "Modelos de Checklist" para começar.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                {checklistModels.filter(m => m.status === 'Ativo').map(m => (
                                    <div 
                                        key={m.id} 
                                        className="chk-kpi-card" 
                                        style={{ 
                                            background: 'rgba(30, 41, 59, 0.25)', 
                                            border: '1px solid rgba(255,255,255,0.05)', 
                                            borderRadius: '12px', 
                                            padding: '1.5rem', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            justifyContent: 'space-between', 
                                            gap: '1.25rem',
                                            transition: 'border-color 0.2s',
                                            cursor: 'default'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.65rem', background: 'rgba(45, 212, 191, 0.1)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '20px', fontWeight: '800', textTransform: 'uppercase' }}>
                                                    {m.frequency}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>
                                                    v{m.version || '1.0.0'}
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0.2rem 0 0', fontWeight: '800', lineHeight: '1.3' }}>{m.name}</h3>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.24rem' }}>
                                                {m.description || 'Nenhuma descrição fornecida.'}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Setor</div>
                                                    <span className={`model-badge-sector ${m.sector.toLowerCase()}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.1rem' }}>{m.sector}</span>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Itens</div>
                                                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '700', display: 'inline-block', marginTop: '0.1rem' }}>{m.items?.length || 0}</span>
                                                </div>
                                            </div>
                                            <button 
                                                className="btn-send-aviso" 
                                                onClick={() => handleStartExecution(m)} 
                                                style={{ 
                                                    padding: '0.45rem 0.9rem', 
                                                    fontSize: '0.78rem', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.4rem', 
                                                    background: 'var(--accent-orange)', 
                                                    borderColor: 'var(--accent-orange)', 
                                                    color: '#fff',
                                                    fontWeight: '800',
                                                    marginLeft: 'auto',
                                                    marginRight: 0,
                                                    marginTop: 0
                                                }}
                                            >
                                                <Play size={12} fill="currentColor" /> Iniciar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* TAB 2: DASHBOARD INDICADORES */}
                {activeTab === 'dashboard' && (
                    <>
                        {/* Filtros */}
                        <div className="chk-filter-row">
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>Filtros Analíticos:</span>
                            <select className="chk-filter-select" value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
                                <option value="TODOS">Setor: Todos</option>
                                <option value="COZINHA">COZINHA</option>
                                <option value="SALÃO">SALÃO</option>
                                <option value="ESTOQUE">ESTOQUE</option>
                                <option value="ADMINISTRAÇÃO">ADMINISTRAÇÃO</option>
                            </select>
                            <select className="chk-filter-select" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                                <option value="TODOS">Período: Todos</option>
                                <option value="HOJE">Hoje</option>
                                <option value="SEMANA">Última Semana</option>
                                <option value="MES">Último Mês</option>
                            </select>
                            <select className="chk-filter-select" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                                <option value="TODOS">Colaborador: Todos</option>
                                {appUsers.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* KPIS */}
                        <div className="chk-kpi-grid">
                            <div className="chk-kpi-card">
                                <h6>Total Vistorias</h6>
                                <h3>{filteredExecutions.length}</h3>
                            </div>
                            <div className="chk-kpi-card">
                                <h6>Taxa Aprovação</h6>
                                <h3>{filteredExecutions.length > 0 ? Math.round((filteredExecutions.filter(x => x.status === 'Aprovado').length / filteredExecutions.length) * 100) : 0}%</h3>
                            </div>
                            <div className="chk-kpi-card reproved">
                                <h6>Vistorias Reprovadas</h6>
                                <h3>{filteredExecutions.filter(x => x.status === 'Reprovado').length}</h3>
                            </div>
                            <div className="chk-kpi-card actions">
                                <h6>Conformidade Média</h6>
                                <h3>{filteredExecutions.length > 0 ? Math.round(filteredExecutions.reduce((acc, c) => acc + (c.conformity || 0), 0) / filteredExecutions.length) : 0}%</h3>
                            </div>
                        </div>

                        {/* Gráficos Interativos SVG */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                            {/* SVG Trend Chart */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#fff' }}>Evolução de Conformidade (Últimos Dias)</h3>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <svg width="100%" height="200" viewBox="0 0 400 200" style={{ overflow: 'visible' }}>
                                        <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
                                            <line x1="0" y1="50" x2="400" y2="50" />
                                            <line x1="0" y1="100" x2="400" y2="100" />
                                            <line x1="0" y1="150" x2="400" y2="150" />
                                        </g>
                                        {/* Line plot */}
                                        <polyline
                                            fill="none"
                                            stroke="#2dd4bf"
                                            strokeWidth="3"
                                            points="20,130 80,90 140,110 200,60 260,80 320,40 380,50"
                                        />
                                        {/* Dots */}
                                        <circle cx="20" cy="130" r="4" fill="#2dd4bf" />
                                        <circle cx="80" cy="90" r="4" fill="#2dd4bf" />
                                        <circle cx="140" cy="110" r="4" fill="#2dd4bf" />
                                        <circle cx="200" cy="60" r="4" fill="#2dd4bf" />
                                        <circle cx="260" cy="80" r="4" fill="#2dd4bf" />
                                        <circle cx="320" cy="40" r="4" fill="#2dd4bf" />
                                        <circle cx="380" cy="50" r="4" fill="#2dd4bf" />
                                        
                                        {/* Text values */}
                                        <text x="20" y="120" fill="#fff" fontSize="8" textAnchor="middle">65%</text>
                                        <text x="80" y="80" fill="#fff" fontSize="8" textAnchor="middle">85%</text>
                                        <text x="140" y="100" fill="#fff" fontSize="8" textAnchor="middle">75%</text>
                                        <text x="200" y="50" fill="#fff" fontSize="8" textAnchor="middle">92%</text>
                                        <text x="260" y="70" fill="#fff" fontSize="8" textAnchor="middle">88%</text>
                                        <text x="320" y="30" fill="#fff" fontSize="8" textAnchor="middle">98%</text>
                                        <text x="380" y="40" fill="#fff" fontSize="8" textAnchor="middle">95%</text>
                                    </svg>
                                </div>
                            </div>

                            {/* SVG Bar Chart Occurrences by Sector */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#fff' }}>Não Conformidades por Setor</h3>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <svg width="100%" height="200" viewBox="0 0 400 200" style={{ overflow: 'visible' }}>
                                        {/* Bars */}
                                        <rect x="30" y="50" width="40" height="120" fill="#ef4444" rx="4" />
                                        <rect x="120" y="90" width="40" height="80" fill="#38bdf8" rx="4" />
                                        <rect x="210" y="120" width="40" height="50" fill="#facc15" rx="4" />
                                        <rect x="300" y="140" width="40" height="30" fill="#10b981" rx="4" />

                                        {/* Text Labels */}
                                        <text x="50" y="185" fill="#cbd5e1" fontSize="10" textAnchor="middle">COZINHA</text>
                                        <text x="140" y="185" fill="#cbd5e1" fontSize="10" textAnchor="middle">SALÃO</text>
                                        <text x="230" y="185" fill="#cbd5e1" fontSize="10" textAnchor="middle">ESTOQUE</text>
                                        <text x="320" y="185" fill="#cbd5e1" fontSize="10" textAnchor="middle">ADMIN</text>

                                        {/* Values on top of bars */}
                                        <text x="50" y="42" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">12 NCs</text>
                                        <text x="140" y="82" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">8 NCs</text>
                                        <text x="230" y="112" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">5 NCs</text>
                                        <text x="320" y="132" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">3 NCs</text>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Lista completa de execuções */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>Execuções Filtradas</h3>
                            <div className="table-responsive">
                                <table className="products-table">
                                    <thead>
                                        <tr>
                                            <th>ID Checklist</th>
                                            <th>Nome / Modelo</th>
                                            <th>Data Fim</th>
                                            <th>Executor</th>
                                            <th style={{ textAlign: 'center' }}>Conformidade</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredExecutions.map(ex => (
                                            <tr key={ex.id}>
                                                <td><code>{ex.id.substring(0, 10)}</code></td>
                                                <td><strong>{ex.modelName}</strong></td>
                                                <td>{new Date(ex.endTime).toLocaleString('pt-BR')}</td>
                                                <td>{ex.executor}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ color: (ex.conformity || 0) >= 80 ? '#2dd4bf' : '#ef4444', fontWeight: 800 }}>{ex.conformity || 0}%</span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${ex.status === 'Aprovado' ? 'badge-ativo' : 'badge-desligado'}`}>{ex.status}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="btn-tool" onClick={() => setActiveExecutionDetail(ex)} style={{ padding: '0.3rem 0.5rem' }}>
                                                        <Eye size={13} /> Detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 3: TEMPLATES LIST */}
                {activeTab === 'templates' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Modelos de Checklist Configurados</h2>
                            <button className="btn-send-aviso" onClick={() => handleOpenBuilder()}>
                                <Plus size={16} /> Novo Template
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nome do Checklist</th>
                                        <th>Setor</th>
                                        <th>Categoria</th>
                                        <th>Frequência</th>
                                        <th>Versão</th>
                                        <th>Vigência</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checklistModels.map(m => (
                                        <tr key={m.id}>
                                            <td><code>{m.code || 'CK-MOCK'}</code></td>
                                            <td><strong>{m.name}</strong></td>
                                            <td><span className={`model-badge-sector ${m.sector.toLowerCase()}`}>{m.sector}</span></td>
                                            <td>{m.category || 'Qualidade'}</td>
                                            <td>{m.frequency}</td>
                                            <td><code>v{m.version || '1.0.0'}</code></td>
                                            <td>{m.effectiveDate ? new Date(m.effectiveDate).toLocaleDateString() : 'Imediata'}</td>
                                            <td>
                                                <span className={`status-badge ${m.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`}>{m.status}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                    <button className="btn-tool" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleOpenBuilder(m)}>Editar</button>
                                                    <button className="btn-tool" style={{ padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteTemplate(m.id, m.name)}>Excluir</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* TAB 4: BUILDER / EDITOR */}
                {activeTab === 'builder' && (
                    <div className="builder-container">
                        
                        {/* Sidebar da Construtor */}
                        <div className="builder-sidebar">
                            <h5 style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Inserir Campo</h5>
                            
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('sim_nao')}>
                                <CheckCircle2 size={13} style={{ color: '#4ade80' }} /> Sim / Não (Conformidade)
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('texto')}>
                                <FileSpreadsheet size={13} style={{ color: '#60a5fa' }} /> Resposta de Texto
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('numero')}>
                                <Clock size={13} style={{ color: '#facc15' }} /> Resposta Numérica
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('assinatura')}>
                                <Signature size={13} style={{ color: '#38bdf8' }} /> Assinatura Digital
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('codigo_barras')}>
                                <Database size={13} style={{ color: '#c084fc' }} /> Cód. Barras / QR Code
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('foto')}>
                                <Camera size={13} style={{ color: '#f87171' }} /> Anexo de Foto
                            </button>
                            
                            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button className="btn-tool" style={{ flex: 1, padding: '0.6rem' }} onClick={() => setTab('templates')}>Cancelar</button>
                                <button className="btn-send-aviso" style={{ flex: 1, padding: '0.6rem 1rem' }} onClick={handleSaveTemplate}>Salvar</button>
                            </div>
                        </div>

                        {/* Editor Config Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                            {/* Meta Informações */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>DADOS GERAIS DO CHECKLIST</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div className="composer-field-group">
                                        <label>Código do Template *</label>
                                        <input type="text" className="input-title" placeholder="EX: CK-202" value={builderCode} onChange={(e) => setBuilderCode(e.target.value.toUpperCase())} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Nome do Checklist *</label>
                                        <input type="text" className="input-title" placeholder="EX: HIGIENE DA COZINHA" value={builderName} onChange={(e) => setBuilderName(e.target.value.toUpperCase())} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
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
                                        <label>Categoria</label>
                                        <select className="input-title" value={builderCategory} onChange={(e) => setBuilderCategory(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <option value="Qualidade">Qualidade</option>
                                            <option value="Segurança">Segurança</option>
                                            <option value="Recebimento">Recebimento</option>
                                            <option value="Manutenção">Manutenção</option>
                                        </select>
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Periodicidade</label>
                                        <select className="input-title" value={builderFrequency} onChange={(e) => setBuilderFrequency(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <option value="Diário">Diário</option>
                                            <option value="Semanal">Semanal</option>
                                            <option value="Mensal">Mensal</option>
                                            <option value="Por evento">Por Evento</option>
                                            <option value="Sob demanda">Sob Demanda</option>
                                        </select>
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Versão</label>
                                        <input type="text" className="input-title" placeholder="EX: 1.0.0" value={builderVersion} onChange={(e) => setBuilderVersion(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Data de Vigência</label>
                                        <input type="date" className="input-title" value={builderEffectiveDate} onChange={(e) => setBuilderEffectiveDate(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Status</label>
                                        <select className="input-title" value={builderStatus} onChange={(e) => setBuilderStatus(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <option value="Ativo">Ativo</option>
                                            <option value="Inativo">Inativo</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="composer-field-group" style={{ marginTop: '1rem' }}>
                                    <label>Descrição detalhada do Checklist</label>
                                    <textarea className="input-title textarea-exec-obs" placeholder="Instruções para o executor do checklist..." value={builderDescription} onChange={(e) => setBuilderDescription(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
                                </div>
                            </div>

                            {/* Lista de Itens do Checklist */}
                            <div className="builder-questions-list">
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>QUESTÕES DO CHECKLIST</h3>
                                
                                {builderQuestions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(30, 41, 59, 0.1)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: '#64748b' }}>
                                        <Info size={28} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                                        <p style={{ margin: 0 }}>Nenhum item adicionado ainda. Escolha na barra lateral.</p>
                                    </div>
                                ) : (
                                    builderQuestions.map((q, idx) => (
                                        <div key={q.id} className="builder-item-card">
                                            <div className="builder-item-header">
                                                <span className="builder-type-pill">{q.type === 'sim_nao' ? 'Sim / Não' : q.type}</span>
                                                <button 
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                    onClick={() => handleRemoveBuilderQuestion(q.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="composer-field-group">
                                                <label>Pergunta #{idx + 1} *</label>
                                                <input 
                                                    type="text" 
                                                    className="input-title" 
                                                    placeholder="Digite a pergunta ou instrução..." 
                                                    value={q.label}
                                                    onChange={(e) => handleUpdateBuilderQuestion(q.id, 'label', e.target.value)}
                                                    style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={q.required} onChange={(e) => handleUpdateBuilderQuestion(q.id, 'required', e.target.checked)} style={{ accentColor: '#2dd4bf' }} /> Obrigatório
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={q.evidenceRequired} onChange={(e) => handleUpdateBuilderQuestion(q.id, 'evidenceRequired', e.target.checked)} style={{ accentColor: '#2dd4bf' }} /> Exigir Foto
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={q.commentRequired} onChange={(e) => handleUpdateBuilderQuestion(q.id, 'commentRequired', e.target.checked)} style={{ accentColor: '#2dd4bf' }} /> Exigir Comentário
                                                </label>

                                                {/* Rules settings */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ação se Falhar:</span>
                                                    <select 
                                                        className="chk-filter-select"
                                                        value={q.ruleAction}
                                                        onChange={(e) => handleUpdateBuilderQuestion(q.id, 'ruleAction', e.target.value)}
                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                                    >
                                                        <option value="none">Nenhuma</option>
                                                        <option value="create_nc">Criar Não Conformidade</option>
                                                        <option value="alert">Gerar Alerta</option>
                                                        <option value="block">Bloquear Etapa</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Numeric limits configuration */}
                                            {q.type === 'numero' && (
                                                <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div className="composer-field-group" style={{ margin: 0 }}>
                                                        <label style={{ fontSize: '0.75rem' }}>Valor Mínimo</label>
                                                        <input type="number" className="input-title" value={q.minVal} onChange={(e) => handleUpdateBuilderQuestion(q.id, 'minVal', parseFloat(e.target.value) || 0)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem', width: '80px' }} />
                                                    </div>
                                                    <div className="composer-field-group" style={{ margin: 0 }}>
                                                        <label style={{ fontSize: '0.75rem' }}>Valor Máximo</label>
                                                        <input type="number" className="input-title" value={q.maxVal} onChange={(e) => handleUpdateBuilderQuestion(q.id, 'maxVal', parseFloat(e.target.value) || 100)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem', width: '80px' }} />
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

                {/* TAB 5: EXECUÇÃO PANEL */}
                {activeTab === 'execution' && activeExecution && (
                    <div className="exec-panel" style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
                        
                        {/* Meta Exec Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>Código Checklist: {activeExecution.code}</span>
                                <h3 style={{ margin: '0.1rem 0 0 0', color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>{activeExecution.name}</h3>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    Setor: <strong>{activeExecution.sector}</strong> | Executor: <strong>{currentUser.name}</strong>
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <MapPin size={15} style={{ color: '#2dd4bf' }} />
                                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{gpsCoordinates}</span>
                            </div>
                        </div>

                        {/* Questions render */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                            {activeExecution.items.map((item, idx) => {
                                const ans = execAnswers[item.id] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
                                
                                return (
                                    <div key={item.id} className="exec-item-row" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                                                {idx + 1}. {item.label}
                                                {item.required && <span style={{ color: '#ef4444', marginLeft: '0.2rem' }}>*</span>}
                                            </span>
                                            {item.weight && <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#94a3b8' }}>Peso: {item.weight}</span>}
                                        </div>

                                        {/* Sim/Não question type */}
                                        {item.type === 'sim_nao' && (
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                                <button 
                                                    className={`btn-sim-nao sim ${ans.answer === 'Sim' ? 'selected' : ''}`}
                                                    onClick={() => handleSimNaoAnswer(item.id, 'Sim')}
                                                    style={{ flex: 1, padding: '0.6rem' }}
                                                >
                                                    SIM
                                                </button>
                                                <button 
                                                    className={`btn-sim-nao nao ${ans.answer === 'Não' ? 'selected' : ''}`}
                                                    onClick={() => handleSimNaoAnswer(item.id, 'Não')}
                                                    style={{ flex: 1, padding: '0.6rem' }}
                                                >
                                                    NÃO
                                                </button>
                                            </div>
                                        )}

                                        {/* Text question type */}
                                        {item.type === 'texto' && (
                                            <input 
                                                type="text" 
                                                className="input-title"
                                                placeholder="Digite sua resposta descritiva..." 
                                                value={ans.answer}
                                                onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, answer: e.target.value } })}
                                                style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}
                                            />
                                        )}

                                        {/* Numeric type */}
                                        {item.type === 'numero' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input 
                                                    type="number" 
                                                    className="input-title"
                                                    placeholder="Digite o valor numérico..." 
                                                    value={ans.answer}
                                                    onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, answer: e.target.value } })}
                                                    style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '200px' }}
                                                />
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(Faixa: {item.minVal} a {item.maxVal})</span>
                                            </div>
                                        )}

                                        {/* Signature Canvas type */}
                                        {item.type === 'assinatura' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                <canvas 
                                                    ref={canvasRef}
                                                    width="400"
                                                    height="120"
                                                    className="chk-canvas-pad"
                                                    onMouseDown={startDrawing}
                                                    onMouseMove={draw}
                                                    onMouseUp={stopDrawing}
                                                    onTouchStart={startDrawing}
                                                    onTouchMove={draw}
                                                    onTouchEnd={stopDrawing}
                                                />
                                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                    <button className="btn-tool" onClick={clearSignature} style={{ padding: '0.4rem 1rem' }}>Limpar Assinatura</button>
                                                    {signatureData && <span style={{ color: '#10b981', fontSize: '0.78rem', alignSelf: 'center' }}>✓ Assinado</span>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Barcode/QR Code scanner simulator */}
                                        {(item.type === 'codigo_barras' || item.type === 'qr_code') && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input 
                                                    type="text" 
                                                    className="input-title" 
                                                    placeholder="Aguardando scanner..." 
                                                    value={ans.barcode || ans.answer}
                                                    onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, barcode: e.target.value } })}
                                                    style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '250px' }}
                                                />
                                                <button className="btn-tool" onClick={() => openBarcodeSimulator(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
                                                    <Database size={13} /> Escanear
                                                </button>
                                            </div>
                                        )}

                                        {/* Evidences image photo upload simulator */}
                                        {item.type === 'foto' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <input 
                                                        type="text" 
                                                        className="input-title" 
                                                        placeholder="Caminho da foto ou mock..." 
                                                        value={ans.photo}
                                                        onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, photo: e.target.value } })}
                                                        style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '250px' }}
                                                    />
                                                    <button 
                                                        className="btn-tool"
                                                        onClick={() => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, photo: '/sample_evidence_' + Math.floor(Math.random() * 5 + 1) + '.jpg' } })}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                                                    >
                                                        <Camera size={13} /> Capturar Foto MOCK
                                                    </button>
                                                </div>
                                                {ans.photo && <span style={{ color: '#10b981', fontSize: '0.78rem' }}>✓ Foto anexada: {ans.photo}</span>}
                                            </div>
                                        )}

                                        {/* Comments Box */}
                                        {item.commentRequired && (
                                            <div className="composer-field-group" style={{ marginTop: '0.8rem', marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.75rem', color: '#facc15' }}>Justificativa / Comentário Obrigatório *</label>
                                                <textarea 
                                                    className="input-title textarea-exec-obs" 
                                                    placeholder="Escreva a justificativa..." 
                                                    value={ans.comment}
                                                    onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, comment: e.target.value } })}
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(0,0,0,0.15)' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Submit Row */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                            <button className="btn-tool" style={{ padding: '0.7rem 1.5rem' }} onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar? Suas respostas serão apagadas.')) {
                                    setActiveExecution(null);
                                    setTab('dashboard');
                                }
                            }}>
                                Cancelar Vistoria
                            </button>
                            <button className="btn-send-aviso" style={{ padding: '0.7rem 2rem' }} onClick={handleFinishExecution}>
                                FINALIZAR E ENVIAR
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 6: NÃO CONFORMIDADES LIST */}
                {activeTab === 'nc' && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>Ocorrências e Falhas de Conformidade</h3>
                        
                        {nonConformities.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhuma não conformidade cadastrada no sistema.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="products-table">
                                    <thead>
                                        <tr>
                                            <th>ID Ocorrência</th>
                                            <th>Checklist de Origem</th>
                                            <th>Item Reprovado</th>
                                            <th>Valor / Resposta</th>
                                            <th>Data Detecção</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nonConformities.map(nc => (
                                            <tr key={nc.id}>
                                                <td><code>{String(nc.id).substring(0, 10)}</code></td>
                                                <td><strong>{nc.modelName}</strong></td>
                                                <td style={{ color: '#ef4444' }}>{nc.itemName}</td>
                                                <td><code>{nc.detectedValue}</code></td>
                                                <td>{new Date(nc.timestamp).toLocaleString('pt-BR')}</td>
                                                <td>
                                                    <span className={`status-badge ${nc.status === 'Aberto' ? 'badge-desligado' : 'badge-ativo'}`}>
                                                        {nc.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {nc.status === 'Aberto' ? (
                                                        <button className="btn-send-aviso" style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }} onClick={() => handleCreateActionPlan(nc)}>
                                                            Gerar Plano Ação
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>Tratado</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 7: PLANOS DE AÇÃO (5W2H) */}
                {activeTab === 'action_plans' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* Lista de Planos */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>Planos de Ação Ativos (Status Flow)</h3>
                            
                            {actionPlans.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhum plano de ação corretiva gerado.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Plano ID</th>
                                                <th>Ação Corretiva</th>
                                                <th>Responsável</th>
                                                <th>Prazo Limite</th>
                                                <th>Prioridade</th>
                                                <th>Pipeline Status</th>
                                                <th style={{ textAlign: 'center' }}>Ações de Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actionPlans.map(plan => (
                                                <tr key={plan.id}>
                                                    <td><code>{String(plan.id).substring(0, 10)}</code></td>
                                                    <td><strong>{plan.description}</strong></td>
                                                    <td>{plan.assignee}</td>
                                                    <td>{new Date(plan.dueDate).toLocaleDateString('pt-BR')}</td>
                                                    <td>
                                                        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>{plan.priority}</span>
                                                    </td>
                                                    <td>
                                                        <span style={{ 
                                                            padding: '0.2rem 0.5rem', 
                                                            borderRadius: '6px', 
                                                            fontSize: '0.72rem', 
                                                            fontWeight: 'bold',
                                                            background: plan.status === 'Encerrado' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                                                            color: plan.status === 'Encerrado' ? '#10b981' : '#38bdf8'
                                                        }}>
                                                            {plan.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                                            {plan.status === 'Aberto' && (
                                                                <button className="btn-tool" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleUpdateActionPlanStatus(plan, 'Em andamento')}>Inicar</button>
                                                            )}
                                                            {plan.status === 'Em andamento' && (
                                                                <button className="btn-tool" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleUpdateActionPlanStatus(plan, 'Resolvido')}>Resolver</button>
                                                            )}
                                                            {plan.status === 'Resolvido' && (
                                                                <button className="btn-tool" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderColor: '#2dd4bf', color: '#2dd4bf' }} onClick={() => handleUpdateActionPlanStatus(plan, 'Validado')}>Validar</button>
                                                            )}
                                                            {plan.status === 'Validado' && (
                                                                <button className="btn-send-aviso" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleUpdateActionPlanStatus(plan, 'Encerrado')}>Encerrar</button>
                                                            )}
                                                            {plan.status === 'Encerrado' && (
                                                                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Concluído</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 8: INTEGRAÇÕES ERP */}
                {activeTab === 'integrations' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* Simulador de eventos contextuais */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#fff' }}><Sliders size={16} style={{ color: '#2dd4bf', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} /> Simulador de Integrações Contextuais ERP</h3>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>O Corellux OS monitora os gatilhos e eventos do ERP em segundo plano para interceptar processos que necessitem de vistorias regulatórias obrigatórias de segurança e higiene.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Estoque / Recebimento NF-e</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Dispara checklist obrigatório de integridade do lote, controle de validade e temperatura no ato do recebimento.</p>
                                    <button className="btn-tool" style={{ marginTop: 'auto' }} onClick={() => triggerMockERPEvent('Recebimento de NF-e', 'ESTOQUE', 'CK-RECEB')}>
                                        Simular Recebimento NF-e
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Produção / Ordem de Produção</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Gera verificação de higienização de maquinários antes do início da manufatura industrial de alimentos.</p>
                                    <button className="btn-tool" style={{ marginTop: 'auto' }} onClick={() => triggerMockERPEvent('Início de OP', 'COZINHA', 'CK-PROD')}>
                                        Simular Iniciar Produção
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Ativos / Manutenção</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Dispara checklist para liberar a utilização segura de equipamentos de alta voltagem.</p>
                                    <button className="btn-tool" style={{ marginTop: 'auto' }} onClick={() => triggerMockERPEvent('Manutenção de Ativos', 'ADMINISTRAÇÃO', 'CK-ATV')}>
                                        Simular Manutenção de Ativo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 9: AUDITORIA LOGS */}
                {activeTab === 'audit' && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>Trilha Completa de Auditoria de Vistorias</h3>
                        
                        {auditLogs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhum log registrado ainda.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="products-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Colaborador</th>
                                            <th>Ação Realizada</th>
                                            <th>Endereço IP</th>
                                            <th>Localização GPS</th>
                                            <th>Estrutura Alterações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log, idx) => (
                                            <tr key={idx}>
                                                <td>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                                <td><strong>{log.user}</strong></td>
                                                <td><span style={{ color: '#2dd4bf', fontWeight: 'bold' }}>{log.action}</span></td>
                                                <td><code>{log.ip}</code></td>
                                                <td>{log.location}</td>
                                                <td><code>{JSON.stringify(log.changes || {})}</code></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 10: PERMISSÕES */}
                {activeTab === 'permissions' && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#fff' }}>Configurações de Permissões Granulares</h3>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>Controle o que cada cargo no ERP pode visualizar, executar ou auditar na área de checklists operacionais.</p>
                        
                        <div className="table-responsive">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Cargo ERP</th>
                                        <th style={{ textAlign: 'center' }}>Visualizar</th>
                                        <th style={{ textAlign: 'center' }}>Executar</th>
                                        <th style={{ textAlign: 'center' }}>Aprovar</th>
                                        <th style={{ textAlign: 'center' }}>Reprovar</th>
                                        <th style={{ textAlign: 'center' }}>Editar</th>
                                        <th style={{ textAlign: 'center' }}>Excluir</th>
                                        <th style={{ textAlign: 'center' }}>Auditar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(rolePermissions).map(role => (
                                        <tr key={role}>
                                            <td><strong>{role}</strong></td>
                                            {Object.keys(rolePermissions[role]).map(action => (
                                                <td key={action} style={{ textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={rolePermissions[role][action]}
                                                        onChange={(e) => {
                                                            const nextPerms = {
                                                                ...rolePermissions,
                                                                [role]: {
                                                                    ...rolePermissions[role],
                                                                    [action]: e.target.checked
                                                                }
                                                            };
                                                            setRolePermissions(nextPerms);
                                                            logEvent('Alteração de Permissões', { role, action, value: e.target.checked });
                                                        }}
                                                        style={{ accentColor: '#2dd4bf', cursor: 'pointer' }}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* SCANNER OVERLAY SIMULATOR MODAL */}
            {isScanning && (
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="pin-modal-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.1rem' }}>SIMULADOR LEITOR DE CÓDIGO</h4>
                        <div style={{ background: '#000', height: '140px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '2px', background: '#ef4444', position: 'absolute', top: '50%', left: 0, animation: 'laserLine 1.5s infinite linear' }}></div>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>[ Câmera Simulada Ativa ]</span>
                            <style dangerouslySetInnerHTML={{__html: `
                                @keyframes laserLine {
                                    0% { top: 10%; }
                                    50% { top: 90%; }
                                    100% { top: 10%; }
                                }
                            `}} />
                        </div>

                        <div className="composer-field-group" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                            <label>Código Escaneado manual</label>
                            <input 
                                type="text" 
                                className="input-title" 
                                placeholder="EX: 78910203040" 
                                value={manualBarcode} 
                                onChange={(e) => setManualBarcode(e.target.value)} 
                                style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} 
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-tool" style={{ flex: 1 }} onClick={() => setIsScanning(false)}>Fechar</button>
                            <button className="btn-send-aviso" style={{ flex: 1 }} onClick={() => handleApplyScan(manualBarcode || '7896001203405')}>
                                Inserir Mock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL: EXECUÇÃO DETALHADA */}
            {activeExecutionDetail && (
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="pin-modal-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Detalhes da Vistoria</h3>
                            <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setActiveExecutionDetail(null)}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
                            <div>
                                <strong>Modelo Checklist:</strong> {activeExecutionDetail.modelName}<br />
                                <strong>Setor:</strong> {activeExecutionDetail.sector}<br />
                                <strong>Executor:</strong> {activeExecutionDetail.executor}<br />
                                <strong>Data Execução:</strong> {new Date(activeExecutionDetail.endTime).toLocaleString('pt-BR')}<br />
                                <strong>Localização GPS:</strong> {activeExecutionDetail.gps}<br />
                                <strong>Conformidade:</strong> <span style={{ color: activeExecutionDetail.status === 'Aprovado' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{activeExecutionDetail.conformity}% ({activeExecutionDetail.status})</span>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.8rem 0', color: '#fff', fontSize: '0.95rem' }}>Respostas do Questionário:</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {activeExecutionDetail.answers?.map((ans, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.82rem' }}>{ans.label}</div>
                                            <div style={{ color: '#2dd4bf', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                                Resposta: {ans.type === 'assinatura' ? '[Assinatura Salva]' : ans.answer}
                                            </div>
                                            {ans.photo && <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Foto: {ans.photo}</div>}
                                            {ans.comment && <div style={{ fontSize: '0.75rem', color: '#facc15' }}>Comentário: {ans.comment}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
