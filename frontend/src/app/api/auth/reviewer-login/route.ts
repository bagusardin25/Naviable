import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const expectedUsername = (process.env.REVIEWER_USERNAME || 'reviewer.naviable').toLowerCase();

    // Only allow reviewer account username
    if (
      trimmedUsername !== expectedUsername &&
      trimmedUsername !== 'reviewer.naviable' &&
      trimmedUsername !== 'reviewer@naviable.org'
    ) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    let isAuthenticated = false;

    // 1. If Supabase is configured with keys, authenticate against Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const reviewerEmail = process.env.REVIEWER_EMAIL || 'reviewer@naviable.org';
        const { data, error } = await supabase.auth.signInWithPassword({
          email: reviewerEmail,
          password,
        });
        if (!error && data.user) {
          const role = (data.user.app_metadata?.role || data.user.user_metadata?.role || 'REVIEWER') as string;
          if (role.toUpperCase() === 'REVIEWER') {
            isAuthenticated = true;
          }
        }
      } catch {
        // Fall back to server environment credential check
      }
    }

    // 2. Server-side environment / secure credential verification
    if (!isAuthenticated) {
      const serverPassword = process.env.REVIEWER_PASSWORD;
      if (serverPassword) {
        if (password === serverPassword) isAuthenticated = true;
      } else {
        // Standard evaluation defaults
        if (password === 'reviewerNaviable2026!' || password === 'naviable2026!') {
          isAuthenticated = true;
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    // Generate signed HTTP-only session token
    const token = await createSessionToken({
      username: 'reviewer.naviable',
      role: 'REVIEWER',
    });

    const response = NextResponse.json({
      success: true,
      role: 'REVIEWER',
      username: 'reviewer.naviable',
      redirect: '/reviewer',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Reviewer login error:', error);
    return NextResponse.json(
      { error: 'Username atau password tidak sesuai.' },
      { status: 500 }
    );
  }
}
