'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Heart, Phone, MapPin, Calendar, ClipboardList, MessageSquare, Loader2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface VisitantePastoral {
  id: string
  nome: string
  telefone: string
  cidade: string
  data_visita: string
  pedido_oracao: string
  origem: string
  sexo: string
}

export default function VisaoPastoralPage() {
  const [visitantes, setVisitantes] = useState<VisitantePastoral[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  async function carregarDadosPastor() {
    try {
      setLoading(true)
      // Busca os visitantes trazendo o pedido de oração ativo
      const { data, error } = await supabase
        .from('visitantes')
        .select('id, nome, telefone, cidade, data_visita, pedido_oracao, origem, sexo')
        .order('created_at', { ascending: false })

      if (error) {
        setErro(error.message)
        return
      }

      setVisitantes(data || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dados pastorais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosPastor()
  }, [])

  // Filtra apenas quem tem pedidos de oração registrados
  const comPedidoOracao = visitantes.filter(v => v.pedido_oracao && v.pedido_oracao.trim() !== '')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="font-semibold tracking-wide">Carregando Gabinete Pastoral Virtual...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Cabeçalho */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-sm">
            <Heart size={24} />
          </div>
          Gabinete e Visão Pastoral
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Espaço focado no cuidado espiritual, intercessão e acompanhamento direto do Pastor Cleber.
        </p>
      </div>

      {/* Cards de Métricas Pastorais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Almas Assistidas</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{visitantes.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Clamam por Oração 🙏</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{comPedidoOracao.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Visitas Recentes (Mês)</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">{visitantes.slice(0, 5).length}</h3>
        </div>
      </div>

      {/* Painel de Clamor e Intercessão */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-indigo-600" size={20} />
            Pedidos de Oração Coletados na Recepção
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Pessoas que deixaram motivos específicos para intercessão na sua primeira visita.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {comPedidoOracao.map((v) => (
            <div key={v.id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4 hover:border-indigo-100 transition">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{v.nome}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {v.cidade || 'Cidade não informada'} • Origem: {v.origem || 'Não dita'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md uppercase">
                    {v.sexo || 'Visitante'}
                  </span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-slate-200/60 text-sm text-slate-700 italic">
                  "{v.pedido_oracao}"
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Calendar size={12} /> Visita: {v.data_visita ? new Date(v.data_visita).toLocaleDateString('pt-BR') : 'Sem data'}
                </span>

                <a
                  href={`https://wa.me/55${v.telefone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
                >
                  <Phone size={12} /> Ligar Pastoral
                </a>
              </div>
            </div>
          ))}

          {comPedidoOracao.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-12 italic col-span-2">
              Nenhum pedido de oração crítico registrado no momento.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
