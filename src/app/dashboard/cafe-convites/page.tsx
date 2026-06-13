'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Coffee, ArrowLeft, Send, Filter, CheckCircle2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function CafeIntegracaoPage() {
  const [loading, setLoading] = useState(true)
  const [visitantes, setVisitantes] = useState<any[]>([])
  const [linkGrupo, setLinkGrupo] = useState('')

  useEffect(() => {
    carregarVisitantesAptos()
  }, [])

  async function carregarVisitantesAptos() {
    try {
      setLoading(true)

      // 1. Busca todos os followups de 'segundo_contato'
      const { data: followups } = await supabase
        .from('visitantes_followup')
        .select('visitante_id, status, etapa, created_at')
        .eq('etapa', 'segundo_contato')
        .order('created_at', { ascending: false })

      // 2. Filtra localmente apenas o registro MAIS RECENTE de cada visitante e verifica se é positivo
      const mapaStatus = new Map()
      followups?.forEach(f => {
        if (!mapaStatus.has(f.visitante_id)) {
          mapaStatus.set(f.visitante_id, f.status)
        }
      })

      const idsPositivos = Array.from(mapaStatus.entries())
        .filter(([_, status]) => status === 'resposta_positiva')
        .map(([id, _]) => id)

      // 3. Exclui quem já passou pelo ciclo do Café
      const { data: historicoCafe } = await supabase
        .from('visitantes_followup')
        .select('visitante_id')
        .in('etapa', ['convite_cafe', 'cafe'])

      const idsJaProcessados = historicoCafe?.map(h => h.visitante_id) || []
      const idsFinais = idsPositivos.filter(id => !idsJaProcessados.includes(id))

      if (idsFinais.length > 0) {
        const { data: dadosVisitantes } = await supabase
          .from('visitantes')
          .select('id, nome, telefone')
          .in('id', idsFinais)
        setVisitantes(dadosVisitantes || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function registrarEnvio(v: any) {
    await supabase.from('visitantes_followup').insert({
      visitante_id: v.id,
      etapa: 'convite_cafe',
      status: 'convite_enviado',
      responsavel: 'Pastor/Sistema',
      data_contato: new Date().toISOString()
    })

    const msg = `Olá, ${v.nome.split(' ')[0]}! É uma alegria ter você conosco na IPI Cascavel. Queremos convidar você para o nosso *Café de Integração*. Entre aqui: ${linkGrupo}`
    window.open(`https://wa.me/55${v.telefone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    setVisitantes(prev => prev.filter(i => i.id !== v.id))
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <Link href="/dashboard/pastor/visao-geral" className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2">
        <ArrowLeft size={14} /> Painel Estratégico
      </Link>

      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-3 rounded-2xl text-white"><Coffee size={24} /></div>
          ☕ Café de Integração
        </h1>
        <p className="text-slate-500 text-sm mt-3">Visitantes aptos para o primeiro passo de conexão na IPI Cascavel.</p>
      </div>

      {/* Configuração do Link */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Link do Grupo WhatsApp</label>
        <input
          value={linkGrupo}
          onChange={(e) => setLinkGrupo(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none"
        />
      </div>

      {/* Lista */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {visitantes.map(v => (
          <div key={v.id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs">{v.nome.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold">{v.nome}</p>
              </div>
            </div>
            <button onClick={() => registrarEnvio(v)} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700">
              <Send size={12} /> Enviar Convite
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}