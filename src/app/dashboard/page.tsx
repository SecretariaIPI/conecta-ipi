'use client'

import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col justify-center items-center p-8 animate-in fade-in duration-700">
      <div className="max-w-xl w-full text-center space-y-10">
        
        {/* Identidade Central */}
        <div className="space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl shadow-2xl shadow-blue-500/20 flex items-center justify-center mx-auto">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">IPI CASCAVEL</h1>
            <p className="text-sm text-slate-500 uppercase tracking-[0.2em] mt-2 font-bold">Plataforma Ministerial</p>
          </div>
        </div>

        {/* Mensagem de Boas-Vindas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/50">
          <h2 className="text-2xl font-black text-slate-900 mb-4">Bem-vindo, Pastor.</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            O sistema está operando. Nossa missão é garantir que cada novo pouso receba a direção necessária para crescer em Palavra, Poder e Provisão.
          </p>

          <Link 
            href="/dashboard/pastor/visao-geral" 
            className="inline-flex items-center gap-2 bg-[#07111F] text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg hover:shadow-blue-500/20"
          >
            Acessar Centro de Operações
          </Link>
        </div>

        {/* Rodapé Inspiracional */}
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Revelando Cristo — A jornada continua.
        </p>
      </div>
    </div>
  )
}