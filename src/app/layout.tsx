'use client'
declare module '*.css'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  Footprints,
  ArrowLeft,
  Compass,
  Radio,
  CupSoda
} from 'lucide-react'

// Ícone Customizado: Direcional, Agressivo e alinhado com a Missão
function OrigamiPlaneIcon({ size = 22, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}

const menu = [
  { nome: 'Novos Pousos', href: '/visitantes', icon: UserPlus },
  { nome: 'Jornada de Integração', href: "/dashboard/pastor/trilho", icon: Footprints },
  { nome: 'Painel Estratégico', href: "/dashboard/pastor/visao-geral", icon: Compass },
  { nome: 'Comunidade', href: '/pessoas', icon: Users },
  { nome: 'Comunicação', href: '/campanhas', icon: Radio },
  { nome: 'Café convites', href: '/dashboard/cafe-convites', icon: CupSoda }
]

function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-gradient-to-b from-[#07111F] to-[#10233F] text-white p-6 flex flex-col justify-between min-h-screen sticky top-0 shadow-2xl">
      <div>
        {/* Identidade Visual */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-3 rounded-2xl shadow-lg">
              <OrigamiPlaneIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">IPI CASCAVEL</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Plataforma Ministerial</p>
            </div>
          </div>
          
          {/* Selo Institucional de Jornada */}
          <div className="flex flex-wrap gap-1.5">
            {['Chegada', 'Integração', 'Discipulado', 'Comunhão', 'Envio'].map(item => (
              <span key={item} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium uppercase">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Navegação */}
        <nav className="space-y-1.5">
          {menu.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            
            return (
              <Link
                key={item.nome}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition border ${
                  active 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-blue-400/30 shadow-lg' 
                    : 'text-slate-300 hover:bg-blue-600/10 hover:border-blue-500/20 border-transparent'
                }`}
              >
                <Icon size={20} className={active ? 'text-white' : 'group-hover:text-cyan-400 transition'} />
                <span className="text-sm font-medium">{item.nome}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Rodapé Operacional */}
      <div className="pt-6 border-t border-slate-800/50">
        <Link 
         href="/dashboard/pastor/visao-geral"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#07111F] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition text-[10px] font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          <span>Voltar ao Centro de Operações</span>
        </Link>
      </div>
    </aside>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-cyan-50/30 min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}