/**
 * Corellux OS - Financeiro Hub
 * Painel financeiro com menu de acessos.
 */

import React, { useState } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import { 
    TrendingUp, 
    FileText, 
    BarChart3, 
    PieChart, 
    Calculator, 
    ChevronRight 
} from 'lucide-react';

export default function FinanceiroHub() {
    const [state, setKey] = useCorelluxState(['currentUser']);
    const [activeTab, setActiveTab] = useState('menu');

    const hasAccess = (permissionKey) => {
        const user = state.currentUser;
        if (!user) return false;
        if (user.accessLevel === 'Administrador') return true;
        if (!user.permissions) return false;
        if (user.permissions[permissionKey] === undefined) return true;
        return !!user.permissions[permissionKey];
    };

    return (
        <div className="screen active with-header" style={{
            display: 'flex', flexDirection: 'column',
            background: '#090d16', color: '#f3f4f6',
            height: '100%', overflowY: 'auto', padding: '2rem'
        }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                        FINANCEIRO
                    </h1>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Gestão de fluxo de caixa, DRE, contas a pagar/receber e controladoria.
                    </p>
                </div>
            </div>

            {activeTab === 'menu' && (
                <div className="dashboard-menu">
                    {hasAccess('sub_financeiro_fluxo') && (
                        <button className="menu-card yellow" onClick={() => alert('Módulo em migração para React.')}>
                            <div className="card-icon"><TrendingUp size={24} /></div>
                            <div className="card-content">
                                <h3>FLUXO DE CAIXA</h3>
                                <p>Acompanhe entradas, saídas, saldos bancários e conciliação financeira diária.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    )}

                    {hasAccess('sub_financeiro_contas') && (
                        <button className="menu-card yellow" onClick={() => alert('Módulo em migração para React.')}>
                            <div className="card-icon"><FileText size={24} /></div>
                            <div className="card-content">
                                <h3>CONTAS A PAGAR / RECEBER</h3>
                                <p>Gerenciamento de duplicatas, boletos, fornecedores e recebimentos de clientes.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    )}

                    {hasAccess('sub_financeiro_faturamento') && (
                        <button className="menu-card yellow" onClick={() => alert('Módulo em migração para React.')}>
                            <div className="card-icon"><BarChart3 size={24} /></div>
                            <div className="card-content">
                                <h3>FATURAMENTO</h3>
                                <p>Emissão de notas fiscais, controle de vendas consolidadas e relatórios de faturamento.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    )}

                    {hasAccess('sub_financeiro_dre') && (
                        <button className="menu-card yellow" onClick={() => alert('Módulo em migração para React.')}>
                            <div className="card-icon"><PieChart size={24} /></div>
                            <div className="card-content">
                                <h3>DRE</h3>
                                <p>Demonstrativo do Resultado do Exercício consolidado por competência e regime de caixa.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    )}

                    {hasAccess('sub_financeiro_custos') && (
                        <button className="menu-card yellow" onClick={() => alert('Módulo em migração para React.')}>
                            <div className="card-icon"><Calculator size={24} /></div>
                            <div className="card-content">
                                <h3>CUSTOS E CONTROLADORIA</h3>
                                <p>Gestão de margens de contribuição, custos fixos e variáveis e ponto de equilíbrio.</p>
                            </div>
                            <ChevronRight className="chevron" size={20} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
