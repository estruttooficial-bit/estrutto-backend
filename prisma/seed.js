const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🏗️ Sincronizando Banco de Dados Estrutto...')

  // HASH DAS SENHAS
  const engineerHash = await bcrypt.hash('235863', 10)
  const clientHash = await bcrypt.hash('121314', 10)

  // ENGENHEIRO
  const engineer = await prisma.user.upsert({
    where: { email: 'luandeleon@estrutto.com.br' },
    update: { password: engineerHash },
    create: {
      email: 'luandeleon@estrutto.com.br',
      name: 'Luan de Leon',
      password: engineerHash,
      type: 'ENGINEER'
    }
  })
  console.log(`✅ Engenheiro: ${engineer.name}`)

  // APOIO
  await prisma.user.upsert({
    where: { email: 'apoio@estrutto.com.br' },
    update: { password: clientHash },
    create: {
      email: 'apoio@estrutto.com.br',
      name: 'Apoio Administrativo',
      password: clientHash,
      type: 'ENGINEER'
    }
  })
  console.log(`✅ Apoio criado`)

  // CLIENTES
  const clientes = [
    { email: 'marcelo@estrutto.com.br', name: 'Marcelo' },
    { email: 'roberto@estrutto.com.br', name: 'Roberto' },
    { email: 'priscilla@estrutto.com.br', name: 'Priscilla Blattner' }
  ]

  for (const c of clientes) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: { password: clientHash },
      create: { email: c.email, name: c.name, password: clientHash, type: 'CLIENT' }
    })
    console.log(`✅ Cliente: ${c.name}`)
  }

  // DELETAR OBRAS ANTIGAS
  await prisma.obra.deleteMany({ where: { engineerId: engineer.id } })

  // PRISCILLA - 6 ETAPAS (5 semanas)
  await prisma.obra.create({
    data: {
      id: 202,
      name: "Reforma Residencial - Apto 906",
      clientName: "Priscilla Blattner",
      address: "Rua São Josemaria Escrivá, 740 - Apto 906 - Porto Alegre/RS",
      status: "em_andamento",
      progress: 10,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "25/03/2026"
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: "S0: Entrada (Pré-Obra)", description: "Assinatura contrato e pagamento entrada 10% - JÁ CONCLUÍDO", status: "concluída", progress: 100, obraId: 202, budget: 2480, spent: 2480 },
      { phase: "S1: Preparação e Demolição Leve", description: "Proteção e mobilização, retirada rodapés, ajustes drywall, limpeza grossa", status: "em_andamento", progress: 10, obraId: 202, budget: 3100, spent: 0 },
      { phase: "S2: Revestimentos e Infraestrutura", description: "Revestimentos cerâmicos (cozinha, sala, banheiro), reparos elétricos churrasqueira, cortineiro", status: "pendente", progress: 0, obraId: 202, budget: 3500, spent: 0 },
      { phase: "S3: Tratamento e Pintura (1ª Demão)", description: "Tratamento de paredes (buracos, lixamento), pintura 1ª demão e selador", status: "pendente", progress: 0, obraId: 202, budget: 3500, spent: 0 },
      { phase: "S4: Pisos e Acabamentos Finais", description: "Instalação piso vinílico (94m²), rodapés 10cm, pintura 2ª demão final", status: "pendente", progress: 0, obraId: 202, budget: 3720, spent: 0 },
      { phase: "S5: Limpeza e Entrega Técnica", description: "Limpeza fina de obra, vistoria final, entrega técnica com ART", status: "pendente", progress: 0, obraId: 202, budget: 3980, spent: 0 }
    ]
  })
  console.log(`✅ Obra Priscilla criada (6 etapas)`)

  // MARCELO - 11 ETAPAS (6 concluídas, 1 em andamento, 4 pendentes)
  await prisma.obra.create({
    data: {
      id: 101,
      name: "Reforma Área Externa - Marcelo Bronzatto",
      clientName: "Marcelo Bronzatto",
      address: "Rua Professor Ulisses Cabral 1121, Porto Alegre/RS",
      status: "em_andamento",
      progress: 55,
      engineerId: engineer.id,
      startDate: "12/01/2026",
      estimatedEnd: "27/03/2026"
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: "S1: Preparação e Demolição Inicial", description: "Proteções (lona, papelão, barreira), escada provisória, remoção deck, início descarte", status: "concluída", progress: 100, obraId: 101, budget: 9000, spent: 9000 },
      { phase: "S2: Demolição Pesada", description: "Remoção piso existente, contrapiso piscina, remoção elementos piscina, preenchimento buraco, compactação", status: "concluída", progress: 100, obraId: 101, budget: 9000, spent: 9200 },
      { phase: "S3: Infraestruturas", description: "Pontos água fria, tubulações esgoto, caixa gordura, ralos, eletrodutos, iluminação jardim", status: "concluída", progress: 100, obraId: 101, budget: 9000, spent: 8900 },
      { phase: "S4: Contrapiso + Extras Iniciais", description: "Regularização fundo, contrapiso caimentos ralos, [EXTRA] ampliação muro estrutura, [EXTRA] contrapiso 11m²", status: "concluída", progress: 100, obraId: 101, budget: 12000, spent: 12500 },
      { phase: "S5: Impermeabilização + Estrutura Muro", description: "1ª demão argamassa polimérica, [EXTRA] viga amarração muro, [EXTRA] 1ª demão impermeabilização muro", status: "concluída", progress: 100, obraId: 101, budget: 10000, spent: 10500 },
      { phase: "S6: Conclusão Impermeabilização", description: "2ª demão argamassa polimérica, tela poliestireno, [EXTRA] impermeabilização 11m² adicional, teste 48h", status: "concluída", progress: 100, obraId: 101, budget: 10000, spent: 9800 },
      { phase: "S7: Steel Frame + Infra Gás", description: "[EXTRA] Montagem steel frame (área hidro + casa máquinas), [EXTRA] infraestrutura gás, início revestimentos", status: "em_andamento", progress: 10, obraId: 101, budget: 15000, spent: 2000 },
      { phase: "S8: Revestimentos + Acabamento Muro", description: "Revestimentos porcelanato, [EXTRA] revestimento 11m², acabamentos hidráulicos, [EXTRA] reboco muro vizinho", status: "pendente", progress: 0, obraId: 101, budget: 12000, spent: 0 },
      { phase: "S9: Instalações Elétricas + Bancada Gourmet", description: "Instalações elétricas (iluminação, tomadas, quadro), conexões gás, [EXTRA] bancada gourmet completa", status: "pendente", progress: 0, obraId: 101, budget: 14000, spent: 0 },
      { phase: "S10: Acabamentos Finais + Vidro", description: "[EXTRA] Acabamentos muro fundos (chapa cimentícia, cimento queimado), [EXTRA] pedra moledo, [EXTRA] vidro porta 4+4mm", status: "pendente", progress: 0, obraId: 101, budget: 16000, spent: 0 },
      { phase: "S11: Revisões + Entrega", description: "Revisão sistemas (elétrica, hidráulica, gás), testes finais, limpeza pós-obra, entrega técnica", status: "pendente", progress: 0, obraId: 101, budget: 8000, spent: 0 }
    ]
  })
  console.log(`✅ Obra Marcelo criada (11 etapas)`)

  // ROBERTO - 7 ETAPAS (70 dias)
  await prisma.obra.create({
    data: {
      id: 404,
      name: "Reforma Residencial - Roberto",
      clientName: "Roberto",
      address: "Porto Alegre/RS",
      status: "em_andamento",
      progress: 0,
      engineerId: engineer.id,
      startDate: "23/02/2026",
      estimatedEnd: "03/05/2026"
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: "S1: Demolição e Preparação", description: "Remoção revestimentos cozinha, demolição parede cozinha, banheiro, forros, portas, limpeza", status: "em_andamento", progress: 0, obraId: 404, budget: 11200, spent: 0 },
      { phase: "S2: Infraestrutura", description: "Elétrica (rasgos, eletrodutos, quadro) e Hidráulica (tubulação, fechamentos)", status: "pendente", progress: 0, obraId: 404, budget: 13450, spent: 0 },
      { phase: "S3: Contrapiso", description: "Contrapiso cozinha, banheiro, sala, quartos e cura", status: "pendente", progress: 0, obraId: 404, budget: 17950, spent: 0 },
      { phase: "S4: Impermeabilização e Gesso", description: "Impermeabilização banheiro (2 demãos + teste 48h), gesso cozinha, área serviço, sanca sala", status: "pendente", progress: 0, obraId: 404, budget: 22450, spent: 0 },
      { phase: "S5: Revestimentos Cerâmicos", description: "Assentamento paredes e pisos banheiro, cozinha, área serviço, sala, quartos", status: "pendente", progress: 0, obraId: 404, budget: 26950, spent: 0 },
      { phase: "S6: Portas e Pintura", description: "Instalação portas, massa corrida, pintura fundo e demãos", status: "pendente", progress: 0, obraId: 404, budget: 29467, spent: 0 },
      { phase: "S7: Finalização e Entrega", description: "Instalações elétricas finais, luminárias, limpeza técnica, entrega", status: "pendente", progress: 0, obraId: 404, budget: 29467, spent: 0 }
    ]
  })
  console.log(`✅ Obra Roberto criada (7 etapas)`)

  console.log('\n✨ SEED FINALIZADO!')
  console.log('📊 Total: 3 obras, 24 etapas')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })