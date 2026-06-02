'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft,
  Clock,
  Send,
  Printer,
  Phone,
  MapPin,
  User,
  Save,
  CheckCircle2,
  Award,
  Heart,
  Users as UsersIcon,
  BookOpen,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Visitante = {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  created_at: string
}

type Followup = {
  etapa: string
  status: string
  data_contato: string | null
}

type TimelineEvent = {
  id: string
  etapa: string
  status: string
  observacao: string | null
  criado_por: string
  created_at: string
}

type ConfigEtapa = {
  etapa: string
  responsavel_nome: string
}

const ETAPAS = [
  'primeiro_contato',
  'segundo_contato',
  'intercessao',
  'convite_cafe',
  'pos_cafe'
]

const STATUS_POR_ETAPA: Record<string, string[]> = {
  primeiro_contato: [
    'nao_realizado',
    'realizado',
    'resposta_positiva'
  ],
  segundo_contato: [
    'nao_realizado',
    'realizado',
    'resposta_positiva'
  ],
  intercessao: [
    'nao_realizado',
    'resposta_positiva'
  ],
  convite_cafe: [
    'nao_realizado',
    'realizado',
    'resposta_positiva'
  ],
  pos_cafe: [
    'compareceu',
    'nao_compareceu'
  ]
}

const STATUS_LABELS: Record<string, string> = {
  nao_realizado: 'Não Realizado',
  realizado: 'Realizado',
  resposta_positiva: 'Resposta Positiva',
  compareceu: 'Compareceu',
  nao_compareceu: 'Não Compareceu'
}

const STATUS_CLASSES: Record<string, string> = {
  nao_realizado: 'bg-red-50 text-red-700',
  realizado: 'bg-amber-50 text-amber-700',
  resposta_positiva: 'bg-emerald-50 text-emerald-700',
  compareceu: 'bg-emerald-50 text-emerald-700',
  nao_compareceu: 'bg-red-50 text-red-700'
}

function traduzirEtapa(etapa: string) {
  const mapa: Record<string, string> = {
    primeiro_contato: '1º Contato',
    segundo_contato: '2º Contato',
    intercessao: 'Intercessão',
    convite_cafe: 'Convite Café',
    pos_cafe: 'Pós Café',
    checklist_integracao: 'Checklist de Integração'
  }

  return mapa[etapa] || etapa
}

export default function FichaVisitantePage() {
  const params = useParams()
  const id = params?.id as string

  const [visitante, setVisitante] = useState<Visitante | null>(null)
  const [followups, setFollowups] = useState<Followup[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [configEtapas, setConfigEtapas] = useState<ConfigEtapa[]>([])
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)

    const [vResp, fResp, tResp, cResp] = await Promise.all([
      supabase.from('visitantes').select('*').eq('id', id).single(),
      supabase.from('visitantes_followup').select('*').eq('visitante_id', id),
      supabase
        .from('visitantes_timeline')
        .select('*')
        .eq('visitante_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('configuracao_etapas').select('*')
    ])

    setVisitante(vResp.data)
    setFollowups(fResp.data || [])
    setTimeline(tResp.data || [])
    setConfigEtapas(cResp.data || [])
    setLoading(false)
  }

  function responsavelDaEtapa(etapa: string) {
    const etapaTexto = (etapa || '').toUpperCase();

    const responsavelConfigurado = configEtapas.find(
      (item) => (item.etapa || '').toUpperCase() === etapaTexto
    )?.responsavel_nome;

    if (responsavelConfigurado) {
      return responsavelConfigurado;
    }

    if (etapaTexto.includes('PRIMEIRO_CONTATO') || etapaTexto.includes('1')) {
      return 'Secretária';
    }
    if (etapaTexto.includes('SEGUNDO_CONTATO') || etapaTexto.includes('2')) {
      return 'Pastor Cleber';
    }
    if (etapaTexto.includes('INTERCESSAO') || etapaTexto.includes('3')) {
      return 'Intercessão';
    }
    if (etapaTexto.includes('CONVITE_CAFE') || etapaTexto.includes('POS_CAFE') || etapaTexto.includes('CAFÉ') || etapaTexto.includes('4') || etapaTexto.includes('5')) {
      return 'Consolidação';
    }

    return 'Secretária';
  }

  async function salvarRegistro(etapa: string) {
    const texto = observacoes[etapa]?.trim()
    if (!texto) return

    await supabase.from('visitantes_timeline').insert([
      {
        visitante_id: id,
        etapa,
        status: 'registro',
        observacao: texto,
        criado_por: responsavelDaEtapa(etapa)
      }
    ])

    setObservacoes((prev) => ({
      ...prev,
      [etapa]: ''
    }))

    setFeedback((prev) => ({
      ...prev,
      [etapa]: true
    }))

    setTimeout(() => {
      setFeedback((prev) => ({
        ...prev,
        [etapa]: false
      }))
    }, 2000)

    await carregarDados()
  }

  async function alterarStatus(etapa: string, status: string) {
    try {
      const { error } = await supabase
        .from('visitantes_followup')
        .upsert(
          {
            visitante_id: id,
            etapa,
            status,
            data_contato: new Date().toISOString()
          },
          { onConflict: 'visitante_id,etapa' }
        )

      if (error) {
        console.error("Erro Supabase Status:", error.message)
        alert("Erro ao salvar status no banco: " + error.message)
        return
      }

      await carregarDados()
    } catch (err) {
      console.error("Erro na requisição de status:", err)
    }
  }

  async function enviarWhatsapp(etapa: string) {
    if (!visitante?.telefone) return

    const nome = visitante.nome.split(' ')[0]
    const telefone = visitante.telefone.replace(/\D/g, '')

    let message = `Olá ${nome}, graça e paz!`

    if (etapa === 'convite_cafe') {
      message = `Olá ${nome}! Queremos te convidar para nosso Café de Integração ☕`
    }

    await supabase.from('visitantes_timeline').insert([
      {
        visitante_id: id,
        etapa,
        status: 'whatsapp',
        observacao: 'WhatsApp enviado',
        criado_por: responsavelDaEtapa(etapa)
      }
    ])

    window.open(
      `https://wa.me/55${telefone}?text=${encodeURIComponent(message)}`,
      '_blank'
    )

    await carregarDados()
  }

  if (loading || !visitante) {
    return <div className="p-10 text-slate-500 font-medium">Carregando ficha do visitante...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between mb-8">
          <Link
            href="/visitantes"
            className="flex items-center gap-2 text-slate-700 font-medium hover:text-slate-900 transition"
          >
            <ArrowLeft size={18} />
            Voltar para listagem
          </Link>

          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 transition text-white px-5 py-3 rounded-xl flex gap-2 items-center text-sm font-medium"
          >
            <Printer size={16} />
            Imprimir Ficha
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm">
              <h1 className="text-4xl font-bold text-slate-900">{visitante.nome}</h1>

              <div className="grid md:grid-cols-3 gap-4 mt-6 text-slate-600 text-sm">
                <div className="flex gap-2 items-center">
                  <Phone size={16} className="text-slate-400" />
                  {visitante.telefone || 'Sem telefone'}
                </div>

                <div className="flex gap-2 items-center">
                  <MapPin size={16} className="text-slate-400" />
                  {visitante.cidade || 'Não informada'}
                </div>

                <div className="flex gap-2 items-center">
                  <User size={16} className="text-slate-400" />
                  Cadastrado em: {new Date(visitante.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            {ETAPAS.map((etapa) => {
              const statusAtual =
                followups.find((item) => item.etapa === etapa)?.status ||
                'nao_realizado'

              const historicoEtapa = timeline.filter(
                (item) =>
                  item.etapa === etapa &&
                  (item.status === 'registro' || item.status === 'whatsapp')
              )

              return (
                <div key={etapa} className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        {traduzirEtapa(etapa)}
                      </h2>

                      <p className="text-slate-500 text-sm mt-1">
                        Responsável: <span className="font-semibold text-indigo-600">{responsavelDaEtapa(etapa)}</span>
                      </p>

                      <div
                        className={`mt-3 inline-block px-3 py-1.5 rounded-xl font-semibold text-xs tracking-wide uppercase ${STATUS_CLASSES[statusAtual]}`}
                      >
                        Status atual: {STATUS_LABELS[statusAtual]}
                      </div>
                    </div>

                    <button
                      onClick={() => enviarWhatsapp(etapa)}
                      className="bg-emerald-600 hover:bg-emerald-700 transition text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium w-full sm:w-auto justify-center"
                    >
                      <Send size={14} />
                      Chamar no WhatsApp
                    </button>
                  </div>

                  {historicoEtapa.length > 0 && (
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 mb-5">
                      <p className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">
                        Histórico de Registros desta etapa
                      </p>

                      <div className="space-y-2">
                        {historicoEtapa.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
                          >
                            <div className="text-xs text-slate-400 mb-1 font-medium">
                              {item.criado_por} •{' '}
                              {new Date(item.created_at).toLocaleString('pt-BR')}
                            </div>

                            <div className="text-sm text-slate-700">{item.observacao}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={observacoes[etapa] || ''}
                    onChange={(e) =>
                      setObservacoes((prev) => ({
                        ...prev,
                        [etapa]: e.target.value
                      }))
                    }
                    placeholder="Anote detalhes do atendimento, motivos de oração ou agendamentos realizados..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-blue-500 text-slate-700 resize-none"
                  />

                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => salvarRegistro(etapa)}
                      className="bg-slate-900 hover:bg-slate-800 transition text-white px-5 py-2.5 rounded-xl flex gap-2 items-center text-sm font-medium"
                    >
                      <Save size={14} />
                      Salvar anotação
                    </button>

                    {feedback[etapa] && (
                      <span className="text-emerald-600 font-semibold text-sm">
                        ✓ Registro salvo!
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
                    {STATUS_POR_ETAPA[etapa].map((status) => (
                      <button
                        key={status}
                        onClick={() => alterarStatus(etapa, status)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          statusAtual === status
                            ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-2'
                            : STATUS_CLASSES[status] + ' opacity-70 hover:opacity-100'
                        }`}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
