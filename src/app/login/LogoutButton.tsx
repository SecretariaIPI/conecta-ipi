'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

 const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/') // Garante que volta para o login
  router.refresh()
}


  return (
    <button 
      onClick={handleLogout}
      className="text-white font-medium hover:text-red-400 transition"
    >
      Sair do Sistema
    </button>
  )
}