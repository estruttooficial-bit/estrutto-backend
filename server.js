import { useState, useEffect, useRef } from 'react'
import {
  Home, Image, Calendar, MessageCircle, User,
  ChevronRight, ChevronLeft, Camera, Send, Check, CheckCheck,
  LogOut, Edit2, Plus,
  Upload, X, CheckCircle2, Clock, Hammer, Building2, AlertTriangle, Loader2,
  FileText, ClipboardList, Sun, CloudRain, Cloud, Users, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || 'https://estrutto-backend.onrender.com'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type UserType = 'cliente' | 'engenheiro'

type AuthUser = {
  id: number
  name: string
  email: string
  type: UserType
  obraId: number | null
  token: string
}

type Obra = {
  id: number
  name: string
  clientName: string
  address: string
  progress: number
  status: string
  startDate: string
  estimatedEnd: string
  engineerId: number
}

type Etapa = {
  id: number
  obraId: number
  phase: string
  description: string
  startDate: string
  endDate?: string
  progress: number
  status: 'pendente' | 'em_andamento' | 'concluido'
}

type Foto = {
  id: number
  obraId: number
  url: string
  caption: string
  date: string
  category: string
}

type Mensagem = {
  id: number
  obraId: number
  senderId: number
  senderName: string
  senderType: UserType
  message: string
  timestamp: string
}

type Documento = {
  id: number
  obraId: number
  nome: string
  url: string
  tipo: string
  data: string
}

type RDO = {
  id: number
  obraId: number
  data: string
  clima: string
  equipe: number
  atividades: string
  ocorrencias: string
  observacoes: string
  criadoPor: string
}

// ─────────────────────────────────────────────
// HELPER DE API
// ─────────────────────────────────────────────
async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Erro ${res.status}`)
  return res.json()
}

// ─────────────────────────────────────────────
// COMPONENTES COMPARTILHADOS
// ─────────────────────────────────────────────
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' }
  return <img src="/logo-estrutto.png" alt="Estrutto" className={`${sizes[size]} object-contain`} />
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    em_andamento: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    concluido: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    atrasado: 'bg-red-500/20 text-red-400 border-red-500/30',
    pendente: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  const labels: Record<string, string> = {
    em_andamento: 'Em Andamento', concluido: 'Concluído', atrasado: 'Atrasado', pendente: 'Pendente',
  }
  return <Badge className={`${styles[status] ?? 'bg-secondary'} border`}>{labels[status] ?? status}</Badge>
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center h-64">
      <Spinner />
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  )
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      const data = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      }).then(r => r.json())

      if (data.error) throw new Error(data.error)
      onLogin({ ...data.user, token: data.token })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div>
            <h1 className="text-2xl font-bold gold-text">ESTRUTTO</h1>
            <p className="text-sm text-muted-foreground">ACOMPANHE SUA OBRA</p>
          </div>
        </div>

        <div className="space-y-4">
          {erro && <ErrorMsg msg={erro} />}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">E-mail</label>
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} className="bg-secondary border-border h-12" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senha</label>
            <Input type="password" placeholder="••••••••" value={senha} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSenha(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleLogin()} className="bg-secondary border-border h-12" />
          </div>
          <Button onClick={handleLogin} disabled={loading || !email || !senha} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            {loading ? <Spinner /> : 'Entrar'}
          </Button>
        </div>

        <div className="text-center space-y-2">
          <a href="#" className="text-sm text-primary hover:underline">Esqueceu a senha?</a>
          <p className="text-xs text-muted-foreground">Não tem acesso? <a href="#" className="text-primary hover:underline">Fale conosco</a></p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Credenciais de teste</p>
          <p className="text-xs text-muted-foreground">Cliente: <span className="text-foreground">cliente@teste.com</span></p>
          <p className="text-xs text-muted-foreground">Engenheiro: <span className="text-foreground">engenheiro@teste.com</span></p>
          <p className="text-xs text-muted-foreground">Senha: <span className="text-foreground">123456</span></p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// APP DO CLIENTE
// ─────────────────────────────────────────────
function ClienteApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('home')
  const [obra, setObra] = useState<Obra | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const obras = await apiFetch('/api/obras', user.token)
        if (obras.length > 0) {
          const o = obras[0]
          setObra(o)
          const [progresso, fotosData, msgs] = await Promise.all([
            apiFetch(`/api/obras/${o.id}/progresso`, user.token),
            apiFetch(`/api/obras/${o.id}/fotos`, user.token),
            apiFetch(`/api/obras/${o.id}/chat`, user.token),
          ])
          setEtapas(progresso.etapas ?? [])
          setFotos(fotosData)
          setMensagens(msgs)
          // documentos - tenta carregar, ignora se endpoint não existir
          try {
            const docs = await apiFetch(`/api/obras/${o.id}/documentos`, user.token)
            setDocumentos(docs)
          } catch { setDocumentos([]) }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.token])

  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'photos', icon: Image, label: 'Fotos' },
    { id: 'timeline', icon: Calendar, label: 'Cronograma' },
    { id: 'docs', icon: FileText, label: 'Documentos' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Logo size="md" />
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h1 className="font-semibold text-sm">App Estrutto</h1>
            <p className="text-[10px] text-muted-foreground">{obra?.address?.split(',')[0] ?? ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setActiveTab('profile')}>
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' && obra && <ClienteDashboard obra={obra} etapas={etapas} fotos={fotos} />}
        {activeTab === 'photos' && <ClienteFotos fotos={fotos} />}
        {activeTab === 'timeline' && <ClienteTimeline etapas={etapas} />}
        {activeTab === 'docs' && <ClienteDocumentos documentos={documentos} />}
        {activeTab === 'chat' && obra && <ChatScreen mensagensIniciais={mensagens} meuPapel="cliente" obraId={obra.id} user={user} onNovaMensagem={msg => setMensagens(p => [...p, msg])} />}
        {activeTab === 'profile' && <ClientePerfil user={user} obra={obra} onLogout={onLogout} />}
      </main>

      {activeTab !== 'profile' && (
        <nav className="bottom-nav">
          <div className="flex items-center justify-around py-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-all touch-feedback ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[9px]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

function ClienteDashboard({ obra, etapas, fotos }: { obra: Obra; etapas: Etapa[]; fotos: Foto[] }) {
  const concluidas = etapas.filter(e => e.status === 'concluido').length

  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      <div className="p-4 space-y-4 pb-24">
        <Card className="bg-gradient-to-br from-card to-secondary border-border overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{obra.address}</p>
                <h2 className="font-semibold text-sm leading-tight">{obra.name}</h2>
              </div>
              <StatusBadge status={obra.status} />
            </div>
            <Separator className="bg-border" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso Geral</span>
                <span className="font-semibold gold-text">{obra.progress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full progress-gold rounded-full transition-all duration-500" style={{ width: `${obra.progress}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div><p className="text-muted-foreground">Início</p><p className="font-medium">{obra.startDate}</p></div>
              <div className="text-right"><p className="text-muted-foreground">Previsão</p><p className="font-medium">{obra.estimatedEnd}</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border card-hover">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div><p className="text-2xl font-bold">{concluidas}/{etapas.length}</p><p className="text-xs text-muted-foreground">etapas concluídas</p></div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border card-hover">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div><p className="text-2xl font-bold">{fotos.length}</p><p className="text-xs text-muted-foreground">fotos enviadas</p></div>
            </CardContent>
          </Card>
        </div>

        {fotos.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Fotos Recentes</h3>
            <div className="grid grid-cols-3 gap-2">
              {fotos.slice(0, 3).map(foto => (
                <div key={foto.id} className="aspect-square rounded-lg overflow-hidden">
                  <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

function ClienteFotos({ fotos }: { fotos: Foto[] }) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Camera className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma foto ainda</p>
        </div>
      ) : (
        <div className="photo-grid p-1">
          {fotos.map(foto => (
            <div key={foto.id} className="aspect-square relative group overflow-hidden">
              <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-medium text-white truncate">{foto.caption}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}

function ClienteTimeline({ etapas }: { etapas: Etapa[] }) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      <div className="p-4 pb-24">
        <h2 className="font-semibold mb-4">Cronograma da Obra</h2>
        <div className="relative pl-8">
          <div className="timeline-line" />
          <div className="space-y-6">
            {etapas.map((etapa) => (
              <div key={etapa.id} className="relative">
                <div className={`timeline-dot ${etapa.status === 'concluido' ? 'timeline-dot-completed' : etapa.status === 'em_andamento' ? 'timeline-dot-active animate-pulse-gold' : 'timeline-dot-pending'}`} style={{ top: '4px' }} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{etapa.phase}</p>
                    <StatusBadge status={etapa.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{etapa.description}</p>
                  {etapa.status !== 'pendente' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className={etapa.status === 'concluido' ? 'text-emerald-400' : 'text-primary'}>{etapa.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${etapa.status === 'concluido' ? 'bg-emerald-500' : 'progress-gold'}`} style={{ width: `${etapa.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {etapa.startDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">Início: {etapa.startDate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

function ClienteDocumentos({ documentos }: { documentos: Documento[] }) {
  const tipoIcon: Record<string, string> = {
    contrato: '📄', planta: '📐', relatorio: '📊', outro: '📎'
  }
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      <div className="p-4 pb-24 space-y-3">
        <h2 className="font-semibold">Documentos</h2>
        {documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum documento disponível</p>
          </div>
        ) : (
          documentos.map(doc => (
            <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer">
              <Card className="bg-card border-border card-hover cursor-pointer mb-2">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{tipoIcon[doc.tipo] ?? '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{doc.data}</p>
                  </div>
                  <span className="text-xs text-primary">Abrir →</span>
                </CardContent>
              </Card>
            </a>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

function ClientePerfil({ user, obra, onLogout }: { user: AuthUser; obra: Obra | null; onLogout: () => void }) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-60px)]">
      <div className="p-4 space-y-4 pb-24">
        <div className="text-center space-y-3 py-4">
          <Avatar className="w-20 h-20 mx-auto border-4 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge className="mt-1 bg-secondary text-muted-foreground border-border border">Cliente</Badge>
          </div>
        </div>
        {obra && (
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium">Minha Obra</h3>
              <p className="text-sm">{obra.name}</p>
              <p className="text-xs text-muted-foreground">{obra.address}</p>
            </CardContent>
          </Card>
        )}
        <Button onClick={onLogout} variant="ghost" className="w-full justify-center h-12 text-red-400 hover:text-red-400 hover:bg-red-500/10">
          <LogOut className="w-5 h-5 mr-2" /> Sair da Conta
        </Button>
        <p className="text-center text-xs text-muted-foreground">Estrutto App v2.0.0</p>
      </div>
    </ScrollArea>
  )
}

// ─────────────────────────────────────────────
// APP DO ENGENHEIRO
// ─────────────────────────────────────────────
function EngenheiroApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('obras')
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [showNovaObra, setShowNovaObra] = useState(false)

  useEffect(() => {
    apiFetch('/api/obras', user.token)
      .then(setObras)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.token])

  const tabs = [
    { id: 'obras', icon: Building2, label: 'Obras' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Logo size="md" />
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h1 className="font-semibold text-sm gold-text">ENGENHEIRO</h1>
            <p className="text-[10px] text-muted-foreground">{user.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowNovaObra(true)} size="sm" className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 h-8 px-3" variant="ghost">
          <Plus className="w-4 h-4 mr-1" /> Nova Obra
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'obras' && !selectedObra && <EngenheiroObras obras={obras} onSelect={setSelectedObra} />}
        {activeTab === 'obras' && selectedObra && (
          <EngenheiroDetalheObra
            obra={selectedObra}
            user={user}
            onBack={() => setSelectedObra(null)}
            onUpdateObra={(updated) => {
              setObras(prev => prev.map(o => o.id === updated.id ? updated : o))
              setSelectedObra(updated)
            }}
          />
        )}
        {activeTab === 'chat' && <EngenheiroChat obras={obras} user={user} />}
        {activeTab === 'perfil' && <EngenheiroPerfil user={user} obras={obras} onLogout={onLogout} />}
      </main>

      {!selectedObra && (
        <nav className="bottom-nav">
          <div className="flex items-center justify-around py-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all touch-feedback ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[10px]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {showNovaObra && (
        <NovaObraModal
          user={user}
          onClose={() => setShowNovaObra(false)}
          onCriada={(obra) => {
            setObras(prev => [...prev, obra])
            setShowNovaObra(false)
          }}
        />
      )}
    </div>
  )
}

function EngenheiroObras({ obras, onSelect }: { obras: Obra[]; onSelect: (o: Obra) => void }) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      <div className="p-4 space-y-3 pb-24">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Minhas Obras</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30 border">{obras.length} obras</Badge>
        </div>
        {obras.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma obra cadastrada</p>
            <p className="text-xs mt-1">Clique em "+ Nova Obra" para começar</p>
          </div>
        )}
        {obras.map(obra => (
          <Card key={obra.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => onSelect(obra)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{obra.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{obra.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{obra.address}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <StatusBadge status={obra.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold text-primary">{obra.progress}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full progress-gold rounded-full" style={{ width: `${obra.progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}

// ─────────────────────────────────────────────
// DETALHE DA OBRA (engenheiro) — com abas
// ─────────────────────────────────────────────
function EngenheiroDetalheObra({ obra, user, onBack, onUpdateObra }: {
  obra: Obra
  user: AuthUser
  onBack: () => void
  onUpdateObra: (o: Obra) => void
}) {
  const [subTab, setSubTab] = useState('etapas')
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [rdos, setRdos] = useState<RDO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [progresso, fotosData] = await Promise.all([
          apiFetch(`/api/obras/${obra.id}/progresso`, user.token),
          apiFetch(`/api/obras/${obra.id}/fotos`, user.token),
        ])
        setEtapas(progresso.etapas ?? [])
        setFotos(fotosData)
        try { const docs = await apiFetch(`/api/obras/${obra.id}/documentos`, user.token); setDocumentos(docs) } catch { setDocumentos([]) }
        try { const r = await apiFetch(`/api/obras/${obra.id}/rdp`, user.token); setRdos(Array.isArray(r) ? r : []) } catch { setRdos([]) }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [obra.id, user.token])

  const subTabs = [
    { id: 'etapas', icon: Calendar, label: 'Cronograma' },
    { id: 'fotos', icon: Camera, label: 'Fotos' },
    { id: 'docs', icon: FileText, label: 'Documentos' },
    { id: 'rdo', icon: ClipboardList, label: 'RDO' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header da obra */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-primary"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{obra.name}</p>
            <p className="text-[10px] text-muted-foreground">{obra.clientName} • {obra.progress}% concluído</p>
          </div>
          <StatusBadge status={obra.status} />
        </div>
      </div>

      {/* Sub abas */}
      <div className="flex border-b border-border bg-card overflow-x-auto hide-scrollbar">
        {subTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          )
        })}
      </div>

      {loading ? <LoadingScreen /> : (
        <>
          {subTab === 'etapas' && <EtapasTab etapas={etapas} setEtapas={setEtapas} user={user} obra={obra} onUpdateObra={onUpdateObra} />}
          {subTab === 'fotos' && <FotosTab fotos={fotos} setFotos={setFotos} user={user} obra={obra} />}
          {subTab === 'docs' && <DocumentosTab documentos={documentos} setDocumentos={setDocumentos} user={user} obra={obra} />}
          {subTab === 'rdo' && <RDOTab rdos={rdos} setRdos={setRdos} user={user} obra={obra} />}
        </>
      )}
    </div>
  )
}

// ─── ABA ETAPAS / CRONOGRAMA ───
function EtapasTab({ etapas, setEtapas, user, obra, onUpdateObra }: {
  etapas: Etapa[]
  setEtapas: React.Dispatch<React.SetStateAction<Etapa[]>>
  user: AuthUser
  obra: Obra
  onUpdateObra: (o: Obra) => void
}) {
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null)
  const [novoStatus, setNovoStatus] = useState<'pendente' | 'em_andamento' | 'concluido'>('pendente')
  const [novoProgresso, setNovoProgresso] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showNovaEtapa, setShowNovaEtapa] = useState(false)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [novaEtapaDesc, setNovaEtapaDesc] = useState('')
  const [novaEtapaInicio, setNovaEtapaInicio] = useState('')
  const [savingEtapa, setSavingEtapa] = useState(false)

  const abrirEdicao = (e: Etapa) => {
    setEditingEtapa(e)
    setNovoStatus(e.status)
    setNovoProgresso(e.progress)
  }

  const salvarEdicao = async () => {
    if (!editingEtapa) return
    setSaving(true)
    const updated = { ...editingEtapa, status: novoStatus, progress: novoProgresso }
    setEtapas(prev => prev.map(e => e.id === editingEtapa.id ? updated : e))
    const novoProgressoObra = Math.round(
      etapas.map(e => e.id === editingEtapa.id ? novoProgresso : e.progress).reduce((a, b) => a + b, 0) / etapas.length
    )
    onUpdateObra({ ...obra, progress: novoProgressoObra })
    setSaving(false)
    setEditingEtapa(null)
  }

  const adicionarEtapa = async () => {
    if (!novaEtapaNome.trim()) return
    setSavingEtapa(true)
    try {
      const novaEtapa: Etapa = await apiFetch(`/api/obras/${obra.id}/progresso`, user.token, {
        method: 'POST',
        body: JSON.stringify({
          phase: novaEtapaNome,
          description: novaEtapaDesc,
          startDate: novaEtapaInicio || new Date().toLocaleDateString('pt-BR'),
          progress: 0,
          status: 'pendente'
        })
      })
      setEtapas(prev => [...prev, novaEtapa])
      setNovaEtapaNome('')
      setNovaEtapaDesc('')
      setNovaEtapaInicio('')
      setShowNovaEtapa(false)
    } catch {
      // fallback: adiciona localmente
      const etapaLocal: Etapa = {
        id: Date.now(),
        obraId: obra.id,
        phase: novaEtapaNome,
        description: novaEtapaDesc,
        startDate: novaEtapaInicio || new Date().toLocaleDateString('pt-BR'),
        progress: 0,
        status: 'pendente'
      }
      setEtapas(prev => [...prev, etapaLocal])
      setShowNovaEtapa(false)
    } finally {
      setSavingEtapa(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <Button onClick={() => setShowNovaEtapa(true)} className="w-full h-10 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" variant="ghost">
          <Plus className="w-4 h-4 mr-2" /> Nova Etapa
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-8">
          {etapas.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhuma etapa cadastrada.</p>}
          {etapas.map((etapa, index) => (
            <Card key={etapa.id} className={`border-border ${etapa.status === 'em_andamento' ? 'border-primary/50' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Etapa {index + 1}</span>
                      <StatusBadge status={etapa.status} />
                    </div>
                    <p className="font-medium text-sm">{etapa.phase}</p>
                    {etapa.description && <p className="text-xs text-muted-foreground">{etapa.description}</p>}
                    {etapa.startDate && <p className="text-[10px] text-muted-foreground mt-1">Início: {etapa.startDate}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => abrirEdicao(etapa)}>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                {etapa.status !== 'pendente' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className={etapa.status === 'concluido' ? 'text-emerald-400' : 'text-primary'}>{etapa.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${etapa.status === 'concluido' ? 'bg-emerald-500' : 'progress-gold'}`} style={{ width: `${etapa.progress}%` }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Modal editar etapa */}
      {editingEtapa && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4" onClick={() => setEditingEtapa(null)}>
          <div className="w-full bg-card rounded-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Atualizar Etapa</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditingEtapa(null)}><X className="w-5 h-5" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">{editingEtapa.phase}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex gap-2">
                {(['pendente', 'em_andamento', 'concluido'] as const).map(s => (
                  <button key={s} onClick={() => { setNovoStatus(s); if (s === 'concluido') setNovoProgresso(100); if (s === 'pendente') setNovoProgresso(0) }} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${novoStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {s === 'pendente' ? 'Pendente' : s === 'em_andamento' ? 'Em Andamento' : 'Concluído'}
                  </button>
                ))}
              </div>
            </div>
            {novoStatus === 'em_andamento' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Progresso</label>
                  <span className="text-sm font-bold text-primary">{novoProgresso}%</span>
                </div>
                <input type="range" min={0} max={100} value={novoProgresso} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoProgresso(Number(e.target.value))} className="w-full accent-yellow-500" />
              </div>
            )}
            <Button onClick={salvarEdicao} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Spinner /> : <><CheckCircle2 className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          </div>
        </div>
      )}

      {/* Modal nova etapa */}
      {showNovaEtapa && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4" onClick={() => setShowNovaEtapa(false)}>
          <div className="w-full bg-card rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nova Etapa</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNovaEtapa(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da etapa *</label>
              <Input placeholder="Ex: Fundação" value={novaEtapaNome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaEtapaNome(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input placeholder="Ex: Escavação e concretagem" value={novaEtapaDesc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaEtapaDesc(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de início</label>
              <Input type="date" value={novaEtapaInicio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaEtapaInicio(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button onClick={adicionarEtapa} disabled={!novaEtapaNome.trim() || savingEtapa} className="w-full bg-primary text-primary-foreground">
              {savingEtapa ? <Spinner /> : <><Plus className="w-4 h-4 mr-2" />Adicionar Etapa</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABA FOTOS ───
function FotosTab({ fotos, setFotos, user, obra }: {
  fotos: Foto[]
  setFotos: React.Dispatch<React.SetStateAction<Foto[]>>
  user: AuthUser
  obra: Obra
}) {
  const [addingFoto, setAddingFoto] = useState(false)
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoCaption, setFotoCaption] = useState('')
  const [fotoCategoria, setFotoCategoria] = useState('geral')
  const [saving, setSaving] = useState(false)

  const enviarFoto = async () => {
    if (!fotoUrl.trim()) return
    setSaving(true)
    try {
      const foto = await apiFetch(`/api/obras/${obra.id}/fotos`, user.token, {
        method: 'POST',
        body: JSON.stringify({ url: fotoUrl, caption: fotoCaption, category: fotoCategoria })
      })
      setFotos(prev => [...prev, foto])
      setFotoUrl('')
      setFotoCaption('')
      setAddingFoto(false)
    } catch {
      const fotoLocal: Foto = { id: Date.now(), obraId: obra.id, url: fotoUrl, caption: fotoCaption, date: new Date().toLocaleDateString('pt-BR'), category: fotoCategoria }
      setFotos(prev => [...prev, fotoLocal])
      setAddingFoto(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <Button onClick={() => setAddingFoto(true)} className="w-full h-10 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" variant="ghost">
          <Upload className="w-4 h-4 mr-2" /> Enviar Nova Foto
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {fotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Camera className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma foto ainda</p>
          </div>
        ) : (
          <div className="p-2 photo-grid">
            {fotos.map(foto => (
              <div key={foto.id} className="aspect-square relative group overflow-hidden">
                <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-medium text-white truncate">{foto.caption}</p>
                    <p className="text-[10px] text-white/70">{foto.category}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {addingFoto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4" onClick={() => setAddingFoto(false)}>
          <div className="w-full bg-card rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nova Foto</h3>
              <Button variant="ghost" size="icon" onClick={() => setAddingFoto(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL da foto *</label>
              <Input placeholder="https://..." value={fotoUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFotoUrl(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input placeholder="Ex: Sala concluída" value={fotoCaption} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFotoCaption(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <div className="flex gap-2 flex-wrap">
                {['geral', 'fundacao', 'estrutura', 'acabamento', 'instalacoes'].map(cat => (
                  <button key={cat} onClick={() => setFotoCategoria(cat)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${fotoCategoria === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={enviarFoto} disabled={!fotoUrl.trim() || saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <Spinner /> : <><Upload className="w-4 h-4 mr-2" />Enviar Foto</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABA DOCUMENTOS ───
function DocumentosTab({ documentos, setDocumentos, user, obra }: {
  documentos: Documento[]
  setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>
  user: AuthUser
  obra: Obra
}) {
  const [addingDoc, setAddingDoc] = useState(false)
  const [docNome, setDocNome] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docTipo, setDocTipo] = useState('outro')
  const [saving, setSaving] = useState(false)

  const tipoIcon: Record<string, string> = { contrato: '📄', planta: '📐', relatorio: '📊', outro: '📎' }

  const adicionarDoc = async () => {
    if (!docNome.trim() || !docUrl.trim()) return
    setSaving(true)
    try {
      const doc = await apiFetch(`/api/obras/${obra.id}/documentos`, user.token, {
        method: 'POST',
        body: JSON.stringify({ nome: docNome, url: docUrl, tipo: docTipo })
      })
      setDocumentos(prev => [...prev, doc])
    } catch {
      const docLocal: Documento = { id: Date.now(), obraId: obra.id, nome: docNome, url: docUrl, tipo: docTipo, data: new Date().toLocaleDateString('pt-BR') }
      setDocumentos(prev => [...prev, docLocal])
    } finally {
      setSaving(false)
      setDocNome('')
      setDocUrl('')
      setAddingDoc(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <Button onClick={() => setAddingDoc(true)} className="w-full h-10 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" variant="ghost">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Documento
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-8">
          {documentos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum documento adicionado</p>
            </div>
          )}
          {documentos.map(doc => (
            <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer">
              <Card className="bg-card border-border card-hover cursor-pointer mb-2">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{tipoIcon[doc.tipo] ?? '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{doc.tipo} • {doc.data}</p>
                  </div>
                  <span className="text-xs text-primary">Abrir →</span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </ScrollArea>

      {addingDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end p-4" onClick={() => setAddingDoc(false)}>
          <div className="w-full bg-card rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Novo Documento</h3>
              <Button variant="ghost" size="icon" onClick={() => setAddingDoc(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input placeholder="Ex: Contrato de obra" value={docNome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocNome(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL do documento *</label>
              <Input placeholder="https://..." value={docUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocUrl(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {['contrato', 'planta', 'relatorio', 'outro'].map(t => (
                  <button key={t} onClick={() => setDocTipo(t)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${docTipo === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                    {tipoIcon[t]} {t}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={adicionarDoc} disabled={!docNome.trim() || !docUrl.trim() || saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <Spinner /> : <><Plus className="w-4 h-4 mr-2" />Adicionar</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABA RDO ───
function RDOTab({ rdos, setRdos, user, obra }: {
  rdos: RDO[]
  setRdos: React.Dispatch<React.SetStateAction<RDO[]>>
  user: AuthUser
  obra: Obra
}) {
  const [showForm, setShowForm] = useState(false)
  const [selectedRdo, setSelectedRdo] = useState<RDO | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    clima: 'sol',
    equipe: '',
    atividades: '',
    ocorrencias: '',
    observacoes: ''
  })

  const climaOptions = [
    { value: 'sol', label: 'Ensolarado', icon: Sun },
    { value: 'nublado', label: 'Nublado', icon: Cloud },
    { value: 'chuva', label: 'Chuvoso', icon: CloudRain },
  ]

  const salvarRdo = async () => {
    if (!form.atividades.trim()) return
    setSaving(true)
    try {
      const rdo = await apiFetch(`/api/obras/${obra.id}/rdp`, user.token, {
        method: 'POST',
        body: JSON.stringify({ ...form, equipe: Number(form.equipe) || 0, criadoPor: user.name })
      })
      setRdos(prev => [rdo, ...prev])
    } catch {
      const rdoLocal: RDO = {
        id: Date.now(), obraId: obra.id, ...form,
        equipe: Number(form.equipe) || 0, criadoPor: user.name
      }
      setRdos(prev => [rdoLocal, ...prev])
    } finally {
      setSaving(false)
      setForm({ data: new Date().toISOString().split('T')[0], clima: 'sol', equipe: '', atividades: '', ocorrencias: '', observacoes: '' })
      setShowForm(false)
    }
  }

  if (selectedRdo) {
    return (
      <ScrollArea className="flex-1 h-full">
        <div className="p-4 pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedRdo(null)} className="text-primary"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-semibold">RDO — {selectedRdo.data}</h3>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5"><span className="text-xl">{selectedRdo.clima === 'sol' ? '☀️' : selectedRdo.clima === 'chuva' ? '🌧️' : '☁️'}</span><span className="text-muted-foreground capitalize">{selectedRdo.clima}</span></div>
                <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-muted-foreground" /><span>{selectedRdo.equipe} pessoas</span></div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Atividades Realizadas</p>
                <p className="text-sm whitespace-pre-wrap">{selectedRdo.atividades}</p>
              </div>
              {selectedRdo.ocorrencias && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ocorrências</p>
                  <p className="text-sm whitespace-pre-wrap text-amber-400">{selectedRdo.ocorrencias}</p>
                </div>
              )}
              {selectedRdo.observacoes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedRdo.observacoes}</p>
                </div>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">Criado por: {selectedRdo.criadoPor}</p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <Button onClick={() => setShowForm(true)} className="w-full h-10 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20" variant="ghost">
          <Plus className="w-4 h-4 mr-2" /> Novo RDO
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-8">
          {rdos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum RDO registrado</p>
            </div>
          )}
          {rdos.map(rdo => (
            <Card key={rdo.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => setSelectedRdo(rdo)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rdo.clima === 'sol' ? '☀️' : rdo.clima === 'chuva' ? '🌧️' : '☁️'}</span>
                    <p className="font-medium text-sm">{rdo.data}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />{rdo.equipe} pessoas
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{rdo.atividades}</p>
                {rdo.ocorrencias && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> {rdo.ocorrencias.slice(0, 50)}...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Modal novo RDO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-card rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Novo RDO</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-5 h-5" /></Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={form.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, data: e.target.value }))} className="bg-secondary border-border" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Clima</label>
                <div className="flex gap-2">
                  {climaOptions.map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => setForm(p => ({ ...p, clima: value }))} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border text-xs transition-all ${form.clima === value ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                      <Icon className="w-5 h-5" />{label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Equipe (nº de pessoas)</label>
                <Input type="number" placeholder="Ex: 8" value={form.equipe} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, equipe: e.target.value }))} className="bg-secondary border-border" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Atividades realizadas *</label>
                <textarea
                  placeholder="Descreva as atividades do dia..."
                  value={form.atividades}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(p => ({ ...p, atividades: e.target.value }))}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ocorrências / Problemas</label>
                <textarea
                  placeholder="Algum problema ou ocorrência? (opcional)"
                  value={form.ocorrencias}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(p => ({ ...p, ocorrencias: e.target.value }))}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observações gerais</label>
                <textarea
                  placeholder="Outras observações... (opcional)"
                  value={form.observacoes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <Button onClick={salvarRdo} disabled={!form.atividades.trim() || saving} className="w-full bg-primary text-primary-foreground">
                {saving ? <Spinner /> : <><ClipboardList className="w-4 h-4 mr-2" />Salvar RDO</>}
              </Button>
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MODAL NOVA OBRA ───
function NovaObraModal({ user, onClose, onCriada }: {
  user: AuthUser
  onClose: () => void
  onCriada: (obra: Obra) => void
}) {
  const [form, setForm] = useState({ name: '', clientName: '', address: '', startDate: '', estimatedEnd: '' })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const criar = async () => {
    if (!form.name.trim() || !form.clientName.trim()) { setErro('Nome da obra e cliente são obrigatórios'); return }
    setSaving(true)
    setErro('')
    try {
      const obra = await apiFetch('/api/obras', user.token, {
        method: 'POST',
        body: JSON.stringify({ ...form, progress: 0, status: 'em_andamento' })
      })
      onCriada(obra)
    } catch {
      const obraLocal: Obra = {
        id: Date.now(), ...form, progress: 0, status: 'em_andamento', engineerId: user.id
      }
      onCriada(obraLocal)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-card rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Nova Obra</h3>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
          {erro && <ErrorMsg msg={erro} />}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da obra *</label>
            <Input placeholder="Ex: Residência Silva" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do cliente *</label>
            <Input placeholder="Ex: João Silva" value={form.clientName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, clientName: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Endereço</label>
            <Input placeholder="Ex: Rua das Flores, 123 — São Paulo" value={form.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, address: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de início</label>
              <Input type="date" value={form.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, startDate: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Previsão de término</label>
              <Input type="date" value={form.estimatedEnd} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, estimatedEnd: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>
          <Button onClick={criar} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground font-semibold">
            {saving ? <Spinner /> : <><Hammer className="w-4 h-4 mr-2" />Criar Obra</>}
          </Button>
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

function EngenheiroChat({ obras, user }: { obras: Obra[]; user: AuthUser }) {
  const [selectedObraId, setSelectedObraId] = useState<number | null>(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [msgsDaObra, setMsgsDaObra] = useState<Mensagem[]>([])
  const obraSelecionada = obras.find(o => o.id === selectedObraId)

  useEffect(() => {
    if (!selectedObraId) return
    setLoadingMsgs(true)
    apiFetch(`/api/obras/${selectedObraId}/chat`, user.token)
      .then(setMsgsDaObra)
      .finally(() => setLoadingMsgs(false))
  }, [selectedObraId, user.token])

  if (!selectedObraId) {
    return (
      <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
        <div className="p-4 space-y-3 pb-24">
          <h2 className="font-semibold text-lg">Conversas</h2>
          {obras.map(obra => (
            <Card key={obra.id} className="bg-card border-border card-hover cursor-pointer" onClick={() => setSelectedObraId(obra.id)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarFallback className="bg-secondary">{obra.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{obra.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{obra.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
        <button onClick={() => setSelectedObraId(null)} className="text-primary"><ChevronLeft className="w-5 h-5" /></button>
        <Avatar className="w-8 h-8"><AvatarFallback className="bg-secondary text-sm">{obraSelecionada?.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
        <div>
          <p className="font-medium text-sm">{obraSelecionada?.clientName}</p>
          <p className="text-[10px] text-muted-foreground">{obraSelecionada?.name}</p>
        </div>
      </div>
      {loadingMsgs ? <LoadingScreen /> : (
        <ChatScreen mensagensIniciais={msgsDaObra} meuPapel="engenheiro" obraId={selectedObraId} user={user} onNovaMensagem={msg => setMsgsDaObra(p => [...p, msg])} />
      )}
    </div>
  )
}

function EngenheiroPerfil({ user, obras, onLogout }: { user: AuthUser; obras: Obra[]; onLogout: () => void }) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
      <div className="p-4 space-y-4 pb-24">
        <div className="text-center space-y-3 py-4">
          <Avatar className="w-20 h-20 mx-auto border-4 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 border">Engenheiro</Badge>
          </div>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium">Resumo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{obras.length}</p>
                <p className="text-xs text-muted-foreground">Obras Totais</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-lg">
                <p className="text-2xl font-bold">{obras.filter(o => o.status === 'em_andamento').length}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button onClick={onLogout} variant="ghost" className="w-full justify-center h-12 text-red-400 hover:text-red-400 hover:bg-red-500/10">
          <LogOut className="w-5 h-5 mr-2" /> Sair da Conta
        </Button>
        <p className="text-center text-xs text-muted-foreground">Estrutto App v2.0.0</p>
      </div>
    </ScrollArea>
  )
}

// ─────────────────────────────────────────────
// CHAT COMPARTILHADO
// ─────────────────────────────────────────────
function ChatScreen({ mensagensIniciais, meuPapel, obraId, user, onNovaMensagem }: {
  mensagensIniciais: Mensagem[]
  meuPapel: 'cliente' | 'engenheiro'
  obraId: number
  user: AuthUser
  onNovaMensagem: (msg: Mensagem) => void
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais)
  const [novaMensagem, setNovaMensagem] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  const enviar = async () => {
    if (!novaMensagem.trim() || sending) return
    setSending(true)
    try {
      const msg: Mensagem = await apiFetch(`/api/obras/${obraId}/chat`, user.token, {
        method: 'POST',
        body: JSON.stringify({ message: novaMensagem }),
      })
      setMensagens(p => [...p, msg])
      onNovaMensagem(msg)
      setNovaMensagem('')
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {mensagens.map(msg => {
            const ehMeu = msg.senderType === meuPapel
            return (
              <div key={msg.id} className={`flex ${ehMeu ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] space-y-1">
                  {!ehMeu && <p className="text-[10px] text-muted-foreground px-1">{msg.senderName}</p>}
                  <div className={`px-4 py-3 ${ehMeu ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${ehMeu ? 'justify-end' : 'justify-start'}`}>
                    <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {ehMeu && <CheckCheck className="w-3 h-3 text-primary" />}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} />
        </div>
        <div className="h-4" />
      </ScrollArea>
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={novaMensagem}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaMensagem(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && enviar()}
            className="flex-1 bg-secondary border-border h-10"
          />
          <Button onClick={enviar} disabled={!novaMensagem.trim() || sending} size="icon" className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────
function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('estrutto_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore */ }
    }
    const timer = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleLogin = (u: AuthUser) => {
    localStorage.setItem('estrutto_user', JSON.stringify(u))
    setUser(u)
  }

  const handleLogout = () => {
    localStorage.removeItem('estrutto_user')
    setUser(null)
  }

  if (showSplash) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-pulse"><Logo size="lg" /></div>
        <h1 className="mt-4 text-xl font-bold gold-text animate-slide-up">ESTRUTTO</h1>
      </div>
    )
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />
  if (user.type === 'engenheiro') return <EngenheiroApp user={user} onLogout={handleLogout} />
  return <ClienteApp user={user} onLogout={handleLogout} />
}

export default App
