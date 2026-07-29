import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface AdminSessionPayload {
  volunteerId: string;
  name: string;
}

// Ensure the environment variable is loaded
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is missing');
  return new TextEncoder().encode(secret);
};

export async function createAdminSession(payload: AdminSessionPayload) {
  const secret = getSecret();
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60, // 12 hours
    path: '/',
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function requireAdminAuth(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login'); // Redirect to login
  }
  return session;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set('admin_session', '', { maxAge: 0, path: '/' });
}
