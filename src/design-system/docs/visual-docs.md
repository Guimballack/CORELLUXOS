# Corellux OS - Design System Documentation

Este documento detalha o sistema de design visual do **Corellux OS**, focado no estilo **Premium 3D Keycap**, cores de contraste retro-modernas (Tema Escuro/Glassmorphism) e tipografia robusta.

---

## 🎨 Cores (Colors)

As variáveis CSS globais de cores são declaradas na tag `:root` do arquivo principal de estilo (`index.css`) e organizadas no módulo `/src/design-system/colors.js`.

### Fundo e Superfícies
*   **Fundo Principal (`--bg-main`)**: `#0a0f18` (Fundo geral profundo e escuro)
*   **Fundo de Cartões (`--bg-card`)**: `#131b27` (Painéis e containers secundários)
*   **Foco de Cartões (`--bg-card-hover`)**: `#1a2436` (Acentuação no estado de foco)
*   **Inputs (`--bg-input`)**: `#1b263b` (Fundo de campos de entrada)

### Textos
*   **Texto Principal (`--text-primary`)**: `#ffffff` (Máximo contraste)
*   **Texto Secundário (`--text-secondary`)**: `#94a3b8` (Legendas, rótulos e metadados)

### Cores de Destaque Semântico (Acentos)
*   **Laranja (`--accent-orange`)**: `#f36b1d` - Identidade visual principal da marca (usado no PrimaryButton).
*   **Vermelho (`--accent-red`)**: `#ef4444` - Exclusões, ações destrutivas e avisos críticos (DangerButton).
*   **Teal (`--accent-teal`)**: `#14b8a6` - Confirmações de sucesso secundárias (SuccessButton).
*   **Verde (`--accent-green`)**: `#22c55e` - Status ativos e finalizações normais.
*   **Roxo (`--accent-purple`)**: `#a855f7` - Destaques operacionais (módulo WMS e lotes).
*   **Amarelo (`--accent-yellow`)**: `#eab308` - Moderações e avisos de atenção.

---

## ✍️ Tipografia (Typography)

Adotamos a família de fontes **Inter** da Google Fonts como o padrão em todo o sistema.

### Tamanhos Padrão
*   `xs`: `0.75rem` (12px) - Status badges, pequenos contadores.
*   `sm`: `0.85rem` (13.6px) - Descrições de tabelas, botões menores.
*   `base`: `0.95rem` (15.2px) - Rótulos de formulários, botões padrão e corpo do texto.
*   `lg`: `1.1rem` (17.6px) - Títulos pequenos e modais.
*   `xl`: `1.25rem` (20px) - Títulos de cartões.
*   `2xl`: `1.5rem` (24px) - Títulos de telas operacionais.
*   `3xl`: `2.0rem` (32px) - Títulos de banners e dashboards principais.

### Espessuras (Weights)
*   `normal`: `400` - Texto de leitura padrão.
*   `semibold`: `600` - Destaques de subtítulos.
*   `bold`: `700` - Botões (`.ds-btn`), títulos fortes e cabeçalhos de tabela.
*   `black`: `800` - Títulos de destaque globais.

---

## 📏 Espaçamento (Spacing)

Baseamos o sistema em uma grade reativa de múltiplos de **4px / 0.25rem**.

*   `0.25rem` (4px) - Espaçamento mínimo entre textos e ícones.
*   `0.5rem` (8px) - Margem interna de pequenos cards de ação e badges.
*   `0.75rem` (12px) - Padding de botões compactos e inputs.
*   `1rem` (16px) - Espaçamento interno padrão de botões maiores e inputs de formulário.
*   `1.5rem` (24px) - Padding médio de tabelas e grids.
*   `2rem` (32px) - Padding padrão de telas principais e containers.

---

## 🎛️ Efeito 3D Keycap (Shadows)

O elemento de design assinatura do **Corellux OS** é o relevo tridimensional rígido presente em botões e modais.

### Composição do Efeito 3D
1.  **Borda Rígida**: Todos os botões possuem `border: 1.5px solid #000000;`.
2.  **Sombra de Relevo**: `box-shadow: 0 4px 0px #000000;`.
3.  **Transição Dinâmica**: No clique (`active`), o botão sofre uma translação e alteração na sombra para simular o clique físico de uma tecla mecânica.

### Estados
*   **Normal**: `transform: none; box-shadow: 0 4px 0px #000000;`
*   **Hover (Foco)**: `transform: translateY(-1px); box-shadow: 0 5px 0px #000000;`
*   **Active (Clique)**: `transform: translateY(3px); box-shadow: 0 1px 0px #000000;`
*   **Disabled (Bloqueado)**: `transform: none; box-shadow: none; border-color: rgba(0,0,0,0.4); opacity: 0.6;`

---

## 🚀 Como Copiar para Outros Projetos

Este Design System é totalmente desacoplado! Para migrar este sistema para outro projeto:
1.  Copie a pasta `/src/components/ui/buttons/` para o diretório de componentes do novo projeto.
2.  Garanta que o novo projeto possua as variáveis CSS de cores equivalentes declaradas no seu arquivo principal de estilos (ou customize os valores diretamente no `buttons.css`).
3.  Importe os botões normalmente:
    ```javascript
    import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
    ```
