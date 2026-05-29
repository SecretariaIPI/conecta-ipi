'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { UserPlus, Trash2, Phone, MapPin, Eye, Users, Calendar } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface Visitante {
  id: string
  nome: string
  telefone?: string
  email?: string
  cidade?: string
  origem?: string
  data_visita?: string
  confirmou_cafe?: boolean
}
  
export default function VisitantesPage() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [sexo, setSexo] = useState('')
  const [faixaEtaria, setFaixaEtaria] = useState('')
  const [cidade, setCidade] = useState('')
  const [dataVisita, setDataVisita] = useState('')
  const [origem, setOrigem] = useState('Não informou')
  const [outraIgreja, setOutraIgreja] = useState('')
  const [pedidoOracao, setPedidoOracao] = useState('')

  async function carregarVisitantes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visitantes')
        .select('*')
        .order('data_visita', { ascending: false, nullsFirst: false })

      if (error) {
        setErro(error.message)
        return
      }

      setVisitantes(data || [])
    } catch (err: any) {
      setErro(err.message || 'Erro desconhecido ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarVisitantes()
  }, [])

  function formatarDataExtenso(dataStr: string) {
    const [ano, mes, dia] = dataStr.split('-')
    const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia))
    return dataObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Agrupamento dos visitantes por data_visita
  const visitantesAgrupados = visitantes.reduce((grupos: { [key: string]: Visitante[] }, visitante) => {
    const chaveData = visitante.data_visita || 'sem_data'
    if (!grupos[chaveData]) {
      grupos[chaveData] = []
    }
    grupos[chaveData].push(visitante)
    return grupos
  }, {})

  // Ordenação das chaves de data (mais recentes primeiro)
  const chavesOrdenadas = Object.keys(visitantesAgrupados).sort((a, b) => {
    if (a === 'sem_data') return 1
    if (b === 'sem_data') return -1
    return new Date(b).getTime() - new Date(a).getTime()
  })

  async function excluirVisitante(id: string, nome: string) {
    const confirmar = window.confirm(
      `Deseja realmente excluir ${nome}?\n\nEssa ação removerá cadastro, checklist de integração, follow-up e histórico.`
    )

    if (!confirmar) return

    try {
      await supabase.from('visitantes_checklist').delete().eq('visitante_id', id)
      await supabase.from('visitantes_timeline').delete().eq('visitante_id', id)
      await supabase.from('visitantes_followup').delete().eq('visitante_id', id)

      const { error } = await supabase.from('visitantes').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }

      carregarVisitantes()
    } catch (err: any) {
      alert('Erro ao tentar excluir o visitante: ' + err.message)
    }
  }

  async function cadastrarVisitante() {
    if (!nome || !telefone) {
      alert('Nome e telefone são obrigatórios.')
      return
    }

    try {
      let origemFinal = origem
      if (origem === 'Igreja Evangélica' && outraIgreja.trim()) {
        origemFinal = `Igreja Evangélica (${outraIgreja.trim()})`
      }

      const { data, error } = await supabase
        .from('visitantes')
        .insert({
          nome,
          telefone,
          email,
          sexo,
          faixa_etaria: faixaEtaria,
          cidade,
          data_visita: dataVisita || null,
          origem: origemFinal,
          pedido_oracao: pedidoOracao
        })
        .select()
        .maybeSingle()

      if (error || !data) {
        alert(error?.message || 'Não foi possível gerar o registro do visitante.')
        return
      }

      const etapas = [
        { etapa: 'primeiro_contato', responsavel: 'Secretaria Igreja' },
        { etapa: 'segundo_contato', responsavel: 'Pastor Cleber' },
        { etapa: 'intercessao', responsavel: 'Intercessão' },
        { etapa: 'convite_cafe', responsavel: 'Convite Café' }
      ]

      for (const item of etapas) {
        await supabase.from('visitantes_followup').insert({
          visitante_id: data.id,
          etapa: item.etapa,
          status: 'pendente',
          responsavel: item.responsavel
        })
      }

      await supabase.from('visitantes_checklist').insert([{ visitante_id: data.id }])

      limparFormulario()
      carregarVisitantes()
    } catch (err: any) {
      alert('Erro operacional no cadastro: ' + err.message)
    }
  }

  function limparFormulario() {
    setNome('')
    setTelefone('')
    setEmail('')
    setSexo('')
    setFaixaEtaria('')
    setCidade('')
    setDataVisita('')
    setOrigem('Não informou')
    setOutraIgreja('')
    setPedidoOracao('')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium text-lg">Carregando console de visitantes...</div>
  }

  if (erro) {
    return <div className="p-10 text-red-600 font-bold bg-red-50 rounded-3xl border border-red-200 m-8">Erro operacional: {erro}</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-blue-600" size={32} /> CRM Pastoral e Consolidação
        </h1>
        <p className="text-slate-500 mt-1">Gerencie a recepção, acompanhamento e a integração de novos membros.</p>
      </div>

      {/* Formulário de Novo Cadastro */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users size={18} className="text-slate-500" /> Novo Cadastro
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome Completo" className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone / WhatsApp" className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
          
          <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="border border-slate-200 text-sm rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500">
            <option value="">Gênero</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <input value={faixaEtaria} onChange={(e) => setFaixaEtaria(e.target.value)} placeholder="Faixa etária" className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
          <input type="date" value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} className="border border-slate-200 text-sm rounded-xl px-4 py-3 text-slate-600 outline-none focus:border-blue-500" />

          <select
            value={origem}
            onChange={(e) => {
              setOrigem(e.target.value)
              if (e.target.value !== 'Igreja Evangélica') setOutraIgreja('')
            }}
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500 font-medium text-slate-700"
          >
            <option value="Não informou">Origem: Não informou</option>
            <option value="Igreja Católica">Igreja Católica</option>
            <option value="Igreja Evangélica">Igreja Evangélica (Qual?)</option>
            <option value="Não pertence a nenhuma igreja">Não pertence a nenhuma igreja</option>
          </select>
        </div>

        {origem === 'Igreja Evangélica' && (
          <div className="w-full max-w-md animate-fadeIn">
            <input value={outraIgreja} onChange={(e) => setOutraIgreja(e.target.value)} placeholder="Qual denominação evangélica? (Ex: Batista..." className="w-full border-2 border-blue-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium" />
          </div>
        )}

        <textarea value={pedidoOracao} onChange={(e) => setPedidoOracao(e.target.value)} placeholder="Insira aqui os pedidos de oração ou observações iniciais da primeira visita..." className="border border-slate-200 text-sm rounded-xl px-4 py-3 w-full h-24 resize-none outline-none focus:border-blue-500" />

        <button onClick={cadastrarVisitante} className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl px-6 py-3.5 transition w-full md:w-auto">
          Efetivar Cadastro de Visitante
        </button>
      </div>

      {/* Listagem Separada Dinamicamente por Grupos de Datas */}
      <div className="space-y-8">
        {chavesOrdenadas.map((dataChave) => {
          const listaVisitantesDoDia = visitantesAgrupados[dataChave]
          const ehSemData = dataChave === 'sem_data'

          return (
            <div key={dataChave} className="space-y-3">
              
              {/* Divisória / Cabeçalho do Grupo de Visita */}
              <div className="flex items-center gap-3 px-2">
                <div className={`p-2 rounded-xl border ${ehSemData ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    {ehSemData ? 'Sem data de visita cadastrada' : formatarDataExtenso(dataChave)}
                  </h3>
                  <p className="text-xxs text-slate-400 font-medium">
                    {listaVisitantesDoDia.length} {listaVisitantesDoDia.length === 1 ? 'visitante recebido' : 'visitantes recebidos'}
                  </p>
                </div>
                <div className="grow border-t border-dashed border-slate-200/80 ml-2" />
              </div>

              {/* Lista de Cards de Visitantes */}
              <div className="grid grid-cols-1 gap-2.5">
                {listaVisitantesDoDia.map((visitante) => (
                  <div 
                    key={visitante.id} 
                    className="bg-white rounded-2xl border border-slate-200/70 hover:border-blue-300 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 group"
                  >
                    {/* Bloco de Identificação */}
                    <div className="space-y-1.5 max-w-sm">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/visitantes/${visitante.id}`} 
                          className="font-bold text-slate-900 hover:text-blue-600 transition flex items-center gap-1.5 text-sm"
                        >
                          <Eye size={14} className="text-slate-400 group-hover:text-blue-500 transition" /> 
                          {visitante.nome}
                        </Link>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xxs font-medium text-slate-500">
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          <Phone size={11} className="text-slate-400" /> {visitante.telefone || '-'}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          <MapPin size={11} className="text-slate-400" /> {visitante.cidade || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Bloco de Origem e Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <span className="text-xxs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200/40 px-2.5 py-1 rounded-lg max-w-[200px] truncate">
                        {visitante.origem || 'Não informado'}
                      </span>
                      
                      <button 
                        onClick={() => excluirVisitante(visitante.id, visitante.nome)} 
                        className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2.5 rounded-xl transition duration-150 flex items-center justify-center shrink-0 shadow-xs"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}