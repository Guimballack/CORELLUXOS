/**
 * Corellux OS - Secure Storage Service
 * Camada de armazenamento com validação, versionamento e proteção
 * v2.5.0
 */

import CorelluxConfig, { getStorageKey, STORAGE_KEYS } from '../utils/corellux-config';

const STORAGE_PREFIX = 'corellux_';
const VERSION_KEY = STORAGE_PREFIX + 'version';
const CURRENT_VERSION = '2.5.0';

// =============================================
// 1. LEITURA SEGURA
// =============================================

export const get = (key, defaultValue = null) => {
    try {
        const storageKey = getStorageKey(key) || STORAGE_PREFIX + key;
        const raw = localStorage.getItem(storageKey);

        if (raw === null) return defaultValue;

        const parsed = JSON.parse(raw);

        // Verifica versão do schema
        if (parsed && parsed._version && parsed._version !== CURRENT_VERSION) {
            console.warn(`[CorelluxStorage] Versão diferente para ${key}: ${parsed._version} (esperado ${CURRENT_VERSION})`);
        }

        // Retorna os dados em si
        if (parsed && parsed.hasOwnProperty('data')) {
            return parsed.data;
        }

        return parsed;
    } catch (e) {
        console.error(`[CorelluxStorage] Erro ao ler "${key}":`, e);
        return defaultValue;
    }
};

// =============================================
// 2. ESCRITA SEGURA
// =============================================

export const set = (key, value) => {
    try {
        const storageKey = getStorageKey(key) || STORAGE_PREFIX + key;

        // Valida tamanho (limite do localStorage ~5MB)
        const serialized = JSON.stringify({
            _version: CURRENT_VERSION,
            _timestamp: new Date().toISOString(),
            _size: JSON.stringify(value).length,
            data: value
        });

        if (serialized.length > 4 * 1024 * 1024) { // 4MB limite de segurança
            console.error(`[CorelluxStorage] Dados muito grandes para "${key}": ${(serialized.length / 1024 / 1024).toFixed(2)}MB`);
            return false;
        }

        localStorage.setItem(storageKey, serialized);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.error('[CorelluxStorage] Armazenamento cheio. Limpando cache...');
            clearCache();
        } else {
            console.error(`[CorelluxStorage] Erro ao salvar "${key}":`, e);
        }
        return false;
    }
};

// =============================================
// 3. REMOÇÃO
// =============================================

export const remove = (key) => {
    try {
        const storageKey = getStorageKey(key) || STORAGE_PREFIX + key;
        localStorage.removeItem(storageKey);
        return true;
    } catch (e) {
        console.error(`[CorelluxStorage] Erro ao remover "${key}":`, e);
        return false;
    }
};

// =============================================
// 4. CLEAR
// =============================================

export const clear = () => {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('[CorelluxStorage] Todos os dados Corellux removidos.');
        return true;
    } catch (e) {
        console.error('[CorelluxStorage] Erro ao limpar storage:', e);
        return false;
    }
};

export const clearCache = () => {
    // Remove apenas dados de cache, mantém dados críticos
    const cacheKeys = [
        STORAGE_KEYS.FORECAST_CACHE,
        STORAGE_KEYS.AUDIT_LOG
    ];
    cacheKeys.forEach(key => remove(key));
};

// =============================================
// 5. ARRAY HELPERS
// =============================================

export const getArray = (key, defaultValue = []) => {
    const data = get(key);
    if (Array.isArray(data)) return data;
    return defaultValue;
};

export const pushToArray = (key, item) => {
    const arr = getArray(key);
    arr.push(item);
    return set(key, arr);
};

export const updateInArray = (key, id, updates) => {
    const arr = getArray(key);
    const index = arr.findIndex(item => item.id === id);
    if (index === -1) return false;
    arr[index] = { ...arr[index], ...updates };
    return set(key, arr);
};

export const removeFromArray = (key, id) => {
    const arr = getArray(key);
    const filtered = arr.filter(item => item.id !== id);
    if (filtered.length === arr.length) return false;
    return set(key, filtered);
};

export const findById = (key, id) => {
    const arr = getArray(key);
    return arr.find(item => item.id === id) || null;
};

// =============================================
// 6. MIGRAÇÃO
// =============================================

export const migrate = (fromVersion, toVersion, migrationFn) => {
    const currentVersion = localStorage.getItem(VERSION_KEY);

    if (currentVersion === toVersion) {
        console.log('[CorelluxStorage] Já está na versão mais recente.');
        return true;
    }

    console.log(`[CorelluxStorage] Migrando de ${currentVersion || 'desconhecida'} para ${toVersion}...`);

    try {
        migrationFn();
        localStorage.setItem(VERSION_KEY, toVersion);
        console.log('[CorelluxStorage] Migração concluída com sucesso.');
        return true;
    } catch (e) {
        console.error('[CorelluxStorage] Falha na migração:', e);
        return false;
    }
};

// =============================================
// 7. BACKUP E RESTORE
// =============================================

export const exportAll = () => {
    const data = {};
    const keys = Object.values(STORAGE_KEYS);

    keys.forEach(key => {
        const value = get(key);
        if (value !== null) {
            data[key] = value;
        }
    });

    return {
        version: CURRENT_VERSION,
        exportDate: new Date().toISOString(),
        data
    };
};

export const importAll = (exportData) => {
    try {
        if (!exportData || !exportData.data) {
            console.error('[CorelluxStorage] Dados de exportação inválidos.');
            return false;
        }

        for (const [key, value] of Object.entries(exportData.data)) {
            set(key, value);
        }

        console.log('[CorelluxStorage] Importação concluída.');
        return true;
    } catch (e) {
        console.error('[CorelluxStorage] Falha na importação:', e);
        return false;
    }
};

export const downloadBackup = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corellux-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

// =============================================
// 8. DIAGNÓSTICO
// =============================================

export const getUsage = () => {
    let total = 0;
    const details = {};

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            total += size;
            details[key] = size;
        }
    }

    return {
        total: total,
        totalFormatted: `${(total / 1024).toFixed(2)} KB`,
        keys: Object.keys(details).length,
        details
    };
};

export const diagnose = () => {
    const usage = getUsage();
    const keys = Object.values(STORAGE_KEYS);
    const missing = keys.filter(key => !localStorage.getItem(key));

    return {
        storageUsage: usage,
        missingKeys: missing,
        localStorageAvailable: typeof localStorage !== 'undefined',
        quotaExceeded: false
    };
};

const CorelluxStorage = {
    get,
    set,
    remove,
    clear,
    clearCache,
    getArray,
    pushToArray,
    updateInArray,
    removeFromArray,
    findById,
    migrate,
    exportAll,
    importAll,
    downloadBackup,
    getUsage,
    diagnose
};

export default CorelluxStorage;
