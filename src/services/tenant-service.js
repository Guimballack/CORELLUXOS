/**
 * Corellux OS — Tenant Service
 * Camada central de segurança multi-tenant.
 * Gerencia empresa_id, filial_id e contexto da sessão do tenant.
 * v1.0.0
 */

import supabase from './supabase-client.js';

// =============================================
// CHAVES DE ARMAZENAMENTO LOCAL
// =============================================
const STORAGE_KEYS = {
    EMPRESA_ID:   'corellux_empresa_id',
    FILIAL_ID:    'corellux_filial_id',
    EMPRESA_DATA: 'corellux_empresa_data',
    FILIAL_DATA:  'corellux_filial_data',
    IS_MASTER:    'corellux_is_master',
    MASTER_DATA:  'corellux_master_data',
    MODULOS:      'corellux_modulos',
    // Impersonation
    ORIG_EMPRESA_ID:   'corellux_orig_empresa_id',
    ORIG_EMPRESA_DATA: 'corellux_orig_empresa_data',
    IS_IMPERSONATING:  'corellux_is_impersonating',
};

// =============================================
// GETTERS SIMPLES
// =============================================

export const getEmpresaId = () => {
    return sessionStorage.getItem(STORAGE_KEYS.EMPRESA_ID) || null;
};

export const getFilialId = () => {
    return sessionStorage.getItem(STORAGE_KEYS.FILIAL_ID) || null;
};

export const getEmpresaData = () => {
    const raw = sessionStorage.getItem(STORAGE_KEYS.EMPRESA_DATA);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export const getFilialData = () => {
    const raw = sessionStorage.getItem(STORAGE_KEYS.FILIAL_DATA);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export const isMasterSession = () => {
    return sessionStorage.getItem(STORAGE_KEYS.IS_MASTER) === 'true';
};

export const getMasterData = () => {
    const raw = sessionStorage.getItem(STORAGE_KEYS.MASTER_DATA);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export const getModulosHabilitados = () => {
    const raw = sessionStorage.getItem(STORAGE_KEYS.MODULOS);
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};

export const isImpersonating = () => {
    return sessionStorage.getItem(STORAGE_KEYS.IS_IMPERSONATING) === 'true';
};

// =============================================
// INICIALIZAÇÃO DO CONTEXTO TENANT
// =============================================

/**
 * Inicializa o contexto completo de um tenant após o login.
 * Armazena empresa, filial e módulos na sessão.
 */
export const initTenantContext = async (empresaId, filialId = null) => {
    try {
        // Carrega dados da empresa
        const { data: empresa, error: empError } = await supabase
            .from('empresas')
            .select('*, planos(*)')
            .eq('id', empresaId)
            .single();

        if (empError || !empresa) {
            console.error('[TenantService] Empresa não encontrada:', empError);
            return { success: false, error: 'Empresa não encontrada' };
        }

        // Verifica status da empresa
        if (empresa.status === 'Bloqueado') {
            return { success: false, error: 'Conta bloqueada. Entre em contato com o suporte.' };
        }
        if (empresa.status === 'Suspenso') {
            return { success: false, error: 'Conta suspensa por inadimplência. Entre em contato com o financeiro.' };
        }

        // Carrega filiais da empresa
        const { data: filiais } = await supabase
            .from('filiais')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('status', 'Ativo')
            .order('is_matriz', { ascending: false });

        // Define filial (usa a fornecida, ou a matriz, ou a primeira)
        let filialAtual = null;
        if (filialId) {
            filialAtual = filiais?.find(f => f.id === filialId) || filiais?.[0] || null;
        } else {
            filialAtual = filiais?.find(f => f.is_matriz) || filiais?.[0] || null;
        }

        // Carrega módulos habilitados
        const { data: modulosData } = await supabase
            .rpc('get_company_modules_enabled', { p_empresa_id: empresaId });

        const modulos = modulosData?.map(m => m.codigo).filter(Boolean) || [];

        // Persiste na sessão
        sessionStorage.setItem(STORAGE_KEYS.EMPRESA_ID,   empresaId);
        sessionStorage.setItem(STORAGE_KEYS.EMPRESA_DATA,  JSON.stringify(empresa));
        sessionStorage.setItem(STORAGE_KEYS.FILIAL_ID,    filialAtual?.id || '');
        sessionStorage.setItem(STORAGE_KEYS.FILIAL_DATA,  JSON.stringify(filialAtual));
        sessionStorage.setItem(STORAGE_KEYS.MODULOS,      JSON.stringify(modulos));
        sessionStorage.setItem(STORAGE_KEYS.IS_MASTER,    'false');

        // Configura o contexto no Supabase via RPC (para RLS)
        await setSupabaseTenantContext(empresaId, false);

        return {
            success: true,
            empresa,
            filial: filialAtual,
            filiais: filiais || [],
            modulos
        };
    } catch (err) {
        console.error('[TenantService] Erro ao inicializar contexto:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Inicializa o contexto de sessão Master (sem empresa_id fixo).
 */
export const initMasterContext = (masterData) => {
    sessionStorage.setItem(STORAGE_KEYS.IS_MASTER,   'true');
    sessionStorage.setItem(STORAGE_KEYS.MASTER_DATA, JSON.stringify(masterData));
    sessionStorage.removeItem(STORAGE_KEYS.EMPRESA_ID);
    sessionStorage.removeItem(STORAGE_KEYS.EMPRESA_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.FILIAL_ID);
    sessionStorage.removeItem(STORAGE_KEYS.FILIAL_DATA);
};

// =============================================
// TROCA DE FILIAL
// =============================================

export const trocarFilial = async (filialId) => {
    const empresaId = getEmpresaId();
    if (!empresaId) return { success: false, error: 'Sem empresa ativa' };

    const { data: filial, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('id', filialId)
        .eq('empresa_id', empresaId)
        .single();

    if (error || !filial) return { success: false, error: 'Filial não encontrada' };

    sessionStorage.setItem(STORAGE_KEYS.FILIAL_ID,   filialId);
    sessionStorage.setItem(STORAGE_KEYS.FILIAL_DATA, JSON.stringify(filial));

    return { success: true, filial };
};

// =============================================
// IMPERSONAÇÃO — ENTRAR COMO CLIENTE
// =============================================

/**
 * Master entra como cliente para suporte.
 * Salva sessão Master original e troca contexto para o tenant.
 */
export const entrarComoCliente = async (empresaId, motivo = '') => {
    const masterData = getMasterData();
    if (!isMasterSession() || !masterData) {
        return { success: false, error: 'Operação permitida apenas para usuários Master.' };
    }

    // Guarda dados originais da sessão Master
    sessionStorage.setItem(STORAGE_KEYS.ORIG_EMPRESA_ID,   sessionStorage.getItem(STORAGE_KEYS.EMPRESA_ID) || '');
    sessionStorage.setItem(STORAGE_KEYS.ORIG_EMPRESA_DATA, sessionStorage.getItem(STORAGE_KEYS.EMPRESA_DATA) || '');
    sessionStorage.setItem(STORAGE_KEYS.IS_IMPERSONATING, 'true');

    // Registra sessão de impersonação no banco
    const ip = await getUserIP();
    await supabase.from('impersonation_sessions').insert({
        master_usuario_id: masterData.id,
        empresa_id: empresaId,
        ip,
        motivo,
        iniciado_em: new Date().toISOString()
    });

    // Registra auditoria
    await AuditService_log({
        empresa_id: empresaId,
        usuario_nome: masterData.nome,
        usuario_tipo: 'MASTER',
        acao: 'IMPERSONATE',
        entidade: 'empresas',
        entidade_id: empresaId,
        motivo,
        ip
    });

    // Inicializa contexto do tenant
    const result = await initTenantContext(empresaId);
    if (result.success) {
        // Mantém flag is_master para exibir banner de impersonação
        sessionStorage.setItem(STORAGE_KEYS.IS_MASTER, 'true');
    }

    return result;
};

/**
 * Encerra a impersonação e retorna ao painel Master.
 */
export const sairDoCliente = async () => {
    // Fecha sessão de impersonação no banco
    const masterData = getMasterData();
    if (masterData) {
        await supabase
            .from('impersonation_sessions')
            .update({ encerrado_em: new Date().toISOString() })
            .eq('master_usuario_id', masterData.id)
            .is('encerrado_em', null);
    }

    // Limpa dados do tenant
    sessionStorage.removeItem(STORAGE_KEYS.EMPRESA_ID);
    sessionStorage.removeItem(STORAGE_KEYS.EMPRESA_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.FILIAL_ID);
    sessionStorage.removeItem(STORAGE_KEYS.FILIAL_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.MODULOS);
    sessionStorage.removeItem(STORAGE_KEYS.ORIG_EMPRESA_ID);
    sessionStorage.removeItem(STORAGE_KEYS.ORIG_EMPRESA_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.IS_IMPERSONATING);

    return { success: true };
};

// =============================================
// LIMPEZA DA SESSÃO
// =============================================

export const clearTenantContext = () => {
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
};

// =============================================
// HELPERS INTERNOS
// =============================================

/**
 * Configura o contexto da empresa no PostgreSQL para o RLS funcionar.
 */
const setSupabaseTenantContext = async (empresaId, isMaster) => {
    try {
        await supabase.rpc('set_tenant_context', {
            p_empresa_id: empresaId,
            p_is_master: isMaster
        });
    } catch (err) {
        // RPC pode não existir ainda — silencioso
        console.warn('[TenantService] set_tenant_context RPC não disponível:', err.message);
    }
};

const getUserIP = async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip || 'desconhecido';
    } catch {
        return 'desconhecido';
    }
};

// Importação circular evitada — chamada direta ao Supabase
const AuditService_log = async (payload) => {
    try {
        await supabase.from('audit_log').insert(payload);
    } catch (err) {
        console.warn('[TenantService] Falha ao registrar auditoria:', err.message);
    }
};

// =============================================
// VERIFICAÇÃO DE MÓDULO
// =============================================

/**
 * Verifica se um módulo está habilitado para a empresa atual.
 */
export const isModuloHabilitado = (codigoModulo) => {
    if (isMasterSession()) return true; // Master acessa tudo
    const modulos = getModulosHabilitados();
    return modulos.includes(codigoModulo);
};

const TenantService = {
    getEmpresaId,
    getFilialId,
    getEmpresaData,
    getFilialData,
    isMasterSession,
    getMasterData,
    getModulosHabilitados,
    isModuloHabilitado,
    isImpersonating,
    initTenantContext,
    initMasterContext,
    trocarFilial,
    entrarComoCliente,
    sairDoCliente,
    clearTenantContext,
};

export default TenantService;
