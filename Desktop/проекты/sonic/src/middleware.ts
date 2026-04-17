import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(cookie =>
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoginRoute = pathname === '/login'
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/owner')

  // Quick reject: no auth cookie at all → redirect without Supabase call
  if (isProtectedRoute && !hasSupabaseAuthCookie(request)) {
    const loginUrl = new URL('/login', request.url)
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // For non-login, non-protected routes, pass through
  if (!isLoginRoute && !isProtectedRoute) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected route but token is expired/invalid → redirect to login with ?next=
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Login page but already authenticated → redirect to dashboard
  if (isLoginRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile?.role) {
      return NextResponse.redirect(new URL('/dashboard/rooms', request.url))
    }
    const dest = profile.role === 'owner' ? '/owner' : '/dashboard/rooms'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
