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
    RefreshCw,
    Award
} from 'lucide-react';

const checkJurisdiction = (userRole, checklistSector) => {
    if (!userRole) return false;
    const role = userRole.toLowerCase();
    const sec = (checklistSector || '').toLowerCase();
    
    // Gerente e Administrador têm acesso irrestrito
    if (role === 'administrador' || role === 'gerente') return true;
    
    if (role === 'estoquista' && (sec.includes('estoque') || sec.includes('suprimentos'))) return true;
    if (role === 'cozinha' && (sec.includes('produção') || sec.includes('producao') || sec.includes('cozinha'))) return true;
    if (role === 'produção' && (sec.includes('produção') || sec.includes('producao'))) return true;
    if (role === 'caixa' && (sec.includes('salão') || sec.includes('salao') || sec.includes('atendimento'))) return true;
    if (role === 'auxiliar' && (sec.includes('produção') || sec.includes('producao') || sec.includes('estoque') || sec.includes('serviços gerais') || sec.includes('servicos gerais') || sec.includes('limpeza'))) return true;
    
    // Correspondência direta/substring genérica
    if (sec.includes(role) || role.includes(sec)) return true;
    
    return false;
};

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
    
    const currentUser = state.currentUser || { name: 'Sistema', id: 0, role: 'Gerente', permissions: {} };
    const appUsers = state.appUsers || [];
    const checklistModels = state.checklistModels || [];
    const checklistExecutions = state.checklistExecutions || [];

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
    const [auditFilterStatus, setAuditFilterStatus] = useState('TODOS');
    const [checklistAssignments, setChecklistAssignments] = useState(() => {
        try {
            const saved = localStorage.getItem('corellux_checklist_assignments');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // Filtros e estados específicos para o gráfico de evolução
    const [chartPeriod, setChartPeriod] = useState('SEMANAL'); // 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
    const [chartSector, setChartSector] = useState('GERAL');
    const [chartUser, setChartUser] = useState('GERAL');

    // DB States
    const [nonConformities, setNonConformities] = useState([]);
    const [actionPlans, setActionPlans] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [patrimonyItems, setPatrimonyItems] = useState([]);

    // Filtro e cálculo de pontos do gráfico de evolução de conformidades
    const chartPoints = React.useMemo(() => {
        // Mock data de fallback se não houver execuções
        const mockSectors = ['COZINHA', 'SALÃO', 'ESTOQUE', 'ADMINISTRAÇÃO'];
        const mockExecutors = ['Administrador', 'Gerente', 'Operador'];
        const now = new Date();
        
        // Seed 365 dias de dados
        const seedList = [];
        for (let i = 365; i >= 0; i--) {
            const seedValue = Math.sin(i / 10) * 8 + (365 - i) / 10 + 82; // wave + upward trend
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
            const sector = mockSectors[i % mockSectors.length];
            const executor = mockExecutors[i % mockExecutors.length];
            const variance = ((i * 3 + 17) % 15) - 7;
            const conformity = Math.max(55, Math.min(100, Math.round(seedValue + variance)));
            
            seedList.push({
                id: `seed_exec_${i}`,
                endTime: date.toISOString(),
                sector,
                executor,
                conformity
            });
        }

        // Combina execuções do Supabase/localStorage com o seed
        const combined = [...checklistExecutions];
        seedList.forEach(s => {
            if (!combined.some(c => c.id === s.id)) {
                combined.push(s);
            }
        });

        // Aplica filtros de período, setor e usuário para o gráfico
        let days = 7;
        let numBuckets = 7;
        if (chartPeriod === 'MENSAL') { days = 30; numBuckets = 10; }
        else if (chartPeriod === 'TRIMESTRAL') { days = 90; numBuckets = 10; }
        else if (chartPeriod === 'SEMESTRAL') { days = 180; numBuckets = 10; }
        else if (chartPeriod === 'ANUAL') { days = 365; numBuckets = 12; }

        const cutoffTime = now.getTime() - days * 24 * 60 * 60 * 1000;

        const filtered = combined.filter(e => {
            const time = new Date(e.endTime).getTime();
            if (time < cutoffTime) return false;
            if (chartSector !== 'GERAL' && e.sector !== chartSector) return false;
            if (chartUser !== 'GERAL' && e.executor !== chartUser) return false;
            return true;
        });

        // Agrupa em N buckets
        const bucketDurationMs = (days * 24 * 60 * 60 * 1000) / numBuckets;
        const buckets = Array.from({ length: numBuckets }, (_, idx) => {
            const bucketStart = cutoffTime + idx * bucketDurationMs;
            const bucketEnd = bucketStart + bucketDurationMs;
            return {
                start: bucketStart,
                end: bucketEnd,
                sum: 0,
                count: 0,
                label: ''
            };
        });

        buckets.forEach((b, idx) => {
            const startDate = new Date(b.start);
            if (chartPeriod === 'SEMANAL') {
                const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                b.label = daysOfWeek[startDate.getDay()];
            } else if (chartPeriod === 'MENSAL') {
                b.label = `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            } else if (chartPeriod === 'ANUAL') {
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                b.label = months[startDate.getMonth()];
            } else {
                b.label = `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            }
        });

        filtered.forEach(e => {
            const time = new Date(e.endTime).getTime();
            const bucket = buckets.find(b => time >= b.start && time < b.end);
            if (bucket) {
                bucket.sum += e.conformity || 0;
                bucket.count += 1;
            }
        });

        const points = buckets.map(b => {
            const avg = b.count > 0 ? Math.round(b.sum / b.count) : null;
            return {
                label: b.label,
                value: avg
            };
        });

        // Interpolador de dados nulos
        for (let i = 0; i < points.length; i++) {
            if (points[i].value === null) {
                let leftVal = null;
                for (let j = i - 1; j >= 0; j--) {
                    if (points[j].value !== null) { leftVal = points[j].value; break; }
                }
                let rightVal = null;
                for (let j = i + 1; j < points.length; j++) {
                    if (points[j].value !== null) { rightVal = points[j].value; break; }
                }
                if (leftVal !== null && rightVal !== null) {
                    points[i].value = Math.round((leftVal + rightVal) / 2);
                } else if (leftVal !== null) {
                    points[i].value = leftVal;
                } else if (rightVal !== null) {
                    points[i].value = rightVal;
                } else {
                    points[i].value = 85;
                }
            }
        }
        return points;
    }, [checklistExecutions, chartPeriod, chartSector, chartUser]);

    // Aggregated scoring and ranking data for the Pontuação dashboard
    const rankingData = React.useMemo(() => {
        const sectorSums = {};
        const sectorCounts = {};
        
        const userSums = {};
        const userCounts = {};

        checklistExecutions.forEach(ex => {
            const sec = ex.sector || 'GERAL';
            const user = ex.executor || 'Desconhecido';
            const score = ex.conformity || 0;

            sectorSums[sec] = (sectorSums[sec] || 0) + score;
            sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;

            userSums[user] = (userSums[user] || 0) + score;
            userCounts[user] = (userCounts[user] || 0) + 1;
        });

        const sectorRanking = Object.keys(sectorSums).map(name => ({
            name,
            avgScore: Math.round(sectorSums[name] / sectorCounts[name]),
            count: sectorCounts[name]
        })).sort((a, b) => b.avgScore - a.avgScore);

        if (sectorRanking.length === 0) {
            sectorRanking.push(
                { name: 'COZINHA', avgScore: 88, count: 12 },
                { name: 'SALÃO', avgScore: 82, count: 8 },
                { name: 'ESTOQUE', avgScore: 78, count: 5 },
                { name: 'ADMINISTRAÇÃO', avgScore: 95, count: 3 }
            );
        }

        const userRanking = Object.keys(userSums).map(name => ({
            name,
            avgScore: Math.round(userSums[name] / userCounts[name]),
            count: userCounts[name]
        })).sort((a, b) => b.avgScore - a.avgScore);

        if (userRanking.length === 0) {
            userRanking.push(
                { name: 'Administrador', avgScore: 92, count: 14 },
                { name: 'Gerente Geral', avgScore: 86, count: 9 },
                { name: 'Operador Padrão', avgScore: 74, count: 5 }
            );
        }

        return { sectorRanking, userRanking };
    }, [checklistExecutions]);

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
    const [isSignaturePopupOpen, setIsSignaturePopupOpen] = useState(false);
    const [activeSignatureItemId, setActiveSignatureItemId] = useState(null);
    const [execStartTime, setExecStartTime] = useState(null);
    
    // Novos Estados Avançados
    const [execResultModal, setExecResultModal] = useState(null);
    const [qrPrintModalOpen, setQrPrintModalOpen] = useState(false);
    const [qrPrintModel, setQrPrintModel] = useState(null);
    const [availableSectors, setAvailableSectors] = useState([]);
    const [builderDescImages, setBuilderDescImages] = useState([]);
    const [builderFrequencyDay, setBuilderFrequencyDay] = useState('');
    const [drawingImageModalOpen, setDrawingImageModalOpen] = useState(false);
    const [activeDrawItemInfo, setActiveDrawItemInfo] = useState(null); // { itemId, type: 'antes' | 'depois' }
    const [activeBrushColor, setActiveBrushColor] = useState('#ef4444'); // Vermelho padrão para 'antes'
    const [modalHasYellowStroke, setModalHasYellowStroke] = useState(false);
    const [builderStartTime, setBuilderStartTime] = useState('08:00');
    const [builderEndTime, setBuilderEndTime] = useState('18:00');
    
    // Webcam Camera Modal State
    const [cameraModal, setCameraModal] = useState({ isOpen: false, itemId: null, type: null });
    const [cameraLoading, setCameraLoading] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    
    // Custom System Alert / Confirm States
    const [systemAlert, setSystemAlert] = useState(null);

    const showSystemAlert = (message, title = 'Notificação', type = 'info', onConfirm = null) => {
        setSystemAlert({
            title,
            message,
            isConfirm: false,
            type,
            onConfirm
        });
    };

    const showSystemConfirm = (message, onConfirm, onCancel = null, title = 'Confirmação', type = 'warning') => {
        setSystemAlert({
            title,
            message,
            isConfirm: true,
            type,
            onConfirm,
            onCancel
        });
    };
    
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

    // Canvas Antes/Depois Drawing Ref
    const drawingCanvasRef = useRef(null);
    const isDrawingDrawing = useRef(false);

    // Initial Loading
    useEffect(() => {
        loadUsers();
        refreshDbData();
        getGeoLocation();
    }, []);

    // Intercepta execução automática de checklist pendente do QR Code
    useEffect(() => {
        const activeExecId = localStorage.getItem('activeExecuteChecklistId');
        if (activeExecId && checklistModels.length > 0) {
            localStorage.removeItem('activeExecuteChecklistId');
            const model = checklistModels.find(m => String(m.id) === String(activeExecId));
            if (model) {
                const userRole = currentUser.role || 'Operador';
                const hasAccess = checkJurisdiction(userRole, model.sector);
                
                if (hasAccess) {
                    handleStartExecution(model);
                } else {
                    showSystemAlert(
                        `Acesso Negado: Este checklist pertence ao setor "${model.sector}". Seu cargo (${userRole}) não tem permissão para executá-lo nesta jurisdição.`,
                        'Jurisdição Inválida',
                        'error'
                    );
                }
            } else {
                showSystemAlert('Checklist solicitado não foi encontrado.', 'Erro', 'error');
            }
        }
    }, [checklistModels, currentUser]);

    // Escuta o evento customizado de voltar disparado pelo cabeçalho
    useEffect(() => {
        const handleBackEvent = () => {
            if (activeExecution) {
                const hasAnswers = Object.values(execAnswers).some(
                    ans => ans.answer || ans.photo || ans.comment || ans.barcode || ans.signature
                );

                if (hasAnswers) {
                    showSystemConfirm(
                        'Tem certeza que deseja voltar? Suas respostas do checklist atual serão perdidas.',
                        () => {
                            setActiveExecution(null);
                            setTab('run_checklist');
                        },
                        null,
                        'Voltar',
                        'warning'
                    );
                } else {
                    setActiveExecution(null);
                    setTab('run_checklist');
                }
            }
        };

        window.addEventListener('corellux-checklist-back', handleBackEvent);
        return () => {
            window.removeEventListener('corellux-checklist-back', handleBackEvent);
        };
    }, [activeExecution, execAnswers]);

    // Sincronização automática quando voltar Online
    useEffect(() => {
        if (!offlineMode && offlineQueue.length > 0) {
            syncOfflineQueue();
        }
    }, [offlineMode, offlineQueue]);

    // Webcam Camera stream setup & teardown
    useEffect(() => {
        let activeStream = null;
        if (cameraModal.isOpen) {
            setCameraLoading(true);
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            })
            .then(stream => {
                activeStream = stream;
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraLoading(false);
            })
            .catch(err => {
                console.error("Erro ao acessar a câmera principal (environment):", err);
                // Fallback to any camera if environment camera is not available
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then(stream => {
                        activeStream = stream;
                        streamRef.current = stream;
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                        }
                        setCameraLoading(false);
                    })
                    .catch(err2 => {
                        console.error("Erro completo ao acessar webcam:", err2);
                        setCameraLoading(false);
                        showSystemAlert("Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso ao site.", "Erro na Câmera", "error");
                        setCameraModal({ isOpen: false, itemId: null, type: null });
                    });
            });
        }

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [cameraModal.isOpen, cameraModal.type]);

    const handleCapturePhoto = () => {
        if (videoRef.current && streamRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            
            // Set canvas size matching the video resolution
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            const { itemId, type } = cameraModal;
            const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '', photoAntes: '', photoDepois: '', statusDepois: '#10b981' };
            
            if (type === 'foto') {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { ...curAns, photo: dataUrl, answer: dataUrl }
                });
            } else if (type === 'antes') {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { ...curAns, bgPhotoAntes: dataUrl, photoAntes: '' }
                });
            } else if (type === 'depois') {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { ...curAns, bgPhotoDepois: dataUrl, photoDepois: '' }
                });
            }
            
            // Stop stream and close modal
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setCameraModal({ isOpen: false, itemId: null, type: null });
        }
    };

    const closeCameraModal = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraModal({ isOpen: false, itemId: null, type: null });
    };

    // Real Photo Upload and Capture handler
    const handlePhotoUpload = (e, itemId) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            showSystemAlert('O arquivo da foto deve ter no máximo 5MB.', 'Arquivo Muito Grande', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
            setExecAnswers({
                ...execAnswers,
                [itemId]: { ...curAns, photo: dataUrl, answer: dataUrl }
            });
        };
        reader.readAsDataURL(file);
    };

    const handleBgPhotoUpload = (e, itemId, type) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showSystemAlert('A imagem de fundo deve ter no máximo 5MB.', 'Arquivo Muito Grande', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '', photoAntes: '', photoDepois: '', statusDepois: '#10b981' };
            if (type === 'antes') {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { ...curAns, bgPhotoAntes: dataUrl, photoAntes: '' }
                });
            } else {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { 
                        ...curAns, 
                        bgPhotoDepois: dataUrl, 
                        photoDepois: '',
                        statusDepois: '#10b981',
                        hasYellowStroke: false
                    }
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const clearBgPhoto = (itemId, type) => {
        const curAns = execAnswers[itemId] || {};
        if (type === 'antes') {
            setExecAnswers({
                ...execAnswers,
                [itemId]: { ...curAns, bgPhotoAntes: '', photoAntes: '' }
            });
        } else {
            setExecAnswers({
                ...execAnswers,
                [itemId]: { 
                    ...curAns, 
                    bgPhotoDepois: '', 
                    photoDepois: '',
                    statusDepois: '#10b981',
                    hasYellowStroke: false
                }
            });
        }
    };

    const handleAddAssignment = (modelId, userId) => {
        const currentList = checklistAssignments[modelId] || [];
        const strUserId = String(userId);
        if (!currentList.includes(strUserId)) {
            const updated = {
                ...checklistAssignments,
                [modelId]: [...currentList, strUserId]
            };
            setChecklistAssignments(updated);
            localStorage.setItem('corellux_checklist_assignments', JSON.stringify(updated));
            showSystemAlert('Colaborador vinculado com sucesso!', 'Vínculo Confirmado', 'success');
        } else {
            showSystemAlert('Este colaborador já está vinculado a este checklist.', 'Já Vinculado', 'warning');
        }
    };

    const handleRemoveAssignment = (modelId, userId) => {
        const currentList = checklistAssignments[modelId] || [];
        const strUserId = String(userId);
        const updatedList = currentList.filter(id => String(id) !== strUserId);
        const updated = {
            ...checklistAssignments,
            [modelId]: updatedList
        };
        setChecklistAssignments(updated);
        localStorage.setItem('corellux_checklist_assignments', JSON.stringify(updated));
        showSystemAlert('Vínculo removido com sucesso!', 'Vínculo Removido', 'info');
    };

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

        // Patrimony items loading
        try {
            const pItems = await DbService.getPatrimonyItems();
            setPatrimonyItems(pItems || []);
        } catch (patrimonyErr) {
            console.warn('[ChecklistHub] Falha ao carregar itens de patrimônio:', patrimonyErr);
        }

        // Sectors loading
        try {
            const secs = await DbService.getSectors();
            setAvailableSectors(secs && secs.length > 0 ? secs : [
                { id: 1, name: 'COZINHA' },
                { id: 2, name: 'SALÃO' },
                { id: 3, name: 'ESTOQUE' },
                { id: 4, name: 'ADMINISTRAÇÃO' }
            ]);
        } catch (e) {
            console.error(e);
        }
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
        showSystemAlert(`${count} checklist(s) sincronizados com sucesso na nuvem!`, 'Sincronização', 'success');
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
            showSystemAlert('Acesso negado: Seu cargo não possui permissão para editar templates.', 'Acesso Negado', 'error');
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
            setBuilderFrequencyDay(model.frequencyDay || '');
            setBuilderDescImages(model.descriptionImages || []);
            setBuilderStartTime(model.startTime || '08:00');
            setBuilderEndTime(model.endTime || '18:00');
        } else {
            setBuilderId(null);
            setBuilderCode('CK-' + Math.floor(Math.random() * 900 + 100));
            setBuilderName('');
            const defaultSector = availableSectors.length > 0 ? availableSectors[0].name : 'COZINHA';
            setBuilderSector(defaultSector);
            setBuilderCategory('Qualidade');
            setBuilderDescription('');
            setBuilderFrequency('Diário');
            setBuilderVersion('1.0.0');
            setBuilderEffectiveDate(new Date().toISOString().split('T')[0]);
            setBuilderStatus('Ativo');
            setBuilderQuestions([]);
            setBuilderFrequencyDay('');
            setBuilderDescImages([]);
            setBuilderStartTime('08:00');
            setBuilderEndTime('18:00');
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
            ruleAction: 'none', // 'none', 'create_nc', 'alert', 'block'
            ruleActions: [],
            options: type === 'multipla_escolha' ? 'Pendente, Aprovado, Rejeitado' : ''
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
            showSystemAlert('Por favor, preencha o código e o nome do checklist.', 'Campos Obrigatórios', 'warning');
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
            frequencyDay: builderFrequencyDay,
            descriptionImages: builderDescImages,
            version: builderVersion,
            effectiveDate: builderEffectiveDate,
            status: builderStatus,
            startTime: builderStartTime,
            endTime: builderEndTime,
            items: builderQuestions
        };

        const res = await DbService.saveChecklistModel(modelObj);
        if (res.success) {
            logEvent(builderId ? 'Template editado' : 'Template criado', { code: builderCode, name: builderName });
            showSystemAlert('Template de checklist salvo com sucesso!', 'Sucesso', 'success');
            refreshDbData();
            setTab('templates');
        } else {
            showSystemAlert('Falha ao salvar template de checklist.', 'Erro', 'error');
        }
    };

    const handleDeleteTemplate = async (id, name) => {
        if (!hasTabPermission('excluir')) {
            showSystemAlert('Acesso negado: Seu cargo não possui permissão para excluir templates.', 'Acesso Negado', 'error');
            return;
        }

        showSystemConfirm(
            `Tem certeza que deseja excluir o template "${name}"?`,
            async () => {
                const res = await DbService.deleteChecklistModel(id);
                if (res.success) {
                    logEvent('Template excluído', { id, name });
                    showSystemAlert('Template excluído com sucesso.', 'Sucesso', 'success');
                    refreshDbData();
                } else {
                    showSystemAlert('Falha ao excluir template.', 'Erro', 'error');
                }
            },
            null,
            'Excluir Template',
            'warning'
        );
    };

    // ----------------------------------------------------
    // ACTIONS: EXECUÇÃO DE CHECKLIST
    // ----------------------------------------------------

    const handleStartExecution = (model) => {
        if (!hasTabPermission('executar')) {
            showSystemAlert('Acesso negado: Seu cargo não possui permissão para executar checklists.', 'Acesso Negado', 'error');
            return;
        }

        // Check if Vigency is valid
        if (model.effectiveDate && new Date(model.effectiveDate) > new Date()) {
            showSystemAlert(`Atenção: Este checklist não está em vigência ainda. Vigência a partir de ${new Date(model.effectiveDate).toLocaleDateString()}`, 'Alerta de Vigência', 'warning');
            return;
        }

        setActiveExecution(model);
        setExecStartTime(new Date().toISOString());
        setExecAnswers({});
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
    const openSignaturePopup = (itemId) => {
        setActiveSignatureItemId(itemId);
        setIsSignaturePopupOpen(true);
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
                if (curAns.signature) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = curAns.signature;
                }
            }
        }, 50);
    };

    const saveSignatureFromPopup = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            if (activeSignatureItemId) {
                const curAns = execAnswers[activeSignatureItemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
                setExecAnswers({
                    ...execAnswers,
                    [activeSignatureItemId]: { ...curAns, answer: dataUrl, signature: dataUrl }
                });
            }
        }
        setIsSignaturePopupOpen(false);
        setActiveSignatureItemId(null);
    };

    const startDrawing = (e) => {
        if (e.cancelable) e.preventDefault();
        isDrawing.current = true;
        draw(e);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
    };

    const draw = (e) => {
        if (!isDrawing.current) return;
        if (e.cancelable) e.preventDefault();
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

        const rectWidth = rect.width || canvas.width;
        const rectHeight = rect.height || canvas.height;
        const scaleX = canvas.width / rectWidth;
        const scaleY = canvas.height / rectHeight;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = 3;
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
    };

    // React Effect to bind non-passive Touch events to Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isSignaturePopupOpen) return;

        const handleTouchStart = (e) => {
            if (e.cancelable) e.preventDefault();
            isDrawing.current = true;
            draw(e);
        };

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault();
            draw(e);
        };

        const handleTouchEnd = (e) => {
            if (e.cancelable) e.preventDefault();
            isDrawing.current = false;
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Scroll lock body
        document.body.style.overflow = 'hidden';

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            document.body.style.overflow = '';
        };
    }, [isSignaturePopupOpen]);

    // Equipment Base Outline Drawer
    const drawEquipmentOutline = (ctx, width, height, type) => {
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 4;
        
        const cx = width * 0.35;
        const cy = height * 0.5;
        const r = 60;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
            const x1 = cx + Math.cos(angle) * r;
            const y1 = cy + Math.sin(angle) * r;
            const x2 = cx + Math.cos(angle) * (r + 12);
            const y2 = cy + Math.sin(angle) * (r + 12);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + r, cy - 15);
        ctx.lineTo(width * 0.8, cy - 15);
        ctx.lineTo(width * 0.8, height - 30);
        ctx.moveTo(cx + r, cy + 15);
        ctx.lineTo(width * 0.75, cy + 15);
        ctx.lineTo(width * 0.75, height - 30);
        ctx.stroke();
        
        const gx = width * 0.75;
        const gy = height * 0.25;
        const gr = 30;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        if (type === 'antes') {
            ctx.lineTo(gx + 20, gy - 10);
        } else {
            ctx.lineTo(gx - 10, gy - 20);
        }
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px sans-serif';
        ctx.fillText('DIAGRAMA DE ATIVO', 15, 25);
        
        if (type === 'antes') {
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
            ctx.beginPath();
            ctx.arc(cx + r + 30, cy + 35, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillText('VAZAMENTO DETECTADO', cx + r + 10, cy + 60);
            
            ctx.beginPath();
            ctx.moveTo(width * 0.55, cy - 15);
            ctx.lineTo(width * 0.58, cy - 5);
            ctx.lineTo(width * 0.56, cy + 15);
            ctx.stroke();
            
            ctx.fillText('RACHADURA NA TUBULAÇÃO', width * 0.5, cy - 25);
        } else {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.beginPath();
            ctx.arc(width * 0.88, 30, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('STATUS: REPARADO/LIMPO', width * 0.55, 33);
        }
    };

    const startDrawingDrawing = (e) => {
        if (e.cancelable) e.preventDefault();
        isDrawingDrawing.current = true;
        drawDrawing(e);
    };

    const stopDrawingDrawing = () => {
        isDrawingDrawing.current = false;
    };

    const drawDrawing = (e) => {
        if (!isDrawingDrawing.current) return;
        if (e.cancelable) e.preventDefault();

        // Se estiver desenhando com a cor amarela no depois, marca que a imagem tem traço amarelo
        if (activeDrawItemInfo && activeDrawItemInfo.type === 'depois' && activeBrushColor === '#eab308') {
            setModalHasYellowStroke(true);
        }

        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const rectWidth = rect.width || canvas.width;
        const rectHeight = rect.height || canvas.height;
        const scaleX = canvas.width / rectWidth;
        const scaleY = canvas.height / rectHeight;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = activeBrushColor;

        if (e.type === 'mousedown' || e.type === 'touchstart') {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    // React Effect to bind non-passive Touch events to Drawing Canvas
    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        if (!canvas || !drawingImageModalOpen) return;

        const handleTouchStart = (e) => {
            if (e.cancelable) e.preventDefault();
            isDrawingDrawing.current = true;
            drawDrawing(e);
        };

        const handleTouchMove = (e) => {
            if (e.cancelable) e.preventDefault();
            drawDrawing(e);
        };

        const handleTouchEnd = (e) => {
            if (e.cancelable) e.preventDefault();
            isDrawingDrawing.current = false;
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        document.body.style.overflow = 'hidden';

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            document.body.style.overflow = '';
        };
    }, [drawingImageModalOpen, activeBrushColor]);

    useEffect(() => {
        if (drawingImageModalOpen && activeDrawItemInfo) {
            setTimeout(() => {
                const canvas = drawingCanvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const { itemId, type } = activeDrawItemInfo;
                    const ans = execAnswers[itemId] || {};
                    const savedImage = type === 'antes' ? ans.photoAntes : ans.photoDepois;
                    const bgPhoto = type === 'antes' ? ans.bgPhotoAntes : ans.bgPhotoDepois;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (savedImage) {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        };
                        img.src = savedImage;
                    } else if (bgPhoto) {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        };
                        img.src = bgPhoto;
                    } else {
                        drawEquipmentOutline(ctx, canvas.width, canvas.height, type);
                    }
                    
                    if (type === 'antes') {
                        setActiveBrushColor('#ef4444');
                    } else {
                        setActiveBrushColor(ans.statusDepois || '#10b981');
                        setModalHasYellowStroke(ans.hasYellowStroke || false);
                    }
                }
            }, 100);
        }
    }, [drawingImageModalOpen, activeDrawItemInfo]);

    const saveDrawingFromModal = () => {
        if (drawingCanvasRef.current && activeDrawItemInfo) {
            const dataUrl = drawingCanvasRef.current.toDataURL();
            const { itemId, type } = activeDrawItemInfo;
            const curAns = execAnswers[itemId] || { answer: '', photo: '', comment: '', barcode: '', signature: '', photoAntes: '', photoDepois: '', statusDepois: '#10b981' };
            
            if (type === 'antes') {
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { ...curAns, photoAntes: dataUrl }
                });
            } else {
                const statusDepois = modalHasYellowStroke ? '#eab308' : '#10b981';
                setExecAnswers({
                    ...execAnswers,
                    [itemId]: { 
                        ...curAns, 
                        photoDepois: dataUrl, 
                        statusDepois: statusDepois,
                        hasYellowStroke: modalHasYellowStroke
                    }
                });
            }
        }
        setDrawingImageModalOpen(false);
        setActiveDrawItemInfo(null);
    };

    const restoreBaseOutline = () => {
        if (drawingCanvasRef.current && activeDrawItemInfo) {
            const canvas = drawingCanvasRef.current;
            const ctx = canvas.getContext('2d');
            const { itemId, type } = activeDrawItemInfo;
            const ans = execAnswers[itemId] || {};
            const bgPhoto = type === 'antes' ? ans.bgPhotoAntes : ans.bgPhotoDepois;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bgPhoto) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = bgPhoto;
            } else {
                drawEquipmentOutline(ctx, canvas.width, canvas.height, type);
            }
            if (type === 'depois') {
                setModalHasYellowStroke(false);
            }
        }
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

    const getItemRuleActions = (item) => {
        return item.ruleActions || (item.ruleAction && item.ruleAction !== 'none' ? [item.ruleAction] : []);
    };

    const handleFinishExecution = async () => {
        // Validate all required fields
        let isMissing = false;
        let ncTriggered = 0;
        const answersList = [];

        for (const item of activeExecution.items) {
            const ans = execAnswers[item.id] || { answer: '', photo: '', comment: '', barcode: '', signature: '', photoAntes: '', photoDepois: '', statusDepois: '#10b981' };
            
            // Check mandatory
            if (item.required && !ans.answer && item.type !== 'assinatura' && item.type !== 'codigo_barras' && item.type !== 'qr_code' && item.type !== 'foto' && item.type !== 'antes_depois') {
                isMissing = true;
                break;
            }

            // Canvas signatures checking
            if (item.type === 'assinatura' && item.required && !ans.signature) {
                isMissing = true;
                break;
            }

            // Photo checking
            if (item.type === 'foto' && item.required && !ans.photo) {
                isMissing = true;
                break;
            }

            // Antes e Depois checking
            if (item.type === 'antes_depois' && item.required && (!ans.photoAntes || !ans.photoDepois)) {
                isMissing = true;
                break;
            }

            // Check comments mandatory
            if (item.commentRequired && !ans.comment) {
                showSystemAlert(`O item "${item.label}" exige comentário descritivo.`, 'Comentário Obrigatório', 'warning');
                return;
            }

            // Check evidence mandatory (e.g. photo)
            if (item.evidenceRequired && !ans.photo && item.type !== 'antes_depois') {
                showSystemAlert(`O item "${item.label}" exige anexo de foto/evidência.`, 'Foto Obrigatória', 'warning');
                return;
            }

            // Limits numeric checking
            if (item.type === 'numero' && ans.answer) {
                const num = parseFloat(ans.answer);
                if (num < item.minVal || num > item.maxVal) {
                    const itemActions = getItemRuleActions(item);
                    showSystemAlert(`O item "${item.label}" tem valor fora da faixa permitida (${item.minVal} a ${item.maxVal}).`, 'Valor Fora dos Limites', 'warning');
                    if (itemActions.includes('block')) {
                        showSystemAlert(`Bloqueio de Etapa: Execução cancelada pelo limite de segurança do sensor.`, 'Bloqueio de Segurança', 'error');
                        return;
                    }
                    if (itemActions.includes('alert')) {
                        showSystemAlert(`Alerta de Segurança disparado para o item "${item.label}"!`, 'Alerta de Segurança', 'warning');
                    }
                }
            }

            if (item.type === 'antes_depois') {
                answersList.push({
                    itemId: item.id,
                    label: item.label,
                    type: item.type,
                    answer: `Antes: ${ans.photoAntes ? 'Desenho Realizado' : 'Não'} | Depois: ${ans.photoDepois ? 'Desenho Realizado (' + (ans.statusDepois === '#eab308' ? 'Pendente' : 'Resolvido') + ')' : 'Não'}`,
                    photoAntes: ans.photoAntes,
                    photoDepois: ans.photoDepois,
                    statusDepois: ans.statusDepois,
                    comment: ans.comment,
                    weight: item.weight || 1
                });
            } else {
                answersList.push({
                    itemId: item.id,
                    label: item.label,
                    type: item.type,
                    answer: item.type === 'assinatura' ? ans.signature : (item.type === 'foto' ? ans.photo : ans.answer),
                    photo: ans.photo,
                    comment: ans.comment,
                    barcode: ans.barcode || ans.answer,
                    weight: item.weight || 1
                });
            }
        }

        if (isMissing) {
            showSystemAlert('Por favor, preencha todas as perguntas obrigatórias do checklist.', 'Respostas Pendentes', 'warning');
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
            } else if (item.type === 'antes_depois' && userAns.statusDepois === '#eab308') {
                isCompliant = false;
            }

            if (isCompliant) {
                compliantWeight += weight;
            } else {
                const itemActions = getItemRuleActions(item);
                if (itemActions.includes('create_nc') || item.type === 'sim_nao' || item.type === 'antes_depois') {
                    ncTriggered++;
                }
            }
        });

        const conformityScore = totalWeight > 0 ? Math.round((compliantWeight / totalWeight) * 100) : 100;
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
            const updatedQueue = [...offlineQueue, newExecution];
            setKey('checklistOfflineQueue', updatedQueue);
            localStorage.setItem('corellux_offline_queue', JSON.stringify(updatedQueue));
            setExecResultModal({
                name: activeExecution.name,
                conformity: conformityScore,
                status: newExecution.status,
                ncCount: ncTriggered,
                offline: true
            });
        } else {
            const res = await DbService.saveChecklistExecution(newExecution);
            if (res.success) {
                const dbExec = res.data;

                // Rules Engine: Generates Non Conformities & Alerts
                for (let idx = 0; idx < activeExecution.items.length; idx++) {
                    const item = activeExecution.items[idx];
                    const userAns = answersList[idx];
                    const itemActions = getItemRuleActions(item);
                    
                    let failed = false;
                    if (item.type === 'sim_nao' && userAns.answer === 'Não') failed = true;
                    if (item.type === 'numero' && userAns.answer) {
                        const val = parseFloat(userAns.answer);
                        if (val < item.minVal || val > item.maxVal) failed = true;
                    }
                    if (item.type === 'antes_depois' && userAns.statusDepois === '#eab308') failed = true;

                    if (failed) {
                        if (itemActions.includes('alert')) {
                            showSystemAlert(`Alerta de Desvio Operacional: O item "${item.label}" falhou na execução!`, 'Desvio Operacional', 'warning');
                        }
                        if (itemActions.includes('create_nc') || item.type === 'sim_nao' || item.type === 'antes_depois') {
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

                        // Integração Patrimônio: se houver vínculo, gera a ocorrência automaticamente
                        if (item.linkPatrimony && item.linkedPatrimonySku && item.patrimonyRuleAction) {
                            try {
                                await DbService.createPatrimonyMovementFromChecklist(
                                    item.linkedPatrimonySku,
                                    'Saída',
                                    1,
                                    item.patrimonyRuleAction,
                                    currentUser.name || 'Checklist'
                                );
                            } catch (patrimonyErr) {
                                console.error('[ChecklistHub] Falha ao gerar ocorrência de patrimônio:', patrimonyErr);
                            }
                        }
                    }
                }

                logEvent('Checklist executado', { name: activeExecution.name, conformity: conformityScore, status: newExecution.status });
                setExecResultModal({
                    name: activeExecution.name,
                    conformity: conformityScore,
                    status: newExecution.status,
                    ncCount: ncTriggered,
                    offline: false
                });
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
            showSystemAlert('Plano de ação corretiva gerado com sucesso!', 'Plano de Ação', 'success');
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
            showSystemAlert(`Plano de ação alterado para ${nextStatus}!`, 'Plano de Ação', 'info');
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
            showSystemAlert(`Nenhum checklist ativo configurado para o setor "${sector}". Crie um template primeiro.`, 'Integração ERP', 'error');
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
        showSystemAlert(`Sucesso! Evento ERP [${eventName}] interceptado pelo motor de contexto. Notificação criada!`, 'Integração ERP', 'success');
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

                /* BUILDER LAYOUT AND PREMIUM BRAND DESIGN SYSTEM */
                .builder-container {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 1.5rem;
                    align-items: start;
                    margin-top: 1rem;
                }
                @media (max-width: 900px) {
                    .builder-container {
                        grid-template-columns: 1fr;
                    }
                }
                .builder-sidebar {
                    background: rgba(30, 41, 59, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    position: sticky;
                    top: 10px;
                    box-sizing: border-box;
                }
                .btn-builder-add-item {
                    width: 100%;
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    color: #cbd5e1;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .btn-builder-add-item:hover {
                    background: rgba(45, 212, 191, 0.08);
                    border-color: rgba(45, 212, 191, 0.3);
                    color: #fff;
                    transform: translateX(2px);
                }
                .btn-builder-add-item svg {
                    flex-shrink: 0;
                }
                .builder-questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .builder-item-card {
                    background: rgba(30, 41, 59, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease;
                }
                .builder-item-card:hover {
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .builder-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 0.75rem;
                }
                .builder-type-pill {
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 0.2rem 0.6rem;
                    border-radius: 4px;
                    background: rgba(45, 212, 191, 0.1);
                    color: #2dd4bf;
                    border: 1px solid rgba(45, 212, 191, 0.2);
                }
                .composer-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }
                .composer-field-group label {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .composer-field-group input,
                .composer-field-group select,
                .composer-field-group textarea {
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
                .composer-field-group input:focus,
                .composer-field-group select:focus,
                .composer-field-group textarea:focus {
                    border-color: #2dd4bf !important;
                    box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.15) !important;
                }
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
                    border-color: #2dd4bf !important;
                    box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.15) !important;
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
                .btn-send-aviso {
                    background: var(--accent-orange) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 8px !important;
                    font-weight: 800 !important;
                    font-size: 0.88rem !important;
                    cursor: pointer !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.5rem !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 4px 12px rgba(243, 107, 29, 0.2) !important;
                }
                .btn-send-aviso:hover {
                    background: #d95e16 !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 6px 15px rgba(243, 107, 29, 0.3) !important;
                }
                .btn-send-aviso:active {
                    transform: translateY(0) !important;
                }
                .btn-tool {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    color: #cbd5e1 !important;
                    border-radius: 8px !important;
                    font-weight: 700 !important;
                    font-size: 0.82rem !important;
                    cursor: pointer !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.4rem !important;
                    transition: all 0.2s ease !important;
                }
                .btn-tool:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border-color: rgba(255, 255, 255, 0.15) !important;
                    color: #fff !important;
                }
                .btn-tool:active {
                    transform: translateY(1px) !important;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}} />

            {/* Sidebar Lateral - REMOVIDA PARA LAYOUT DE CARDS */}

            {/* Container de Conteúdo Principal */}
            <div className="chk-main-container">
                


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

                            <div className="chk-menu-card emerald" onClick={() => setTab('checklist_audit')}>
                                <div className="chk-menu-card-icon">
                                    <Eye size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Auditoria de Checklist</h3>
                                    <p>Audite vistorias finalizadas, assinaturas, conformidades e evidências fotográficas.</p>
                                </div>
                            </div>

                            <div className="chk-menu-card yellow" onClick={() => setTab('score_ranking')}>
                                <div className="chk-menu-card-icon">
                                    <Award size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Pontuação & Performance</h3>
                                    <p>Consulte o ranking de conformidade de setores e indicadores de performance de colaboradores.</p>
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

                            <div className="chk-menu-card purple" onClick={() => setTab('collaborator_diagram')}>
                                <div className="chk-menu-card-icon">
                                    <Users size={24} />
                                </div>
                                <div className="chk-menu-card-content">
                                    <h3>Diagrama de Colaboradores</h3>
                                    <p>Vincule colaboradores aos checklists operacionais arrastando-os diretamente.</p>
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                                {checklistModels.filter(m => m.status === 'Ativo').map(m => {
                                    const isDueToday = (() => {
                                        const today = new Date();
                                        if (m.frequency === 'Diário') return true;
                                        if (m.frequency === 'Semanal') {
                                            const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                                            return m.frequencyDay === daysOfWeek[today.getDay()];
                                        }
                                        if (m.frequency === 'Mensal') {
                                            const todayDay = today.getDate();
                                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                                            if (m.frequencyDay === 'Ultimo dia do mes') return todayDay === lastDay;
                                            const target = parseInt(m.frequencyDay, 10);
                                            if (target === todayDay) return true;
                                            if (target > lastDay && todayDay === lastDay) return true;
                                            return false;
                                        }
                                        return true;
                                    })();

                                    const assignedIds = checklistAssignments[m.id] || [];
                                    const assignedUsers = assignedIds.map(id => appUsers.find(u => String(u.id) === String(id))).filter(Boolean);
                                    const itemCount = (m.items || []).length;
                                    const freqColor = m.frequency === 'Diário' ? '#2dd4bf' : m.frequency === 'Semanal' ? '#60a5fa' : '#a855f7';

                                    return (
                                        <div
                                            key={m.id}
                                            style={{
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: `1px solid ${isDueToday ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                transition: 'all 0.25s ease',
                                                cursor: 'pointer',
                                                backdropFilter: 'blur(10px)',
                                                boxShadow: isDueToday ? '0 0 20px rgba(45,212,191,0.06)' : 'none',
                                                position: 'relative',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.borderColor = 'rgba(45,212,191,0.4)';
                                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(45,212,191,0.12)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = isDueToday ? 'rgba(45,212,191,0.25)' : 'rgba(255,255,255,0.06)';
                                                e.currentTarget.style.boxShadow = isDueToday ? '0 0 20px rgba(45,212,191,0.06)' : 'none';
                                            }}
                                        >
                                            {/* Barra de cor no topo */}
                                            <div style={{ height: '3px', background: `linear-gradient(90deg, ${freqColor}, ${freqColor}44)` }} />

                                            {/* Badge Hoje */}
                                            {isDueToday && (
                                                <div style={{
                                                    position: 'absolute', top: '12px', right: '12px',
                                                    background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.35)',
                                                    color: '#2dd4bf', fontSize: '0.6rem', fontWeight: 800,
                                                    padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                }}>● Hoje</div>
                                            )}

                                            {/* Corpo */}
                                            <div style={{ padding: '1.25rem 1.25rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {/* Ícone + título */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                                                    <div style={{
                                                        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                                                        background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <ClipboardList size={20} style={{ color: '#2dd4bf' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, paddingRight: isDueToday ? '3.5rem' : 0 }}>{m.name}</h3>
                                                        {m.sector && <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '2px' }}>{m.sector}</span>}
                                                    </div>
                                                </div>

                                                {/* Métricas */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Frequência</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: freqColor }}>{m.frequency || '—'}</div>
                                                    </div>
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Itens</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{itemCount} <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.7rem' }}>perguntas</span></div>
                                                    </div>
                                                </div>

                                                {/* Designados */}
                                                {assignedUsers.length > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Designados:</span>
                                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                            {assignedUsers.slice(0, 3).map(user => (
                                                                <span key={user.id} style={{
                                                                    fontSize: '0.68rem', background: 'rgba(45,212,191,0.08)',
                                                                    border: '1px solid rgba(45,212,191,0.15)', color: '#2dd4bf',
                                                                    padding: '1px 6px', borderRadius: '4px', fontWeight: 600
                                                                }}>{user.name}</span>
                                                            ))}
                                                            {assignedUsers.length > 3 && (
                                                                <span style={{ fontSize: '0.68rem', color: '#64748b', padding: '1px 4px' }}>+{assignedUsers.length - 3}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rodapé */}
                                            <div style={{
                                                padding: '0.75rem 1.25rem',
                                                borderTop: '1px solid rgba(255,255,255,0.04)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: 'rgba(0,0,0,0.15)'
                                            }}>
                                                <span style={{ fontSize: '0.68rem', color: '#475569' }}>
                                                    {m.frequencyDay ? `📅 ${m.frequencyDay}` : '📋 Sob demanda'}
                                                </span>
                                                <button
                                                    onClick={() => handleStartExecution(m)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                        padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none',
                                                        background: 'linear-gradient(135deg, #2dd4bf, #0891b2)',
                                                        color: '#fff', fontWeight: 800, fontSize: '0.78rem',
                                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                                        boxShadow: '0 4px 12px rgba(45,212,191,0.25)'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(45,212,191,0.4)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(45,212,191,0.25)'; }}
                                                >
                                                    <Play size={13} fill="currentColor" /> Iniciar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                {availableSectors.map(sec => (
                                    <option key={sec.id} value={sec.name}>{sec.name}</option>
                                ))}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
                            {/* SVG Trend Chart */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.75rem', width: '100%', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>Evolução de Conformidade Operacional</h3>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Percentual médio de conformidade dos checklists por período e filtros.</p>
                                    </div>
                                    
                                    {/* Filtros Internos do Gráfico */}
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <select 
                                            className="chk-filter-select" 
                                            value={chartPeriod} 
                                            onChange={(e) => setChartPeriod(e.target.value)}
                                            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="SEMANAL">Período: Semanal</option>
                                            <option value="MENSAL">Período: Mensal</option>
                                            <option value="TRIMESTRAL">Período: Trimestral</option>
                                            <option value="SEMESTRAL">Período: Semestral</option>
                                            <option value="ANUAL">Período: Anual</option>
                                        </select>
                                        
                                        <select 
                                            className="chk-filter-select" 
                                            value={chartSector} 
                                            onChange={(e) => setChartSector(e.target.value)}
                                            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="GERAL">Setor: Geral</option>
                                            <option value="COZINHA">Setor: Cozinha</option>
                                            <option value="SALÃO">Setor: Salão</option>
                                            <option value="ESTOQUE">Setor: Estoque</option>
                                            <option value="ADMINISTRAÇÃO">Setor: Administração</option>
                                        </select>

                                        <select 
                                            className="chk-filter-select" 
                                            value={chartUser} 
                                            onChange={(e) => setChartUser(e.target.value)}
                                            style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="GERAL">Colaborador: Geral</option>
                                            {appUsers.map(u => (
                                                <option key={u.id} value={u.name}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                    <svg width="100%" height="260" viewBox="0 0 650 320" style={{ overflow: 'visible' }}>
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Grid lines horizontal */}
                                        <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1">
                                            <line x1="50" y1="40" x2="620" y2="40" />
                                            <line x1="50" y1="97.5" x2="620" y2="97.5" />
                                            <line x1="50" y1="155" x2="620" y2="155" />
                                            <line x1="50" y1="212.5" x2="620" y2="212.5" />
                                            <line x1="50" y1="270" x2="620" y2="270" />
                                        </g>

                                        {/* Y Axis Labels */}
                                        <g fill="#94a3b8" fontSize="10" textAnchor="end">
                                            <text x="40" y="43">100%</text>
                                            <text x="40" y="100.5">75%</text>
                                            <text x="40" y="158">50%</text>
                                            <text x="40" y="215.5">25%</text>
                                            <text x="40" y="273">0%</text>
                                        </g>

                                        {/* X Axis Labels */}
                                        <g fill="#94a3b8" fontSize="10" textAnchor="middle">
                                            {chartPoints.map((p, idx) => {
                                                const x = 50 + idx * (570 / (chartPoints.length - 1));
                                                return (
                                                    <text key={idx} x={x} y="295">{p.label}</text>
                                                );
                                            })}
                                        </g>

                                        {/* Gradient Fill under line */}
                                        <polygon 
                                            points={`50,270 ` + chartPoints.map((p, idx) => {
                                                const x = 50 + idx * (570 / (chartPoints.length - 1));
                                                const y = 270 - (p.value / 100) * 230;
                                                return `${x},${y}`;
                                            }).join(' ') + ` 620,270`} 
                                            fill="url(#chartGradient)" 
                                        />

                                        {/* The Trend Line */}
                                        <polyline
                                            fill="none"
                                            stroke="#2dd4bf"
                                            strokeWidth="3"
                                            points={chartPoints.map((p, idx) => {
                                                const x = 50 + idx * (570 / (chartPoints.length - 1));
                                                const y = 270 - (p.value / 100) * 230;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                        />

                                        {/* Dots & Tooltip Badges */}
                                        {chartPoints.map((p, idx) => {
                                            const x = 50 + idx * (570 / (chartPoints.length - 1));
                                            const y = 270 - (p.value / 100) * 230;
                                            return (
                                                <g key={idx}>
                                                    <circle cx={x} cy={y} r="5" fill="#2dd4bf" stroke="#0f172a" strokeWidth="2" />
                                                    <rect x={x - 16} y={y - 23} width="32" height="15" rx="3" fill="#1e293b" stroke="rgba(45, 212, 191, 0.4)" strokeWidth="1" />
                                                    <text x={x} y={y - 12} fill="#2dd4bf" fontSize="8" textAnchor="middle" fontWeight="bold">{p.value}%</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            </div>

                            {/* Row for lower charts */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
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
                                            <text x="140" y="82" fill="#fff" fontSize="10" textAnchor="middle">8 NCs</text>
                                            <text x="230" y="112" fill="#fff" fontSize="10" textAnchor="middle">5 NCs</text>
                                            <text x="320" y="132" fill="#fff" fontSize="10" textAnchor="middle">3 NCs</text>
                                        </svg>
                                    </div>
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
                                            <td>{m.frequency} {m.startTime && m.endTime ? `(${m.startTime} - ${m.endTime})` : ''}</td>
                                            <td><code>v{m.version || '1.0.0'}</code></td>
                                            <td>{m.effectiveDate ? new Date(m.effectiveDate).toLocaleDateString() : 'Imediata'}</td>
                                            <td>
                                                <span className={`status-badge ${m.status === 'Ativo' ? 'badge-ativo' : 'badge-desligado'}`}>{m.status}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                    <button className="btn-tool" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleOpenBuilder(m)}>Editar</button>
                                                    <button className="btn-tool" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-orange)', borderColor: 'rgba(249, 115, 22, 0.2)' }} onClick={() => { setQrPrintModel(m); setQrPrintModalOpen(true); }}>Imprimir QR</button>
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
                            
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('sim_nao')} type="button">
                                <CheckCircle2 size={13} style={{ color: '#4ade80' }} /> Sim / Não (Conformidade)
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('texto')} type="button">
                                <FileSpreadsheet size={13} style={{ color: '#60a5fa' }} /> Resposta de Texto
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('numero')} type="button">
                                <Sliders size={13} style={{ color: '#facc15' }} /> Resposta Numérica
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('multipla_escolha')} type="button">
                                <CheckSquare size={13} style={{ color: '#2dd4bf' }} /> Múltipla Escolha (Checkboxes)
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('data')} type="button">
                                <Calendar size={13} style={{ color: '#fb7185' }} /> Campo de Data
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('hora')} type="button">
                                <Clock size={13} style={{ color: '#fbbf24' }} /> Campo de Hora
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('assinatura')} type="button">
                                <Signature size={13} style={{ color: '#38bdf8' }} /> Assinatura Digital
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('codigo_barras')} type="button">
                                <Database size={13} style={{ color: '#c084fc' }} /> Cód. Barras / QR Code
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('foto')} type="button">
                                <Camera size={13} style={{ color: '#f87171' }} /> Anexo de Foto
                            </button>
                            <button className="btn-builder-add-item" onClick={() => handleAddBuilderQuestion('antes_depois')} type="button">
                                <Sliders size={13} style={{ color: '#f97316' }} /> Antes e Depois (Desenho)
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
                                            {availableSectors.map(sec => (
                                                <option key={sec.id} value={sec.name}>{sec.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Categoria</label>
                                        <select className="input-title" value={builderCategory} onChange={(e) => setBuilderCategory(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <option value="Qualidade">Qualidade</option>
                                            <option value="Segurança">Segurança</option>
                                            <option value="Recebimento">Recebimento</option>
                                            <option value="Manutenção">Manutenção</option>
                                            <option value="Abertura">Abertura</option>
                                            <option value="Encerramento">Encerramento</option>
                                            <option value="Fechamento estabelecimento">Fechamento estabelecimento</option>
                                        </select>
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Periodicidade</label>
                                        <select className="input-title" value={builderFrequency} onChange={(e) => {
                                            setBuilderFrequency(e.target.value);
                                            setBuilderFrequencyDay(''); // reset day on frequency change
                                        }} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <option value="Diário">Diário</option>
                                            <option value="Semanal">Semanal</option>
                                            <option value="Mensal">Mensal</option>
                                            <option value="Por evento">Por Evento</option>
                                            <option value="Sob demanda">Sob Demanda</option>
                                        </select>
                                    </div>

                                    {builderFrequency === 'Semanal' && (
                                        <div className="composer-field-group">
                                            <label>Dia da Semana Recorrente</label>
                                            <select 
                                                className="input-title" 
                                                value={builderFrequencyDay} 
                                                onChange={(e) => setBuilderFrequencyDay(e.target.value)} 
                                                style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Segunda-feira">Segunda-feira</option>
                                                <option value="Terça-feira">Terça-feira</option>
                                                <option value="Quarta-feira">Quarta-feira</option>
                                                <option value="Quinta-feira">Quinta-feira</option>
                                                <option value="Sexta-feira">Sexta-feira</option>
                                                <option value="Sábado">Sábado</option>
                                                <option value="Domingo">Domingo</option>
                                            </select>
                                        </div>
                                    )}

                                    {builderFrequency === 'Mensal' && (
                                        <div className="composer-field-group">
                                            <label>Dia do Mês Recorrente</label>
                                            <select 
                                                className="input-title" 
                                                value={builderFrequencyDay} 
                                                onChange={(e) => setBuilderFrequencyDay(e.target.value)} 
                                                style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione...</option>
                                                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                                                    <option key={day} value={day}>Dia {day}</option>
                                                ))}
                                                <option value="Ultimo dia do mes">Último dia do mês</option>
                                            </select>
                                        </div>
                                    )}
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
                                    <div className="composer-field-group">
                                        <label>Hora de Início Recomendada</label>
                                        <input type="time" className="input-title" value={builderStartTime} onChange={(e) => setBuilderStartTime(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }} />
                                    </div>
                                    <div className="composer-field-group">
                                        <label>Hora Limite (Fim)</label>
                                        <input type="time" className="input-title" value={builderEndTime} onChange={(e) => setBuilderEndTime(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer' }} />
                                    </div>
                                </div>
                                <div className="composer-field-group" style={{ marginTop: '1rem' }}>
                                    <label>Descrição detalhada do Checklist</label>
                                    <textarea className="input-title textarea-exec-obs" placeholder="Instruções para o executor do checklist..." value={builderDescription} onChange={(e) => setBuilderDescription(e.target.value)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold' }}>Imagens de Instrução (Exibidas na Execução):</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {builderDescImages.map((img, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Instr" />
                                                    <button 
                                                        onClick={() => setBuilderDescImages(builderDescImages.filter((_, i) => i !== idx))}
                                                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.8)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                                                        type="button"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                className="btn-tool" 
                                                onClick={() => {
                                                    const mockUrls = [
                                                        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
                                                        'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=400&q=80',
                                                        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80'
                                                    ];
                                                    const url = prompt('Insira a URL da imagem de referência (ou deixe em branco para usar uma imagem de exemplo):');
                                                    const selectedUrl = url ? url.trim() : mockUrls[builderDescImages.length % mockUrls.length];
                                                    setBuilderDescImages([...builderDescImages, selectedUrl]);
                                                }}
                                                style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', color: '#cbd5e1' }}
                                                type="button"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold' }}>Tipo:</span>
                                                    <select 
                                                        className="chk-filter-select"
                                                        value={q.type}
                                                        onChange={(e) => handleUpdateBuilderQuestion(q.id, 'type', e.target.value)}
                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.1)', borderColor: 'rgba(45, 212, 191, 0.2)' }}
                                                    >
                                                        <option value="sim_nao">Sim / Não (Conformidade)</option>
                                                        <option value="texto">Resposta de Texto</option>
                                                        <option value="numero">Resposta Numérica</option>
                                                        <option value="multipla_escolha">Múltipla Escolha (Checkboxes)</option>
                                                        <option value="data">Campo de Data</option>
                                                        <option value="hora">Campo de Hora</option>
                                                        <option value="assinatura">Assinatura Digital</option>
                                                        <option value="codigo_barras">Cód. Barras</option>
                                                        <option value="qr_code">QR Code</option>
                                                        <option value="foto">Anexo de Foto</option>
                                                        <option value="antes_depois">Antes e Depois (Desenho)</option>
                                                    </select>
                                                </div>
                                                <button 
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                    onClick={() => handleRemoveBuilderQuestion(q.id)}
                                                    type="button"
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

                                            {q.type === 'multipla_escolha' && (
                                                <div className="composer-field-group" style={{ marginBottom: '1.2rem' }}>
                                                    <label style={{ color: '#2dd4bf', fontWeight: 600 }}>Opções de Escolha (separadas por vírgula) *</label>
                                                    <input 
                                                        type="text" 
                                                        className="input-title" 
                                                        placeholder="EX: Pendente, Aprovado, Rejeitado" 
                                                        value={q.options || ''}
                                                        onChange={(e) => handleUpdateBuilderQuestion(q.id, 'options', e.target.value)}
                                                        style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>Ações se Falhar:</span>
                                                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                                        {[{ key: 'alert', label: 'Alerta' }, { key: 'create_nc', label: 'Criar NC' }, { key: 'block', label: 'Bloquear Etapa' }].map(act => {
                                                            const activeActions = q.ruleActions || (q.ruleAction && q.ruleAction !== 'none' ? [q.ruleAction] : []);
                                                            const isChecked = activeActions.includes(act.key);
                                                            const handleCheckboxChange = (checked) => {
                                                                let newActions = [...activeActions];
                                                                if (checked) {
                                                                    if (!newActions.includes(act.key)) newActions.push(act.key);
                                                                } else {
                                                                    newActions = newActions.filter(x => x !== act.key);
                                                                }
                                                                handleUpdateBuilderQuestion(q.id, 'ruleActions', newActions);
                                                                handleUpdateBuilderQuestion(q.id, 'ruleAction', newActions.length > 0 ? newActions[0] : 'none');
                                                            };
                                                            return (
                                                                <label key={act.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isChecked} 
                                                                        onChange={(e) => handleCheckboxChange(e.target.checked)} 
                                                                        style={{ accentColor: '#ef4444' }} 
                                                                    />
                                                                    {act.label}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Vincular a Patrimônio */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#2dd4bf', fontWeight: 'bold' }}>Vínculo com Patrimônio:</span>
                                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!q.linkPatrimony} 
                                                                onChange={(e) => {
                                                                    handleUpdateBuilderQuestion(q.id, 'linkPatrimony', e.target.checked);
                                                                    if (!e.target.checked) {
                                                                        handleUpdateBuilderQuestion(q.id, 'linkedPatrimonySku', '');
                                                                        handleUpdateBuilderQuestion(q.id, 'patrimonyRuleAction', '');
                                                                    } else {
                                                                        handleUpdateBuilderQuestion(q.id, 'patrimonyRuleAction', 'Quebra');
                                                                    }
                                                                }} 
                                                                style={{ accentColor: '#2dd4bf' }} 
                                                            />
                                                            Vincular Item
                                                        </label>

                                                        {q.linkPatrimony && (
                                                            <>
                                                                <select
                                                                    value={q.linkedPatrimonySku || ''}
                                                                    onChange={(e) => handleUpdateBuilderQuestion(q.id, 'linkedPatrimonySku', e.target.value)}
                                                                    className="chk-filter-select"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                >
                                                                    <option value="">-- Selecione o Item --</option>
                                                                    {(Array.isArray(patrimonyItems) ? patrimonyItems : []).filter(i => i && i.status === 'Ativo').map(item => (
                                                                        <option key={item.id} value={item.code}>{item.name} ({item.code})</option>
                                                                    ))}
                                                                </select>

                                                                <select
                                                                    value={q.patrimonyRuleAction || 'Quebra'}
                                                                    onChange={(e) => handleUpdateBuilderQuestion(q.id, 'patrimonyRuleAction', e.target.value)}
                                                                    className="chk-filter-select"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                >
                                                                    <option value="Quebra">Registrar Quebra</option>
                                                                    <option value="Perda">Registrar Perda</option>
                                                                    <option value="Item Faltante">Registrar Item Faltante</option>
                                                                    <option value="Item Danificado">Registrar Item Danificado</option>
                                                                </select>
                                                            </>
                                                        )}
                                                    </div>
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
                                    Setor: <strong>{activeExecution.sector}</strong> | Executor: <strong>{currentUser.name}</strong> {activeExecution.startTime && activeExecution.endTime && (
                                        <> | Horário Limite: <strong>{activeExecution.startTime} às {activeExecution.endTime}</strong></>
                                    )}
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <MapPin size={15} style={{ color: '#2dd4bf' }} />
                                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{gpsCoordinates}</span>
                            </div>
                        </div>

                        {/* Schedule Window Check & Alert Banner */}
                        {(() => {
                            if (!activeExecution.startTime || !activeExecution.endTime) return null;
                            const now = new Date();
                            const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                            const isWithinWindow = nowStr >= activeExecution.startTime && nowStr <= activeExecution.endTime;
                            if (isWithinWindow) return null;
                            return (
                                <div style={{ 
                                    background: 'rgba(250, 204, 21, 0.1)', 
                                    border: '1px solid #facc15', 
                                    borderRadius: '8px', 
                                    padding: '0.75rem 1rem', 
                                    marginBottom: '1.5rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    color: '#facc15',
                                    fontSize: '0.85rem'
                                }}>
                                    <AlertTriangle size={16} />
                                    <span>Atenção: Vistoria executada fora do horário programado ({activeExecution.startTime} às {activeExecution.endTime}).</span>
                                </div>
                            );
                        })()}

                        {/* General Description & Reference Images */}
                        {activeExecution.description && (
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Instruções de Execução</span>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{activeExecution.description}</p>
                                {activeExecution.descriptionImages && activeExecution.descriptionImages.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                                        {activeExecution.descriptionImages.map((imgUrl, iIdx) => (
                                            <div key={iIdx} style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', position: 'relative' }}>
                                                <img src={imgUrl} alt={`Instrução ${iIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: 'fit-content' }}>
                                                {ans.signature ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.5rem', width: '220px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <img src={ans.signature} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Assinatura" />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                            <button className="btn-tool" onClick={() => openSignaturePopup(item.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} type="button">Alterar</button>
                                                            <button className="btn-tool" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }} onClick={() => {
                                                                const curAns = execAnswers[item.id] || { answer: '', photo: '', comment: '', barcode: '', signature: '' };
                                                                setExecAnswers({ ...execAnswers, [item.id]: { ...curAns, answer: '', signature: '' } });
                                                            }} type="button">Limpar</button>
                                                            <span style={{ color: '#10b981', fontSize: '0.75rem', alignSelf: 'center', fontWeight: 'bold' }}>✓ Assinado</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        className="btn-send-aviso" 
                                                        onClick={() => openSignaturePopup(item.id)}
                                                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', width: 'fit-content' }}
                                                        type="button"
                                                    >
                                                        <Signature size={15} /> CLIQUE PARA ASSINAR
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Multiple Choice (Checkboxes) type */}
                                        {item.type === 'multipla_escolha' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                {((item.options || 'Opção 1, Opção 2, Opção 3').split(',')).map((opt, oIdx) => {
                                                    const trimmedOpt = opt.trim();
                                                    if (!trimmedOpt) return null;
                                                    const selectedList = ans.answer ? ans.answer.split(',').map(s => s.trim()) : [];
                                                    const isChecked = selectedList.includes(trimmedOpt);
                                                    
                                                    const handleCheckboxChange = (checked) => {
                                                        let newList = [...selectedList];
                                                        if (checked) {
                                                            if (!newList.includes(trimmedOpt)) newList.push(trimmedOpt);
                                                        } else {
                                                            newList = newList.filter(v => v !== trimmedOpt);
                                                        }
                                                        setExecAnswers({
                                                            ...execAnswers,
                                                            [item.id]: { ...ans, answer: newList.join(', ') }
                                                        });
                                                    };

                                                    return (
                                                        <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', color: '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={(e) => handleCheckboxChange(e.target.checked)}
                                                                style={{ accentColor: '#38bdf8', width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                            {trimmedOpt}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Date question type */}
                                        {item.type === 'data' && (
                                            <input 
                                                type="date" 
                                                className="input-title"
                                                value={ans.answer || ''}
                                                onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, answer: e.target.value } })}
                                                style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '200px', colorScheme: 'dark' }}
                                            />
                                        )}

                                        {/* Time question type */}
                                        {item.type === 'hora' && (
                                            <input 
                                                type="time" 
                                                className="input-title"
                                                value={ans.answer || ''}
                                                onChange={(e) => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, answer: e.target.value } })}
                                                style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '150px', colorScheme: 'dark' }}
                                            />
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
                                        {(item.type === 'foto' || (item.evidenceRequired && item.type !== 'antes_depois')) && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                                                    {item.evidenceRequired ? 'Evidência Fotográfica Obrigatória *' : 'Anexo de Evidência Fotográfica'}
                                                </label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        id={`file-upload-${item.id}`} 
                                                        style={{ display: 'none' }} 
                                                        onChange={(e) => handlePhotoUpload(e, item.id)} 
                                                    />
                                                    <button 
                                                        className="btn-tool"
                                                        onClick={() => setCameraModal({ isOpen: true, itemId: item.id, type: 'foto' })}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--accent-orange)', color: '#fff', borderColor: 'var(--accent-orange)' }}
                                                        type="button"
                                                    >
                                                        <Camera size={13} /> Tirar Foto
                                                    </button>
                                                    <button 
                                                        className="btn-tool"
                                                        onClick={() => document.getElementById(`file-upload-${item.id}`).click()}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
                                                        type="button"
                                                    >
                                                        <Upload size={13} /> Upload Imagem
                                                    </button>
                                                </div>
                                                {ans.photo && (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '400px' }}>
                                                        <img src={ans.photo} style={{ width: '120px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} alt="Preview" />
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 'bold' }}>✓ Foto anexada com sucesso</span>
                                                            <button 
                                                                className="btn-tool" 
                                                                onClick={() => setExecAnswers({ ...execAnswers, [item.id]: { ...ans, photo: '', answer: '' } })} 
                                                                style={{ fontSize: '0.7rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0.2rem 0.5rem' }}
                                                                type="button"
                                                            >
                                                                Excluir Foto
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Antes e Depois Drawing type */}
                                        {item.type === 'antes_depois' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                    {/* Card Antes */}
                                                    <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Fase 1: Antes (Anomalias)</span>
                                                        
                                                        {ans.photoAntes ? (
                                                            <div style={{ width: '220px', height: '110px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                <img src={ans.photoAntes} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Antes Preview" />
                                                            </div>
                                                        ) : ans.bgPhotoAntes ? (
                                                            <div style={{ width: '220px', height: '110px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                                                                <img src={ans.bgPhotoAntes} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.7 }} alt="Antes Base" />
                                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', fontSize: '0.72rem', color: '#ef4444', fontWeight: 'bold' }}>Aguardando Desenho...</div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '220px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', color: '#64748b', fontSize: '0.78rem', textAlign: 'center', padding: '0.5rem' }}>
                                                                Sem foto de fundo.<br />Tire uma foto ou faça upload.
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                                                            {!ans.bgPhotoAntes ? (
                                                                <>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/*" 
                                                                        id={`antes-upload-${item.id}`} 
                                                                        style={{ display: 'none' }} 
                                                                        onChange={(e) => handleBgPhotoUpload(e, item.id, 'antes')} 
                                                                    />
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                                        onClick={() => setCameraModal({ isOpen: true, itemId: item.id, type: 'antes' })}
                                                                        type="button"
                                                                    >
                                                                        <Camera size={11} /> Tirar Foto
                                                                    </button>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                                        onClick={() => document.getElementById(`antes-upload-${item.id}`).click()}
                                                                        type="button"
                                                                    >
                                                                        <Upload size={11} /> Upload
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.72rem', padding: '0.3rem 0.8rem', fontWeight: 'bold' }}
                                                                        onClick={() => {
                                                                            setActiveDrawItemInfo({ itemId: item.id, type: 'antes' });
                                                                            setDrawingImageModalOpen(true);
                                                                        }}
                                                                        type="button"
                                                                    >
                                                                        <Sliders size={11} /> {ans.photoAntes ? 'Editar Desenho' : 'Desenhar Anomalia'}
                                                                    </button>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.8rem', color: '#64748b' }}
                                                                        onClick={() => clearBgPhoto(item.id, 'antes')}
                                                                        type="button"
                                                                    >
                                                                        Remover Foto
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Card Depois */}
                                                    <div style={{ background: ans.statusDepois === '#eab308' ? 'rgba(234, 179, 8, 0.03)' : 'rgba(16, 185, 129, 0.03)', border: ans.statusDepois === '#eab308' ? '1px solid rgba(234, 179, 8, 0.1)' : '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                                        <span style={{ fontSize: '0.8rem', color: ans.statusDepois === '#eab308' ? '#eab308' : '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                            Fase 2: Depois ({ans.statusDepois === '#eab308' ? 'Pendente' : 'Resolvido'})
                                                        </span>
                                                        
                                                        {ans.photoDepois ? (
                                                            <div style={{ width: '220px', height: '110px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                <img src={ans.photoDepois} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Depois Preview" />
                                                            </div>
                                                        ) : ans.bgPhotoDepois ? (
                                                            <div style={{ width: '220px', height: '110px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                                                                <img src={ans.bgPhotoDepois} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.7 }} alt="Depois Base" />
                                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', fontSize: '0.72rem', color: '#facc15', fontWeight: 'bold' }}>Aguardando Desenho...</div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '220px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', color: '#64748b', fontSize: '0.78rem', textAlign: 'center', padding: '0.5rem' }}>
                                                                Sem foto de fundo.<br />Tire uma foto ou faça upload.
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                                                            {!ans.bgPhotoDepois ? (
                                                                <>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/*" 
                                                                        id={`depois-upload-${item.id}`} 
                                                                        style={{ display: 'none' }} 
                                                                        onChange={(e) => handleBgPhotoUpload(e, item.id, 'depois')} 
                                                                    />
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                                        onClick={() => setCameraModal({ isOpen: true, itemId: item.id, type: 'depois' })}
                                                                        type="button"
                                                                    >
                                                                        <Camera size={11} /> Tirar Foto
                                                                    </button>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                                        onClick={() => document.getElementById(`depois-upload-${item.id}`).click()}
                                                                        type="button"
                                                                    >
                                                                        <Upload size={11} /> Upload
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ borderColor: ans.statusDepois === '#eab308' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)', color: ans.statusDepois === '#eab308' ? '#eab308' : '#10b981', fontSize: '0.72rem', padding: '0.3rem 0.8rem', fontWeight: 'bold' }}
                                                                        onClick={() => {
                                                                            setActiveDrawItemInfo({ itemId: item.id, type: 'depois' });
                                                                            setDrawingImageModalOpen(true);
                                                                        }}
                                                                        type="button"
                                                                    >
                                                                        <Sliders size={11} /> {ans.photoDepois ? 'Editar Desenho' : 'Desenhar Correção'}
                                                                    </button>
                                                                    <button 
                                                                        className="btn-tool" 
                                                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.8rem', color: '#64748b' }}
                                                                        onClick={() => clearBgPhoto(item.id, 'depois')}
                                                                        type="button"
                                                                    >
                                                                        Remover Foto
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
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
                                showSystemConfirm(
                                    'Tem certeza que deseja cancelar? Suas respostas serão apagadas.',
                                    () => {
                                        setActiveExecution(null);
                                        setTab('dashboard');
                                    },
                                    null,
                                    'Cancelar Execução',
                                    'warning'
                                );
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

                {/* TAB 8.1: AUDITORIA DE CHECKLIST */}
                {activeTab === 'checklist_audit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                                Audite vistorias finalizadas, assinaturas, conformidades e evidências fotográficas dos checklists preenchidos.
                            </p>
                            <button className="btn-tool" onClick={() => setTab('menu')} style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                <ArrowLeft size={13} /> Voltar ao Menu
                            </button>
                        </div>

                        {/* Filtros de Auditoria */}
                        <div className="chk-filter-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'rgba(30, 41, 59, 0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>Setor</label>
                                <select className="chk-filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
                                    <option value="TODOS">Todos os Setores</option>
                                    {availableSectors.map(sec => (
                                        <option key={sec.id} value={sec.name}>{sec.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>Colaborador</label>
                                <select className="chk-filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                                    <option value="TODOS">Todos os Colaboradores</option>
                                    {appUsers.map(u => (
                                        <option key={u.id} value={u.name}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '150px' }}>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>Resultado/Status</label>
                                <select className="chk-filter-select" style={{ width: '100%', boxSizing: 'border-box' }} value={auditFilterStatus} onChange={(e) => setAuditFilterStatus(e.target.value)}>
                                    <option value="TODOS">Todos os Status</option>
                                    <option value="Aprovado">Aprovado (&gt;=80%)</option>
                                    <option value="Reprovado">Reprovado (&lt;80%)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                            {checklistExecutions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhum checklist executado encontrado.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="products-table">
                                        <thead>
                                            <tr>
                                                <th>Checklist / Modelo</th>
                                                <th>Setor</th>
                                                <th>Executor</th>
                                                <th>Data / Hora</th>
                                                <th style={{ textAlign: 'center' }}>Conformidade</th>
                                                <th style={{ textAlign: 'center' }}>Status</th>
                                                <th style={{ textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklistExecutions
                                                .filter(ex => {
                                                    if (filterSector !== 'TODOS' && ex.sector !== filterSector) return false;
                                                    if (filterUser !== 'TODOS' && ex.executor !== filterUser) return false;
                                                    if (auditFilterStatus === 'Aprovado' && ex.status !== 'Aprovado') return false;
                                                    if (auditFilterStatus === 'Reprovado' && ex.status !== 'Reprovado') return false;
                                                    return true;
                                                })
                                                .map((ex) => (
                                                    <tr key={ex.id}>
                                                        <td><strong>{ex.modelName || ex.name}</strong></td>
                                                        <td><span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{ex.sector}</span></td>
                                                        <td>{ex.executor}</td>
                                                        <td>{new Date(ex.endTime).toLocaleString('pt-BR')}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: ex.status === 'Aprovado' ? '#10b981' : '#ef4444' }}>
                                                            {ex.conformity}%
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                background: ex.status === 'Aprovado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                color: ex.status === 'Aprovado' ? '#10b981' : '#ef4444',
                                                                border: `1px solid ${ex.status === 'Aprovado' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                                            }}>
                                                                {ex.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button 
                                                                className="btn-tool" 
                                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(45, 212, 191, 0.15)', borderColor: 'rgba(45, 212, 191, 0.3)', color: '#2dd4bf' }}
                                                                onClick={() => setActiveExecutionDetail(ex)}
                                                            >
                                                                Visualizar
                                                            </button>
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

                {/* TAB 8.2: PONTUAÇÃO E RANKING */}
                {activeTab === 'score_ranking' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                                Acompanhe os rankings de conformidade dos setores e a tabela de liderança de performance dos colaboradores.
                            </p>
                            <button className="btn-tool" onClick={() => setTab('menu')} style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                <ArrowLeft size={13} /> Voltar ao Menu
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                            {/* Ranking de Colaboradores */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Award size={18} style={{ color: '#eab308' }} /> Leaderboard de Colaboradores
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Ordenado pela maior média de conformidade operacional.</p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                                    {rankingData.userRanking.map((user, idx) => {
                                        const isTop3 = idx < 3;
                                        const medalColor = idx === 0 ? '#f59e0b' : (idx === 1 ? '#cbd5e1' : '#b45309');
                                        return (
                                            <div key={user.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '50%', 
                                                            background: isTop3 ? medalColor : 'rgba(255,255,255,0.08)',
                                                            color: isTop3 ? '#000' : '#fff',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem'
                                                        }}>
                                                            {idx + 1}
                                                        </span>
                                                        <span style={{ fontWeight: 'bold', color: '#fff' }}>{user.name}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 'bold', color: user.avgScore >= 80 ? '#10b981' : (user.avgScore >= 60 ? '#facc15' : '#ef4444'), fontSize: '0.95rem' }}>
                                                        {user.avgScore}%
                                                    </span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ 
                                                        width: `${user.avgScore}%`, 
                                                        height: '100%', 
                                                        background: user.avgScore >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : (user.avgScore >= 60 ? 'linear-gradient(90deg, #f59e0b, #facc15)' : 'linear-gradient(90deg, #ef4444, #f87171)'),
                                                        borderRadius: '4px' 
                                                    }}></div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                                                    <span>Performance Média</span>
                                                    <span>{user.count} checklist(s) realizado(s)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ranking de Setores */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={18} style={{ color: '#2dd4bf' }} /> Conformidade por Setor
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Média de conformidade dos checklists segmentada por setor do estabelecimento.</p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                                    {rankingData.sectorRanking.map((sector, idx) => {
                                        return (
                                            <div key={sector.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sector.name}</span>
                                                    <span style={{ fontWeight: 'bold', color: sector.avgScore >= 80 ? '#10b981' : (sector.avgScore >= 60 ? '#facc15' : '#ef4444'), fontSize: '0.95rem' }}>
                                                        {sector.avgScore}%
                                                    </span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ 
                                                        width: `${sector.avgScore}%`, 
                                                        height: '100%', 
                                                        background: sector.avgScore >= 80 ? 'linear-gradient(90deg, #2dd4bf, #0d9488)' : (sector.avgScore >= 60 ? 'linear-gradient(90deg, #f59e0b, #facc15)' : 'linear-gradient(90deg, #ef4444, #f87171)'),
                                                        borderRadius: '4px' 
                                                    }}></div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                                                    <span>Índice de Qualidade</span>
                                                    <span>{sector.count} amostra(s) de vistoria</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 8.3: DIAGRAMA DE COLABORADORES (VÍNCULOS DRAG & DROP) */}
                {activeTab === 'collaborator_diagram' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                                Defina quais colaboradores são responsáveis por executar cada checklist operando o painel de arrastar e soltar (Drag & Drop).
                            </p>
                            <button className="btn-tool" onClick={() => setTab('menu')} style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                <ArrowLeft size={13} /> Voltar ao Menu
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                            {/* Coluna Esquerda: Lista de Colaboradores */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '100px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Users size={16} style={{ color: '#2dd4bf' }} /> Colaboradores
                                </h3>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Arraste um colaborador para o checklist desejado.</span>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {appUsers.map(user => (
                                        <div 
                                            key={user.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', user.id);
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            style={{ 
                                                background: 'rgba(255,255,255,0.03)', 
                                                border: '1px solid rgba(255,255,255,0.08)', 
                                                borderRadius: '8px', 
                                                padding: '0.75rem', 
                                                cursor: 'grab', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.6rem',
                                                transition: 'all 0.2s',
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.3)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            }}
                                        >
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {user.name ? user.name.substring(0, 2).toUpperCase() : 'CO'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 'bold' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role || 'Colaborador'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Coluna Direita: Grid de Checklists (Zonas de Soltar) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {checklistModels.map(model => {
                                    const assignedIds = checklistAssignments[model.id] || [];
                                    
                                    return (
                                        <div 
                                            key={model.id}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.style.borderColor = '#2dd4bf';
                                                e.currentTarget.style.boxShadow = '0 0 12px rgba(45, 212, 191, 0.15)';
                                            }}
                                            onDragLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                            onDrop={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                const userId = e.dataTransfer.getData('text/plain');
                                                if (userId) {
                                                    handleAddAssignment(model.id, userId);
                                                }
                                            }}
                                            style={{ 
                                                background: 'rgba(30, 41, 59, 0.15)', 
                                                border: '2px dashed rgba(255,255,255,0.05)', 
                                                borderRadius: '12px', 
                                                padding: '1.25rem', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '1rem',
                                                transition: 'all 0.2s',
                                                minHeight: '200px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff', fontWeight: '800' }}>{model.name}</h4>
                                                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1', display: 'inline-block', marginTop: '0.25rem' }}>
                                                        {model.sector || 'GERAL'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ZONA DE DROP VISUAL */}
                                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', justifyContent: assignedIds.length === 0 ? 'center' : 'flex-start', alignItems: assignedIds.length === 0 ? 'center' : 'stretch', minHeight: '100px' }}>
                                                {assignedIds.length === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                                        Arraste colaboradores aqui para vinculá-los
                                                    </span>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>Colaboradores Vinculados:</span>
                                                        {assignedIds.map(userId => {
                                                            const user = appUsers.find(u => String(u.id) === String(userId));
                                                            if (!user) return null;
                                                            return (
                                                                <div 
                                                                    key={userId}
                                                                    style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'space-between', 
                                                                        background: 'rgba(45, 212, 191, 0.05)', 
                                                                        border: '1px solid rgba(45, 212, 191, 0.15)', 
                                                                        borderRadius: '6px', 
                                                                        padding: '0.35rem 0.5rem',
                                                                        color: '#cbd5e1'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2dd4bf', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.65rem' }}>
                                                                            {user.name ? user.name.substring(0, 2).toUpperCase() : 'CO'}
                                                                        </div>
                                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{user.name}</span>
                                                                    </div>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleRemoveAssignment(model.id, userId)}
                                                                        style={{ 
                                                                            background: 'transparent', 
                                                                            border: 'none', 
                                                                            color: '#ef4444', 
                                                                            cursor: 'pointer', 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            padding: '0.2rem' 
                                                                        }}
                                                                        title="Remover Colaborador"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
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
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5.5rem 1.5rem 2rem 1.5rem', overflowY: 'auto' }}>
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
                <div className="modal-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5.5rem 1.5rem 2rem 1.5rem', overflowY: 'auto' }}>
                    <div className="pin-modal-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '1.25rem', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Detalhes da Vistoria</h3>
                            <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setActiveExecutionDetail(null)}><X size={18} /></button>
                        </div>

                        <div className="modal-scrollable-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                            <div>
                                <strong>Modelo Checklist:</strong> {activeExecutionDetail.modelName}<br />
                                <strong>Setor:</strong> {activeExecutionDetail.sector}<br />
                                <strong>Executor:</strong> {activeExecutionDetail.executor}<br />
                                <strong>Data Execução:</strong> {new Date(activeExecutionDetail.endTime).toLocaleString('pt-BR')}<br />
                                <strong>Horário de Início:</strong> {activeExecutionDetail.startTime ? new Date(activeExecutionDetail.startTime).toLocaleTimeString('pt-BR') : 'N/A'}<br />
                                <strong>Horário de Término:</strong> {activeExecutionDetail.endTime ? new Date(activeExecutionDetail.endTime).toLocaleTimeString('pt-BR') : 'N/A'}<br />
                                <strong>Duração Total:</strong> {(() => {
                                    if (!activeExecutionDetail.startTime || !activeExecutionDetail.endTime) return 'N/A';
                                    const diffMs = new Date(activeExecutionDetail.endTime) - new Date(activeExecutionDetail.startTime);
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffSecs = Math.floor((diffMs % 60000) / 1000);
                                    return `${diffMins}m ${diffSecs}s`;
                                })()}<br />
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
                                            {ans.photo && ans.type !== 'antes_depois' && <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Foto: {ans.photo}</div>}
                                            {ans.type === 'antes_depois' && (
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                    {ans.photoAntes && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>ANTES (Defeitos):</span>
                                                            <img src={ans.photoAntes} style={{ width: '180px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} alt="Antes" />
                                                        </div>
                                                    )}
                                                    {ans.photoDepois && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            <span style={{ fontSize: '0.7rem', color: ans.statusDepois === '#eab308' ? '#eab308' : '#10b981', fontWeight: 'bold' }}>
                                                                DEPOIS ({ans.statusDepois === '#eab308' ? 'Pendente' : 'Resolvido'}):
                                                            </span>
                                                            <img src={ans.photoDepois} style={{ width: '180px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} alt="Depois" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {ans.comment && <div style={{ fontSize: '0.75rem', color: '#facc15' }}>Comentário: {ans.comment}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIGNATURE POPUP MODAL */}
            <div className="modal-overlay" style={{ display: isSignaturePopupOpen ? 'flex' : 'none', zIndex: 12000, alignItems: 'flex-start', justifyContent: 'center', padding: '5.5rem 1.5rem 2rem 1.5rem', overflowY: 'auto', touchAction: 'none' }}>
                <div className="pin-modal-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center', touchAction: 'none' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>ASSINATURA DIGITAL</h3>
                    <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>Use o dedo na tela touchscreen ou o mouse para assinar.</p>
                    <div style={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', padding: '10px', touchAction: 'none' }}>
                        <canvas 
                            ref={canvasRef}
                            width="520"
                            height="240"
                            style={{ 
                                background: '#04060a', 
                                border: '2px dashed rgba(255,255,255,0.1)', 
                                borderRadius: '8px',
                                cursor: 'crosshair',
                                touchAction: 'none',
                                maxWidth: '100%'
                            }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-tool" style={{ flex: 1 }} onClick={clearSignature} type="button">Limpar</button>
                        <button className="btn-tool" style={{ flex: 1, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
                            setIsSignaturePopupOpen(false);
                            setActiveSignatureItemId(null);
                        }} type="button">Cancelar</button>
                        <button className="btn-send-aviso" style={{ flex: 1 }} onClick={saveSignatureFromPopup} type="button">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            {/* ANTES E DEPOIS DRAWING MODAL */}
            {drawingImageModalOpen && activeDrawItemInfo && (
                <div className="modal-overlay" style={{ zIndex: 12000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5.5rem 1.5rem 2rem 1.5rem', overflowY: 'auto', touchAction: 'none' }}>
                    <div className="pin-modal-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center', touchAction: 'none' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>
                            {activeDrawItemInfo.type === 'antes' ? 'DESENHAR ANOMALIAS (ANTES)' : 'DESENHAR CORREÇÃO (DEPOIS)'}
                        </h3>
                        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {activeDrawItemInfo.type === 'antes' 
                                ? 'Pincel vermelho travado: marque na imagem os pontos de vazamento, sujeira ou defeitos.' 
                                : 'Escolha a cor do pincel e o status da correção para desenhar.'}
                        </p>
                        
                        {activeDrawItemInfo.type === 'depois' && (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                <button 
                                    className={`btn-badge-btn ${activeBrushColor === '#10b981' ? 'online' : ''}`}
                                    onClick={() => setActiveBrushColor('#10b981')}
                                    style={{ 
                                        padding: '0.5rem 1.25rem', 
                                        borderRadius: '8px', 
                                        background: activeBrushColor === '#10b981' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${activeBrushColor === '#10b981' ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                                        color: activeBrushColor === '#10b981' ? '#10b981' : '#94a3b8',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                    type="button"
                                >
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', marginRight: '0.5rem' }}></span>
                                    RESOLVIDO (Pincel Verde)
                                </button>
                                <button 
                                    className={`btn-badge-btn ${activeBrushColor === '#eab308' ? 'pending' : ''}`}
                                    onClick={() => setActiveBrushColor('#eab308')}
                                    style={{ 
                                        padding: '0.5rem 1.25rem', 
                                        borderRadius: '8px', 
                                        background: activeBrushColor === '#eab308' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${activeBrushColor === '#eab308' ? '#eab308' : 'rgba(255,255,255,0.08)'}`,
                                        color: activeBrushColor === '#eab308' ? '#eab308' : '#94a3b8',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                    type="button"
                                >
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#eab308', borderRadius: '50%', marginRight: '0.5rem' }}></span>
                                    PENDENTE (Pincel Amarelo)
                                </button>
                            </div>
                        )}

                        <div style={{ background: '#000', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', padding: '10px', touchAction: 'none' }}>
                            <canvas 
                                ref={drawingCanvasRef}
                                width="520"
                                height="260"
                                style={{ 
                                    background: '#04060a', 
                                    border: '2px dashed rgba(255,255,255,0.1)', 
                                    borderRadius: '8px',
                                    cursor: 'crosshair',
                                    touchAction: 'none',
                                    maxWidth: '100%'
                                }}
                                onMouseDown={startDrawingDrawing}
                                onMouseMove={drawDrawing}
                                onMouseUp={stopDrawingDrawing}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-tool" style={{ flex: 1 }} onClick={restoreBaseOutline} type="button">Restaurar Base</button>
                            <button className="btn-tool" style={{ flex: 1 }} onClick={() => {
                                if (drawingCanvasRef.current && activeDrawItemInfo) {
                                    const canvas = drawingCanvasRef.current;
                                    const ctx = canvas.getContext('2d');
                                    const { itemId, type } = activeDrawItemInfo;
                                    const ans = execAnswers[itemId] || {};
                                    const bgPhoto = type === 'antes' ? ans.bgPhotoAntes : ans.bgPhotoDepois;
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    if (bgPhoto) {
                                        const img = new Image();
                                        img.crossOrigin = "anonymous";
                                        img.onload = () => {
                                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                        };
                                        img.src = bgPhoto;
                                    }
                                }
                            }} type="button">Limpar Tudo</button>
                            <button className="btn-tool" style={{ flex: 1, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
                                setDrawingImageModalOpen(false);
                                setActiveDrawItemInfo(null);
                            }} type="button">Cancelar</button>
                            <button className="btn-send-aviso" style={{ flex: 1 }} onClick={saveDrawingFromModal} type="button">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SYSTEM CUSTOM ALERT / CONFIRM MODAL */}
            {systemAlert && (
                <div className="modal-overlay" style={{ zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}>
                    <div className="pin-modal-card" style={{ background: '#0b1329', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '16px', padding: '2rem', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            {systemAlert.type === 'success' && <CheckCircle2 size={48} style={{ color: '#10b981' }} />}
                            {systemAlert.type === 'error' && <ShieldAlert size={48} style={{ color: '#ef4444' }} />}
                            {systemAlert.type === 'warning' && <AlertTriangle size={48} style={{ color: '#facc15' }} />}
                            {systemAlert.type === 'info' && <Info size={48} style={{ color: '#06b6d4' }} />}
                        </div>
                        <h3 style={{ margin: '0 0 0.75rem 0', color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
                            {systemAlert.title}
                        </h3>
                        <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                            {systemAlert.message}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            {systemAlert.isConfirm ? (
                                <>
                                    <button 
                                        className="btn-tool" 
                                        style={{ flex: 1, padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }} 
                                        onClick={() => {
                                            if (systemAlert.onCancel) systemAlert.onCancel();
                                            setSystemAlert(null);
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        className="btn-send-aviso" 
                                        style={{ flex: 1, padding: '0.6rem 1.5rem' }} 
                                        onClick={() => {
                                            if (systemAlert.onConfirm) systemAlert.onConfirm();
                                            setSystemAlert(null);
                                        }}
                                    >
                                        Confirmar
                                    </button>
                                </>
                            ) : (
                                <button 
                                    className="btn-send-aviso" 
                                    style={{ minWidth: '120px', padding: '0.6rem 2rem' }} 
                                    onClick={() => {
                                        if (systemAlert.onConfirm) systemAlert.onConfirm();
                                        setSystemAlert(null);
                                    }}
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKLIST EXECUTION RESULT / SUCCESS REPORT MODAL */}
            {execResultModal && (
                <div className="modal-overlay" style={{ zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="pin-modal-card" style={{ 
                        background: '#0b1329', 
                        border: execResultModal.status === 'Aprovado' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', 
                        borderRadius: '20px', 
                        padding: '2.5rem 2rem', 
                        maxWidth: '480px', 
                        width: '100%', 
                        textAlign: 'center', 
                        boxShadow: execResultModal.status === 'Aprovado' 
                            ? '0 0 40px rgba(16, 185, 129, 0.15)' 
                            : '0 0 40px rgba(239, 68, 68, 0.15)',
                        animation: 'modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        
                        {/* Top Icon Badge */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '70px', 
                                height: '70px', 
                                borderRadius: '50%', 
                                background: execResultModal.status === 'Aprovado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `2px solid ${execResultModal.status === 'Aprovado' ? '#10b981' : '#ef4444'}`,
                                boxShadow: execResultModal.status === 'Aprovado' ? '0 0 20px rgba(16, 185, 129, 0.2)' : '0 0 20px rgba(239, 68, 68, 0.2)'
                            }}>
                                {execResultModal.status === 'Aprovado' ? (
                                    <CheckCircle2 size={36} style={{ color: '#10b981' }} />
                                ) : (
                                    <AlertTriangle size={36} style={{ color: '#ef4444' }} />
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <h2 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                            {execResultModal.offline ? 'Vistoria Salva Offline!' : 'Vistoria Concluída!'}
                        </h2>
                        
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.86rem', color: '#94a3b8' }}>
                            Template: <strong style={{ color: '#e2e8f0' }}>{execResultModal.name}</strong>
                        </p>

                        {/* Conformity Percentage Circle / Card */}
                        <div style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            borderRadius: '16px', 
                            padding: '1.25rem', 
                            marginBottom: '1.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Grau de Conformidade
                            </span>
                            
                            <div style={{ 
                                fontSize: '2.5rem', 
                                fontWeight: 900, 
                                color: execResultModal.status === 'Aprovado' ? '#10b981' : '#ef4444',
                                textShadow: execResultModal.status === 'Aprovado' ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(239, 68, 68, 0.3)'
                            }}>
                                {execResultModal.conformity}%
                            </div>
                            
                            <div style={{ 
                                display: 'inline-block',
                                padding: '0.3rem 1rem', 
                                borderRadius: '50px', 
                                fontSize: '0.75rem', 
                                fontWeight: 800,
                                background: execResultModal.status === 'Aprovado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: execResultModal.status === 'Aprovado' ? '#10b981' : '#ef4444',
                                border: `1px solid ${execResultModal.status === 'Aprovado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                            }}>
                                {execResultModal.status.toUpperCase()}
                            </div>
                        </div>

                        {/* Information Grid */}
                        <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                                <span style={{ color: '#64748b' }}>Sincronização:</span>
                                <span style={{ fontWeight: 600, color: execResultModal.offline ? '#facc15' : '#2dd4bf' }}>
                                    {execResultModal.offline ? 'Fila Local Offline' : 'Transmitido ao ERP'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                                <span style={{ color: '#64748b' }}>Não Conformidades:</span>
                                <span style={{ fontWeight: 600, color: execResultModal.ncCount > 0 ? '#facc15' : '#cbd5e1' }}>
                                    {execResultModal.ncCount} ocorrência(s)
                                </span>
                            </div>
                            {execResultModal.ncCount > 0 && (
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#eab308', lineHeight: '1.4' }}>
                                    ⚠️ Não conformidades geradas exigem a criação de um plano de ação na aba "Não Conformidades".
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {execResultModal.ncCount > 0 && (
                                <button 
                                    className="btn-send-aviso" 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        fontSize: '0.88rem', 
                                        background: 'rgba(234, 179, 8, 0.15)', 
                                        borderColor: '#eab308', 
                                        color: '#eab308',
                                        fontWeight: '800'
                                    }} 
                                    onClick={() => {
                                        setTab('nc');
                                        setExecResultModal(null);
                                    }}
                                >
                                    Tratar Não Conformidades
                                </button>
                            )}
                            <button 
                                className="btn-send-aviso" 
                                style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem' }} 
                                onClick={() => setExecResultModal(null)}
                            >
                                Ir para o Painel Geral
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW E IMPRESSÃO DO CARTÃO QR CODE */}
            {qrPrintModalOpen && qrPrintModel && (
                <div id="qrcode-print-area-wrapper" className="modal-overlay" style={{ zIndex: 12000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)' }}>
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            #qrcode-print-area-wrapper, #qrcode-print-area-wrapper * {
                                visibility: visible !important;
                            }
                            #qrcode-print-area-wrapper {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                height: 100% !important;
                                background: #ffffff !important;
                                display: flex !important;
                                justify-content: center !important;
                                align-items: center !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                            .no-print-btn {
                                display: none !important;
                            }
                            .print-card-box {
                                border: 3px dashed #000000 !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                                box-shadow: none !important;
                                width: 16cm !important;
                                padding: 2cm !important;
                                border-radius: 0 !important;
                                margin: auto !important;
                            }
                            .print-card-box h1, .print-card-box h2, .print-card-box h3, .print-card-box h4, .print-card-box p, .print-card-box span, .print-card-box strong {
                                color: #000000 !important;
                            }
                            .print-card-box .badge-sector-print {
                                border: 1.5px solid #000000 !important;
                                color: #000000 !important;
                                background: none !important;
                            }
                        }
                    `}} />
                    
                    <div className="print-card-box" style={{ 
                        background: '#ffffff', 
                        color: '#1e293b', 
                        padding: '3rem', 
                        borderRadius: '12px', 
                        width: '100%', 
                        maxWidth: '550px', 
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', 
                        textAlign: 'center',
                        border: '3px dashed rgba(0, 242, 254, 0.4)',
                        position: 'relative'
                    }}>
                        <div className="no-print-btn" style={{ position: 'absolute', top: '-15px', left: '20px', background: '#0f172a', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)', color: 'var(--accent-orange)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            ✂️ LINHA DE CORTE PARA FIXAÇÃO
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <img src="/logo_cubo.png?v=5" alt="Corelux Cube" style={{ width: '28px', height: '28px' }} />
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a' }}>
                                CORELUX <span style={{ color: '#f97316' }}>OS</span>
                            </span>
                        </div>
                        
                        <span className="badge-sector-print" style={{ 
                            display: 'inline-block', 
                            padding: '0.35rem 0.8rem', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold', 
                            background: '#f1f5f9', 
                            color: '#0f172a', 
                            border: '1px solid #cbd5e1',
                            marginBottom: '1rem',
                            textTransform: 'uppercase'
                        }}>
                            SETOR: {qrPrintModel.sector}
                        </span>

                        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: '1.2' }}>
                            {qrPrintModel.name}
                        </h2>
                        
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
                            Código: <strong>{qrPrintModel.code || 'CK-MOCK'}</strong> | Frequência: <strong>{qrPrintModel.frequency}</strong>
                            {qrPrintModel.startTime && qrPrintModel.endTime && (
                                <> | Janela Recomendada: <strong>{qrPrintModel.startTime} às {qrPrintModel.endTime}</strong></>
                            )}
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '?executeChecklist=' + qrPrintModel.id)}`} 
                                    alt={`QR Code ${qrPrintModel.name}`}
                                    style={{ width: '220px', height: '220px', display: 'block' }}
                                />
                            </div>
                        </div>

                        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Instruções para Execução:
                            </h4>
                            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
                                <li style={{ marginBottom: '0.25rem' }}>Escaneie este QR Code com a câmera do seu smartphone ou terminal.</li>
                                <li style={{ marginBottom: '0.25rem' }}>Realize a autenticação de login e digite seu PIN numérico.</li>
                                <li style={{ marginBottom: '0.25rem' }}>Verifique se o seu perfil possui permissão e jurisdição para o setor indicado.</li>
                                <li>Realize a vistoria respondendo às perguntas obrigatórias do checklist.</li>
                            </ol>
                        </div>
                        
                        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Fixar este cartão em local visível na área de trabalho correspondente.
                        </div>
                    </div>
                    
                    <div className="no-print-btn" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', width: '100%', maxWidth: '550px' }}>
                        <button 
                            className="btn-tool" 
                            style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}
                            onClick={() => {
                                setQrPrintModalOpen(false);
                                setQrPrintModel(null);
                            }}
                            type="button"
                        >
                            Fechar
                        </button>
                        <button 
                            className="btn-send-aviso" 
                            style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            onClick={() => window.print()}
                            type="button"
                        >
                            <Printer size={16} /> Imprimir Cartão QR
                        </button>
                    </div>
                </div>
            )}

            {/* WEBCAM CAMERA MODAL */}
            {cameraModal.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 13000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(5, 8, 16, 0.9)', backdropFilter: 'blur(10px)' }}>
                    <div className="pin-modal-card" style={{ 
                        background: '#0b1329', 
                        border: '1px solid rgba(0, 242, 254, 0.2)', 
                        borderRadius: '20px', 
                        padding: '2rem', 
                        maxWidth: '640px', 
                        width: '100%', 
                        textAlign: 'center', 
                        boxShadow: '0 0 50px rgba(0, 242, 254, 0.1)',
                        animation: 'modalSlideIn 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Camera size={18} style={{ color: '#06b6d4' }} />
                                {cameraModal.type === 'antes' ? 'Tirar Foto (Antes)' : cameraModal.type === 'depois' ? 'Tirar Foto (Depois)' : 'Tirar Foto Evidência'}
                            </h3>
                            <button 
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} 
                                onClick={closeCameraModal}
                                type="button"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Camera Stream Window */}
                        <div style={{ 
                            position: 'relative', 
                            background: '#000', 
                            borderRadius: '12px', 
                            border: '2px solid rgba(255,255,255,0.05)', 
                            overflow: 'hidden', 
                            aspectRatio: '16/9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            {cameraLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#06b6d4', position: 'absolute', zIndex: 5 }}>
                                    <RefreshCw className="spin-icon" size={36} style={{ animation: 'spin 1.5s linear infinite' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Acessando câmera do dispositivo...</span>
                                </div>
                            )}
                            
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    display: cameraLoading ? 'none' : 'block'
                                }} 
                            />
                        </div>

                        {/* Capture Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                            <button 
                                className="btn-tool" 
                                style={{ padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }} 
                                onClick={closeCameraModal}
                                type="button"
                            >
                                Cancelar
                            </button>
                            
                            <button 
                                className="btn-send-aviso" 
                                style={{ 
                                    width: '64px', 
                                    height: '64px', 
                                    borderRadius: '50%', 
                                    background: '#06b6d4', 
                                    borderColor: '#06b6d4', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: '#000',
                                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    border: 'none'
                                }} 
                                onClick={handleCapturePhoto}
                                type="button"
                                title="Tirar Foto"
                            >
                                <Camera size={28} />
                            </button>
                            
                            <div style={{ width: '92px' }}></div> {/* Spacer to balance layout */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
