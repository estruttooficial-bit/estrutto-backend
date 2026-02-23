const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Buscamos o seu usuário (Luan) para vincular às obras
  const engineer = await prisma.user.findUnique({
    where: { email: 'luandeleon@estrutto.com.br' }
  })

  if (!engineer) {
    console.error('❌ Usuário Luan não encontrado. Verifique o e-mail no banco!')
    return
  }

  // 2. Limpeza: Removendo a Escola para não aparecer no App
  await prisma.obra.deleteMany({ where: { id: 303 } })

  // 3. ATUALIZANDO OBRA: Marcelo (55% Concluído)
  const obraMarcelo = await prisma.obra.upsert({
    where: { id: 101 },
    update: {
      progress: 55,
      status: "em_andamento",
      estimatedEnd: "27/03/2026"
    },
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

  // Limpando e inserindo cronograma com foco em pagamentos (Marcelo)
  await prisma.etapa.deleteMany({ where: { obraId: 101 } })
  const etapasMarcelo = [
    { phase: "S1-S6: Etapas Concluídas", description: "RECEBIDO: R$ 25.371,25 (55%). Infra, contrapiso e demolições.", status: "concluido", progress: 100 },
    { phase: "S7: Steel Frame + Gás", description: "Vencimento: R$ 4.200,00 em 27/02. Montagem de estrutura e duto de gás.", status: "em_andamento", progress: 20 },
    { phase: "S8: Revestimentos", description: "Vencimento: R$ 4.500,00 em 06/03. Piso, rodapé e reboco muro vizinho.", status: "pendente", progress: 0 },
    { phase: "S9: Bancada Gourmet", description: "Vencimento: R$ 4.200,00 em 13/03. Churrasqueira, cuba e elétrica.", status: "pendente", progress: 0 },
    { phase: "S10: Acabamentos Extras", description: "Vencimento: R$ 5.100,00 em 20/03. Pedra moledo, muro e troca de vidro.", status: "pendente", progress: 0 },
    { phase: "S11: Entrega Final", description: "Saldo Final: R$ 2.638,75 em 27/03. Limpeza profunda e vistoria.", status: "pendente", progress: 0 }
  ]

  for (const etapa of etapasMarcelo) {
    await prisma.etapa.create({ data: { ...etapa, obraId: obraMarcelo.id } })
  }

  // 4. ATUALIZANDO OBRA: Roberto (Iniciando Amanhã)
  const obraRoberto = await prisma.obra.upsert({
    where: { id: 404 },
    update: {
      progress: 5,
      estimatedEnd: "05/05/2026"
    },
    create: {
      id: 404,
      name: "Reforma Geral - Roberto",
      clientName: "Roberto e Wendel",
      address: "Porto Alegre, RS",
      status: "em_andamento",
      progress: 5,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "05/05/2026"
    }
  })

  // Limpando e inserindo cronograma com parcelas revisadas (Roberto)
  await prisma.etapa.deleteMany({ where: { id: 404 } })
  const etapasRoberto = [
    { phase: "P1 e P2: Sinal + Início", description: "RECEBIDO: R$ 8.950,00. Contrato assinado e início da demolição.", status: "concluido", progress: 100 },
    { phase: "P3: Fim Demolição", description: "Vencimento: R$ 2.250,00 em 26/02. Demolição aprovada.", status: "em_andamento", progress: 10 },
    { phase: "P4: Infraestrutura", description: "Vencimento: R$ 2.250,00 em 10/03. Elétrica e Hidráulica (100%).", status: "pendente", progress: 0 },
    { phase: "P5: Estrutura", description: "Vencimento: R$ 4.500,00 em 24/03. Contrapiso e Impermeabilização.", status: "pendente", progress: 0 },
    { phase: "P6: Revestimentos", description: "Vencimento: R$ 4.500,00 em 14/04. Cerâmicas e Gesso.", status: "pendente", progress: 0 },
    { phase: "P7: Acabamentos", description: "Vencimento: R$ 4.500,00 em 01/05. Portas e Pintura.", status: "pendente", progress: 0 },
    { phase: "P8: Finalização", description: "Vencimento: R$ 2.517,00 em 13/05. Entrega técnica.", status: "pendente", progress: 0 }
  ]

  for (const etapa of etapasRoberto) {
    await prisma.etapa.create({ data: { ...etapa, obraId: obraRoberto.id } })
  }

  // 5. OBRA PRISCILLA (Apto 906 - Start Amanhã)
  const obraPriscilla = await prisma.obra.upsert({
    where: { id: 202 },
    update: { progress: 0 },
    create: {
      id: 202,
      name: "Reforma Residencial - Apto 906",
      clientName: "Priscilla Blattner",
      address: "Rua São Josemaria Escrivá, 740",
      status: "em_andamento",
      progress: 0,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "25/03/2026"
    }
  })

  await prisma.etapa.deleteMany({ where: { obraId: 202 } })
  const etapasPriscilla = [
    { phase: "S1: Preparação", description: "Proteção de áreas e retirada de rodapés.", status: "em_andamento", progress: 5 },
    { phase: "S2: Revestimentos", description: "Assentamento cerâmico e reparos elétricos.", status: "pendente", progress: 0 },
    { phase: "S3: Pintura Fase 1", description: "Nivelamento e 1ª demão de tinta.", status: "pendente", progress: 0 },
    { phase: "S4: Piso e Rodapé", description: "Instalação de 94m² de vinílico e rodapés 10cm.", status: "pendente", progress: 0 },
    { phase: "S5: Entrega", description: "Limpeza fina e vistoria técnica.", status: "pendente", progress: 0 }
  ]

  for (const etapa of etapasPriscilla) {
    await prisma.etapa.create({ data: { ...etapa, obraId: obraPriscilla.id } })
  }

  console.log('🚀 SEED FINALIZADO: Escola removida e finanças atualizadas!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })