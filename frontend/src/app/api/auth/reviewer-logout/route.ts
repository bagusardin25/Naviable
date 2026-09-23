import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { clearReviewerSessionCookies, reviewerAuthClient, REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  // A password login's session lives only in these cookies, so revoke it server-side too;
  // otherwise its week-long refresh token would outlive the logout. Google logins have no
  // refresh cookie and are left alone: their session belongs to the browser client.
  if (accessToken && refreshToken) {
    try {
      const client = reviewerAuthClient();
      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      await client.auth.signOut({ scope: 'local' });
    } catch {
      // Clearing the cookies below still ends the session in this browser.
    }
  }
  const response = NextResponse.json({ success: true, message: 'Sesi reviewer telah diakhiri' });
  clearReviewerSessionCookies(response);
  return response;
}
