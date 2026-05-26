/**
 * Corellux OS - State Manager (React Edition)
 * Gerenciamento de estado centralizado com validação, segurança e hooks reativos
 * v2.5.0
 */

import { useState, useEffect } from 'react';
import CorelluxUtils from '../utils/corellux-utils';
import CorelluxConfig from '../utils/corellux-config';
import DbService from '../services/db-service';

// 1. ESTADO INICIAL PADRÃO (SINGLETON)
const DEFAULTS = {
    currentScreen: 'login',
    workstationAuthenticated: false,
    currentUser: null,
    appUsers: [],
    pin: '',
    currentCategoryType: 'entrada',
    pendingQty: 0,
    pendingProduct: null,
    pendingReason: '',
    auditLog: [],
    selectedUserIds: [],
    pendingCategoryIcon: '',
    pendingCategoryColor: '',
    pendingAttachment: null,
    solicitacaoCart: [],
    currentSkuForNumpad: null,
    notifications: [],
    estoqueViewSortField: 'name',
    estoqueViewSortOrder: 'asc',
    settingsActiveTab: 'menu',
    centralActiveTab: 'menu',
    logisticsActiveTab: 'menu',
    inventorySearch: '',

    // Checklist
    checklistModels: [],
    checklistExecutions: [],
    builderItems: [],
    builderEditId: null,
    currentChecklist: null,
    checklistLocation: null,

    // Sectors and Areas
    currentSectorId: null,

    // WMS Batches
    stockBatches: []
};

// Instância única do estado na memória
let state = CorelluxUtils.deepClone(DEFAULTS);
const listeners = new Set();
let history = [];
const MAX_HISTORY = 50;

// =============================================
// VALIDAÇÃO POR CHAVE
// =============================================
const validate = (key, value) => {
    const limits = CorelluxConfig.LIMITS;

    switch (key) {
        case 'pin':
            return typeof value === 'string' && value.length <= limits.PIN_LENGTH && /^\d*$/.test(value);

        case 'pendingQty':
            return typeof value === 'number' && value >= limits.MIN_STOCK_QUANTITY && value <= limits.MAX_STOCK_QUANTITY;

        case 'currentCategoryType':
            return ['entrada', 'saida', 'perdas', 'solicitacao'].includes(value);

        case 'currentScreen':
            return typeof value === 'string' && value.length > 0;

        case 'workstationAuthenticated':
            return typeof value === 'boolean';

        case 'currentUser':
            if (value === null) return true;
            return value && typeof value === 'object' && value.id;

        case 'selectedUserIds':
            return Array.isArray(value);

        case 'auditLog':
            return Array.isArray(value);

        case 'solicitacaoCart':
            return Array.isArray(value);

        case 'stockBatches':
            return Array.isArray(value);

        case 'estoqueViewSortField':
            return ['sku', 'name', 'brand', 'category', 'minStock', 'avgStock', 'maxStock', 'stock'].includes(value);

        case 'estoqueViewSortOrder':
            return ['asc', 'desc'].includes(value);

        default:
            return true;
    }
};

// =============================================
// MÉTODOS DE LEITURA E ESCRITA
// =============================================

export const get = (key) => {
    if (!key) return CorelluxUtils.deepClone(state);
    return CorelluxUtils.deepClone(state[key]);
};

export const getState = () => {
    return CorelluxUtils.deepClone(state);
};

export const set = (key, value) => {
    if (!key) {
        console.warn('[CorelluxState] Chave inválida para set()');
        return false;
    }

    // Salva estado anterior no histórico
    history.push({
        key,
        previous: CorelluxUtils.deepClone(state[key]),
        timestamp: new Date().toISOString()
    });

    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    // Validações
    if (!validate(key, value)) {
        console.warn(`[CorelluxState] Valor inválido para ${key}:`, value);
        return false;
    }

    state[key] = CorelluxUtils.deepClone(value);
    
    // Notifica listeners
    listeners.forEach(listener => {
        if (!listener.keys || listener.keys.includes(key) || listener.keys.includes('*')) {
            try {
                listener.callback(key, CorelluxUtils.deepClone(value));
            } catch (e) {
                console.error('[CorelluxState] Erro no listener:', e);
            }
        }
    });

    return true;
};

export const update = (updates) => {
    if (!updates || typeof updates !== 'object') return false;

    let success = true;
    for (const [key, value] of Object.entries(updates)) {
        if (!set(key, value)) {
            success = false;
        }
    }
    return success;
};

export const reset = (keys = null) => {
    if (keys && Array.isArray(keys)) {
        keys.forEach(key => {
            if (DEFAULTS.hasOwnProperty(key)) {
                set(key, DEFAULTS[key]);
            }
        });
    } else {
        state = CorelluxUtils.deepClone(DEFAULTS);
        listeners.forEach(listener => {
            try {
                listener.callback('*', CorelluxUtils.deepClone(state));
            } catch (e) {
                console.error('[CorelluxState] Erro no listener no reset:', e);
            }
        });
    }
};

export const undo = () => {
    if (history.length === 0) return false;

    const last = history.pop();
    state[last.key] = CorelluxUtils.deepClone(last.previous);
    
    listeners.forEach(listener => {
        if (!listener.keys || listener.keys.includes(last.key) || listener.keys.includes('*')) {
            listener.callback(last.key, state[last.key]);
        }
    });
    return true;
};

// =============================================
// REACT HOOK - useCorelluxState
// =============================================

export const useCorelluxState = (keys = null) => {
    // Estado local para forçar re-render no componente
    const [localState, setLocalState] = useState(() => {
        if (!keys) return getState();
        const subState = {};
        keys.forEach(k => {
            subState[k] = get(k);
        });
        return subState;
    });

    useEffect(() => {
        const handleStateChange = (changedKey, newValue) => {
            setLocalState(prev => {
                if (!keys) return getState();
                if (keys.includes(changedKey)) {
                    return { ...prev, [changedKey]: newValue };
                }
                return prev;
            });
        };

        const listener = { callback: handleStateChange, keys };
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }, [keys]);

    const setKey = (key, value) => {
        set(key, value);
    };

    const updatePartial = (updates) => {
        update(updates);
    };

    return [localState, setKey, updatePartial];
};

// Carregamento dinâmico do banco
export const loadUsers = async () => {
    const users = await DbService.getUsers();
    set('appUsers', users);
    return users;
};

// Helpers de segurança/acesso
export const getCurrentUser = () => get('currentUser');
export const isAuthenticated = () => get('workstationAuthenticated') && get('currentUser') !== null;
export const hasPermission = (permission) => {
    const user = get('currentUser');
    if (!user || !user.permissions) return false;
    return !!user.permissions[permission];
};
export const isAdmin = () => {
    const user = get('currentUser');
    return user && user.accessLevel === CorelluxConfig.ACCESS_LEVELS.ADMINISTRADOR;
};

const CorelluxState = {
    get,
    getState,
    set,
    update,
    reset,
    undo,
    useCorelluxState,
    loadUsers,
    getCurrentUser,
    isAuthenticated,
    hasPermission,
    isAdmin
};

export default CorelluxState;
