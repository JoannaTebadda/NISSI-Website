export type Product = {
  slug: string; name: string; category: string; description: string; short: string;
  symbol: string; tone: string; image?: string; variants: { id: string; name: string; unit: string; price: number; stock: number }[];
};

// Confirmed PRD prices. Stock is an editable demo assumption, not business inventory.
export const products: Product[] = [
  { slug:'stick-briquettes', name:'Stick briquettes', category:'Briquettes', description:'A dependable, long-burning fuel for everyday cooking. Choose the pack size that fits your home or kitchen.', short:'Long-lasting heat for everyday cooking.', symbol:'✳', tone:'clay', image:'/products/stick-briquettes.jpg', variants:[{id:'stick-10',name:'10 kg',unit:'bag',price:15000,stock:100},{id:'stick-20',name:'20 kg',unit:'bag',price:40000,stock:100},{id:'stick-50',name:'50 kg',unit:'bag',price:80000,stock:100}] },
  { slug:'honeycomb-briquettes', name:'Honeycomb briquettes', category:'Briquettes', description:'Compact honeycomb charcoal briquettes, available by the piece or in a convenient bag of ten.', short:'Compact briquettes, sold by piece or bag.', symbol:'⬡', tone:'sand', image:'/products/honeycomb-briquettes.jpg', variants:[{id:'honey-one',name:'1 piece',unit:'piece',price:2000,stock:100},{id:'honey-ten',name:'Bag of 10 pieces',unit:'bag',price:20000,stock:100}] },
  { slug:'pellets', name:'Pellets', category:'Pellets', description:'Uniform clean-cooking fuel pellets in three practical sizes for home and commercial use.', short:'Consistent fuel in three practical sizes.', symbol:'⁙', tone:'olive', image:'/products/pellets.jpg', variants:[{id:'pellets-10',name:'10 kg',unit:'bag',price:10000,stock:100},{id:'pellets-20',name:'20 kg',unit:'bag',price:20000,stock:100},{id:'pellets-50',name:'50 kg',unit:'bag',price:50000,stock:100}] },
  { slug:'industrial-stove', name:'Industrial stove', category:'Stoves', description:'A sturdy stove designed for demanding, high-volume cooking environments.', short:'Built for high-volume cooking.', symbol:'◉', tone:'dark', image:'/products/industrial-stove.jpg', variants:[{id:'stove-industrial',name:'One stove',unit:'stove',price:2700000,stock:100}] },
  { slug:'domestic-stove', name:'Domestic stove', category:'Stoves', description:'An efficient everyday cooking companion for the home.', short:'A practical choice for home cooking.', symbol:'◉', tone:'blue', image:'/products/domestic-stove.jpg', variants:[{id:'stove-domestic',name:'One stove',unit:'stove',price:50000,stock:100}] },
  { slug:'fire-lighters', name:'Fire lighters', category:'Accessories', description:'Simple, reliable fire lighters to help get your cooking started.', short:'A simple start to every cook.', symbol:'⌁', tone:'gold', image:'/products/fire-lighters.jpg', variants:[{id:'firelighters-one',name:'One pack',unit:'pack',price:10000,stock:100}] },
];

export const variants = products.flatMap(product => product.variants.map(variant => ({ ...variant, product })));
export const money = (amount: number) => `UGX ${new Intl.NumberFormat('en-UG').format(amount)}`;
