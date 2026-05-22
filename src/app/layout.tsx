import '../globals.css'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Cake,
  MessageSquare,
  Settings,
  Home,
  BarChart3
} from 'lucide-react'

export const metadata = {
  title: 'CONECTA IPI',
  description: 'CRM ministerial'
}

const menu = [
  { nome: 'Dashboard', href: '/', icon: LayoutDashboard },
  { nome: 'Visão do Pastor', href: '/dashboard/pastor', icon: BarChart3 },
  { nome: 'Pessoas', href: '/pessoas', icon: Users },
  { nome: 'Visitantes', href: '/visitantes', icon: UserPlus },
  { nome: 'Aniversários', href: '/aniversarios', icon: Cake },
  { nome: 'Campanhas', href: '/campanhas', icon: MessageSquare },
  { nome: 'Configurações', href: '/configuracoes', icon: Settings }
]

function Sidebar() {
  return (
    <aside className="w-72 bg-slate-950 text-white p-6">
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <Home />
          <h1 className="text-2xl font-bold">CONECTA IPI</h1>
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
              className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-800 transition"
            >
              <Icon size={20} />
              <span>{item.nome}</span>
            </Link>
          )
        })}
      </nav>
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
      <body className="bg-slate-100">
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