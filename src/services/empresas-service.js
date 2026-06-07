/**
 * Corellux OS — Empresas Service
 * CRUD completo de empresas/tenants para o painel Master.
 * v1.0.0
 */

import supabase from './supabase-client.js';
import AuditService from './audit-service.js';
import { habilitarModulosPlano } from './modulos-service.js';

// =============================================
// LISTAGEM E BUSCA
// =============================================

export const getEmpresas = async ({ status = null, plano_id = null, search = '', limit = 50, offset = 0 } = {}) => {
    let query = supabase
        .from('empresas')
        .select('*, planos(nome, preco_mensal)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (status)   query = query.eq('status', status);
    if (plano_id) query = query.eq('plano_id', plano_id);
    if (search)   query = query.or(`razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`);

    const { data, error, count } = await query;
    return { data: data || [], error, count };
};

export const getEmpresaById = async (id) => {
    const { data, error } = await supabase
        .from('empresas')
        .select(`
            *,
            planos(*),
            filiais(*),
            empresa_modulos(*, modulos(*)),
            cobrancas(*)
        `)
        .eq('id', id)
        .single();

    return { data, error };
};

// =============================================
// CRIAÇÃO
// =============================================

export const criarEmpresa = async (dados) => {
    const { plano_id, ...empresaDados } = dados;

    // Insere a empresa
    const { data: empresa, error } = await supabase
        .from('empresas')
        .insert({
            ...empresaDados,
            plano_id,
            status: 'Ativo',
            data_cadastro: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

    if (error) return { data: null, error };

    // Cria filial matriz automaticamente
    await supabase.from('filiais').insert({
        empresa_id: empresa.id,
        nome: 'Matriz',
        status: 'Ativo',
        is_matriz: true,
    });

    // Habilita módulos do plano contratado
    if (plano_id) {
        await habilitarModulosPlano(empresa.id, plano_id);
    }

    // Registra auditoria
    await AuditService.logCreate('empresas', dados, empresa.id);

    return { data: empresa, error: null };
};

// =============================================
// EDIÇÃO
// =============================================

export const editarEmpresa = async (id, dados) => {
    const { data: anterior } = await supabase.from('empresas').select('*').eq('id', id).single();

    const { data, error } = await supabase
        .from('empresas')
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (!error) {
        await AuditService.logUpdate('empresas', id, anterior, dados);

        // Se o plano mudou, atualiza os módulos
        if (dados.plano_id && dados.plano_id !== anterior?.plano_id) {
            await habilitarModulosPlano(id, dados.plano_id);
        }
    }

    return { data, error };
};

// =============================================
// STATUS
// =============================================

export const alterarStatusEmpresa = async (id, novoStatus, motivo = '') => {
    const { data: anterior } = await supabase.from('empresas').select('status, nome_fantasia').eq('id', id).single();

    const { data, error } = await supabase
        .from('empresas')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (!error) {
        await AuditService.log({
            acao: novoStatus === 'Ativo' ? 'REATIVAR' : (novoStatus === 'Suspenso' ? 'SUSPENDER' : 'BLOQUEAR'),
            entidade: 'empresas',
            entidade_id: id,
            dados_anteriores: { status: anterior?.status },
            dados_novos: { status: novoStatus },
            motivo,
            empresa_id_override: id,
        });
    }

    return { data, error };
};

export const suspenderEmpresa = (id, motivo) => alterarStatusEmpresa(id, 'Suspenso', motivo);
export const bloquearEmpresa  = (id, motivo) => alterarStatusEmpresa(id, 'Bloqueado', motivo);
export const ativarEmpresa    = (id, motivo) => alterarStatusEmpresa(id, 'Ativo', motivo);

// =============================================
// EXCLUSÃO
// =============================================

export const excluirEmpresa = async (id) => {
    const { data: empresa } = await supabase.from('empresas').select('*').eq('id', id).single();

    const { error } = await supabase.from('empresas').delete().eq('id', id);

    if (!error) {
        await AuditService.logDelete('empresas', id, empresa);
    }

    return { error };
};

// =============================================
// FILIAIS POR EMPRESA
// =============================================

export const getFiliais = async (empresaId) => {
    const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('is_matriz', { ascending: false });

    return { data: data || [], error };
};

export const criarFilial = async (empresaId, dados) => {
    const { data, error } = await supabase
        .from('filiais')
        .insert({ empresa_id: empresaId, ...dados, is_matriz: false })
        .select()
        .single();

    if (!error) await AuditService.logCreate('filiais', dados, data?.id);
    return { data, error };
};

export const editarFilial = async (id, dados) => {
    const { data, error } = await supabase
        .from('filiais')
        .update(dados)
        .eq('id', id)
        .select()
        .single();

    if (!error) await AuditService.logUpdate('filiais', id, null, dados);
    return { data, error };
};

// =============================================
// ESTATÍSTICAS GLOBAIS (MASTER DASHBOARD)
// =============================================

export const getEstatisticasGlobais = async () => {
    try {
        const [
            empresasRes,
            usuariosRes,
            cobrancasRes,
            planosRes,
        ] = await Promise.all([
            supabase.from('empresas').select('status, plano_id, planos(nome)', { count: 'exact' }),
            supabase.from('app_users').select('id', { count: 'exact' }),
            supabase.from('cobrancas').select('valor, status').eq('status', 'Pago').gte('vencimento', new Date().toISOString().slice(0, 7) + '-01'),
            supabase.from('planos').select('id, nome'),
        ]);

        const empresas = empresasRes.data || [];
        const totalEmpresas = empresasRes.count || 0;
        const ativas    = empresas.filter(e => e.status === 'Ativo').length;
        const suspensas = empresas.filter(e => e.status === 'Suspenso').length;
        const bloqueadas = empresas.filter(e => e.status === 'Bloqueado').length;

        const faturamentoMensal = (cobrancasRes.data || []).reduce((sum, c) => sum + (c.valor || 0), 0);
        const totalUsuarios = usuariosRes.count || 0;

        // Agrupa empresas por plano
        const planos = planosRes.data || [];
        const empresasPorPlano = planos.map(plano => ({
            plano: plano.nome,
            total: empresas.filter(e => e.plano_id === plano.id).length,
        }));

        return {
            totalEmpresas,
            ativas,
            suspensas,
            bloqueadas,
            totalUsuarios,
            faturamentoMensal,
            empresasPorPlano,
        };
    } catch (err) {
        console.error('[EmpresasService] Erro nas estatísticas:', err.message);
        return {};
    }
};

const EmpresasService = {
    getEmpresas,
    getEmpresaById,
    criarEmpresa,
    editarEmpresa,
    alterarStatusEmpresa,
    suspenderEmpresa,
    bloquearEmpresa,
    ativarEmpresa,
    excluirEmpresa,
    getFiliais,
    criarFilial,
    editarFilial,
    getEstatisticasGlobais,
};

export default EmpresasService;
