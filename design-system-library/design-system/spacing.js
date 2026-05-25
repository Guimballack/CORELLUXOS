/**
 * DESIGN SYSTEM - SPACING TOKENS
 * Escala de espaçamento padrão para margens, preenchimentos e layouts no Corellux OS.
 * ========================================================================== */

export const spacing = {
    // Escala baseada em múltiplos de 4px / 0.25rem
    scale: {
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '2': '0.5rem',      // 8px
        '3': '0.75rem',     // 12px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '8': '2rem',        // 32px
        '10': '2.5rem',     // 40px
        '12': '3rem',       // 48px
        '16': '4rem',       // 64px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
    },

    // Layout Breakpoints (Responsividade)
    breakpoints: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
    },

    // Border Radius Tokens
    borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        default: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
    }
};

export default spacing;
