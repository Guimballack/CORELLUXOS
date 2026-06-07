/**
 * Corellux OS — ModuloGuard Component
 * Protege rotas/módulos verificando se a empresa tem o módulo contratado.
 * v1.0.0
 */

import React from 'react';
import { useTenant } from '../store/tenant-context.jsx';
import { ShoppingCart, Lock } from 'lucide-react';

const MODULO_ICONS = {
    estoque:    '📦',
    producao:   '🏭',
    pdv:        '🛒',
    financeiro: '💰',
    fiscal:     '📄',
    checklist:  '✅',
    patrimonio: '🏷️',
    rh:         '👥',
    crm:        '❤️',
    delivery:   '🚚',
    ged:        '📁',
    kpi:        '📊',
};

const MODULO_NOMES = {
    estoque:    'Estoque & WMS',
    producao:   'Produção',
    pdv:        'PDV & Vendas',
    financeiro: 'Financeiro',
    fiscal:     'Fiscal & NF-e',
    checklist:  'Checklist',
    patrimonio: 'Patrimônio',
    rh:         'RH & Pessoas',
    crm:        'CRM & Clientes',
    delivery:   'Delivery',
    ged:        'GED & Documentos',
    kpi:        'KPIs & Analytics',
};

export default function ModuloGuard({ modulo, children }) {
    const { isModuloHabilitado, isMaster, empresaData } = useTenant();

    // Master sempre tem acesso
    if (isMaster || !modulo) return children;

    // Verifica se o módulo está habilitado
    if (isModuloHabilitado(modulo)) return children;

    // Tela de módulo não contratado
    const icon = MODULO_ICONS[modulo] || '🔒';
    const nome = MODULO_NOMES[modulo] || modulo;
    const planoAtual = empresaData?.planos?.nome || 'Atual';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '4rem 2rem',
            textAlign: 'center',
            gap: '1.5rem',
        }}>
            {/* Ícone principal */}
            <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))',
                border: '2px solid rgba(249,115,22,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
            }}>
                {icon}
            </div>

            {/* Badge de bloqueio */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: '100px',
                padding: '0.4rem 1rem',
                color: '#f97316',
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
            }}>
                <Lock size={12} />
                Módulo não contratado
            </div>

            {/* Título */}
            <div>
                <h2 style={{
                    fontSize: '1.8rem',
                    fontWeight: '800',
                    color: 'var(--text-primary, #fff)',
                    marginBottom: '0.5rem',
                }}>
                    {nome}
                </h2>
                <p style={{
                    color: 'var(--text-secondary, #94a3b8)',
                    fontSize: '0.95rem',
                    maxWidth: '420px',
                    lineHeight: '1.6',
                }}>
                    Este módulo não está incluído no seu plano <strong style={{ color: 'var(--accent-orange, #f97316)' }}>{planoAtual}</strong>.
                    Entre em contato com a equipe Corellux para fazer o upgrade.
                </p>
            </div>

            {/* Plano atual + CTA */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
            }}>
                <div style={{
                    background: 'var(--bg-card, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '12px',
                    padding: '1rem 2rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, #94a3b8)',
                }}>
                    Seu plano atual: <strong style={{ color: 'var(--text-primary, #fff)' }}>{planoAtual}</strong>
                </div>

                <button
                    onClick={() => {
                        // Abrir modal de upgrade ou link de suporte
                        window.open('mailto:comercial@corellux.com.br?subject=Upgrade de Plano - ' + nome, '_blank');
                    }}
                    style={{
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.85rem 2rem',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <ShoppingCart size={16} />
                    Contratar módulo
                </button>
            </div>
        </div>
    );
}
