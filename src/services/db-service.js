/**
 * Corellux OS - Database Service
 * Centraliza as operações de leitura/escrita no Supabase com fallback reativo para dados locais.
 */

import { supabase } from './supabase-client';
import * as mockData from '../utils/initial-data';

// =============================================
// AUXILIARES DE TRADUÇÃO DE CAMPOS (CAMEL/SNAKE)
// =============================================

function toCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const newObj = {};
    for (const key of Object.keys(obj)) {
        const camelKey = key.replace(/([-_][a-z])/gi, ($1) => {
            return $1.toUpperCase().replace('-', '').replace('_', '');
        });
        
        // Tradução manual especial de chaves específicas se necessário
        let finalKey = camelKey;
        if (key === 'description') finalKey = 'desc';
        if (key === 'situacao') finalKey = 'situacao'; // manter
        if (key === 'sector_id') finalKey = 'sectorId';
        if (key === 'user_ids') finalKey = 'userIds';
        if (key === 'item_sku') finalKey = 'itemSku';
        if (key === 'manufacturing_date') finalKey = 'manufacturingDate';
        if (key === 'expiration_date') finalKey = 'expirationDate';

        newObj[finalKey] = toCamelCase(obj[key]);
    }
    return newObj;
}

function toSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);

    const newObj = {};
    for (const key of Object.keys(obj)) {
        let snakeKey = key;
        if (key === 'desc') snakeKey = 'description';
        else {
            snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        }
        newObj[snakeKey] = toSnakeCase(obj[key]);
    }
    return newObj;
}

// =============================================
// SERVIÇOS DE BANCO DE DADOS
// =============================================

export const DbService = {
    // 1. USUÁRIOS (APP_USERS)
    async getUsers() {
        try {
            console.log('[DbService] Carregando usuários...');
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                console.warn('[DbService] Nenhum usuário retornado do Supabase, usando dados locais.');
                return mockData.users;
            }
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar usuários no Supabase. Usando fallback local:', e.message || e);
            return mockData.users;
        }
    },

    // 2. CATEGORIAS (CATEGORIES)
    async getCategories() {
        try {
            console.log('[DbService] Carregando categorias...');
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.categories;
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar categorias. Usando fallback local:', e.message || e);
            return mockData.categories;
        }
    },

    // 3. PRODUTOS (PRODUCTS)
    async getProducts() {
        try {
            console.log('[DbService] Carregando produtos...');
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.products;
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar produtos. Usando fallback local:', e.message || e);
            return mockData.products;
        }
    },

    // 4. FORNECEDORES (SUPPLIERS)
    async getSuppliers() {
        try {
            console.log('[DbService] Carregando fornecedores...');
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('razao_social', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.suppliers;
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar fornecedores. Usando fallback local:', e.message || e);
            return mockData.suppliers;
        }
    },

    // 5. SETORES E ÁREAS
    async getSectors() {
        try {
            console.log('[DbService] Carregando setores...');
            const { data, error } = await supabase
                .from('sectors')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.sectors || [];
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar setores. Usando fallback local:', e.message || e);
            return mockData.sectors || [];
        }
    },

    async getAreas() {
        try {
            console.log('[DbService] Carregando áreas...');
            const { data, error } = await supabase
                .from('areas')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.areas || [];
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar áreas. Usando fallback local:', e.message || e);
            return mockData.areas || [];
        }
    },

    // 6. LOTES DE ESTOQUE (STOCK_BATCHES)
    async getStockBatches() {
        try {
            console.log('[DbService] Carregando lotes de estoque...');
            const { data, error } = await supabase
                .from('stock_batches')
                .select('*')
                .order('expiration_date', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return mockData.stockBatches || [];
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar lotes de estoque. Usando fallback local:', e.message || e);
            return mockData.stockBatches || [];
        }
    },

    // =============================================
    // OPERAÇÕES DE ESCRITA / MUTACIONAIS
    // =============================================

    // Exemplo: Atualizar estoque de um produto
    async updateProductStock(sku, newStock) {
        try {
            const { data, error } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('sku', sku)
                .select();

            if (error) throw error;
            return { success: true, data: toCamelCase(data) };
        } catch (e) {
            console.error(`[DbService] Erro ao atualizar estoque do produto ${sku}:`, e.message || e);
            return { success: false, error: e };
        }
    },

    // Adicionar lote
    async addStockBatch(batch) {
        try {
            const snakeBatch = toSnakeCase(batch);
            // Remove id se for nulo para auto-incremento
            if (snakeBatch.hasOwnProperty('id') && !snakeBatch.id) {
                delete snakeBatch.id;
            }
            const { data, error } = await supabase
                .from('stock_batches')
                .insert([snakeBatch])
                .select();

            if (error) throw error;
            return { success: true, data: toCamelCase(data[0]) };
        } catch (e) {
            console.error('[DbService] Erro ao adicionar lote de estoque:', e.message || e);
            return { success: false, error: e };
        }
    },

    // Remover lote
    async deleteStockBatch(id) {
        try {
            const { error } = await supabase
                .from('stock_batches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error(`[DbService] Erro ao remover lote ${id}:`, e.message || e);
            return { success: false, error: e };
        }
    }
};

export default DbService;
