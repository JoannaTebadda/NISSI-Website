'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Flame, Leaf, Menu, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { money, products, variants, type Product } from '@/lib/catalog';

type CartLine = { variantId: string; quantity: number };
const categories = ['All products', 'Briquettes', 'Pellets', 'Stoves', 'Accessories'];

export default function Home() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState('All products');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string,string>>({});
  const [added, setAdded] = useState<string | null>(null);
  const [payment, setPayment] = useState('cash_on_delivery');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => { try { const raw = localStorage.getItem('nissi-cart'); if (raw) setCart(JSON.parse(raw)); } catch { /* Start with an empty cart if stored data is invalid. */ } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem('nissi-cart', JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get('checkout') === '1') { setCheckoutOpen(true); window.history.replaceState({}, '', window.location.pathname); } }, []);

  const lines = useMemo(() => cart.flatMap(line => { const match = variants.find(v => v.id === line.variantId); return match ? [{ ...match, quantity: line.quantity }] : []; }), [cart]);
  const count = lines.reduce((n,line) => n + line.quantity,0);
  const subtotal = lines.reduce((n,line) => n + line.price * line.quantity,0);
  const shown = category === 'All products' ? products : products.filter(product => product.category === category);

  function add(product: Product) {
    const variantId = selected[product.slug] || product.variants[0].id;
    setCart(prev => { const current = prev.find(line => line.variantId === variantId); if (current) return prev.map(line => line.variantId === variantId ? { ...line, quantity: Math.min(100, line.quantity + 1) } : line); return [...prev, { variantId, quantity: 1 }]; });
    setAdded(product.slug); window.setTimeout(() => setAdded(null), 1300);
  }
  function setQuantity(id: string, quantity: number) { setCart(prev => quantity < 1 ? prev.filter(line => line.variantId !== id) : prev.map(line => line.variantId === id ? { ...line, quantity: Math.min(100, quantity) } : line)); }
  async function beginCheckout() {
    setCartOpen(false);
    const supabase = (await import('@/lib/supabase/browser')).createSupabaseBrowserClient();
    if (!supabase) { setCheckoutError('Connect Supabase to enable customer accounts and secure checkout.'); setCheckoutOpen(true); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign('/auth?next=%2F%3Fcheckout%3D1'); return; }
    setCheckoutError('');
    setCheckoutOpen(true);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: value('name'), customer_phone: value('phone'), delivery_district: value('district'), delivery_city: value('city'), delivery_address: value('address'), delivery_notes: value('notes'), payment_method: payment, items: lines.map(line => ({ variant_slug: line.id, quantity: line.quantity })) }),
      });
      const result = await response.json();
      if (response.status === 401) { window.location.assign('/auth?next=%2F%3Fcheckout%3D1'); return; }
      if (!response.ok) { setCheckoutError(result.error || 'We could not place your order. Please try again.'); return; }
      setCart([]);
      setCheckoutOpen(false);
      window.location.assign(`/account?placed=${encodeURIComponent(result.order_number)}`);
    } catch {
      setCheckoutError('We could not reach the secure checkout. Please check your connection and try again.');
    } finally { setSubmitting(false); }
  }

  return <main>
    <div className="announcement"><span>Made with care in Uganda</span><span className="announcement-right">Clean energy for every kitchen <ArrowRight size={13}/></span></div>
    <header className="nav"><a className="wordmark" href="#home" aria-label="NISSI home">nissi<span>.</span></a><nav className={menuOpen?'nav-links nav-open':'nav-links'}><a href="#shop" onClick={()=>setMenuOpen(false)}>Shop</a><a href="#story" onClick={()=>setMenuOpen(false)}>Our story</a><a href="#impact" onClick={()=>setMenuOpen(false)}>Our impact</a></nav><div className="nav-actions"><a href="/account" className="account-link">Account <ArrowUpRight size={14}/></a><button className="bag-button" onClick={()=>setCartOpen(true)} aria-label={`Open bag, ${count} items`}><ShoppingBag size={18}/><span>Bag</span><b>{count}</b></button><button className="menu-button" aria-label="Toggle menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></div></header>

    <section className="hero" id="home"><div className="hero-copy"><div className="eyebrow"><span className="dot"/> BETTER ENERGY, ROOTED HERE</div><h1>Good energy<br/>for <em>good living.</em></h1><p>Thoughtful clean-cooking fuels and stoves, made in Uganda for the way we live and cook.</p><div className="hero-actions"><a href="#shop" className="button button-dark">Shop the collection <ArrowRight size={16}/></a><a href="#story" className="text-link">Get to know us <ArrowDown size={14}/></a></div><div className="hero-proof"><div className="proof-icon"><Leaf size={17}/></div><span>Locally made, consciously chosen</span><span className="proof-divider"/> <span>For every kind of kitchen</span></div></div>
      <div className="hero-art" aria-label="Illustration of clean cooking fuel"><div className="art-sun"/><div className="art-caption"><span>01 / EVERYDAY ESSENTIALS</span><span>Designed around the way we cook.</span></div><div className="hero-scene"><div className="scene-glow"/><div className="plant plant-one">⌁</div><div className="plant plant-two">⌁</div><div className="hero-bag"><div className="bag-top"/><div className="bag-mark">n<span>.</span></div><div className="bag-copy">CLEAN COOKING<br/>FUEL · MADE IN UGANDA</div><div className="bag-weight">10 <small>KG</small></div></div><div className="briq briq-one"/><div className="briq briq-two"/><div className="briq briq-three"/><div className="art-note"><Flame size={15}/> A lighter footprint, a fuller life.</div></div><span className="hero-index">N° 001 &nbsp; / &nbsp; KAMPALA, UG</span></div>
      <div className="hero-bottom"><span>GOOD FOR HOME. MADE FOR TOMORROW.</span><a href="#shop">DISCOVER THE COLLECTION <ArrowDown size={13}/></a></div>
    </section>

    <section className="intro-strip" id="story"><p><span className="tiny-label">A LITTLE ABOUT US</span> We believe the everyday act of cooking can be a little kinder to the earth, and a lot better for the people around the table.</p><a href="#impact">Our story <ArrowUpRight size={14}/></a></section>

    <section className="shop-section" id="shop"><div className="section-heading"><div><div className="eyebrow"><span className="dot"/> THE NISSI COLLECTION</div><h2>Good things<br className="mobile-break"/> for the <em>everyday.</em></h2></div><p>Considered essentials for a better way to cook. Find the right fit for your home or business.</p></div><div className="shop-toolbar"><div className="category-tabs">{categories.map(item=><button key={item} onClick={()=>setCategory(item)} className={category===item?'active':''}>{item}</button>)}</div><span className="product-count">{shown.length} COLLECTIONS <span>·</span> {variants.filter(v=>shown.includes(v.product)).length} OPTIONS</span></div>
      <div className="product-grid">{shown.map((product,index)=><ProductCard key={product.slug} product={product} index={index} selected={selected[product.slug]||product.variants[0].id} onSelect={id=>setSelected(prev=>({...prev,[product.slug]:id}))} onAdd={()=>add(product)} added={added===product.slug}/>)}</div><div className="delivery-note"><span className="delivery-icon"><Leaf size={17}/></span><div><strong>From our home to yours.</strong><p>We deliver across Uganda. Your delivery fee will be confirmed after you place your order, based on your location.</p></div><ArrowUpRight size={16}/></div>
    </section>

    <section className="impact-section" id="impact"><div className="impact-art"><div className="impact-circle"><span>FROM<br/>UGANDA,<br/><em>WITH CARE.</em></span><Leaf size={28}/></div><span className="impact-label">GROWING A BETTER WAY, TOGETHER</span></div><div className="impact-copy"><div className="eyebrow"><span className="dot"/> OUR PROMISE</div><h2>Small changes<br/>make <em>good</em><br/><em>things grow.</em></h2><p>We’re building a more thoughtful way to cook, starting right here at home. Our products bring together local making, considered materials and a belief that everyday choices add up.</p><a className="text-link" href="#shop">A better kind of everyday <ArrowRight size={15}/></a></div></section>

    <section className="closing"><span className="eyebrow"><span className="dot"/> YOUR KITCHEN, YOUR WAY</span><h2>Here’s to the good<br/>things <em>cooking.</em></h2><a href="#shop" className="button button-light">Find your fit <ArrowRight size={16}/></a><span className="closing-spark">✳</span></section>
    <footer><a className="wordmark" href="#home">nissi<span>.</span></a><p>Good energy for good living.<br/>Made with care in Uganda.</p><div className="footer-links"><a href="#shop">Shop</a><a href="#story">Our story</a><a href="mailto:hello@nissi.ug">Get in touch</a></div><span className="copyright">© NISSI 2026 &nbsp;·&nbsp; UGANDA</span></footer>

    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="tiny-label">YOUR SELECTION</span><h2>Your bag <span>({count})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Close bag"><X/></button></div>{lines.length===0?<div className="empty-cart"><span className="empty-icon"><ShoppingBag/></span><h3>A little room for good things.</h3><p>Your bag is waiting for something lovely.</p><button className="button button-dark" onClick={()=>setCartOpen(false)}>Explore the collection <ArrowRight size={15}/></button></div>:<><div className="cart-lines">{lines.map(line=><div className="cart-line" key={line.id}><div className={`cart-thumb ${line.product.tone}`}>{line.product.symbol}</div><div className="cart-info"><strong>{line.product.name}</strong><span>{line.name}</span><div className="quantity"><button onClick={()=>setQuantity(line.id,line.quantity-1)} aria-label="Decrease quantity"><Minus size={13}/></button><span>{line.quantity}</span><button onClick={()=>setQuantity(line.id,line.quantity+1)} aria-label="Increase quantity"><Plus size={13}/></button></div></div><div className="cart-price"><strong>{money(line.price*line.quantity)}</strong><button onClick={()=>setQuantity(line.id,0)}>Remove</button></div></div>)}</div><div className="drawer-foot"><div className="subtotal-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery fee confirmed after your order. No delivery date is promised at checkout.</p><button className="button button-dark full-button" onClick={beginCheckout}>Continue to checkout <ArrowRight size={16}/></button><span className="secure-note">Secure checkout · Payment due on delivery</span></div></>}</aside></div>}

    {checkoutOpen&&<div className="overlay" onClick={()=>setCheckoutOpen(false)}><aside className="drawer checkout-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="tiny-label">ALMOST THERE</span><h2>Checkout</h2></div><button className="icon-button" onClick={()=>setCheckoutOpen(false)} aria-label="Close checkout"><X/></button></div><div className="checkout-banner"><span><Leaf size={18}/></span><p><strong>Delivery across Uganda</strong><br/>Fee confirmed after order. Timing agreed with you.</p></div><form className="checkout-form" onSubmit={submitOrder}><label>Full name<input name="name" placeholder="Your name" required/></label><label>Email address<input type="email" name="email" placeholder="you@example.com" required/></label><label>Phone number<input type="tel" name="phone" placeholder="+256 7XX XXX XXX" required/></label><div className="form-row"><label>District<input name="district" placeholder="e.g. Wakiso" required/></label><label>City / town<input name="city" placeholder="e.g. Entebbe" required/></label></div><label>Delivery address / landmark<textarea name="address" placeholder="Help us find you" required rows={2}/></label><label>Delivery notes <span className="optional">(optional)</span><textarea name="notes" placeholder="Anything else we should know?" rows={2}/></label><fieldset><legend>How would you like to pay?</legend><label className="payment-option"><input type="radio" name="payment" checked={payment==='cash_on_delivery'} onChange={()=>setPayment('cash_on_delivery')}/><span className="payment-dot"/><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span><span className="payment-check"><Check size={14}/></span></label><label className="payment-option"><input type="radio" name="payment" checked={payment==='momo_sandbox'} onChange={()=>setPayment('momo_sandbox')}/><span className="payment-dot"/><span><strong>MTN MoMo <em>Sandbox demo</em></strong><small>Simulated flow · No real payment.</small></span><span className="payment-check"><Check size={14}/></span></label></fieldset><div className="checkout-total"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Delivery fee</span><span>Confirmed after order</span></div><div className="total-line"><span>Due {payment==='cash_on_delivery'?'on delivery':'when confirmed'}</span><strong>{money(subtotal)}<small> + delivery</small></strong></div></div><div className="setup-note"><strong>{checkoutError ? "Checkout needs attention" : "Secure order confirmation"}</strong><span>{checkoutError || (payment === "momo_sandbox" ? "Sandbox demo only. No real MoMo payment will be taken; the order remains pending." : "Your order will be saved securely. Delivery fee will be confirmed after order.")}</span></div><button className="button button-dark full-button" disabled={submitting}>{submitting ? "Placing order…" : "Place order"} <ArrowRight size={16}/></button><span className="checkout-fine">By placing your order, you agree to be contacted to confirm delivery details.</span></form></aside></div>}
  </main>;
}

function ProductCard({ product, index, selected, onSelect, onAdd, added }: {product:Product;index:number;selected:string;onSelect:(id:string)=>void;onAdd:()=>void;added:boolean}) {
  const active = product.variants.find(v=>v.id===selected)||product.variants[0];
  return <article className="product-card"><div className={`product-visual ${product.tone} ${product.image ? 'has-photo' : ''}`}><span className="visual-number">0{index+1}</span>{product.image ? <img className="product-photo" src={product.image} alt={product.name} loading="lazy"/> : <><span className="visual-mark">{product.symbol}</span><div className="visual-shape shape-a"/><div className="visual-shape shape-b"/></>}<div className="visual-name">{product.name.split(' ').map(w=>w[0]).join('').toUpperCase()}</div><span className="visual-caption">NISSI · MADE IN UGANDA</span><a className="detail-link" href={`#${product.slug}`} aria-label={`More about ${product.name}`} onClick={e=>e.preventDefault()}><ArrowUpRight size={16}/></a></div><div className="product-meta"><div className="product-topline"><span>{product.category.toUpperCase()}</span><span>0{index+1}</span></div><h3>{product.name}</h3><p>{product.short}</p><label className="variant-select"><span>SIZE / FORMAT</span><select value={selected} onChange={e=>onSelect(e.target.value)} aria-label={`Choose ${product.name} size`}>{product.variants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><ChevronDown size={15}/></label><div className="product-bottom"><strong>{money(active.price)}</strong><button className={added?'add-button added':'add-button'} onClick={onAdd} aria-label={`Add ${product.name}, ${active.name} to bag`}>{added?<Check size={17}/>:<Plus size={17}/>}<span>{added?'Added':'Add to bag'}</span></button></div></div></article>;
}

