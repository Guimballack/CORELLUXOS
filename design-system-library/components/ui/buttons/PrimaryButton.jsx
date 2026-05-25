import React from 'react';
import './buttons.css';

/**
 * PrimaryButton Component (Corellux OS style)
 * Botão primário laranja 3D Keycap com suporte a ícones, loading, desabilitado e responsividade.
 *
 * Props:
 * - children: Conteúdo de texto do botão
 * - onClick: Handler de clique
 * - type: Tipo do botão ('button', 'submit', 'reset')
 * - disabled: Desabilita o botão
 * - loading: Exibe indicador de carregamento e desabilita interação
 * - icon: Elemento de ícone (ex: <Plus size={16} />)
 * - iconPosition: Posição do ícone ('left' ou 'right')
 * - fullWidth: Largura total (100%)
 * - className: Classes adicionais
 * - style: Estilo inline customizado
 */
export default function PrimaryButton({
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
            className={`ds-btn ds-btn-primary ${fullWidth ? 'ds-btn-full' : ''} ${loading ? 'ds-btn-loading' : ''} ${className}`}
            style={style}
            aria-busy={loading}
            {...props}
        >
            {loading ? (
                <>
                    <span className="ds-btn-spinner" aria-hidden="true" />
                    <span className="ds-btn-text">Carregando...</span>
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
