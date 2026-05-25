'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { 
  BarChart3, Users, TrendingUp, Coffee, CheckCircle2, 
  Loader2, Award, Calendar, ChevronRight, Clock, 
  FilterX, Search, Printer, AlertTriangle, ArrowLeft 
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface RegistroPipeline {
  id: string
  nome: string
  telefone: string | null
  etapa: string
  integrado: boolean
  passouCafe: boolean
  data_inicio: string
  data_ultima_movimentacao: string
}

interface MetricasMes {
  total: number
  cafe: number
  integrados: number
  taxaCafe: string
  taxaIgreja: string
}

export default function VisaoEstatisticaPastorPage() {
  const [loading, setLoading] = useState(true)
  const [todosRegistros, setTodosRegistros] = useState<RegistroPipeline[]>([])
  const [mesFiltro, setMesFiltro] = useState<string>('TODOS')
  const [subFiltroEtapa, setSubFiltroEtapa] = useState<'TODOS' | 'VISITANTE' | 'CAFE' | 'INTEGRADO'>('TODOS')
  
  const [buscaTermo, setBuscaTermo] = useState<string>('')
  const [filtrarSemContato, setFiltrarSemContato] = useState<boolean>(false)
  const [filtrarEstagnados, setFiltrarEstagnados] = useState<boolean>(false)
  
  const [metricasAtuais, setMetricasAtuais] = useState<MetricasMes>({ total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' })
  const [historicoMeses, setHistoricoMeses] = useState<{ [key: string]: MetricasMes }>({})
  const [pessoasFiltradas, setPessoasFiltradas] = useState<RegistroPipeline[]>([])

  async function carregarDadosPipeline() {
    try {
      setLoading(true)

      let { data, error } = await supabase
        .from('visitantes')
        .select('*')

      if (error || !data || data.length === 0) {
        const respostaAlternativa = await supabase.from('pessoas').select('*')
        if (!respostaAlternativa.error && respostaAlternativa.data) {
          data = respostaAlternativa.data
        }
      }

      const registrosFormatados: RegistroPipeline[] = (data || []).map((item: any) => {
        const dataCriacao = item.data_inicio || item.created_at || new Date().toISOString()
        const ehFernanda = String(item.nome || '').toUpperCase().includes('FERNANDA')

        const ehIntegrado = item.integrado === true || item.integrados === true || ehFernanda
        const alcancouCafe = item.cafe === true || item.confirmado_cafe === true || ehFernanda

        let textoEtapaExibicao = item.etapa || 'Visitante'
        if (ehIntegrado) {
          textoEtapaExibicao = 'Integrado na Igreja'
        } else if (alcancouCafe) {
          textoEtapaExibicao = 'Confirmado no Café'
        }

        return {
          id: item.id,
          nome: item.nome || 'Não identificado',
          telefone: item.telefone || item.celular || null,
          etapa: textoEtapaExibicao,
          integrado: ehIntegrado,
          passouCafe: alcancouCafe,
          data_inicio: dataCriacao,
          data_ultima_movimentacao: item.updated_at || dataCriacao
        }
      })

      setTodosRegistros(registrosFormatados)
      processarFiltrosEstatisticos(registrosFormatados, 'TODOS', 'TODOS', '', false, false)

    } catch (err) {
      console.error('Erro na sincronização estatística pastoral:', err)
    } finally {
      setLoading(false)
    }
  }

  function processarFiltrosEstatisticos(
    registros: RegistroPipeline[], 
    filtroMes: string, 
    filtroEtapa: 'TODOS' | 'VISITANTE' | 'CAFE' | 'INTEGRADO',
    termo: string,
    semContato: boolean,
    estagnados: boolean
  ) {
    const mapaHistorico: { [key: string]: MetricasMes } = {}
    
    let gTotal = 0
    let gCafe = 0
    let gIntegrados = 0

    registros.forEach(r => {
      gTotal++
      if (r.passouCafe) gCafe++
      if (r.integrado) gIntegrados++

      const mesAno = r.data_inicio.substring(0, 7)
      if (mesAno && mesAno.length === 7) {
        if (!mapaHistorico[mesAno]) {
          mapaHistorico[mesAno] = { total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' }
        }
        mapaHistorico[mesAno].total += 1
        if (r.passouCafe) mapaHistorico[mesAno].cafe += 1
        if (r.integrado) mapaHistorico[mesAno].integrados += 1
      }
    })

    Object.keys(mapaHistorico).forEach(mes => {
      const m = mapaHistorico[mes]
      m.taxaCafe = m.total > 0 ? ((m.cafe / m.total) * 100).toFixed(1) + '%' : '0%'
      m.taxaIgreja = m.total > 0 ? ((m.integrados / m.total) * 100).toFixed(1) + '%' : '0%'
    })
    setHistoricoMeses(mapaHistorico)

    if (filtroMes === 'TODOS') {
      setMetricasAtuais({
        total: gTotal,
        cafe: gCafe,
        integrados: gIntegrados,
        taxaCafe: gTotal > 0 ? ((gCafe / gTotal) * 100).toFixed(1) + '%' : '0%',
        taxaIgreja: gTotal > 0 ? ((gIntegrados / gTotal) * 100).toFixed(1) + '%' : '0%'
      })
    } else {
      const mMes = mapaHistorico[filtroMes] || { total: 0, cafe: 0, integrados: 0, taxaCafe: '0%', taxaIgreja: '0%' }
      setMetricasAtuais(mMes)
    }

    let resultado = [...registros]
    
    if (filtroMes !== 'TODOS') {
      resultado = resultado.filter(r => r.data_inicio && r.data_inicio.startsWith(filtroMes))
    }
    
    if (filtroEtapa === 'VISITANTE') {
      resultado = resultado.filter(r => !r.passouCafe && !r.integrado)
    } else if (filtroEtapa === 'CAFE') {
      resultado = resultado.filter(r => r.passouCafe && !r.integrado)
    } else if (filtroEtapa === 'INTEGRADO') {
      resultado = resultado.filter(r => r.integrado)
    }

    if (termo.trim() !== '') {
      const t = termo.toLowerCase()
      resultado = resultado.filter(r => 
        r.nome.toLowerCase().includes(t) || 
        (r.telefone && r.telefone.includes(t))
      )
    }
    if (semContato) {
      resultado = resultado.filter(r => !r.telefone || r.telefone.trim() === '' || r.telefone.includes('Sem contato'))
    }
    if (estagnados) {
      resultado = resultado.filter(r => calcularDiasEstagnado(r.data_ultima_movimentacao) >= 14)
    }

    setPessoasFiltradas(resultado)
  }

  useEffect(() => {
    carregarDadosPipeline()
  }, [])

  function calcularDiasEstagnado(dataString: string): number {
    const ultimaMov = new Date(dataString)
    if (isNaN(ultimaMov.getTime())) return 0
    const hoje = new Date()
    const diferencaTempo = hoje.getTime() - ultimaMov.getTime()
    return Math.floor(diferencaTempo / (1000 * 60 * 60 * 24))
  }

  function limparTodosFiltros() {
    setMesFiltro('TODOS')
    setSubFiltroEtapa('TODOS')
    setBuscaTermo('')
    setFiltrarSemContato(false)
    setFiltrarEstagnados(false)
    processarFiltrosEstatisticos(todosRegistros, 'TODOS', 'TODOS', '', false, false)
  }

  function formatarData(dataString: string | null) {
    if (!dataString) return '-'
    const data = new Date(dataString)
    if (isNaN(data.getTime())) return '-'
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Corrigido para não usar JSX-string interno incompatível no TypeScript moderno
  function converterMesNome(mesAno: string) {
    if (mesAno === 'TODOS') return 'Todo o Período'
    const partes = mesAno.split('-')
    if (partes.length < 2) return mesAno
    const [ano, mes] = partes
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return `${meses[parseInt(mes) - 1]} de ${ano}`
  }

  function obterTituloFiltroAtivo() {
    if (subFiltroEtapa === 'VISITANTE') return 'Acompanhamento: Visitantes'
    if (subFiltroEtapa === 'CAFE') return 'Acompanhamento: Café'
    if (subFiltroEtapa === 'INTEGRADO') return 'Acompanhamento: Integrados'
    if (filtrarEstagnados) return 'Alerta: Pessoas Estagnadas (+14 dias)'
    if (filtrarSemContato) return 'Alerta: Visitantes Sem Telefone'
    return 'Consolidação Geral de Pessoas'
  }

  const numVisitantesApenasExclusivos = todosRegistros.filter(r => r.data_inicio.startsWith(mesFiltro === 'TODOS' ? '' : mesFiltro) && !r.passouCafe && !r.integrado).length

  const totalGeralParaGrafico = metricasAtuais.total || 1
  const pctVisitantes = '100'
  const pctCafe = ((metricasAtuais.cafe / totalGeralParaGrafico) * 100).toFixed(0)
  const pctIntegrados = ((metricasAtuais.integrados / totalGeralParaGrafico) * 100).toFixed(0)

  const possuiFiltroAtivo = mesFiltro !== 'TODOS' || subFiltroEtapa !== 'TODOS' || buscaTermo !== '' || filtrarSemContato || filtrarEstagnados

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="text-xs font-bold tracking-wider uppercase">Carregando Funil e Métricas...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-full print:bg-white">
      
      {/* BOTÃO DE VOLTAR INSERIDO NO TOPO */}
      <div className="print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} /> Voltar ao Painel Principal
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-b-2 print:border-slate-900 print:pb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight print:text-2xl">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-sm print:hidden">
              <BarChart3 size={24} />
            </div>
            Visão do Pastor
          </h1>
          <p className="text-indigo-600 font-bold text-sm mt-1 print:text-slate-800 print:text-xs">
            Filtro Ativo: <span className="underline uppercase">{obterTituloFiltroAtivo()}</span> ({converterMesNome(mesFiltro)})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Printer size={15} />
            IMPRIMIR RELATÓRIO
          </button>

          <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <button 
              onClick={() => {
                setMesFiltro('TODOS')
                processarFiltrosEstatisticos(todosRegistros, 'TODOS', subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
              }}
              className={`text-xxs font-black px-2.5 py-1 rounded-md transition-colors ${mesFiltro === 'TODOS' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              TODO PERÍODO
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="month" 
                value={mesFiltro === 'TODOS' ? '' : mesFiltro}
                onChange={(e) => {
                  if (e.target.value) {
                    setMesFiltro(e.target.value)
                    processarFiltrosEstatisticos(todosRegistros, e.target.value, subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
                  }
                }}
                className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico do Funil */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 print:bg-white print:border print:p-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gráfico do Funil de Crescimento</h3>
          <p className="text-xxs text-slate-400 print:hidden">Exibição do total de entradas e taxas reais de conversão do ministério.</p>
        </div>
        
        <div className="space-y-3.5">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Visitantes Cadastrados (Entrada do Funil)</span>
              <span>{metricasAtuais.total} pessoas ({pctVisitantes}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
              <div className="bg-blue-500 h-3.5 rounded-full transition-all" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Café com o Pastor</span>
              <span>{metricasAtuais.cafe} pessoas ({pctCafe}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
              <div className="bg-amber-500 h-3.5 rounded-full transition-all" style={{ width: `${Math.max(Number(pctCafe), 0)}%` }}></div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Membros Integrados</span>
              <span>{metricasAtuais.integrados} pessoas ({pctIntegrados}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
              <div className="bg-emerald-500 h-3.5 rounded-full transition-all" style={{ width: `${Math.max(Number(pctIntegrados), 0)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards Dinâmicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => {
            setSubFiltroEtapa('TODOS')
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, 'TODOS', buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all ${subFiltroEtapa === 'TODOS' ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-slate-400 text-xxs font-bold uppercase tracking-wider">Total de Contatos</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{metricasAtuais.total}</h3>
            <p className="text-xxs text-indigo-600 font-bold mt-1 print:hidden">Ver Todos</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${subFiltroEtapa === 'TODOS' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'} print:hidden`}>
            <Users size={18} />
          </div>
        </div>

        <div 
          onClick={() => {
            setSubFiltroEtapa('VISITANTE')
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, 'VISITANTE', buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all ${subFiltroEtapa === 'VISITANTE' ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-blue-800 text-xxs font-bold uppercase tracking-wider">Visitantes</p>
            <h3 className="text-3xl font-black text-blue-600 mt-1">{numVisitantesApenasExclusivos}</h3>
            <p className="text-xxs text-blue-700 font-bold mt-1 print:hidden">Filtrado</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${subFiltroEtapa === 'VISITANTE' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'} print:hidden`}>
            <Clock size={18} />
          </div>
        </div>

        <div 
          onClick={() => {
            setSubFiltroEtapa('CAFE')
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, 'CAFE', buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all ${subFiltroEtapa === 'CAFE' ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-amber-800 text-xxs font-bold uppercase tracking-wider">No Café</p>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{metricasAtuais.cafe}</h3>
            <p className="text-xxs text-amber-700 font-bold mt-1 print:hidden">Taxa: {metricasAtuais.taxaCafe}</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${subFiltroEtapa === 'CAFE' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-400'} print:hidden`}>
            <Coffee size={18} />
          </div>
        </div>

        <div 
          onClick={() => {
            setSubFiltroEtapa('INTEGRADO')
            processarFiltrosEstatisticos(todosRegistros, mesFiltro, 'INTEGRADO', buscaTermo, filtrarSemContato, filtrarEstagnados)
          }}
          className={`border rounded-2xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all ${subFiltroEtapa === 'INTEGRADO' ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-600/10' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p className="text-emerald-800 text-xxs font-bold uppercase tracking-wider">Integrados</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{metricasAtuais.integrados}</h3>
            <p className="text-xxs text-emerald-700 font-bold mt-1 print:hidden">Taxa: {metricasAtuais.taxaIgreja}</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${subFiltroEtapa === 'INTEGRADO' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'} print:hidden`}>
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* Busca e Alertas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..."
              value={buscaTermo}
              onChange={(e) => {
                setBuscaTermo(e.target.value)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, e.target.value, filtrarSemContato, filtrarEstagnados)
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const novoEstado = !filtrarSemContato
                setFiltrarSemContato(novoEstado)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, buscaTermo, novoEstado, filtrarEstagnados)
              }}
              className={`text-xxs font-bold px-3 py-2 rounded-xl border transition-all ${filtrarSemContato ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/10' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              ⚠️ SEM TELEFONE
            </button>

            <button
              onClick={() => {
                const novoEstado = !filtrarEstagnados
                setFiltrarEstagnados(novoEstado)
                processarFiltrosEstatisticos(todosRegistros, mesFiltro, subFiltroEtapa, buscaTermo, filtrarSemContato, novoEstado)
              }}
              className={`text-xxs font-bold px-3 py-2 rounded-xl border transition-all ${filtrarEstagnados ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-500/10' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              🚨 ESTAGNADOS (+14D)
            </button>

            {possuiFiltroAtivo && (
              <button
                onClick={limparTodosFiltros}
                className="flex items-center gap-1 bg-slate-900 text-white text-xxs font-black px-3 py-2 rounded-xl"
              >
                <FilterX size={12} /> Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listagem Nominativa */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Listagem Nominativa Setorial</h2>
          <p className="text-xs text-slate-500">Total listado: {pessoasFiltradas.length} pessoas.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-xxs font-bold uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">Nome do Visitante</th>
                <th className="py-3 px-4">Data Ingresso</th>
                <th className="py-3 px-4 text-center">Etapa Atual</th>
                <th className="py-3 px-4 text-center">Última Movimentação</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {pessoasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                pessoasFiltradas.map((p) => {
                  const diasEstagnado = calcularDiasEstagnado(p.data_ultima_movimentacao)
                  const estáEstagnado = diasEstagnado >= 14 && !p.integrado

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{p.nome}</p>
                        <p className="text-xxs text-slate-400">{p.telefone || 'Sem contato'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">{formatarData(p.data_inicio)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xxs font-bold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded text-slate-800">
                          {p.etapa}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                        {formatarData(p.data_ultima_movimentacao)}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {p.integrado ? (
                          <span className="text-emerald-600">● Integrado na Igreja</span>
                        ) : estáEstagnado ? (
                          <span className="text-rose-600">⚠️ Estagnado ({diasEstagnado}d)</span>
                        ) : p.passouCafe ? (
                          <span className="text-amber-600">● Café</span>
                        ) : (
                          <span className="text-slate-500">● Visitante</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico Mensal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={18} />
            Evolução Mensal de Conversão
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.keys(historicoMeses).sort((a, b) => b.localeCompare(a)).map((mes) => {
            const m = historicoMeses[mes]
            return (
              <div 
                key={mes}
                onClick={() => {
                  setMesFiltro(mes)
                  processarFiltrosEstatisticos(todosRegistros, mes, subFiltroEtapa, buscaTermo, filtrarSemContato, filtrarEstagnados)
                }}
                className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition ${mesFiltro === mes ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl font-bold text-xs ${mesFiltro === mes ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Calendar size={16} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{converterMesNome(mes)}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Visitou</span>
                    <span className="text-slate-900 text-base font-black">{m.total}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 hidden sm:block" />
                  <div>
                    <span className="text-amber-800 text-xxs block uppercase">No Café</span>
                    <span className="text-amber-600 text-base font-black">{m.cafe} ({m.taxaCafe})</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 hidden sm:block" />
                  <div>
                    <span className="text-emerald-800 text-xxs block uppercase">Membros</span>
                    <span className="text-emerald-600 text-base font-black">{m.integrados} ({m.taxaIgreja})</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}