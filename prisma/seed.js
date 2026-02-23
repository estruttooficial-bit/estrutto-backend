const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed completo Estrutto...')

  const senhaClientes = await bcrypt.hash('121314', 10)
  const senhaLuan = await bcrypt.hash('235863', 10)

  // Limpa tudo
  await prisma.rdo.deleteMany()
  await prisma.mensagem.deleteMany()
  await prisma.foto.deleteMany()
  await prisma.etapa.deleteMany()
  await prisma.obra.deleteMany()
  await prisma.user.deleteMany()

  // USUÁRIOS
  const luan = await prisma.user.create({
    data: {
      email: 'luandeleon@estrutto.com.br',
      password: senhaLuan,
      name: 'Luan de Leon',
      type: 'ENGINEER',
    }
  })

  await prisma.user.create({
    data: {
      email: 'apoio@estrutto.com.br',
      password: senhaClientes,
      name: 'Apoio Administrativo',
      type: 'ENGINEER',
    }
  })

  const roberto = await prisma.user.create({
    data: {
      email: 'roberto@estrutto.com.br',
      password: senhaClientes,
      name: 'Roberto',
      type: 'CLIENT',
    }
  })

  const priscilla = await prisma.user.create({
    data: {
      email: 'priscilla@estrutto.com.br',
      password: senhaClientes,
      name: 'Priscilla Blattner',
      type: 'CLIENT',
    }
  })

  const marcelo = await prisma.user.create({
    data: {
      email: 'marcelo@estrutto.com.br',
      password: senhaClientes,
      name: 'Marcelo Bronzatto',
      type: 'CLIENT',
    }
  })

  console.log('✅ Usuários criados')

  // OBRA 1: ROBERTO (7 etapas)
  const obraRoberto = await prisma.obra.create({
    data: {
      name: 'Reforma Residencial - Roberto',
      clientName: 'Roberto',
      address: 'Porto Alegre/RS',
      progress: 0,
      status: 'em_andamento',
      startDate: '23/02/2026',
      estimatedEnd: '03/05/2026',
      engineerId: luan.id,
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: 'S1: Demolição e Preparação', description: 'Remoção revestimentos, demolição parede cozinha, banheiro, forros, portas, limpeza', status: 'em_andamento', progress: 0, startDate: '23/02/2026', endDate: '02/03/2026', budget: 11200, spent: 0, obraId: obraRoberto.id },
      { phase: 'S2: Infraestrutura', description: 'Elétrica (rasgos, eletrodutos, quadro) e Hidráulica (tubulação, fechamentos)', status: 'pendente', progress: 0, startDate: '03/03/2026', endDate: '12/03/2026', budget: 13450, spent: 0, obraId: obraRoberto.id },
      { phase: 'S3: Contrapiso', description: 'Contrapiso cozinha, banheiro, sala, quartos e cura', status: 'pendente', progress: 0, startDate: '13/03/2026', endDate: '22/03/2026', budget: 17950, spent: 0, obraId: obraRoberto.id },
      { phase: 'S4: Impermeabilização e Gesso', description: 'Impermeabilização banheiro (2 demãos + teste 48h), gesso cozinha, área serviço, sanca', status: 'pendente', progress: 0, startDate: '23/03/2026', endDate: '05/04/2026', budget: 22450, spent: 0, obraId: obraRoberto.id },
      { phase: 'S5: Revestimentos Cerâmicos', description: 'Assentamento paredes e pisos banheiro, cozinha, área serviço, sala, quartos', status: 'pendente', progress: 0, startDate: '06/04/2026', endDate: '21/04/2026', budget: 26950, spent: 0, obraId: obraRoberto.id },
      { phase: 'S6: Portas e Pintura', description: 'Instalação portas, massa corrida, pintura fundo e demãos', status: 'pendente', progress: 0, startDate: '22/04/2026', endDate: '01/05/2026', budget: 29467, spent: 0, obraId: obraRoberto.id },
      { phase: 'S7: Finalização e Entrega', description: 'Instalações elétricas finais, luminárias, limpeza técnica, entrega', status: 'pendente', progress: 0, startDate: '02/05/2026', endDate: '05/05/2026', budget: 29467, spent: 0, obraId: obraRoberto.id },
    ]
  })

  // OBRA 2: PRISCILLA (6 etapas)
  const obraPriscilla = await prisma.obra.create({
    data: {
      name: 'Reforma Apto 906 - Priscilla Blattner',
      clientName: 'Priscilla Blattner',
      address: 'Rua São Josemaria Escrivá, 740 - Apto 906 - Porto Alegre/RS',
      progress: 0,
      status: 'em_andamento',
      startDate: '23/02/2026',
      estimatedEnd: '25/03/2026',
      engineerId: luan.id,
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: 'S0: Entrada', description: 'Assinatura contrato e pagamento entrada 10% - JÁ CONCLUÍDO', status: 'concluída', progress: 100, startDate: '06/01/2026', endDate: '06/01/2026', budget: 2480, spent: 2480, obraId: obraPriscilla.id },
      { phase: 'S1: Preparação e Demolição Leve', description: 'Proteção e mobilização, retirada rodapés, ajustes drywall, limpeza grossa', status: 'em_andamento', progress: 0, startDate: '23/02/2026', endDate: '28/02/2026', budget: 3100, spent: 0, obraId: obraPriscilla.id },
      { phase: 'S2: Revestimentos e Infraestrutura', description: 'Revestimentos cerâmicos (cozinha, sala, banheiro), reparos elétricos, cortineiro', status: 'pendente', progress: 0, startDate: '02/03/2026', endDate: '07/03/2026', budget: 3500, spent: 0, obraId: obraPriscilla.id },
      { phase: 'S3: Tratamento e Pintura (1ª Demão)', description: 'Tratamento de paredes (buracos, lixamento), pintura 1ª demão e selador', status: 'pendente', progress: 0, startDate: '09/03/2026', endDate: '14/03/2026', budget: 3500, spent: 0, obraId: obraPriscilla.id },
      { phase: 'S4: Pisos e Acabamentos Finais', description: 'Instalação piso vinílico (94m²), rodapés 10cm, pintura 2ª demão', status: 'pendente', progress: 0, startDate: '16/03/2026', endDate: '21/03/2026', budget: 3720, spent: 0, obraId: obraPriscilla.id },
      { phase: 'S5: Limpeza e Entrega Técnica', description: 'Limpeza fina de obra, vistoria final, entrega técnica com ART', status: 'pendente', progress: 0, startDate: '23/03/2026', endDate: '25/03/2026', budget: 3980, spent: 0, obraId: obraPriscilla.id },
    ]
  })

  // OBRA 3: MARCELO (11 etapas)
  const obraMarcelo = await prisma.obra.create({
    data: {
      name: 'Reforma Área Externa - Marcelo Bronzatto',
      clientName: 'Marcelo Bronzatto',
      address: 'Rua Professor Ulisses Cabral 1121, Porto Alegre/RS',
      progress: 55,
      status: 'em_andamento',
      startDate: '12/01/2026',
      estimatedEnd: '27/03/2026',
      engineerId: luan.id,
    }
  })

  await prisma.etapa.createMany({
    data: [
      { phase: 'S1: Preparação e Demolição', description: 'Proteções (lona, papelão), escada provisória, remoção deck, início descarte', status: 'concluída', progress: 100, startDate: '12/01/2026', endDate: '16/01/2026', budget: 9000, spent: 9000, obraId: obraMarcelo.id },
      { phase: 'S2: Demolição Pesada', description: 'Remoção piso, contrapiso piscina, remoção elementos piscina, preenchimento, compactação', status: 'concluída', progress: 100, startDate: '19/01/2026', endDate: '23/01/2026', budget: 9000, spent: 9200, obraId: obraMarcelo.id },
      { phase: 'S3: Infraestruturas', description: 'Pontos água fria, tubulações esgoto, caixa gordura, ralos, eletrodutos, iluminação jardim', status: 'concluída', progress: 100, startDate: '26/01/2026', endDate: '30/01/2026', budget: 9000, spent: 8900, obraId: obraMarcelo.id },
      { phase: 'S4: Contrapiso + Extras', description: 'Regularização, contrapiso caimentos, [EXTRA] ampliação muro, [EXTRA] contrapiso 11m²', status: 'concluída', progress: 100, startDate: '02/02/2026', endDate: '06/02/2026', budget: 12000, spent: 12500, obraId: obraMarcelo.id },
      { phase: 'S5: Impermeabilização + Muro', description: '1ª demão argamassa polimérica, [EXTRA] viga amarração muro, [EXTRA] 1ª demão muro', status: 'concluída', progress: 100, startDate: '09/02/2026', endDate: '13/02/2026', budget: 10000, spent: 10500, obraId: obraMarcelo.id },
      { phase: 'S6: Conclusão Impermeabilização', description: '2ª demão argamassa polimérica, tela poliestireno, [EXTRA] impermeabilização 11m², teste 48h', status: 'concluída', progress: 100, startDate: '17/02/2026', endDate: '21/02/2026', budget: 10000, spent: 9800, obraId: obraMarcelo.id },
      { phase: 'S7: Steel Frame + Infra Gás', description: '[EXTRA] Montagem steel frame (área hidro + casa máquinas), [EXTRA] infra gás, início revestimentos', status: 'em_andamento', progress: 10, startDate: '23/02/2026', endDate: '27/02/2026', budget: 15000, spent: 2000, obraId: obraMarcelo.id },
      { phase: 'S8: Revestimentos + Muro', description: 'Revestimentos porcelanato, [EXTRA] revestimento 11m², acabamentos hidráulicos, [EXTRA] reboco muro', status: 'pendente', progress: 0, startDate: '02/03/2026', endDate: '06/03/2026', budget: 12000, spent: 0, obraId: obraMarcelo.id },
      { phase: 'S9: Instalações + Bancada', description: 'Instalações elétricas (iluminação, tomadas, quadro), conexões gás, [EXTRA] bancada gourmet', status: 'pendente', progress: 0, startDate: '09/03/2026', endDate: '13/03/2026', budget: 14000, spent: 0, obraId: obraMarcelo.id },
      { phase: 'S10: Acabamentos + Vidro', description: '[EXTRA] Acabamentos muro fundos (chapa cimentícia, cimento queimado), [EXTRA] pedra moledo, [EXTRA] vidro porta', status: 'pendente', progress: 0, startDate: '16/03/2026', endDate: '20/03/2026', budget: 16000, spent: 0, obraId: obraMarcelo.id },
      { phase: 'S11: Revisões + Entrega', description: 'Revisão sistemas (elétrica, hidráulica, gás), testes finais, limpeza pós-obra, entrega técnica', status: 'pendente', progress: 0, startDate: '23/03/2026', endDate: '27/03/2026', budget: 8000, spent: 0, obraId: obraMarcelo.id },
    ]
  })

  console.log('✅ Seed completo finalizado!')
  console.log('📊 Total: 3 obras, 24 etapas')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })