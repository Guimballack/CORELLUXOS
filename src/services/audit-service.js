/**
 * Corellux OS — Audit Service
 * Registro automático de auditoria para todas as ações do sistema.
 * v1.0.0
 */

import supabase from './supabase-client.js';
import { getEmpresaId, getMasterData, isMasterSession } from './tenant-service.js';

// Cache do IP para não buscar toda hora
let cachedIP = null;

const getIP = async () => {
    if (cachedIP) return cachedIP;
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        cachedIP = data.ip || 'desconhecido';
        return cachedIP;
    } catch {
        return 'desconhecido';
    }
};

/**
 * Registra um evento de auditoria.
 * @param {Object} params
 * @param {string} params.acao - LOGIN | LOGOUT | CREATE | UPDATE | DELETE | IMPERSONATE | ACCESS
 * @param {string} [params.entidade] - Nome da tabela ou recurso
 * @param {string} [params.entidade_id] - ID do registro afetado
 * @param {Object} [params.dados_anteriores] - Snapshot antes da alteração
 * @param {Object} [params.dados_novos] - Snapshot após a alteração
 * @param {string} [params.usuario_nome] - Sobrescreve o nome do usuário (opcional)
 * @param {string} [params.motivo] - Motivo da ação (impersonação, exclusão, etc.)
 * @param {string} [params.empresa_id_override] - Sobrescreve o empresa_id da sessão
 */
export const log = async ({
    acao,
    entidade = null,
    entidade_id = null,
    dados_anteriores = null,
    dados_novos = null,
    usuario_nome = null,
    usuario_tipo = null,
    motivo = null,
    empresa_id_override = null,
}) => {
    try {
        const ip = await getIP();
        const empresaId = empresa_id_override || getEmpresaId();
        const masterData = getMasterData();
        const isMaster = isMasterSession();

        // Tenta pegar usuário da sessão de estado global
        let sessionUser = null;
        try {
            const raw = sessionStorage.getItem('corellux_current_user');
            sessionUser = raw ? JSON.parse(raw) : null;
        } catch {}

        const payload = {
            empresa_id:     empresaId,
            usuario_id:     isMaster ? masterData?.id : (sessionUser?.id?.toString() || null),
            usuario_nome:   usuario_nome || (isMaster ? masterData?.nome : sessionUser?.name) || 'Sistema',
            usuario_tipo:   usuario_tipo || (isMaster ? 'MASTER' : (sessionUser?.access_level || 'OPERADOR')),
            acao,
            entidade,
            entidade_id:    entidade_id?.toString() || null,
            dados_anteriores: dados_anteriores ? JSON.stringify(dados_anteriores) : null,
            dados_novos:    dados_novos ? JSON.stringify(dados_novos) : null,
            ip,
            motivo,
        };

        const { error } = await supabase.from('audit_log').insert(payload);
        if (error) {
            console.warn('[AuditService] Falha ao registrar auditoria:', error.message);
        }
    } catch (err) {
        // Nunca deve travar o fluxo principal
        console.warn('[AuditService] Erro silencioso:', err.message);
    }
};

// =============================================
// HELPERS DE AÇÃO ESPECÍFICOS
// =============================================

export const logLogin = (userName, empresaId) => log({
    acao: 'LOGIN',
    entidade: 'app_users',
    usuario_nome: userName,
    empresa_id_override: empresaId,
});

export const logLogout = (userName) => log({
    acao: 'LOGOUT',
    entidade: 'app_users',
    usuario_nome: userName,
});

export const logCreate = (entidade, dados, id = null) => log({
    acao: 'CREATE',
    entidade,
    entidade_id: id,
    dados_novos: dados,
});

export const logUpdate = (entidade, id, anterior, novo) => log({
    acao: 'UPDATE',
    entidade,
    entidade_id: id,
    dados_anteriores: anterior,
    dados_novos: novo,
});

export const logDelete = (entidade, id, dados) => log({
    acao: 'DELETE',
    entidade,
    entidade_id: id,
    dados_anteriores: dados,
});

export const logImpersonate = (empresaId, empresaNome, motivo) => log({
    acao: 'IMPERSONATE',
    entidade: 'empresas',
    entidade_id: empresaId,
    dados_novos: { empresa_nome: empresaNome },
    motivo,
    empresa_id_override: empresaId,
});

export const logAccess = (entidade, entidade_id) => log({
    acao: 'ACCESS',
    entidade,
    entidade_id,
});

// =============================================
// BUSCA DE REGISTROS DE AUDITORIA
// =============================================

/**
 * Busca registros de auditoria (somente Master ou Admin).
 */
export const getAuditLogs = async ({
    empresa_id = null,
    acao = null,
    usuario_nome = null,
    entidade = null,
    data_inicio = null,
    data_fim = null,
    limit = 100,
    offset = 0,
} = {}) => {
    let query = supabase
        .from('audit_log')
        .select('*, empresas(nome_fantasia, razao_social)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (empresa_id) query = query.eq('empresa_id', empresa_id);
    if (acao)       query = query.eq('acao', acao);
    if (entidade)   query = query.eq('entidade', entidade);
    if (usuario_nome) query = query.ilike('usuario_nome', `%${usuario_nome}%`);
    if (data_inicio) query = query.gte('created_at', data_inicio);
    if (data_fim)    query = query.lte('created_at', data_fim);

    const { data, error, count } = await query;
    return { data: data || [], error, count };
};

const AuditService = {
    log,
    logLogin,
    logLogout,
    logCreate,
    logUpdate,
    logDelete,
    logImpersonate,
    logAccess,
    getAuditLogs,
};

export default AuditService;
