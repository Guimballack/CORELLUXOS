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
        if (key === 'description') {
            newObj['desc'] = toCamelCase(obj[key]);
            newObj['description'] = toCamelCase(obj[key]);
            continue;
        }
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
        if (key === 'desc' || key === 'description') {
            newObj['description'] = toSnakeCase(obj[key]);
        }
        else {
            snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            newObj[snakeKey] = toSnakeCase(obj[key]);
        }
    }
    return newObj;
}

// =============================================
// SERVIÇOS DE BANCO DE DADOS
// =============================================

// Migração automática de local storage para o novo conjunto de dados v4 (incluindo logs realistas com anomalias induzidas)
try {
    const dbVersion = localStorage.getItem('corellux_db_version_v4');
    if (dbVersion !== 'true') {
        localStorage.removeItem('corellux_products');
        localStorage.removeItem('corellux_categories');
        localStorage.removeItem('corellux_suppliers');
        localStorage.removeItem('corellux_movement_logs');
        
        // Generate realistic historical movement logs
        const productsList = mockData.products || [];
        const initialLogs = [];
        const today = new Date();
        for (let dayOffset = 15; dayOffset >= 1; dayOffset--) {
            const logDate = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
            const dateStr = logDate.toISOString().split('T')[0];
            const dow = logDate.getDay();

            productsList.forEach(p => {
                const baseAvg = Math.max(0.5, (p.avgStock || 10) / 8);
                let qty = parseFloat((baseAvg * (0.75 + Math.random() * 0.5)).toFixed(2));
                
                // Induzir anomalias reais em dias específicos do histórico:
                // Há 3 dias atrás (offset 3), simula-se um pico massivo de consumo fora do padrão
                if (dayOffset === 3) {
                    qty = parseFloat((baseAvg * (4.2 + Math.random() * 1.5)).toFixed(2));
                }
                // Há 10 dias atrás (offset 10), simula-se outro pico para metade dos itens
                else if (dayOffset === 10 && (p.sku.charCodeAt(p.sku.length - 1) % 2 === 0)) {
                    qty = parseFloat((baseAvg * (3.8 + Math.random() * 1.2)).toFixed(2));
                }

                initialLogs.push({
                    id: 'mov_init_' + dayOffset + '_' + p.sku,
                    sku: p.sku,
                    date: dateStr,
                    qty: qty,
                    dayOfWeek: dow
                });
            });
        }
        localStorage.setItem('corellux_movement_logs', JSON.stringify(initialLogs));
        localStorage.setItem('corellux_db_version_v4', 'true');
        localStorage.setItem('corellux_db_version_v3', 'true');
        localStorage.setItem('corellux_db_version_v2', 'true');
    }
} catch (e) {
    console.warn('[DbService] Erro ao migrar localStorage:', e);
}

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
                throw new Error('Nenhum usuário retornado do Supabase');
            }
            const camelUsers = toCamelCase(data);
            const finalUsers = camelUsers.map(user => {
                if (user.permissions && user.permissions.extra) {
                    const extra = user.permissions.extra;
                    const cleanPermissions = { ...user.permissions };
                    delete cleanPermissions.extra;
                    return {
                        ...user,
                        permissions: cleanPermissions,
                        ...extra
                    };
                }
                return user;
            });

            localStorage.setItem('corellux_users', JSON.stringify(finalUsers));
            return finalUsers;
        } catch (e) {
            console.error('[DbService] Erro ao buscar usuários no Supabase. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_users');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar usuários locais:', err);
                }
            }
            localStorage.setItem('corellux_users', JSON.stringify(mockData.users));
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
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_categories');
                if (local) return JSON.parse(local);
                localStorage.setItem('corellux_categories', JSON.stringify(mockData.categories));
                return mockData.categories;
            }
            const camelCats = toCamelCase(data);
            localStorage.setItem('corellux_categories', JSON.stringify(camelCats));
            return camelCats;
        } catch (e) {
            console.error('[DbService] Erro ao buscar categorias. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_categories');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar categorias locais:', err);
                }
            }
            localStorage.setItem('corellux_categories', JSON.stringify(mockData.categories));
            return mockData.categories;
        }
    },

    // 2.5 CATEGORIAS DE PRODUTOS DE VENDA (SALE PRODUCT CATEGORIES)
    async getSaleProductCategories() {
        try {
            console.log('[DbService] Carregando categorias de produtos de venda...');
            const { data, error } = await supabase
                .from('sale_product_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_sale_categories');
                if (local) return JSON.parse(local);
                localStorage.setItem('corellux_sale_categories', JSON.stringify(mockData.saleProductCategories || []));
                return mockData.saleProductCategories || [];
            }
            const camelCats = toCamelCase(data);
            localStorage.setItem('corellux_sale_categories', JSON.stringify(camelCats));
            return camelCats;
        } catch (e) {
            console.error('[DbService] Erro ao buscar categorias de venda. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_sale_categories');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar categorias de venda locais:', err);
                }
            }
            localStorage.setItem('corellux_sale_categories', JSON.stringify(mockData.saleProductCategories || []));
            return mockData.saleProductCategories || [];
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
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_products');
                if (local) return JSON.parse(local);
                localStorage.setItem('corellux_products', JSON.stringify(mockData.products));
                return mockData.products;
            }
            const camelProds = toCamelCase(data);

            // Merge local stock values on top of Supabase data.
            // This ensures that if Supabase UPDATE failed (RLS/permissions) but we saved
            // the new stock locally, the local value takes precedence.
            const localRaw = localStorage.getItem('corellux_products');
            if (localRaw) {
                try {
                    const localList = JSON.parse(localRaw);
                    const localMap = {};
                    localList.forEach(p => { localMap[p.sku] = p.stock; });
                    camelProds.forEach(p => {
                        // If local stock > Supabase stock, local wins (means Supabase update was blocked)
                        if (localMap[p.sku] !== undefined && localMap[p.sku] !== p.stock) {
                            p.stock = localMap[p.sku];
                        }
                    });
                } catch (_) {}
            }

            localStorage.setItem('corellux_products', JSON.stringify(camelProds));
            return camelProds;
        } catch (e) {
            console.error('[DbService] Erro ao buscar produtos. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_products');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar produtos locais:', err);
                }
            }
            localStorage.setItem('corellux_products', JSON.stringify(mockData.products));
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
            if (!data || data.length === 0) {
                try {
                    console.log('[DbService] Banco de fornecedores vazio. Semeando dados padrão...');
                    const snakeSups = mockData.suppliers.map(s => toSnakeCase({ ...s }));
                    const seedRes = await supabase.from('suppliers').insert(snakeSups).select();
                    if (!seedRes.error && seedRes.data && seedRes.data.length > 0) {
                        const camelSups = toCamelCase(seedRes.data);
                        localStorage.setItem('corellux_suppliers', JSON.stringify(camelSups));
                        return camelSups;
                    }
                } catch (seedErr) {
                    console.warn('[DbService] Falha ao semear fornecedores no Supabase:', seedErr);
                }

                const local = localStorage.getItem('corellux_suppliers');
                if (local) return JSON.parse(local);
                localStorage.setItem('corellux_suppliers', JSON.stringify(mockData.suppliers));
                return mockData.suppliers;
            }
            const camelSups = toCamelCase(data);
            localStorage.setItem('corellux_suppliers', JSON.stringify(camelSups));
            return camelSups;
        } catch (e) {
            console.error('[DbService] Erro ao buscar fornecedores. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_suppliers');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar fornecedores locais:', err);
                }
            }
            localStorage.setItem('corellux_suppliers', JSON.stringify(mockData.suppliers));
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
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_sectors');
                if (local) return JSON.parse(local);
                localStorage.setItem('corellux_sectors', JSON.stringify(mockData.sectors || []));
                return mockData.sectors || [];
            }
            return toCamelCase(data);
        } catch (e) {
            console.error('[DbService] Erro ao buscar setores. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_sectors');
            if (local) return JSON.parse(local);
            localStorage.setItem('corellux_sectors', JSON.stringify(mockData.sectors || []));
            return mockData.sectors || [];
        }
    },

    async saveSector(sector) {
        try {
            const snakeSector = toSnakeCase(sector);
            let result;
            if (sector.id) {
                result = await supabase
                    .from('sectors')
                    .update(snakeSector)
                    .eq('id', sector.id)
                    .select();
            } else {
                delete snakeSector.id;
                result = await supabase
                    .from('sectors')
                    .insert([snakeSector])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_sectors');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.sectors];
                }
            } else {
                list = [...mockData.sectors];
            }
            const idx = list.findIndex(s => String(s.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_sectors', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar setor no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_sectors');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.sectors];
                }
            } else {
                list = [...mockData.sectors];
            }
            const newSector = {
                ...sector,
                id: sector.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(s => String(s.id) === String(newSector.id));
            if (idx !== -1) {
                list[idx] = newSector;
            } else {
                list.push(newSector);
            }
            localStorage.setItem('corellux_sectors', JSON.stringify(list));
            return { success: true, data: newSector };
        }
    },

    async deleteSector(id) {
        try {
            const { error } = await supabase
                .from('sectors')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_sectors');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(s => String(s.id) !== String(id));
                localStorage.setItem('corellux_sectors', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn('[DbService] Erro ao excluir setor no Supabase. Atualizando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_sectors');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(s => String(s.id) !== String(id));
                localStorage.setItem('corellux_sectors', JSON.stringify(updated));
            }
            return { success: true };
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

    async saveArea(area) {
        try {
            const snakeArea = toSnakeCase(area);
            let result;
            if (area.id) {
                result = await supabase
                    .from('areas')
                    .update(snakeArea)
                    .eq('id', area.id)
                    .select();
            } else {
                delete snakeArea.id;
                result = await supabase
                    .from('areas')
                    .insert([snakeArea])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_cargos');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.areas];
                }
            } else {
                list = [...mockData.areas];
            }
            const idx = list.findIndex(a => String(a.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_cargos', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar cargo no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_cargos');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.areas];
                }
            } else {
                list = [...mockData.areas];
            }
            const newArea = {
                ...area,
                id: area.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(a => String(a.id) === String(newArea.id));
            if (idx !== -1) {
                list[idx] = newArea;
            } else {
                list.push(newArea);
            }
            localStorage.setItem('corellux_cargos', JSON.stringify(list));
            return { success: true, data: newArea };
        }
    },

    async deleteArea(id) {
        try {
            const { error } = await supabase
                .from('areas')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_cargos');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(a => String(a.id) !== String(id));
                localStorage.setItem('corellux_cargos', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn('[DbService] Erro ao excluir cargo no Supabase. Atualizando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_cargos');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(a => String(a.id) !== String(id));
                localStorage.setItem('corellux_cargos', JSON.stringify(updated));
            }
            return { success: true };
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
            if (!data || data.length === 0) throw new Error('Sem lotes no Supabase');
            const camelData = toCamelCase(data);
            localStorage.setItem('corellux_stock_batches', JSON.stringify(camelData));
            return camelData;
        } catch (e) {
            console.error('[DbService] Erro ao buscar lotes de estoque. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_stock_batches');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao carregar lotes locais:', err);
                }
            }
            const initial = mockData.stockBatches || [];
            localStorage.setItem('corellux_stock_batches', JSON.stringify(initial));
            return initial;
        }
    },

    // =============================================
    // OPERAÇÕES DE ESCRITA / MUTACIONAIS
    // =============================================

    // Atualizar estoque de um produto
    async updateProductStock(sku, newStock) {
        // Always persist locally first so the value survives reload even if Supabase fails
        const local = localStorage.getItem('corellux_products');
        if (local) {
            try {
                const list = JSON.parse(local);
                const idx = list.findIndex(p => p.sku === sku);
                if (idx !== -1) {
                    list[idx] = { ...list[idx], stock: newStock };
                    localStorage.setItem('corellux_products', JSON.stringify(list));
                }
            } catch (err) {
                console.warn('[DbService] Erro ao persistir estoque localmente:', err);
            }
        }

        try {
            const { data, error } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('sku', sku)
                .select();

            if (error) throw error;
            return { success: true, data: toCamelCase(data) };
        } catch (e) {
            console.error(`[DbService] Erro ao atualizar estoque do produto ${sku} no Supabase (salvo localmente):`, e.message || e);
            return { success: false, error: e };
        }
    },

    // Adicionar lote
    async addStockBatch(batch) {
        try {
            const snakeBatch = toSnakeCase(batch);
            if (snakeBatch.hasOwnProperty('id') && !snakeBatch.id) {
                delete snakeBatch.id;
            }
            const { data, error } = await supabase
                .from('stock_batches')
                .insert([snakeBatch])
                .select();

            if (error) throw error;
            const added = toCamelCase(data[0]);
            
            // Sync local
            const local = localStorage.getItem('corellux_stock_batches');
            let list = local ? JSON.parse(local) : [];
            list.push(added);
            localStorage.setItem('corellux_stock_batches', JSON.stringify(list));
            
            return { success: true, data: added };
        } catch (e) {
            console.warn('[DbService] Erro ao adicionar lote no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_stock_batches');
            let list = local ? JSON.parse(local) : [];
            const newBatch = {
                ...batch,
                id: batch.id || 'lot_' + Date.now()
            };
            list.push(newBatch);
            localStorage.setItem('corellux_stock_batches', JSON.stringify(list));
            return { success: true, data: newBatch };
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
            
            // Sync local
            const local = localStorage.getItem('corellux_stock_batches');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(b => String(b.id) !== String(id));
                localStorage.setItem('corellux_stock_batches', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao remover lote ${id} no Supabase. Atualizando localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_stock_batches');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(b => String(b.id) !== String(id));
                    localStorage.setItem('corellux_stock_batches', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar locais:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // Atualizar lote
    async updateStockBatch(id, updates) {
        try {
            const snakeUpdates = toSnakeCase(updates);
            const { data, error } = await supabase
                .from('stock_batches')
                .update(snakeUpdates)
                .eq('id', id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Nenhum dado retornado na atualização');
            const updated = toCamelCase(data[0]);
            
            // Sync local
            const local = localStorage.getItem('corellux_stock_batches');
            if (local) {
                const list = JSON.parse(local);
                const idx = list.findIndex(b => String(b.id) === String(id));
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...updated };
                    localStorage.setItem('corellux_stock_batches', JSON.stringify(list));
                }
            }
            return { success: true, data: updated };
        } catch (e) {
            console.warn(`[DbService] Erro ao atualizar lote ${id} no Supabase. Gravando localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_stock_batches');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const idx = list.findIndex(b => String(b.id) === String(id));
                    if (idx !== -1) {
                        list[idx] = { ...list[idx], ...updates };
                        localStorage.setItem('corellux_stock_batches', JSON.stringify(list));
                        return { success: true, data: list[idx] };
                    }
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar localmente:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // =============================================
    // OPERAÇÕES DE ESCRITA COMPLETA (CRUD)
    // =============================================

    // USER CRUD
    async saveUser(user) {
        try {
            const dbUser = { ...user };
            const extraFields = [
                'cpf', 'rg', 'birthDate', 'gender', 'maritalStatus', 'cep', 'address',
                'department', 'contractType', 'hireDate', 'salary', 'commission', 'va', 'vt',
                'bank', 'bankAgency', 'bankAccount', 'pix', 'shift', 'workStart', 'workEnd',
                'workBreak', 'scale', 'docChecklist', 'healthSafetyChecklist', 'otherDocs'
            ];
            
            const extra = {};
            extraFields.forEach(field => {
                if (dbUser[field] !== undefined) {
                    extra[field] = dbUser[field];
                    delete dbUser[field];
                }
            });
            
            dbUser.permissions = {
                ...(dbUser.permissions || {}),
                extra: extra
            };

            const snakeUser = toSnakeCase(dbUser);
            let result;
            if (user.id) {
                result = await supabase
                    .from('app_users')
                    .update(snakeUser)
                    .eq('id', user.id)
                    .select();
            } else {
                delete snakeUser.id; // Let database auto-increment
                result = await supabase
                    .from('app_users')
                    .insert([snakeUser])
                    .select();
            }
            if (result.error) throw result.error;
            if (!result.data || result.data.length === 0) {
                throw new Error('Usuário não encontrado no banco de dados');
            }
            
            const savedUser = toCamelCase(result.data[0]);
            const finalUser = savedUser.permissions && savedUser.permissions.extra ? {
                ...savedUser,
                permissions: (() => {
                    const cp = { ...savedUser.permissions };
                    delete cp.extra;
                    return cp;
                })(),
                ...savedUser.permissions.extra
            } : savedUser;

            // Sync local
            const local = localStorage.getItem('corellux_users');
            if (local) {
                const list = JSON.parse(local);
                const idx = list.findIndex(u => String(u.id) === String(finalUser.id));
                if (idx !== -1) {
                    list[idx] = finalUser;
                } else {
                    list.push(finalUser);
                }
                localStorage.setItem('corellux_users', JSON.stringify(list));
            }

            return { success: true, data: finalUser };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar usuário no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_users');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.users];
                }
            } else {
                list = [...mockData.users];
            }

            const newUser = {
                ...user,
                id: user.id || Date.now() + Math.floor(Math.random() * 1000)
            };

            const idx = list.findIndex(u => String(u.id) === String(newUser.id));
            if (idx !== -1) {
                list[idx] = newUser;
            } else {
                list.push(newUser);
            }
            localStorage.setItem('corellux_users', JSON.stringify(list));
            return { success: true, data: newUser };
        }
    },

    async deleteUser(id) {
        try {
            const { error } = await supabase
                .from('app_users')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_users');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(u => String(u.id) !== String(id));
                localStorage.setItem('corellux_users', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar usuário ${id} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_users');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(u => String(u.id) !== String(id));
                    localStorage.setItem('corellux_users', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // PRODUCT CRUD
    async saveProduct(product, oldSku = null) {
        try {
            const snakeProduct = toSnakeCase(product);
            let result;
            if (oldSku) {
                result = await supabase
                    .from('products')
                    .update(snakeProduct)
                    .eq('sku', oldSku)
                    .select();
            } else {
                result = await supabase
                    .from('products')
                    .insert([snakeProduct])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_products');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.products];
                }
            } else {
                list = [...mockData.products];
            }
            const idx = list.findIndex(p => p.sku === (oldSku || product.sku));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_products', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar produto no Supabase. Gravando localmente:', e.message || e);
            // Fallback storage:
            const local = localStorage.getItem('corellux_products');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.products];
                }
            } else {
                list = [...mockData.products];
            }
            const idx = list.findIndex(p => p.sku === (oldSku || product.sku));
            if (idx !== -1) {
                list[idx] = product;
            } else {
                list.push(product);
            }
            localStorage.setItem('corellux_products', JSON.stringify(list));
            return { success: true, data: product };
        }
    },

    async deleteProduct(sku) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('sku', sku);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_products');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(p => p.sku !== sku);
                localStorage.setItem('corellux_products', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar produto ${sku} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_products');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(p => p.sku !== sku);
                    localStorage.setItem('corellux_products', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // SALE PRODUCT CRUD (PRODUTOS FINAIS DE VENDA)
    async getSaleProducts() {
        try {
            console.log('[DbService] Carregando produtos de venda...');
            const { data, error } = await supabase
                .from('sale_products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_sale_products');
                if (local) return JSON.parse(local);
                const initialSales = [
                    { code: 'PIZ001', name: 'Pizza Calabresa G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, calabresa fatiada, cebola e orégano.', price: 49.90, unit: 'UN', status: 'Ativo', controlaProducao: true, recipe: [{ ingredientSku: 'LAC-005', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'HOR-003', quantity: 0.1, unit: 'KG' }] },
                    { code: 'PIZ002', name: 'Pizza Margherita G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, rodelas de tomate fresco, manjericão e azeite.', price: 45.00, unit: 'UN', status: 'Ativo', controlaProducao: true, recipe: [{ ingredientSku: 'LAC-005', quantity: 0.3, unit: 'KG' }, { ingredientSku: 'HOR-004', quantity: 0.15, unit: 'KG' }] },
                    { code: 'BEB001', name: 'Refrigerante Lata 350ml', category: 'BEBIDAS', description: 'Refrigerante lata gelado (diversos sabores).', price: 6.00, unit: 'UN', status: 'Ativo', controlaProducao: false, recipe: [] }
                ];
                localStorage.setItem('corellux_sale_products', JSON.stringify(initialSales));
                return initialSales;
            }
            const camelProds = toCamelCase(data);
            localStorage.setItem('corellux_sale_products', JSON.stringify(camelProds));
            return camelProds;
        } catch (e) {
            console.error('[DbService] Erro ao buscar produtos de venda. Usando fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_sale_products');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar produtos de venda locais:', err);
                }
            }
            const initialSales = [
                { code: 'PIZ001', name: 'Pizza Calabresa G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, calabresa fatiada, cebola e orégano.', price: 49.90, unit: 'UN', status: 'Ativo', controlaProducao: true, recipe: [{ ingredientSku: 'LAC-005', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'HOR-003', quantity: 0.1, unit: 'KG' }] },
                { code: 'PIZ002', name: 'Pizza Margherita G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, rodelas de tomate fresco, manjericão e azeite.', price: 45.00, unit: 'UN', status: 'Ativo', controlaProducao: true, recipe: [{ ingredientSku: 'LAC-005', quantity: 0.3, unit: 'KG' }, { ingredientSku: 'HOR-004', quantity: 0.15, unit: 'KG' }] },
                { code: 'BEB001', name: 'Refrigerante Lata 350ml', category: 'BEBIDAS', description: 'Refrigerante lata gelado (diversos sabores).', price: 6.00, unit: 'UN', status: 'Ativo', controlaProducao: false, recipe: [] }
            ];
            localStorage.setItem('corellux_sale_products', JSON.stringify(initialSales));
            return initialSales;
        }
    },

    async saveSaleProduct(product, oldCode = null) {
        try {
            const snakeProduct = toSnakeCase(product);
            let result;
            if (oldCode) {
                result = await supabase
                    .from('sale_products')
                    .update(snakeProduct)
                    .eq('code', oldCode)
                    .select();
            } else {
                result = await supabase
                    .from('sale_products')
                    .insert([snakeProduct])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_sale_products');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [];
                }
            }
            const idx = list.findIndex(p => p.code === (oldCode || product.code));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_sale_products', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar produto de venda no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_sale_products');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [];
                }
            }
            const idx = list.findIndex(p => p.code === (oldCode || product.code));
            if (idx !== -1) {
                list[idx] = product;
            } else {
                list.push(product);
            }
            localStorage.setItem('corellux_sale_products', JSON.stringify(list));
            return { success: true, data: product };
        }
    },

    async deleteSaleProduct(code) {
        try {
            const { error } = await supabase
                .from('sale_products')
                .delete()
                .eq('code', code);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_sale_products');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(p => p.code !== code);
                localStorage.setItem('corellux_sale_products', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar produto de venda ${code} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_sale_products');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(p => p.code !== code);
                    localStorage.setItem('corellux_sale_products', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // CATEGORY CRUD
    async saveCategory(category) {
        try {
            const snakeCategory = toSnakeCase(category);
            let result;
            if (category.id) {
                result = await supabase
                    .from('categories')
                    .update(snakeCategory)
                    .eq('id', category.id)
                    .select();
            } else {
                delete snakeCategory.id;
                result = await supabase
                    .from('categories')
                    .insert([snakeCategory])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_categories');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.categories];
                }
            } else {
                list = [...mockData.categories];
            }
            const idx = list.findIndex(c => String(c.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_categories', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar categoria no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_categories');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.categories];
                }
            } else {
                list = [...mockData.categories];
            }
            const newCat = {
                ...category,
                id: category.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(c => String(c.id) === String(newCat.id));
            if (idx !== -1) {
                list[idx] = newCat;
            } else {
                list.push(newCat);
            }
            localStorage.setItem('corellux_categories', JSON.stringify(list));
            return { success: true, data: newCat };
        }
    },

    async deleteCategory(id) {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_categories');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(c => String(c.id) !== String(id));
                localStorage.setItem('corellux_categories', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar categoria ${id} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_categories');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(c => String(c.id) !== String(id));
                    localStorage.setItem('corellux_categories', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    async saveSaleProductCategory(category) {
        try {
            const snakeCategory = toSnakeCase(category);
            let result;
            if (category.id) {
                result = await supabase
                    .from('sale_product_categories')
                    .update(snakeCategory)
                    .eq('id', category.id)
                    .select();
            } else {
                delete snakeCategory.id;
                result = await supabase
                    .from('sale_product_categories')
                    .insert([snakeCategory])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_sale_categories');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...(mockData.saleProductCategories || [])];
                }
            } else {
                list = [...(mockData.saleProductCategories || [])];
            }
            const idx = list.findIndex(c => String(c.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_sale_categories', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar categoria de venda no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_sale_categories');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...(mockData.saleProductCategories || [])];
                }
            } else {
                list = [...(mockData.saleProductCategories || [])];
            }
            const newCat = {
                ...category,
                id: category.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(c => String(c.id) === String(newCat.id));
            if (idx !== -1) {
                list[idx] = newCat;
            } else {
                list.push(newCat);
            }
            localStorage.setItem('corellux_sale_categories', JSON.stringify(list));
            return { success: true, data: newCat };
        }
    },

    async deleteSaleProductCategory(id) {
        try {
            const { error } = await supabase
                .from('sale_product_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_sale_categories');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(c => String(c.id) !== String(id));
                localStorage.setItem('corellux_sale_categories', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar categoria de venda ${id} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_sale_categories');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(c => String(c.id) !== String(id));
                    localStorage.setItem('corellux_sale_categories', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // SUPPLIER CRUD
    async saveSupplier(supplier) {
        try {
            const snakeSupplier = toSnakeCase(supplier);
            let result;
            if (supplier.id) {
                result = await supabase
                    .from('suppliers')
                    .update(snakeSupplier)
                    .eq('id', supplier.id)
                    .select();
            } else {
                delete snakeSupplier.id;
                result = await supabase
                    .from('suppliers')
                    .insert([snakeSupplier])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local on success
            const local = localStorage.getItem('corellux_suppliers');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.suppliers];
                }
            } else {
                list = [...mockData.suppliers];
            }
            const idx = list.findIndex(s => String(s.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_suppliers', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar fornecedor no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_suppliers');
            let list = [];
            if (local) {
                try {
                    list = JSON.parse(local);
                } catch (err) {
                    list = [...mockData.suppliers];
                }
            } else {
                list = [...mockData.suppliers];
            }
            const newSup = {
                ...supplier,
                id: supplier.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(s => String(s.id) === String(newSup.id));
            if (idx !== -1) {
                list[idx] = newSup;
            } else {
                list.push(newSup);
            }
            localStorage.setItem('corellux_suppliers', JSON.stringify(list));
            return { success: true, data: newSup };
        }
    },

    async deleteSupplier(id) {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_suppliers');
            if (local) {
                const list = JSON.parse(local);
                const updated = list.filter(s => String(s.id) !== String(id));
                localStorage.setItem('corellux_suppliers', JSON.stringify(updated));
            }
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar fornecedor ${id} no Supabase. Removendo localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_suppliers');
            if (local) {
                try {
                    const list = JSON.parse(local);
                    const updated = list.filter(s => String(s.id) !== String(id));
                    localStorage.setItem('corellux_suppliers', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // =============================================
    // SISTEMA DE NOTIFICAÇÕES (AVISOS)
    // =============================================
    async getNotifications() {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar notificações no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_notifications');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar notificações locais:', err);
                }
            }
            // Retorna dados padrão mockados
            const defaultNotifications = [
                {
                    id: 1,
                    type: 'sistema',
                    title: 'BEM-VINDO AO NOVO CORELLUX OS',
                    message: 'A migração para React + Vite e a integração com Supabase foram concluídas com sucesso. Explore o novo design e funcionalidades!',
                    priority: 'normal',
                    sender: 'Sistema',
                    senderRole: 'Núcleo',
                    targetSector: 'Todos',
                    targetUsers: null,
                    readBy: {},
                    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 horas atrás
                    read: false
                },
                {
                    id: 2,
                    type: 'sistema',
                    title: 'ATUALIZAÇÃO DE BANCO DE DADOS',
                    message: 'O backup completo do sistema foi finalizado e os logs de auditoria foram sincronizados.',
                    priority: 'normal',
                    sender: 'Sistema',
                    senderRole: 'Serviço',
                    targetSector: 'Todos',
                    targetUsers: null,
                    readBy: {},
                    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 horas atrás
                    read: false
                }
            ];
            localStorage.setItem('corellux_notifications', JSON.stringify(defaultNotifications));
            return defaultNotifications;
        }
    },

    async saveNotification(notification) {
        try {
            const snakeNotif = toSnakeCase(notification);
            if (snakeNotif.id && typeof snakeNotif.id === 'number' && snakeNotif.id > 1000000) {
                delete snakeNotif.id;
            }
            const { data, error } = await supabase
                .from('notifications')
                .insert([snakeNotif])
                .select();
            if (error) throw error;
            return { success: true, data: toCamelCase(data[0]) };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar notificação no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_notifications');
            let notifs = [];
            if (local) {
                try {
                    notifs = JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao carregar locais:', err);
                }
            }
            const newNotif = {
                ...notification,
                id: notification.id || Date.now() + Math.floor(Math.random() * 1000),
                timestamp: notification.timestamp || new Date().toISOString(),
                readBy: notification.readBy || {}
            };
            notifs.unshift(newNotif);
            localStorage.setItem('corellux_notifications', JSON.stringify(notifs));
            return { success: true, data: newNotif };
        }
    },

    async markNotificationRead(id, userId) {
        try {
            const { data: fetchNotif, error: fetchErr } = await supabase
                .from('notifications')
                .select('read_by')
                .eq('id', id)
                .single();
            if (fetchErr) throw fetchErr;

            const readBy = fetchNotif.read_by || {};
            readBy[userId] = new Date().toISOString();

            const { data, error } = await supabase
                .from('notifications')
                .update({ read_by: readBy, read: true })
                .eq('id', id)
                .select();
            if (error) throw error;
            return { success: true, data: toCamelCase(data[0]) };
        } catch (e) {
            console.warn(`[DbService] Erro ao marcar como lida no Supabase (ID: ${id}). Gravando localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_notifications');
            if (local) {
                try {
                    const notifs = JSON.parse(local);
                    const idx = notifs.findIndex(n => n.id === id);
                    if (idx !== -1) {
                        const notif = notifs[idx];
                        if (!notif.readBy) notif.readBy = {};
                        notif.readBy[userId] = new Date().toISOString();
                        notif.read = true;
                        localStorage.setItem('corellux_notifications', JSON.stringify(notifs));
                        return { success: true, data: notif };
                    }
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar local:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    // =============================================
    // SISTEMA DE CHECKLISTS OPERACIONAIS
    // =============================================
    async getChecklistModels() {
        try {
            const { data, error } = await supabase
                .from('checklist_models')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar modelos de checklist no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_models');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar modelos locais:', err);
                }
            }
            // Modelos padrão mockados para início
            const defaultModels = [
                {
                    id: 'mod_1',
                    name: 'VISTORIA DIÁRIA DA COZINHA',
                    sector: 'COZINHA',
                    frequency: 'Diário',
                    status: 'Ativo',
                    items: [
                        { id: 'item_1', type: 'sim_nao', label: 'Todos os fogões estão desligados e limpos?', required: true, conditionalPhoto: true, conditionalObs: true },
                        { id: 'item_2', type: 'sim_nao', label: 'Temperatura da câmara de congelados está abaixo de -18°C?', required: true, conditionalPhoto: false, conditionalObs: true },
                        { id: 'item_3', type: 'checkbox', label: 'Retirada e descarte de lixo orgânico realizado.', required: true },
                        { id: 'item_4', type: 'observacao', label: 'Observações gerais do turno da cozinha.', required: false }
                    ],
                    lastModified: new Date().toLocaleString('pt-BR')
                },
                {
                    id: 'mod_2',
                    name: 'FECHAMENTO DO SALÃO',
                    sector: 'SALÃO',
                    frequency: 'Diário',
                    status: 'Ativo',
                    items: [
                        { id: 'item_5', type: 'sim_nao', label: 'Ar condicionado e luzes desligadas?', required: true, conditionalPhoto: false, conditionalObs: false },
                        { id: 'item_6', type: 'sim_nao', label: 'Maquininhas de cartão limpas e na base de carregamento?', required: true, conditionalPhoto: false, conditionalObs: true },
                        { id: 'item_7', type: 'checkbox', label: 'Mesas higienizadas e cadeiras organizadas.', required: true }
                    ],
                    lastModified: new Date().toLocaleString('pt-BR')
                }
            ];
            localStorage.setItem('corellux_checklist_models', JSON.stringify(defaultModels));
            return defaultModels;
        }
    },

    async saveChecklistModel(model) {
        try {
            const snakeModel = toSnakeCase(model);
            let result;
            if (model.id && typeof model.id === 'string' && !model.id.startsWith('mod_')) {
                result = await supabase
                    .from('checklist_models')
                    .update(snakeModel)
                    .eq('id', model.id)
                    .select();
            } else {
                if (typeof model.id === 'string' && model.id.startsWith('mod_')) {
                    delete snakeModel.id;
                }
                result = await supabase
                    .from('checklist_models')
                    .insert([snakeModel])
                    .select();
            }
            if (result.error) throw result.error;
            return { success: true, data: toCamelCase(result.data[0]) };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar modelo de checklist no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_models');
            let models = [];
            if (local) {
                try {
                    models = JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao carregar modelos:', err);
                }
            }
            
            const newModel = {
                ...model,
                id: model.id || 'mod_' + Date.now(),
                lastModified: new Date().toLocaleString('pt-BR')
            };

            const idx = models.findIndex(m => String(m.id) === String(newModel.id));
            if (idx !== -1) {
                models[idx] = newModel;
            } else {
                models.push(newModel);
            }

            localStorage.setItem('corellux_checklist_models', JSON.stringify(models));
            return { success: true, data: newModel };
        }
    },

    async deleteChecklistModel(id) {
        try {
            const { error } = await supabase
                .from('checklist_models')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] Erro ao deletar modelo de checklist ${id} no Supabase. Atualizando localmente:`, e.message || e);
            const local = localStorage.getItem('corellux_checklist_models');
            if (local) {
                try {
                    const models = JSON.parse(local);
                    const updated = models.filter(m => String(m.id) !== String(id));
                    localStorage.setItem('corellux_checklist_models', JSON.stringify(updated));
                    return { success: true };
                } catch (err) {
                    console.error('[DbService] Erro ao atualizar locais:', err);
                }
            }
            return { success: false, error: e };
        }
    },

    async getChecklistExecutions() {
        try {
            const { data, error } = await supabase
                .from('checklist_executions')
                .select('*')
                .order('end_time', { ascending: false });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar execuções de checklist no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_executions');
            if (local) {
                try {
                    return JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao analisar execuções locais:', err);
                }
            }
            return [];
        }
    },

    // ─── APP SETTINGS (chave → valor global) ────────────────────────────────
    // Tabela no Supabase:
    //   CREATE TABLE app_settings (
    //     key   TEXT PRIMARY KEY,
    //     value JSONB NOT NULL DEFAULT '{}'::jsonb,
    //     updated_at TIMESTAMPTZ DEFAULT now()
    //   );
    //   ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
    //   CREATE POLICY "Allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

    async getSetting(key, defaultValue = null) {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', key)
                .maybeSingle();

            if (error) throw error;
            if (data) return data.value;
            return defaultValue;
        } catch (e) {
            console.warn(`[DbService] getSetting(${key}) falhou, usando localStorage:`, e.message || e);
            const local = localStorage.getItem(`corellux_setting_${key}`);
            if (local !== null) {
                try { return JSON.parse(local); } catch { return local; }
            }
            return defaultValue;
        }
    },

    async setSetting(key, value) {
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

            if (error) throw error;
            // espelho local para acesso offline imediato
            localStorage.setItem(`corellux_setting_${key}`, JSON.stringify(value));
            // limpa flag de sync pendente se existia
            localStorage.removeItem(`corellux_setting_${key}_pending_sync`);
            return { success: true };
        } catch (e) {
            console.warn(`[DbService] setSetting(${key}) falhou, salvando apenas localmente:`, e.message || e);
            localStorage.setItem(`corellux_setting_${key}`, JSON.stringify(value));
            // marca como pendente de sincronização para quando a internet retornar
            localStorage.setItem(`corellux_setting_${key}_pending_sync`, JSON.stringify(value));
            return { success: false, error: e };
        }
    },

    async saveChecklistExecution(execution) {
        try {
            const snakeExec = toSnakeCase(execution);
            if (snakeExec.id && typeof snakeExec.id === 'string' && snakeExec.id.startsWith('exec_')) {
                delete snakeExec.id;
            }
            const { data, error } = await supabase
                .from('checklist_executions')
                .insert([snakeExec])
                .select();
            if (error) throw error;
            const saved = toCamelCase(data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_checklist_executions');
            let list = local ? JSON.parse(local) : [];
            list.push(saved);
            localStorage.setItem('corellux_checklist_executions', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar execução de checklist no Supabase. Gravando localmente:', e.message || e);
            const saved = { ...execution, id: execution.id || 'exec_' + Date.now() };
            const local = localStorage.getItem('corellux_checklist_executions');
            let list = local ? JSON.parse(local) : [];
            list.push(saved);
            localStorage.setItem('corellux_checklist_executions', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getChecklistNonConformities() {
        try {
            const { data, error } = await supabase
                .from('checklist_non_conformities')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar não conformidades no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_non_conformities');
            return local ? JSON.parse(local) : [];
        }
    },

    async saveChecklistNonConformity(nc) {
        try {
            const snakeNc = toSnakeCase(nc);
            let result;
            if (nc.id && !String(nc.id).startsWith('nc_')) {
                result = await supabase
                    .from('checklist_non_conformities')
                    .update(snakeNc)
                    .eq('id', nc.id)
                    .select();
            } else {
                delete snakeNc.id;
                result = await supabase
                    .from('checklist_non_conformities')
                    .insert([snakeNc])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_checklist_non_conformities');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(item => String(item.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.unshift(saved);
            }
            localStorage.setItem('corellux_checklist_non_conformities', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar não conformidade no Supabase. Gravando localmente:', e.message || e);
            const saved = { ...nc, id: nc.id || 'nc_' + Date.now() };
            const local = localStorage.getItem('corellux_checklist_non_conformities');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(item => String(item.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.unshift(saved);
            }
            localStorage.setItem('corellux_checklist_non_conformities', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getChecklistActionPlans() {
        try {
            const { data, error } = await supabase
                .from('checklist_action_plans')
                .select('*')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar planos de ação no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_action_plans');
            return local ? JSON.parse(local) : [];
        }
    },

    async saveChecklistActionPlan(plan) {
        try {
            const snakePlan = toSnakeCase(plan);
            let result;
            if (plan.id && !String(plan.id).startsWith('plan_')) {
                result = await supabase
                    .from('checklist_action_plans')
                    .update(snakePlan)
                    .eq('id', plan.id)
                    .select();
            } else {
                delete snakePlan.id;
                result = await supabase
                    .from('checklist_action_plans')
                    .insert([snakePlan])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_checklist_action_plans');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(item => String(item.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_checklist_action_plans', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar plano de ação no Supabase. Gravando localmente:', e.message || e);
            const saved = { ...plan, id: plan.id || 'plan_' + Date.now() };
            const local = localStorage.getItem('corellux_checklist_action_plans');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(item => String(item.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_checklist_action_plans', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getChecklistAuditLogs() {
        try {
            const { data, error } = await supabase
                .from('checklist_audit_logs')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar logs de auditoria no Supabase. Usando localStorage:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_audit_logs');
            return local ? JSON.parse(local) : [];
        }
    },

    async saveChecklistAuditLog(auditLog) {
        try {
            const snakeLog = toSnakeCase(auditLog);
            if (snakeLog.id && typeof snakeLog.id === 'string' && snakeLog.id.startsWith('log_')) {
                delete snakeLog.id;
            }
            const { data, error } = await supabase
                .from('checklist_audit_logs')
                .insert([snakeLog])
                .select();
            if (error) throw error;
            const saved = toCamelCase(data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_checklist_audit_logs');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_checklist_audit_logs', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar log de auditoria no Supabase. Gravando localmente:', e.message || e);
            const saved = { ...auditLog, id: auditLog.id || 'log_' + Date.now() };
            const local = localStorage.getItem('corellux_checklist_audit_logs');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_checklist_audit_logs', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    // =============================================
    // WMS: ARMAZÉNS, ZONAS E ENDEREÇAMENTOS
    // =============================================

    async getWmsWarehouses() {
        try {
            const { data, error } = await supabase
                .from('wms_warehouses')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_wms_warehouses');
                if (local) return JSON.parse(local);
                const defaultW = [
                    { id: 1, name: 'Armazém Central', acronym: 'AC', description: 'Centro de distribuição e estoque principal de insumos.', status: 'Ativo' }
                ];
                localStorage.setItem('corellux_wms_warehouses', JSON.stringify(defaultW));
                return defaultW;
            }
            const camelWarehouses = toCamelCase(data);
            localStorage.setItem('corellux_wms_warehouses', JSON.stringify(camelWarehouses));
            return camelWarehouses;
        } catch (e) {
            console.warn('[DbService] Erro ao carregar armazéns no Supabase. Fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_warehouses');
            if (local) return JSON.parse(local);
            const defaultW = [
                { id: 1, name: 'Armazém Central', acronym: 'AC', description: 'Centro de distribuição e estoque principal de insumos.', status: 'Ativo' }
            ];
            localStorage.setItem('corellux_wms_warehouses', JSON.stringify(defaultW));
            return defaultW;
        }
    },

    async saveWmsWarehouse(warehouse) {
        try {
            const snakeWarehouse = toSnakeCase(warehouse);
            let result;
            if (warehouse.id && typeof warehouse.id === 'number') {
                result = await supabase
                    .from('wms_warehouses')
                    .update(snakeWarehouse)
                    .eq('id', warehouse.id)
                    .select();
            } else {
                delete snakeWarehouse.id;
                result = await supabase
                    .from('wms_warehouses')
                    .insert([snakeWarehouse])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_wms_warehouses');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(w => String(w.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_wms_warehouses', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar armazém no Supabase. Gravando local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_warehouses');
            let list = local ? JSON.parse(local) : [];
            const newW = {
                ...warehouse,
                id: warehouse.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(w => String(w.id) === String(newW.id));
            if (idx !== -1) {
                list[idx] = newW;
            } else {
                list.push(newW);
            }
            localStorage.setItem('corellux_wms_warehouses', JSON.stringify(list));
            return { success: true, data: newW };
        }
    },

    async deleteWmsWarehouse(id) {
        try {
            const { error } = await supabase
                .from('wms_warehouses')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local (cascade zones/locations locally)
            const localW = localStorage.getItem('corellux_wms_warehouses');
            if (localW) {
                const list = JSON.parse(localW).filter(w => String(w.id) !== String(id));
                localStorage.setItem('corellux_wms_warehouses', JSON.stringify(list));
            }
            const localZ = localStorage.getItem('corellux_wms_zones');
            if (localZ) {
                const zones = JSON.parse(localZ);
                const deletedZoneIds = zones.filter(z => String(z.warehouseId) === String(id)).map(z => z.id);
                const remainingZones = zones.filter(z => String(z.warehouseId) !== String(id));
                localStorage.setItem('corellux_wms_zones', JSON.stringify(remainingZones));

                const localLoc = localStorage.getItem('corellux_wms_locations');
                if (localLoc) {
                    const locations = JSON.parse(localLoc);
                    const remainingLocations = locations.filter(l => !deletedZoneIds.includes(l.zoneId));
                    localStorage.setItem('corellux_wms_locations', JSON.stringify(remainingLocations));
                }
            }
            return { success: true };
        } catch (e) {
            console.warn('[DbService] Erro ao excluir armazém no Supabase. Atualizando local:', e.message || e);
            const localW = localStorage.getItem('corellux_wms_warehouses');
            if (localW) {
                const list = JSON.parse(localW).filter(w => String(w.id) !== String(id));
                localStorage.setItem('corellux_wms_warehouses', JSON.stringify(list));
            }
            // Cascade locally
            const localZ = localStorage.getItem('corellux_wms_zones');
            if (localZ) {
                const zones = JSON.parse(localZ);
                const deletedZoneIds = zones.filter(z => String(z.warehouseId) === String(id)).map(z => z.id);
                const remainingZones = zones.filter(z => String(z.warehouseId) !== String(id));
                localStorage.setItem('corellux_wms_zones', JSON.stringify(remainingZones));

                const localLoc = localStorage.getItem('corellux_wms_locations');
                if (localLoc) {
                    const locations = JSON.parse(localLoc);
                    const remainingLocations = locations.filter(l => !deletedZoneIds.includes(l.zoneId));
                    localStorage.setItem('corellux_wms_locations', JSON.stringify(remainingLocations));
                }
            }
            return { success: true };
        }
    },

    async getWmsZones(warehouseId = null) {
        try {
            let query = supabase.from('wms_zones').select('*');
            if (warehouseId) {
                query = query.eq('warehouse_id', warehouseId);
            }
            const { data, error } = await query.order('name', { ascending: true });
            if (error) throw error;

            const defaultZones = [
                { id: 1, warehouseId: 1, name: 'CFA', acronymDescription: 'Câmara Fria A', type: 'Resfriado', description: 'Armazenamento de laticínios e verduras.', status: 'Ativo', tempMin: 2, tempMax: 8, isAmbient: false, ambientType: null, volumeCubicoPadrao: 0 },
                { id: 2, warehouseId: 1, name: 'CFB', acronymDescription: 'Câmara Fria B', type: 'Congelado', description: 'Armazenamento de carnes e congelados.', status: 'Ativo', tempMin: -18, tempMax: -10, isAmbient: false, ambientType: null, volumeCubicoPadrao: 0 },
                { id: 3, warehouseId: 1, name: 'ESA', acronymDescription: 'Estoque Seco A', type: 'Seco', description: 'Armazenamento de massas, grãos e enlatados.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada', volumeCubicoPadrao: 0 },
                { id: 4, warehouseId: 1, name: 'ESB', acronymDescription: 'Estoque Seco B', type: 'Seco', description: 'Armazenamento de temperos e embalagens.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada', volumeCubicoPadrao: 0 }
            ];

            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_wms_zones');
                if (local) {
                    const list = JSON.parse(local);
                    return warehouseId ? list.filter(z => String(z.warehouseId) === String(warehouseId)) : list;
                }
                localStorage.setItem('corellux_wms_zones', JSON.stringify(defaultZones));
                return warehouseId ? defaultZones.filter(z => String(z.warehouseId) === String(warehouseId)) : defaultZones;
            }
            const camelZones = toCamelCase(data);
            
            // Sync with local Storage
            const local = localStorage.getItem('corellux_wms_zones');
            let list = local ? JSON.parse(local) : [];
            // Merge results
            camelZones.forEach(z => {
                const idx = list.findIndex(lz => String(lz.id) === String(z.id));
                if (idx !== -1) list[idx] = z;
                else list.push(z);
            });
            localStorage.setItem('corellux_wms_zones', JSON.stringify(list));

            return camelZones;
        } catch (e) {
            console.warn('[DbService] Erro ao carregar zonas no Supabase. Fallback local:', e.message || e);
            const defaultZones = [
                { id: 1, warehouseId: 1, name: 'CFA', acronymDescription: 'Câmara Fria A', type: 'Resfriado', description: 'Armazenamento de laticínios e verduras.', status: 'Ativo', tempMin: 2, tempMax: 8, isAmbient: false, ambientType: null, volumeCubicoPadrao: 0 },
                { id: 2, warehouseId: 1, name: 'CFB', acronymDescription: 'Câmara Fria B', type: 'Congelado', description: 'Armazenamento de carnes e congelados.', status: 'Ativo', tempMin: -18, tempMax: -10, isAmbient: false, ambientType: null, volumeCubicoPadrao: 0 },
                { id: 3, warehouseId: 1, name: 'ESA', acronymDescription: 'Estoque Seco A', type: 'Seco', description: 'Armazenamento de massas, grãos e enlatados.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada', volumeCubicoPadrao: 0 },
                { id: 4, warehouseId: 1, name: 'ESB', acronymDescription: 'Estoque Seco B', type: 'Seco', description: 'Armazenamento de temperos e embalagens.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada', volumeCubicoPadrao: 0 }
            ];
            const local = localStorage.getItem('corellux_wms_zones');
            if (local) {
                const list = JSON.parse(local);
                return warehouseId ? list.filter(z => String(z.warehouseId) === String(warehouseId)) : list;
            }
            localStorage.setItem('corellux_wms_zones', JSON.stringify(defaultZones));
            return warehouseId ? defaultZones.filter(z => String(z.warehouseId) === String(warehouseId)) : defaultZones;
        }
    },

    async saveWmsZone(zone) {
        try {
            const snakeZone = toSnakeCase(zone);
            let result;
            if (zone.id && typeof zone.id === 'number') {
                result = await supabase
                    .from('wms_zones')
                    .update(snakeZone)
                    .eq('id', zone.id)
                    .select();
            } else {
                delete snakeZone.id;
                result = await supabase
                    .from('wms_zones')
                    .insert([snakeZone])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_wms_zones');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(z => String(z.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_wms_zones', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar zona no Supabase. Gravando local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_zones');
            let list = local ? JSON.parse(local) : [];
            const newZ = {
                ...zone,
                id: zone.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(z => String(z.id) === String(newZ.id));
            if (idx !== -1) {
                list[idx] = newZ;
            } else {
                list.push(newZ);
            }
            localStorage.setItem('corellux_wms_zones', JSON.stringify(list));
            return { success: true, data: newZ };
        }
    },

    async deleteWmsZone(id) {
        try {
            const { error } = await supabase
                .from('wms_zones')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const localZ = localStorage.getItem('corellux_wms_zones');
            if (localZ) {
                const list = JSON.parse(localZ).filter(z => String(z.id) !== String(id));
                localStorage.setItem('corellux_wms_zones', JSON.stringify(list));
            }
            const localLoc = localStorage.getItem('corellux_wms_locations');
            if (localLoc) {
                const locations = JSON.parse(localLoc).filter(l => String(l.zoneId) !== String(id));
                localStorage.setItem('corellux_wms_locations', JSON.stringify(locations));
            }
            return { success: true };
        } catch (e) {
            console.warn('[DbService] Erro ao excluir zona no Supabase. Atualizando local:', e.message || e);
            const localZ = localStorage.getItem('corellux_wms_zones');
            if (localZ) {
                const list = JSON.parse(localZ).filter(z => String(z.id) !== String(id));
                localStorage.setItem('corellux_wms_zones', JSON.stringify(list));
            }
            const localLoc = localStorage.getItem('corellux_wms_locations');
            if (localLoc) {
                const locations = JSON.parse(localLoc).filter(l => String(l.zoneId) !== String(id));
                localStorage.setItem('corellux_wms_locations', JSON.stringify(locations));
            }
            return { success: true };
        }
    },

    async getWmsLocations(zoneId = null) {
        try {
            let query = supabase.from('wms_locations').select('*');
            if (zoneId) {
                query = query.eq('zone_id', zoneId);
            }
            const { data, error } = await query
                .order('aisle', { ascending: true })
                .order('row', { ascending: true })
                .order('shelf', { ascending: true });
            if (error) throw error;

            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_wms_locations');
                if (local) {
                    const list = JSON.parse(local);
                    return zoneId ? list.filter(l => String(l.zoneId) === String(zoneId)) : list;
                }
                return [];
            }
            const camelLocations = toCamelCase(data);

            // Sync with local storage
            const local = localStorage.getItem('corellux_wms_locations');
            let list = local ? JSON.parse(local) : [];
            // Merge
            camelLocations.forEach(l => {
                const idx = list.findIndex(ll => String(ll.id) === String(l.id));
                if (idx !== -1) list[idx] = l;
                else list.push(l);
            });
            localStorage.setItem('corellux_wms_locations', JSON.stringify(list));

            return camelLocations;
        } catch (e) {
            console.warn('[DbService] Erro ao carregar locais no Supabase. Fallback local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_locations');
            if (local) {
                const list = JSON.parse(local);
                return zoneId ? list.filter(l => String(l.zoneId) === String(zoneId)) : list;
            }
            return [];
        }
    },

    async saveWmsLocation(location) {
        try {
            const snakeLoc = toSnakeCase(location);
            let result;
            if (location.id && typeof location.id === 'number') {
                result = await supabase
                    .from('wms_locations')
                    .update(snakeLoc)
                    .eq('id', location.id)
                    .select();
            } else {
                delete snakeLoc.id;
                result = await supabase
                    .from('wms_locations')
                    .insert([snakeLoc])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_wms_locations');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(l => String(l.id) === String(saved.id));
            if (idx !== -1) {
                list[idx] = saved;
            } else {
                list.push(saved);
            }
            localStorage.setItem('corellux_wms_locations', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar endereço WMS no Supabase. Gravando local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_locations');
            let list = local ? JSON.parse(local) : [];
            const newLoc = {
                ...location,
                id: location.id || Date.now() + Math.floor(Math.random() * 1000)
            };
            const idx = list.findIndex(l => String(l.id) === String(newLoc.id));
            if (idx !== -1) {
                list[idx] = newLoc;
            } else {
                list.push(newLoc);
            }
            localStorage.setItem('corellux_wms_locations', JSON.stringify(list));
            return { success: true, data: newLoc };
        }
    },

    async deleteWmsLocation(id) {
        try {
            const { error } = await supabase
                .from('wms_locations')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // Sync local
            const local = localStorage.getItem('corellux_wms_locations');
            if (local) {
                const list = JSON.parse(local).filter(l => String(l.id) !== String(id));
                localStorage.setItem('corellux_wms_locations', JSON.stringify(list));
            }
            return { success: true };
        } catch (e) {
            console.warn('[DbService] Erro ao excluir endereço no Supabase. Atualizando local:', e.message || e);
            const local = localStorage.getItem('corellux_wms_locations');
            if (local) {
                const list = JSON.parse(local).filter(l => String(l.id) !== String(id));
                localStorage.setItem('corellux_wms_locations', JSON.stringify(list));
            }
            return { success: true };
        }
    },

    async saveWmsLocationsBatch(zoneId, locations) {
        try {
            // Primeiro exclui todos os endereços existentes daquela zona para reiniciar a configuração
            const { error: deleteError } = await supabase
                .from('wms_locations')
                .delete()
                .eq('zone_id', zoneId);
            if (deleteError) throw deleteError;

            const snakeLocations = locations.map(l => toSnakeCase({ ...l, zoneId }));
            const { data, error } = await supabase
                .from('wms_locations')
                .insert(snakeLocations)
                .select();
            if (error) throw error;
            const savedList = toCamelCase(data);

            const local = localStorage.getItem('corellux_wms_locations');
            let list = local ? JSON.parse(local) : [];
            const filteredList = list.filter(l => String(l.zoneId) !== String(zoneId));
            filteredList.push(...savedList);
            localStorage.setItem('corellux_wms_locations', JSON.stringify(filteredList));
            return { success: true, data: savedList };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar endereços em lote no Supabase. Gravando localmente:', e.message || e);
            const savedList = locations.map(l => ({
                ...l,
                zoneId,
                id: l.id || Date.now() + Math.floor(Math.random() * 10000)
            }));
            const local = localStorage.getItem('corellux_wms_locations');
            let list = local ? JSON.parse(local) : [];
            const filteredList = list.filter(l => String(l.zoneId) !== String(zoneId));
            filteredList.push(...savedList);
            localStorage.setItem('corellux_wms_locations', JSON.stringify(filteredList));
            return { success: true, data: savedList };
        }
    },

    // ====================================================
    // MÓDULO DE PATRIMÔNIO E MATERIAIS OPERACIONAIS
    // ====================================================

    async getPatrimonyCategories() {
        try {
            console.log('[DbService] Carregando categorias de patrimônio...');
            const { data, error } = await supabase
                .from('patrimonio_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_categories');
                if (local) return JSON.parse(local);
                
                const defaults = [
                    { id: 1, name: 'Utensílios', icon: 'fa-utensils', color: 'color-teal', status: 'Ativo' },
                    { id: 2, name: 'Equipamentos', icon: 'fa-tools', color: 'color-orange', status: 'Ativo' },
                    { id: 3, name: 'Móveis', icon: 'fa-couch', color: 'color-purple', status: 'Ativo' },
                    { id: 4, name: 'Tecnologia', icon: 'fa-laptop', color: 'color-blue', status: 'Ativo' },
                    { id: 5, name: 'Uniformes', icon: 'fa-tshirt', color: 'color-green', status: 'Ativo' },
                    { id: 6, name: 'Ferramentas', icon: 'fa-wrench', color: 'color-red', status: 'Ativo' }
                ];
                localStorage.setItem('corellux_patrimony_categories', JSON.stringify(defaults));
                return defaults;
            }
            const camelData = toCamelCase(data);
            localStorage.setItem('corellux_patrimony_categories', JSON.stringify(camelData));
            return camelData;
        } catch (e) {
            console.error('[DbService] Erro ao carregar categorias de patrimônio. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_categories');
            if (local) return JSON.parse(local);
            
            const defaults = [
                { id: 1, name: 'Utensílios', icon: 'fa-utensils', color: 'color-teal', status: 'Ativo' },
                { id: 2, name: 'Equipamentos', icon: 'fa-tools', color: 'color-orange', status: 'Ativo' },
                { id: 3, name: 'Móveis', icon: 'fa-couch', color: 'color-purple', status: 'Ativo' },
                { id: 4, name: 'Tecnologia', icon: 'fa-laptop', color: 'color-blue', status: 'Ativo' },
                { id: 5, name: 'Uniformes', icon: 'fa-tshirt', color: 'color-green', status: 'Ativo' },
                { id: 6, name: 'Ferramentas', icon: 'fa-wrench', color: 'color-red', status: 'Ativo' }
            ];
            localStorage.setItem('corellux_patrimony_categories', JSON.stringify(defaults));
            return defaults;
        }
    },

    async savePatrimonyCategory(category) {
        try {
            const snakeObj = toSnakeCase(category);
            let result;
            if (category.id && typeof category.id !== 'string') {
                result = await supabase
                    .from('patrimonio_categories')
                    .update(snakeObj)
                    .eq('id', category.id)
                    .select();
            } else {
                delete snakeObj.id;
                result = await supabase
                    .from('patrimonio_categories')
                    .insert([snakeObj])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_categories');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(c => String(c.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_categories', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar categoria de patrimônio no Supabase. Salvando localmente:', e);
            const saved = { ...category, id: category.id || 'cat_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_categories');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(c => String(c.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_categories', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async deletePatrimonyCategory(id) {
        try {
            const { error } = await supabase
                .from('patrimonio_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn('[DbService] Erro ao excluir categoria de patrimônio no Supabase:', e);
        }
        const local = localStorage.getItem('corellux_patrimony_categories');
        if (local) {
            const list = JSON.parse(local).filter(c => String(c.id) !== String(id));
            localStorage.setItem('corellux_patrimony_categories', JSON.stringify(list));
        }
        return { success: true };
    },

    async getPatrimonyItems() {
        try {
            console.log('[DbService] Carregando itens de patrimônio...');
            const { data, error } = await supabase
                .from('patrimonio_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_items');
                if (local) return JSON.parse(local);

                const defaults = [
                    { id: 1, code: 'PRT-001', name: 'Prato Raso Porcelana', category: 'Utensílios', subcategory: 'Pratos', unit: 'Unidade', qtyActual: 120, qtyMin: 50, valueUnit: 15.00, valueTotal: 1800.00, sectorActual: 'Salão', location: 'Armário A', acquisitionDate: '2025-01-15', supplier: 'Porcelanas Real', notes: 'Pratos de porcelana branca para serviço.', status: 'Ativo' },
                    { id: 2, code: 'FAC-002', name: 'Faca de Churrasco Tramontina', category: 'Utensílios', subcategory: 'Talheres', unit: 'Unidade', qtyActual: 150, qtyMin: 60, valueUnit: 8.50, valueTotal: 1275.00, sectorActual: 'Salão', location: 'Gaveta 2', acquisitionDate: '2025-01-20', supplier: 'Tramontina S/A', notes: 'Faca cabo de madeira resistente.', status: 'Ativo' },
                    { id: 3, code: 'COP-003', name: 'Copo Long Drink 300ml', category: 'Utensílios', subcategory: 'Copos', unit: 'Unidade', qtyActual: 200, qtyMin: 80, valueUnit: 5.00, valueTotal: 1000.00, sectorActual: 'Bar', location: 'Prateleira 1', acquisitionDate: '2025-02-10', supplier: 'Nadir Figueiredo', notes: 'Copos de vidro transparente.', status: 'Ativo' },
                    { id: 4, code: 'TAB-004', name: 'Tablet Samsung Galaxy A8', category: 'Tecnologia', subcategory: 'Tablets', unit: 'Unidade', qtyActual: 8, qtyMin: 2, valueUnit: 1200.00, valueTotal: 9600.00, sectorActual: 'Salão', location: 'Suporte Caixa', acquisitionDate: '2025-03-05', supplier: 'Magazine Luiza', notes: 'Utilizados para comandas eletrônicas.', status: 'Ativo' },
                    { id: 5, code: 'IMP-005', name: 'Impressora Térmica Bematech', category: 'Tecnologia', subcategory: 'Impressoras', unit: 'Unidade', qtyActual: 5, qtyMin: 1, valueUnit: 650.00, valueTotal: 3250.00, sectorActual: 'Cozinha', location: 'Balcão Expedição', acquisitionDate: '2025-02-05', supplier: 'Kabum', notes: 'Impressora de pedidos de cozinha.', status: 'Ativo' },
                    { id: 6, code: 'PAN-006', name: 'Panela de Pressão Industrial 20L', category: 'Equipamentos', subcategory: 'Panelas', unit: 'Unidade', qtyActual: 3, qtyMin: 1, valueUnit: 450.00, valueTotal: 1350.00, sectorActual: 'Cozinha', location: 'Fogão Central', acquisitionDate: '2025-01-10', supplier: 'Metalúrgica Alumínio', notes: 'Panela de pressão profissional reforçada.', status: 'Ativo' },
                    { id: 7, code: 'UNF-007', name: 'Camisa Polo Uniforme M', category: 'Uniformes', subcategory: 'Camisas', unit: 'Unidade', qtyActual: 30, qtyMin: 10, valueUnit: 45.00, valueTotal: 1350.00, sectorActual: 'Almoxarifado', location: 'Armário RH', acquisitionDate: '2025-04-12', supplier: 'Uniformes & Cia', notes: 'Camisas polo pretas com logo bordado.', status: 'Ativo' }
                ];
                localStorage.setItem('corellux_patrimony_items', JSON.stringify(defaults));
                return defaults;
            }
            const camelData = toCamelCase(data);
            localStorage.setItem('corellux_patrimony_items', JSON.stringify(camelData));
            return camelData;
        } catch (e) {
            console.error('[DbService] Erro ao carregar itens de patrimônio. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_items');
            if (local) return JSON.parse(local);
            
            const defaults = [
                { id: 1, code: 'PRT-001', name: 'Prato Raso Porcelana', category: 'Utensílios', subcategory: 'Pratos', unit: 'Unidade', qtyActual: 120, qtyMin: 50, valueUnit: 15.00, valueTotal: 1800.00, sectorActual: 'Salão', location: 'Armário A', acquisitionDate: '2025-01-15', supplier: 'Porcelanas Real', notes: 'Pratos de porcelana branca para serviço.', status: 'Ativo' },
                { id: 2, code: 'FAC-002', name: 'Faca de Churrasco Tramontina', category: 'Utensílios', subcategory: 'Talheres', unit: 'Unidade', qtyActual: 150, qtyMin: 60, valueUnit: 8.50, valueTotal: 1275.00, sectorActual: 'Salão', location: 'Gaveta 2', acquisitionDate: '2025-01-20', supplier: 'Tramontina S/A', notes: 'Faca cabo de madeira resistente.', status: 'Ativo' },
                { id: 3, code: 'COP-003', name: 'Copo Long Drink 300ml', category: 'Utensílios', subcategory: 'Copos', unit: 'Unidade', qtyActual: 200, qtyMin: 80, valueUnit: 5.00, valueTotal: 1000.00, sectorActual: 'Bar', location: 'Prateleira 1', acquisitionDate: '2025-02-10', supplier: 'Nadir Figueiredo', notes: 'Copos de vidro transparente.', status: 'Ativo' },
                { id: 4, code: 'TAB-004', name: 'Tablet Samsung Galaxy A8', category: 'Tecnologia', subcategory: 'Tablets', unit: 'Unidade', qtyActual: 8, qtyMin: 2, valueUnit: 1200.00, valueTotal: 9600.00, sectorActual: 'Salão', location: 'Suporte Caixa', acquisitionDate: '2025-03-05', supplier: 'Magazine Luiza', notes: 'Utilizados para comandas eletrônicas.', status: 'Ativo' },
                { id: 5, code: 'IMP-005', name: 'Impressora Térmica Bematech', category: 'Tecnologia', subcategory: 'Impressoras', unit: 'Unidade', qtyActual: 5, qtyMin: 1, valueUnit: 650.00, valueTotal: 3250.00, sectorActual: 'Cozinha', location: 'Balcão Expedição', acquisitionDate: '2025-02-05', supplier: 'Kabum', notes: 'Impressora de pedidos de cozinha.', status: 'Ativo' },
                { id: 6, code: 'PAN-006', name: 'Panela de Pressão Industrial 20L', category: 'Equipamentos', subcategory: 'Panelas', unit: 'Unidade', qtyActual: 3, qtyMin: 1, valueUnit: 450.00, valueTotal: 1350.00, sectorActual: 'Cozinha', location: 'Fogão Central', acquisitionDate: '2025-01-10', supplier: 'Metalúrgica Alumínio', notes: 'Panela de pressão profissional reforçada.', status: 'Ativo' },
                { id: 7, code: 'UNF-007', name: 'Camisa Polo Uniforme M', category: 'Uniformes', subcategory: 'Camisas', unit: 'Unidade', qtyActual: 30, qtyMin: 10, valueUnit: 45.00, valueTotal: 1350.00, sectorActual: 'Almoxarifado', location: 'Armário RH', acquisitionDate: '2025-04-12', supplier: 'Uniformes & Cia', notes: 'Camisas polo pretas com logo bordado.', status: 'Ativo' }
            ];
            localStorage.setItem('corellux_patrimony_items', JSON.stringify(defaults));
            return defaults;
        }
    },

    async savePatrimonyItem(item) {
        const cleanItem = {
            ...item,
            qtyActual: parseInt(item.qtyActual) || 0,
            valueUnit: parseFloat(item.valueUnit) || 0.00,
        };
        cleanItem.valueTotal = cleanItem.qtyActual * cleanItem.valueUnit;

        try {
            const snakeObj = toSnakeCase(cleanItem);
            let result;
            if (cleanItem.id && typeof cleanItem.id !== 'string') {
                result = await supabase
                    .from('patrimonio_items')
                    .update(snakeObj)
                    .eq('id', cleanItem.id)
                    .select();
            } else {
                delete snakeObj.id;
                result = await supabase
                    .from('patrimonio_items')
                    .insert([snakeObj])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_items');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(i => String(i.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_items', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar item de patrimônio no Supabase. Gravando localmente:', e);
            const saved = { ...cleanItem, id: cleanItem.id || 'item_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_items');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(i => String(i.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_items', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async deletePatrimonyItem(id) {
        try {
            const { error } = await supabase
                .from('patrimonio_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn('[DbService] Erro ao excluir item de patrimônio no Supabase:', e);
        }
        const local = localStorage.getItem('corellux_patrimony_items');
        if (local) {
            const list = JSON.parse(local).filter(i => String(i.id) !== String(id));
            localStorage.setItem('corellux_patrimony_items', JSON.stringify(list));
        }
        return { success: true };
    },

    async getPatrimonyMovements() {
        try {
            const { data, error } = await supabase
                .from('patrimonio_movements')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_movements');
                return local ? JSON.parse(local) : [];
            }
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar movimentações. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_movements');
            return local ? JSON.parse(local) : [];
        }
    },

    async savePatrimonyMovement(mov) {
        try {
            const snakeObj = toSnakeCase(mov);
            if (snakeObj.id && typeof snakeObj.id === 'string' && snakeObj.id.startsWith('mov_')) {
                delete snakeObj.id;
            }
            const { data, error } = await supabase
                .from('patrimonio_movements')
                .insert([snakeObj])
                .select();
            if (error) throw error;
            const saved = toCamelCase(data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_movements');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_movements', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar movimentação no Supabase. Gravando localmente:', e);
            const saved = { ...mov, id: mov.id || 'mov_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_movements');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_movements', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getPatrimonyResponsibilities() {
        try {
            const { data, error } = await supabase
                .from('patrimonio_responsibility')
                .select('*')
                .order('delivery_date', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_responsibility');
                if (local) return JSON.parse(local);
                
                const defaults = [
                    { id: 1, employeeId: 4, employeeName: 'João', itemSku: 'TAB-004', itemName: 'Tablet Samsung Galaxy A8', qty: 1, deliveryDate: '2025-05-10', returnDate: null, signature: 'João Silva', status: 'Pendente', notes: 'Para uso em atendimento nas mesas.' }
                ];
                localStorage.setItem('corellux_patrimony_responsibility', JSON.stringify(defaults));
                return defaults;
            }
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar responsabilidades. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_responsibility');
            if (local) return JSON.parse(local);
            
            const defaults = [
                { id: 1, employeeId: 4, employeeName: 'João', itemSku: 'TAB-004', itemName: 'Tablet Samsung Galaxy A8', qty: 1, deliveryDate: '2025-05-10', returnDate: null, signature: 'João Silva', status: 'Pendente', notes: 'Para uso em atendimento nas mesas.' }
            ];
            localStorage.setItem('corellux_patrimony_responsibility', JSON.stringify(defaults));
            return defaults;
        }
    },

    async savePatrimonyResponsibility(resp) {
        try {
            const snakeObj = toSnakeCase(resp);
            let result;
            if (resp.id && typeof resp.id !== 'string') {
                result = await supabase
                    .from('patrimonio_responsibility')
                    .update(snakeObj)
                    .eq('id', resp.id)
                    .select();
            } else {
                delete snakeObj.id;
                result = await supabase
                    .from('patrimonio_responsibility')
                    .insert([snakeObj])
                    .select();
            }
            if (result.error) throw result.error;
            const saved = toCamelCase(result.data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_responsibility');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(r => String(r.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_responsibility', JSON.stringify(list));

            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar cautela no Supabase. Gravando localmente:', e);
            const saved = { ...resp, id: resp.id || 'resp_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_responsibility');
            let list = local ? JSON.parse(local) : [];
            const idx = list.findIndex(r => String(r.id) === String(saved.id));
            if (idx !== -1) list[idx] = saved;
            else list.push(saved);
            localStorage.setItem('corellux_patrimony_responsibility', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getPatrimonyInventories() {
        try {
            const { data, error } = await supabase
                .from('patrimonio_inventories')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_inventories');
                return local ? JSON.parse(local) : [];
            }
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar inventários. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_inventories');
            return local ? JSON.parse(local) : [];
        }
    },

    async savePatrimonyInventory(inv) {
        try {
            const snakeObj = toSnakeCase(inv);
            if (snakeObj.id && typeof snakeObj.id === 'string' && snakeObj.id.startsWith('inv_')) {
                delete snakeObj.id;
            }
            const { data, error } = await supabase
                .from('patrimonio_inventories')
                .insert([snakeObj])
                .select();
            if (error) throw error;
            const saved = toCamelCase(data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_inventories');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_inventories', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar inventário no Supabase. Gravando localmente:', e);
            const saved = { ...inv, id: inv.id || 'inv_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_inventories');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_inventories', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async getPatrimonyAudits() {
        try {
            const { data, error } = await supabase
                .from('patrimonio_audits')
                .select('*')
                .order('timestamp', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                const local = localStorage.getItem('corellux_patrimony_audits');
                return local ? JSON.parse(local) : [];
            }
            return toCamelCase(data);
        } catch (e) {
            console.warn('[DbService] Erro ao buscar logs de auditoria. Fallback local:', e);
            const local = localStorage.getItem('corellux_patrimony_audits');
            return local ? JSON.parse(local) : [];
        }
    },

    async savePatrimonyAudit(audit) {
        try {
            const snakeObj = toSnakeCase(audit);
            if (snakeObj.id && typeof snakeObj.id === 'string' && snakeObj.id.startsWith('aud_')) {
                delete snakeObj.id;
            }
            const { data, error } = await supabase
                .from('patrimonio_audits')
                .insert([snakeObj])
                .select();
            if (error) throw error;
            const saved = toCamelCase(data[0]);

            // Sync local
            const local = localStorage.getItem('corellux_patrimony_audits');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_audits', JSON.stringify(list));
            return { success: true, data: saved };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar log de auditoria no Supabase. Gravando localmente:', e);
            const saved = { ...audit, id: audit.id || 'aud_' + Date.now() };
            const local = localStorage.getItem('corellux_patrimony_audits');
            let list = local ? JSON.parse(local) : [];
            list.unshift(saved);
            localStorage.setItem('corellux_patrimony_audits', JSON.stringify(list));
            return { success: true, data: saved };
        }
    },

    async createPatrimonyMovementFromChecklist(sku, type, qty, reason, user) {
        try {
            const items = await this.getPatrimonyItems();
            const item = items.find(i => i.code === sku);
            if (!item) {
                console.warn(`[DbService] Item de patrimônio com SKU ${sku} não encontrado.`);
                return { success: false, error: 'Item não encontrado' };
            }

            const oldQty = item.qtyActual;
            let newQty = oldQty;

            if (type === 'Saída') {
                newQty = Math.max(0, oldQty - qty);
            } else {
                newQty = oldQty + qty;
            }

            item.qtyActual = newQty;
            item.valueTotal = newQty * item.valueUnit;
            if (newQty === 0) {
                item.status = reason === 'Quebra' ? 'Quebrado' : (reason === 'Perda' ? 'Perdido' : 'Baixado');
            }
            await this.savePatrimonyItem(item);

            const newMov = {
                id: 'mov_' + Date.now(),
                itemSku: sku,
                itemName: item.name,
                type: type,
                subtype: reason, 
                qty: qty,
                responsible: user,
                reason: `Ocorrência automática gerada por Checklist: ${reason}`,
                notes: `Saldo atualizado de ${oldQty} para ${newQty}.`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date().toISOString()
            };
            await this.savePatrimonyMovement(newMov);

            const auditLog = {
                id: 'aud_' + Date.now(),
                responsible: user,
                operation: `Ocorrência de Checklist (${reason})`,
                itemSku: sku,
                field: 'qtyActual',
                oldValue: String(oldQty),
                newValue: String(newQty),
                timestamp: new Date().toISOString()
            };
            await this.savePatrimonyAudit(auditLog);

            return { success: true };
        } catch (e) {
            console.error('[DbService] Falha ao registrar ocorrência automática de checklist:', e);
            return { success: false, error: e };
        }
    }
};

export default DbService;
