/**
 * Corellux OS - Dashboard Page
 * Menu principal com cartões de atalhos para os módulos operacionais e de gestão.
 */

import React from 'react';
import { useCorelluxState } from '../store/corellux-state';
import { 
    Truck, 
    Headset, 
    Coins, 
    FolderTree, 
    ChartLine, 
    Clock, 
    ShoppingCart, 
    Gavel, 
    Database,
    ChevronRight,
    Lock,
    Boxes,
    FlaskConical
} from 'lucide-react';

export default function Dashboard() {
    const [state, setKey] = useCorelluxState(['currentScreen']);

    const handleModuleClick = (screenName) => {
        if (screenName === 'central-hub') {
            setKey('centralActiveTab', 'menu');
        }
        if (screenName === 'patrimonio-hub') {
            setKey('patrimonioActiveTab', 'dashboard');
        }
        if (screenName === 'subprodutos-hub') {
            setKey('subprodutosActiveTab', 'dashboard');
        }
        setKey('currentScreen', screenName);
    };

    return (
        <div id="screen-dashboard" className="screen active with-header">


            <div className="dashboard-menu">
                <button 
                    id="btn-nav-logistica" 
                    className="menu-card blue" 
                    onClick={() => handleModuleClick('logistics-hub')}
                >
                    <div className="card-icon"><Truck size={24} /></div>
                    <div className="card-content">
                        <h3>LOGÍSTICA</h3>
                        <p>Gerenciar estoque, movimentações e fluxo de materiais.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-central" 
                    className="menu-card dark-blue" 
                    onClick={() => handleModuleClick('central-hub')}
                >
                    <div className="card-icon"><Headset size={24} /></div>
                    <div className="card-content">
                        <h3>GESTÃO OPERACIONAL</h3>
                        <p>Comunicação interna, avisos e checklists operacionais.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-patrimonio" 
                    className="menu-card teal" 
                    onClick={() => handleModuleClick('patrimonio-hub')}
                >
                    <div className="card-icon"><Boxes size={24} /></div>
                    <div className="card-content">
                        <h3>PATRIMÔNIO e MATERIAIS</h3>
                        <p>Controle de utensílios, tecnologia, móveis e cautela de itens.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-financeiro" 
                    className="menu-card yellow" 
                    onClick={() => handleModuleClick('financeiro-hub')}
                >
                    <div className="card-icon"><Coins size={24} /></div>
                    <div className="card-content">
                        <h3>FINANCEIRO</h3>
                        <p>Fluxo de caixa, contas a pagar/receber, faturamento e DRE.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-ged" 
                    className="menu-card purple" 
                    onClick={() => handleModuleClick('ged-hub')}
                >
                    <div className="card-icon"><FolderTree size={24} /></div>
                    <div className="card-content">
                        <h3>GED</h3>
                        <p>Gestão Empresarial de Documentos, assinatura e controle de arquivos.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-kpis" 
                    className="menu-card green" 
                    onClick={() => handleModuleClick('kpis-hub')}
                >
                    <div className="card-icon"><ChartLine size={24} /></div>
                    <div className="card-content">
                        <h3>KPI'S</h3>
                        <p>Indicadores de desempenho, metas operacionais e dashboards analíticos.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <div 
                    className="menu-card teal" 
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                >
                    <div className="card-icon"><Clock size={24} /></div>
                    <div className="card-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <h3>CONTROLE DE PONTO</h3>
                            <span style={{ 
                                background: 'rgba(20, 184, 166, 0.2)', 
                                color: 'var(--accent-teal)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '6px', 
                                fontSize: '0.7rem', 
                                fontWeight: '700', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.5px' 
                            }}>
                                Em Breve
                            </span>
                        </div>
                        <p>Registro de jornada, espelho de ponto, banco de horas e justificativas.</p>
                    </div>
                    <Lock size={16} style={{ opacity: 0.5, marginRight: '1rem' }} />
                </div>

                <div 
                    className="menu-card red" 
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                >
                    <div className="card-icon"><ShoppingCart size={24} /></div>
                    <div className="card-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <h3>COMPRAS</h3>
                            <span style={{ 
                                background: 'rgba(239, 68, 68, 0.2)', 
                                color: 'var(--accent-red)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '6px', 
                                fontSize: '0.7rem', 
                                fontWeight: '700', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.5px' 
                            }}>
                                Em Breve
                            </span>
                        </div>
                        <p>Pedidos de compra, cotações de fornecedores, aprovações e recebimento.</p>
                    </div>
                    <Lock size={16} style={{ opacity: 0.5, marginRight: '1rem' }} />
                </div>

                <button 
                    id="btn-nav-juridico" 
                    className="menu-card orange" 
                    onClick={() => handleModuleClick('juridico-hub')}
                >
                    <div className="card-icon"><Gavel size={24} /></div>
                    <div className="card-content">
                        <h3>JURÍDICO</h3>
                        <p>Contratos, compliance, processos judiciais, certidões e IA jurídica.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-subprodutos" 
                    className="menu-card orange" 
                    onClick={() => handleModuleClick('subprodutos-hub')}
                >
                    <div className="card-icon"><FlaskConical size={24} /></div>
                    <div className="card-content">
                        <h3>SUB-PRODUTOS</h3>
                        <p>Fichas técnicas, ordens de produção e estoque de semi-acabados.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>

                <button 
                    id="btn-nav-settings" 
                    className="menu-card gray" 
                    onClick={() => handleModuleClick('settings')}
                >
                    <div className="card-icon"><Database size={24} /></div>
                    <div className="card-content">
                        <h3>CADASTROS</h3>
                        <p>Gerenciar funcionários, categorias, itens e fornecedores do sistema.</p>
                    </div>
                    <ChevronRight className="chevron" size={20} />
                </button>
            </div>
        </div>
    );
}
