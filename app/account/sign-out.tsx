'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    window.location.assign('/');
  }
  return <button className="button button-outline" onClick={signOut} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>;
}
