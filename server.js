require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const http = require('http')
const { Server } = require('socket.io')
const cloudinary = require('cloudinary').v2
const { PrismaClient } = require('@prisma/client')
const multer = require('multer')
const streamifier = require('streamifier')
const RDOAgent = require('./services/rdoAgent')
const WeeklyAgent = require('./services/weeklyAgent')

// ─── INICIALIZAÇÃO ───
const app = express()
const server = http.createServer(app)
const io = new Server(server, { 
  cors: { origin: process.env.FRONTEND_URL || '*' } 
})
const prisma = new PrismaClient()

// ─── CONFIGURAÇÃO CLOUDINARY ───
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// ─── MIDDLEWARE ───
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb' }))

// Multer para upload em memória
const upload = multer({ storage: multer.memoryStorage() })

const JWT_SECRET = process.env.JWT_SECRET || 'estrutto-secret-2024'
const PORT = process.env.PORT || 3001

// ─── MIDDLEWARE DE AUTENTICAÇÃO ───
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token não fornecido' })
    
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' })
  }
}

// ─── AUTENTICAÇÃO ───
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, type: user.type, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    res.json({
      token,
      user: { id: user.id, name: user.name, type: user.type, email: user.email }
    })
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// ─── OBRAS ───
// GET todas as obras (FILTRA POR TIPO DE USUÁRIO)
app.get('/api/obras', authMiddleware, async (req, res) => {
  try {
    const user = req.user
    let whereClause = {}
    
    if (user.type === 'ENGINEER') {
      whereClause = { userId: user.id }
    } else if (user.type === 'APOIO' || user.type === 'FUNCIONARIO') {
      whereClause = {} // Apoio e Funcionário veem todas as obras
    } else {
      // Cliente vê obras onde o nome está em clientName
      whereClause = {
        clientName: {
          contains: user.name,
          mode: 'insensitive'
        }
      }
    }
    
    const obras = await prisma.obra.findMany({
      where: whereClause,
      include: { 
        user: true,  // ✅ ADICIONADO: inclui dados do usuário/engenheiro
        etapas: true, 
        fotos: true,
        mensagens: true,  // ✅ ADICIONADO
        rdos: true,       // ✅ ADICIONADO
        _count: { select: { mensagens: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    res.json(obras)
  } catch (error) {
    console.error('Erro ao buscar obras:', error)
    res.status(500).json({ error: 'Erro ao buscar obras' })
  }
})

// GET uma obra específica com todos os dados
app.get('/api/obras/:id', authMiddleware, async (req, res) => {
  try {
    const obra = await prisma.obra.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        etapas: { orderBy: { createdAt: 'asc' } },
        fotos: { orderBy: { createdAt: 'desc' } },
        mensagens: { 
          include: { user: { select: { id: true, name: true, type: true } } },
          orderBy: { createdAt: 'desc' }
        },
        rdos: { orderBy: { date: 'desc' } },
        user: { select: { id: true, name: true, email: true } }  // ✅ CORRIGIDO: engineer → user
      }
    })
    
    if (!obra) return res.status(404).json({ error: 'Obra não encontrada' })
    
    // Verifica permissão: se for cliente, só vê se for o cliente da obra
    if (req.user.type === 'CLIENT') {
      const isClient = obra.clientName.toLowerCase().includes(req.user.name.toLowerCase())
      if (!isClient) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }
    
    res.json(obra)
  } catch (error) {
    console.error('Erro ao buscar obra:', error)
    res.status(500).json({ error: 'Erro ao buscar obra' })
  }
})

// POST criar obra
app.post('/api/obras', authMiddleware, async (req, res) => {
  try {
    const { name, clientName, address, startDate, estimatedEnd } = req.body
    
    const obra = await prisma.obra.create({
      data: {
        name,
        clientName,
        address,
        startDate,
        estimatedEnd,
        userId: req.user.id,  // ✅ CORRIGIDO: engineerId → userId
        status: 'em_andamento',
        progress: 0
      }
    })
    
    io.emit('obra:criada', obra)
    res.status(201).json(obra)
  } catch (error) {
    console.error('Erro ao criar obra:', error)
    res.status(500).json({ error: 'Erro ao criar obra' })
  }
})

// PUT atualizar obra
app.put('/api/obras/:id', authMiddleware, async (req, res) => {
  try {
    const { name, clientName, address, status, progress, startDate, estimatedEnd } = req.body
    
    const obra = await prisma.obra.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(clientName && { clientName }),
        ...(address && { address }),
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(startDate && { startDate }),
        ...(estimatedEnd && { estimatedEnd })
      }
    })
    
    io.emit('obra:atualizada', obra)
    res.json(obra)
  } catch (error) {
    console.error('Erro ao atualizar obra:', error)
    res.status(500).json({ error: 'Erro ao atualizar obra' })
  }
})

// DELETE obra
app.delete('/api/obras/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.obra.delete({
      where: { id: parseInt(req.params.id) }
    })
    
    io.emit('obra:deletada', { id: parseInt(req.params.id) })
    res.json({ message: 'Obra deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar obra:', error)
    res.status(500).json({ error: 'Erro ao deletar obra' })
  }
})

// ─── ETAPAS ───
// GET etapas de uma obra
app.get('/api/obras/:obraId/etapas', authMiddleware, async (req, res) => {
  try {
    const etapas = await prisma.etapa.findMany({
      where: { obraId: parseInt(req.params.obraId) },
      orderBy: { createdAt: 'asc' }
    })
    res.json(etapas)
  } catch (error) {
    console.error('Erro ao buscar etapas:', error)
    res.status(500).json({ error: 'Erro ao buscar etapas' })
  }
})

// POST criar etapa
app.post('/api/etapas', authMiddleware, async (req, res) => {
  try {
    const { obraId, phase, description, status, progress, budget } = req.body
    
    const etapa = await prisma.etapa.create({
      data: {
        obraId,
        phase,
        description,
        status: status || 'pendente',
        progress: progress || 0,
        budget: budget || 0
      }
    })
    
    io.emit('etapa:criada', etapa)
    res.status(201).json(etapa)
  } catch (error) {
    console.error('Erro ao criar etapa:', error)
    res.status(500).json({ error: 'Erro ao criar etapa' })
  }
})

// PUT atualizar etapa
app.put('/api/etapas/:id', authMiddleware, async (req, res) => {
  try {
    const { phase, description, status, progress, budget, spent, startDate, endDate } = req.body
    
    const etapa = await prisma.etapa.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(phase && { phase }),
        ...(description && { description }),
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(budget !== undefined && { budget }),
        ...(spent !== undefined && { spent }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      }
    })
    
    io.emit('etapa:atualizada', etapa)
    res.json(etapa)
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error)
    res.status(500).json({ error: 'Erro ao atualizar etapa' })
  }
})

// DELETE etapa
app.delete('/api/etapas/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.etapa.delete({
      where: { id: parseInt(req.params.id) }
    })
    
    io.emit('etapa:deletada', { id: parseInt(req.params.id) })
    res.json({ message: 'Etapa deletada' })
  } catch (error) {
    console.error('Erro ao deletar etapa:', error)
    res.status(500).json({ error: 'Erro ao deletar etapa' })
  }
})

// ─── FOTOS COM CLOUDINARY ───
// GET fotos de uma obra
app.get('/api/obras/:obraId/fotos', authMiddleware, async (req, res) => {
  try {
    const fotos = await prisma.foto.findMany({
      where: { obraId: parseInt(req.params.obraId) },
      orderBy: { createdAt: 'desc' }
    })
    res.json(fotos)
  } catch (error) {
    console.error('Erro ao buscar fotos:', error)
    res.status(500).json({ error: 'Erro ao buscar fotos' })
  }
})

// POST upload de foto para Cloudinary
app.post('/api/fotos/upload', authMiddleware, upload.single('foto'), async (req, res) => {
  try {
    const { obraId, caption, category } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' })
    }

    // Upload para Cloudinary
    const cloudinaryUpload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'estrutto/obras',
          resource_type: 'auto',
          tags: [`obra_${obraId}`, 'foto']
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      streamifier.createReadStream(req.file.buffer).pipe(stream)
    })

    // Salvar referência no banco
    const foto = await prisma.foto.create({
      data: {
        obraId: parseInt(obraId),
        url: cloudinaryUpload.secure_url,
        caption: caption || '',
        category: category || 'geral',
        date: new Date().toLocaleDateString('pt-BR')
      }
    })

    io.emit('foto:criada', foto)
    res.status(201).json(foto)
  } catch (error) {
    console.error('Erro ao fazer upload de foto:', error)
    res.status(500).json({ error: 'Erro ao fazer upload de foto' })
  }
})

// DELETE foto
app.delete('/api/fotos/:id', authMiddleware, async (req, res) => {
  try {
    const foto = await prisma.foto.findUnique({
      where: { id: parseInt(req.params.id) }
    })

    if (!foto) return res.status(404).json({ error: 'Foto não encontrada' })

    // Deletar do Cloudinary usando o public_id
    const publicId = foto.url.split('/').pop().split('.')[0]
    await cloudinary.uploader.destroy(`estrutto/obras/${publicId}`)

    // Deletar do banco
    await prisma.foto.delete({
      where: { id: parseInt(req.params.id) }
    })

    io.emit('foto:deletada', { id: parseInt(req.params.id) })
    res.json({ message: 'Foto deletada' })
  } catch (error) {
    console.error('Erro ao deletar foto:', error)
    res.status(500).json({ error: 'Erro ao deletar foto' })
  }
})

// ─── MENSAGENS EM TEMPO REAL ───
// GET mensagens de uma obra
app.get('/api/obras/:obraId/mensagens', authMiddleware, async (req, res) => {
  try {
    const mensagens = await prisma.mensagem.findMany({
      where: { obraId: parseInt(req.params.obraId) },
      include: { user: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(mensagens)
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    res.status(500).json({ error: 'Erro ao buscar mensagens' })
  }
})

// POST criar mensagem
app.post('/api/mensagens', authMiddleware, async (req, res) => {
  try {
    const { obraId, content } = req.body
    
    const mensagem = await prisma.mensagem.create({
      data: {
        obraId,
        content,
        userId: req.user.id
      },
      include: { user: { select: { id: true, name: true, type: true } } }
    })
    
    io.emit('mensagem:nova', mensagem)
    res.status(201).json(mensagem)
  } catch (error) {
    console.error('Erro ao criar mensagem:', error)
    res.status(500).json({ error: 'Erro ao criar mensagem' })
  }
})

// ─── RDO (RELATÓRIO DIÁRIO DE OBRA) ───
// GET RDOs de uma obra
app.get('/api/obras/:obraId/rdos', authMiddleware, async (req, res) => {
  try {
    const obraId = parseInt(req.params.obraId)
    const tipo = req.user.type
    const rdos = await prisma.rDO.findMany({
      where: {
        obraId,
        ...(tipo === 'APOIO' && { userId: req.user.id }),
        ...((tipo === 'CLIENT' || tipo === 'FUNCIONARIO') && { user: { type: 'ENGINEER' } }),
        // ENGINEER vê todos
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' }
    })
    // CLIENT e FUNCIONARIO não recebem versão interna
    if (tipo === 'CLIENT' || tipo === 'FUNCIONARIO') {
      res.json(rdos.map(r => ({ ...r, versaoInterna: undefined, relatorioTecnico: undefined })))
    } else {
      res.json(rdos)
    }
  } catch (error) {
    console.error('Erro ao buscar RDOs:', error)
    res.status(500).json({ error: 'Erro ao buscar RDOs' })
  }
})

// POST criar RDO (auto-processa com IA quando status = 'enviado')
app.post('/api/rdos', authMiddleware, async (req, res) => {
  try {
    const { obraId, date, content, status } = req.body
    const statusFinal = status || 'rascunho'

    const rdo = await prisma.rDO.create({
      data: {
        obraId,
        date,
        content,
        userId: req.user.id,
        status: statusFinal,
        ...(statusFinal === 'enviado' && { statusAgente: 'PROCESSANDO' })
      },
      include: {
        user: { select: { id: true, name: true } },
        obra: { select: { name: true } }
      }
    })

    io.emit('rdo:criada', rdo)
    res.status(201).json(rdo)

    // Dispara processamento IA em background (não bloqueia a resposta)
    if (statusFinal === 'enviado' && process.env.ANTHROPIC_API_KEY) {
      processarRdoComIA(rdo.id, content, rdo.obra?.name).catch(err =>
        console.error('Erro background IA RDO:', err)
      )
    }
  } catch (error) {
    console.error('Erro ao criar RDO:', error)
    res.status(500).json({ error: 'Erro ao criar RDO' })
  }
})

// Função de processamento IA em background
async function processarRdoComIA(rdoId, contentStr, obraName) {
  try {
    let rdoData
    try { rdoData = JSON.parse(contentStr) } catch { rdoData = { atividades: contentStr } }

    const nivel = RDOAgent.classificarNivel(rdoData)
    const startTime = Date.now()

    if (nivel === 2) {
      // Tenta gerar perguntas
      const resultado = await RDOAgent.gerarPerguntas(rdoData)
      if (resultado.precisaPerguntas && resultado.perguntas?.length) {
        const tokens = resultado._tokens || {}
        await prisma.rDO.update({
          where: { id: rdoId },
          data: {
            nivel,
            statusAgente: 'AGUARDANDO_RESPOSTAS',
            perguntas: resultado.perguntas,
            tokensUsados: tokens,
            custoProcessamento: RDOAgent.calcularCusto(tokens.input || 0, tokens.output || 0),
          }
        })
        io.emit('rdo:aguardando_respostas', { rdoId, perguntas: resultado.perguntas })
        return
      }
      // Se não precisou de perguntas, processa direto como Nível 1
    }

    let resultado
    if (nivel === 3) {
      resultado = await RDOAgent.processarNivel3(rdoData, obraName)
    } else {
      resultado = await RDOAgent.processarNivel1(rdoData, obraName)
    }

    const tokens = resultado._tokens || {}
    const tempoProcessamento = (Date.now() - startTime) / 1000

    await prisma.rDO.update({
      where: { id: rdoId },
      data: {
        nivel,
        statusAgente: 'PROCESSADO',
        versaoInterna: resultado.versaoInterna,
        versaoCliente: resultado.versaoCliente,
        ...(resultado.relatorioTecnico && { relatorioTecnico: resultado.relatorioTecnico }),
        tokensUsados: tokens,
        custoProcessamento: RDOAgent.calcularCusto(tokens.input || 0, tokens.output || 0),
        processadoEm: new Date(),
      }
    })

    io.emit('rdo:processado', { rdoId, nivel })
    console.log(`✅ RDO ${rdoId} processado pela IA (Nível ${nivel}, $${RDOAgent.calcularCusto(tokens.input || 0, tokens.output || 0).toFixed(4)})`)
  } catch (err) {
    console.error(`❌ Erro IA RDO ${rdoId}:`, err.message)
    await prisma.rDO.update({
      where: { id: rdoId },
      data: { statusAgente: 'ERRO' }
    }).catch(() => {})
    io.emit('rdo:erro_ia', { rdoId })
  }
}

// POST responder perguntas (Nível 2)
app.post('/api/rdo/answer', authMiddleware, async (req, res) => {
  try {
    const { rdoId, respostas } = req.body
    if (!rdoId || !respostas?.length) {
      return res.status(400).json({ error: 'rdoId e respostas são obrigatórios' })
    }

    const rdo = await prisma.rDO.findUnique({
      where: { id: parseInt(rdoId) },
      include: { obra: { select: { name: true } } }
    })

    if (!rdo) return res.status(404).json({ error: 'RDO não encontrado' })
    if (rdo.statusAgente !== 'AGUARDANDO_RESPOSTAS') {
      return res.status(400).json({ error: 'RDO não está aguardando respostas' })
    }

    // Marca como processando e retorna imediatamente
    await prisma.rDO.update({
      where: { id: rdo.id },
      data: { statusAgente: 'PROCESSANDO', respostas }
    })

    res.json({ ok: true, message: 'Respostas recebidas, processando...' })

    // Processa em background
    ;(async () => {
      try {
        let rdoData
        try { rdoData = JSON.parse(rdo.content) } catch { rdoData = { atividades: rdo.content } }

        const startTime = Date.now()
        const resultado = await RDOAgent.processarComRespostas(rdoData, rdo.perguntas, respostas, rdo.obra?.name)
        const tokens = resultado._tokens || {}

        await prisma.rDO.update({
          where: { id: rdo.id },
          data: {
            statusAgente: 'PROCESSADO',
            versaoInterna: resultado.versaoInterna,
            versaoCliente: resultado.versaoCliente,
            tokensUsados: tokens,
            custoProcessamento: (rdo.custoProcessamento || 0) + RDOAgent.calcularCusto(tokens.input || 0, tokens.output || 0),
            processadoEm: new Date(),
          }
        })

        io.emit('rdo:processado', { rdoId: rdo.id, nivel: rdo.nivel })
      } catch (err) {
        console.error(`❌ Erro IA resposta RDO ${rdo.id}:`, err.message)
        await prisma.rDO.update({ where: { id: rdo.id }, data: { statusAgente: 'ERRO' } }).catch(() => {})
        io.emit('rdo:erro_ia', { rdoId: rdo.id })
      }
    })()
  } catch (error) {
    console.error('Erro ao processar respostas:', error)
    res.status(500).json({ error: 'Erro ao processar respostas' })
  }
})

// GET status do processamento IA de um RDO
app.get('/api/rdo/status/:id', authMiddleware, async (req, res) => {
  try {
    const rdo = await prisma.rDO.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        statusAgente: true,
        nivel: true,
        perguntas: true,
        versaoInterna: true,
        versaoCliente: true,
        relatorioTecnico: true,
        custoProcessamento: true,
        tokensUsados: true,
        processadoEm: true,
      }
    })
    if (!rdo) return res.status(404).json({ error: 'RDO não encontrado' })
    res.json(rdo)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar status' })
  }
})

// DELETE apagar RDO (somente ENGINEER)
app.delete('/api/rdos/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'ENGINEER') {
      return res.status(403).json({ error: 'Apenas engenheiros podem apagar RDOs' })
    }
    await prisma.rDO.delete({ where: { id: parseInt(req.params.id) } })
    io.emit('rdo:deletado', { id: parseInt(req.params.id) })
    res.json({ message: 'RDO apagado' })
  } catch (error) {
    console.error('Erro ao apagar RDO:', error)
    res.status(500).json({ error: 'Erro ao apagar RDO' })
  }
})

// PUT atualizar RDO (enviar, aprovar, etc)
app.put('/api/rdos/:id', authMiddleware, async (req, res) => {
  try {
    const { content, status } = req.body
    
    const rdo = await prisma.rDO.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(content && { content }),
        ...(status && { status })
      },
      include: { user: { select: { id: true, name: true } } }
    })
    
    io.emit('rdo:atualizada', rdo)
    res.json(rdo)
  } catch (error) {
    console.error('Erro ao atualizar RDO:', error)
    res.status(500).json({ error: 'Erro ao atualizar RDO' })
  }
})

// POST corrigir versão cliente do RDO via IA (somente ENGINEER)
app.post('/api/rdo/:id/corrigir-cliente', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'ENGINEER') {
      return res.status(403).json({ error: 'Apenas engenheiros podem corrigir RDOs' })
    }

    const { instrucao } = req.body
    if (!instrucao?.trim()) return res.status(400).json({ error: 'Instrução de correção obrigatória' })

    const rdo = await prisma.rDO.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { obra: { select: { name: true } } }
    })
    if (!rdo) return res.status(404).json({ error: 'RDO não encontrado' })
    if (!rdo.versaoCliente) return res.status(400).json({ error: 'RDO ainda não possui versão cliente gerada' })

    const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: require('@anthropic-ai/sdk') }))
    const anthropic = new (require('@anthropic-ai/sdk'))({ apiKey: process.env.ANTHROPIC_API_KEY })

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `Você é o Agente RDO da Estrutto Engenharia Ltda. Aplique correções pontuais na versão cliente de um RDO conforme instruído pelo engenheiro. Retorne APENAS o JSON da versaoCliente corrigida, sem markdown externo.`,
      messages: [{
        role: 'user',
        content: `Corrija a versão cliente deste RDO conforme a instrução abaixo.

## INSTRUÇÃO DO ENGENHEIRO
${instrucao}

## VERSÃO CLIENTE ATUAL
${JSON.stringify(rdo.versaoCliente, null, 2)}

## DADOS ORIGINAIS DO RDO
${rdo.content}

Retorne apenas o JSON da versaoCliente corrigida, mantendo toda a estrutura e apenas aplicando a correção solicitada.`
      }]
    })

    const texto = msg.content[0].text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const versaoClienteCorrigida = JSON.parse(texto)

    const rdoAtualizado = await prisma.rDO.update({
      where: { id: rdo.id },
      data: { versaoCliente: versaoClienteCorrigida },
      include: { user: { select: { id: true, name: true } } }
    })

    io.emit('rdo:atualizada', rdoAtualizado)
    console.log(`✅ RDO ${rdo.id} versão cliente corrigida pelo engenheiro`)
    res.json(rdoAtualizado)
  } catch (error) {
    console.error('Erro ao corrigir RDO cliente:', error)
    res.status(500).json({ error: 'Erro ao corrigir versão cliente' })
  }
})

// ─── RELATÓRIO SEMANAL (IA) ───
// POST /api/obras/:obraId/relatorio-semanal
// Body: { semana: 'S8', dataInicio: '02/03/2026', dataFim: '07/03/2026' }  (datas opcionais)
app.post('/api/obras/:obraId/relatorio-semanal', authMiddleware, async (req, res) => {
  try {
    if (req.user.type !== 'ENGINEER') {
      return res.status(403).json({ error: 'Apenas engenheiros podem gerar relatórios semanais' })
    }

    const obraId = parseInt(req.params.obraId)
    const { semana, dataInicio, dataFim } = req.body

    const obra = await prisma.obra.findUnique({ where: { id: obraId } })
    if (!obra) return res.status(404).json({ error: 'Obra não encontrada' })

    // Busca RDOs da semana (filtra por data se fornecido, senão pega todos os enviados)
    const rdos = await prisma.rDO.findMany({
      where: {
        obraId,
        status: 'enviado',
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' }
    })

    // Filtra por período se fornecido
    let rdosFiltrados = rdos
    if (dataInicio && dataFim) {
      const parseDate = (str) => {
        const [d, m, y] = str.split('/')
        return new Date(y, m - 1, d)
      }
      const inicio = parseDate(dataInicio)
      const fim = parseDate(dataFim)
      rdosFiltrados = rdos.filter(r => {
        const data = parseDate(r.date)
        return data >= inicio && data <= fim
      })
    }

    if (rdosFiltrados.length === 0) {
      return res.status(400).json({ error: 'Nenhum RDO enviado encontrado para o período informado' })
    }

    const semanaLabel = semana || `S${new Date().toISOString().slice(0, 10)}`
    const startTime = Date.now()
    const resultado = await WeeklyAgent.gerarRelatorioSemanal(rdosFiltrados, obra.name, semanaLabel)
    const tokens = resultado._tokens || {}
    const custo = WeeklyAgent.calcularCusto(tokens.input || 0, tokens.output || 0)
    const tempo = (Date.now() - startTime) / 1000

    console.log(`✅ Relatório semanal ${semanaLabel} – ${obra.name} gerado ($${custo.toFixed(4)}, ${tempo.toFixed(1)}s)`)

    res.json({
      obraId,
      obraName: obra.name,
      semana: semanaLabel,
      rdosIncluidos: rdosFiltrados.length,
      custo,
      ...resultado,
      _tokens: undefined
    })
  } catch (error) {
    console.error('Erro ao gerar relatório semanal:', error)
    res.status(500).json({ error: error.message || 'Erro ao gerar relatório semanal' })
  }
})

// ─── SOCKET.IO EM TEMPO REAL ───
io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`)
  
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`)
  })
  
  // Quando um cliente entra em uma obra
  socket.on('obra:join', (obraId) => {
    socket.join(`obra:${obraId}`)
    console.log(`👁️ Usuário entrou na obra ${obraId}`)
  })
  
  socket.on('obra:leave', (obraId) => {
    socket.leave(`obra:${obraId}`)
  })

  // Mensagem em tempo real
  socket.on('mensagem:enviar', async (data) => {
    const { obraId, content, userId } = data
    const mensagem = await prisma.mensagem.create({
      data: { obraId, content, userId },
      include: { user: { select: { id: true, name: true, type: true } } }
    })
    io.to(`obra:${obraId}`).emit('mensagem:nova', mensagem)
  })
})

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '469008d',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL via Prisma',
    storage: 'Cloudinary'
  })
})

// ─── ROTA TEMPORÁRIA PARA SEED ───
app.get('/api/run-seed', async (req, res) => {
  if (req.query.key !== 'estrutto2026') {
    return res.status(401).json({ error: 'Chave incorreta' })
  }

  try {
    const bcrypt = require('bcryptjs')
    
    // Limpar dados antigos
    await prisma.rDO.deleteMany()
    await prisma.mensagem.deleteMany()
    await prisma.foto.deleteMany()
    await prisma.etapa.deleteMany()
    await prisma.obra.deleteMany()
    await prisma.user.deleteMany()
    
    console.log('🧹 Dados antigos limpos')

    // Criar usuários
    const senhaClientes = await bcrypt.hash('121314', 10)
    const senhaLuan = await bcrypt.hash('235863', 10)
    const senhaApoio = await bcrypt.hash('121314', 10)

    const luan = await prisma.user.create({
      data: {
        email: 'luandeleon@estrutto.com.br',
        password: senhaLuan,
        name: 'Luan de Leon',
        type: 'ENGINEER',
      }
    })

    const apoio = await prisma.user.create({
      data: {
        email: 'apoio@estrutto.com.br',
        password: senhaApoio,
        name: 'Apoio Administrativo',
        type: 'APOIO',
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

    // Criar obra de exemplo para o Marcelo
    const obra = await prisma.obra.create({
      data: {
        name: 'Reforma Área Externa - Marcelo Bronzatto',
        clientName: 'Marcelo Bronzatto',
        address: 'Rua Professor Ulisses Cabral 1121, Porto Alegre/RS',
        userId: luan.id,
        status: 'em_andamento',
        progress: 64,
        startDate: '12/01/2026',
        estimatedEnd: '27/03/2026'
      }
    })

    console.log('✅ Obra criada')

    // Criar etapas do cronograma com dados financeiros reais
    await prisma.etapa.createMany({
      data: [
        {
          obraId: obra.id,
          phase: 'S1-S6: Trabalhos Iniciais',
          description: 'Demolição, impermeabilização, estrutura steel frame hidro, instalações iniciais',
          startDate: '12/01/2026',
          endDate: '21/02/2026',
          budget: 25371.25,
          spent: 25371.25,
          status: 'concluída',
          progress: 100
        },
        {
          obraId: obra.id,
          phase: 'S7: Estrutura e Fechamentos',
          description: 'Steel frame 100% concluído, bancada gourmet estruturada, chapas cimentícias e placas OSB instaladas',
          startDate: '23/02/2026',
          endDate: '28/02/2026',
          budget: 4500.00,
          spent: 4500.00,
          status: 'concluída',
          progress: 100
        },
        {
          obraId: obra.id,
          phase: 'S8: Pedra Moledo e Infraestrutura',
          description: 'Pedra Moledo (antecipada), infraestrutura de gás completa, revestimento bancada gourmet, limpeza grossa',
          startDate: '02/03/2026',
          endDate: '06/03/2026',
          budget: 4300.00,
          spent: 0,
          status: 'em_andamento',
          progress: 20
        },
        {
          obraId: obra.id,
          phase: 'S9: Estrutura e Revestimentos',
          description: 'Estrutura muro fundos, piso porcelanato área principal + 11m², rejuntamento, proteção do piso',
          startDate: '09/03/2026',
          endDate: '13/03/2026',
          budget: 4100.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obra.id,
          phase: 'S10: Acabamentos Finos',
          description: 'Cimento queimado muro fundos, instalações elétricas completas, sistema de gás, pinturas paredes laterais, arremates',
          startDate: '16/03/2026',
          endDate: '20/03/2026',
          budget: 5100.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obra.id,
          phase: 'S11: Entrega',
          description: 'Troca vidro porta (1,23x2,35m laminado 4+4mm), revisão geral, limpeza pós-obra, check-list, entrega técnica ao cliente',
          startDate: '23/03/2026',
          endDate: '27/03/2026',
          budget: 2638.75,
          spent: 0,
          status: 'pendente',
          progress: 0
        }
      ]
    })

    console.log('✅ Etapas Marcelo criadas')

    // ─── OBRA PRISCILLA BLATTNER ───
    const obraPri = await prisma.obra.create({
      data: {
        name: 'Reforma Residencial – Apto 906 – Priscilla Blattner',
        clientName: 'Priscilla Blattner',
        address: 'Rua São Josemaria Escrivá, 740 – Apto 906, Jardim do Salso – Porto Alegre/RS',
        userId: luan.id,
        status: 'em_andamento',
        progress: 32,
        startDate: '23/02/2026',
        estimatedEnd: '25/03/2026'
      }
    })

    await prisma.etapa.createMany({
      data: [
        {
          obraId: obraPri.id,
          phase: 'S1: Preparação e Demolição',
          description: 'Proteção e mobilização, retirada de rodapés, ajustes em drywall, limpeza grossa. Adiantado: tratamento de paredes (sala) e primer no contrapiso concluídos',
          startDate: '23/02/2026',
          endDate: '28/02/2026',
          budget: 0,
          spent: 0,
          status: 'em_andamento',
          progress: 80
        },
        {
          obraId: obraPri.id,
          phase: 'S2: Revestimentos Cerâmicos e Infraestrutura',
          description: 'Instalação de revestimentos cerâmicos (cozinha, sala e banheiro). Reparos elétricos e acabamento de cortineiro conforme contrato',
          startDate: '02/03/2026',
          endDate: '07/03/2026',
          budget: 0,
          spent: 0,
          status: 'em_andamento',
          progress: 0
        },
        {
          obraId: obraPri.id,
          phase: 'S3: Tratamento de Superfícies e Pintura (1ª Demão)',
          description: 'Fechamento de buracos, lixamento e nivelamento em todo apartamento. Aplicação de selador e 1ª demão de tinta nas cores escolhidas',
          startDate: '09/03/2026',
          endDate: '14/03/2026',
          budget: 0,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraPri.id,
          phase: 'S4: Pisos e Acabamentos Finais',
          description: 'Instalação de piso vinílico (94m²), instalação de rodapés novos (10cm), pintura 2ª demão e retoques finais',
          startDate: '16/03/2026',
          endDate: '21/03/2026',
          budget: 0,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraPri.id,
          phase: 'S5: Entrega Técnica',
          description: 'Limpeza fina de obra, vistoria final pelo Eng. Civil Luan de Leon, emissão de ART e assinatura do Termo de Recebimento de Obra',
          startDate: '23/03/2026',
          endDate: '25/03/2026',
          budget: 0,
          spent: 0,
          status: 'pendente',
          progress: 0
        }
      ]
    })

    console.log('✅ Obra Priscilla criada')

    // ─── OBRA ROBERTO (WENDEL E ROBERTO) ───
    const obraRob = await prisma.obra.create({
      data: {
        name: 'Reforma Residencial – Wendel e Roberto',
        clientName: 'Roberto',
        address: 'Porto Alegre/RS',
        userId: luan.id,
        status: 'em_andamento',
        progress: 14,
        startDate: '23/02/2026',
        estimatedEnd: '05/05/2026'
      }
    })

    await prisma.etapa.createMany({
      data: [
        {
          obraId: obraRob.id,
          phase: 'Fase 1: Demolição e Preparação',
          description: 'Demolição revestimentos cozinha e banheiro, retirada de forros e portas, limpeza, demarcação técnica e revisão geral. Inclui aditivo parede cozinha (R$ 1.800)',
          startDate: '23/02/2026',
          endDate: '02/03/2026',
          budget: 11200.00,
          spent: 8950.00,
          status: 'concluída',
          progress: 100
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 2: Infraestrutura',
          description: 'Abertura de rasgos e instalação de eletrodutos, fechamento elétrica, tubulação hidráulica cozinha, quadro de distribuição, testes elétricos e preparação de contrapiso',
          startDate: '03/03/2026',
          endDate: '12/03/2026',
          budget: 2250.00,
          spent: 0,
          status: 'em_andamento',
          progress: 10
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 3: Contrapisos',
          description: 'Execução de contrapisos em cozinha, banheiro, sala e quartos. Cura, proteção e preparação das bases para revestimentos',
          startDate: '13/03/2026',
          endDate: '22/03/2026',
          budget: 4500.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 4: Impermeabilização e Gesso',
          description: 'Impermeabilização banheiro (2 demãos + teste 48h), estrutura e placas de gesso em cozinha, banheiro e área de serviço, sanca sala com infraestrutura LED',
          startDate: '23/03/2026',
          endDate: '05/04/2026',
          budget: 4500.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 5: Revestimentos Cerâmicos',
          description: 'Chapisco, assentamento e rejuntamento de azulejos e pisos em banheiro, cozinha, área de serviço, sala e quartos',
          startDate: '06/04/2026',
          endDate: '21/04/2026',
          budget: 4500.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 6: Portas e Pintura',
          description: 'Instalação de portas e batentes, massa corrida em paredes e tetos, pintura fundo, 1ª e 2ª demão e acabamentos',
          startDate: '22/04/2026',
          endDate: '01/05/2026',
          budget: 0,
          spent: 0,
          status: 'pendente',
          progress: 0
        },
        {
          obraId: obraRob.id,
          phase: 'Fase 7: Finalização e Entrega',
          description: 'Instalações elétricas finais e luminárias, limpeza técnica, vistoria pelo Eng. Civil Luan de Leon, ajustes finais e entrega com Termo de Recebimento',
          startDate: '02/05/2026',
          endDate: '05/05/2026',
          budget: 2517.00,
          spent: 0,
          status: 'pendente',
          progress: 0
        }
      ]
    })

    console.log('✅ Obra Roberto criada')

    res.json({
      success: true,
      message: 'Seed executado! Dados recriados.',
      users: ['luandeleon@estrutto.com.br (ENGINEER)', 'apoio@estrutto.com.br (APOIO)', 'roberto@estrutto.com.br (CLIENT)', 'priscilla@estrutto.com.br (CLIENT)', 'marcelo@estrutto.com.br (CLIENT)'],
      obras: [
        { nome: obra.name, etapas: 6, totalObra: 'R$ 46.010,00', recebido: 'R$ 29.871,25', saldo: 'R$ 16.138,75' },
        { nome: obraPri.name, etapas: 5, progresso: '32%' },
        { nome: obraRob.name, etapas: 7, totalObra: 'R$ 29.467,00', recebido: 'R$ 8.950,00', saldo: 'R$ 20.517,00' }
      ]
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) })
  }
})

// Rota para verificar dados
app.get('/api/check-data', async (req, res) => {
  try {
    const obras = await prisma.obra.findMany({
      include: {
        user: true,
        etapas: true,
        _count: { select: { mensagens: true } }
      }
    })
    
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, type: true }
    })
    
    res.json({
      totalObras: obras.length,
      totalUsuarios: users.length,
      usuarios: users,
      obras: obras.map(o => ({
        nome: o.name,
        cliente: o.clientName,
        engenheiro: o.user?.name,
        etapasCount: o.etapas.length,
        progresso: o.progress,
        temEtapas: o.etapas.length > 0
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Rota de emergência
app.get('/fix', async (req, res) => {
  try {
    await prisma.user.updateMany({
      where: { email: 'luandeleon@estrutto.com.br' },
      data: { type: 'ENGINEER' }
    })
    
    const etapas = await prisma.etapa.count()
    const obras = await prisma.obra.count()
    
    res.send(`
      <h1>✅ Corrigido!</h1>
      <p>Luan agora é ENGENGEIRO</p>
      <p>Obras: ${obras} | Etapas: ${etapas}</p>
      <p>Faça logout e login no app agora!</p>
    `)
  } catch (e) {
    res.send(`Erro: ${e.message}`)
  }
})

// ─── INICIAR SERVIDOR ───
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Estrutto v3.0 rodando na porta ${PORT}`)
  console.log(`📊 Conectado ao PostgreSQL (Supabase)`)
  console.log(`☁️ Cloudinary ativo para uploads`)
  console.log(`🔌 Socket.io ativo para notificações em tempo real`)
  console.log(`🔐 JWT autenticação ativa\n`)
})

// ─── TRATAMENTO DE ERROS NÃO CAPTURADOS ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...')
  await prisma.$disconnect()
  process.exit(0)
})
// GET progresso/cronograma de uma obra (ETAPAS)
app.get('/api/obras/:id/progresso', authMiddleware, async (req, res) => {
  try {
    const etapas = await prisma.etapa.findMany({
      where: { obraId: parseInt(req.params.id) },
      orderBy: { createdAt: 'asc' }
    });
    res.json(etapas);
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// GET chat/mensagens de uma obra
app.get('/api/obras/:id/chat', authMiddleware, async (req, res) => {
  try {
    const mensagens = await prisma.mensagem.findMany({
      where: { obraId: parseInt(req.params.id) },
      include: { user: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(mensagens);
  } catch (error) {
    console.error('Erro ao buscar chat:', error);
    res.status(500).json({ error: 'Erro ao buscar chat' });
  }
});
module.exports = app