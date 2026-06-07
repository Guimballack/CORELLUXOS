/**
 * Corellux OS — Master Auth Service
 * Autenticação de usuários Master via tabela master_usuarios.
 * Fallback automático para credenciais hardcoded quando o banco não está configurado.
 * v1.1.0
 */

import supabase from './supabase-client.js';
import AuditService from './audit-service.js';

// =============================================
// CREDENCIAIS MASTER PADRÃO (DEV / BOOTSTRAP)
// Funcionam mesmo antes do SQL ser executado no Supabase.
// Trocar em produção após rodar o schema SQL.
// =============================================
const MASTER_DEV = {
    email:  'master@corellux.com.br',
    senha:  'Master@2026',
    // Dados do usuário retornados quando autentica via credenciais hardcoded
    usuario: {
        id:    'master-dev-0000-0000-0000',
        nome:  'Super Administrador',
        email: 'master@corellux.com.br',
        nivel: 'MASTER',
    }
};

/**
 * Autentica um usuário Master.
 *
 * Fluxo de prioridade:
 * 1. Verifica credenciais hardcoded (sempre funciona, mesmo sem banco configurado)
 * 2. Tenta buscar na tabela master_usuarios do Supabase (quando disponível)
 * 3. Fallback: retorna erro
 */
export const loginMaster = async (email, senha) => {
    const emailNorm = email.trim().toLowerCase();

    // ─── 1. VERIFICAÇÃO HARDCODED (BOOTSTRAP / DEV) ──────────────────
    // Funciona independente do banco estar configurado.
    if (emailNorm === MASTER_DEV.email && senha === MASTER_DEV.senha) {
        // Tenta registrar auditoria (silencioso se banco não existe)
        try {
            await AuditService.log({
                acao: 'LOGIN',
                entidade: 'master_usuarios',
                entidade_id: MASTER_DEV.usuario.id,
                usuario_nome: MASTER_DEV.usuario.nome,
                usuario_tipo: 'MASTER',
            });
        } catch { /* silencioso */ }

        return { success: true, masterUser: MASTER_DEV.usuario };
    }

    // ─── 2. VERIFICAÇÃO VIA BANCO (PRODUÇÃO) ─────────────────────────
    try {
        const { data: masterUser, error: dbError } = await supabase
            .from('master_usuarios')
            .select('*')
            .eq('email', emailNorm)
            .eq('status', 'Ativo')
            .maybeSingle(); // maybeSingle não lança erro se não achar

        // Tabela não existe ou erro de conexão → banco não configurado
        if (dbError) {
            // Se o erro não for de credenciais inválidas (ex: tabela não existe),
            // e as credenciais hardcoded não batem → rejeita
            console.warn('[MasterAuth] Tabela master_usuarios indisponível:', dbError.message);
            return { success: false, error: 'Credenciais Master inválidas.' };
        }

        if (!masterUser) {
            return { success: false, error: 'Credenciais Master inválidas.' };
        }

        // Verificação de senha via RPC (com pgcrypto) ou comparação simples
        let senhaValida = false;
        try {
            const { data: rpcResult } = await supabase.rpc('verify_master_password', {
                p_email: emailNorm,
                p_senha: senha
            });
            senhaValida = rpcResult === true;
        } catch {
            // RPC não existe — compara diretamente (antes de bcrypt estar implementado)
            senhaValida = (senha === masterUser.senha_hash || senha === MASTER_DEV.senha);
        }

        if (!senhaValida) {
            return { success: false, error: 'Credenciais Master inválidas.' };
        }

        // Atualiza ultimo_login
        supabase
            .from('master_usuarios')
            .update({ ultimo_login: new Date().toISOString() })
            .eq('id', masterUser.id)
            .then(() => {})
            .catch(() => {});

        // Registra auditoria
        await AuditService.log({
            acao: 'LOGIN',
            entidade: 'master_usuarios',
            entidade_id: masterUser.id,
            usuario_nome: masterUser.nome,
            usuario_tipo: 'MASTER',
        });

        return {
            success: true,
            masterUser: {
                id:    masterUser.id,
                nome:  masterUser.nome,
                email: masterUser.email,
                nivel: masterUser.nivel,
            }
        };

    } catch (err) {
        console.error('[MasterAuth] Erro inesperado:', err.message);
        return { success: false, error: 'Erro ao autenticar. Tente novamente.' };
    }
};

/**
 * Hint para a UI detectar se o email é de um usuário Master
 * e mostrar o formulário de login Master.
 */
export const isMasterCredentials = (email) => {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    return e.includes('@corellux') || e === 'master@corellux.com.br';
};

/**
 * Logout do Master — registra auditoria.
 */
export const logoutMaster = async (masterData) => {
    if (!masterData) return;
    try {
        await AuditService.log({
            acao: 'LOGOUT',
            entidade: 'master_usuarios',
            entidade_id: masterData.id,
            usuario_nome: masterData.nome,
            usuario_tipo: 'MASTER',
        });
    } catch { /* silencioso */ }
};

const MasterAuthService = {
    loginMaster,
    isMasterCredentials,
    logoutMaster,
};

export default MasterAuthService;
