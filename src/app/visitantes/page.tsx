'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { UserPlus, Trash2, Phone, MapPin, Eye, Users, Calendar, Search, Activity, CheckCircle, Clock } from 'lucide-react'

// ==========================================
// 1. CONSTANTES E CONFIGURAÇÕES
// ==========================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const ETAPAS = {
  PRIMEIRO_CONTATO: 'primeiro_contato',
  SEGUNDO_CONTATO: 'segundo_contato',
  INTERCESSAO: 'intercessao',
  CONVITE_CAFE: 'convite_cafe',
  POS_CAFE: 'pos_cafe'
}

const ORDEM_ETAPAS: Record<string, number> = {
  [ETAPAS.PRIMEIRO_CONTATO]: 1,
  '1º contato': 1,
  '1_contato': 1,
  [ETAPAS.SEGUNDO_CONTATO]: 2,
  '2º contato': 2,
  '2_contato': 2,
  [ETAPAS.INTERCESSAO]: 3,
  'intercessao': 3,
  'intercessão': 3,
  [ETAPAS.CONVITE_CAFE]: 4,
  'convite_cafe': 4,
  'convite café': 4,
  [ETAPAS.POS_CAFE]: 5,
  'pos_cafe': 5,
  'pós-café': 5
}

// ==========================================
// 2. TIPAGENS
// ==========================================
interface Followup {
  id: string
  visitante_id: string
  etapa: string
  status: string
}

interface Visitante {
  id: string
  nome: string
  telefone?: string
  email?: string
  sexo?: string
  faixa_etaria?: string
  cidade?: string
  origem?: string
  data_visita?: string
  pedido_oracao?: string
  visitantes_followup?: Followup[]
}

// ==========================================
// 3. FUNÇÕES UTILITÁRIAS
// ==========================================
function getDescricaoEtapa(etapa: string) {
  if (!etapa) return 'Contato'
  const e = etapa.toLowerCase().trim()
  if (e.includes('1') || e.includes('primeiro')) return '1º Contato'
  if (e.includes('2') || e.includes('segundo')) return '2º Contato'
  if (e.includes('intercess')) return 'Intercessão'
  if (e.includes('convite')) return 'Convite Café'
  if (e.includes('pos') || e.includes('pós')) return 'Pós-Café'
  return etapa
}

function formatarDataExtenso(dataStr: string) {
  if (!dataStr) return 'Sem data'
  const [ano, mes, dia] = dataStr.split('-')
  const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia))
  return dataObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ==========================================
// 4. COMPONENTE DE STATUS (BADGE)
// ==========================================
function BadgeStatus({ visitante }: { visitante: Visitante }) {
  const hist = visitante.visitantes_followup || []
  const telefoneLimpo = (visitante.telefone || '').replace(/\D/g, '')
  const temTelefoneValido = telefoneLimpo.length >= 10 && !/^0+$/.test(telefoneLimpo)

  const progresso = hist.filter((f) => {
    const statusNormalizado = (f.status || '').trim().toLowerCase()
    return (
      statusNormalizado.includes('realizado') || 
      statusNormalizado.includes('positiv') ||
      statusNormalizado.includes('compareceu')
    )
  })

  if (!temTelefoneValido) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-red-100 text-red-700 border border-red-200">
        Dados de contato inválidos
      </span>
    )
  }

  if (progresso.length > 0) {
    const ultimo = [...progresso].sort((a, b) => {
      const etapaA = (a.etapa || '').toLowerCase().trim()
      const etapaB = (b.etapa || '').toLowerCase().trim()
      return (ORDEM_ETAPAS[etapaB] || 0) - (ORDEM_ETAPAS[etapaA] || 0)
    })[0]
    
    const nomeEtapa = getDescricaoEtapa(ultimo.etapa)
    const statusReal = (ultimo.status || '').toLowerCase().trim()
    const ehNegativo = statusReal.includes('não') || statusReal.includes('nao')

    let textoFinal = ''
    let classesCores = ''

    if (nomeEtapa.includes('Pós-Café') || ultimo.etapa.toLowerCase().includes('pos')) {
      if (ehNegativo) {
        textoFinal = 'Pós-Café (Não Compareceu)'
        classesCores = 'bg-red-100 text-red-700 border border-red-200'
      } else {
        textoFinal = 'Pós-Café (Compareceu)'
        classesCores = 'bg-green-100 text-green-700 border border-green-200'
      }
    } else {
      if (ehNegativo) {
        textoFinal = `${nomeEtapa} Não Realizado`
        classesCores = 'bg-rose-100 text-rose-700 border border-rose-200'
      } else {
        textoFinal = `${nomeEtapa} Realizado`
        classesCores = 'bg-green-100 text-green-700 border border-green-200'
      }
    }

    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${classesCores}`}>
        {textoFinal}
      </span>
    )
  } 
  
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
      Aguardando 1º Contato
    </span>
  )
}

// ==========================================
// 5. HOOK PERSONALIZADO
// ==========================================
function useVisitantes() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  async function carregarVisitantes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visitantes')
        .select(`
          *,
          visitantes_followup (*)
        `)
        .order('data_visita', { ascending: false, nullsFirst: false })

      if (error) throw error
      setVisitantes(data || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar visitantes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarVisitantes()
  }, [])

  return { visitantes, loading, erro, carregarVisitantes }
}

// ==========================================
// 6. COMPONENTE PRINCIPAL
// ==========================================
export default function VisitantesPage() {
  const { visitantes, loading, erro, carregarVisitantes } = useVisitantes()
  
  // Estados adicionados
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [visitanteEditando, setVisitanteEditando] = useState<Visitante | null>(null)
  
  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', sexo: '', faixaEtaria: '', 
    cidade: '', dataVisita: '', origem: 'Não informou', outraIgreja: '', pedidoOracao: ''
  })

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Exclusão Otimizada com ON DELETE CASCADE ativo no Banco
  async function excluirVisitante(id: string, nome: string) {
    if (!window.confirm(`Deseja realmente excluir ${nome}?`)) return
    try {
      const { error } = await supabase.from('visitantes').delete().eq('id', id)
      if (error) throw error
      carregarVisitantes()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  async function cadastrarVisitante() {
    if (!form.nome.trim() || !form.telefone.trim()) {
      alert('Nome e telefone são obrigatórios.')
      return
    }

    try {
      setSalvando(true)
      let origemFinal = form.origem
      if (form.origem === 'Igreja Evangélica' && form.outraIgreja.trim()) {
        origemFinal = `Igreja Evangélica (${form.outraIgreja.trim()})`
      }

      const { data, error } = await supabase
        .from('visitantes')
        .insert({
          nome: form.nome.trim(),
          telefone: form.telefone.trim(),
          email: form.email.trim(),
          sexo: form.sexo,
          faixa_etaria: form.faixaEtaria,
          cidade: form.cidade.trim(),
          data_visita: form.dataVisita || null,
          origem: origemFinal,
          pedido_oracao: form.pedidoOracao.trim()
        })
        .select()
        .single()

      if (error || !data) throw error

      await supabase.from('visitantes_checklist').insert([{ visitante_id: data.id }])
      
      setForm({
        nome: '', telefone: '', email: '', sexo: '', faixaEtaria: '', 
        cidade: '', dataVisita: '', origem: 'Não informou', outraIgreja: '', pedidoOracao: ''
      })
      carregarVisitantes()
    } catch (err: any) {
      alert('Erro no cadastro: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Filtro de Busca em Tempo Real
  const visitantesFiltrados = visitantes.filter(v => {
    const termo = busca.toLowerCase().trim()
    if (!termo) return true
    return (
      v.nome?.toLowerCase().includes(termo) ||
      v.telefone?.toLowerCase().includes(termo) ||
      v.cidade?.toLowerCase().includes(termo)
    )
  })

  // Agrupamento usando a lista filtrada
  const visitantesAgrupados = visitantesFiltrados.reduce((grupos: Record<string, Visitante[]>, visitante) => {
    const chaveData = visitante.data_visita || 'sem_data'
    if (!grupos[chaveData]) grupos[chaveData] = []
    grupos[chaveData].push(visitante)
    return grupos
  }, {})

  const chavesOrdenadas = Object.keys(visitantesAgrupados).sort((a, b) => {
    if (a === 'sem_data') return 1
    if (b === 'sem_data') return -1
    return new Date(b).getTime() - new Date(a).getTime()
  })

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500 text-lg">Carregando painel consolidado...</div>
  if (erro) return <div className="p-10 text-red-600 font-bold bg-red-50 rounded-3xl m-8">Erro: {erro}</div>

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-blue-600" size={32} /> CRM Pastoral e Consolidação
        </h1>
        <p className="text-slate-500 mt-1">Gerencie a recepção, acompanhamento e a integração de novos membros.</p>
      </div>

      {/* 1. Barra de Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar visitante por nome, telefone ou cidade..."
          className="w-full outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
        />
      </div>

      {/* 2. Dashboard de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Activity size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Visitantes</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{visitantes.length}</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Clock size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aguardando Contato</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {visitantes.filter(v => !v.visitantes_followup?.length).length}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="p-3 rounded-xl bg-green-50 text-green-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Follow-up Ativo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {visitantes.filter(v => (v.visitantes_followup?.length || 0) > 0).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Formulário de Cadastro */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users size={18} className="text-slate-500" /> Novo Cadastro
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input name="nome" value={form.nome} onChange={handleFormChange} placeholder="Nome Completo" className="border rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          <input name="telefone" value={form.telefone} onChange={handleFormChange} placeholder="Telefone / WhatsApp" className="border rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          <input name="email" value={form.email} onChange={handleFormChange} placeholder="E-mail" className="border rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          
          <select name="sexo" value={form.sexo} onChange={handleFormChange} className="border rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500 text-sm">
            <option value="">Gênero</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <input name="faixaEtaria" value={form.faixaEtaria} onChange={handleFormChange} placeholder="Faixa etária" className="border rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          <input name="cidade" value={form.cidade} onChange={handleFormChange} placeholder="Cidade" className="border rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          <input type="date" name="dataVisita" value={form.dataVisita} onChange={handleFormChange} className="border rounded-xl px-4 py-3 text-slate-600 outline-none focus:border-blue-500 text-sm" />

          <select name="origem" value={form.origem} onChange={(e) => { handleFormChange(e); if (e.target.value !== 'Igreja Evangélica') setForm(prev => ({ ...prev, outraIgreja: '' })) }} className="border rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500 font-medium text-slate-700 text-sm">
            <option value="Não informou">Origem: Não informou</option>
            <option value="Igreja Católica">Igreja Católica</option>
            <option value="Igreja Evangélica">Igreja Evangélica (Qual?)</option>
            <option value="Não pertence a nenhuma igreja">Não pertence a nenhuma igreja</option>
          </select>
        </div>

        {form.origem === 'Igreja Evangélica' && (
          <div className="w-full max-w-md animate-fadeIn">
            <input name="outraIgreja" value={form.outraIgreja} onChange={handleFormChange} placeholder="Qual denominação? (Ex: Batista)" className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm" />
          </div>
        )}

        <textarea name="pedidoOracao" value={form.pedidoOracao} onChange={handleFormChange} placeholder="Pedidos de oração ou observações..." className="border rounded-xl px-4 py-3 w-full h-24 resize-none outline-none focus:border-blue-500 text-sm" />

        <button onClick={cadastrarVisitante} disabled={salvando} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-sm rounded-xl px-6 py-3.5 transition w-full md:w-auto">
          {salvando ? 'Salvando...' : 'Efetivar Cadastro de Visitante'}
        </button>
      </div>

      {/* Lista de Visitantes Agrupada */}
      <div className="space-y-8">
        {chavesOrdenadas.map((dataChave) => {
          const listaDoDia = visitantesAgrupados[dataChave]
          const ehSemData = dataChave === 'sem_data'

          return (
            <div key={dataChave} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className={`p-2 rounded-xl border ${ehSemData ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                    {ehSemData ? 'Sem data de visita cadastrada' : formatarDataExtenso(dataChave)}
                  </h3>
                  <p className="text-xxs text-slate-400 font-medium">
                    {listaDoDia.length} {listaDoDia.length === 1 ? 'visitante' : 'visitantes'}
                  </p>
                </div>
                <div className="grow border-t border-dashed border-slate-200/80 ml-2" />
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {listaDoDia.map((visitante) => (
                  <div key={visitante.id} className="bg-white rounded-2xl border border-slate-200/70 hover:border-blue-300 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 group">
                    <div className="space-y-1.5 max-w-sm">
                      <Link href={`/visitantes/${visitante.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition flex items-center gap-1.5 text-sm">
                        <Eye size={14} className="text-slate-400 group-hover:text-blue-500 transition" /> 
                        {visitante.nome}
                      </Link>

                      <div className="flex gap-1.5 flex-wrap mt-2">
                        <BadgeStatus visitante={visitante} />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xxs font-medium text-slate-500 mt-2">
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          <Phone size={11} className="text-slate-400" /> {visitante.telefone || '-'}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          <MapPin size={11} className="text-slate-400" /> {visitante.cidade || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <span className="text-xxs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200/40 px-2.5 py-1 rounded-lg max-w-[200px] truncate">
                        {visitante.origem || 'Não informado'}
                      </span>
                      <button onClick={() => setVisitanteEditando(visitante)} className="text-blue-600 text-xs font-bold hover:underline px-3 py-1">Editar</button>
                      <button onClick={() => excluirVisitante(visitante.id, visitante.nome)} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2.5 rounded-xl transition duration-150 flex items-center justify-center shrink-0 shadow-xs">
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

      {/* Modal de Edição Avançada (Campos Expandidos) */}
      {visitanteEditando && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">Editar Cadastro do Visitante</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input 
                  className="w-full border p-3 rounded-xl mt-1 text-sm outline-none focus:border-blue-500" 
                  value={visitanteEditando.nome || ''}
                  onChange={(e) => setVisitanteEditando({...visitanteEditando, nome: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                  <input 
                    className="w-full border p-3 rounded-xl mt-1 text-sm outline-none focus:border-blue-500" 
                    value={visitanteEditando.telefone || ''}
                    onChange={(e) => setVisitanteEditando({...visitanteEditando, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                  <input 
                    className="w-full border p-3 rounded-xl mt-1 text-sm outline-none focus:border-blue-500" 
                    value={visitanteEditando.email || ''}
                    onChange={(e) => setVisitanteEditando({...visitanteEditando, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                  <input 
                    className="w-full border p-3 rounded-xl mt-1 text-sm outline-none focus:border-blue-500" 
                    value={visitanteEditando.cidade || ''}
                    onChange={(e) => setVisitanteEditando({...visitanteEditando, cidade: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Origem</label>
                  <input 
                    className="w-full border p-3 rounded-xl mt-1 text-sm outline-none focus:border-blue-500" 
                    value={visitanteEditando.origem || ''}
                    onChange={(e) => setVisitanteEditando({...visitanteEditando, origem: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setVisitanteEditando(null)} className="w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-medium transition text-sm">Cancelar</button>
              <button 
                onClick={async () => {
                  if (!visitanteEditando.nome?.trim()) return alert('O nome é obrigatório.')
                  try {
                    setSalvando(true)
                    const { error } = await supabase
                      .from('visitantes')
                      .update({ 
                        nome: visitanteEditando.nome.trim(),
                        telefone: visitanteEditando.telefone?.trim(),
                        email: visitanteEditando.email?.trim(),
                        cidade: visitanteEditando.cidade?.trim(),
                        origem: visitanteEditando.origem?.trim()
                      })
                      .eq('id', visitanteEditando.id)

                    if (error) throw error
                    setVisitanteEditando(null)
                    carregarVisitantes()
                  } catch (err: any) {
                    alert('Erro ao atualizar: ' + err.message)
                  } finally {
                    setSalvando(false)
                  }
                }} 
                disabled={salvando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-medium transition text-sm"
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}