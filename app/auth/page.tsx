'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Leaf } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function AuthPage() {
  const [next, setNext] = useState('/account');
  const [oauthError, setOauthError] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('next') || '/account';
    setNext(requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account');
    setOauthError(params.get('error') === 'oauth');
  }, []);
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage('Authentication is not configured yet. Add the Supabase URL and public publishable key to the environment.'); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const result = mode === 'sign_in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === 'sign_up' && !result.data.session) { setMessage('Check your email to confirm your account, then sign in.'); return; }
    window.location.assign(next);
  }

  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage('Authentication is not configured yet. Add the Supabase URL and public publishable key to the environment.'); return; }
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) { setBusy(false); setMessage(error.message); }
  }

  return <main className="auth-page"><Link href="/" className="auth-back"><ArrowLeft size={16}/> Back to NISSI</Link><section className="auth-card"><span className="auth-mark"><Leaf size={20}/></span><div className="eyebrow"><span className="dot"/> YOUR NISSI ACCOUNT</div><h1>{mode === 'sign_in' ? 'Welcome back.' : 'Join NISSI.'}</h1><p>Sign in to place an order and keep track of your purchases.</p>{oauthError && <div className="form-message" role="alert">Google sign-in could not be completed. Please try again.</div>}
    <form className="auth-form" onSubmit={submit}><label>Email address<input type="email" name="email" autoComplete="email" required/></label><label>Password<input type="password" name="password" autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} minLength={8} required/></label><button className="button button-dark full-button" disabled={busy || !configured}>{busy ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}</button></form>
    <div className="auth-divider"><span>or continue with</span></div><button className="button button-outline full-button" onClick={signInWithGoogle} disabled={busy || !configured}>Continue with Google</button>{!configured && <p className="config-hint">Supabase credentials are not configured. Add them to enable account sign-in.</p>}{message && <div className="form-message" role="status">{message}</div>}
    <p className="auth-switch">{mode === 'sign_in' ? 'New to NISSI?' : 'Already have an account?'} <button onClick={() => { setMessage(''); setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in'); }}>{mode === 'sign_in' ? 'Create an account' : 'Sign in'}</button></p></section></main>;
}



