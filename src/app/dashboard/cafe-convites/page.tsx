'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  MessageSquare, Coffee, Users, Send, 
  ArrowLeft, Loader2, Link2, Copy, Check
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface VisitanteCafe {
  id: string
  nome: string
  telefone: string | null
  statusFollowup: string
}

// O nome da função agora bate exatamente com a convenção da rota do Next.js
export default function CafeConvitesPage() {
  const [loading, setLoading] = useState(true)
  const [visitantes, setVisitantes] = useState<VisitanteCafe[]>([])
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [linkGrupo, setLinkGrupo] = useState('')
  const [copiado, setCopiado] = useState(false)
  
  const [mensagemModelo, setMensagemModelo] = useState(
    `Olá, {nome}! Tudo bem?\n\nPassando para lembrar do nosso próximo *Café com o Pastor*. Estamos muito animados com o que Deus vai fazer! 🙌\n\nCriamos um grupo exclusivo no WhatsApp com todos os confirmados para alinhar os detalhes de horários e local. Entre pelo link abaixo:\n{link}`
  )

  useEffect(() => {
    carregarVisitantesCafe()
  }, [])

  async function carregarVisitantesCafe() {
    try {
      setLoading(true)

      const { data: followups, error: fError } = await supabase
        .from('visitantes_followup')
        .select('visitante_id, status')
        .eq('status', 'confirmado')

      if (fError || !followups || followups.length === 0) {
        setVisitantes([])
        setLoading(false)
        return
      }

      const idsConfirmados = followups.map(f => f.visitante_id)

      const { data: dadosVisitantes, error: vError } = await supabase
        .from('visitantes')
        .select('id, nome, telefone')
        .in('id', idsConfirmados)

      if (vError || !dadosVisitantes) {
        setVisitantes([])
        setLoading(false)
        return
      }

      const listaPronta: VisitanteCafe[] = dadosVisitantes.map((v) => ({
        id: v.id,
        nome: v.nome || 'Não identificado',
        telefone: v.telefone || null,
        statusFollowup: 'confirmado'
      }))

      setVisitantes(listaPronta)
      setSelecionados(listaPronta.filter(v => v.telefone && v.telefone.trim() !== '').map(v => v.id))

    } catch (err) {
      console.error('Erro ao mapear lista de convites do café:', err)
    } finally {
      setLoading(false)
    }
  }

  const alternarSelecao = (id: string) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  const alternarTodos = () => {
    if (selecionados.length === visitantes.length) {
      setSelecionados([])
    } else {
      setSelecionados(visitantes.filter(v => v.telefone).map(v => v.id))
    }
  }

  function limparTelefone(telefone: string | null): string {
    if (!telefone) return ''
    let limpo = telefone.replace(/\D/g, '')
    if (limpo.length === 11 && limpo.startsWith('0')) limpo = limpo.substring(1)
    if (!limpo.startsWith('55') && limpo.length >= 10) limpo = '55' + limpo
    return limpo
  }

  function enviarMensagemWhatsApp(visitante: VisitanteCafe) {
    const foneLimpo = limparTelefone(visitante.telefone)
    if (!foneLimpo) return

    let textoFinal = mensagemModelo
      .replace('{nome}', visitante.nome.split(' ')[0])
      .replace('{link}', linkGrupo || '[LINK DO GRUPO]')

    const textoCodificado = encodeURIComponent(textoFinal)
    window.open(`https://wa.me/${foneLimpo}?text=${textoCodificado}`, '_blank')
  }

  const copiarTextoModelo = () => {
    navigator.clipboard.writeText(mensagemModelo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <span className="text-xs font-bold tracking-wider uppercase">Sincronizando confirmados do Café...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      
      <div>
        <Link href="/dashboard/acompanhamento" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors">
          <ArrowLeft size={14} /> Voltar ao Acompanhamento
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-5 md:flex md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-amber-500 p-2 rounded-2xl text-white shadow-sm">
              <Coffee size={22} />
            </div>
            Convite: Grupo do Café com o Pastor
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Lista baseada em tempo real nos visitantes com status <span className="font-bold text-amber-600 uppercase">"Confirmado Café"</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Configurações */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Link2 size={16} className="text-amber-500" /> 1. Link do Grupo
            </h3>
            <div>
              <label className="text-xxs font-black text-slate-400 uppercase">URL do Grupo do WhatsApp</label>
              <input 
                type="text" 
                placeholder="https://chat.whatsapp.com/..." 
                value={linkGrupo}
                onChange={(e) => setLinkGrupo(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-500" /> 2. Texto do Convite
              </h3>
              <button onClick={copiarTextoModelo} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition">
                {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-xxs font-black text-slate-400 uppercase">Mensagem Base</label>
              <textarea 
                rows={8}
                value={mensagemModelo}
                onChange={(e) => setMensagemModelo(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Listagem */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <h2 className="font-bold text-sm text-slate-800">Confirmados no Café ({visitantes.length})</h2>
              </div>
              
              {visitantes.length > 0 && (
                <button onClick={alternarTodos} className="text-xxs font-black text-amber-600 hover:underline uppercase">
                  {selecionados.length === visitantes.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {visitantes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-2">
                  <p>Nenhuma pessoa com status "Confirmado Café" no momento.</p>
                  <p className="text-xxs text-slate-400 font-normal">Mude o status de um visitante para "Confirmado Café" na listagem para ele aparecer aqui.</p>
                </div>
              ) : (
                visitantes.map((v) => {
                  const foneValido = v.telefone && v.telefone.trim() !== ''
                  const estaSelecionado = selecionados.includes(v.id)

                  return (
                    <div key={v.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${estaSelecionado ? 'bg-amber-50/10' : 'hover:bg-slate-50/50'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          disabled={!foneValido}
                          checked={estaSelecionado}
                          onChange={() => alternarSelecao(v.id)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-40 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{v.nome}</p>
                          <p className="text-xxs text-slate-400">{v.telefone || 'Sem número cadastrado'}</p>
                        </div>
                      </div>

                      <div>
                        {foneValido ? (
                          <button
                            onClick={() => enviarMensagemWhatsApp(v)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                          >
                            <Send size={11} /> Enviar Convite
                          </button>
                        ) : (
                          <span className="text-xxs text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded">Sem Fone</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {visitantes.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xxs font-bold text-slate-500">
                <span>{selecionados.length} selecionados</span>
                <p className="text-slate-400 font-normal">Disparos manuais via wa.me</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}