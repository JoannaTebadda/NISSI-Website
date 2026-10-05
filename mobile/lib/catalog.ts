export type Variant = { slug: string; name: string; price: number };
export type Product = { slug: string; name: string; description: string; category: string; image: string; variants: Variant[] };

const photoBase = 'https://nissi-website-mvp.vercel.app/products';
export const products: Product[] = [
  { slug: 'stick-briquettes', name: 'Stick briquettes', category: 'Briquettes', description: 'Long-lasting heat for everyday cooking.', image: `${photoBase}/stick-briquettes.jpg`, variants: [{ slug: 'stick-10', name: '10 kg', price: 15000 }, { slug: 'stick-20', name: '20 kg', price: 40000 }, { slug: 'stick-50', name: '50 kg', price: 80000 }] },
  { slug: 'honeycomb-briquettes', name: 'Honeycomb briquettes', category: 'Briquettes', description: 'Compact briquettes, sold by piece or bag.', image: `${photoBase}/honeycomb-briquettes.jpg`, variants: [{ slug: 'honey-one', name: '1 piece', price: 2000 }, { slug: 'honey-ten', name: 'Bag of 10 pieces', price: 20000 }] },
  { slug: 'pellets', name: 'Pellets', category: 'Pellets', description: 'Consistent fuel in three practical sizes.', image: `${photoBase}/pellets.jpg`, variants: [{ slug: 'pellets-10', name: '10 kg', price: 10000 }, { slug: 'pellets-20', name: '20 kg', price: 20000 }, { slug: 'pellets-50', name: '50 kg', price: 50000 }] },
  { slug: 'industrial-stove', name: 'Industrial stove', category: 'Stoves', description: 'Built for high-volume cooking.', image: `${photoBase}/industrial-stove.jpg`, variants: [{ slug: 'stove-industrial', name: 'One stove', price: 2700000 }] },
  { slug: 'domestic-stove', name: 'Domestic stove', category: 'Stoves', description: 'A practical choice for home cooking.', image: `${photoBase}/domestic-stove.jpg`, variants: [{ slug: 'stove-domestic', name: 'One stove', price: 50000 }] },
  { slug: 'fire-lighters', name: 'Fire lighters', category: 'Accessories', description: 'A simple start to every cook.', image: `${photoBase}/fire-lighters.jpg`, variants: [{ slug: 'firelighters-one', name: 'One pack', price: 10000 }] },
];

export function formatUGX(amount: number) {
  return `UGX ${new Intl.NumberFormat('en-UG').format(amount)}`;
}
