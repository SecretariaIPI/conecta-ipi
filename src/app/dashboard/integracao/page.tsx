'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, Circle, AlertCircle, PhoneOff, ArrowRight } from 'lucide-react'

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
  visitantes: {
    nome: string
    telefone: string
    cidade: string
  } | null
}

export default function PipelinePage() {
  const [registros, setRegistros] = useState<RegistroPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  // Contadores operacionais
  const [travadosCount, setTravadosCount] = useState(0)
  const [semTelefoneCount, setSemTelefoneCount] = useState(0)

  async function carregarPipeline() {
    try {
      setLoading(true)
      console.log("Buscando dados da pipeline no Supabase...")

      // Consulta limpa trazendo os dados do visitante associado
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

      const lista = (data || []) as unknown as RegistroPipeline[]
      setRegistros(lista)

      // Regras de Contadores Gerenciais
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const travados = lista.filter(r => {
        const dataAtualizacao = new Date(r.updated_at)
        return r.status !== 'concluido' && dataAtualizacao < seteDiasAtras
      }).length

      const semTel = lista.filter(r => !r.visitantes?.telefone).length

      setTravadosCount(travados)
      setSemTelefoneCount(semTel)

      console.log("Atualizando contadores e painel gerencial.")
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

  const etapasChave = [
    { id: 'primeiro_contato', titulo: '1. Visitou' },
    { id: 'segundo_contato', titulo: '2. Contato Pastor' },
    { id: 'intercessao', titulo: '3. Em Oração' },
    { id: 'convite_cafe', titulo: '4. Café Conectado' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium text-lg">
        Carregando painel de automações...
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-10 text-red-600 font-bold bg-red-50 rounded-3xl border border-red-200 m-8">
        Erro na pipeline: {erro}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Controle de Disparos e Automações</h1>
        <p className="text-slate-500 mt-1">Monitoramento ativo de contatos elegíveis para régua de mensagens.</p>
      </div>

      {/* Cards Indicadores Gerenciais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Travados +7 Dias</p>
            <p className="text-2xl font-black text-slate-900">{travadosCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
            <PhoneOff size={24} />
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Sem Telefone</p>
            <p className="text-2xl font-black text-slate-900">{semTelefoneCount}</p>
          </div>
        </div>
      </div>

      {/* Visualização em Kanban / Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {etapasChave.map((coluna) => {
          const itensDaColuna = registros.filter(r => r.etapa === coluna.id)

          return (
            <div key={coluna.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 min-h-[400px]">
              <h3 className="font-bold text-slate-800 text-sm mb-4 px-1 flex justify-between items-center">
                <span>{coluna.titulo}</span>
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                  {itensDaColuna.length}
                </span>
              </h3>

              <div className="space-y-3">
                {itensDaColuna.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <p className="font-bold text-slate-900 text-sm">{item.visitantes?.nome || 'Sem Nome'}</p>
                    <p className="text-xs text-slate-500">{item.visitantes?.cidade || 'Cidade não informada'}</p>
                    
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        item.status === 'concluido' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>

                      {item.status !== 'concluido' && (
                        <button
                          onClick={() => moverEtapa(item.id, 'concluido')}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-xs font-semibold"
                          title="Avançar status"
                        >
                          Concluir <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {itensDaColuna.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8 italic bg-white rounded-xl border border-dashed border-slate-200">
                    Nenhum nesta etapa
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
