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
            return { success: true, data: toCamelCase(result.data[0]) };
        } catch (e) {
            console.error('[DbService] Erro ao salvar produto:', e.message || e);
            return { success: false, error: e };
        }
    },

    async deleteProduct(sku) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('sku', sku);
            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error(`[DbService] Erro ao deletar produto ${sku}:`, e.message || e);
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
            return { success: true, data: toCamelCase(result.data[0]) };
        } catch (e) {
            console.error('[DbService] Erro ao salvar categoria:', e.message || e);
            return { success: false, error: e };
        }
    },

    async deleteCategory(id) {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error(`[DbService] Erro ao deletar categoria ${id}:`, e.message || e);
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
            return { success: true, data: toCamelCase(result.data[0]) };
        } catch (e) {
            console.error('[DbService] Erro ao salvar fornecedor:', e.message || e);
            return { success: false, error: e };
        }
    },

    async deleteSupplier(id) {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (e) {
            console.error(`[DbService] Erro ao deletar fornecedor ${id}:`, e.message || e);
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
            return { success: true, data: toCamelCase(data[0]) };
        } catch (e) {
            console.warn('[DbService] Erro ao salvar execução de checklist no Supabase. Gravando localmente:', e.message || e);
            const local = localStorage.getItem('corellux_checklist_executions');
            let execs = [];
            if (local) {
                try {
                    execs = JSON.parse(local);
                } catch (err) {
                    console.error('[DbService] Erro ao carregar execuções:', err);
                }
            }
            const newExec = {
                ...execution,
                id: execution.id || 'exec_' + Date.now()
            };
            execs.unshift(newExec);
            localStorage.setItem('corellux_checklist_executions', JSON.stringify(execs));
            return { success: true, data: newExec };
        }
    }
};

export default DbService;
