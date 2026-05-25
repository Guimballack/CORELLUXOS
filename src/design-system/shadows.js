/**
 * DESIGN SYSTEM - SHADOWS TOKENS
 * Configurações de sombras para profundidade e o estilo característico 3D Keycap.
 * ========================================================================== */

export const shadows = {
    // Premium 3D Keycap Shadows System (Estilo de Botões Corellux)
    keycap: {
        default: '0 4px 0px #000000',     // Estado normal (Botão assentado com profundidade de 4px)
        hover: '0 5px 0px #000000',       // Estado de hover (Eleva ligeiramente e aumenta a profundidade)
        active: '0 1px 0px #000000',      // Estado de clique (Pressionado ao nível de 1px)
        color: '#000000',                 // Cor da sombra 3D rígida (preto absoluto)
        border: '1.5px solid #000000'     // Borda padrão que acompanha os botões 3D
    },

    // Standard Glow and Elevation Shadows (Para cartões e overlays)
    elevation: {
        sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
        md: '0 4px 12px rgba(0, 0, 0, 0.15)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.25)',
        xl: '0 16px 40px rgba(0, 0, 0, 0.35)',
    },

    // Glowing Effects (Neon lights)
    glow: {
        orange: '0 0 15px rgba(243, 107, 29, 0.15)',
        teal: '0 0 15px rgba(20, 184, 166, 0.15)',
        red: '0 0 15px rgba(239, 68, 68, 0.15)',
        green: '0 0 15px rgba(34, 197, 94, 0.15)',
    }
};

export default shadows;
