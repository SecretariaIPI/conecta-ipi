'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { UserPlus, Trash2, Phone, MapPin, Eye } from 'lucide-react'

// Inicialização segura e resiliente para o ambiente da Vercel
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
  const [origem, setOrigem] = useState('')
  const [pedidoOracao, setPedidoOracao] = useState('')

  async function carregarVisitantes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visitantes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErro(error.message)
        return
      }

      setVisitantes(data || [])
    } catch (err: visitante) {
      setErro(err.message || 'Erro desconhecido ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarVisitantes()
  }, [])

  async function excluirVisitante(id: string, nome: string) {
    const confirmar = window.confirm(
      `Deseja realmente excluir ${nome}?\n\nEssa ação removerá cadastro, checklist de integração, follow-up e histórico.`
    )

    if (!confirmar) return

    try {
      // GARANTIA DE INTEGRIDADE: Remove os checklists e tabelas vinculadas antes do mestre
      await supabase
        .from('visitantes_checklist')
        .delete()
        .eq('visitante_id', id)

      await supabase
        .from('visitantes_timeline')
        .delete()
        .eq('visitante_id', id)

      await supabase
        .from('visitantes_followup')
        .delete()
        .eq('visitante_id', id)

      const { error } = await supabase
        .from('visitantes')
        .delete()
        .eq('id', id)

      if (error) {
        alert(error.message)
        return
      }

      carregarVisitantes()
    } catch (err: visitante) {
      alert('Erro ao tentar excluir o visitante: ' + err.message)
    }
  }

  async function cadastrarVisitante() {
    if (!nome || !telefone) {
      alert('Nome e telefone são obrigatórios.')
      return
    }

    try {
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
          origem,
          pedido_oracao: pedidoOracao
        })
        .select()
        .maybeSingle() // Ajustado para evitar exceções caso o retorno mude

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

      // INICIALIZAÇÃO AUTOMÁTICA: Checklist zerado
      await supabase
        .from('visitantes_checklist')
        .insert([{ visitante_id: data.id }])

      limparFormulario()
      carregarVisitantes()
    } catch (err: visitante) {
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
    setOrigem('')
    setPedidoOracao('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium text-lg">
        Carregando console de visitantes...
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-10 text-red-600 font-bold bg-red-50 rounded-3xl border border-red-200 m-8">
        Erro operacional: {erro}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-blue-600" size={32} /> CRM Pastoral e Consolidação
        </h1>
        <p className="text-slate-500 mt-1">Gerencie a recepção, acompanhamento e a integração de novos membros.</p>
      </div>

      {/* Formulário de Cadastro Modernizado */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Novo Cadastro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome Completo"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Telefone / WhatsApp"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />

          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500"
          >
            <option value="">Gênero</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <input
            value={faixaEtaria}
            onChange={(e) => setFaixaEtaria(e.target.value)}
            placeholder="Faixa etária"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Cidade"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />

          <input
            type="date"
            value={dataVisita}
            onChange={(e) => setDataVisita(e.target.value)}
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 text-slate-600 outline-none focus:border-blue-500"
          />

          <input
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Origem (Ex: Instagram, Amigo...)"
            className="border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <textarea
          value={pedidoOracao}
          onChange={(e) => setPedidoOracao(e.target.value)}
          placeholder="Insira aqui os pedidos de oração ou observações iniciais da primeira visita..."
          className="border border-slate-200 text-sm rounded-xl px-4 py-3 w-full h-24 resize-none outline-none focus:border-blue-500"
        />

        <button
          onClick={cadastrarVisitante}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl px-6 py-3.5 transition w-full md:w-auto"
        >
          Efetivar Cadastro de Visitante
        </button>
      </div>

      {/* Listagem em Tabela Limpa */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4 pl-6">Nome Completo</th>
                <th className="p-4">Contato</th>
                <th className="p-4">Localidade</th>
                <th className="p-4">Origem</th>
                <th className="p-4">Primeira Visita</th>
                <th className="p-4 text-center pr-6">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {visitantes.map((visitante) => (
                <tr key={visitante.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-900 max-w-xs truncate">
                    <Link
                      href={`/visitantes/${visitante.id}`}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                    >
                      <Eye size={14} className="inline" /> {visitante.nome}
                    </Link>
                  </td>

                  <td className="p-4 text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1"><Phone size={12} /> {visitante.telefone || '-'}</span>
                  </td>
                  
                  <td className="p-4 text-slate-500 max-w-[120px] truncate">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {visitante.cidade || '-'}</span>
                  </td>
                  
                  <td className="p-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                    <span className="bg-slate-100 px-2 py-1 rounded-md">{visitante.origem || 'Não informado'}</span>
                  </td>

                  <td className="p-4 text-slate-500 whitespace-nowrap">
                    {visitante.data_visita
                      ? new Date(visitante.data_visita).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>

                  <td className="p-4 text-center pr-6 whitespace-nowrap">
                    <button
                      onClick={() => excluirVisitante(visitante.id, visitante.nome)}
                      className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition duration-150 inline-flex items-center justify-center"
                      title="Excluir definitivo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {visitantes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-slate-400 font-medium">
                    Nenhum visitante localizado na base de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}