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
    'pendente',
    'realizado',
    'resposta_positiva',
    'arquivado'
  ],
  segundo_contato: [
    'pendente',
    'realizado',
    'resposta_positiva',
    'arquivado'
  ],
  intercessao: [
    'pendente',
    'em_oracao',
    'concluido'
  ],
  convite_cafe: [
    'pendente',
    'convite_enviado',
    'confirmado',
    'nao_vira'
  ],
  pos_cafe: [
    'compareceu',
    'nao_compareceu',
    'integrado',
    'arquivado'
  ]
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  realizado: 'Realizado',
  resposta_positiva: 'Resposta Positiva',
  arquivado: 'Arquivado',
  em_oracao: 'Em Oração',
  concluido: 'Concluído',
  convite_enviado: 'Convite Enviado',
  confirmado: 'Confirmado',
  nao_vira: 'Não Virá',
  compareceu: 'Compareceu',
  nao_compareceu: 'Não Compareceu',
  integrado: 'Integrado'
}

const STATUS_CLASSES: Record<string, string> = {
  pendente: 'bg-blue-50 text-blue-700',
  realizado: 'bg-amber-50 text-amber-700',      // Mantido em amarelo para o novo status
  resposta_positiva: 'bg-emerald-50 text-emerald-700',
  arquivado: 'bg-rose-50 text-rose-700',
  em_oracao: 'bg-purple-50 text-purple-700',
  concluido: 'bg-emerald-50 text-emerald-700',
  convite_enviado: 'bg-cyan-50 text-cyan-700',
  confirmado: 'bg-green-50 text-green-700',
  nao_vira: 'bg-red-50 text-red-700',
  compareceu: 'bg-teal-50 text-teal-700',
  nao_compareceu: 'bg-slate-100 text-slate-700',
  integrado: 'bg-indigo-50 text-indigo-700'
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
                'pendente'

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

            <ChecklistIntegracaoComponent 
              visitanteId={id} 
              onUpdate={carregarDados} 
              responsavel={responsavelDaEtapa('checklist_integracao')} 
            />
          </div>

          <div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm sticky top-8 max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex gap-2 items-center border-b pb-4">
                <Clock className="text-slate-400" size={20} />
                Histórico de Ações Geral
              </h2>

              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                    <div className="font-bold text-slate-800 text-sm">
                      {traduzirEtapa(item.etapa)}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {item.criado_por} •{' '}
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </div>

                    <div className="mt-2.5 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                      {item.observacao}
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <div className="text-center py-8 text-xs font-medium text-slate-400">
                    Nenhuma movimentação registrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChecklistIntegracaoComponent({ 
  visitanteId, 
  onUpdate, 
  responsavel 
}: { 
  visitanteId: string; 
  onUpdate: () => Promise<void>; 
  responsavel: string 
}) {
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    aceitou_jesus: false, acompanhamento_pastoral: false, pedido_oracao: false,
    participa_culto: false, participa_gc: false, integrado_gc: false,
    participou_cafe: false, novos_membros: false, material_recebido: false,
    batizado: false, membro: false, transferencia: false,
    interest_servir: false, encaminhado_ministerio: false, integrado_ministerio: false
  })

  useEffect(() => {
    async function carregarChecklist() {
      try {
        const { data: dadosIniciais, error } = await supabase
          .from('visitantes_checklist')
          .select('*')
          .eq('visitante_id', visitanteId)
          .single()

        let data = dadosIniciais

        if (error && error.code === 'PGRST116') {
          const { data: newData, error: createError } = await supabase
            .from('visitantes_checklist')
            .insert([{ visitante_id: visitanteId }])
            .select()
            .single()
          
          if (!createError && newData) data = newData
        }

        if (data) {
          const { id: _id, visitante_id: _vId, updated_at: _uAt, ...estados } = data
          setChecklist(estados)
        }
      } catch (err) {
        console.error('Erro ao ler checklist:', err)
      } finally {
        setLoading(false)
      }
    }
    carregarChecklist()
  }, [visitanteId])

  const handleToggle = async (campo: string, label: string) => {
    const novoValor = !checklist[campo]
    
    setChecklist(prev => ({ ...prev, [campo]: novoValor }))

    try {
      const { error: checklistError } = await supabase
        .from('visitantes_checklist')
        .update({ [campo]: novoValor, updated_at: new Date().toISOString() })
        .eq('visitante_id', visitanteId)

      if (checklistError) {
        console.error('Erro ao salvar no banco:', checklistError.message)
        alert('Não foi possível registrar o passo no banco: ' + checklistError.message)
        setChecklist(prev => ({ ...prev, [campo]: !novoValor }))
        return
      }

      await supabase.from('visitantes_timeline').insert([
        {
          visitante_id: visitanteId,
          etapa: 'checklist_integracao',
          status: 'registro',
          observacao: novoValor ? `✓ Mapeado: ${label}` : `✕ Removido: ${label}`,
          criado_por: responsavel
        }
      ])

      await onUpdate()
    } catch (err) {
      console.error('Erro crítico ao salvar item do checklist:', err)
      setChecklist(prev => ({ ...prev, [campo]: !novoValor }))
    }
  }

  const totalItens = Object.keys(checklist).length
  const itensConcluidos = Object.values(checklist).filter(Boolean).length
  const porcentagem = Math.round((itensConcluidos / totalItens) * 100)

  if (loading) return <div className="bg-white rounded-3xl p-6 border text-slate-400 text-sm animate-pulse">Carregando jornada de integração...</div>

  const secoes = [
    {
      titulo: 'Vida Espiritual',
      cor: 'text-rose-500',
      bg: 'bg-rose-50',
      icon: Heart,
      itens: [
        { campo: 'aceitou_jesus', label: 'Aceitou Jesus' },
        { campo: 'acompanhamento_pastoral', label: 'Recebe acompanhamento pastoral' },
        { campo: 'pedido_oracao', label: 'Pedido de oração ativo' },
      ]
    },
    {
      titulo: 'Comunhão',
      cor: 'text-blue-500',
      bg: 'bg-blue-50',
      icon: UsersIcon,
      itens: [
        { campo: 'participa_culto', label: 'Participa de culto regularmente' },
        { campo: 'participa_gc', label: 'Participa de GC (Grupo de Crescimento)' },
        { campo: 'integrado_gc', label: 'Integrado em GC fixo' },
      ]
    },
    {
      titulo: 'Formação',
      cor: 'text-amber-500',
      bg: 'bg-amber-50',
      icon: BookOpen,
      itens: [
        { campo: 'participou_cafe', label: 'Participou Café de Integração' },
        { campo: 'novos_membros', label: 'Concluiu classe de novos membros' },
        { campo: 'material_recebido', label: 'Recebeu material da igreja' },
      ]
    },
    {
      titulo: 'Sacramentos / Membresia',
      cor: 'text-purple-500',
      bg: 'bg-purple-50',
      icon: ShieldCheck,
      itens: [
        { campo: 'batizado', label: 'Batizado' },
        { campo: 'membro', label: 'Recebido como membro' },
        { campo: 'transferencia', label: 'Transferência de membresia' },
      ]
    },
    {
      titulo: 'Serviço',
      cor: 'text-emerald-500',
      bg: 'bg-emerald-50',
      icon: Sparkles,
      itens: [
        { campo: 'interesse_servir', label: 'Interesse em servir' },
        { campo: 'encaminhado_ministerio', label: 'Encaminhado para ministério' },
        { campo: 'integrado_ministerio', label: 'Integrado em ministério' },
      ]
    }
  ]

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="text-blue-600" size={24} /> Checklist de Integração
            </h2>
            <p className="text-slate-500 text-sm mt-1">Acompanhamento dos passos ministeriais do novo membro.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl self-start sm:self-auto uppercase tracking-wider">
            Progresso: {porcentagem}%
          </span>
        </div>
        
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${porcentagem}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {secoes.map((secao) => {
          const IconeSecao = secao.icon
          return (
            <div key={secao.titulo} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className={`p-1.5 rounded-lg ${secao.bg} ${secao.cor}`}>
                  <IconeSecao size={14} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">{secao.titulo}</h4>
              </div>

              <div className="space-y-2.5">
                {secao.itens.map((item) => (
                  <label 
                    key={item.campo} 
                    className="flex items-start gap-3 text-xs text-slate-600 cursor-pointer select-none hover:text-slate-900 transition font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.campo] || false}
                      onChange={() => handleToggle(item.campo, item.label)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {porcentagem === 100 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-semibold">
          <Award className="text-emerald-600 shrink-0" size={24} />
          <span>Parabéns! Este irmão concluiu 100% da jornada de integração e está estabelecido no corpo local!</span>
        </div>
      )}
    </div>
  )
}