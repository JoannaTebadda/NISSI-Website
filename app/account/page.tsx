import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import { money } from '@/lib/catalog';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from './sign-out';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams?: { placed?: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="account-page"><Link href="/" className="auth-back"><ArrowLeft size={16}/> Back to NISSI</Link><div className="config-hint">Supabase is not configured yet. Add the project URL and public publishable key to enable accounts.</div></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=%2Faccount');
  const { data: orders, error } = await supabase.from('orders').select('id,order_number,status,payment_method,payment_status,subtotal_ugx,delivery_fee_ugx,total_ugx,created_at,order_items(product_name,variant_name,quantity,unit_price_ugx,line_total_ugx)').order('created_at', { ascending: false });

  return <main className="account-page"><header className="account-header"><div><Link href="/" className="auth-back"><ArrowLeft size={16}/> Back to shop</Link><div className="eyebrow"><span className="dot"/> YOUR NISSI ACCOUNT</div><h1>Your orders.</h1><p>{user.email}</p></div><SignOutButton/></header><section className="orders-list">{searchParams?.placed && <p className="order-success" role="status">Order {searchParams.placed} was placed. We will contact you to confirm delivery details.</p>}<h2>Order history</h2>{error ? <div className="form-message" role="alert">We couldn’t load your orders. Please try again later.</div> : !orders?.length ? <div className="orders-empty"><PackageCheck size={32}/><h3>No orders yet</h3><p>Your orders will appear here after checkout.</p><Link href="/#shop" className="button button-dark">Explore the collection</Link></div> : orders.map(order => <article className="order-card" key={order.id}><div className="order-head"><div><span className="tiny-label">{order.order_number}</span><h3>{new Date(order.created_at).toLocaleDateString('en-UG', { dateStyle: 'medium' })}</h3></div><span className="order-status">{order.status.replaceAll('_',' ')}</span></div><ul>{order.order_items.map((item, index) => <li key={`${order.id}-${index}`}><span>{item.product_name} · {item.variant_name} × {item.quantity}</span><strong>{money(item.line_total_ugx)}</strong></li>)}</ul><div className="order-total"><span>{order.payment_method === 'cash_on_delivery' ? 'Cash on delivery' : 'MTN MoMo sandbox'} · {order.payment_status}</span><strong>{money(order.total_ugx)} + delivery</strong></div></article>)}</section></main>;
}


