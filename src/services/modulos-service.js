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
        .rpc('get_company_modules_enabled', { p_empresa_id: empId });

    if (error) {
        console.error('[ModulosService] Erro ao buscar módulos:', error.message);
        return [];
    }

    return data || [];
};

/**
 * Lista todos os módulos do catálogo com flag de habilitado para uma empresa.
 */
export const getAllModulosComStatus = async (empresaId) => {
    const { data, error } = await supabase
        .rpc('get_all_modules_with_status', { p_empresa_id: empresaId });

    if (error) {
        console.error('[ModulosService] Erro ao obter módulos com status:', error.message);
        return [];
    }

    return data || [];
};

/**
 * Habilita ou desabilita um módulo para uma empresa.
 */
export const setModuloStatus = async (empresaId, moduloId, habilitado) => {
    return supabase.rpc('set_company_module_status', {
        p_empresa_id: empresaId,
        p_modulo_id: moduloId,
        p_habilitado: habilitado
    });
};

/**
 * Habilita todos os módulos de um plano para uma empresa.
 */
export const habilitarModulosPlano = async (empresaId, planoId) => {
    return supabase.rpc('set_company_modules_from_plan', {
        p_empresa_id: empresaId,
        p_plano_id: planoId
    });
};

/**
 * Verifica se módulo está habilitado (checagem server-side).
 */
export const verificarModulo = async (codigoModulo, empresaId = null) => {
    if (isMasterSession()) return true;

    const empId = empresaId || getEmpresaId();
    if (!empId) return false;

    const modulos = await getModulosEmpresa(empId);
    return modulos.some(m => m.codigo === codigoModulo);
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
