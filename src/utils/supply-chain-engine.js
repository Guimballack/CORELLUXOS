/**
 * Corellux OS — Supply Chain Engine v3.0
 * Motor de Inteligência Preditiva de Estoque
 *
 * Portado do projeto legado (vanilla JS) para funções puras React-friendly.
 * Nenhuma dependência de window.* globals.
 */

// =============================================================
// FERIADOS NACIONAIS BRASILEIROS (2025–2026)
// =============================================================
const HOLIDAYS = {
    '2025-01-01': { name: 'Ano Novo', impact: 1.3 },
    '2025-03-04': { name: 'Carnaval', impact: 1.5 },
    '2025-03-05': { name: 'Carnaval', impact: 1.5 },
    '2025-04-18': { name: 'Sexta-feira Santa', impact: 1.2 },
    '2025-04-20': { name: 'Páscoa', impact: 1.4 },
    '2025-04-21': { name: 'Tiradentes', impact: 1.1 },
    '2025-05-01': { name: 'Dia do Trabalho', impact: 1.2 },
    '2025-06-19': { name: 'Corpus Christi', impact: 1.1 },
    '2025-09-07': { name: 'Independência', impact: 1.1 },
    '2025-10-12': { name: 'Nossa Sra. Aparecida', impact: 1.2 },
    '2025-11-02': { name: 'Finados', impact: 1.1 },
    '2025-11-15': { name: 'Proclamação da República', impact: 1.0 },
    '2025-12-24': { name: 'Véspera de Natal', impact: 1.4 },
    '2025-12-25': { name: 'Natal', impact: 1.5 },
    '2025-12-31': { name: 'Réveillon', impact: 1.4 },
    '2026-01-01': { name: 'Ano Novo', impact: 1.3 },
    '2026-02-17': { name: 'Carnaval', impact: 1.5 },
    '2026-02-18': { name: 'Carnaval', impact: 1.5 },
    '2026-04-03': { name: 'Sexta-feira Santa', impact: 1.2 },
    '2026-04-05': { name: 'Páscoa', impact: 1.4 },
    '2026-04-21': { name: 'Tiradentes', impact: 1.1 },
    '2026-05-01': { name: 'Dia do Trabalho', impact: 1.2 },
    '2026-06-04': { name: 'Corpus Christi', impact: 1.1 },
    '2026-09-07': { name: 'Independência', impact: 1.1 },
    '2026-10-12': { name: 'Nossa Sra. Aparecida', impact: 1.2 },
    '2026-11-02': { name: 'Finados', impact: 1.1 },
    '2026-11-15': { name: 'Proclamação da República', impact: 1.0 },
    '2026-12-24': { name: 'Véspera de Natal', impact: 1.4 },
    '2026-12-25': { name: 'Natal', impact: 1.5 },
    '2026-12-31': { name: 'Réveillon', impact: 1.4 },
};

const DOW_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// =============================================================
// HELPERS
// =============================================================
function avg(arr) {
    return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function getHolidayImpact(dateStr) {
    return (HOLIDAYS[dateStr] || {}).impact || 1.0;
}

function getHoliday(dateStr) {
    return HOLIDAYS[dateStr] || null;
}

/**
 * Extrai lead time em dias do fornecedor.
 * Lógica: stockBatches do SKU → nome do supplier → suppliers[].logistica.prazoEntrega
 * Fallback: 5 dias.
 */
export function getLeadTimeForSku(sku, stockBatches, suppliers) {
    const batches = (stockBatches || []).filter(b => b.itemSku === sku);
    if (batches.length > 0) {
        const supplierName = batches[0].supplier;
        const sup = (suppliers || []).find(s =>
            s.nomeFantasia === supplierName || s.razaoSocial === supplierName
        );
        if (sup?.logistica?.prazoEntrega) {
            const parsed = parseInt(sup.logistica.prazoEntrega);
            if (!isNaN(parsed)) return parsed;
        }
    }
    return 5; // default fallback
}

/**
 * Retorna o nome do fornecedor principal de um SKU.
 */
export function getMainSupplierForSku(sku, stockBatches) {
    const batches = (stockBatches || []).filter(b => b.itemSku === sku);
    return batches.length > 0 ? (batches[0].supplier || 'N/A') : 'N/A';
}

/**
 * Calcula o estoque total de um SKU somando todos os lotes.
 */
export function getTotalStockFromBatches(sku, stockBatches, productStock) {
    const batches = (stockBatches || []).filter(b => b.itemSku === sku);
    if (batches.length > 0) {
        return batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    }
    return productStock || 0;
}


// =============================================================
// 1. DETECÇÃO DE ANOMALIAS (IQR)
// =============================================================
/**
 * Detecta outliers no histórico de consumo usando método IQR.
 * @param {Array} history - Array de { sku, date, qty, dayOfWeek }
 * @returns {Array} history com flag isAnomaly adicionado
 */
export function detectAnomalies(history) {
    const bySkuMap = {};
    history.forEach(r => {
        if (!bySkuMap[r.sku]) bySkuMap[r.sku] = [];
        bySkuMap[r.sku].push(r);
    });

    const result = [];
    Object.entries(bySkuMap).forEach(([, recs]) => {
        const values = recs.map(r => r.qty);
        if (values.length < 4) {
            recs.forEach(r => result.push({ ...r, isAnomaly: false }));
            return;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        const roundedLower = Math.round(lower);
        const roundedUpper = Math.round(upper);

        recs.forEach(r => {
            const roundedQty = Math.round(r.qty);
            const isOut = roundedQty > roundedUpper || roundedQty < Math.max(0, roundedLower);
            result.push({
                ...r,
                isAnomaly: isOut,
                expectedMin: roundedLower,
                expectedMax: roundedUpper,
            });
        });
    });

    return result;
}


// =============================================================
// 2. SAZONALIDADE — Médias por Dia da Semana + Volatilidade
// =============================================================
/**
 * Calcula métricas de sazonalidade por SKU.
 * @param {Array} cleanHistory - Histórico já sem anomalias
 * @returns {Object} { [sku]: { sunday..saturday, overallAvg, stdDev, volatilityScore, trend } }
 */
export function calculateSeasonality(cleanHistory) {
    const metrics = {};

    const bySkuMap = {};
    cleanHistory.forEach(r => {
        if (!bySkuMap[r.sku]) bySkuMap[r.sku] = [];
        bySkuMap[r.sku].push(r);
    });

    Object.entries(bySkuMap).forEach(([sku, recs]) => {
        if (!recs.length) return;

        // DOW averages
        const dowGroups = [0,1,2,3,4,5,6].map(dow =>
            recs.filter(r => r.dayOfWeek === dow).map(r => r.qty)
        );
        const dowAvgs = dowGroups.map(arr => parseFloat(avg(arr).toFixed(2)));
        const overallAvg = parseFloat(avg(recs.map(r => r.qty)).toFixed(2));

        // Std deviation
        const values = recs.map(r => r.qty);
        const mean = avg(values);
        const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = parseFloat(Math.sqrt(variance).toFixed(2));

        // Volatility score (CV%)
        const cv = overallAvg > 0 ? (stdDev / overallAvg) * 100 : 0;
        let volatilityScore;
        if (cv < 20) volatilityScore = 'LOW';
        else if (cv < 40) volatilityScore = 'MEDIUM';
        else if (cv < 70) volatilityScore = 'HIGH';
        else volatilityScore = 'CRITICAL';

        // Trend: last 14 vs previous 14 days
        const today = new Date();
        const cut14Str = new Date(today.getTime() - 14*86400000).toISOString().split('T')[0];
        const cut28Str = new Date(today.getTime() - 28*86400000).toISOString().split('T')[0];
        const last14 = recs.filter(r => r.date >= cut14Str);
        const prev14 = recs.filter(r => r.date >= cut28Str && r.date < cut14Str);
        const avgLast14 = avg(last14.map(r => r.qty));
        const avgPrev14 = avg(prev14.map(r => r.qty));
        let trend = 0;
        if (avgPrev14 > 0) trend = parseFloat((((avgLast14 - avgPrev14) / avgPrev14) * 100).toFixed(1));

        metrics[sku] = {
            sunday: dowAvgs[0], monday: dowAvgs[1], tuesday: dowAvgs[2],
            wednesday: dowAvgs[3], thursday: dowAvgs[4], friday: dowAvgs[5], saturday: dowAvgs[6],
            overallAvg, stdDev, volatilityScore, trend,
            sampleSize: recs.length,
        };
    });

    return metrics;
}


// =============================================================
// 3. ESTOQUE DE SEGURANÇA DINÂMICO
// =============================================================
const Z_FACTORS = { A: 2.05, B: 1.65, C: 1.28, DEFAULT: 1.65 };

/**
 * Calcula estoque de segurança: SS = Z × stdDev × √(leadTime) × holidayMultiplier
 */
export function calculateSafetyStock(sku, seasonalityMetrics, leadTimeDays, abcClass = 'DEFAULT') {
    const metrics = (seasonalityMetrics || {})[sku];
    const stdDev = metrics ? metrics.stdDev : 1;
    const Z = Z_FACTORS[abcClass] || Z_FACTORS.DEFAULT;

    let safetyStock = Z * stdDev * Math.sqrt(leadTimeDays);

    // Holiday adjustment: next leadTime+3 days
    let maxHolidayImpact = 1.0;
    for (let i = 1; i <= leadTimeDays + 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const impact = getHolidayImpact(dateStr);
        if (impact > maxHolidayImpact) maxHolidayImpact = impact;
    }
    safetyStock *= maxHolidayImpact;
    return Math.max(1, Math.ceil(safetyStock));
}


// =============================================================
// 4. MOTOR DE PREVISÃO PONDERADA
// =============================================================
const WEIGHTS = {
    sameDayOfWeek: 0.35,
    last7days:     0.25,
    last30days:    0.15,
    holidays:      0.15,
    events:        0.10,
};

/**
 * Previsão de demanda para um SKU.
 * @param {string} sku
 * @param {Object} product
 * @param {Array} cleanHistory - { sku, date, qty, dayOfWeek } sem anomalias
 * @param {Object} seasonalityMetrics
 * @param {number} safetyStock
 * @param {number} leadTime
 * @param {number} availableStock
 * @param {number} horizonDays
 * @returns forecast object
 */
export function forecastDemand(sku, product, cleanHistory, seasonalityMetrics, safetyStock, leadTime, availableStock, horizonDays = 14) {
    const history = cleanHistory.filter(r => r.sku === sku);
    const seasonMetrics = (seasonalityMetrics || {})[sku];

    // Fallback when no history
    if (history.length < 7) {
        const coverage = availableStock > 0 ? 999 : 0;
        return {
            sku, horizonDays,
            predictedDailyAvg: 0.1,
            confidenceLevel: 'BAIXA',
            riskLevel: coverage <= leadTime ? 'CRÍTICO' : 'NORMAL',
            safetyStock,
            coverageDays: parseFloat(coverage.toFixed(1)),
            availableStock,
            leadTime,
            explanation: 'Sem histórico de consumo real ainda.',
            trend: 0,
            volatilityScore: 'LOW',
            hasHistory: false,
        };
    }

    // Factor 1: DOW average (35%)
    let dowTotalPrediction = 0;
    for (let i = 1; i <= horizonDays; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const dow = d.getDay();
        const dowAvg = seasonMetrics ? seasonMetrics[DOW_KEYS[dow]] : null;
        const base = dowAvg || (seasonMetrics ? seasonMetrics.overallAvg : 1);
        dowTotalPrediction += base;
    }

    // Factor 2: Last 7 days (25%)
    const last7 = history.slice(-7);
    const avg7 = last7.length ? last7.reduce((s, r) => s + r.qty, 0) / last7.length : 0;
    const pred7 = avg7 * horizonDays;

    // Factor 3: Last 30 days (15%)
    const last30 = history.slice(-30);
    const avg30 = last30.length ? last30.reduce((s, r) => s + r.qty, 0) / last30.length : 0;
    const pred30 = avg30 * horizonDays;

    // Factor 4: Holidays (15%)
    let totalHolidayImpact = 0;
    let upcomingHolidayNames = [];
    for (let i = 1; i <= horizonDays; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const impact = getHolidayImpact(dateStr);
        if (impact > 1.0) {
            const h = getHoliday(dateStr);
            if (h) upcomingHolidayNames.push(h.name);
        }
        totalHolidayImpact += impact;
    }
    const avgHolidayMultiplier = totalHolidayImpact / horizonDays;
    const baseForHoliday = avg30 || avg7 || 1;
    const predHoliday = baseForHoliday * horizonDays * avgHolidayMultiplier;

    // Factor 5: Events (10%)
    const predEvents = (avg30 || avg7 || 1) * horizonDays;

    // Weighted prediction
    const weightedTotal =
        (dowTotalPrediction * WEIGHTS.sameDayOfWeek) +
        (pred7           * WEIGHTS.last7days) +
        (pred30          * WEIGHTS.last30days) +
        (predHoliday     * WEIGHTS.holidays) +
        (predEvents      * WEIGHTS.events);

    // Trend adjustment
    const trend = seasonMetrics ? seasonMetrics.trend : 0;
    const trendFactor = 1 + (trend / 100) * 0.5;
    const adjustedTotal = weightedTotal * trendFactor;

    // Confidence level
    const volatility = seasonMetrics ? seasonMetrics.volatilityScore : 'HIGH';
    let confidenceLevel;
    if (history.length >= 30 && (volatility === 'LOW' || volatility === 'MEDIUM')) confidenceLevel = 'ALTA';
    else if (history.length >= 14 && volatility !== 'CRITICAL') confidenceLevel = 'MÉDIA';
    else confidenceLevel = 'BAIXA';

    // Coverage
    const predictedDailyAvg = adjustedTotal > 0 ? parseFloat((adjustedTotal / horizonDays).toFixed(2)) : 0.1;
    const coverageDays = predictedDailyAvg > 0 ? parseFloat((availableStock / predictedDailyAvg).toFixed(1)) : 999;

    // Risk level
    let riskLevel;
    if (coverageDays <= leadTime * 0.5) riskLevel = 'CRÍTICO';
    else if (coverageDays <= leadTime) riskLevel = 'ELEVADO';
    else if (coverageDays <= leadTime + 5) riskLevel = 'MODERADO';
    else riskLevel = 'NORMAL';

    // Explanation
    const parts = [];
    if (upcomingHolidayNames.length > 0) parts.push(`feriado próximo (${upcomingHolidayNames[0]})`);
    if (trend > 10) parts.push(`tendência de alta de ${trend}%`);
    if (trend < -10) parts.push(`tendência de queda de ${Math.abs(trend)}%`);
    if (volatility === 'HIGH' || volatility === 'CRITICAL') parts.push(`alta volatilidade (${volatility})`);
    const explanation = parts.length ? `Previsão elevada por: ${parts.join(', ')}.` : 'Consumo dentro do padrão esperado.';

    return {
        sku, horizonDays,
        predictedDailyAvg,
        confidenceLevel, riskLevel,
        safetyStock,
        coverageDays,
        availableStock, leadTime,
        explanation,
        upcomingHolidays: upcomingHolidayNames,
        trend, volatilityScore: volatility,
        hasHistory: true,
    };
}


// =============================================================
// 5. CURVA ABC
// =============================================================
/**
 * Classifica produtos em A/B/C por valor de consumo.
 * @param {Array} products
 * @param {Array} history - { sku, qty }
 * @returns {Array} sorted items with abcClass
 */
export function calculateABC(products, history) {
    const volBysku = {};
    history.forEach(r => {
        volBysku[r.sku] = (volBysku[r.sku] || 0) + r.qty;
    });

    const itemValues = products.map(product => {
        // Stable mock cost if no real cost available
        const stableRandom = (product.sku.charCodeAt(product.sku.length - 1) * 3) % 150 + 5;
        const mockCost = product.cost || stableRandom;
        const volumeConsumed = volBysku[product.sku] || 0;
        return {
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            volume: volumeConsumed,
            cost: parseFloat(mockCost.toFixed(2)),
            value: parseFloat((volumeConsumed * mockCost).toFixed(2)),
        };
    });

    itemValues.sort((a, b) => b.value - a.value);
    const totalValue = itemValues.reduce((s, i) => s + i.value, 0);

    let cumulative = 0;
    return itemValues.map(item => {
        cumulative += item.value;
        const cumulativePercentage = totalValue > 0 ? parseFloat(((cumulative / totalValue) * 100).toFixed(1)) : 0;
        let abcClass = 'C';
        if (cumulativePercentage <= 80) abcClass = 'A';
        else if (cumulativePercentage <= 95) abcClass = 'B';
        return { ...item, cumulativePercentage, abcClass };
    });
}


// =============================================================
// 6. SUGESTÕES DE COMPRA
// =============================================================
/**
 * Gera sugestões de compra para itens com cobertura abaixo do target.
 * @param {Array} inventoryMetrics - resultado do runSupplyChainEngine
 * @param {number} targetDays - meta de cobertura em dias
 * @returns {Array} suggestions
 */
export function generatePurchaseSuggestions(inventoryMetrics, targetDays = 30) {
    const suggestions = [];

    inventoryMetrics.forEach(metric => {
        if (metric.coverageDays < (targetDays + metric.leadTime)) {
            const cycleQty = ((targetDays + metric.leadTime) * metric.avgDailyConsumption) - metric.availableStock;
            const safetyQty = metric.safetyStock;
            let idealQty = cycleQty + safetyQty;
            if (idealQty < 1) idealQty = 1;

            suggestions.push({
                sku: metric.sku,
                name: metric.name,
                category: metric.category,
                unit: metric.unit,
                currentStock: metric.availableStock,
                currentCoverage: metric.coverageDays,
                leadTime: metric.leadTime,
                avgDailyConsumption: metric.avgDailyConsumption,
                cycleQty: Math.ceil(Math.max(0, cycleQty)),
                safetyQty: Math.ceil(Math.max(0, safetyQty)),
                suggestedQty: Math.ceil(idealQty),
                supplier: metric.mainSupplier,
                status: metric.coverageDays <= (metric.leadTime / 2) ? 'URGENTE' : 'COMPRAR',
                riskLevel: metric.riskLevel,
                explanation: metric.explanation,
            });
        }
    });

    return suggestions.sort((a, b) => a.currentCoverage - b.currentCoverage);
}


// =============================================================
// MOTOR PRINCIPAL — Orquestra todos os engines
// =============================================================
/**
 * Roda todos os engines e retorna o estado completo do Supply Chain.
 * 
 * @param {Array} products - lista de produtos ativos
 * @param {Array} stockBatches - lotes de estoque
 * @param {Array} suppliers - fornecedores
 * @param {Array} movementLogs - histórico de saídas: [{ sku, date, qty, dayOfWeek }]
 * @param {number} targetDays - meta de cobertura (UI input)
 * @returns {Object} { inventoryMetrics, abcData, purchaseSuggestions, pendingAnomalies, seasonalityMetrics }
 */
export function runSupplyChainEngine(products, stockBatches, suppliers, movementLogs, targetDays = 30) {
    const activeProducts = (products || []).filter(p => p.status === 'Ativo');

    // 1. Detectar anomalias no histórico
    const historyWithFlags = detectAnomalies(movementLogs || []);
    const cleanHistory = historyWithFlags.filter(r => !r.isAnomaly);
    const pendingAnomalies = historyWithFlags.filter(r => r.isAnomaly);

    // 2. Calcular sazonalidade
    const seasonalityMetrics = calculateSeasonality(cleanHistory);

    // 3. ABC
    const abcData = calculateABC(activeProducts, cleanHistory);
    const abcClassMap = {};
    abcData.forEach(item => { abcClassMap[item.sku] = item.abcClass; });

    // 4. Inventory metrics (cobertura) por produto
    const inventoryMetrics = activeProducts.map(product => {
        const sku = product.sku;
        const leadTime = getLeadTimeForSku(sku, stockBatches, suppliers);
        const mainSupplier = getMainSupplierForSku(sku, stockBatches);
        const availableStock = getTotalStockFromBatches(sku, stockBatches, product.stock);
        const abcClass = abcClassMap[sku] || 'DEFAULT';
        const safetyStock = calculateSafetyStock(sku, seasonalityMetrics, leadTime, abcClass);
        const forecast = forecastDemand(
            sku, product, cleanHistory, seasonalityMetrics,
            safetyStock, leadTime, availableStock, 14
        );

        const status = forecast.coverageDays <= leadTime ? 'CRÍTICO'
            : forecast.coverageDays <= leadTime + 3 ? 'ALERTA' : 'OK';

        return {
            sku,
            name: product.name,
            category: product.category,
            unit: product.unit,
            avgDailyConsumption: forecast.predictedDailyAvg,
            availableStock,
            coverageDays: forecast.coverageDays,
            leadTime,
            mainSupplier,
            safetyStock,
            riskLevel: forecast.riskLevel,
            confidenceLevel: forecast.confidenceLevel,
            explanation: forecast.explanation,
            trend: forecast.trend,
            volatilityScore: forecast.volatilityScore,
            abcClass,
            status,
            hasHistory: forecast.hasHistory,
        };
    });

    // 5. Sugestões de compra
    const purchaseSuggestions = generatePurchaseSuggestions(inventoryMetrics, targetDays);

    return {
        inventoryMetrics,
        abcData,
        purchaseSuggestions,
        pendingAnomalies,
        seasonalityMetrics,
    };
}
