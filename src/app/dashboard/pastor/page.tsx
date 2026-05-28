'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PastorRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redireciona automaticamente para a tela de visão geral
    router.push('/dashboard/pastor/visao-geral')
  }, [router])

  return null
}