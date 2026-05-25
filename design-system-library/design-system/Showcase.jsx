import React, { useState } from 'react';
import { 
    ArrowLeft, 
    Copy, 
    Check, 
    Plus, 
    Trash2, 
    Save, 
    Play, 
    Code, 
    Palette, 
    Type, 
    Move, 
    Layers, 
    Info,
    HelpCircle,
    RotateCcw
} from 'lucide-react';
import { 
    PrimaryButton, 
    SecondaryButton, 
    DangerButton, 
    SuccessButton, 
    IconButton 
} from '../components/ui/buttons';

import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

export default function Showcase({ onBack }) {
    const [activeTab, setActiveTab] = useState('buttons'); // buttons, colors, typography, spacing, shadows
    const [copiedText, setCopiedText] = useState(null);

    // Playground States
    const [playVariant, setPlayVariant] = useState('primary'); // primary, secondary, danger, success, icon
    const [playText, setPlayText] = useState('Salvar Alterações');
    const [playState, setPlayState] = useState('normal'); // normal, disabled, loading
    const [playIcon, setPlayIcon] = useState('save'); // none, plus, save, trash
    const [playIconPos, setPlayIconPos] = useState('left'); // left, right
    const [playFullWidth, setPlayFullWidth] = useState(false);

    // Copy to clipboard helper
    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const getIconElement = (name) => {
        switch (name) {
            case 'plus': return <Plus size={16} />;
            case 'save': return <Save size={16} />;
            case 'trash': return <Trash2 size={16} />;
            default: return null;
        }
    };

    // Generate Code Snippet for Playground
    const generateCodeSnippet = () => {
        if (playVariant === 'icon') {
            const iconStr = playIcon !== 'none' ? `<${playIcon.charAt(0).toUpperCase() + playIcon.slice(1)} size={16} />` : '<HelpCircle size={16} />';
            return `<IconButton
    icon={${iconStr}}
    variant="secondary"
    title="Ação do Botão"${playState === 'disabled' ? '\n    disabled={true}' : ''}${playState === 'loading' ? '\n    loading={true}' : ''}
    onClick={() => console.log('Clicado!')}
/>`;
        }

        const componentName = 
            playVariant === 'primary' ? 'PrimaryButton' :
            playVariant === 'secondary' ? 'SecondaryButton' :
            playVariant === 'danger' ? 'DangerButton' : 'SuccessButton';

        const iconStr = playIcon !== 'none' ? `\n    icon={<${playIcon.charAt(0).toUpperCase() + playIcon.slice(1)} size={16} />}` : '';
        const iconPosStr = playIcon !== 'none' && playIconPos !== 'left' ? `\n    iconPosition="${playIconPos}"` : '';
        const disabledStr = playState === 'disabled' ? '\n    disabled={true}' : '';
        const loadingStr = playState === 'loading' ? '\n    loading={true}' : '';
        const fullWidthStr = playFullWidth ? '\n    fullWidth={true}' : '';

        return `<${componentName}${disabledStr}${loadingStr}${fullWidthStr}${iconStr}${iconPosStr}
    onClick={() => console.log('Salvo!')}
>
    ${playText}
</${componentName}>`;
    };

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
            {/* Header Showcase Bar */}
            <div className="screen-header-bar" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                background: 'rgba(19, 27, 39, 0.6)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {onBack && (
                        <button 
                            className="btn-back" 
                            onClick={onBack}
                            style={{ margin: 0 }}
                        >
                            <ArrowLeft size={16} /> VOLTAR
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            CORELLUX <span style={{ color: 'var(--accent-orange)' }}>DESIGN SYSTEM</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Componentes reutilizáveis e guia oficial de estilo e tokens visuais
                        </p>
                    </div>
                </div>

                {/* Local alert when copy success */}
                {copiedText && (
                    <div className="toast-copied" style={{
                        background: 'rgba(20, 184, 166, 0.15)',
                        border: '1.5px solid var(--accent-teal)',
                        boxShadow: '0 0 15px rgba(20, 184, 166, 0.25)',
                        color: 'var(--accent-teal)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <Check size={14} /> {copiedText} copiado com sucesso!
                    </div>
                )}
            </div>

            {/* Showcase Workspace Grid */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Lateral Tab Menu */}
                <div style={{ 
                    width: '240px', 
                    background: 'rgba(10, 15, 24, 0.7)',
                    borderRight: '1px solid var(--border-color)',
                    padding: '1.5rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <button 
                        onClick={() => setActiveTab('buttons')} 
                        className={`tab-nav-btn ${activeTab === 'buttons' ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'buttons' ? 'rgba(243, 107, 29, 0.1)' : 'transparent',
                            color: activeTab === 'buttons' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Play size={16} /> COMPONENTES (BOTÕES)
                    </button>
                    <button 
                        onClick={() => setActiveTab('colors')} 
                        className={`tab-nav-btn ${activeTab === 'colors' ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'colors' ? 'rgba(243, 107, 29, 0.1)' : 'transparent',
                            color: activeTab === 'colors' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Palette size={16} /> CORES (COLORS)
                    </button>
                    <button 
                        onClick={() => setActiveTab('typography')} 
                        className={`tab-nav-btn ${activeTab === 'typography' ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'typography' ? 'rgba(243, 107, 29, 0.1)' : 'transparent',
                            color: activeTab === 'typography' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Type size={16} /> TIPOGRAFIA
                    </button>
                    <button 
                        onClick={() => setActiveTab('spacing')} 
                        className={`tab-nav-btn ${activeTab === 'spacing' ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'spacing' ? 'rgba(243, 107, 29, 0.1)' : 'transparent',
                            color: activeTab === 'spacing' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Move size={16} /> ESPAÇAMENTO & RADIUS
                    </button>
                    <button 
                        onClick={() => setActiveTab('shadows')} 
                        className={`tab-nav-btn ${activeTab === 'shadows' ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: activeTab === 'shadows' ? 'rgba(243, 107, 29, 0.1)' : 'transparent',
                            color: activeTab === 'shadows' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Layers size={16} /> RELEVO & SOMBRAS 3D
                    </button>

                    <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '0.5rem' }}>Dica de Cópia</span>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            Copie o código-fonte de qualquer botão do Playground para seu projeto com apenas 1 clique.
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'var(--bg-main)' }}>
                    
                    {/* TAB 1: COMPONENTES / BOTÕES PLAYGROUND */}
                    {activeTab === 'buttons' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Standard Buttons catalog */}
                            <div>
                                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '800' }}>CATÁLOGO DE BOTÕES 3D KEYCAP</h2>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '1.5rem',
                                    background: 'var(--bg-card)', 
                                    padding: '1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>PRIMARY BUTTON (PRINCIPAL)</span>
                                        <PrimaryButton onClick={() => alert('Primário clicado!')}>SALVAR REGISTRO</PrimaryButton>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>SECONDARY BUTTON (SECUNDÁRIO)</span>
                                        <SecondaryButton onClick={() => alert('Secundário clicado!')}>VOLTAR AO MENU</SecondaryButton>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>SUCCESS BUTTON (CONFIRMAÇÃO/SALVAMENTO)</span>
                                        <SuccessButton onClick={() => alert('Sucesso clicado!')} icon={<Check size={16} />}>CONCLUIR CADASTRO</SuccessButton>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>DANGER BUTTON (RISCO/EXCLUSÃO)</span>
                                        <DangerButton onClick={() => alert('Perigo clicado!')} icon={<Trash2 size={16} />}>EXCLUIR LOTE</DangerButton>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>ICON BUTTON (COMPACTO)</span>
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            <IconButton icon={<Plus size={18} />} variant="primary" onClick={() => alert('Adicionar!')} title="Novo item" />
                                            <IconButton icon={<Trash2 size={18} />} variant="danger" onClick={() => alert('Remover!')} title="Excluir item" />
                                            <IconButton icon={<Save size={18} />} variant="success" onClick={() => alert('Salvar!')} title="Gravar dados" />
                                            <IconButton icon={<HelpCircle size={18} />} variant="secondary" onClick={() => alert('Ajuda!')} title="Suporte" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Interactive Playground */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Parameters Controls Panel */}
                                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>PLAYGROUND INTERATIVO</h3>
                                    
                                    {/* Variant selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem' }}>VARIANTE DO BOTÃO</label>
                                        <select 
                                            value={playVariant} 
                                            onChange={(e) => setPlayVariant(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white', fontWeight: '600' }}
                                        >
                                            <option value="primary">PrimaryButton</option>
                                            <option value="secondary">SecondaryButton</option>
                                            <option value="success">SuccessButton</option>
                                            <option value="danger">DangerButton</option>
                                            <option value="icon">IconButton</option>
                                        </select>
                                    </div>

                                    {/* Label Text */}
                                    {playVariant !== 'icon' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem' }}>TEXTO DO BOTÃO</label>
                                            <input 
                                                type="text" 
                                                value={playText} 
                                                onChange={(e) => setPlayText(e.target.value)}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'white' }}
                                            />
                                        </div>
                                    )}

                                    {/* State Selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem' }}>ESTADO DE COMPONENTES</label>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="state" checked={playState === 'normal'} onChange={() => setPlayState('normal')} /> Normal
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="state" checked={playState === 'disabled'} onChange={() => setPlayState('disabled')} /> Desabilitado
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="state" checked={playState === 'loading'} onChange={() => setPlayState('loading')} /> Carregando (Loading)
                                            </label>
                                        </div>
                                    </div>

                                    {/* Icon selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem' }}>ÍCONE INTEGRADO</label>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="icon" checked={playIcon === 'none'} onChange={() => setPlayIcon('none')} /> Sem Ícone
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="icon" checked={playIcon === 'plus'} onChange={() => setPlayIcon('plus')} /> <Plus size={14} /> Adicionar
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="icon" checked={playIcon === 'save'} onChange={() => setPlayIcon('save')} /> <Save size={14} /> Salvar
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                <input type="radio" name="icon" checked={playIcon === 'trash'} onChange={() => setPlayIcon('trash')} /> <Trash2 size={14} /> Excluir
                                            </label>
                                        </div>
                                    </div>

                                    {/* Icon Position */}
                                    {playVariant !== 'icon' && playIcon !== 'none' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem' }}>POSIÇÃO DO ÍCONE</label>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                    <input type="radio" name="iconPos" checked={playIconPos === 'left'} onChange={() => setPlayIconPos('left')} /> À Esquerda (Left)
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                    <input type="radio" name="iconPos" checked={playIconPos === 'right'} onChange={() => setPlayIconPos('right')} /> À Direita (Right)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Width Toggle */}
                                    {playVariant !== 'icon' && (
                                        <div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={playFullWidth} 
                                                    onChange={(e) => setPlayFullWidth(e.target.checked)} 
                                                />
                                                LARGURA CHEIA (fullWidth = 100%)
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Preview and Code Generation Panel */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Visual Preview */}
                                    <div style={{ 
                                        background: 'var(--bg-card)', 
                                        padding: '2rem', 
                                        borderRadius: '12px', 
                                        border: '1px solid var(--border-color)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '150px',
                                        position: 'relative'
                                    }}>
                                        <span style={{ position: 'absolute', top: '0.5rem', left: '0.75rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>VISUALIZAÇÃO EM TEMPO REAL</span>
                                        
                                        {/* Button render based on state */}
                                        <div style={{ width: playFullWidth ? '100%' : 'auto', textAlign: 'center' }}>
                                            {playVariant === 'primary' && (
                                                <PrimaryButton 
                                                    onClick={() => alert('Ação Executada!')}
                                                    disabled={playState === 'disabled'}
                                                    loading={playState === 'loading'}
                                                    icon={getIconElement(playIcon)}
                                                    iconPosition={playIconPos}
                                                    fullWidth={playFullWidth}
                                                >
                                                    {playText}
                                                </PrimaryButton>
                                            )}
                                            {playVariant === 'secondary' && (
                                                <SecondaryButton 
                                                    onClick={() => alert('Ação Executada!')}
                                                    disabled={playState === 'disabled'}
                                                    loading={playState === 'loading'}
                                                    icon={getIconElement(playIcon)}
                                                    iconPosition={playIconPos}
                                                    fullWidth={playFullWidth}
                                                >
                                                    {playText}
                                                </SecondaryButton>
                                            )}
                                            {playVariant === 'success' && (
                                                <SuccessButton 
                                                    onClick={() => alert('Ação Executada!')}
                                                    disabled={playState === 'disabled'}
                                                    loading={playState === 'loading'}
                                                    icon={getIconElement(playIcon)}
                                                    iconPosition={playIconPos}
                                                    fullWidth={playFullWidth}
                                                >
                                                    {playText}
                                                </SuccessButton>
                                            )}
                                            {playVariant === 'danger' && (
                                                <DangerButton 
                                                    onClick={() => alert('Ação Executada!')}
                                                    disabled={playState === 'disabled'}
                                                    loading={playState === 'loading'}
                                                    icon={getIconElement(playIcon)}
                                                    iconPosition={playIconPos}
                                                    fullWidth={playFullWidth}
                                                >
                                                    {playText}
                                                </DangerButton>
                                            )}
                                            {playVariant === 'icon' && (
                                                <IconButton 
                                                    onClick={() => alert('Ação Executada!')}
                                                    disabled={playState === 'disabled'}
                                                    loading={playState === 'loading'}
                                                    icon={playIcon !== 'none' ? getIconElement(playIcon) : <HelpCircle size={18} />}
                                                    variant="secondary"
                                                    title="Ação compacta"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Code Code Block */}
                                    <div style={{ 
                                        background: 'rgba(10, 15, 24, 0.95)', 
                                        borderRadius: '12px', 
                                        border: '1px solid var(--border-color)',
                                        overflow: 'hidden',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Code size={14} color="var(--accent-orange)" /> EXEMPLO DE USO EM REACT
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(generateCodeSnippet(), 'Código')}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '700' }}
                                                className="action-btn-sm edit"
                                            >
                                                <Copy size={12} /> COPIAR CÓDIGO
                                            </button>
                                        </div>
                                        <pre style={{ 
                                            margin: 0, 
                                            padding: '1.2rem', 
                                            fontFamily: 'Consolas, Courier New, monospace', 
                                            fontSize: '0.85rem', 
                                            color: '#f8f8f2', 
                                            overflowX: 'auto',
                                            lineHeight: '1.5',
                                            flex: 1
                                        }}>
                                            {generateCodeSnippet()}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CORES PALETTE */}
                    {activeTab === 'colors' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>PALETA DE CORES DO SISTEMA</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Clique em qualquer cor para copiar o código hexadecimal para a sua área de transferência.</p>
                            
                            {/* Colors Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Background Colors */}
                                <div>
                                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fundo e Superfícies (Backgrounds)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
                                        {Object.entries(colors.background).map(([key, val]) => (
                                            <div 
                                                key={key} 
                                                onClick={() => handleCopy(val, `HEX ${val}`)}
                                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                className="color-card"
                                            >
                                                <div style={{ height: '80px', background: val, borderBottom: '1px solid var(--border-color)' }}></div>
                                                <div style={{ padding: '0.8rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{key}</span>
                                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'white', marginTop: '0.2rem' }}>{val}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Colors */}
                                <div>
                                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Texto (Typography Colors)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
                                        {Object.entries(colors.text).map(([key, val]) => (
                                            <div 
                                                key={key} 
                                                onClick={() => handleCopy(val, `HEX ${val}`)}
                                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                                            >
                                                <div style={{ height: '80px', background: val, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: key === 'primary' ? 'black' : 'white', fontWeight: '800' }}>Aa</span>
                                                </div>
                                                <div style={{ padding: '0.8rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{key}</span>
                                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'white', marginTop: '0.2rem' }}>{val}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Accent Colors */}
                                <div>
                                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destaques e Status (Accents & Semantic)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem' }}>
                                        {Object.entries(colors.accent).map(([key, val]) => (
                                            <div 
                                                key={key} 
                                                onClick={() => handleCopy(val, `HEX ${val}`)}
                                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                                            >
                                                <div style={{ height: '80px', background: val, borderBottom: '1px solid var(--border-color)' }}></div>
                                                <div style={{ padding: '0.8rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{key}</span>
                                                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'white', marginTop: '0.2rem' }}>{val}</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: TYPOGRAPHY */}
                    {activeTab === 'typography' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>SISTEMA DE TIPOGRAFIA</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>A fonte padrão do Corellux OS é a **Inter** (Google Fonts). O guia abaixo detalha a hierarquia.</p>
                            
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Family */}
                                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>FAMÍLIA DA FONTE</span>
                                    <h3 style={{ fontFamily: typography.fontFamily, fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0 0.2rem 0' }}>{typography.fontFamily}</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>A, B, C, D, E, F, G, a, b, c, d, e, f, g, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, @, #, $, %</p>
                                </div>

                                {/* Sizes */}
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>ESCALA DE TAMANHOS DE FONTE</span>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <th style={{ padding: '0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>TOKEN</th>
                                                <th style={{ padding: '0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>TAMANHO</th>
                                                <th style={{ padding: '0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>EXEMPLO DE TEXTO</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(typography.sizes).map(([key, val]) => (
                                                <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '1rem 0', fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-orange)' }}>typography.sizes.{key}</td>
                                                    <td style={{ padding: '1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{val}</td>
                                                    <td style={{ padding: '1rem 0', fontSize: val, color: 'white', fontWeight: '600' }}>
                                                        A rápida raposa marrom salta sobre o cão preguiçoso
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SPACING & RADIUS */}
                    {activeTab === 'spacing' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>ESPAÇAMENTO & BORDAS</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Escala baseada em múltiplos de **4px** e classes de arredondamento de bordas padrão.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Spacing column */}
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: '800', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>ESCALA DE ESPAÇAMENTO</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {Object.entries(spacing.scale).slice(0, 8).map(([key, val]) => {
                                            const pixels = parseFloat(val) * 16;
                                            return (
                                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>spacing.scale.{key} ({val})</span>
                                                    <div style={{ height: '14px', width: `${pixels * 2}px`, background: 'var(--accent-orange)', borderRadius: '3px' }}></div>
                                                    <span style={{ fontSize: '0.8rem', color: 'white' }}>{pixels}px</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Border Radius column */}
                                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: '800', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>ARREDONDAMENTO DE BORDAS</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                        {Object.entries(spacing.borderRadius).slice(2, 6).map(([key, val]) => (
                                            <div 
                                                key={key} 
                                                style={{ 
                                                    background: 'rgba(255,255,255,0.02)', 
                                                    border: '1.5px solid var(--border-color)', 
                                                    borderRadius: val, 
                                                    padding: '1rem',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{key}</span>
                                                <strong style={{ fontSize: '0.9rem', color: 'white', display: 'block', marginTop: '0.3rem' }}>{val}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: SHADOWS */}
                    {activeTab === 'shadows' && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>EFEITOS E RELEVO 3D</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>O design tridimensional mecânico dos botões é alcançado combinando borda preta absoluta e sombras sólidas sem desfoque.</p>
                            
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>SIMULAÇÃO DE TOQUE MECÂNICO (3D KEYCAP)</h3>
                                
                                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', padding: '1rem 0' }}>
                                    {/* Normal state */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>ESTADO NORMAL</span>
                                        <div style={{ 
                                            background: 'var(--accent-orange)', 
                                            color: 'white', 
                                            fontWeight: '700', 
                                            padding: '1rem 2rem', 
                                            borderRadius: '8px', 
                                            border: '1.5px solid #000000',
                                            boxShadow: '0 4px 0px #000000',
                                            cursor: 'default'
                                        }}>
                                            ENTER
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Shadow: `0 4px 0px #000000`</small>
                                    </div>

                                    {/* Hover state */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>HOVER (SOBREPOSIÇÃO)</span>
                                        <div style={{ 
                                            background: 'var(--accent-orange)', 
                                            color: 'white', 
                                            fontWeight: '700', 
                                            padding: '1rem 2rem', 
                                            borderRadius: '8px', 
                                            border: '1.5px solid #000000',
                                            boxShadow: '0 5px 0px #000000',
                                            transform: 'translateY(-1px)',
                                            cursor: 'default'
                                        }}>
                                            ENTER
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>TranslateY: `-1px` | Shadow: `5px`</small>
                                    </div>

                                    {/* Active state */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>ACTIVE (CLICADO)</span>
                                        <div style={{ 
                                            background: 'var(--accent-orange)', 
                                            color: 'white', 
                                            fontWeight: '700', 
                                            padding: '1rem 2rem', 
                                            borderRadius: '8px', 
                                            border: '1.5px solid #000000',
                                            boxShadow: '0 1px 0px #000000',
                                            transform: 'translateY(3px)',
                                            cursor: 'default'
                                        }}>
                                            ENTER
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>TranslateY: `3px` | Shadow: `1px`</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
