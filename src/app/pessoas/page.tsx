'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Search } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Pessoa = {
  id: string
  pessoa_eklesia_id: string
  nome: string
}

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarPessoas() {
      const { data, error } = await supabase
        .from('pessoas_cache')
        .select('id, pessoa_eklesia_id, nome')
        .order('nome', { ascending: true })

      if (error) {
        console.error(error)
      } else {
        setPessoas(data || [])
      }

      setCarregando(false)
    }

    carregarPessoas()
  }, [])

  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter((pessoa) =>
      pessoa.nome.toLowerCase().includes(busca.toLowerCase())
    )
  }, [pessoas, busca])

  if (carregando) {
    return <div className="p-10 text-xl">Carregando...</div>
  }

  return (
    <div className="p-10">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-slate-900">
          Pessoas
        </h1>

        <p className="text-slate-500 mt-3 text-xl">
          Gestão ministerial
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow p-5 mb-8 flex items-center gap-4">
        <Search size={28} className="text-slate-400" />

        <input
          type="text"
          placeholder="Buscar por nome..."
          className="w-full text-xl outline-none"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow overflow-hidden">
        {pessoasFiltradas.map((pessoa) => (
          <Link
            key={pessoa.id}
            href={`/pessoas/${pessoa.pessoa_eklesia_id}`}
            className="block px-8 py-6 border-b hover:bg-slate-50 transition"
          >
            <div className="font-bold text-xl uppercase text-slate-900">
              {pessoa.nome}
            </div>

            <div className="text-slate-400 mt-2">
              ID: {pessoa.pessoa_eklesia_id}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}