import './globals.css'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Cake,
  MessageSquare,
  Settings,
  Home,
  BarChart3,
  Footprints,
  ArrowLeft
} from 'lucide-react'

export const metadata = {
  title: 'CONECTA IPI',
  description: 'CRM ministerial'
}

const menu = [
  { nome: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nome: 'Visão do Pastor', href: "/dashboard/pastor/visao-geral", icon: BarChart3 },
  { nome: 'Trilho de Crescimento', href: "/dashboard/pastor/trilho", icon: Footprints },
  { nome: 'Pessoas', href: '/pessoas', icon: Users },
  { nome: 'Visitantes', href: '/visitantes', icon: UserPlus },
  { nome: 'Campanhas', href: '/campanhas', icon: MessageSquare },
]

function Sidebar() {
  return (
    <aside className="w-72 bg-slate-950 text-white p-6 flex flex-col justify-between min-h-screen sticky top-0">
      <div>
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <Home className="text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">CONECTA IPI</h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm">
            CRM ministerial
          </p>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.nome}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-800 transition text-sm font-medium text-slate-300 hover:text-white"
              >
                <Icon size={20} />
                <span>{item.nome}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Botão de Voltar Lateral Integrado ao Menu */}
      <div className="pt-4 border-t border-slate-800">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Painel</span>
        </Link>
      </div>
    </aside>
  )
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 antialiased">
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