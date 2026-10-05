import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { products as fallbackProducts, formatUGX, type Product } from './lib/catalog';
import { supabase } from './lib/supabase';
import { CheckoutScreen } from './CheckoutScreen';

WebBrowser.maybeCompleteAuthSession();
type CartLine = { variant_slug: string; quantity: number };
const green = '#44563D';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [tab, setTab] = useState<'shop' | 'bag'>('shop');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Connecting to your NISSI bag…');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const client = supabase;
    if (!client) { setAuthReady(true); return; }
    client.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from('products').select('slug,name,category,description,product_variants(slug,name,unit_price_ugx,is_active)').eq('is_active', true).then(({ data, error }) => {
      if (error || !data || !active) return;
      const fromDatabase = data.flatMap(row => {
        const fallback = fallbackProducts.find(product => product.slug === row.slug);
        const dbVariants = (row.product_variants || []).filter(option => option.is_active).map(option => ({ slug: option.slug, name: option.name, price: option.unit_price_ugx }));
        return fallback && dbVariants.length ? [{ ...fallback, name: row.name, category: row.category, description: row.description, variants: dbVariants }] : [];
      });
      if (active && fromDatabase.length) setCatalog(fromDatabase);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !session?.user.id) { setCartId(null); setCart([]); return; }
    let active = true;
    let id: string | null = null;
    let channel: ReturnType<typeof client.channel> | null = null;
    const loadCart = async () => {
      const { data: row, error: createError } = await client.from('carts').upsert({ user_id: session.user.id }, { onConflict: 'user_id' }).select('id').single();
      if (createError) throw createError;
      id = row.id;
      if (active) setCartId(row.id);
      channel = client.channel(`mobile-cart-${row.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `cart_id=eq.${row.id}` }, async () => {
        const { data } = await client.from('cart_items').select('variant_slug,quantity').eq('cart_id', row.id);
        if (active && data) { setCart(data); setSyncStatus('Live sync is on'); }
      }).subscribe(status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') setSyncStatus('Live sync is on');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncStatus('Live sync is unavailable. Check the Supabase setup.');
      });
      const { data, error } = await client.from('cart_items').select('variant_slug,quantity').eq('cart_id', row.id);
      if (error) throw error;
      if (active) setCart(data || []);
    };
    void loadCart().catch(() => active && setSyncStatus('Cart setup needed. Run supabase/cart_sync.sql in your Supabase SQL Editor.'));
    return () => { active = false; if (channel) void client.removeChannel(channel); };
  }, [session?.user.id]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = useMemo(() => cart.reduce((sum, line) => {
    const variant = catalog.flatMap(product => product.variants).find(item => item.slug === line.variant_slug);
    return sum + (variant?.price || 0) * line.quantity;
  }, 0), [cart, catalog]);

  async function signIn() {
    if (!supabase) return;
    setBusy(true); setAuthError('');
    try {
      const { error } = createAccount
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (createAccount) Alert.alert('Check your email', 'Confirm your NISSI account using the link we sent you.');
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy(true); setAuthError('');
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error) throw error;
      if (!data.url) throw new Error('Google sign-in could not be started.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const callback = Linking.parse(result.url);
        const code = typeof callback.queryParams?.code === 'string' ? callback.queryParams.code : null;
        if (!code) throw new Error('Google sign-in did not return a session code.');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }

  async function changeQuantity(variantSlug: string, delta: number) {
    if (!supabase || !cartId) return;
    const current = cart.find(line => line.variant_slug === variantSlug)?.quantity || 0;
    const next = current + delta;
    if (next > 100) return;
    setSyncStatus('Saving your bag…');
    const result = next <= 0
      ? await supabase.from('cart_items').delete().eq('cart_id', cartId).eq('variant_slug', variantSlug)
      : await supabase.from('cart_items').upsert({ cart_id: cartId, variant_slug: variantSlug, quantity: next }, { onConflict: 'cart_id,variant_slug' });
    if (result.error) { setSyncStatus('Could not save your bag. Check your connection.'); return; }
    const updated = next <= 0 ? cart.filter(line => line.variant_slug !== variantSlug) : [...cart.filter(line => line.variant_slug !== variantSlug), { variant_slug: variantSlug, quantity: next }];
    setCart(updated); setSyncStatus('Live sync is on');
  }

  if (!authReady) return <SafeAreaView style={styles.loading}><ActivityIndicator color={green}/><Text style={styles.muted}>Opening NISSI…</Text></SafeAreaView>;
  if (!supabase) return <SafeAreaView style={styles.loading}><Text style={styles.brand}>nissi<Text style={styles.brandDot}>.</Text></Text><Text style={styles.copy}>Add the Supabase URL and publishable key to mobile/.env before opening the app.</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark"/>
    <View style={styles.header}><View><Text style={styles.brand}>nissi<Text style={styles.brandDot}>.</Text></Text><Text style={styles.tagline}>GOOD ENERGY FOR GOOD LIVING</Text></View>{session?<Pressable onPress={() => supabase!.auth.signOut()}><Text style={styles.link}>Sign out</Text></Pressable>:<Text style={styles.badge}>UGANDA · UGX</Text>}</View>
    {!session ? <KeyboardAvoidingView style={styles.authWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.authCard} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>YOUR NISSI ACCOUNT</Text><Text style={styles.title}>{createAccount ? 'Join NISSI.' : 'Welcome back.'}</Text><Text style={styles.copy}>Sign in with the same account you use on the NISSI website. Your bag will follow you between devices.</Text><Text style={styles.label}>Email address</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#929187" style={styles.input}/><Text style={styles.label}>Password</Text><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#929187" style={styles.input}/>{authError ? <Text style={styles.error}>{authError}</Text> : null}<Pressable disabled={busy || !email || !password} onPress={signIn} style={[styles.primary, (busy || !email || !password) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>{createAccount ? 'Create account' : 'Sign in'}</Text>}</Pressable><View style={styles.or}><View style={styles.rule}/><Text style={styles.muted}>OR CONTINUE WITH</Text><View style={styles.rule}/></View><Pressable disabled={busy} onPress={signInWithGoogle} style={styles.secondary}><Text style={styles.secondaryText}>Continue with Google</Text></Pressable><Text style={styles.switchText}>{createAccount ? 'Already have an account?' : 'New to NISSI?'} <Text onPress={() => { setCreateAccount(!createAccount); setAuthError(''); }} style={styles.link}>{createAccount ? 'Sign in' : 'Create an account'}</Text></Text></ScrollView></KeyboardAvoidingView> : <>
      <View style={styles.welcome}><Text style={styles.kicker}>MADE WITH CARE IN UGANDA</Text><Text style={styles.title}>Good energy for{ '\n' }<Text style={styles.italic}>good living.</Text></Text><Text style={styles.copy}>Thoughtful clean-cooking fuels and stoves, made for the way we live and cook.</Text></View>
      {checkoutOpen && session ? <CheckoutScreen cartId={cartId} items={cart} session={session} subtotal={subtotal} onBack={() => setCheckoutOpen(false)} onOrderPlaced={() => setCart([])} /> : tab === 'shop' ? <FlatList data={catalog} keyExtractor={item => item.slug} contentContainerStyle={styles.productList} ListHeaderComponent={<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>The NISSI collection</Text><Text style={styles.muted}>Choose a product and add it to your shared bag.</Text></View>} renderItem={({ item }) => {
        const variant = item.variants.find(v => v.slug === selected[item.slug]) || item.variants[0];
        const quantity = cart.find(line => line.variant_slug === variant.slug)?.quantity || 0;
        return <View style={styles.productCard}><Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover"/><View style={styles.productBody}><Text style={styles.category}>{item.category.toUpperCase()}</Text><Text style={styles.productName}>{item.name}</Text><Text style={styles.muted}>{item.description}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variants}>{item.variants.map(option => <Pressable key={option.slug} onPress={() => setSelected(prev => ({ ...prev, [item.slug]: option.slug }))} style={[styles.variantChip, option.slug === variant.slug && styles.variantSelected]}><Text style={[styles.variantText, option.slug === variant.slug && styles.variantTextSelected]}>{option.name}</Text></Pressable>)}</ScrollView><View style={styles.productFooter}><Text style={styles.price}>{formatUGX(variant.price)}</Text><Pressable onPress={() => changeQuantity(variant.slug, 1)} style={styles.addButton}><Text style={styles.addText}>{quantity ? `Add more · ${quantity} in bag` : 'Add to bag  +'}</Text></Pressable></View></View></View>;
      }}/>:<ScrollView contentContainerStyle={styles.bagList}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your bag ({itemCount})</Text><Text style={styles.muted}>{syncStatus}</Text></View>{cart.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your bag is waiting.</Text><Text style={styles.copy}>Add something from the collection and it will appear here on the website too.</Text></View> : cart.map(line => {
        const product = catalog.find(item => item.variants.some(v => v.slug === line.variant_slug));
        const variant = product?.variants.find(v => v.slug === line.variant_slug);
        if (!product || !variant) return null;
        return <View key={line.variant_slug} style={styles.cartLine}><Image source={{ uri: product.image }} style={styles.cartImage}/><View style={styles.cartInfo}><Text style={styles.productName}>{product.name}</Text><Text style={styles.muted}>{variant.name} · {formatUGX(variant.price)}</Text><View style={styles.quantity}><Pressable onPress={() => changeQuantity(variant.slug, -1)} style={styles.quantityButton}><Text>−</Text></Pressable><Text style={styles.quantityValue}>{line.quantity}</Text><Pressable onPress={() => changeQuantity(variant.slug, 1)} style={styles.quantityButton}><Text>+</Text></Pressable></View></View><Text style={styles.price}>{formatUGX(variant.price * line.quantity)}</Text></View>;
      })}{cart.length > 0 && <View style={styles.total}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.sectionTitle}>{formatUGX(subtotal)}</Text><Text style={styles.muted}>Delivery fee confirmed after your order.</Text><Pressable onPress={() => setCheckoutOpen(true)} style={{ marginTop: 16, backgroundColor: green, borderRadius: 4, padding: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Continue to checkout</Text></Pressable></View>}</ScrollView>}
      {!checkoutOpen && (<View style={styles.bottomTabs}><Pressable onPress={() => setTab('shop')} style={styles.tab}><Text style={[styles.tabText, tab === 'shop' && styles.tabActive]}>Shop</Text></Pressable><Pressable onPress={() => setTab('bag')} style={styles.tab}><Text style={[styles.tabText, tab === 'bag' && styles.tabActive]}>Bag{itemCount ? ` · ${itemCount}` : ''}</Text></Pressable></View>)}
    </>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f7f2' }, loading: { flex: 1, backgroundColor: '#f8f7f2', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e2d8' }, brand: { color: '#22271e', fontSize: 29, fontWeight: '700', letterSpacing: -1.5 }, brandDot: { color: green }, tagline: { fontSize: 8, letterSpacing: 1.3, color: '#77776c', marginTop: 1 }, badge: { fontSize: 9, letterSpacing: 1, color: green }, link: { color: green, fontWeight: '600', textDecorationLine: 'underline' }, welcome: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 15 }, kicker: { color: green, fontSize: 9, letterSpacing: 1.8, fontWeight: '700' }, title: { color: '#22271e', fontSize: 31, lineHeight: 36, letterSpacing: -1, fontWeight: '600', marginTop: 10 }, italic: { fontStyle: 'italic', color: green }, copy: { color: '#77776c', fontSize: 13, lineHeight: 20, marginTop: 9 }, sectionHeader: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 17 }, sectionTitle: { fontSize: 20, color: '#22271e', fontWeight: '600', letterSpacing: -0.5 }, muted: { color: '#77776c', fontSize: 11, lineHeight: 17, marginTop: 4 }, productList: { paddingBottom: 26 }, productCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e9e6dd', borderRadius: 8, overflow: 'hidden' }, productImage: { width: '100%', height: 176, backgroundColor: '#ecebe4' }, productBody: { padding: 14 }, category: { color: green, letterSpacing: 1, fontSize: 8, fontWeight: '700' }, productName: { color: '#22271e', fontSize: 16, fontWeight: '600', marginTop: 5 }, variants: { flexGrow: 0, marginTop: 13 }, variantChip: { paddingHorizontal: 10, paddingVertical: 7, borderColor: '#e1ded5', borderWidth: 1, borderRadius: 18, marginRight: 7 }, variantSelected: { backgroundColor: '#eaf0e6', borderColor: green }, variantText: { fontSize: 10, color: '#66665e' }, variantTextSelected: { color: green, fontWeight: '600' }, productFooter: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, price: { color: '#22271e', fontSize: 12, fontWeight: '700' }, addButton: { backgroundColor: green, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10 }, addText: { color: '#fff', fontSize: 10, fontWeight: '600' }, bottomTabs: { flexDirection: 'row', paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 18 : 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e2d8' }, tab: { flex: 1, alignItems: 'center', padding: 8 }, tabText: { color: '#77776c', fontSize: 12, fontWeight: '500' }, tabActive: { color: green, fontWeight: '700' }, bagList: { paddingBottom: 35 }, empty: { marginHorizontal: 18, marginTop: 20, padding: 25, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9e6dd', borderRadius: 8 }, emptyTitle: { color: '#22271e', fontSize: 18, fontWeight: '600' }, cartLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e2d8', gap: 10 }, cartImage: { width: 56, height: 56, borderRadius: 5, backgroundColor: '#ecebe4' }, cartInfo: { flex: 1 }, quantity: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 13 }, quantityButton: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#dcd9cf', alignItems: 'center', justifyContent: 'center' }, quantityValue: { color: '#22271e', fontWeight: '600' }, total: { padding: 22, gap: 9 }, totalLabel: { color: '#77776c', fontSize: 12 }, authWrap: { flex: 1 }, authCard: { paddingHorizontal: 25, paddingTop: 38, paddingBottom: 55, flexGrow: 1, justifyContent: 'center' }, label: { color: '#56584e', fontSize: 11, marginTop: 17, marginBottom: 7 }, input: { minHeight: 48, borderWidth: 1, borderColor: '#dedbd2', backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 12, color: '#22271e' }, primary: { minHeight: 48, marginTop: 20, backgroundColor: green, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, disabled: { opacity: 0.5 }, primaryText: { color: '#fff', fontSize: 12, fontWeight: '600' }, or: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 20 }, rule: { height: 1, flex: 1, backgroundColor: '#e5e2d8' }, switchText: { textAlign: 'center', color: '#77776c', fontSize: 11, marginTop: 20 }, secondary: { minHeight: 45, borderWidth: 1, borderColor: '#dedbd2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, secondaryText: { color: '#22271e', fontSize: 12, fontWeight: '500' }, error: { color: '#a33e31', fontSize: 11, marginTop: 10 },
});
