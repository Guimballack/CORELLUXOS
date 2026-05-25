import React from 'react';
import './buttons.css';

/**
 * SuccessButton Component (Corellux OS style)
 * Botão verde/teal de sucesso/confirmação com padrão 3D Keycap.
 *
 * Props:
 * - children: Conteúdo de texto do botão
 * - onClick: Handler de clique
 * - type: Tipo do botão
 * - disabled: Desabilita o botão
 * - loading: Exibe carregamento
 * - icon: Elemento de ícone
 * - iconPosition: Posição do ícone ('left' ou 'right')
 * - fullWidth: Largura total (100%)
 * - className: Classes adicionais
 * - style: Estilo inline customizado
 */
export default function SuccessButton({
    children,
    onClick,
    type = 'button',
    disabled = false,
    loading = false,
    icon = null,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    style = {},
    ...props
}) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            className={`ds-btn ds-btn-success ${fullWidth ? 'ds-btn-full' : ''} ${loading ? 'ds-btn-loading' : ''} ${className}`}
            style={style}
            aria-busy={loading}
            {...props}
        >
            {loading ? (
                <>
                    <span className="ds-btn-spinner" aria-hidden="true" />
                    <span className="ds-btn-text">Salvando...</span>
                </>
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <span className="ds-btn-icon-left" style={{ marginRight: children ? '0.2rem' : '0' }}>{icon}</span>
                    )}
                    {children && <span className="ds-btn-text">{children}</span>}
                    {icon && iconPosition === 'right' && (
                        <span className="ds-btn-icon-right" style={{ marginLeft: children ? '0.2rem' : '0' }}>{icon}</span>
                    )}
                </>
            )}
        </button>
    );
}
