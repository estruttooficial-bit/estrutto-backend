require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const http = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'estrutto-secret-2024'
const PORT = process.env.PORT || 3001
const DB_FILE = path.join(__dirname, 'db.json')

// ─── BANCO DE DADOS FIXO (Para as etapas aparecerem no App hoje) ───
function getDefaultDB() {
  return {
    users: [
      { id: 1, email: 'luandeleon@estrutto.com.br', password: bcrypt.hashSync('235863', 10), name: 'Luan de Leon', type: 'engenheiro' },
      { id: 2, email: 'priscilla@estrutto.com.br', password: bcrypt.hashSync('121314', 10), name: 'Priscilla Blattner', type: 'cliente', obraId: 202 }
    ],
    obras: [
      { id: 202, name: "Reforma Residencial - Apto 906", clientName: "Priscilla Blattner", address: "Rua São Josemaria Escrivá, 740", status: "em_andamento", progress: 10, engineerId: 1, startDate: "23/02/2026" },
      { id: 404, name: "Reforma Geral - Roberto", clientName: "Roberto e Wendel", address: "Porto Alegre, RS", status: "em_andamento", progress: 5, engineerId: 1, startDate: "23/02/2026" },
      { id: 101, name: "Espaço Gourmet & Parrilla", clientName: "Marcelo", address: "Rua Professor Ulisses Cabral, 1121", status: "em_andamento", progress: 55, engineerId: 1, startDate: "12/01/2026" }
    ],
    etapas: [
      // ETAPAS PRISCILLA (Obra 202)
      { id: 1, obraId: 202, phase: "Mobilização", description: "PAGAMENTO HOJE: R$ 6.000,00. Proteção de áreas.", startDate: "23/02/2026", status: "em_andamento", progress: 15 },
      { id: 2, obraId: 202, phase: "Demolição Leve", description: "Vencimento R$ 3.100 em 28/02.", startDate: "24/02/2026", status: "pendente", progress: 0 },
      // ETAPAS ROBERTO (Obra 404)
      { id: 3, obraId: 404, phase: "Demolição e Preparação", description: "Início hoje. Vencimento R$ 2.250 em 26/02.", startDate: "23/02/2026", status: "em_andamento", progress: 10 }
    ],
    fotos: [], mensagens: [], documentos: [], rdos: []
  }
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    }
  } catch (e) { console.error('Erro ao carregar DB:', e.message) }
  return getDefaultDB()
}

function saveDB() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)) } 
  catch (e) { console.error('Erro ao salvar DB:', e.message) }
}

let db = loadDB()

// ─── ROTAS ───
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Credenciais inválidas' })
  const token = jwt.sign({ id: user.id, email: user.email, type: user.type, name: user.name }, JWT_SECRET)
  res.json({ token, user: { id: user.id, name: user.name, type: user.type, obraId: user.obraId } })
})

// Rota de Obras Liberada
app.get('/api/obras', (req, res) => {
  res.json(db.obras)
})

// Rota de Etapas Liberada para o cronograma aparecer
app.get('/api/etapas/:obraId', (req, res) => {
  const obraId = parseInt(req.params.obraId)
  const etapas = db.etapas.filter(e => e.obraId === obraId)
  res.json(etapas)
})

server.listen(PORT, () => {
  console.log(`🚀 Servidor Estrutto rodando na porta ${PORT}`)
})