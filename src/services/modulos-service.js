/**
 * Corellux OS — Módulos Service
 * Gerencia módulos contratados por empresa.
 * v1.0.0
 */

import supabase from './supabase-client.js';
import { getEmpresaId, isMasterSession } from './tenant-service.js';

// Catálogo local de módulos (sincronizado com a tabela `modulos`)
export const MODULOS_CATALOGO = {
    estoque:     { codigo: 'estoque',    nome: 'Estoque & WMS',        icone: 'boxes',        screen: 'logistics-hub' },
    producao:    { codigo: 'producao',   nome: 'Produção',             icone: 'factory',      screen: 'subprodutos-hub' },
    pdv:         { codigo: 'pdv',        nome: 'PDV & Vendas',         icone: 'shopping-cart', screen: 'pdv-hub' },
    financeiro:  { codigo: 'financeiro', nome: 'Financeiro',           icone: 'dollar-sign',  screen: 'financeiro-hub' },
    fiscal:      { codigo: 'fiscal',     nome: 'Fiscal & NF-e',        icone: 'file-text',    screen: 'fiscal-hub' },
    checklist:   { codigo: 'checklist',  nome: 'Checklist',            icone: 'check-square', screen: 'checklist-hub' },
    patrimonio:  { codigo: 'patrimonio', nome: 'Patrimônio',           icone: 'package',      screen: 'patrimonio-hub' },
    rh:          { codigo: 'rh',         nome: 'RH & Pessoas',         icone: 'users',        screen: 'rh-hub' },
    crm:         { codigo: 'crm',        nome: 'CRM & Clientes',       icone: 'heart',        screen: 'crm-hub' },
    delivery:    { codigo: 'delivery',   nome: 'Delivery',             icone: 'truck',        screen: 'delivery-hub' },
    ged:         { codigo: 'ged',        nome: 'GED & Documentos',     icone: 'folder',       screen: 'ged-hub' },
    kpi:         { codigo: 'kpi',        nome: 'KPIs & Analytics',     icone: 'bar-chart-2',  screen: 'kpis-hub' },
    central:     { codigo: 'central',    nome: 'Central de Controle',  icone: 'layout',       screen: 'central-hub' },
};

/**
 * Busca os módulos habilitados para uma empresa.
 */
export const getModulosEmpresa = async (empresaId = null) => {
    const empId = empresaId || getEmpresaId();
    if (!empId) return [];

    const { data, error } = await supabase
        .from('empresa_modulos')
        .select('*, modulos(*)')
        .eq('empresa_id', empId)
        .eq('habilitado', true);

    if (error) {
        console.error('[ModulosService] Erro ao buscar módulos:', error.message);
        return [];
    }

    return data?.map(m => ({
        ...m.modulos,
        habilitado: true,
        data_inicio: m.data_inicio,
        data_fim: m.data_fim,
    })) || [];
};

/**
 * Lista todos os módulos do catálogo com flag de habilitado para uma empresa.
 */
export const getAllModulosComStatus = async (empresaId) => {
    const [catalogoResult, habilitadosResult] = await Promise.all([
        supabase.from('modulos').select('*').eq('status', 'Ativo').order('nome'),
        supabase.from('empresa_modulos').select('*').eq('empresa_id', empresaId)
    ]);

    const catalogo = catalogoResult.data || [];
    const habilitados = habilitadosResult.data || [];
    const habMap = Object.fromEntries(habilitados.map(h => [h.modulo_id, h]));

    return catalogo.map(mod => ({
        ...mod,
        habilitado: habMap[mod.id]?.habilitado || false,
        empresa_modulo_id: habMap[mod.id]?.id || null,
    }));
};

/**
 * Habilita ou desabilita um módulo para uma empresa.
 */
export const setModuloStatus = async (empresaId, moduloId, habilitado) => {
    const { data: existing } = await supabase
        .from('empresa_modulos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('modulo_id', moduloId)
        .maybeSingle();

    if (existing) {
        return supabase
            .from('empresa_modulos')
            .update({ habilitado })
            .eq('id', existing.id);
    } else {
        return supabase
            .from('empresa_modulos')
            .insert({ empresa_id: empresaId, modulo_id: moduloId, habilitado });
    }
};

/**
 * Habilita todos os módulos de um plano para uma empresa.
 */
export const habilitarModulosPlano = async (empresaId, planoId) => {
    const { data: plano } = await supabase
        .from('planos')
        .select('modulos_inclusos')
        .eq('id', planoId)
        .single();

    if (!plano?.modulos_inclusos) return;

    const { data: modulos } = await supabase
        .from('modulos')
        .select('id, codigo')
        .in('codigo', plano.modulos_inclusos);

    if (!modulos?.length) return;

    // Upsert de todos os módulos do plano
    const upserts = modulos.map(mod => ({
        empresa_id: empresaId,
        modulo_id: mod.id,
        habilitado: true,
    }));

    return supabase
        .from('empresa_modulos')
        .upsert(upserts, { onConflict: 'empresa_id,modulo_id' });
};

/**
 * Verifica se módulo está habilitado (checagem server-side).
 */
export const verificarModulo = async (codigoModulo, empresaId = null) => {
    if (isMasterSession()) return true;

    const empId = empresaId || getEmpresaId();
    if (!empId) return false;

    const { data } = await supabase
        .from('empresa_modulos')
        .select('habilitado')
        .eq('empresa_id', empId)
        .eq('habilitado', true)
        .maybeSingle();

    return !!data?.habilitado;
};

const ModulosService = {
    MODULOS_CATALOGO,
    getModulosEmpresa,
    getAllModulosComStatus,
    setModuloStatus,
    habilitarModulosPlano,
    verificarModulo,
};

export default ModulosService;
