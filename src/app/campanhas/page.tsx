'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Loader2,
  Filter,
  Users,
  Smartphone,
  Sparkles,
  FileText,
  PlayCircle,
  XCircle,
  Layers
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Pessoa = {
  id: string
  nome: string | null
  apelido: string | null
  sexo: string | null
  celular: string | null
  telefone: string | null
  email: string | null
  cidade: string | null
  bairro: string | null
  estado_civil: string | null
  arrolamento: string | null
  data_nascimento: string | null
}

const templates = {
  culto:
    'Olá [nome], graça e paz! 🙏 Domingo teremos nosso Culto da Família às 18h. Será uma alegria receber você.',

  oracao:
    'Olá [nome], estamos em oração por você. Se precisar conversar ou receber apoio pastoral, conte conosco.',

  evento:
    'Olá [nome]! Teremos uma programação especial nesta semana e gostaríamos muito de contar com sua presença.',

  avisos:
    'Olá [nome]! Passando para compartilhar um comunicado importante da igreja.',

  jovens:
    'Olá [nome]! Os jovens estarão reunidos nesta semana. Esperamos você.',

  mulheres:
    'Olá [nome]! Nosso encontro de mulheres acontecerá em breve. Será uma alegria recebê-la.',

  homens:
    'Olá [nome]! Nosso encontro de homens está chegando. Reserve sua agenda.',
}

function normalizar(texto: string | null) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function calcularIdade(dataNascimento: string | null) {
  if (!dataNascimento) return null

  const hoje = new Date()
  const nascimento = new Date(dataNascimento)

  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }

  return idade
}

function tipoArrolamento(arrolamento: string | null) {
  const valor = normalizar(arrolamento)

  if (valor.includes('VISITANTE')) return 'VISITANTES'
  if (valor.includes('FREQUENTADOR')) return 'FREQUENTADORES'
  if (valor.includes('SALA DE NOVOS')) return 'SALA_NOVOS'
  if (valor.includes('MEMBRO')) return 'MEMBROS'

  return 'OUTROS'
}

export default function CampanhasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [sexoFiltro, setSexoFiltro] = useState('todos')
  const [grupoFiltro, setGrupoFiltro] = useState('todos')
  const [cidadeFiltro, setCidadeFiltro] = useState('todos')
  const [bairroFiltro, setBairroFiltro] = useState('todos')
  const [estadoCivilFiltro, setEstadoCivilFiltro] = useState('todos')
  const [idadeMin, setIdadeMin] = useState('')
  const [idadeMax, setIdadeMax] = useState('')
  const [enviados, setEnviados] = useState<string[]>([])
  
  // Estados do Controle de Disparo em Lote (Máx 20 por lote)
  const [disparandoLote, setDisparandoLote] = useState(false)
  const [indiceLoteAtual, setIndiceLoteAtual] = useState(0)
  const [lotePessoas, setLotePessoas] = useState<Pessoa[]>([])

  useEffect(() => {
    carregarPessoas()
  }, [])

  async function carregarPessoas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pessoas_cache')
      .select('*')

    if (error) {
      alert('Erro ao carregar pessoas: ' + error.message)
      setLoading(false)
      return
    }

    const filtradas = (data || []).filter((p) => p.celular || p.telefone)
    setPessoas(filtradas)
    setLoading(false)
  }

  const cidades = useMemo(() => {
    return [...new Set(pessoas.map((p) => p.cidade).filter(Boolean))].sort()
  }, [pessoas])

  const bairros = useMemo(() => {
    return [...new Set(pessoas.map((p) => p.bairro).filter(Boolean))].sort()
  }, [pessoas])

  const estadosCivis = useMemo(() => {
    return [...new Set(pessoas.map((p) => p.estado_civil).filter(Boolean))].sort()
  }, [pessoas])

  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter((pessoa) => {
      const nome = pessoa.nome || ''
      const idade = calcularIdade(pessoa.data_nascimento)
      const grupo = tipoArrolamento(pessoa.arrolamento)
      const sexo = normalizar(pessoa.sexo)

      if (busca && !normalizar(nome).includes(normalizar(busca))) return false
      if (sexoFiltro === 'homens' && !(sexo === 'M' || sexo === 'MASCULINO')) return false
      if (sexoFiltro === 'mulheres' && !(sexo === 'F' || sexo === 'FEMININO')) return false
      if (grupoFiltro !== 'todos' && grupo !== grupoFiltro) return false
      if (cidadeFiltro !== 'todos' && normalizar(pessoa.cidade) !== normalizar(cidadeFiltro)) return false
      if (bairroFiltro !== 'todos' && normalizar(pessoa.bairro) !== normalizar(bairroFiltro)) return false
      if (estadoCivilFiltro !== 'todos' && normalizar(pessoa.estado_civil) !== normalizar(estadoCivilFiltro)) return false
      if (idadeMin && idade && idade < Number(idadeMin)) return false
      if (idadeMax && idade && idade > Number(idadeMax)) return false

      return true
    })
  }, [pessoas, busca, sexoFiltro, grupoFiltro, cidadeFiltro, bairroFiltro, estadoCivilFiltro, idadeMin, idadeMax])

  const alvosPendentes = useMemo(() => {
    return pessoasFiltradas.filter((p) => !enviados.includes(p.id))
  }, [pessoasFiltradas, enviados])

  function aplicarTemplate(template: keyof typeof templates) {
    setMensagem(templates[template])
  }

  function gerarLinkWhatsapp(pessoa: Pessoa) {
    const telefone = pessoa.celular || pessoa.telefone
    if (!telefone || !mensagem.trim()) return null

    const telefoneLimpo = telefone.replace(/\D/g, '')
    const primeiroNome = (pessoa.nome || 'Irmão').split(' ')[0]
    const msg = mensagem.replace(/\[nome\]/g, primeiroNome)

    return `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(msg)}`
  }

  function dispararMensagem(pessoa: Pessoa) {
    const url = gerarLinkWhatsapp(pessoa)
    if (!url) return

    window.open(url, '_blank')

    if (!enviados.includes(pessoa.id)) {
      setEnviados((prev) => [...prev, ...[pessoa.id]])
    }
  }

  // --- MECÂNICA DE DISPARO INTELIGENTE POR LOTES DE 20 ---
  
  // 1. Inicia o lote de no máximo 20 pessoas
  function iniciarLote20() {
    if (!mensagem.trim() || alvosPendentes.length === 0) return

    const lote = alvosPendentes.slice(0, 20)
    setLotePessoas(lote)
    setIndiceLoteAtual(0)
    setDisparandoLote(true)

    // Dispara a primeira pessoa do lote imediatamente
    executarEnvioLote(lote, 0)
  }

  // 2. Abre a aba e marca como enviado
  function executarEnvioLote(lista: Pessoa[], index: number) {
    if (index >= lista.length) {
      finalizarLote()
      return
    }

    const pessoa = lista[index]
    const url = gerarLinkWhatsapp(pessoa)

    if (url) {
      window.open(url, '_blank')
      setEnviados((prev) => {
        if (prev.includes(pessoa.id)) return prev
        return [...prev, pessoa.id]
      })
    }
  }

  // 3. Monitora quando você volta para a aba do sistema para engatar o próximo envio
  useEffect(() => {
    const handleFocus = () => {
      if (disparandoLote && lotePessoas.length > 0) {
        const proximoIndice = indiceLoteAtual + 1
        
        if (proximoIndice < lotePessoas.length) {
          setIndiceLoteAtual(proximoIndice)
          // Pequena folga de 800ms antes de abrir o próximo para dar tempo de renderizar o foco
          setTimeout(() => {
            executarEnvioLote(lotePessoas, proximoIndice)
          }, 800)
        } else {
          finalizarLote()
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [disparandoLote, indiceLoteAtual, lotePessoas])

  function finalizarLote() {
    setDisparandoLote(false)
    setLotePessoas([])
    setIndiceLoteAtual(0)
    alert("Lote de 20 envios concluído com sucesso!")
  }

  function interromperLote() {
    setDisparandoLote(false)
    setLotePessoas([])
    setIndiceLoteAtual(0)
  }

 return (
  <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">

    <div className="border-b border-slate-200 pb-5">

      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm shadow-blue-600/20">
          <MessageSquare size={24} />
        </div>

        <h1 className="text-4xl font-black text-slate-900">
          Central de Comunicação
        </h1>
      </div>

      <p className="text-slate-500 mt-2">
        Comunicação estratégica com visitantes, frequentadores e membros da IPI Cascavel.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase font-black text-slate-500">
            Público Total
          </p>
          <h3 className="text-3xl font-black text-slate-900 mt-2">
            {pessoas.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase font-black text-blue-600">
            Filtrados
          </p>
          <h3 className="text-3xl font-black text-blue-600 mt-2">
            {pessoasFiltradas.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase font-black text-emerald-600">
            Enviados
          </p>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">
            {enviados.length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase font-black text-amber-600">
            Pendentes
          </p>
          <h3 className="text-3xl font-black text-amber-600 mt-2">
            {alvosPendentes.length}
          </h3>
        </div>

      </div>

        </div>

    <div className="grid lg:grid-cols-4 gap-6">

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 space-y-5 lg:sticky lg:top-6">

          <div className="space-y-3.5">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome..." disabled={disparandoLote} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50 placeholder-slate-400 font-medium disabled:opacity-50" />

            <select value={sexoFiltro} onChange={(e) => setSexoFiltro(e.target.value)} disabled={disparandoLote} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium disabled:opacity-50">
              <option value="todos">Todos os sexos</option>
              <option value="homens">Homens</option>
              <option value="mulheres">Mulheres</option>
            </select>

            <select
  value={grupoFiltro}
  onChange={(e) => setGrupoFiltro(e.target.value)}
  disabled={disparandoLote}
  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium disabled:opacity-50"
>
  <option value="todos">Todos os públicos</option>
  <option value="VISITANTES">Visitantes</option>
  <option value="FREQUENTADORES">Frequentadores</option>
  <option value="MEMBROS">Membros</option>
</select>

            <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)} disabled={disparandoLote} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium disabled:opacity-50">
              <option value="todos">Todas as cidades</option>
              {cidades.map((cidade) => <option key={cidade} value={cidade || ''}>{cidade}</option>)}
            </select>

            <select value={bairroFiltro} onChange={(e) => setBairroFiltro(e.target.value)} disabled={disparandoLote} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium disabled:opacity-50">
              <option value="todos">Todos os bairros</option>
              {bairros.map((bairro) => <option key={bairro} value={bairro || ''}>{bairro}</option>)}
            </select>

            <select value={estadoCivilFiltro} onChange={(e) => setEstadoCivilFiltro(e.target.value)} disabled={disparandoLote} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium disabled:opacity-50">
              <option value="todos">Estado civil</option>
              {estadosCivis.map((estado) => <option key={estado} value={estado || ''}>{estado}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input value={idadeMin} onChange={(e) => setIdadeMin(e.target.value)} placeholder="Idade mín" disabled={disparandoLote} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50 disabled:opacity-50" />
              <input value={idadeMax} onChange={(e) => setIdadeMax(e.target.value)} placeholder="Idade máx" disabled={disparandoLote} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50 disabled:opacity-50" />
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-center text-white shadow-md shadow-slate-950/10">
            <Users className="mx-auto text-blue-400 mb-1.5" size={20} />
            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Público Filtrado</div>
            <div className="text-3xl font-black mt-0.5 tracking-tight">{pessoasFiltradas.length}</div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/60 space-y-6">
          <div className="space-y-3">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-500" />
              Modelos Rápidos de Mensagem
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(templates).map((templateKey) => (
                <button
                  key={templateKey}
                  type="button"
                  disabled={disparandoLote}
                  onClick={() => aplicarTemplate(templateKey as keyof typeof templates)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 capitalize"
                >
                  {templateKey}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={disparandoLote}
              rows={5}
              placeholder="Escreva o aviso corporativo aqui... Dica: insira [nome] para personalizar automaticamente."
              className="w-full border border-slate-200 rounded-xl p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 text-sm placeholder-slate-400 font-medium leading-relaxed resize-none shadow-inner disabled:opacity-50"
            />
          </div>

          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 shadow-inner">
            <h3 className="font-bold text-slate-400 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileText size={12} />
              Demonstração do Texto Final
            </h3>
            <p className="text-sm whitespace-pre-line text-slate-700 font-medium leading-relaxed">
              {mensagem ? mensagem.replace(/\[nome\]/g, 'Fernanda') : <span className="text-slate-400 font-normal italic">Nenhum texto inserido...</span>}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-sm">Destinatários Encontrados</h3>
              
              {alvosPendentes.length > 0 && mensagem.trim() && !disparandoLote && (
                <button
                  type="button"
                  onClick={iniciarLote20}
                  className="bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/10 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-sm active:scale-95"
                >
                  <Layers size={15} />
                  Disparar Lote de 20 Contatos ({Math.min(20, alvosPendentes.length)} desta vez)
                </button>
              )}

              {disparandoLote && (
                <button
                  type="button"
                  onClick={interromperLote}
                  className="bg-red-500 text-white hover:bg-red-600 hover:shadow-md hover:shadow-red-500/10 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-sm active:scale-95"
                >
                  <XCircle size={15} />
                  Interromper Lote Atual
                </button>
              )}
            </div>

            {disparandoLote && lotePessoas.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <div className="text-xs text-blue-700 font-bold flex justify-between">
                  <span>Modo Assistido: Envie no WhatsApp, feche a aba e volte aqui para o próximo.</span>
                  <span>{indiceLoteAtual + 1} de {lotePessoas.length} do lote</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${((indiceLoteAtual + 1) / lotePessoas.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="animate-spin text-blue-600" size={28} />
                <span className="font-medium">Atualizando lista...</span>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                {pessoasFiltradas.map((pessoa) => {
                  const enviado = enviados.includes(pessoa.id)

                  return (
                    <div
                      key={pessoa.id}
                      className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 tracking-tight text-base">{pessoa.nome}</div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Smartphone size={13} className="text-slate-400" />
                            {pessoa.celular || pessoa.telefone}
                          </span>
                          {pessoa.arrolamento && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider border border-blue-100/50">
                              {pessoa.arrolamento}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => dispararMensagem(pessoa)}
                        disabled={!mensagem.trim() || enviado || disparandoLote}
                        className={`px-4.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition w-full sm:w-auto active:scale-95 shadow-sm ${
                          enviado
                            ? 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed shadow-none'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/10 disabled:opacity-40'
                        }`}
                      >
                        {enviado ? (
                          <>
                            <CheckCircle2 size={14} />
                            Concluído
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            Enviar Individual
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}

                {pessoasFiltradas.length === 0 && (
                  <div className="text-center py-16 text-slate-400 text-sm font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                    Nenhum registro atende aos filtros atuais da barra lateral.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}