'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Loader2,
  Users,
  Coffee,
  Calendar,
  PlayCircle,
  PauseCircle,
  Check
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Visitante = {
  id: string
  nome: string
  telefone: string | null
  sexo: string | null
  cidade: string | null
  data_visita: string | null
  created_at: string | null
  convite_cafe_enviado: boolean | null
  confirmou_cafe: boolean | null
}

const mensagemPadrao = `Olá [nome], graça e paz! 🙏💙

Ficamos muito felizes com seu retorno e queremos te convidar para nosso Café de Integração ☕

Será um momento especial para conhecermos você melhor, apresentarmos a visão da IPI Cascavel e compartilharmos comunhão.

📍 Salão Social da igreja
🕔 17h

Será uma alegria receber você 💙`

function normalizar(texto: string | null) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

export default function CafeConvitesPage() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(mensagemPadrao)
  const [enviados, setEnviados] = useState<string[]>([])
  const [disparandoBloco, setDisparandoBloco] = useState(false)
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [totalDisparo, setTotalDisparo] = useState(0)

  const cancelarDisparoRef = useRef(false)

  useEffect(() => {
    carregarVisitantes()
  }, [])

  async function carregarVisitantes() {
    setLoading(true)

    const { data: followups, error: followupError } = await supabase
      .from('visitantes_followup')
      .select('visitante_id, status')
      .eq('status', 'positivo')

    if (followupError) {
      alert('Erro ao carregar follow-up: ' + followupError.message)
      setLoading(false)
      return
    }

    const idsPositivos = (followups || []).map((f) => f.visitante_id)

    if (idsPositivos.length === 0) {
      setVisitantes([])
      setLoading(false)
      return
    }

    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)

    const { data, error } = await supabase
      .from('visitantes')
      .select('*')
      .in('id', idsPositivos)
      .gte('created_at', dataLimite.toISOString())
      .eq('convite_cafe_enviado', false)

    if (error) {
      alert('Erro ao carregar visitantes: ' + error.message)
      setLoading(false)
      return
    }

    const filtrados = (data || []).filter((v) => v.telefone)

    setVisitantes(filtrados)
    setLoading(false)
  }

  const visitantesPositivos = visitantes.length

  const visitantesUltimoMes = useMemo(() => {
    return visitantes.filter((v) => {
      if (!v.created_at) return false
      const data = new Date(v.created_at)
      const limite = new Date()
      limite.setDate(limite.getDate() - 30)
      return data >= limite
    }).length
  }, [visitantes])

  const pendentes = visitantes.filter((v) => !v.convite_cafe_enviado).length
  const confirmados = visitantes.filter((v) => v.confirmou_cafe).length

  function gerarLinkWhatsapp(visitante: Visitante) {
    if (!visitante.telefone || !mensagem.trim()) return null

    const telefone = visitante.telefone.replace(/\D/g, '')
    const primeiroNome = visitante.nome.split(' ')[0]
    const msg = mensagem.replace(/\[nome\]/g, primeiroNome)

    return `https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`
  }

  async function marcarEnviado(id: string) {
    await supabase
      .from('visitantes')
      .update({
        convite_cafe_enviado: true,
        data_convite_cafe: new Date().toISOString()
      })
      .eq('id', id)
  }

  async function marcarConfirmado(id: string) {
    await supabase
      .from('visitantes')
      .update({
        confirmou_cafe: true
      })
      .eq('id', id)

    carregarVisitantes()
  }

  async function dispararMensagem(visitante: Visitante) {
    const url = gerarLinkWhatsapp(visitante)
    if (!url) return

    window.open(url, '_blank')

    await marcarEnviado(visitante.id)

    if (!enviados.includes(visitante.id)) {
      setEnviados((prev) => [...prev, visitante.id])
    }

    carregarVisitantes()
  }

  async function dispararEmBloco() {
    if (visitantes.length === 0) return

    cancelarDisparoRef.current = false
    setDisparandoBloco(true)
    setIndiceAtual(0)
    setTotalDisparo(visitantes.length)

    for (let i = 0; i < visitantes.length; i++) {
      if (cancelarDisparoRef.current) break

      const visitante = visitantes[i]
      const url = gerarLinkWhatsapp(visitante)

      if (url) {
        window.open(url, '_blank')
        await marcarEnviado(visitante.id)

        setEnviados((prev) => {
          if (prev.includes(visitante.id)) return prev
          return [...prev, visitante.id]
        })
      }

      setIndiceAtual(i + 1)

      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setDisparandoBloco(false)
    setIndiceAtual(0)
    setTotalDisparo(0)

    carregarVisitantes()
  }

  function cancelarDisparo() {
    cancelarDisparoRef.current = true
    setDisparandoBloco(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="bg-amber-500 p-2 rounded-2xl text-white shadow-sm">
            <Coffee size={24} />
          </div>
          Convites Café Integração
        </h1>

        <p className="text-slate-500 mt-2 text-sm font-medium">
          Visitantes com retorno positivo prontos para convite
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <Users className="text-blue-600 mb-2" />
          <div className="text-sm text-slate-500">Visitantes positivos</div>
          <div className="text-3xl font-black">{visitantesPositivos}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <Calendar className="text-purple-600 mb-2" />
          <div className="text-sm text-slate-500">Últimos 30 dias</div>
          <div className="text-3xl font-black">{visitantesUltimoMes}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <MessageSquare className="text-amber-600 mb-2" />
          <div className="text-sm text-slate-500">Pendentes convite</div>
          <div className="text-3xl font-black">{pendentes}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <Check className="text-emerald-600 mb-2" />
          <div className="text-sm text-slate-500">Confirmados</div>
          <div className="text-3xl font-black">{confirmados}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-6">
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={8}
          disabled={disparandoBloco}
          className="w-full border border-slate-200 rounded-xl p-4 outline-none"
        />

        <div className="flex gap-3">
          {!disparandoBloco ? (
            <button
              onClick={dispararEmBloco}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2"
            >
              <PlayCircle size={18} />
              Convidar todos pendentes
            </button>
          ) : (
            <button
              onClick={cancelarDisparo}
              className="px-5 py-3 rounded-xl bg-red-600 text-white font-bold flex items-center gap-2"
            >
              <PauseCircle size={18} />
              Pausar disparo
            </button>
          )}
        </div>

        {disparandoBloco && (
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(indiceAtual / totalDisparo) * 100}%`
              }}
            />
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {visitantes.map((visitante) => (
              <div
                key={visitante.id}
                className="border rounded-2xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold">{visitante.nome}</div>
                  <div className="text-sm text-slate-500">
                    {visitante.telefone}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => marcarConfirmado(visitante.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold"
                  >
                    Confirmou
                  </button>

                  <button
                    onClick={() => dispararMensagem(visitante)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-2"
                  >
                    <Send size={14} />
                    Enviar
                  </button>
                </div>
              </div>
            ))}

            {visitantes.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                Nenhum visitante elegível para convite.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}