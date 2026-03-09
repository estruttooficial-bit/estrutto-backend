const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Você é o Agente de Relatório Semanal da Estrutto Engenharia Ltda.
Sua função é consolidar múltiplos RDOs diários em um Relatório Semanal profissional em 2 versões.

## REGRAS
- Usar apenas dados reais dos RDOs (nunca inventar)
- Versão interna: linguagem técnica, alertas, desvios, HH total, custo
- Versão cliente: linguagem formal/positiva, foco em progresso e qualidade
- Retornar sempre JSON válido sem markdown externo`

function buildPrompt(rdos, obraName, semana) {
  return `Consolide os RDOs da semana ${semana} em um Relatório Semanal para a obra "${obraName}".

## RDOs DA SEMANA (${rdos.length} relatório${rdos.length > 1 ? 's' : ''})
${JSON.stringify(rdos.map(r => ({
  data: r.date,
  responsavel: r.user?.name,
  conteudo: (() => { try { return JSON.parse(r.content) } catch { return { atividades: r.content } } })(),
  versaoInterna: r.versaoInterna,
  versaoCliente: r.versaoCliente,
})), null, 2)}

## FORMATO DE SAÍDA (JSON puro)
{
  "semana": "${semana}",
  "periodo": "DD/MM a DD/MM/AAAA",
  "totalDiasTrabalho": N,
  "versaoInterna": {
    "titulo": "Relatório Semanal Interno – ${obraName} – Semana ${semana}",
    "resumoExecutivo": "2-3 frases consolidadas",
    "hhTotal": "total de homem-hora estimado na semana",
    "avancoPorcentagem": "X%",
    "secoes": {
      "clima": "resumo climático da semana",
      "equipe": "equipe e HH consolidados",
      "atividades": "consolidação de todas as atividades da semana",
      "materiais": "materiais utilizados no período",
      "equipamentos": "equipamentos utilizados",
      "intercorrencias": "intercorrências da semana (🚨 se urgente)",
      "seguranca": "balanço de segurança da semana",
      "fotos": "registro fotográfico do período",
      "observacoes": "observações consolidadas",
      "previsaoProximaSemana": "o que está previsto para a próxima semana"
    },
    "alertas": [
      { "tipo": "URGENTE|ATENCAO|INFO", "mensagem": "...", "prioridade": "ALTA|MEDIA|BAIXA" }
    ],
    "desvios": "desvios identificados e ações corretivas"
  },
  "versaoCliente": {
    "titulo": "Relatório de Progresso Semanal – ${obraName}",
    "introducao": "parágrafo formal de abertura",
    "progressoGeral": { "resumo": "...", "percentual": "..." },
    "destaquesDaSemana": ["destaque 1", "destaque 2", "destaque 3"],
    "servicosRealizados": [
      { "descricao": "...", "detalhes": "...", "status": "Concluído|Em andamento X%" }
    ],
    "proximaSemana": { "descricao": "...", "prazo": "..." },
    "registroFotografico": [{ "descricao": "..." }],
    "observacoes": "comentário positivo final",
    "assinatura": {
      "responsavelTecnico": "Eng. Luan Schons",
      "crea": "CREA/RS 241156",
      "empresa": "Estrutto Engenharia Ltda.",
      "cnpj": "60.355.149/0001-15",
      "data": "${new Date().toLocaleDateString('pt-BR')}"
    }
  }
}`
}

function parseResponse(text) {
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean)
}

class WeeklyAgent {
  static async gerarRelatorioSemanal(rdos, obraName, semana) {
    if (!rdos || rdos.length === 0) throw new Error('Nenhum RDO encontrado para a semana')

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(rdos, obraName, semana) }],
    })

    const resultado = parseResponse(msg.content[0].text)
    return {
      ...resultado,
      _tokens: { input: msg.usage.input_tokens, output: msg.usage.output_tokens }
    }
  }

  static calcularCusto(inputTokens, outputTokens) {
    const COST_INPUT = 3 / 1_000_000
    const COST_OUTPUT = 15 / 1_000_000
    return Number(((inputTokens * COST_INPUT) + (outputTokens * COST_OUTPUT)).toFixed(6))
  }
}

module.exports = WeeklyAgent
