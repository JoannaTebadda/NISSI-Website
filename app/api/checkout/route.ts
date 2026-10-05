import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type CheckoutItem = { variant_slug: string; quantity: number };
type CheckoutBody = {
  customer_name?: unknown;
  customer_phone?: unknown;
  delivery_district?: unknown;
  delivery_city?: unknown;
  delivery_address?: unknown;
  delivery_notes?: unknown;
  payment_method?: unknown;
  items?: unknown;
};
const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  if (!sessionClient) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  let body: CheckoutBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Please check the checkout details and try again.' }, { status: 400 }); }
  const name = cleanText(body.customer_name, 120);
  const phone = cleanText(body.customer_phone, 40);
  const district = cleanText(body.delivery_district, 100);
  const city = cleanText(body.delivery_city, 100);
  const address = cleanText(body.delivery_address, 500);
  const notes = cleanText(body.delivery_notes, 500);
  const method = body.payment_method;
  if (!name || !phone || !district || !city || !address) return NextResponse.json({ error: 'Complete all required delivery details.' }, { status: 400 });
  if (method !== 'cash_on_delivery' && method !== 'momo_sandbox') return NextResponse.json({ error: 'Select a supported payment method.' }, { status: 400 });
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return NextResponse.json({ error: 'Your cart is empty or too large.' }, { status: 400 });

  const quantities = new Map<string, number>();
  for (const raw of body.items as CheckoutItem[]) {
    const slug = cleanText(raw?.variant_slug, 80);
    const quantity = Number(raw?.quantity);
    if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return NextResponse.json({ error: 'One or more cart quantities are invalid.' }, { status: 400 });
    quantities.set(slug, (quantities.get(slug) || 0) + quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 100)) return NextResponse.json({ error: 'A cart quantity is over the limit.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceRoleKey) return NextResponse.json({ error: 'Secure checkout is not configured yet.' }, { status: 503 });
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: orderData, error: orderError } = await admin.rpc('create_order', {
    p_user_id: user.id,
    p_customer_name: name,
    p_customer_email: user.email,
    p_customer_phone: phone,
    p_delivery_district: district,
    p_delivery_city: city,
    p_delivery_address: address,
    p_delivery_notes: notes,
    p_payment_method: method,
    p_items: [...quantities].map(([variant_slug, quantity]) => ({ variant_slug, quantity })),
  }).single();
  const order = orderData as unknown as { id: string; order_number: string; payment_status: string; total_ugx: number } | null;
  if (orderError || !order) {
    const unavailable = orderError?.message?.toLowerCase().includes('unavailable');
    return NextResponse.json({ error: unavailable ? 'An item is unavailable in that quantity. Please review your cart.' : 'We could not place your order. Please try again.' }, { status: unavailable ? 409 : 500 });
  }

  // The order is already committed. Email errors are recorded but never undo the order.
  let emailStatus: 'sent' | 'failed' | 'not_configured' = 'not_configured';
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL;
  const { data: items } = await admin.from('order_items').select('product_name,variant_name,quantity,unit_price_ugx,line_total_ugx').eq('order_id', order.id);
  if (apiKey && domain && from) {
    try {
      const form = new URLSearchParams();
      form.set('from', from);
      form.set('to', user.email);
      form.set('subject', `NISSI order ${order.order_number} received`);
      const summary = (items || []).map(item => `${item.product_name} — ${item.variant_name} × ${item.quantity}: UGX ${new Intl.NumberFormat('en-UG').format(item.line_total_ugx)}`).join('\n');
      form.set('text', `Thank you for ordering from NISSI.\n\nOrder: ${order.order_number}\n\n${summary}\n\nTotal: UGX ${new Intl.NumberFormat('en-UG').format(order.total_ugx)} plus delivery (fee confirmed after order)\nPayment: ${method === 'cash_on_delivery' ? 'Cash on delivery' : 'MTN MoMo sandbox demo — pending, no real payment taken'}\nDelivery: ${district}, ${city}\nAddress: ${address}\n\nWe will contact you to confirm delivery details.`);
      const result = await fetch(`https://api.mailgun.net/v3/${encodeURIComponent(domain)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      emailStatus = result.ok ? 'sent' : 'failed';
    } catch { emailStatus = 'failed'; }
  }
  await admin.from('orders').update({ email_status: emailStatus }).eq('id', order.id);
  return NextResponse.json({ order_number: order.order_number, payment_status: order.payment_status, email_status: emailStatus }, { status: 201 });
}

