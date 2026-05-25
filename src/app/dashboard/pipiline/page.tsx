'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AlertCircle, PhoneOff, ArrowRight, Clock, UserLog, History } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface RegistroPipeline {
  id: string
  visitante_id: string
  etapa: string
  status: string
  responsavel: string
  updated_at: string
  visitantes: any 
}

export default function PipelinePage() {
  const [registros, setRegistros] = useState<RegistroPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [travadosCount, setTravadosCount] = useState(0)
  const [semTelefoneCount, setSemTelefoneCount] = useState(0)

  const obterDadosVisitante = (visitantesField: any) => {
    if (!visitantesField) return { nome: 'Sem Nome', telefone: '', cidade: 'Cidade não informada' }
    if (Array.isArray(visitantesField)) {
      const v = visitantesField[0]
      return {
        nome: v?.nome || 'Sem Nome',
        telefone: v?.telefone || '',
        cidade: v?.cidade || 'Cidade não informada'
      }
    }
    return {
      nome: visitantesField.nome || 'Sem Nome',
      telefone: visitantesField.telefone || '',
      cidade: visitantesField.cidade || 'Cidade não informada'
    }
  }

  async function carregarPipeline() {
    try {
      setLoading(true)
      setErro('')

      const { data, error } = await supabase
        .from('visitantes_followup')
        .select(`
          id,
          visitante_id,
          etapa,
          status,
          responsavel,
          updated_at,
          visitantes (
            nome,
            telefone,
            cidade
          )
        `)

      if (error) {
        setErro(error.message)
        return
      }

      const lista = (data || []) as RegistroPipeline[]
      setRegistros(lista)

      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const travados = lista.filter(r => {
        const dataAtualizacao = new Date(r.updated_at)
        return r.status !== 'concluido' && dataAtualizacao < seteDiasAtras
      }).length

      const semTel = lista.filter(r => {
        const vInfo = obterDadosVisitante(r.visitantes)
        return !vInfo.telefone || vInfo.telefone.trim() === ''
      }).length

      setTravadosCount(travados)
      setSemTelefoneCount(semTel)

    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPipeline()
  }, [])

  async function moverEtapa(id: string, novoStatus: string) {
    try {
      const { error } = await supabase
        .from('visitantes_followup')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        alert(error.message)
        return
      }
      carregarPipeline()
    } catch (err: any) {
      alert('Erro ao atualizar etapa: ' + err.message)
    }
  }

  function formatarDataHora(dataString: string) {
    const d = new Date(dataString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const etapasChave = [
    { id: 'primeiro_contato', titulo: '1. Visitou' },
    { id: 'segundo_contato', titulo: '2. Contato Pastor' },
    { id: 'intercessao', titulo: '3. Em Oração' },
    { id: 'convite_cafe', titulo: '4. Café Conectado' }
  ]

  // Ordena os registros mais recentes para a Linha do Tempo de Atividades
  const atividadesRecentes = [...registros]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)

  const converterEtapaNome = (id: string) => {
    const encontrada = etapasChave.find(e => e.id === id)
    return encontrada ? encontrada.titulo : id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-slate-500 font-medium text-sm">
        Carregando painel de automações...
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-6 text-red-600 font-bold bg-red-50 rounded-2xl border border-red-200 m-4 text-xs">
        Erro encontrado na tabela: {erro}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Controle de Disparos e Automações</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Monitoramento ativo de contatos elegíveis para régua de mensagens.</p>
      </div>

      {/* Cards Indicadores Gerenciais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Travados +7 Dias</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{travadosCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
            <PhoneOff size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sem Telefone</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{semTelefoneCount}</p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Kanban + Linha do Tempo */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Lado Esquerdo: O Kanban (Ocupa 3 colunas no desktop) */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {etapasChave.map((coluna) => {
            const itensDaColuna = registros.filter(r => r.etapa === coluna.id)

            return (
              <div key={coluna.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 min-h-[400px] space-y-4">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider px-1 flex justify-between items-center">
                  <span>{coluna.titulo}</span>
                  <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-md">
                    {itensDaColuna.length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {itensDaColuna.map((item) => {
                    const visitanteInfo = obterDadosVisitante(item.visitantes)

                    return (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm tracking-tight">{visitanteInfo.nome}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{visitanteInfo.cidade}</p>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            item.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status}
                          </span>

                          {item.status !== 'concluido' && (
                            <button
                              onClick={() => moverEtapa(item.id, 'concluido')}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-xs font-bold transition-colors"
                            >
                              Concluir <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {itensDaColuna.length === 0 && (
                    <p className="text-center text-xxs text-slate-400 py-8 font-medium italic bg-white rounded-xl border border-dashed border-slate-200">
                      Nenhum nesta etapa
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Lado Direito: Linha do Tempo dos Visitantes (Ocupa 1 coluna) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <History size={16} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Linha do Tempo</h3>
          </div>

          <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-6">
            {atividadesRecentes.length === 0 ? (
              <p className="text-xxs text-slate-400 italic">Nenhuma atividade registrada.</p>
            ) : (
              atividadesRecentes.map((act) => {
                const vInfo = obterDadosVisitante(act.visitantes)
                return (
                  <div key={act.id} className="relative space-y-1">
                    {/* Indicador visual redondo na linha */}
                    <span className="absolute -left-[21px] top-1 bg-indigo-600 h-2 w-2 rounded-full ring-4 ring-white" />
                    
                    <p className="text-xs font-bold text-slate-950 tracking-tight leading-tight">
                      {vInfo.nome}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Etapa: <span className="font-bold text-slate-700">{converterEtapaNome(act.etapa)}</span>
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold pt-0.5">
                      <Clock size={10} />
                      <span>{formatarDataHora(act.updated_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}