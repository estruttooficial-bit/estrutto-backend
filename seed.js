const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🏗️ Sincronizando Banco de Dados Estrutto...')

  // 1. HASH DAS SENHAS
  const engineerPasswordHash = await bcrypt.hash('235863', 10)
  const clientPasswordHash = await bcrypt.hash('121314', 10)

  // 2. LISTA DE CLIENTES
  const listaDeClientes = [
    { email: 'marcelo@estrutto.com.br', name: 'Marcelo' },
    { email: 'roberto@estrutto.com.br', name: 'Roberto' },
    { email: 'priscilla@estrutto.com.br', name: 'Priscilla Blattner' }
  ]

  // 3. CRIAR/ATUALIZAR ENGENHEIRO
  const engineer = await prisma.user.upsert({
    where: { email: 'luandeleon@estrutto.com.br' },
    update: { 
      name: 'Luan de Leon',
      password: engineerPasswordHash,
      type: 'ENGINEER'
    },
    create: {
      email: 'luandeleon@estrutto.com.br',
      name: 'Luan de Leon',
      password: engineerPasswordHash,
      type: 'ENGINEER'
    }
  })
  console.log(`✅ Engenheiro: ${engineer.name}`)

  // 4. CRIAR/ATUALIZAR CLIENTES
  for (const c of listaDeClientes) {
    const client = await prisma.user.upsert({
      where: { email: c.email },
      update: { 
        name: c.name,
        password: clientPasswordHash,
        type: 'CLIENT'
      },
      create: {
        email: c.email,
        name: c.name,
        password: clientPasswordHash,
        type: 'CLIENT'
      }
    })
    console.log(`✅ Cliente: ${client.name}`)
  }

  // 5. DELETAR OBRAS ANTIGAS
  await prisma.obra.deleteMany({
    where: { engineerId: engineer.id }
  })
  console.log('🗑️ Obras antigas removidas')

  // 6. OBRA PRISCILLA
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
      { phase: "S1: Início e Mobilização", description: "PAGAMENTO AMANHÃ: R$ 6.000,00. Proteção e organização.", status: "em_andamento", progress: 15, obraId: 202, budget: 6000, spent: 0 },
      { phase: "S2: Demolição", description: "Vencimento: R$ 3.100,00 em 28/02.", status: "pendente", progress: 0, obraId: 202, budget: 3100, spent: 0 }
    ]
  })
  console.log(`✅ Obra Priscilla criada: ${obraPriscilla.name}`)

  // 7. OBRA MARCELO
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
      { phase: "S7: Steel Frame + Gás", description: "Vencimento: R$ 4.200,00 em 27/02.", status: "em_andamento", progress: 20, obraId: 101, budget: 4200, spent: 0 }
    ]
  })
  console.log(`✅ Obra Marcelo criada: ${obraMarcelo.name}`)

  // 8. OBRA ROBERTO
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
      { phase: "P3: Fim Demolição", description: "Vencimento: R$ 2.250,00 em 26/02.", status: "em_andamento", progress: 10, obraId: 404, budget: 2250, spent: 0 }
    ]
  })
  console.log(`✅ Obra Roberto criada: ${obraRoberto.name}`)

  console.log('\n✨ SEED FINALIZADO COM SUCESSO!')
}

main()
  .catch((e) => { 
    console.error('❌ Erro no Seed:', e); 
    process.exit(1) 
  })
  .finally(async () => { 
    await prisma.$disconnect() 
  })