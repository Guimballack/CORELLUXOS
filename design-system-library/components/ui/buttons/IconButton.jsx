import React from 'react';
import './buttons.css';

/**
 * IconButton Component (Corellux OS style)
 * Botão compacto de ícone com borda 3D Keycap e suporte a estados.
 *
 * Props:
 * - icon: Elemento de ícone (obrigatório, ex: <Trash2 size={16} />)
 * - onClick: Handler de clique
 * - type: Tipo do botão
 * - disabled: Desabilita o botão
 * - loading: Exibe carregamento (substitui o ícone por um spinner)
 * - variant: Variantes de cor ('primary', 'secondary', 'danger', 'success')
 * - className: Classes adicionais
 * - style: Estilos inline customizados
 * - title: Dica de ferramenta / Acessibilidade
 */
export default function IconButton({
    icon,
    onClick,
    type = 'button',
    disabled = false,
    loading = false,
    variant = 'secondary',
    className = '',
    style = {},
    title = '',
    ...props
}) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            className={`ds-btn ds-btn-icon ds-btn-${variant} ${loading ? 'ds-btn-loading' : ''} ${className}`}
            style={style}
            title={title}
            aria-label={title || 'botão de ação'}
            aria-busy={loading}
            {...props}
        >
            {loading ? (
                <span className="ds-btn-spinner" aria-hidden="true" style={{ marginRight: 0 }} />
            ) : (
                <span className="ds-btn-icon-left" style={{ marginRight: 0 }}>{icon}</span>
            )}
        </button>
    );
}
