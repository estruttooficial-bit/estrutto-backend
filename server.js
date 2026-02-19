// ==========================================
// ESTRUTTO BACKEND - VERSÃO MONOLÍTICA
// Tudo em 1 arquivo - sem pastas, sem requires relativos
// ==========================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'estrutto-secret-key-2024';
const PORT = process.env.PORT || 3000;

// ==========================================
// BANCO DE DADOS EM MEMÓRIA
// ==========================================

const db = {
  users: [
    { id: 1, email: 'cliente@teste.com', password: '$2a$10$YourHashedPasswordHere', name: 'Cliente Teste', type: 'cliente', obraId: 1 },
    { id: 2, email: 'engenheiro@teste.com', password: '$2a$10$YourHashedPasswordHere', name: 'Engenheiro Teste', type: 'engenheiro', obraId: null }
  ],
  obras: [
    { id: 1, name: 'Residencial Villa Nova', clientName: 'Cliente Teste', address: 'Rua das Flores, 123', progress: 65, status: 'em_andamento', startDate: '2024-01-15', estimatedEnd: '2024-08-30', engineerId: 2 }
  ],
  photos: [
    { id: 1, obraId: 1, url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', caption: 'Fundação concluída', date: '2024-01-20', category: 'estrutura' },
    { id: 2, obraId: 1, url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', caption: 'Estrutura do térreo', date: '2024-02-15', category: 'estrutura' }
  ],
  chatMessages: [
    { id: 1, obraId: 1, senderId: 2, senderName: 'Engenheiro Teste', senderType: 'engenheiro', message: 'Olá! A fundação foi concluída com sucesso.', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 2, obraId: 1, senderId: 1, senderName: 'Cliente Teste', senderType: 'cliente', message: 'Ótima notícia! E o próximo passo?', timestamp: new Date(Date.now() - 86400000).toISOString() }
  ],
  materials: [
    { id: 1, obraId: 1, name: 'Cimento Portland', quantity: '500 sacos', status: 'aprovado', requestDate: '2024-02-10', deliveryDate: '2024-02-12' },
    { id: 2, obraId: 1, name: 'Aço CA-50', quantity: '2000 kg', status: 'pendente', requestDate: '2024-02-18', deliveryDate: null }
  ],
  occurrences: [
    { id: 1, obraId: 1, title: 'Atraso na entrega de material', description: 'Fornecedor atrasou a entrega do cimento em 2 dias.', type: 'atraso', severity: 'media', date: '2024-02-12', status: 'resolvido', reportedBy: 2 },
    { id: 2, obraId: 1, title: 'Chuva forte', description: 'Chuva impediu trabalhos externos por 1 dia.', type: 'clima', severity: 'baixa', date: '2024-02-16', status: 'resolvido', reportedBy: 2 }
  ],
  measurements: [
    { id: 1, obraId: 1, description: 'Concretagem da laje do térreo', value: 45000, unit: 'm²', quantity: 150, date: '2024-02-10', status: 'aprovado', approvedBy: 2 },
    { id: 2, obraId: 1, description: 'Assentamento de blocos', value: 12000, unit: 'm²', quantity: 80, date: '2024-02-15', status: 'pendente', approvedBy: null }
  ],
  timeline: [
    { id: 1, obraId: 1, phase: 'Fundação', description: 'Escavação e concretagem das sapatas', startDate: '2024-01-15', endDate: '2024-02-01', progress: 100, status: 'concluido' },
    { id: 2, obraId: 1, phase: 'Estrutura Térreo', description: 'Pilares, vigas e laje do térreo', startDate: '2024-02-01', endDate: '2024-03-15', progress: 80, status: 'em_andamento' },
    { id: 3, obraId: 1, phase: 'Estrutura Superior', description: 'Pilares, vigas e lajes dos andares superiores', startDate: '2024-03-15', endDate: '2024-05-01', progress: 0, status: 'pendente' }
  ]
};

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  
  // Para teste: senha "123456" sem hash
  const validPassword = password === '123456' || await bcrypt.compare(password, user.password).catch(() => false);
  
  if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });
  
  const token = jwt.sign({ id: user.id, email: user.email, type: user.type, obraId: user.obraId }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, type: user.type, obraId: user.obraId }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, type, obraId } = req.body;
  
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: db.users.length + 1,
    name,
    email,
    password: hashedPassword,
    type: type || 'cliente',
    obraId: obraId || null
  };
  
  db.users.push(newUser);
  
  const token = jwt.sign({ id: newUser.id, email: newUser.email, type: newUser.type, obraId: newUser.obraId }, JWT_SECRET, { expiresIn: '7d' });
  
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, type: newUser.type, obraId: newUser.obraId }
  });
});

// ==========================================
// ROTAS DE OBRAS
// ==========================================

app.get('/api/obras', authMiddleware, (req, res) => {
  if (req.user.type === 'cliente') {
    const obra = db.obras.find(o => o.id === req.user.obraId);
    return res.json(obra ? [obra] : []);
  }
  res.json(db.obras);
});

app.get('/api/obras/:id', authMiddleware, (req, res) => {
  const obra = db.obras.find(o => o.id === parseInt(req.params.id));
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  
  if (req.user.type === 'cliente' && obra.id !== req.user.obraId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  res.json(obra);
});

app.get('/api/obras/:id/progresso', authMiddleware, (req, res) => {
  const obra = db.obras.find(o => o.id === parseInt(req.params.id));
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });
  
  const timeline = db.timeline.filter(t => t.obraId === obra.id);
  res.json({ obraId: obra.id, progressoGeral: obra.progress, etapas: timeline });
});

// ==========================================
// ROTAS DE FOTOS
// ==========================================

app.get('/api/obras/:id/fotos', authMiddleware, (req, res) => {
  const fotos = db.photos.filter(p => p.obraId === parseInt(req.params.id));
  res.json(fotos);
});

app.post('/api/obras/:id/fotos', authMiddleware, (req, res) => {
  const { url, caption, category } = req.body;
  const newPhoto = {
    id: db.photos.length + 1,
    obraId: parseInt(req.params.id),
    url: url || 'https://via.placeholder.com/800x600',
    caption: caption || '',
    date: new Date().toISOString().split('T')[0],
    category: category || 'geral'
  };
  db.photos.push(newPhoto);
  res.status(201).json(newPhoto);
});

// ==========================================
// ROTAS DE CHAT
// ==========================================

app.get('/api/obras/:id/chat', authMiddleware, (req, res) => {
  const messages = db.chatMessages.filter(m => m.obraId === parseInt(req.params.id));
  res.json(messages);
});

app.post('/api/obras/:id/chat', authMiddleware, (req, res) => {
  const { message } = req.body;
  const newMessage = {
    id: db.chatMessages.length + 1,
    obraId: parseInt(req.params.id),
    senderId: req.user.id,
    senderName: req.user.name,
    senderType: req.user.type,
    message,
    timestamp: new Date().toISOString()
  };
  db.chatMessages.push(newMessage);
  
  // Emitir via WebSocket
  io.to(`obra_${req.params.id}`).emit('new_message', newMessage);
  
  res.status(201).json(newMessage);
});

// ==========================================
// ROTAS DE MATERIAIS
// ==========================================

app.get('/api/obras/:id/materiais', authMiddleware, (req, res) => {
  const materiais = db.materials.filter(m => m.obraId === parseInt(req.params.id));
  res.json(materiais);
});

app.post('/api/obras/:id/materiais', authMiddleware, (req, res) => {
  const { name, quantity } = req.body;
  const newMaterial = {
    id: db.materials.length + 1,
    obraId: parseInt(req.params.id),
    name,
    quantity,
    status: 'pendente',
    requestDate: new Date().toISOString().split('T')[0],
    deliveryDate: null
  };
  db.materials.push(newMaterial);
  res.status(201).json(newMaterial);
});

app.patch('/api/materiais/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const material = db.materials.find(m => m.id === parseInt(req.params.id));
  if (!material) return res.status(404).json({ error: 'Material não encontrado' });
  
  material.status = status;
  if (status === 'aprovado') {
    material.deliveryDate = new Date().toISOString().split('T')[0];
  }
  
  res.json(material);
});

// ==========================================
// ROTAS DE OCORRÊNCIAS
// ==========================================

app.get('/api/obras/:id/ocorrencias', authMiddleware, (req, res) => {
  const ocorrencias = db.occurrences.filter(o => o.obraId === parseInt(req.params.id));
  res.json(ocorrencias);
});

app.post('/api/obras/:id/ocorrencias', authMiddleware, (req, res) => {
  const { title, description, type, severity } = req.body;
  const newOccurrence = {
    id: db.occurrences.length + 1,
    obraId: parseInt(req.params.id),
    title,
    description,
    type,
    severity,
    date: new Date().toISOString().split('T')[0],
    status: 'aberto',
    reportedBy: req.user.id
  };
  db.occurrences.push(newOccurrence);
  res.status(201).json(newOccurrence);
});

// ==========================================
// ROTAS DE MEDIÇÕES
// ==========================================

app.get('/api/obras/:id/medicoes', authMiddleware, (req, res) => {
  const medicoes = db.measurements.filter(m => m.obraId === parseInt(req.params.id));
  res.json(medicoes);
});

app.post('/api/obras/:id/medicoes', authMiddleware, (req, res) => {
  const { description, value, unit, quantity } = req.body;
  const newMeasurement = {
    id: db.measurements.length + 1,
    obraId: parseInt(req.params.id),
    description,
    value,
    unit,
    quantity,
    date: new Date().toISOString().split('T')[0],
    status: 'pendente',
    approvedBy: null
  };
  db.measurements.push(newMeasurement);
  res.status(201).json(newMeasurement);
});

app.patch('/api/medicoes/:id/aprovar', authMiddleware, (req, res) => {
  const measurement = db.measurements.find(m => m.id === parseInt(req.params.id));
  if (!measurement) return res.status(404).json({ error: 'Medição não encontrada' });
  
  measurement.status = 'aprovado';
  measurement.approvedBy = req.user.id;
  
  res.json(measurement);
});

// ==========================================
// ROTAS DE DOCUMENTOS (RDP)
// ==========================================

app.get('/api/obras/:id/rdp', authMiddleware, (req, res) => {
  // Retorna dados para o RDP (Relatório Diário de Progresso)
  const obra = db.obras.find(o => o.id === parseInt(req.params.id));
  const ocorrencias = db.occurrences.filter(o => o.obraId === parseInt(req.params.id));
  const medicoes = db.measurements.filter(m => m.obraId === parseInt(req.params.id));
  
  res.json({
    obra,
    resumo: {
      totalOcorrencias: ocorrencias.length,
      ocorrenciasAbertas: ocorrencias.filter(o => o.status === 'aberto').length,
      totalMedicoes: medicoes.length,
      valorTotalMedicoes: medicoes.reduce((sum, m) => sum + (m.status === 'aprovado' ? m.value : 0), 0)
    }
  });
});

// ==========================================
// WEBSOCKET
// ==========================================

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join_obra', (obraId) => {
    socket.join(`obra_${obraId}`);
    console.log(`Socket ${socket.id} entrou na obra ${obraId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Estrutto Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/login, /api/auth/register',
      obras: '/api/obras',
      fotos: '/api/obras/:id/fotos',
      chat: '/api/obras/:id/chat',
      materiais: '/api/obras/:id/materiais',
      ocorrencias: '/api/obras/:id/ocorrencias',
      medicoes: '/api/obras/:id/medicoes',
      rdp: '/api/obras/:id/rdp'
    }
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

httpServer.listen(PORT, () => {
  console.log(`🚀 Estrutto Backend rodando na porta ${PORT}`);
  console.log(`📡 WebSocket ativo`);
  console.log(`🔑 Login de teste: cliente@teste.com / 123456`);
});
