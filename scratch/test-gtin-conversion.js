// Mock window global for Node.js before importing browser-bound modules
globalThis.window = { CorelluxState: {}, state: {} };

// Test script to verify barcode (GTIN/EAN) search and stock conversion logic
const { products } = await import('../src/utils/initial-data.js');

console.log("=== INICIANDO TESTE DE CONVERSÃO GTIN/EAN ===");

console.log(`Carregados ${products.length} produtos mockados.`);

// 2. Definir códigos de barra para testar no produto BEB-001 (Coca-Cola)
const testCases = [
    { code: "7891234567890", expectedSku: "BEB-001", expectedPkgType: "unidade", expectedFactor: 1 },
    { code: "7891234567891", expectedSku: "BEB-001", expectedPkgType: "fardo", expectedFactor: 6 },
    { code: "7891234567892", expectedSku: "BEB-001", expectedPkgType: "caixa", expectedFactor: 12 },
    { code: "7891234567893", expectedSku: "BEB-001", expectedPkgType: "pallet", expectedFactor: 240 },
    { code: "9999999999999", expectedSku: null, expectedPkgType: null, expectedFactor: null } // Inválido/Não Encontrado
];

let failed = false;

testCases.forEach((tc, idx) => {
    console.log(`\nCaso de Teste #${idx + 1}: Buscando código "${tc.code}"`);
    
    // Simular handleBarcodeSearch logic
    const code = tc.code;
    const matched = products.find(p => 
        p.gtinUnidade === code || 
        p.gtin_unidade === code ||
        p.gtinFardo === code || 
        p.gtin_fardo === code ||
        p.gtinCaixa === code || 
        p.gtin_caixa === code ||
        p.gtinPallet === code || 
        p.gtin_pallet === code
    );

    if (!matched) {
        if (tc.expectedSku === null) {
            console.log(`[PASS] Produto corretamente não encontrado para o código inválido.`);
        } else {
            console.error(`[FAIL] Produto não encontrado para o código "${code}". Esperado: ${tc.expectedSku}`);
            failed = true;
        }
        return;
    }

    // Determinar tipo de embalagem e fator
    let pkgType = 'unidade';
    let factor = 1;
    if (matched.gtinFardo === code || matched.gtin_fardo === code) {
        pkgType = 'fardo';
        factor = Number(matched.itensFardo !== undefined ? matched.itensFardo : (matched.itens_fardo || 1));
    } else if (matched.gtinCaixa === code || matched.gtin_caixa === code) {
        pkgType = 'caixa';
        factor = Number(matched.itensCaixa !== undefined ? matched.itensCaixa : (matched.itens_caixa || 1));
    } else if (matched.gtinPallet === code || matched.gtin_pallet === code) {
        pkgType = 'pallet';
        factor = Number(matched.itensPallet !== undefined ? matched.itensPallet : (matched.itens_pallet || 1));
    }

    // Verificar correspondência de SKU
    if (matched.sku !== tc.expectedSku) {
        console.error(`[FAIL] SKU incorreto. Encontrado: ${matched.sku}, Esperado: ${tc.expectedSku}`);
        failed = true;
    } else {
        console.log(`[PASS] SKU encontrado: ${matched.sku}`);
    }

    // Verificar tipo de embalagem
    if (pkgType !== tc.expectedPkgType) {
        console.error(`[FAIL] Tipo de embalagem incorreto. Encontrado: ${pkgType}, Esperado: ${tc.expectedPkgType}`);
        failed = true;
    } else {
        console.log(`[PASS] Embalagem identificada: ${pkgType}`);
    }

    // Verificar fator de conversão
    if (factor !== tc.expectedFactor) {
        console.error(`[FAIL] Fator de conversão incorreto. Encontrado: ${factor}, Esperado: ${tc.expectedFactor}`);
        failed = true;
    } else {
        console.log(`[PASS] Fator de conversão: ${factor} UN`);
    }

    // Simular cálculo de quantidade convertida para 5 pacotes
    const qtyPackages = 5;
    const totalUnits = qtyPackages * factor;
    const expectedUnits = qtyPackages * tc.expectedFactor;
    if (totalUnits !== expectedUnits) {
        console.error(`[FAIL] Cálculo de conversão falhou. Calculado: ${totalUnits}, Esperado: ${expectedUnits}`);
        failed = true;
    } else {
        console.log(`[PASS] Conversão simulada: ${qtyPackages} ${pkgType}(s) = ${totalUnits} unidades de ${matched.name}.`);
    }
});

console.log("\n==========================================");
if (failed) {
    console.error("Resultado final: ALGUNS TESTES FALHARAM!");
    process.exit(1);
} else {
    console.log("Resultado final: TODOS OS TESTES PASSARAM COM SUCESSO!");
    process.exit(0);
}
