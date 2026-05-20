'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { MessageCircle, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Pessoa = {
  pessoa_eklesia_id: string
  nome: string
  celular: string
  telefone: string
  email: string
  sexo: string
  cidade: string
  bairro: string
  endereco: string
  estado_civil: string
  escolaridade: string
  arrolamento: string
  data_nascimento: string
}

export default function PerfilPessoa({
  params
}: {
  params: { id: string }
}) {
  const [pessoa, setPessoa] = useState<Pessoa | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('pessoas_cache')
        .select('*')
        .eq('pessoa_eklesia_id', params.id)
        .single()

      if (data) {
        setPessoa(data)
      }
    }

    carregar()
  }, [params.id])

  function iniciais(nome: string) {
    if (!nome) return '?'

    const partes = nome.split(' ')

    return (
      (partes[0]?.[0] || '') +
      (partes[1]?.[0] || '')
    ).toUpperCase()
  }

  function idade(data: string) {
    if (!data) return '-'

    const nascimento = new Date(data)
    const hoje = new Date()

    let anos = hoje.getFullYear() - nascimento.getFullYear()

    const mes = hoje.getMonth() - nascimento.getMonth()

    if (
      mes < 0 ||
      (mes === 0 && hoje.getDate() < nascimento.getDate())
    ) {
      anos--
    }

    return anos
  }

  if (!pessoa) {
    return (
      <div className="text-center py-20">
        Carregando perfil...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href="/pessoas"
        className="inline-flex items-center gap-2 mb-8 text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={18} />
        Voltar
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="w-28 h-28 rounded-full bg-slate-900 text-white flex items-center justify-center text-3xl font-bold mx-auto">
            {iniciais(pessoa.nome)}
          </div>

          <div className="text-center mt-6">
            <h1 className="text-2xl font-bold">
              {pessoa.nome}
            </h1>

            <p className="text-slate-500 mt-2">
              {pessoa.arrolamento || 'Sem status'}
            </p>
          </div>

          <div className="flex justify-center gap-6 mt-8">
            {pessoa.celular && (
              <a
                href={`https://wa.me/55${pessoa.celular.replace(/\D/g, '')}`}
                target="_blank"
                className="p-4 rounded-2xl bg-green-50"
              >
                <MessageCircle />
              </a>
            )}

            {pessoa.email && (
              <a
                href={`mailto:${pessoa.email}`}
                className="p-4 rounded-2xl bg-blue-50"
              >
                <Mail />
              </a>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-8">
            Dados pessoais
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Campo label="Sexo" valor={pessoa.sexo} />
            <Campo label="Idade" valor={idade(pessoa.data_nascimento)} />
            <Campo label="Estado civil" valor={pessoa.estado_civil} />
            <Campo label="Escolaridade" valor={pessoa.escolaridade} />
            <Campo label="Telefone" valor={pessoa.telefone} />
            <Campo label="Celular" valor={pessoa.celular} />
            <Campo label="Email" valor={pessoa.email} />
            <Campo label="Cidade" valor={pessoa.cidade} />
            <Campo label="Bairro" valor={pessoa.bairro} />
            <Campo label="Endereço" valor={pessoa.endereco} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({
  label,
  valor
}: {
  label: string
  valor: string | number | null
}) {
  return (
    <div className="border rounded-2xl p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-semibold mt-2">
        {valor || '-'}
      </p>
    </div>
  )
}