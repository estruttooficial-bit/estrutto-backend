require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const http = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const cloudinary = require('cloudinary').v2

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors()); // Permite todas as conexões temporariamente
app.use(express.json())

// Configuração do Cloudinary (Pega as chaves do seu arquivo .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dw8ue2caz',
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const upload = multer({ storage: multer.memoryStorage() })

const JWT_SECRET = process.env.JWT_SECRET || 'estrutto-secret-2024'
const PORT = process.env.PORT || 3001
const DB_FILE = path.join(__dirname, 'db.json')

// ─── BANCO DE DADOS ───
function getDefaultDB() {
  return {
    users: [
      { id: 1, email: 'luandeleon@estrutto.com.br', password: bcrypt.hashSync('235863', 10), name: 'Luan de Leon', type: 'engenheiro' },
      { id: 2, email: 'apoio@estrutto.com.br', password: bcrypt.hashSync('121314', 10), name: 'Apoio Estrutto', type: 'engenheiro' }
    ],
    obras: [],
    etapas: [],
    fotos: [],
    mensagens: [],
    documentos: [],
    rdos: []
  }
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
      const def = getDefaultDB()
      return {
        users: data.users || def.users,
        obras: data.obras || [],
        etapas: data.etapas || [],
        fotos: data.fotos || [],
        mensagens: data.mensagens || [],
        documentos: data.documentos || [],
        rdos: data.rdos || []
      }
    }
  } catch (e) { console.error('Erro ao carregar DB:', e.message) }
  return getDefaultDB()
}

function saveDB() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) } 
  catch (e) { console.error('Erro ao salvar DB:', e.message) }
}

let db = loadDB()

// ─── SEED DE ETAPAS (Automação para Roberto e Priscilla) ───
function seedEtapas() {
  const etapasPorNome = {
    roberto: [
      { phase: 'Demolição e Preparação', description: 'Remoção de revestimentos e preparação', startDate: '23/02/2026', status: 'em_andamento', progress: 10 },
      { phase: 'Infraestrutura', description: 'Instalações elétricas e hidráulicas', startDate: '03/03/2026', status: 'pendente', progress: 0 },
      { phase: 'Finalização e Entrega', description: 'Limpeza técnica e entrega', startDate: '02/05/2026', status: 'pendente', progress: 0 }
    ],
    priscilla: [
      { phase: 'Preparação e Demolição Leve', description: 'Proteção de áreas e ajustes', startDate: '23/02/2026', status: 'em_andamento', progress: 15 },
      { phase: 'Pisos Vinílicos e Rodapés', description: 'Instalação de piso 94m²', startDate: '16/03/2026', status: 'pendente', progress: 0 },
      { phase: 'Entrega Técnica', description: 'Vistoria final com ART', startDate: '23/03/2026', status: 'pendente', progress: 0 }
    ]
  }

  let changed = false
  db.obras.forEach(obra => {
    const nomeLower = (obra.name + ' ' + obra.clientName).toLowerCase()
    let etapasParaSeed = null
    if (nomeLower.includes('roberto') || nomeLower.includes('wendel')) etapasParaSeed = etapasPorNome.roberto
    else if (nomeLower.includes('priscilla') || nomeLower.includes('rafa') || nomeLower.includes('906')) etapasParaSeed = etapasPorNome.priscilla

    if (etapasParaSeed) {
      const etapasExistentes = db.etapas.filter(e => e.obraId === obra.id)
      if (etapasExistentes.length === 0) {
        let maxId = db.etapas.length > 0 ? Math.max(...db.etapas.map(e => e.id)) : 0
        etapasParaSeed.forEach(ep => { maxId++; db.etapas.push({ id: maxId, obraId: obra.id, ...ep }) })
        changed = true
      }
    }
  })
  if (changed) saveDB()
}

// ─── MIDDLEWARES ───

}

function engOnly(req, res, next) {
  if (req.user.type !== 'engenheiro') return res.status(403).json({ error: 'Apenas engenheiros' })
  next()
}

// ─── ROTAS ───

// Upload Seguro para o Cloudinary
app.post('/api/upload', auth, engOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })
  const uploadStream = cloudinary.uploader.upload_stream({ folder: 'estrutto_app' }, (error, result) => {
    if (error) return res.status(500).json({ error: 'Erro no Cloudinary' })
    res.json({ url: result.secure_url })
  })
  uploadStream.end(req.file.buffer)
})

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Credenciais inválidas' })
  const token = jwt.sign({ id: user.id, email: user.email, type: user.type, name: user.name }, JWT_SECRET)
  res.json({ token, user: { id: user.id, name: user.name, type: user.type, obraId: user.obraId } })
})

// Obras
app.get('/api/obras', auth, (req, res) => {
  if (req.user.type === 'engenheiro') return res.json(db.obras.filter(o => o.engineerId === req.user.id))
  res.json(db.obras.filter(o => o.id === db.users.find(u => u.id === req.user.id)?.obraId))
})

app.post('/api/obras', auth, engOnly, (req, res) => {
  const obra = { id: Date.now(), ...req.body, engineerId: req.user.id }
  db.obras.push(obra)
  saveDB()
  seedEtapas()
  res.json(obra)
})

// (Outras rotas de progresso, fotos e chat seguem o padrão do banco de dados...)
// As rotas de Chat, Fotos, Documentos e RDO estão incluídas na lógica do db.json

server.listen(PORT, () => {
  console.log(`🚀 Servidor Estrutto rodando na porta ${PORT}`)
  setTimeout(seedEtapas, 1000)
})

// EXCLUIR FOTO
app.delete('/api/fotos/:id', auth, engOnly, (req, res) => {
  const id = parseInt(req.params.id)
  db.fotos = db.fotos.filter(f => f.id !== id)
  saveDB()
  res.json({ success: true })
})