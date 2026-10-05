import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { formatUGX } from './lib/catalog';
import { supabase } from './lib/supabase';

type CheckoutLine = { variant_slug: string; quantity: number };
type CheckoutScreenProps = {
  cartId: string | null;
  items: CheckoutLine[];
  session: Session;
  subtotal: number;
  onBack: () => void;
  onOrderPlaced: () => void;
};

const green = '#44563D';

export function CheckoutScreen({ cartId, items, session, subtotal, onBack, onOrderPlaced }: CheckoutScreenProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<'cash_on_delivery' | 'momo_sandbox'>('cash_on_delivery');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [cartClearWarning, setCartClearWarning] = useState(false);

  async function placeOrder() {
    setError('');
    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '');
    if (!siteUrl) {
      setError('Checkout is not configured. Please contact the NISSI team.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${siteUrl}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          delivery_district: district,
          delivery_city: city,
          delivery_address: address,
          delivery_notes: notes,
          payment_method: payment,
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not place your order. Please try again.');

      let cleared = true;
      if (supabase && cartId) {
        const { error: clearError } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
        cleared = !clearError;
      }
      setCartClearWarning(!cleared);
      setOrderNumber(result.order_number || '');
      onOrderPlaced();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not reach checkout. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (orderNumber) {
    return <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹  Back to your bag</Text></Pressable>
      <View style={styles.successCard}>
        <Text style={styles.kicker}>ORDER RECEIVED</Text>
        <Text style={styles.title}>Thank you.</Text>
        <Text style={styles.body}>Order {orderNumber} was placed. We’ll contact you to confirm delivery details.</Text>
        <Text style={styles.body}>Payment: {payment === 'cash_on_delivery' ? 'Cash on delivery' : 'MTN MoMo sandbox demo — no real payment taken'}.</Text>
        {cartClearWarning ? <Text style={styles.error}>Your order was placed, but we could not clear the bag. Please review it before placing another order.</Text> : null}
        <Pressable onPress={onBack} style={styles.primary}><Text style={styles.primaryText}>Return to your bag</Text></Pressable>
      </View>
    </ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Pressable onPress={onBack}><Text style={styles.back}>‹  Back to your bag</Text></Pressable>
    <Text style={styles.kicker}>DELIVERY ACROSS UGANDA</Text>
    <Text style={styles.title}>Checkout</Text>
    <Text style={styles.body}>Delivery fee will be confirmed after your order. We’ll agree the timing with you.</Text>
    <Text style={styles.label}>Full name</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" style={styles.input} autoCapitalize="words" />
    <Text style={styles.label}>Email address</Text><TextInput value={session.user.email || ''} editable={false} style={[styles.input, styles.readOnly]} />
    <Text style={styles.label}>Phone number</Text><TextInput value={phone} onChangeText={setPhone} placeholder="+256 7XX XXX XXX" style={styles.input} keyboardType="phone-pad" />
    <Text style={styles.label}>District</Text><TextInput value={district} onChangeText={setDistrict} placeholder="e.g. Wakiso" style={styles.input} />
    <Text style={styles.label}>City / town</Text><TextInput value={city} onChangeText={setCity} placeholder="e.g. Entebbe" style={styles.input} />
    <Text style={styles.label}>Delivery address / landmark</Text><TextInput value={address} onChangeText={setAddress} placeholder="Help us find you" style={[styles.input, styles.multiline]} multiline />
    <Text style={styles.label}>Delivery notes (optional)</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Anything else we should know?" style={[styles.input, styles.multiline]} multiline />
    <Text style={styles.label}>How would you like to pay?</Text>
    <Pressable onPress={() => setPayment('cash_on_delivery')} style={[styles.payment, payment === 'cash_on_delivery' && styles.paymentSelected]}><View style={styles.radio}>{payment === 'cash_on_delivery' && <View style={styles.radioDot}/>}</View><View><Text style={styles.paymentTitle}>Cash on delivery</Text><Text style={styles.body}>Pay when your order arrives.</Text></View></Pressable>
    <Pressable onPress={() => setPayment('momo_sandbox')} style={[styles.payment, payment === 'momo_sandbox' && styles.paymentSelected]}><View style={styles.radio}>{payment === 'momo_sandbox' && <View style={styles.radioDot}/>}</View><View><Text style={styles.paymentTitle}>MTN MoMo · Sandbox demo</Text><Text style={styles.body}>Simulated only. No real payment will be taken.</Text></View></Pressable>
    <View style={styles.total}><Text style={styles.paymentTitle}>Subtotal</Text><Text style={styles.totalValue}>{formatUGX(subtotal)}</Text><Text style={styles.body}>Delivery fee confirmed after order.</Text><Text style={styles.totalValue}>Due {payment === 'cash_on_delivery' ? 'on delivery' : 'when confirmed'}: {formatUGX(subtotal)} + delivery</Text></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable disabled={busy || !name.trim() || !phone.trim() || !district.trim() || !city.trim() || !address.trim() || items.length === 0} onPress={placeOrder} style={[styles.primary, (busy || !name.trim() || !phone.trim() || !district.trim() || !city.trim() || !address.trim() || items.length === 0) && styles.disabled]}>
      {busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>Place order</Text>}
    </Pressable>
    <Text style={styles.fine}>By placing your order, you agree to be contacted to confirm delivery details.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingBottom: 40 }, back: { color: green, fontWeight: '600', marginBottom: 24, fontSize: 13 }, kicker: { color: green, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginTop: 6 }, title: { color: '#22271e', fontSize: 30, fontWeight: '600', marginTop: 8 }, body: { color: '#77776c', fontSize: 12, lineHeight: 18, marginTop: 5, flexShrink: 1 }, label: { color: '#56584e', fontSize: 12, marginTop: 16, marginBottom: 6 }, input: { minHeight: 46, borderWidth: 1, borderColor: '#dedbd2', backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 12, color: '#22271e', fontSize: 14 }, readOnly: { color: '#77776c', backgroundColor: '#f0efe9' }, multiline: { minHeight: 76, textAlignVertical: 'top', paddingTop: 11 }, payment: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#dedbd2', borderRadius: 5, backgroundColor: '#fff', marginTop: 9 }, paymentSelected: { borderColor: green, backgroundColor: '#f0f3ed' }, radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: green, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: green }, paymentTitle: { color: '#22271e', fontSize: 13, fontWeight: '600' }, total: { marginTop: 20, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9e6dd', gap: 5 }, totalValue: { color: '#22271e', fontWeight: '700', fontSize: 14, marginTop: 5 }, primary: { minHeight: 49, marginTop: 19, backgroundColor: green, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 16 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '600' }, disabled: { opacity: 0.48 }, fine: { color: '#77776c', fontSize: 10, lineHeight: 16, marginTop: 12, textAlign: 'center' }, error: { color: '#a33e31', fontSize: 12, lineHeight: 18, marginTop: 13 }, successCard: { padding: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9e6dd', marginTop: 10 },
});
