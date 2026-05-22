cat << 'EOF' > src/app/dashboard/pastor/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, Users, TrendingUp, Coffee, CheckCircle2, Loader2, Award } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface EstatisticaConversao {
  totalVisitantes: number
  totalCafe: number
  totalIntegrados: number
  taxaConversaoCafe: string
  taxaConversaoIgreja: string
}

export default function VisaoEstatisticaPastorPage() {
  const [dados, setDados] = useState<EstatisticaConversao>({
    totalVisitantes: 0,
    totalCafe: 0,
    totalIntegrados: 0,
    taxaConversaoCafe: '0%',
    taxaConversaoIgreja: '0%'
  })
  const [loading, setLoading] = useState(true)

  async function calcularMetricasPastorais() {
    try {
      setLoading(true)

      const { count: visitantesCount, error: vError } = await supabase
        .from('visitantes')
        .select('*', { count: 'exact', head: true })

      const { data: followups, error: fError } = await supabase
        .from('visitantes_followup')
        .select('status')

      if (vError || fError) throw new Error('Erro ao buscar dados do banco')

      const totalV = visitantesCount || 0
      const listaFollowup = followups || []

      const totalC = listaFollowup.filter(f => f.status === 'confirmado').length
      const totalI = listaFollowup.filter(f => f.status === 'integrated' || f.status === 'integrado').length

      const taxaCafe = totalV > 0 ? ((totalC / totalV) * 100).toFixed(1) + '%' : '0%'
      const taxaIgreja = totalV > 0 ? ((totalI / totalV) * 100).toFixed(1) + '%' : '0%'

      setDados({
        totalVisitantes: totalV,
        totalCafe: totalC,
        totalIntegrados: totalI,
        taxaConversaoCafe: taxaCafe,
        taxaConversaoIgreja: taxaIgreja
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calcularMetricasPastorais()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="font-semibold tracking-wide">Calculando métricas estatísticas...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-sm">
            <BarChart3 size={24} />
          </div>
          Análise Estatística Pastoral
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Dados analíticos de conversão e eficiência da jornada de integração da igreja.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-amber-800 text-xs font-bold uppercase tracking-wider">Conversão: Visita → Café Conectado</p>
            <h3 className="text-4xl font-black text-amber-900 mt-1">{dados.taxaConversaoCafe}</h3>
            <p className="text-slate-500 text-xs mt-1.5 font-medium">Percentual de visitantes que aceitaram o convite comunitário.</p>
          </div>
          <div className="bg-amber-500 text-white p-4 rounded-xl shadow-sm">
            <Coffee size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-indigo-800 text-xs font-bold uppercase tracking-wider">Conversão Total: Membresia Eficaz</p>
            <h3 className="text-4xl font-black text-indigo-900 mt-1">{dados.taxaConversaoIgreja}</h3>
            <p className="text-slate-500 text-xs mt-1.5 font-medium">Visitantes totalmente integrados no corpo local da IPI.</p>
          </div>
          <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-sm">
            <Award size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            Evolução Numérica do Funil
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Mapeamento do volume de almas que avançaram em cada marco pastoral.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-500" /> 1. Total de Visitantes Cadastrados</span>
              <span>{dados.totalVisitantes} pessoas (100%)</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200/50">
              <div className="bg-slate-400 h-full rounded-lg" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Coffee size={14} className="text-amber-500" /> 2. Confirmados e Participaram do Café</span>
              <span>{dados.totalCafe} pessoas ({dados.taxaConversaoCafe})</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200/50">
              <div className="bg-amber-500 h-full rounded-lg transition-all duration-500" style={{ width: dados.taxaConversaoCafe }}></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> 3. Consolidados / Integrados na Igreja</span>
              <span>{dados.totalIntegrados} pessoas ({dados.taxaConversaoIgreja})</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200/50">
              <div className="bg-indigo-600 h-full rounded-lg transition-all duration-500" style={{ width: dados.taxaConversaoIgreja }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
EOF