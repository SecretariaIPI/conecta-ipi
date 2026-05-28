'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function RedirecionamentoPastorPage() {
  const router = useRouter()

  useEffect(() => {
    // Te leva automaticamente para a tela estatística
    router.push('/dashboard/pastor/visao-geral')
  }, [router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
      <span className="text-xs font-bold tracking-wider uppercase">Carregando painel pastoral...</span>
    </div>
  )
}