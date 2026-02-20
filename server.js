// ==========================================
// ESTRUTTO BACKEND - VERSÃO 2.0
// ==========================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'estrutto-secret-key-2024';
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ==========================================
// BANCO DE DADOS PERSISTENTE
// ==========================================

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('Erro ao carregar DB, usando padrão');
  }
  return getDefaultDB();
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log('Erro ao salvar DB:', e.message);
  }
}

function getDefaultDB() {
  return {
    users: [
      {
        id: 1,
        email: 'luandeleon@estrutto.com.br',
        password: bcrypt.hashSync('235863', 10),
        name: 'Luan de Leon',
        type: 'engenheiro',
        obraId: null
      },
      {
        id: 2,
        email: 'apoio@estrutto.com.br',
        password: bcrypt.hashSync('121314', 10),
        name: 'Apoio Estrutto',
        type: 'engenheiro',
        obraId: null
      },
      {
        id: 3,
        email: 'cliente@teste.com',
        password: bcrypt.hashSync('123456', 10),
        name: 'Cliente Teste',
        type: 'cliente',
        obraId: 1
      }
    ],
    obras: [
      {
        id: 1,
        name: 'Residencial Villa Nova',
        clientName: 'Cliente Teste',
        address: 'Rua das Flores, 123 — São Paulo',
        progress: 65,
        status: 'em_andamento',
        startDate: '2024-01-15',
        estimatedEnd: '2024-08-30',
        engineerId: 1
      }
    ],
    photos: [
      { id: 1, obraId: 1, url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', caption: 'Fundação concluída', date: '2024-01-20', category: 'estrutura' },
      { id: 2, obraId: 1, url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', caption: 'Estrutura do térreo', date: '2024-02-15', category: 'estrutura' }
    ],
    chatMessages: [
      { id: 1, obraId: 1, senderId: 1, senderName: 'Luan de Leon', senderType: 'engenheiro', message: 'Olá! A fundação foi concluída com sucesso.', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 2, obraId: 1, senderId: 3, senderName: 'Cliente Teste', senderType: 'cliente', message: 'Ótima notícia! E o próximo passo?', timestamp: new Date(Date.now() - 86400000).toISOString() }
    ],
    timeline: [
      { id: 1, obraId: 1, phase: 'Fundação', description: 'Escavação e concretagem das sapatas', startDate: '2024-01-15', endDate: '2024-02-01', progress: 100, status: 'concluido' },
      { id: 2, obraId: 1, phase: 'Estrutura Térreo', description: 'Pilares, vigas e laje do térreo', startDate: '2024-02-01', endDate: '2024-03-15', progress: 80, status: 'em_andamento' },
      { id: 3, obraId: 1, phase: 'Estrutura Superior', description: 'Pilares, vigas e lajes superiores', startDate: '2024-03-15', endDate: '2024-05-01', progress: 0, status: 'pendente' }
    ],
    documentos: [
      { id: 1, obraId: 1, nome: 'Contrato de Obra', url: 'https://example.com/contrato.pdf', tipo: 'contrato', data: '2024-01-15' }
    ],
    rdos: [],
    materials: [],
    occurrences: []
  };
}

let db = loadDB();

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    // Busca nome atualizado do usuário
    const user = db.users.find(u => u.id === req.user.id);
    if (user) req.user.name = user.name;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

  const user = db.users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign(
    { id: user.id, email: user.email, type: user.type, obraId: user.obraId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, type: user.type, obraId: user.obraId }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, type, obraId } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });

  const emailNorm = email.toLowerCase().trim();
  if (db.users.find(u => u.email === emailNorm)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    name,
    email: emailNorm,
    password: hashedPassword,
    type: type || 'cliente',
    obraId: obraId || null
  };

  db.users.push(newUser);
  saveDB();

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, type: newUser.type, obraId: newUser.obraId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, type: newUser.type, obraId: newUser.obraId }
  });
});

// ==========================================
// OBRAS
// ==========================================

app.get('/api/obras', authMiddleware, (req, res) => {
  if (req.user.type === 'cliente') {
    const obra = db.obras.find(o => o.id === req.user.obraId);
    return res.json(obra ? [obra] : []);
  }
  res.json(db.obras);
});

app.post('/api/obras', authMiddleware, (req, res) => {
  if (req.user.type !== 'engenheiro') return res.status(403).json({ error: 'Apenas engenheiros podem criar obras' });

  const { name, clientName, address, startDate, estimatedEnd, status } = req.body;
  if (!name || !clientName) return res.status(400).json({ error: 'Nome e cliente obrigatórios' });

  const newObra = {
    id: db.obras.length > 0 ? Math.max(...db.obras.map(o => o.id)) + 1 : 1,
    name,
    clientName,
    address: address || '',
    progress: 0,
    status: status || 'em_andamento',
    startDate: startDate || new Date().toISOString().split('T')[0],
    estimatedEnd: estimatedEnd || '',
    engineerId: req.user.id
  };

  db.obras.push(newObra);
  saveDB();
  res.status(201).json(newObra);
});

app.get('/api/obras/:id', authMiddleware, (req, res) => {
  const obra = db.obras.find(o => o.id === parseInt(req.params.id));
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  res.json(obra);
});

app.patch('/api/obras/:id', authMiddleware, (req, res) => {
  const obra = db.obras.find(o => o.id === parseInt(req.params.id));
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  Object.assign(obra, req.body);
  saveDB();
  res.json(obra);
});

// ==========================================
// CRONOGRAMA / TIMELINE
// ==========================================

app.get('/api/obras/:id/progresso', authMiddleware, (req, res) => {
  const obraId = parseInt(req.params.id);
  const obra = db.obras.find(o => o.id === obraId);
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  const etapas = db.timeline.filter(t => t.obraId === obraId);
  res.json({ obraId, progressoGeral: obra.progress, etapas });
});

app.post('/api/obras/:id/progresso', authMiddleware, (req, res) => {
  const obraId = parseInt(req.params.id);
  const { phase, description, startDate, endDate, progress, status } = req.body;
  if (!phase) return res.status(400).json({ error: 'Nome da fase obrigatório' });

  const newEtapa = {
    id: db.timeline.length > 0 ? Math.max(...db.timeline.map(t => t.id)) + 1 : 1,
    obraId,
    phase,
    description: description || '',
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || null,
    progress: progress || 0,
    status: status || 'pendente'
  };

  db.timeline.push(newEtapa);
  saveDB();
  res.status(201).json(newEtapa);
});

app.patch('/api/timeline/:id', authMiddleware, (req, res) => {
  const etapa = db.timeline.find(t => t.id === parseInt(req.params.id));
  if (!etapa) return res.status(404).json({ error: 'Etapa não encontrada' });
  Object.assign(etapa, req.body);
  saveDB();
  res.json(etapa);
});

// ==========================================
// FOTOS
// ==========================================

app.get('/api/obras/:id/fotos', authMiddleware, (req, res) => {
  const fotos = db.photos.filter(p => p.obraId === parseInt(req.params.id));
  res.json(fotos);
});

app.post('/api/obras/:id/fotos', authMiddleware, (req, res) => {
  const { url, caption, category } = req.body;
  const newPhoto = {
    id: db.photos.length > 0 ? Math.max(...db.photos.map(p => p.id)) + 1 : 1,
    obraId: parseInt(req.params.id),
    url: url || '',
    caption: caption || '',
    date: new Date().toISOString().split('T')[0],
    category: category || 'geral'
  };
  db.photos.push(newPhoto);
  saveDB();
  res.status(201).json(newPhoto);
});

// ==========================================
// DOCUMENTOS
// ==========================================

app.get('/api/obras/:id/documentos', authMiddleware, (req, res) => {
  const docs = db.documentos.filter(d => d.obraId === parseInt(req.params.id));
  res.json(docs);
});

app.post('/api/obras/:id/documentos', authMiddleware, (req, res) => {
  const { nome, url, tipo } = req.body;
  if (!nome || !url) return res.status(400).json({ error: 'Nome e URL obrigatórios' });

  const newDoc = {
    id: db.documentos.length > 0 ? Math.max(...db.documentos.map(d => d.id)) + 1 : 1,
    obraId: parseInt(req.params.id),
    nome,
    url,
    tipo: tipo || 'outro',
    data: new Date().toLocaleDateString('pt-BR')
  };
  db.documentos.push(newDoc);
  saveDB();
  res.status(201).json(newDoc);
});

app.delete('/api/documentos/:id', authMiddleware, (req, res) => {
  const idx = db.documentos.findIndex(d => d.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Documento não encontrado' });
  db.documentos.splice(idx, 1);
  saveDB();
  res.json({ success: true });
});

// ==========================================
// RDO (Relatório Diário de Obra)
// ==========================================

app.get('/api/obras/:id/rdp', authMiddleware, (req, res) => {
  const rdos = db.rdos.filter(r => r.obraId === parseInt(req.params.id));
  res.json(rdos.sort((a, b) => new Date(b.data) - new Date(a.data)));
});

app.post('/api/obras/:id/rdp', authMiddleware, (req, res) => {
  const { data, clima, equipe, atividades, ocorrencias, observacoes } = req.body;
  if (!atividades) return res.status(400).json({ error: 'Atividades obrigatórias' });

  const newRdo = {
    id: db.rdos.length > 0 ? Math.max(...db.rdos.map(r => r.id)) + 1 : 1,
    obraId: parseInt(req.params.id),
    data: data || new Date().toISOString().split('T')[0],
    clima: clima || 'sol',
    equipe: equipe || 0,
    atividades,
    ocorrencias: ocorrencias || '',
    observacoes: observacoes || '',
    criadoPor: req.user.name,
    criadoEm: new Date().toISOString()
  };
  db.rdos.push(newRdo);
  saveDB();
  res.status(201).json(newRdo);
});

// ==========================================
// CHAT
// ==========================================

app.get('/api/obras/:id/chat', authMiddleware, (req, res) => {
  const messages = db.chatMessages.filter(m => m.obraId === parseInt(req.params.id));
  res.json(messages);
});

app.post('/api/obras/:id/chat', authMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });

  const newMessage = {
    id: db.chatMessages.length > 0 ? Math.max(...db.chatMessages.map(m => m.id)) + 1 : 1,
    obraId: parseInt(req.params.id),
    senderId: req.user.id,
    senderName: req.user.name,
    senderType: req.user.type,
    message,
    timestamp: new Date().toISOString()
  };
  db.chatMessages.push(newMessage);
  saveDB();
  io.to(`obra_${req.params.id}`).emit('new_message', newMessage);
  res.status(201).json(newMessage);
});

// ==========================================
// USUÁRIOS (para engenheiro cadastrar clientes)
// ==========================================

app.get('/api/users', authMiddleware, (req, res) => {
  if (req.user.type !== 'engenheiro') return res.status(403).json({ error: 'Acesso negado' });
  const users = db.users.map(u => ({ id: u.id, name: u.name, email: u.email, type: u.type, obraId: u.obraId }));
  res.json(users);
});

app.patch('/api/users/:id', authMiddleware, (req, res) => {
  if (req.user.type !== 'engenheiro') return res.status(403).json({ error: 'Acesso negado' });
  const user = db.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const { name, obraId } = req.body;
  if (name) user.name = name;
  if (obraId !== undefined) user.obraId = obraId;
  saveDB();
  res.json({ id: user.id, name: user.name, email: user.email, type: user.type, obraId: user.obraId });
});

// ==========================================
// MATERIAIS E OCORRÊNCIAS
// ==========================================

app.get('/api/obras/:id/materiais', authMiddleware, (req, res) => {
  res.json(db.materials.filter(m => m.obraId === parseInt(req.params.id)));
});

app.post('/api/obras/:id/materiais', authMiddleware, (req, res) => {
  const { name, quantity } = req.body;
  const newMaterial = {
    id: db.materials.length > 0 ? Math.max(...db.materials.map(m => m.id)) + 1 : 1,
    obraId: parseInt(req.params.id), name, quantity,
    status: 'pendente', requestDate: new Date().toISOString().split('T')[0], deliveryDate: null
  };
  db.materials.push(newMaterial);
  saveDB();
  res.status(201).json(newMaterial);
});

app.get('/api/obras/:id/ocorrencias', authMiddleware, (req, res) => {
  res.json(db.occurrences.filter(o => o.obraId === parseInt(req.params.id)));
});

app.post('/api/obras/:id/ocorrencias', authMiddleware, (req, res) => {
  const { title, description, type, severity } = req.body;
  const newOcc = {
    id: db.occurrences.length > 0 ? Math.max(...db.occurrences.map(o => o.id)) + 1 : 1,
    obraId: parseInt(req.params.id), title, description, type, severity,
    date: new Date().toISOString().split('T')[0], status: 'aberto', reportedBy: req.user.id
  };
  db.occurrences.push(newOcc);
  saveDB();
  res.status(201).json(newOcc);
});

// ==========================================
// WEBSOCKET
// ==========================================

io.on('connection', (socket) => {
  socket.on('join_obra', (obraId) => socket.join(`obra_${obraId}`));
  socket.on('disconnect', () => {});
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), users: db.users.length, obras: db.obras.length });
});

app.get('/', (req, res) => {
  res.json({ message: 'Estrutto Backend API v2.0', status: 'online' });
});

// ==========================================
// INICIAR
// ==========================================

httpServer.listen(PORT, () => {
  console.log(`🚀 Estrutto Backend v2.0 rodando na porta ${PORT}`);
  console.log(`👤 Contas: luandeleon@estrutto.com.br / apoio@estrutto.com.br`);
});
