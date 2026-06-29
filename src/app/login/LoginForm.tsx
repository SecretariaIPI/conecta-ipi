'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Instância do cliente Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleResetPassword = async () => {
    if (!email) return alert('Insira seu e-mail primeiro.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })
    if (error) alert(error.message)
    else alert('Verifique seu e-mail para recuperar a senha.')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      alert(error.message)
      setLoading(false)
    } else {
      window.location.href = '/paginaboasvindas'
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input 
        type="email" placeholder="E-mail" required
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border rounded-xl bg-slate-50"
      />
      <input 
        type="password" placeholder="Senha" required
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 border rounded-xl bg-slate-50"
      />
      
      <button 
        type="button" 
        onClick={handleResetPassword} 
        className="text-xs text-blue-600 font-bold hover:underline block"
      >
        Esqueci minha senha
      </button>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}