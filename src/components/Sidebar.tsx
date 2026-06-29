'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, UserPlus, Footprints, ArrowLeft, Compass, Radio, CupSoda } from 'lucide-react'
import LogoutButton from '../app/login/LogoutButton'
// Exemplo de menu — remova Logout daqui para evitar conflito com LogoutButton separado
const menu = [
  { nome: 'Novos Pousos', href: '/dashboard/novos-pousos', icon: UserPlus },
  { nome: 'Pilotos', href: '/dashboard/pilotos', icon: Users },
  { nome: 'Rotas', href: '/dashboard/rotas', icon: Footprints },
  { nome: 'Explorar', href: '/dashboard/explorar', icon: Compass },
  { nome: 'Rádio', href: '/dashboard/radio', icon: Radio },
  { nome: 'Bebidas', href: '/dashboard/bebidas', icon: CupSoda },
]

export default function Sidebar() {
  const pathname = usePathname()

  // Esconde o menu todo se estiver na página de login
  if (pathname === '/') return null

  return (
    <aside className="w-72 bg-gradient-to-b from-[#07111F] to-[#10233F] text-white p-6 flex flex-col justify-between min-h-screen sticky top-0 shadow-2xl">
      <div>
        {/* Logo (adicione seu ícone/logo aqui) */}
        <div className="mb-6 text-xl font-bold">Conecta IPI</div>

        {/* Items do Menu */}
        <nav className="space-y-2">
          {menu.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/5">
              <item.icon />
              <span>{item.nome}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="pt-6 border-t border-slate-800/50 space-y-2">
        <Link href="/paginaboasvindas" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5">
          <ArrowLeft size={14} /> <span>Voltar ao Início</span>
        </Link>

        {/* Botão de Logout fixo no rodapé */}
        <LogoutButton />
      </div>
    </aside>
  )
}