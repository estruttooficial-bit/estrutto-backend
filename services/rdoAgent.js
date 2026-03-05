const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Você é o Agente RDO da Estrutto Engenharia Ltda., especializado em processar Relatórios Diários de Obra.

## CONTEXTO DA EMPRESA
- Estrutto Engenharia Ltda. (CNPJ: 60.355.149/0001-15)
- Eng. Responsável: Luan Schons (CREA/RS 241156)
- Localização: Porto Alegre, RS, Brasil
- Atividade: Reformas e construções residenciais/comerciais

## SUA MISSÃO
Transformar dados brutos do RDO em 2 documentos profissionais:

1. **RDO INTERNO** → Para engenheiro e gestão
   - Linguagem técnica precisa
   - TODOS os detalhes (HH, quantidades)
   - Intercorrências com classificação de urgência (🚨 URGENTE quando requerAtencao=true ou incidente segurança)
   - Alertas destacados

2. **RDO CLIENTE** → Para apresentação ao proprietário
   - Tom formal/corporativo
   - Foco em PROGRESSO e QUALIDADE
   - Problemas menores omitidos
   - Intercorrências urgentes = "ajustes de cronograma"
   - Sempre com assinatura do engenheiro

## REGRAS CRÍTICAS
- Usar dados EXATOS do RDO (nunca inventar números)
- Omitir urgências na versão interna é PROIBIDO
- Retornar SEMPRE JSON válido sem markdown externo`

// ─── CLASSIFICAÇÃO DE NÍVEL ───
function classificarNivel(rdoData) {
  let score = 0

  const fotos = rdoData.fotos || []
  const intercorrencias = rdoData.intercorrencias || []
  const servicos = rdoData.servicos || []

  // Critérios → Nível 3
  if (fotos.length > 8) score += 3
  if (intercorrencias.some(i => i.requerAtencao)) score += 3
  if (rdoData.incidenteSeguranca) score += 3
  if (intercorrencias.length > 2) score += 2
  if (servicos.length > 5) score += 1

  // Critérios → Nível 2
  if (fotos.some(f => !f.descricao || f.descricao.length < 10)) score += 2
  if (servicos.some(s => !s.observacoes && (s.percentualConclusao || 0) < 100)) score += 1
  if (intercorrencias.some(i => !i.acaoTomada && !i.resolvida)) score += 2

  if (score >= 6) return 3
  if (score >= 3) return 2
  return 1
}

// ─── PROMPTS ───
function buildNivel1Prompt(rdoData, obraName) {
  return `Processe este RDO e gere as 2 versões profissionais.

## OBRA: ${obraName || 'Obra'}

## DADOS DO RDO
${JSON.stringify(rdoData, null, 2)}

## INSTRUÇÕES
1. Analise clima, equipe, atividades, materiais, equipamentos, intercorrências, segurança e fotos
2. Gere versão INTERNA técnica e completa
3. Gere versão CLIENTE formal e positiva
4. Destaque urgências na versão interna (🚨)
5. Na versão cliente, use linguagem profissional sem mencionar problemas menores

## FORMATO DE SAÍDA (JSON puro, sem markdown)
{
  "versaoInterna": {
    "titulo": "RDO - ${obraName || 'Obra'} - [data]",
    "resumoExecutivo": "2-3 frases sobre principais avanços",
    "secoes": {
      "clima": "descrição do clima",
      "equipe": "resumo da equipe e HH total",
      "atividades": "lista das atividades executadas",
      "materiais": "materiais utilizados",
      "equipamentos": "equipamentos usados",
      "intercorrencias": "intercorrências (🚨 se urgente)",
      "seguranca": "EPIs e incidentes",
      "fotos": "referência às fotos registradas",
      "observacoes": "observações do responsável",
      "previsao": "previsão para o próximo dia"
    },
    "alertas": [
      { "tipo": "URGENTE|ATENCAO|INFO", "mensagem": "...", "prioridade": "ALTA|MEDIA|BAIXA" }
    ]
  },
  "versaoCliente": {
    "titulo": "Relatório de Progresso - [data]",
    "introducao": "parágrafo formal",
    "progressoGeral": { "resumo": "...", "percentual": "..." },
    "servicosRealizados": [
      { "descricao": "...", "detalhes": "...", "status": "Concluído|Em andamento X%" }
    ],
    "proximasEtapas": { "descricao": "...", "prazo": "..." },
    "registroFotografico": [{ "descricao": "descrição profissional das fotos" }],
    "observacoes": "comentário positivo",
    "assinatura": {
      "responsavelTecnico": "Eng. Luan Schons",
      "crea": "CREA/RS 241156",
      "empresa": "Estrutto Engenharia Ltda.",
      "data": "[data do RDO]"
    }
  }
}`
}

function buildNivel2Prompt(rdoData) {
  return `Analise este RDO e identifique informações que precisam de esclarecimento.

## DADOS DO RDO
${JSON.stringify(rdoData, null, 2)}

## CRITÉRIOS PARA PERGUNTAS
Gere perguntas APENAS quando houver:
1. Fotos com descrições vagas (menos de 10 caracteres)
2. Inconsistências entre materiais e serviços executados
3. Serviços com percentual < 100% sem observações do que falta
4. Intercorrências sem ação tomada descrita
5. Tempo perdido sem justificativa

## REGRAS
- Máximo 4 perguntas, apenas o essencial
- Perguntas específicas e objetivas (referenciar dados concretos)
- NÃO perguntar sobre informações já presentes no RDO

## FORMATO DE SAÍDA (JSON puro)
{
  "precisaPerguntas": true,
  "motivoClassificacao": "razão para as perguntas",
  "perguntas": [
    { "id": 1, "campo": "caminho do campo", "pergunta": "pergunta clara?", "motivo": "por que é importante" }
  ]
}

Se o RDO estiver completo:
{ "precisaPerguntas": false, "motivoClassificacao": "RDO completo" }`
}

function buildNivel2RespostasPrompt(rdoData, perguntas, respostas, obraName) {
  return `O responsável respondeu as perguntas. Processe o RDO completo incorporando as respostas.

## OBRA: ${obraName || 'Obra'}

## RDO ORIGINAL
${JSON.stringify(rdoData, null, 2)}

## PERGUNTAS FEITAS
${JSON.stringify(perguntas, null, 2)}

## RESPOSTAS DO RESPONSÁVEL
${JSON.stringify(respostas, null, 2)}

## INSTRUÇÕES
1. Incorpore as respostas para completar os dados do RDO
2. Gere as 2 versões finais
3. Na versão interna, mencione que informações foram complementadas pelo responsável

Use o mesmo formato JSON do Nível 1.`
}

function buildNivel3Prompt(rdoData, obraName) {
  return `Realize análise profunda e detalhada deste RDO complexo.

## OBRA: ${obraName || 'Obra'}

## DADOS DO RDO
${JSON.stringify(rdoData, null, 2)}

## ANÁLISE REQUERIDA
1. Para cada foto: identifique o serviço mostrado, etapa do processo, qualidade visível
2. Para intercorrências urgentes: classifique gravidade (BAIXA/MEDIA/ALTA/CRITICA), impacto no cronograma, suficiência da ação tomada
3. Para incidentes de segurança: tipo de risco, medidas corretivas, prevenção
4. Correlação: materiais vs serviços, HH vs produtividade

## FORMATO DE SAÍDA (JSON puro)
{
  "versaoInterna": { ... mesmo formato Nível 1 ... },
  "versaoCliente": { ... mesmo formato Nível 1 ... },
  "relatorioTecnico": {
    "nivelComplexidade": "ALTO",
    "analiseDetalhada": {
      "fotos": [
        { "fotoIndex": 0, "servicoRelacionado": "...", "etapaProcesso": "...", "qualidadeVisivel": "...", "observacoesTecnicas": "..." }
      ],
      "intercorrencias": [
        { "descricao": "...", "gravidade": "BAIXA|MEDIA|ALTA|CRITICA", "impactoCronograma": "...", "acaoSuficiente": true, "recomendacoes": "..." }
      ],
      "seguranca": {
        "incidenteRegistrado": false,
        "tipoRisco": "",
        "medidasAdequadas": true,
        "acoesPreventivas": ""
      },
      "consistenciaDados": { "avaliacao": "...", "observacoes": "..." }
    },
    "pontosAtencao": [
      { "area": "...", "descricao": "...", "prioridade": "ALTA|MEDIA|BAIXA" }
    ],
    "recomendacoes": ["ação sugerida 1", "ação sugerida 2"],
    "requerRevisaoEngenheiro": false,
    "motivoRevisao": ""
  }
}`
}

// ─── PARSE SEGURO DE JSON ───
function parseAIResponse(text) {
  // Remove possível markdown code block
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean)
}

// ─── MÉTODOS PÚBLICOS ───
class RDOAgent {
  static classificarNivel(rdoData) {
    return classificarNivel(rdoData)
  }

  static async processarNivel1(rdoData, obraName) {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildNivel1Prompt(rdoData, obraName) }],
    })
    const resultado = parseAIResponse(msg.content[0].text)
    return {
      ...resultado,
      _tokens: { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
    }
  }

  static async gerarPerguntas(rdoData) {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildNivel2Prompt(rdoData) }],
    })
    const resultado = parseAIResponse(msg.content[0].text)
    return {
      ...resultado,
      _tokens: { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
    }
  }

  static async processarComRespostas(rdoData, perguntas, respostas, obraName) {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildNivel2RespostasPrompt(rdoData, perguntas, respostas, obraName) }],
    })
    const resultado = parseAIResponse(msg.content[0].text)
    return {
      ...resultado,
      _tokens: { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
    }
  }

  static async processarNivel3(rdoData, obraName) {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildNivel3Prompt(rdoData, obraName) }],
    })
    const resultado = parseAIResponse(msg.content[0].text)
    return {
      ...resultado,
      _tokens: { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
    }
  }

  static calcularCusto(inputTokens, outputTokens) {
    const COST_INPUT = 3 / 1_000_000   // $3 por 1M tokens
    const COST_OUTPUT = 15 / 1_000_000  // $15 por 1M tokens
    return Number(((inputTokens * COST_INPUT) + (outputTokens * COST_OUTPUT)).toFixed(6))
  }
}

module.exports = RDOAgent
