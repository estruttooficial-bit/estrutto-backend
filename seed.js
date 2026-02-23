const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🏗️ Sincronizando Banco de Dados Estrutto...')

  // 1. DEFINIÇÃO DA LISTA DE CLIENTES
  const listaDeClientes = [
    { email: 'marcelo@estrutto.com.br', name: 'Marcelo' },
    { email: 'roberto@estrutto.com.br', name: 'Roberto' },
    { email: 'priscilla@estrutto.com.br', name: 'Priscilla Blattner' }
  ]

  // 2. CRIAR/ATUALIZAR SEU USUÁRIO (ENGENHEIRO)
  const engineer = await prisma.user.upsert({
    where: { email: 'luandeleon@estrutto.com.br' },
    update: { 
      password: '235863' // Garante que a senha seja atualizada
    },
    create: {
      email: 'luandeleon@estrutto.com.br',
      name: 'Luan de Leon',
      password: '235863', 
      type: 'ENGINEER'
    }
  })

  // 3. CRIAR/ATUALIZAR USUÁRIOS DOS CLIENTES
  for (const c of listaDeClientes) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: { 
        password: '121314' // Garante que a senha seja atualizada
      },
      create: {
        email: c.email,
        name: c.name,
        password: '121314',
        type: 'CLIENT'
      }
    })
  }

  // 4. LIMPEZA DE OBRAS PARA EVITAR DUPLICADOS
  await prisma.obra.deleteMany({ where: { engineerId: engineer.id } })

  // 5. INSERINDO OBRA: PRISCILLA (Apto 906)
  const obraPriscilla = await prisma.obra.create({
    data: {
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

  await prisma.etapa.createMany({
    data: [
      { phase: "S1: Início e Mobilização", description: "PAGAMENTO AMANHÃ: R$ 6.000,00. Proteção e organização.", status: "em_andamento", progress: 15, obraId: 202 },
      { phase: "S2: Demolição", description: "Vencimento: R$ 3.100,00 em 28/02.", status: "pendente", progress: 0, obraId: 202 }
    ]
  })

  // 6. INSERINDO OBRA: MARCELO (Parrilla)
  const obraMarcelo = await prisma.obra.create({
    data: {
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

  await prisma.etapa.createMany({
    data: [
      { phase: "S7: Steel Frame + Gás", description: "Vencimento: R$ 4.200,00 em 27/02.", status: "em_andamento", progress: 20, obraId: 101 }
    ]
  })

  // 7. INSERINDO OBRA: ROBERTO
  const obraRoberto = await prisma.obra.create({
    data: {
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

  await prisma.etapa.createMany({
    data: [
      { phase: "P3: Fim Demolição", description: "Vencimento: R$ 2.250,00 em 26/02.", status: "em_andamento", progress: 10, obraId: 404 }
    ]
  })

  console.log('🚀 SEED FINALIZADO: Obras e Senhas atualizadas!')
}

main()
  .catch((e) => { 
    console.error('❌ Erro no Seed:', e); 
    process.exit(1) 
  })
  .finally(async () => { 
    await prisma.$disconnect() 
  })