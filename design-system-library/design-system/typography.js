/**
 * DESIGN SYSTEM - TYPOGRAPHY TOKENS
 * Especificações tipográficas padrão do Corellux OS baseadas na fonte Google Inter.
 * ========================================================================== */

export const typography = {
    fontFamily: "'Inter', sans-serif",
    
    // Tamanhos de Fonte (Font Sizes)
    sizes: {
        xs: '0.75rem',    // 12px - Legendas e badges de status
        sm: '0.85rem',    // 13.6px - Textos secundários, tabelas e botões pequenos
        base: '0.95rem',  // 15.2px - Texto do corpo, inputs e botões padrão
        lg: '1.1rem',     // 17.6px - Títulos de cartões e cabeçalhos menores
        xl: '1.25rem',    // 20px - Subtítulos e títulos de seção
        '2xl': '1.5rem',  // 24px - Títulos de tela
        '3xl': '2rem',    // 32px - Títulos de destaque e banners
        '4xl': '2.5rem',  // 40px - Grandiosas interfaces e números chaves
    },

    // Espessuras (Font Weights)
    weights: {
        normal: '400',    // Corpo padrão
        medium: '500',    // Menus e descrições
        semibold: '600',  // Subtítulos e labels
        bold: '700',      // Cabeçalhos e botões
        black: '800',     // Títulos em destaque / Números de WMS
    },

    // Altura de Linha (Line Heights)
    lineHeights: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
    },

    // Espaçamento de Letras (Letter Spacings)
    letterSpacings: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
    }
};

export default typography;
