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
      // Engenheiro vê obras onde é responsável
      whereClause = { engineerId: user.id }
    } else {
      // Cliente vê obras onde o nome está em clientName
      // Busca case-insensitive parcial (funciona com "Roberto" em "Roberto e Wendel")
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
        etapas: true, 
        fotos: true,
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
        engineer: { select: { id: true, name: true, email: true } }
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
        engineerId: req.user.id,
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
    const rdos = await prisma.rdo.findMany({
      where: { obraId: parseInt(req.params.obraId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' }
    })
    res.json(rdos)
  } catch (error) {
    console.error('Erro ao buscar RDOs:', error)
    res.status(500).json({ error: 'Erro ao buscar RDOs' })
  }
})

// POST criar RDO
app.post('/api/rdos', authMiddleware, async (req, res) => {
  try {
    const { obraId, date, content } = req.body
    
    const rdo = await prisma.rdo.create({
      data: {
        obraId,
        date,
        content,
        userId: req.user.id,
        status: 'rascunho'
      },
      include: { user: { select: { id: true, name: true } } }
    })
    
    io.emit('rdo:criada', rdo)
    res.status(201).json(rdo)
  } catch (error) {
    console.error('Erro ao criar RDO:', error)
    res.status(500).json({ error: 'Erro ao criar RDO' })
  }
})

// PUT atualizar RDO (enviar, aprovar, etc)
app.put('/api/rdos/:id', authMiddleware, async (req, res) => {
  try {
    const { content, status } = req.body
    
    const rdo = await prisma.rdo.update({
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
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL via Prisma',
    storage: 'Cloudinary'
  })
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
// ─── ROTA TEMPORÁRIA PARA SEED ───
// Acesse: https://estrutto-backend.onrender.com/api/run-seed?key=estrutto2026
app.get('/api/run-seed', async (req, res) => {
  if (req.query.key !== 'estrutto2026') {
    return res.status(401).json({ error: 'Chave incorreta' })
  }

  try {
    const bcrypt = require('bcryptjs')
    
    // Limpar dados antigos
    await prisma.rdo.deleteMany()
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
        type: 'ENGINEER', // ← ENGENHEIRO!
      }
    })

    const apoio = await prisma.user.create({
      data: {
        email: 'apoio@estrutto.com.br',
        password: senhaApoio,
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

    // Criar obras e etapas... (cola o resto do seu seed aqui)
    // Ou simplifica: só crie as obras básicas primeiro para testar
    
    res.json({ 
      success: true, 
      message: 'Seed executado! Luan agora é ENGENHEIRO.',
      users: ['luandeleon@estrutto.com.br (ENGINEER)', 'roberto@estrutto.com.br (CLIENT)', 'priscilla@estrutto.com.br (CLIENT)', 'marcelo@estrutto.com.br (CLIENT)']
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

// Rota para verificar dados (acessar pelo navegador)
app.get('/api/check-data', async (req, res) => {
  const obras = await prisma.obra.findMany({
    include: { etapas: true, user: true }
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
      etapasCount: o.etapas.length,
      progresso: o.progress,
      temEtapas: o.etapas.length > 0
    }))
  })
})
// Rota de emergência - acesse pelo navegador
app.get('/fix', async (req, res) => {
  try {
    // 1. Corrige Luan para ENGENHEIRO
    await prisma.user.updateMany({
      where: { email: 'luandeleon@estrutto.com.br' },
      data: { type: 'ENGINEER' }
    })
    
    // 2. Verifica se tem etapas
    const etapas = await prisma.etapa.count()
    const obras = await prisma.obra.count()
    
    res.send(`
      <h1>✅ Corrigido!</h1>
      <p>Luan agora é ENGENHEIRO</p>
      <p>Obras: ${obras} | Etapas: ${etapas}</p>
      <p><b>Se Etapas = 0, o seed não funcionou. Rode o seed.js localmente e faça push.</b></p>
      <p>Faça logout e login no app agora!</p>
    `)
  } catch (e) {
    res.send(`Erro: ${e.message}`)
  }
})
module.exports = app