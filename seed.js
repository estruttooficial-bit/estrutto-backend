const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🏗️ Iniciando atualização do banco de dados Estrutto...')

  // 1. BUSCA DO ENGENHEIRO RESPONSÁVEL
  const engineer = await prisma.user.findUnique({
    where: { email: 'luandeleon@estrutto.com.br' }
  })

  if (!engineer) {
    console.error('❌ ERRO: Usuário Luan não encontrado. Verifique o banco!')
    return
  }

  // 2. LIMPEZA DE DADOS (Removendo Escola e resíduos antigos)
  console.log('🧹 Removendo obra da Escola e limpando cronogramas...')
  await prisma.obra.deleteMany({ where: { id: 303 } })

  // 3. OBRA MARCELO: Espaço Gourmet & Parrilla (55% Concluído)
  console.log('📊 Atualizando Marcelo...')
  const obraMarcelo = await prisma.obra.upsert({
    where: { id: 101 },
    update: { progress: 55, status: "em_andamento", estimatedEnd: "27/03/2026" },
    create: {
      id: 101,
      name: "Espaço Gourmet & Parrilla",
      clientName: "Marcelo",
      address: "Rua Professor Ulisses Cabral, 1121",
      status: "em_andamento",
      progress: 55,
      engineerId: engineer.id,
      startDate: "12/01/2026",
      estimatedEnd: "27/03/2026"
    }
  })

  await prisma.etapa.deleteMany({ where: { obraId: 101 } })
  await prisma.etapa.createMany({
    data: [
      { phase: "S1-S6: Concluídas", description: "PAGO: R$ 25.371,25 (55%). Infra e contrapisos finalizados.", status: "concluido", progress: 100, obraId: 101 },
      { phase: "S7: Steel Frame + Gás", description: "Vencimento: R$ 4.200,00 em 27/02. Montagem de estrutura.", status: "em_andamento", progress: 20, obraId: 101 },
      { phase: "S8: Revestimentos", description: "Vencimento: R$ 4.500,00 em 06/03. Piso e muro vizinho.", status: "pendente", progress: 0, obraId: 101 },
      { phase: "S9: Bancada Gourmet", description: "Vencimento: R$ 4.200,00 em 13/03. Churrasqueira e cuba.", status: "pendente", progress: 0, obraId: 101 },
      { phase: "S10: Acabamentos Extras", description: "Vencimento: R$ 5.100,00 em 20/03. Pedra moledo e vidro.", status: "pendente", progress: 0, obraId: 101 },
      { phase: "S11: Entrega Técnica", description: "Saldo Final: R$ 2.638,75 em 27/03. Limpeza e vistoria.", status: "pendente", progress: 0, obraId: 101 }
    ]
  })

  // 4. OBRA ROBERTO: Reforma Geral (Iniciando Amanhã)
  console.log('📊 Atualizando Roberto...')
  const obraRoberto = await prisma.obra.upsert({
    where: { id: 404 },
    update: { progress: 5, status: "em_andamento", estimatedEnd: "13/05/2026" },
    create: {
      id: 404,
      name: "Reforma Geral - Roberto",
      clientName: "Roberto e Wendel",
      address: "Porto Alegre, RS",
      status: "em_andamento",
      progress: 5,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "13/05/2026"
    }
  })

  await prisma.etapa.deleteMany({ where: { obraId: 404 } })
  await prisma.etapa.createMany({
    data: [
      { phase: "P1 e P2: Sinal + Início", description: "PAGO: R$ 8.950,00. Contrato e demolição iniciada.", status: "concluido", progress: 100, obraId: 404 },
      { phase: "P3: Fim Demolição", description: "Vencimento: R$ 2.250,00 em 26/02. Demolição aprovada.", status: "em_andamento", progress: 10, obraId: 404 },
      { phase: "P4: Infraestrutura", description: "Vencimento: R$ 2.250,00 em 10/03. Elétrica e Hidráulica.", status: "pendente", progress: 0, obraId: 404 },
      { phase: "P5: Estrutura", description: "Vencimento: R$ 4.500,00 em 24/03. Impermeabilização.", status: "pendente", progress: 0, obraId: 404 },
      { phase: "P6: Revestimentos", description: "Vencimento: R$ 4.500,00 em 14/04. Cerâmicas e Gesso.", status: "pendente", progress: 0, obraId: 404 },
      { phase: "P7: Acabamentos", description: "Vencimento: R$ 4.500,00 em 01/05. Portas e Pintura.", status: "pendente", progress: 0, obraId: 404 },
      { phase: "P8: Finalização", description: "Saldo Final: R$ 2.517,00 em 13/05. Entrega técnica.", status: "pendente", progress: 0, obraId: 404 }
    ]
  })

  // 5. OBRA PRISCILLA: Apto 906 (Financeiro Detalhado - R$ 24.800)
  console.log('📊 Atualizando Priscilla...')
  const obraPriscilla = await prisma.obra.upsert({
    where: { id: 202 },
    update: { progress: 10, status: "em_andamento", estimatedEnd: "25/03/2026" },
    create: {
      id: 202,
      name: "Reforma Residencial - Apto 906",
      clientName: "Priscilla Blattner",
      address: "Rua São Josemaria Escrivá, 740",
      status: "em_andamento",
      progress: 10,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "25/03/2026"
    }
  })

  await prisma.etapa.deleteMany({ where: { obraId: 202 } })
  await prisma.etapa.createMany({
    data: [
      { phase: "Início e Mobilização", description: "PAGO: R$ 2.480,00 (10%). Vencimento: R$ 6.000,00 em 23/02.", status: "em_andamento", progress: 15, obraId: 202 },
      { phase: "Semana 1: Demolição", description: "Vencimento: R$ 3.100,00 em 28/02. Preparação e Drywall.", status: "pendente", progress: 0, obraId: 202 },
      { phase: "Semana 2: Revestimentos", description: "Vencimento: R$ 3.500,00 em 07/03. Cerâmicas e elétrica.", status: "pendente", progress: 0, obraId: 202 },
      { phase: "Semana 3: Pintura 1ª Demão", description: "Vencimento: R$ 3.500,00 em 14/03. Nivelamento total.", status: "pendente", progress: 0, obraId: 202 },
      { phase: "Semana 4: Piso e Rodapé", description: "Vencimento: R$ 3.720,00 em 21/03. Vinílico e 2ª demão.", status: "pendente", progress: 0, obraId: 202 },
      { phase: "Semana 5: Entrega Final", description: "Saldo Final: R$ 3.980,00 em 25/03. Limpeza fina e vistoria.", status: "pendente", progress: 0, obraId: 202 }
    ]
  })

  console.log('✅ SEED FINALIZADO: Sistema Estrutto 100% atualizado!')
}

main()
  .catch((e) => {
    console.error('❌ ERRO AO RODAR SEED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })