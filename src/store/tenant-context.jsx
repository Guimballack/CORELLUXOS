/**
 * Corellux OS — Tenant Context (React Context)
 * Provê dados do tenant atual para qualquer componente da árvore React.
 * v1.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TenantService from '../services/tenant-service.js';
import ModulosService from '../services/modulos-service.js';

// =============================================
// CONTEXTO
// =============================================

const TenantContext = createContext(null);

// =============================================
// PROVIDER
// =============================================

export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState({
        empresaId:           TenantService.getEmpresaId(),
        empresaData:         TenantService.getEmpresaData(),
        filialId:            TenantService.getFilialId(),
        filialData:          TenantService.getFilialData(),
        isMaster:            TenantService.isMasterSession(),
        masterData:          TenantService.getMasterData(),
        modulosHabilitados:  TenantService.getModulosHabilitados(),
        isImpersonating:     TenantService.isImpersonating(),
        loaded:              false,
    });

    // Atualiza o contexto com dados frescos do sessionStorage
    const refreshTenant = useCallback(() => {
        setTenant({
            empresaId:          TenantService.getEmpresaId(),
            empresaData:        TenantService.getEmpresaData(),
            filialId:           TenantService.getFilialId(),
            filialData:         TenantService.getFilialData(),
            isMaster:           TenantService.isMasterSession(),
            masterData:         TenantService.getMasterData(),
            modulosHabilitados: TenantService.getModulosHabilitados(),
            isImpersonating:    TenantService.isImpersonating(),
            loaded:             true,
        });
    }, []);

    // Inicialização na montagem
    useEffect(() => {
        refreshTenant();
    }, [refreshTenant]);

    /**
     * Troca a filial ativa da sessão.
     */
    const trocarFilial = useCallback(async (filialId) => {
        const result = await TenantService.trocarFilial(filialId);
        if (result.success) refreshTenant();
        return result;
    }, [refreshTenant]);

    /**
     * Inicia impersonação de empresa (somente Master).
     */
    const entrarComoCliente = useCallback(async (empresaId, motivo = '') => {
        const result = await TenantService.entrarComoCliente(empresaId, motivo);
        if (result.success) refreshTenant();
        return result;
    }, [refreshTenant]);

    /**
     * Encerra impersonação e retorna ao painel Master.
     */
    const sairDoCliente = useCallback(async () => {
        const result = await TenantService.sairDoCliente();
        if (result.success) refreshTenant();
        return result;
    }, [refreshTenant]);

    /**
     * Verifica se um módulo está habilitado (client-side, via sessionStorage).
     */
    const isModuloHabilitado = useCallback((codigoModulo) => {
        if (tenant.isMaster) return true;
        return tenant.modulosHabilitados.includes(codigoModulo);
    }, [tenant.isMaster, tenant.modulosHabilitados]);

    /**
     * Limpa todo o contexto do tenant (logout).
     */
    const clearTenant = useCallback(() => {
        TenantService.clearTenantContext();
        setTenant({
            empresaId: null,
            empresaData: null,
            filialId: null,
            filialData: null,
            isMaster: false,
            masterData: null,
            modulosHabilitados: [],
            isImpersonating: false,
            loaded: true,
        });
    }, []);

    const value = {
        ...tenant,
        refreshTenant,
        trocarFilial,
        entrarComoCliente,
        sairDoCliente,
        isModuloHabilitado,
        clearTenant,
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
}

// =============================================
// HOOK
// =============================================

/**
 * Hook para acessar o contexto do tenant em qualquer componente.
 * Uso: const { empresaData, filialData, isModuloHabilitado } = useTenant();
 */
export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('[useTenant] Deve ser usado dentro de <TenantProvider>');
    }
    return context;
};

export default TenantContext;
