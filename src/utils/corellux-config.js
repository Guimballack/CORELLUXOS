/**
 * Corellux OS - Central Configuration
 * Constantes e configurações centralizadas da aplicação
 * v2.5.0
 */

export const VERSION = '2.5.0';
export const BUILD = '2026-05-20';

export const STORAGE_KEYS = {
    SECTORS: 'corellux_sectors',
    AREAS: 'corellux_areas',
    STOCK_BATCHES: 'corellux_stock_batches',
    TARGET_COVERAGE: 'corellux_target_coverage',
    CURRENT_USER: 'corellux_current_user',
    WORKSTATION_AUTH: 'corellux_workstation_auth',
    AUDIT_LOG: 'corellux_audit_log',
    NOTIFICATIONS: 'corellux_notifications',
    ITEM_REQUESTS: 'corellux_item_requests',
    EMPLOYEE_DOCS: 'corellux_employee_docs',
    CONSUMPTION_LOGS: 'corellux_consumption_logs',
    FORECAST_CACHE: 'corellux_forecast_cache',
    WMS_RESERVATIONS: 'corellux_wms_reservations',
    CHECKLIST_MODELS: 'corellux_checklist_models',
    CHECKLIST_EXECUTIONS: 'corellux_checklist_executions',
    SUPPLIERS: 'corellux_suppliers',
    THEME: 'corellux_theme'
};

export const PERMISSIONS = {
    // Estoque
    ENTRADA: 'entrada',
    SAIDA: 'saida',
    PERDAS: 'perdas',
    EDITAR: 'editar',
    RELATORIOS: 'relatorios',
    CONFIG: 'config',
    EXCLUIR: 'excluir',

    // Comunicação
    SEND_MSG: 'sendMsg',
    SEND_NOTIF: 'sendNotif',
    RECEIVE_NOTIF: 'receiveNotif',
    SEND_ALERT: 'sendAlert',

    // Requisições
    APPROVE_REQUESTS: 'approveRequests',
    REQUEST_ITEMS: 'requestItems',

    // Documentos
    SEND_DOCS: 'sendDocs',
    VIEW_DOCS: 'viewDocs',

    // Fornecedores
    SUPPLIER_VIEW: 'supplierView',
    SUPPLIER_CREATE: 'supplierCreate',
    SUPPLIER_EDIT: 'supplierEdit',
    SUPPLIER_BLOCK: 'supplierBlock',
    SUPPLIER_DELETE: 'supplierDelete',

    // Checklist
    CHK_CREATE: 'chkCreate',
    CHK_ANSWER: 'chkAnswer',
    CHK_APPROVE: 'chkApprove',
    CHK_REPORTS: 'chkReports'
};

export const ACCESS_LEVELS = {
    ADMINISTRADOR: 'Administrador',
    COLABORADOR: 'Colaborador'
};

export const STOCK_STATUS = {
    OUT: 'Sem Estoque',
    LOW: 'Estoque Baixo',
    OK: 'Normal',
    OVER: 'Acima do Máximo'
};

export const LIMITS = {
    MAX_NOTIFICATION_MESSAGE: 500,
    MAX_ITEM_NAME_LENGTH: 100,
    MAX_ITEM_DESC_LENGTH: 300,
    MAX_SUPPLIER_NAME_LENGTH: 150,
    MAX_NOTE_LENGTH: 1000,
    PIN_LENGTH: 4,
    MAX_STOCK_QUANTITY: 999999,
    MIN_STOCK_QUANTITY: 0,
    MAX_BATCH_LOT_LENGTH: 50,
    MAX_ADDRESS_LENGTH: 50,
    COVERAGE_DAYS_MIN: 1,
    COVERAGE_DAYS_MAX: 365
};

export const ABC_THRESHOLDS = {
    CLASS_A: 80,
    CLASS_B: 95
};

export const EXPIRY_THRESHOLDS = {
    EXPIRED: 0,
    EXPIRING_SOON_DAYS: 30,
    WARNING_DAYS: 60
};

export const SEASONALITY = {
    WEEKEND_MULTIPLIER: 1.3,
    WEEKEND_DAYS: [0, 5, 6], // Dom, Sex, Sáb
    PRE_PEAK_DAYS: [3, 4, 5] // Qua, Qui, Sex
};

export const COVERAGE = {
    DEFAULT_TARGET_DAYS: 30,
    DEFAULT_MIN_DAYS: 7,
    DEFAULT_AVG_DAYS: 15,
    DEFAULT_MAX_DAYS: 30
};

export const SUPPLIER_TYPES = [
    'Distribuidor',
    'Produtor Rural',
    'Fabricante',
    'Indústria',
    'Importador',
    'Atacadista'
];

export const PAYMENT_METHODS = [
    'Boleto Bancário',
    'Transferência Bancária',
    'PIX',
    'Cheque',
    'Cartão de Crédito',
    'Dinheiro'
];

export const PIX_KEY_TYPES = [
    'CPF',
    'CNPJ',
    'E-mail',
    'Telefone',
    'Aleatória'
];

export const DEFAULT_SECTORS = [
    { id: 1, name: 'COZINHA', icon: 'fa-fire-burner', color: 'color-orange', desc: 'Setor de produção, preparo de pratos e manipulação de alimentos.', status: 'Ativo' },
    { id: 2, name: 'SALÃO', icon: 'fa-utensils', color: 'color-teal', desc: 'Setor de atendimento ao cliente, mesas e delivery.', status: 'Ativo' },
    { id: 3, name: 'ESTOQUE', icon: 'fa-boxes-stacked', color: 'color-blue', desc: 'Setor de recebimento, armazenamento de insumos e expedição.', status: 'Ativo' },
    { id: 4, name: 'ADMINISTRAÇÃO', icon: 'fa-briefcase', color: 'color-purple', desc: 'Setor administrativo, recursos humanos e financeiro.', status: 'Ativo' }
];

export const DEFAULT_AREAS = [
    { id: 1, name: 'Grelha e Fogões', desc: 'Área de cocção quente de carnes e guarnições.', sectorId: 1, status: 'Ativo', userIds: [] },
    { id: 2, name: 'Pia e Higienização', desc: 'Área de lavagem de louças, talheres e panelas.', sectorId: 1, status: 'Ativo', userIds: [] },
    { id: 3, name: 'Preparação de Frios', desc: 'Montagem de saladas, sobremesas e porções frias.', sectorId: 1, status: 'Ativo', userIds: [] },
    { id: 4, name: 'Balcão e Copa', desc: 'Preparo de bebidas, cafés e entrega de pedidos rápidos.', sectorId: 2, status: 'Ativo', userIds: [] },
    { id: 5, name: 'Área de Mesas Interna', desc: 'Mesas do salão climatizado principal.', sectorId: 2, status: 'Ativo', userIds: [] },
    { id: 6, name: 'Área de Mesas Externa', desc: 'Mesas do terraço e calçada ao ar livre.', sectorId: 2, status: 'Ativo', userIds: [] },
    { id: 7, name: 'Câmara Resfriada', desc: 'Armazenamento refrigerado de laticínios e hortifruti.', sectorId: 3, status: 'Ativo', userIds: [] },
    { id: 8, name: 'Câmara de Congelados', desc: 'Armazenamento de proteínas congeladas.', sectorId: 3, status: 'Ativo', userIds: [] },
    { id: 9, name: 'Almoxarifado Seco', desc: 'Estoque de massas, grãos, temperos e descartáveis.', sectorId: 3, status: 'Ativo', userIds: [] },
    { id: 10, name: 'Escritório Geral', desc: 'Área de gerência, RH, compras e faturamento.', sectorId: 4, status: 'Ativo', userIds: [] }
];

export const DEFAULT_CATEGORIES = [
    { id: 1, name: 'LACTÍCIOS', icon: 'fa-cheese', color: 'color-blue', desc: 'Leite, queijo, iogurte e derivados.', status: 'Ativo' },
    { id: 2, name: 'PROTEÍNAS', icon: 'fa-drumstick-bite', color: 'color-red', desc: 'Carnes, frango, peixe e ovos.', status: 'Ativo' },
    { id: 3, name: 'HORTIFRUTTI', icon: 'fa-carrot', color: 'color-green', desc: 'Frutas, verduras e legumes.', status: 'Ativo' },
    { id: 4, name: 'BEBIDAS', icon: 'fa-wine-bottle', color: 'color-teal', desc: 'Sucos, águas, refrigerantes e afins.', status: 'Ativo' },
    { id: 5, name: 'MASSAS E FARINÁCEOS', icon: 'fa-bowl-rice', color: 'color-yellow', desc: 'Farinhas, massas, arroz e cereais.', status: 'Ativo' },
    { id: 6, name: 'MOLHOS E CONDIMENTOS', icon: 'fa-bottle-droplet', color: 'color-orange', desc: 'Molhos prontos, ketchup, mostarda.', status: 'Ativo' },
    { id: 7, name: 'TEMPEROS', icon: 'fa-pepper-hot', color: 'color-purple', desc: 'Sal, pimenta, ervas e especiarias.', status: 'Ativo' },
    { id: 8, name: 'CONGELADOS', icon: 'fa-snowflake', color: 'color-lightblue', desc: 'Produtos que necessitam de congelamento.', status: 'Ativo' },
    { id: 9, name: 'ENLATADOS E CONSERVAS', icon: 'fa-prescription-bottle', color: 'color-olive', desc: 'Latas, conservas e enlatados em geral.', status: 'Ativo' },
    { id: 10, name: 'DOCES E SOBREMESAS', icon: 'fa-ice-cream', color: 'color-pink', desc: 'Sobremesas, chocolates e doces.', status: 'Ativo' },
    { id: 11, name: 'EMBALAGENS', icon: 'fa-box', color: 'color-brown', desc: 'Caixas, sacolas e embalagens plásticas.', status: 'Ativo' },
    { id: 12, name: 'DESCARTÁVEIS', icon: 'fa-utensils', color: 'color-tealgreen', desc: 'Copos, pratos e utensílios descartáveis.', status: 'Ativo' },
    { id: 13, name: 'PRODUTOS DE LIMPEZA', icon: 'fa-spray-can', color: 'color-indigo', desc: 'Detergentes, desinfetantes e similar.', status: 'Ativo' },
    { id: 14, name: 'UTILIDADES OPERACIONAIS', icon: 'fa-gas-pump', color: 'color-blue', desc: 'Itens de uso operacional geral.', status: 'Ativo' },
    { id: 15, name: 'PADARIA E CONFEITARIA', icon: 'fa-bread-slice', color: 'color-orange', desc: 'Pães, bolos e produtos de confeitaria.', status: 'Ativo' },
    { id: 16, name: 'GRÃOS', icon: 'fa-seedling', color: 'color-green', desc: 'Feijão, lentilha, grão de bico, soja.', status: 'Ativo' },
    { id: 17, name: 'ÓLEOS E GORDURAS', icon: 'fa-oil-can', color: 'color-yellow', desc: 'Óleos vegetais, manteiga e margarina.', status: 'Ativo' },
    { id: 18, name: 'FRIOS', icon: 'fa-bacon', color: 'color-red', desc: 'Frios embutidos, presunto e salsicha.', status: 'Ativo' }
];

export const AUDIT_ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    WORKSTATION_AUTH: 'WORKSTATION_AUTH',
    ENTRADA: 'ENTRADA',
    SAIDA: 'SAIDA',
    PERDA: 'PERDA',
    ENTRADA_WMS: 'ENTRADA_WMS',
    SAIDA_WMS: 'SAIDA_WMS',
    PERDA_WMS: 'PERDA_WMS',
    CRIAR_LOTE: 'CRIAR_LOTE',
    EDITAR_LOTE: 'EDITAR_LOTE',
    EXCLUIR_LOTE: 'EXCLUIR_LOTE',
    APROVAR_ENTREGA: 'APROVAR_ENTREGA',
    APROVAR_ENTREGA_WMS: 'APROVAR_ENTREGA_WMS',
    REJEITAR_ENTREGA: 'REJEITAR_ENTREGA',
    CRIAR_ITEM: 'CRIAR_ITEM',
    EDITAR_ITEM: 'EDITAR_ITEM',
    EXCLUIR_ITEM: 'EXCLUIR_ITEM',
    CRIAR_CATEGORIA: 'CRIAR_CATEGORIA',
    EDITAR_CATEGORIA: 'EDITAR_CATEGORIA',
    CRIAR_FORNECEDOR: 'CRIAR_FORNECEDOR',
    EDITAR_FORNECEDOR: 'EDITAR_FORNECEDOR',
    BLOQUEAR_FORNECEDOR: 'BLOQUEAR_FORNECEDOR',
    DESBLOQUEAR_FORNECEDOR: 'DESBLOQUEAR_FORNECEDOR',
    ENVIAR_NOTIFICACAO: 'ENVIAR_NOTIFICACAO',
    ENVIAR_ALERTA: 'ENVIAR_ALERTA',
    ENVIAR_MENSAGEM: 'ENVIAR_MENSAGEM',
    CRIAR_CHECKLIST: 'CRIAR_CHECKLIST',
    EXECUTAR_CHECKLIST: 'EXECUTAR_CHECKLIST',
    APROVAR_CHECKLIST: 'APROVAR_CHECKLIST',
    CRIAR_SECTOR: 'CRIAR_SECTOR',
    CRIAR_AREA: 'CRIAR_AREA',
    CRIAR_EVENTO: 'CRIAR_EVENTO',
    CRIAR_RESERVA: 'CRIAR_RESERVA'
};

export const getStorageKey = (key) => {
    return STORAGE_KEYS[key] || key;
};

export const hasPermission = (user, permission) => {
    if (!user || !user.permissions) return false;
    return !!user.permissions[permission];
};

export const isAdmin = (user) => {
    return user && user.accessLevel === ACCESS_LEVELS.ADMINISTRADOR;
};

export const isWeekend = (date = new Date()) => {
    const day = date.getDay();
    return SEASONALITY.WEEKEND_DAYS.includes(day);
};

export const isPrePeak = (date = new Date()) => {
    const day = date.getDay();
    return SEASONALITY.PRE_PEAK_DAYS.includes(day);
};

const CorelluxConfig = {
    VERSION,
    BUILD,
    STORAGE_KEYS,
    PERMISSIONS,
    ACCESS_LEVELS,
    STOCK_STATUS,
    LIMITS,
    ABC_THRESHOLDS,
    EXPIRY_THRESHOLDS,
    SEASONALITY,
    COVERAGE,
    SUPPLIER_TYPES,
    PAYMENT_METHODS,
    PIX_KEY_TYPES,
    DEFAULT_SECTORS,
    DEFAULT_AREAS,
    DEFAULT_CATEGORIES,
    AUDIT_ACTIONS,
    getStorageKey,
    hasPermission,
    isAdmin,
    isWeekend,
    isPrePeak
};

export default CorelluxConfig;
