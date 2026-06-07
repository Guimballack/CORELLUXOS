/**
 * Corellux OS - Main Application Component
 * Orquestra a exibição das telas com base no estado global (Router reativo).
 */

import React, { useEffect } from 'react';
import { useCorelluxState } from './store/corellux-state';
import { useTenant } from './store/tenant-context';
import Header from './components/Header';
import Login from './pages/Login';
import UserSelect from './pages/UserSelect';
import Dashboard from './pages/Dashboard';
import LogisticsHub from './pages/LogisticsHub';
import SettingsHub from './pages/SettingsHub';
import CentralHub from './pages/CentralHub';
import ChecklistHub from './pages/ChecklistHub';
import PatrimonioHub from './pages/PatrimonioHub';
import SubprodutosHub from './pages/SubprodutosHub';
import FinanceiroHub from './pages/FinanceiroHub';
import KpisHub from './pages/KpisHub';
import MasterHub from './pages/master/MasterHub';
import ModuloGuard from './components/ModuloGuard';
import { ArrowLeft } from 'lucide-react';

// Componente Placeholder para módulos em desenvolvimento
function PlaceholderModule({ name, description }) {
    const [state, setKey] = useCorelluxState(['currentScreen']);

    return (
        <div className="screen active with-header" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                marginTop: '1rem'
            }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--accent-orange)', marginBottom: '1rem' }}>
                    {name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: '1.6', marginBottom: '2rem' }}>
                    {description || 'Este módulo está sendo migrado para React e estará disponível em breve.'}
                </p>
                <div className="loader" style={{ 
                    border: '3px solid rgba(255,255,255,0.1)', 
                    borderTop: '3px solid var(--accent-orange)', 
                    borderRadius: '50%', 
                    width: '30px', 
                    height: '30px', 
                    animation: 'spin 1s linear infinite' 
                }} />
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}} />
            </div>
        </div>
    );
}

export default function App() {
    const [state, setKey, updatePartial] = useCorelluxState(['currentScreen', 'workstationAuthenticated', 'currentUser']);

    useEffect(() => {
        // Captura o parâmetro ?executeChecklist do QR Code na montagem
        const params = new URLSearchParams(window.location.search);
        const executeChecklist = params.get('executeChecklist');
        if (executeChecklist) {
            localStorage.setItem('pendingChecklistId', executeChecklist);
            // Limpa a URL para ficar limpa e profissional
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        // Se houver um checklist pendente e o usuário estiver totalmente autenticado (após passar pela validação de PIN), redireciona
        const pendingId = localStorage.getItem('pendingChecklistId');
        if (pendingId && state.workstationAuthenticated && state.currentUser) {
            // Evita burlar o PIN: só redireciona quando a tela atual não for de login ou seleção de usuário
            if (state.currentScreen !== 'login' && state.currentScreen !== 'user-select') {
                localStorage.removeItem('pendingChecklistId');
                localStorage.setItem('activeExecuteChecklistId', pendingId);
                updatePartial({
                    currentScreen: 'checklist-hub'
                });
            }
        }
    }, [state.workstationAuthenticated, state.currentUser, state.currentScreen, updatePartial]);

    const renderScreen = () => {
        switch (state.currentScreen) {
            case 'login':
                return <Login />;
            case 'user-select':
                return <UserSelect />;
            case 'dashboard':
                return <Dashboard />;

            // Painel Master (Super Administrador)
            case 'master-hub':
                return <MasterHub />;
            
            // Módulos operacionais com guards
            case 'logistics-hub':
                return <ModuloGuard modulo="estoque"><LogisticsHub /></ModuloGuard>;
            case 'central-hub':
                return <ModuloGuard modulo="checklist"><CentralHub /></ModuloGuard>;
            case 'checklist-hub':
                return <ModuloGuard modulo="checklist"><ChecklistHub /></ModuloGuard>;
            case 'patrimonio-hub':
                return <ModuloGuard modulo="patrimonio"><PatrimonioHub /></ModuloGuard>;
            case 'subprodutos-hub':
                return <ModuloGuard modulo="producao"><SubprodutosHub /></ModuloGuard>;
            case 'financeiro-hub':
                return <ModuloGuard modulo="financeiro"><FinanceiroHub /></ModuloGuard>;
            case 'ged-hub':
                return <ModuloGuard modulo="ged"><PlaceholderModule name="GED" description="Gestão Empresarial de Documentos e controle de assinaturas em migração para React." /></ModuloGuard>;
            case 'kpis-hub':
                return <ModuloGuard modulo="kpi"><KpisHub /></ModuloGuard>;
            case 'juridico-hub':
                return <ModuloGuard modulo="juridico"><PlaceholderModule name="JURÍDICO" description="Controle de contratos, processos e IA jurídica em migração para React." /></ModuloGuard>;
            case 'settings':
                return <SettingsHub />;
            
            default:
                return <Dashboard />;
        }
    };

    const hasHeader = state.currentScreen !== 'login' && state.currentScreen !== 'user-select';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Header />
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {renderScreen()}
            </main>
        </div>
    );
}
