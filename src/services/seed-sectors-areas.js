import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || 'https://wjejbsiuqyjwzepbzbwt.supabase.co';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const sectorsData = [
  { id: 1, name: 'ADMINISTRATIVO E FINANCEIRO', icon: 'fa-briefcase', color: 'color-purple', description: 'Setor administrativo, recursos humanos, financeiro e gerência geral.', status: 'Ativo' },
  { id: 2, name: 'SALÃO E ATENDIMENTO', icon: 'fa-utensils', color: 'color-teal', description: 'Setor de atendimento ao cliente no salão, recepção e coordenação de mesas.', status: 'Ativo' },
  { id: 3, name: 'DELIVERY', icon: 'fa-motorcycle', color: 'color-orange', description: 'Setor de atendimento de pedidos externos e entregas rápidas.', status: 'Ativo' },
  { id: 4, name: 'PRODUÇÃO', icon: 'fa-fire-burner', color: 'color-red', description: 'Setor de preparação de massas, pizzas, molhos e pratos da cozinha.', status: 'Ativo' },
  { id: 5, name: 'BAR', icon: 'fa-wine-bottle', color: 'color-lightblue', description: 'Setor de preparo de drinks, coquetéis e bebidas em geral.', status: 'Ativo' },
  { id: 6, name: 'ESTOQUE E SUPRIMENTOS', icon: 'fa-boxes-stacked', color: 'color-blue', description: 'Setor de recebimento, cotação, compras e controle de insumos.', status: 'Ativo' },
  { id: 7, name: 'SERVIÇOS GERAIS', icon: 'fa-spray-can', color: 'color-green', description: 'Setor de higienização, limpeza e conservação das instalações.', status: 'Ativo' }
];

const areasData = [
  // ADMINISTRATIVO E FINANCEIRO (sector_id = 1)
  { id: 1, name: 'Gerente de Pizzaria', description: 'Responsável pela administração geral da pizzaria, coordenando equipes, recursos e resultados.', sector_id: 1, status: 'Ativo', user_ids: [] },
  { id: 2, name: 'Supervisor de Turno', description: 'Responsável por supervisionar as operações durante seu turno de trabalho.', sector_id: 1, status: 'Ativo', user_ids: [] },
  { id: 3, name: 'Analista Administrativo', description: 'Responsável por atividades administrativas e suporte à gestão.', sector_id: 1, status: 'Ativo', user_ids: [] },
  { id: 4, name: 'Assistente Financeiro', description: 'Responsável pelo apoio às rotinas financeiras da empresa.', sector_id: 1, status: 'Ativo', user_ids: [] },

  // SALÃO E ATENDIMENTO (sector_id = 2)
  { id: 5, name: 'Maître', description: 'Responsável pela coordenação do salão e supervisão da equipe de atendimento.', sector_id: 2, status: 'Ativo', user_ids: [] },
  { id: 6, name: 'Recepcionista', description: 'Responsável pela recepção e organização da entrada dos clientes.', sector_id: 2, status: 'Ativo', user_ids: [] },
  { id: 7, name: 'Garçom', description: 'Responsável pelo atendimento direto aos clientes nas mesas.', sector_id: 2, status: 'Ativo', user_ids: [] },
  { id: 8, name: 'Cumim', description: 'Auxilia os garçons e apoia a organização do salão.', sector_id: 2, status: 'Ativo', user_ids: [] },
  { id: 9, name: 'Operador de Caixa', description: 'Responsável pelo controle das vendas e recebimentos da pizzaria.', sector_id: 2, status: 'Ativo', user_ids: [] },

  // DELIVERY (sector_id = 3)
  { id: 10, name: 'Atendente de Delivery', description: 'Responsável pelo recebimento e acompanhamento dos pedidos de entrega.', sector_id: 3, status: 'Ativo', user_ids: [] },
  { id: 11, name: 'Entregador', description: 'Responsável pela entrega dos pedidos aos clientes.', sector_id: 3, status: 'Ativo', user_ids: [] },

  // PRODUÇÃO (sector_id = 4)
  { id: 12, name: 'Pizzaiolo', description: 'Responsável pela preparação e finalização das pizzas.', sector_id: 4, status: 'Ativo', user_ids: [] },
  { id: 13, name: 'Auxiliar de Pizzaiolo', description: 'Auxilia o pizzaiolo na produção das pizzas.', sector_id: 4, status: 'Ativo', user_ids: [] },
  { id: 14, name: 'Cozinheiro', description: 'Responsável pelo preparo dos pratos e produtos da cozinha.', sector_id: 4, status: 'Ativo', user_ids: [] },
  { id: 15, name: 'Auxiliar de Cozinha', description: 'Presta apoio às atividades da cozinha.', sector_id: 4, status: 'Ativo', user_ids: [] },

  // BAR (sector_id = 5)
  { id: 16, name: 'Barman', description: 'Responsável pela preparação e serviço de bebidas.', sector_id: 5, status: 'Ativo', user_ids: [] },
  { id: 17, name: 'Auxiliar de Bar', description: 'Auxilia as atividades operacionais do bar.', sector_id: 5, status: 'Ativo', user_ids: [] },

  // ESTOQUE E SUPRIMENTOS (sector_id = 6)
  { id: 18, name: 'Estoquista', description: 'Responsável pelo controle e armazenamento de materiais e insumos.', sector_id: 6, status: 'Ativo', user_ids: [] },
  { id: 19, name: 'Comprador', description: 'Responsável pelas aquisições da empresa.', sector_id: 6, status: 'Ativo', user_ids: [] },

  // SERVIÇOS GERAIS (sector_id = 7)
  { id: 20, name: 'Auxiliar de Limpeza', description: 'Responsável pela limpeza e conservação das instalações.', sector_id: 7, status: 'Ativo', user_ids: [] }
];

async function runSeed() {
  try {
    console.log('--- Iniciando Seeding de Setores e Cargos ---');

    // 1. Limpar tabelas existentes
    console.log('Removendo áreas antigas...');
    const { error: delAreasError } = await supabase.from('areas').delete().neq('id', 0);
    if (delAreasError) throw delAreasError;

    console.log('Removendo setores antigos...');
    const { error: delSectorsError } = await supabase.from('sectors').delete().neq('id', 0);
    if (delSectorsError) throw delSectorsError;

    // 2. Inserir setores
    console.log('Inserindo novos setores...');
    const { error: insSectorsError } = await supabase.from('sectors').insert(sectorsData);
    if (insSectorsError) throw insSectorsError;
    console.log('Setores inseridos com sucesso.');

    // 3. Inserir áreas (cargos)
    console.log('Inserindo novos cargos (areas)...');
    const { error: insAreasError } = await supabase.from('areas').insert(areasData);
    if (insAreasError) throw insAreasError;
    console.log('Cargos (areas) inseridos com sucesso.');

    console.log('--- Seeding Finalizado com Sucesso! ---');
  } catch (error) {
    console.error('Erro durante o seeding:', error);
  }
}

runSeed();
