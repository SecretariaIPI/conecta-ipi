'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  Loader2, ArrowLeft, Plus, MoveRight, 
  MessageSquare, X, Save
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface ItemTrilho {
  id: string
  pessoa_id: string
  etapa_atual: 'SALA_DE_NOVOS' | 'BATISMO_RECEBIMENTO' | 'FASE_2_ENGAJAMENTO' | 'FASE_3_MINISTERIO'
  gc_vinculado: string | null
  curso_atual: string | null
  ministerio_ativo: string | null
  ultima_interacao: string
  visitantes: { nome: string; telefone: string | null } | null
}

interface CadastroSimples { id: string; nome: string }
interface ItemListaAux { id: string; nome: string }
interface NotaPastoral { id: string; texto: string; criado_em: string; autor: string }

export default function TrilhoCrescimentoPage() {
  const [loading, setLoading] = useState(true)
  const [itens, setItens] = useState<ItemTrilho[]>([])
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<CadastroSimples[]>([])
  const [gcsDisponiveis, setGcsDisponiveis] = useState<ItemListaAux[]>([])
  const [ministeriosDisponiveis, setMinisteriosDisponiveis] = useState<ItemListaAux[]>([])
  
  const [pessoaSelecionada, setPessoaSelecionada] = useState('')
  const [inserindo, setInserindo] = useState(false)

  const [trilhoFoco, setTrilhoFoco] = useState<ItemTrilho | null>(null)
  const [notasDoFoco, setNotasDoFoco] = useState<NotaPastoral[]>([])
  const [novaNotaTexto, setNovaNotaTexto] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  async function carregarDados() {
    try {
      setLoading(true)
      
      // 1. Busca os registros do histórico de acompanhamento do café
      const { data: followupData } = await supabase
        .from('visitantes_followup')
        .select('pessoa_id, status')
        .or('etapa.eq.convite_cafe,etapa.eq.cafe')

      // Filtra os IDs das pessoas confirmadas com o status correto do seu formulário
      const IDsValidosDoCafe = new Set(
        (followupData || [])
          .filter(f => {
            const st = String(f.status || '').toLowerCase().trim()
            return st === 'compareceu' || st === 'concluido' || st === 'realizado' || st === 'resposta positiva'
          })
          .map(f => f.pessoa_id)
      )
      
      // 2. Busca todas as linhas puras da tabela do trilho de crescimento
      const { data: trilhoData } = await supabase
        .from('trilho_crescimento')
        .select('*')

      // 3. Busca a tabela geral de visitantes para vincular os nomes manualmente e evitar erros de relacionamento
      const { data: visitantesGeral } = await supabase
        .from('visitantes')
        .select('id, nome, telefone')

      // Cria um mapa de busca rápida dos dados de visitantes indexados pelo ID
      const mapaVisitantes = new Map<string, { nome: string; telefone: string | null }>()
      if (visitantesGeral) {
        visitantesGeral.forEach(v => {
          mapaVisitantes.set(v.id, { nome: v.nome, telefone: v.telefone })
        })
      }
      
      // 4. Mapeia e cruza as informações diretamente em memória de forma segura
      const itensMontados = (trilhoData || [])
        .map((item: any) => {
          // Garante capturar o ID correto da pessoa independente se a coluna física se chama pessoa_id ou visitante_id
          const idReferencia = item.pessoa_id || item.visitante_id
          const dadosDoVisitante = idReferencia ? mapaVisitantes.get(idReferencia) : null

          return {
            id: item.id,
            pessoa_id: idReferencia,
            etapa_atual: item.etapa_atual,
            gc_vinculado: item.gc_vinculado,
            curso_atual: item.curso_atual,
            ministerio_ativo: item.ministerio_ativo,
            ultima_interacao: item.ultima_interacao || new Date().toISOString(),
            visitantes: dadosDoVisitante || { nome: 'Nome não identificado', telefone: '' }
          }
        })
        // Regra de exibição: Se estiver na Sala de Novos, exige que o ID esteja mapeado no histórico do Café
        .filter((item: any) => {
          if (item.etapa_atual === 'SALA_DE_NOVOS') {
            return IDsValidosDoCafe.has(item.pessoa_id)
          }
          return true
        }) as ItemTrilho[]

      setItens(itensMontados)

      // 5. Configura quem pode ser selecionado na caixa de entrada superior
      if (visitantesGeral) {
        const jaExibidosNoKanban = new Set(itensMontados.map(t => t.pessoa_id))
        setPessoasDisponiveis(
          visitantesGeral
            .filter(v => !jaExibidosNoKanban.has(v.id))
            .map(v => ({ id: v.id, nome: v.nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome))
        )
      }

      const { data: gcData } = await supabase.from('celulas_gcs').select('id, nome').order('nome')
      setGcsDisponiveis(gcData || [])

      const { data: minData } = await supabase.from('ministerios').select('id, nome').order('nome')
      setMinisteriosDisponiveis(minData || [])

    } catch (err) {
      console.error('Erro na sincronização de dados do Trilho:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function abrirModalNotas(item: ItemTrilho) {
    setTrilhoFoco(item)
    setNovaNotaTexto('')
    const { data } = await supabase
      .from('notas_pastorais')
      .select('*')
      .eq('trilho_id', item.id)
      .order('criado_em', { ascending: false })
    setNotasDoFoco(data || [])
  }

  async function adicionarNotaPastoral(e: React.FormEvent) {
    e.preventDefault()
    if (!novaNotaTexto.trim() || !trilhoFoco) return
    try {
      setSalvandoNota(true)
      const { error } = await supabase
        .from('notas_pastorais')
        .insert({ 
          trilho_id: trilhoFoco.id, 
          texto: novaNotaTexto, 
          autor: 'Acompanhamento Pastoral' 
        })
      if (error) throw error
      setNovaNotaTexto('')
      
      const { data } = await supabase
        .from('notas_pastorais')
        .select('*')
        .eq('trilho_id', trilhoFoco.id)
        .order('criado_em', { ascending: false })
      setNotasDoFoco(data || [])
    } catch (err) {
      alert('Erro ao salvar nota.')
    } finally {
      setSalvandoNota(false)
    }
  }

  async function moverEtapa(id: string, etapaAtual: string, pessoaId: string) {
    const etapas: ItemTrilho['etapa_atual'][] = ['SALA_DE_NOVOS', 'BATISMO_RECEBIMENTO', 'FASE_2_ENGAJAMENTO', 'FASE_3_MINISTERIO']
    const idx = etapas.indexOf(etapaAtual as any)
    if (idx === -1 || idx === etapas.length - 1) return
    const novaEtapa = etapas[idx + 1]

    let updatePayload: any = { etapa_atual: novaEtapa, ultima_interacao: new Date().toISOString() }

    if (novaEtapa === 'FASE_2_ENGAJAMENTO') {
      const opcoesGc = gcsDisponiveis.map((g: any) => g.nome).join(', ')
      const gcNome = prompt(`Vincular a qual GC? Opções disponíveis:\n${opcoesGc || 'Nenhum GC cadastrado'}`)
      if (gcNome) updatePayload.gc_vinculado = gcNome
    }
    if (novaEtapa === 'FASE_3_MINISTERIO') {
      const opcoesMin = ministeriosDisponiveis.map((m: any) => m.nome).join(', ')
      const minNome = prompt(`Vincular a qual Ministério de serviço?\n${opcoesMin || 'Nenhum Ministério cadastrado'}`)
      if (minNome) updatePayload.ministerio_ativo = minNome
    }

    try {
      // Garante a modificação identificando as colunas possíveis dinamicamente
      await supabase.from('trilho_crescimento').update(updatePayload).eq('id', id)
      await supabase.from('historico_trilho').insert({ 
        pessoa_id: pessoaId, 
        etapa_anterior: etapaAtual, 
        etapa_nova: novaEtapa 
      })
      carregarDados()
    } catch (err) {
      alert('Erro ao avançar cartão.')
    }
  }

  async function adicionarAoTrilho(e: React.FormEvent) {
    e.preventDefault()
    if (!pessoaSelecionada) return
    try {
      setInserindo(true)
      await supabase.from('visitantes_followup').insert({
        pessoa_id: pessoaSelecionada,
        etapa: 'cafe',
        status: 'COMPARECEU',
        descricao: 'Inserido manualmente através do painel de controle do Trilho.'
      })

      // Verifica a existência testando ambas as colunas mapeadas do banco
      const { data: checkExist1 } = await supabase
        .from('trilho_crescimento')
        .select('id')
        .eq('pessoa_id', pessoaSelecionada)
        .maybeSingle()

      const checkExist = checkExist1

      if (checkExist) {
        await supabase
          .from('trilho_crescimento')
          .update({ etapa_atual: 'SALA_DE_NOVOS', ultima_interacao: new Date().toISOString() })
          .eq('id', checkExist.id)
      } else {
        await supabase
          .from('trilho_crescimento')
          .insert({ 
            pessoa_id: pessoaSelecionada, 
            etapa_atual: 'SALA_DE_NOVOS',
            ultima_interacao: new Date().toISOString()
          })
      }

      setPessoaSelecionada('')
      carregarDados()
    } catch (err) {
      alert('Erro ao incluir pessoa no trilho.')
    } finally {
      setInserindo(false)
    }
  }

  const filtrarPorEtapa = (etapa: string) => itens.filter((i: any) => i.etapa_atual === etapa)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="text-xs font-bold tracking-wider uppercase">Carregando e Cruzando Informações Básicas...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 relative">
      
      <div>
        <Link href="/dashboard/pastor/visao-geral" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} /> Voltar ao Painel Principal
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Trilho de Crescimento Coletivo
          </h1>
          <p className="text-slate-500 text-sm font-medium">Monitore a consolidação pós-café. Quem não participou continuará na lista geral de visitantes.</p>
        </div>

        {pessoasDisponiveis.length > 0 && (
          <form onSubmit={adicionarAoTrilho} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
            <select 
              value={pessoaSelecionada}
              onChange={(e) => setPessoaSelecionada(e.target.value)}
              className="text-xs bg-transparent font-semibold text-slate-700 focus:outline-none p-1.5 max-w-[240px]"
            >
              <option value="">Inserir alguém do café no Trilho...</option>
              {pessoasDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button type="submit" disabled={inserindo || !pessoaSelecionada} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40">
              <Plus size={14} />
            </button>
          </form>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none snap-x">
        {[
          { id: 'SALA_DE_NOVOS', label: '1. Sala de Novos (Café)', color: 'bg-slate-200' },
          { id: 'BATISMO_RECEBIMENTO', label: '2. Celebração / Batismo', color: 'bg-indigo-100' },
          { id: 'FASE_2_ENGAJAMENTO', label: '3. F. 2: GC e Cursos', color: 'bg-amber-100' },
          { id: 'FASE_3_MINISTERIO', label: '4. F. 3: Ministério', color: 'bg-emerald-100' },
        ].map(col => (
          <div key={col.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col w-[300px] shrink-0 snap-start">
            <div className="border-b pb-2 mb-3 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider truncate">{col.label}</h3>
              <span className={`font-bold px-2 py-0.5 rounded-md text-xxs ${col.color}`}>{filtrarPorEtapa(col.id).length}</span>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[58vh] pr-1">
              {filtrarPorEtapa(col.id).map(item => {
                const dias = Math.floor((new Date().getTime() - new Date(item.ultima_interacao).getTime()) / (1000 * 60 * 60 * 24))
                const critico = dias >= 21
                
                return (
                  <div key={item.id} className={`bg-white border rounded-xl p-4 space-y-3 relative border-slate-200 shadow-xs hover:shadow-md transition-shadow ${critico ? 'border-rose-300 bg-rose-50/10' : ''}`}>
                    
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">{item.visitantes?.nome || 'Sem nome'}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{item.visitantes?.telefone || 'Sem telefone'}</p>
                    </div>

                    <div className="space-y-1">
                      {item.etapa_atual === 'FASE_2_ENGAJAMENTO' && !item.gc_vinculado && (
                        <span className="block text-xxs bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-1 rounded-lg">
                          ⚠️ Sem GC vinculado
                        </span>
                      )}
                      {item.gc_vinculado && (
                        <span className="block text-xxs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-lg border border-emerald-100 truncate">
                          🏠 {item.gc_vinculado}
                        </span>
                      )}
                      {item.ministerio_ativo && (
                        <span className="block text-xxs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg border border-indigo-100 truncate">
                          🛠️ {item.ministerio_ativo}
                        </span>
                      )}
                    </div>

                    <div className="text-xxs font-bold text-slate-400">
                      <span>Há {dias}d</span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                      <button 
                        type="button"
                        onClick={() => abrirModalNotas(item)}
                        className="text-slate-500 hover:text-indigo-600 hover:bg-slate-50 p-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
                      >
                        <MessageSquare size={13} />
                        <span>Prontuário</span>
                      </button>

                      {item.etapa_atual !== 'FASE_3_MINISTERIO' && (
                        <button 
                          type="button"
                          onClick={() => moverEtapa(item.id, item.etapa_atual, item.pessoa_id)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <span>Avançar</span>
                          <MoveRight size={13} />
                        </button>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {trilhoFoco && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black tracking-tight">{trilhoFoco.visitantes?.nome}</h3>
                <p className="text-xxs text-slate-400">Prontuário de Cuidado Pastoral e Integração</p>
              </div>
              <button onClick={() => setTrilhoFoco(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={adicionarNotaPastoral} className="p-4 border-b bg-slate-50 flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wider">Nova Nota / Registro de Atendimento</label>
                <input 
                  type="text" 
                  value={novaNotaTexto} 
                  onChange={(e) => setNovaNotaTexto(e.target.value)}
                  placeholder="Ex: Ligamos hoje, vai começar o curso domingo..." 
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" disabled={salvandoNota || !novaNotaTexto.trim()} className="bg-indigo-600 text-white p-2.5 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                <Save size={14} />
              </button>
            </form>

            <div className="p-4 flex-1 overflow-y-auto space-y-3.5 bg-white">
              <h4 className="text-xxs font-black text-slate-400 uppercase tracking-wider">Histórico de Atendimentos</h4>
              {notasDoFoco.length === 0 ? (
                <p className="text-center py-6 text-xxs font-medium text-slate-400">Nenhuma anotação registrada para este membro ainda.</p>
              ) : (
                notasDoFoco.map(nota => (
                  <div key={nota.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center text-xxs font-bold text-slate-400">
                      <span>{nota.autor}</span>
                      <span>{new Date(nota.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">{nota.texto}</p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}