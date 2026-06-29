import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/update-password')) {
  return response
}
  // 1. Permite acesso público à rota de callback de autenticação (se houver)
  if (pathname.startsWith('/auth/callback')) {
    return response
  }

  // 2. Se NÃO está logado e NÃO está na página inicial (login), força ida para o login
  if (!user && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 3. Se JÁ está logado e tenta acessar o login, manda para o início (boas-vindas)
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/paginaboasvindas', request.url))
  }

  return response

}

export const config = {
  matcher: [
    /*
     * Aplica o middleware apenas em rotas que precisam de proteção.
     * Exclui arquivos estáticos, imagens e APIs de sistema.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}