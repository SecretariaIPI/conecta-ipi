'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Phone,
  MapPin,
  Filter,
  User,
  ChevronLeft,
  Save,
  X,
  Loader2,
  PhoneOff,
  Coffee
} from 'lucide-react'

// IMPORTS CORRIGIDOS DO DND-KIT
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
  useDroppable,
  DragEndEvent
} from '@dnd-kit/core'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const ETAPAS = [
  'VISITOU',
  'CONTATO',
  'POSITIVO',
  'CAFÉ',
  'PARTICIPOU',
  'SALA_NOVOS',
  'GC',
  'BATISMO',
  'MEMBRESIA',
  'SERVINDO',
  'INTEGRADO',
  'ARQUIVADO'
]

const NOMES_ETAPAS: Record<string, string> = {
  VISITOU: '1. Visitou',
  CONTATO: '2. 1º Contato',
  POSITIVO: '3. Feedback Positivo',
  CAFÉ: '4. Café de Integração',
  PARTICIPOU: '5. Participando',
  SALA_NOVOS: '6. Sala de Novos',
  GC: '7. Pequenos Grupos (GC)',
  BATISMO: '8. Classe Batismo',
  MEMBRESIA: '9. Membresia',
  SERVINDO: '10. Servindo',
  INTEGRADO: '11. Integrado 🚀',
  ARQUIVADO: 'Arquivado 📂'
}

const RESPONSAVEIS_PADRAO: Record<string, string> = {
  VISITOU: 'Secretária',
  CONTATO: 'Pastor Cleber',
  POSITIVO: 'Intercessão',
  CAFÉ: 'Consolidação',
  PARTICIPOU: 'Consolidação'
}

type Visitante = {
  id: string
  nome: string
  telefone: string | null
  cidade: string | null
  confirmou_cafe?: boolean
}

type Pipeline = {
  id: string
  visitante_id: string
  etapa: string
  responsavel: string | null
  observacao: string | null
  data_inicio: string
  data_ultima_movimentacao: string
  integrado: boolean
  visitantes: Visitante | Visitante[]
}

function visitanteData(
  visitante: Visitante | Visitante[] | null | undefined
): Visitante | null {
  if (!visitante) return null
  return Array.isArray(visitante) ? visitante[0] || null : visitante
}

function diasParado(data: string) {
  if (!data) return 0
  const hoje = new Date()
  const ultima = new Date(data)
  const diferenca = hoje.getTime() - ultima.getTime()
  return Math.max(0, Math.floor(diferenca / (1000 * 60 * 60 * 24)))
}

function statusVisual(dias: number) {
  if (dias >= 14) {
    return {
      bg: 'bg-rose-50 border-rose-300',
      border: 'border-rose-300',
      badge: 'bg-rose-600 text-white animate-pulse',
      label: `🚨 Requer Decisão Pastoral (+14d)`
    }
  }

  if (dias >= 7) {
    return {
      bg: 'bg-red-50/60',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-700',
      label: `⚠️ ${dias} dias parado (Crítico)`
    }
  }

  if (dias >= 3) {
    return {
      bg: 'bg-amber-50/60',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      label: `${dias} dias parado`
    }
  }

  return {
    bg: 'bg-white',
    border: 'border-slate-200/80',
    badge: 'bg-slate-100 text-slate-600',
    label: 'Fluxo ativo'
  }
}

function formatarData(data: string) {
  if (!data) return '-'
  return new Date(data).toLocaleString('pt-BR')
}

function CardVisitante({
  item,
  onWhatsapp,
  onSelecionar
}: {
  item: Pipeline
  onWhatsapp: (item: Pipeline) => void
  onSelecionar: (item: Pipeline) => void
}) {
  const visitante = visitanteData(item.visitantes)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item
  })

  const dias = diasParado(item.data_ultima_movimentacao)
  const status = statusVisual(dias)

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${status.bg} ${status.border} border rounded-2xl p-4 shadow-sm hover:shadow-md transition bg-white space-y-3.5 ${
        isDragging ? 'opacity-40 cursor-grabbing' : ''
      }`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing space-y-1">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight leading-snug truncate">
          {visitante?.nome || 'Nome não localizado'}
        </h3>
        <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${status.badge}`}>
          {status.label}
        </span>

        <div className="pt-2 space-y-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{visitante?.telefone || 'Sem número'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{visitante?.cidade || 'Não informada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={13} className="text-slate-400 shrink-0" />
            <span className="truncate italic font-semibold text-indigo-600">
              Resp: {item.responsavel || 'Nenhum'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onWhatsapp(item)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-95"
        >
          <MessageSquare size={13} /> WhatsApp
        </button>
        <button
          onClick={() => onSelecionar(item)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 flex items-center justify-center text-xs font-bold transition active:scale-95"
        >
          Ver Ficha
        </button>
      </div>
    </div>
  )
}

function Coluna({
  etapa,
  items,
  onWhatsapp,
  onSelecionar
}: {
  etapa: string
  items: Pipeline[]
  onWhatsapp: (item: Pipeline) => void
  onSelecionar: (item: Pipeline) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })

  return (
    <div
      ref={setNodeRef}
      className={`w-[340px] rounded-2xl border flex flex-col h-[760px] transition duration-150 ${
        isOver ? 'bg-indigo-50/50 border-indigo-300' : 'bg-slate-100/80 border-slate-200/50'
      } p-3`}
    >
      <div className="bg-white border border-slate-200/60 rounded-xl px-4 py-3 flex justify-between items-center mb-3 shadow-sm">
        <div className="font-black text-slate-800 text-xs tracking-wide uppercase">
          {NOMES_ETAPAS[etapa] || etapa}
        </div>
        <div className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md">
          {items.length}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-2 scrollbar-thin">
        {items.map((item) => (
          <CardVisitante key={item.id} item={item} onWhatsapp={onWhatsapp} onSelecionar={onSelecionar} />
        ))}
        {items.length === 0 && (
          <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium bg-white/40">
            Nenhum registro
          </div>
        )}
      </div>
    </div>
  )
}

export default function AutomacoesPage() {
  const [pipeline, setPipeline] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [activeItem, setActiveItem] = useState<Pipeline | null>(null)
  const [selecionado, setSelecionado] = useState<Pipeline | null>(null)
  const [responsavelEdit, setResponsavelEdit] = useState('')
  const [observacaoEdit, setObservacaoEdit] = useState('')
  
  // 🛡️ TRAVA DE HIDRATAÇÃO DO DOM (Evita erros assíncronos de listener do dnd-kit)
  const [montado, setMontado] = useState(false)
  
  const dataLimite = '2026-01-01'
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    setMontado(true)
  }, [])

  const carregarPipeline = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('integracao_pipeline')
        .select(`
          *,
          visitantes (
            id,
            nome,
            telefone,
            cidade,
            confirmou_cafe
          )
        `)
        .order('data_ultima_movimentacao', { ascending: false })

      if (error) {
        setErro(error.message)
        return
      }

      setPipeline((data as Pipeline[]) || [])
    } catch (err: any) {
      setErro(err.message || 'Falha operacional de conexão.')
    } finally {
      setLoading(false)
    }
  }, [])

  const executarEnvioLote = useCallback(async () => {
    console.log('Filtros aplicados para envio com data corte:', dataLimite)
  }, [dataLimite])

  const carregarDadosAnaliticos = useCallback(async () => {
    console.log('Atualizando contadores e painel gerencial.')
  }, [])

  useEffect(() => {
    carregarPipeline()
  }, [carregarPipeline])

  useEffect(() => {
    carregarDadosAnaliticos()
  }, [carregarDadosAnaliticos])

  useEffect(() => {
    executarEnvioLote()
  }, [executarEnvioLote])

  function selecionarItem(item: Pipeline) {
    setSelecionado(item)
    setResponsavelEdit(item.responsavel || '')
    setObservacaoEdit(item.observacao || '')
  }

  async function salvarEdicao() {
    if (!selecionado) return

    const { error } = await supabase
      .from('integracao_pipeline')
      .update({
        responsavel: responsavelEdit,
        observacao: observacaoEdit,
        data_ultima_movimentacao: new Date().toISOString()
      })
      .eq('id',痴elecionado.id)

    if (error) {
      alert('Erro ao salvar edições: ' + error.message)
      return
    }

    carregarPipeline()
    setSelecionado(null)
  }

  async function moverEtapa(itemId: string, novaEtapa: string) {
    const responsavelAutomatico = RESPONSAVEIS_PADRAO[novaEtapa] || null
    const camposAtualizados: any = {
      etapa: novaEtapa,
      integrado: novaEtapa === 'INTEGRADO',
      data_ultima_movimentacao: new Date().toISOString()
    }

    if (responsavelAutomatico) {
      camposAtualizados.responsavel = responsavelAutomatico
    }

    const { error } = await supabase
      .from('integracao_pipeline')
      .update(camposAtualizados)
      .eq('id', itemId)

    if (error) {
      alert('Erro ao mover de estágio: ' + error.message)
    }

    carregarPipeline()
  }

  async function voltarEtapa(item: Pipeline) {
    const atual = ETAPAS.indexOf(item.etapa)
    if (atual <= 0) return

    await moverEtapa(item.id, ETAPAS[atual - 1])
    setSelecionado(null)
  }

  const abrirWhatsapp = useCallback((item: Pipeline) => {
    const visitante = visitanteData(item.visitantes)
    if (!visitante?.telefone) return

    const telefone = visitante.telefone.replace(/\D/g, '')
    const primeiroNome = visitante.nome.split(' ')[0]
    const mensagem = encodeURIComponent(`Olá ${primeiroNome}, graça e paz! 🙏 Tudo bem?`)

    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank')
  }, [])

  function dispararNotificacaoLider(item: Pipeline) {
    const visitante = visitanteData(item.visitantes)
    const dias = diasParado(item.data_ultima_movimentacao)
    const mensagem = encodeURIComponent(
      `Atenção Pastoral: *${visitante?.nome || 'Visitante'}* está parado(a) há *${dias} dias* na etapa *${NOMES_ETAPAS[item.etapa]}*.`
    )
    window.open(`https://wa.me/?text=${mensagem}`, '_blank')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveItem(null)

    if (!over) return

    const destino = String(over.id)
    const item = pipeline.find((p) => p.id === String(active.id))

    if (!item) return
    if (item.etapa === destino) return

    moverEtapa(item.id, destino)
  }

  const pipelineFiltrado = useMemo(() => {
    if (filtro === 'travados') {
      return pipeline.filter((p) => diasParado(p.data_ultima_movimentacao) >= 7 && p.etapa !== 'ARQUIVADO')
    }
    if (filtro === 'sem_responsavel') {
      return pipeline.filter((p) => !p.responsavel && p.etapa !== 'ARQUIVADO')
    }
    if (filtro === 'sem_telefone') {
      return pipeline.filter((p) => !visitanteData(p.visitantes)?.telefone && p.etapa !== 'ARQUIVADO')
    }
    if (filtro === 'confirmados_cafe') {
      return pipeline.filter((p) => visitanteData(p.visitantes)?.confirmou_cafe && p.etapa === 'CAFÉ')
    }
    if (filtro === 'integrados') {
      return pipeline.filter((p) => p.integrado)
    }
    return pipeline
  }, [pipeline, filtro])

  const analiseAutomatizadaLotes = useMemo(() => {
    return pipelineFiltrado.filter((p) => diasParado(p.data_ultima_movimentacao) > 2 && dataLimite !== '')
  }, [pipelineFiltrado, dataLimite])

  const mtTravados = pipeline.filter((p) => diasParado(p.data_ultima_movimentacao) >= 7 && p.etapa !== 'ARQUIVADO').length
  const mtSemLider = pipeline.filter((p) => !p.responsavel && p.etapa !== 'ARQUIVADO').length
  const mtSemWhats = pipeline.filter((p) => !visitanteData(p.visitantes)?.telefone && p.etapa !== 'ARQUIVADO').length
  const mtCafeHoje = pipeline.filter((p) => visitanteData(p.visitantes)?.confirmou_cafe && p.etapa === 'CAFÉ').length

  const pipelinePorEtapa = useMemo(() => {
    const agrupado: Record<string, Pipeline[]> = {}
    ETAPAS.forEach((etapa) => {
      agrupado[etapa] = pipelineFiltrado.filter((p) => p.etapa === etapa)
    })
    return agrupado
  }, [pipelineFiltrado])

  function styleFiltro(tipo: string) {
    const base = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95'
    if (filtro === tipo) {
      if (tipo === 'todos') return `${base} bg-slate-900 text-white`
      if (tipo === 'travados') return `${base} bg-red-600 text-white`
      if (tipo === 'sem_responsavel') return `${base} bg-amber-500 text-white`
      if (tipo === 'sem_telefone') return `${base} bg-rose-600 text-white`
      if (tipo === 'confirmados_cafe') return `${base} bg-indigo-600 text-white`
    }
    if (tipo === 'travados') return `${base} bg-red-50 text-red-700 hover:bg-red-100/70`
    if (tipo === 'sem_responsavel') return `${base} bg-amber-50 text-amber-700 hover:bg-amber-100/70`
    if (tipo === 'sem_telefone') return `${base} bg-rose-50 text-rose-700 hover:bg-rose-100/70`
    if (tipo === 'confirmados_cafe') return `${base} bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70`
    return `${base} bg-slate-50 text-slate-600 hover:bg-slate-100`
  }

  // 🛡️ SE NÃO ESTIVER MONTADO NO CLIENTE, MANTÉM CARREGANDO PREVENTIVAMENTE
  if (!montado || loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="font-semibold tracking-wide">Alinhando automações de jornada...</span>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-10 text-red-600 font-bold bg-red-50 rounded-3xl border border-red-200 m-8 max-w-xl mx-auto text-center">
        Erro ao carregar o módulo: {erro}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[2400px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-sm">
                <TrendingUp size={22} />
              </div>
              Controle de Disparos e Automações
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm font-medium">
              Monitoramento ativo de {analiseAutomatizadaLotes.length} contatos elegíveis para régua de mensagens.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="w-fit bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition"
          >
            <ChevronLeft size={14} /> Dashboard Principal
          </Link>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">🔥 Travados +7 dias</p>
              <h3 className="text-2xl font-black text-red-600 mt-0.5 tracking-tight">{mtTravados}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={20} /></div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">⚠ Sem Responsável</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5 tracking-tight">{mtSemLider}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><User size={20} /></div>
          </div>

          <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">📵 Sem Telefone</p>
              <h3 className="text-2xl font-black text-rose-600 mt-0.5 tracking-tight">{mtSemWhats}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><PhoneOff size={20} /></div>
          </div>

          <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">☕ Confirmados Café</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-0.5 tracking-tight">{mtCafeHoje}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Coffee size={20} /></div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-wider pr-2">
            <Filter size={14} />Visão Rápida:
          </div>
          <button onClick={() => setFiltro('todos')} className={styleFiltro('todos')}>Todos os Registros</button>
          <button onClick={() => setFiltro('travados')} className={styleFiltro('travados')}>🔥 Só Travados</button>
          <button onClick={() => setFiltro('sem_responsavel')} className={styleFiltro('sem_responsavel')}>👤 Sem Líder</button>
          <button onClick={() => setFiltro('sem_telefone')} className={styleFiltro('sem_telefone')}>📵 Sem Whats</button>
          <button onClick={() => setFiltro('confirmados_cafe')} className={styleFiltro('confirmados_cafe')}>☕ Confirmados Café</button>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={(event) => {
            const item = pipeline.find((p) => p.id === String(event.active.id))
            setActiveItem(item || null)
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="flex gap-5 min-w-max pr-2">
              {ETAPAS.map((etapa) => (
                <Coluna
                  key={etapa}
                  etapa={etapa}
                  items={pipelinePorEtapa[etapa] || []}
                  onWhatsapp={abrirWhatsapp}
                  onSelecionar={selecionarItem}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="w-[340px] rotate-2 opacity-95 pointer-events-none">
                <div className="border border-indigo-200 shadow-md rounded-2xl p-4 bg-white space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {visitanteData(activeItem.visitantes)?.nome || 'Visitante'}
                  </h3>
                  <div className="text-xs text-indigo-600 font-medium">Movendo entre estágios...</div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Drawer Lateral */}
        {selecionado && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex justify-end">
            <div className="w-[520px] h-full bg-white shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-slate-100">
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {visitanteData(selecionado.visitantes)?.nome}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Acompanhamento Pastoral Individual</p>
                  </div>
                  <button onClick={() => setSelecionado(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl transition">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Líder Responsável</label>
                      {RESPONSAVEIS_PADRAO[selecionado.etapa] && (
                        <button
                          type="button"
                          onClick={() => setResponsavelEdit(RESPONSAVEIS_PADRAO[selecionado.etapa])}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold transition"
                        >
                          ✨ Sugerir: {RESPONSAVEIS_PADRAO[selecionado.etapa]}
                        </button>
                      )}
                    </div>
                    <input
                      value={responsavelEdit}
                      onChange={(e) => setResponsavelEdit(e.target.value)}
                      className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-indigo-600 transition font-medium"
                      placeholder={RESPONSAVEIS_PADRAO[selecionado.etapa] || "Atribuir líder..."}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observações Pastorais</label>
                    <textarea
                      value={observacaoEdit}
                      onChange={(e) => setObservacaoEdit(e.target.value)}
                      rows={4}
                      className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-indigo-600 transition"
                      placeholder="Histórico espiritual do novo membro..."
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Histórico de Jornada</h3>
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {ETAPAS.map((etapa) => {
                      const ativo = etapa === selecionado.etapa
                      const concluido = ETAPAS.indexOf(etapa) <= ETAPAS.indexOf(selecionado.etapa)

                      return (
                        <div key={etapa} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${concluido ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            <span className={`font-semibold ${ativo ? 'text-indigo-600 font-bold' : concluido ? 'text-slate-700' : 'text-slate-400'}`}>
                              {NOMES_ETAPAS[etapa] || etapa}
                            </span>
                          </div>
                          {ativo && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                              Modificado: {formatarData(selecionado.data_ultima_movimentacao)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-3">
                <button onClick={salvarEdicao} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95">
                  <Save size={16} />Salvar Ajustes
                </button>
                <button onClick={() => abrirWhatsapp(selecionado)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95">
                  <MessageSquare size={16} />Contatar pelo WhatsApp
                </button>
                <button onClick={() => dispararNotificacaoLider(selecionado)} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95">
                  <AlertTriangle size={16} />Alertar Liderança
                </button>
                <button onClick={() => voltarEtapa(selecionado)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-sm font-extrabold transition active:scale-95">
                  ⬅ Voltar Etapa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}