const WA_NUMBER    = '5491123989353';
const BACKEND_URL  = 'https://catalogo-lasjoaquinas-backend.onrender.com';

let allProducts      = [];
let filteredProducts = [];
let cart             = [];
let deliveryMode     = 'envio';
let currentProduct   = null;
let activeCategory   = 'Todos';

// Helper para eliminar acentos, diacríticos y pasar a minúsculas
function normalizeText(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const CATEGORY_CHIPS = [
  { label: 'Todos',              match: null },
  { label: 'New Collection',     match: ['new collection', 'nueva coleccion'] },
  { label: 'Capsula Denim',      match: ['capsula denim', 'denim', 'jeans'] },
  { label: 'Remeras & Musculosas', match: ['remeras & musculosas', 'remera', 'musculosa', 'musculosas'] },
  { label: 'Blusas & Camisas',   match: ['blusas & camisas', 'blusa', 'camisa'] },
  { label: 'Buzos',              match: ['buzo', 'buzos'] },
  { label: 'Blazer & Chaquetas', match: ['blazer', 'chaqueta', 'saco'] },
  { label: 'Pantalones',         match: ['pantalon', 'pantalones', 'jean'] },
  { label: 'LIQUIJOAQUINAS',     match: ['liquijoaquinas', 'liqui', 'sale'] },
  { label: 'Abrigos',            match: ['abrigo', 'abrigos', 'camperas/tapados', 'campera', 'tapado'] },
  { label: 'Sweaters',           match: ['sweater', 'sweaters'] },
  { label: 'Conjuntos',          match: ['conjunto', 'conjuntos'] },
  { label: 'Night',              match: ['night', 'noche'] },
  { label: 'Faldas',             match: ['falda', 'faldas', 'pollera'] },
  { label: 'Shorts',             match: ['short', 'shorts', 'bombers'] },
  { label: 'Fragancias',         match: ['fragancia', 'fragancias', 'perfumina', 'perfuminas', 'perfume', 'home', 'aroma'] }
];

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeModal();
      closeCart();
      closeSideMenu();
    });
  }
  loadProducts();
});

async function loadProducts() {
  showStatus('Cargando productos…', 'loading');
  try {
    const res  = await fetch(`${BACKEND_URL}/api/products`);
    const data = await res.json();
    
    // Extracción tolerante si la API envía un array directo o un objeto wrapper
    const rawProducts = Array.isArray(data) ? data : (data.products || data.items || []);

    // LOG DE CONTROL PARA VERIFICAR LA ESTRUCTURA EN CONSOLA (F12)
    console.log('DATOS RECIBIDOS DEL BACKEND:', rawProducts);

    allProducts = rawProducts.filter(p => {
      const stockGen = Number(p.stock) > 0;
      const stockVar = Array.isArray(p.variants) && p.variants.some(v => Number(v.stock) > 0);
      return stockGen || stockVar;
    });

    allProducts.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('products-grid').style.display = 'grid';
    document.getElementById('section-title').textContent = 'Productos';
    showStatus(`✅ ${allProducts.length} productos disponibles`, 'success');
    
    filteredProducts = allProducts;
    renderCategoryChips();
    renderProducts(filteredProducts);
  } catch(err) {
    document.getElementById('loading-screen').style.display = 'none';
    showStatus(`⚠️ Error al cargar productos: ${err.message}`, 'error');
  }
}

function showStatus(msg, type) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.textContent = msg;
  bar.className = type;
  if (type === 'success') setTimeout(() => bar.className = '', 4000);
}

function renderProducts(products) {
  const grid  = document.getElementById('products-grid');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('product-count');

  if (!products || products.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    count.textContent = '0 productos';
    return;
  }
  
  empty.style.display = 'none';
  count.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;

grid.innerHTML = products.map(p => {
    const variantsConStock = (p.variants || []).filter(v => Number(v.stock) > 0);
    const totalVariants    = variantsConStock.length;
    const priceHtml = `<div class="price-block"><span class="price-transfer">${formatPrice(p.price)}</span></div>`;
    
    return `
      <div class="product-card" onclick="openModal(${p.id})">
        <div class="card-carousel" id="cc-${p.id}">
          <div class="card-carousel-track" id="cct-${p.id}">
            ${(p.images && p.images.length > 0 ? p.images : [p.image || '']).map((src) => `
              <div class="card-carousel-slide">
                <img src="${src}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x500/FAF8F3/7A746E?text=Imagen'" />
              </div>`).join('')}
          </div>
          ${(p.images && p.images.length > 1) ? `
            <button class="card-carousel-btn card-carousel-prev" onclick="cardCarouselMove(event, ${p.id}, -1)">&#8249;</button>
            <button class="card-carousel-btn card-carousel-next" onclick="cardCarouselMove(event, ${p.id}, 1)">&#8250;</button>
            <div class="card-carousel-dots" id="ccd-${p.id}">
              ${p.images.map((_, i) => `<button class="card-carousel-dot${i===0?' active':''}" onclick="cardCarouselGo(event, ${p.id}, ${i}, ${p.images.length})"></button>`).join('')}
            </div>` : ''}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-price">${priceHtml}</div>
          <div class="product-variants-count">${totalVariants} talle${totalVariants !== 1 ? 's' : ''} disponible${totalVariants !== 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');
}

const cardCarouselState = {};

function cardCarouselMove(e, productId, dir) {
  e.stopPropagation();
  const p = allProducts.find(x => x.id === productId);
  if (!p || !p.images || p.images.length <= 1) return;
  const total = p.images.length;
  const current = cardCarouselState[productId] || 0;
  const next = (current + dir + total) % total;
  cardCarouselGo(e, productId, next, total);
}

function cardCarouselGo(e, productId, index, total) {
  e.stopPropagation();
  cardCarouselState[productId] = index;
  const track = document.getElementById(`cct-${productId}`);
  if (track) track.style.transform = `translateX(-${index * 100}%)`;
  const dotsEl = document.getElementById(`ccd-${productId}`);
  if (dotsEl) {
    dotsEl.querySelectorAll('.card-carousel-dot').forEach((d, i) =>
      d.classList.toggle('active', i === index));
  }
}

function openSideMenu() {
  renderSideMenu();
  document.getElementById('side-menu').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeSideMenu() {
  document.getElementById('side-menu').classList.remove('open');
  if (!document.getElementById('cart-drawer').classList.contains('open') &&
      !document.getElementById('product-modal').classList.contains('open')) {
    document.getElementById('overlay').classList.remove('open');
  }
}

function renderSideMenu() {
  const list = document.getElementById('side-menu-list');
  list.innerHTML = CATEGORY_CHIPS.filter(c => c.label !== 'Todos').map(c =>
    `<a onclick="setCategory('${c.label}'); closeSideMenu();">${c.label}</a>`
  ).join('');
}

function renderCategoryChips() {
  const wrap = document.getElementById('category-filters');
  if (!wrap) return;
  wrap.innerHTML = CATEGORY_CHIPS.map(c => `
    <button class="category-chip${c.label === activeCategory ? ' active' : ''}"
            onclick="setCategory('${c.label}')">${c.label}</button>
  `).join('');
}

function setCategory(label) {
  activeCategory = label;
  renderCategoryChips();
  filterProducts();
}

function productMatchesCategory(p, chip) {
  if (!chip || !chip.match) return true; // Categoría 'Todos'

  const nameNorm = normalizeText(p.name);
  const skuNorm  = normalizeText(p.sku);
  const descNorm = normalizeText(p.description);

  // Unifica las categorías independientemente de si la API devuelve un Array o un String
  let catsList = [];
  if (Array.isArray(p.categories)) {
    catsList = p.categories.map(c => normalizeText(c));
  } else if (typeof p.categories === 'string') {
    catsList = [normalizeText(p.categories)];
  }
  if (p.category) catsList.push(normalizeText(p.category));

  return chip.match.some(rawKeyword => {
    const kw = normalizeText(rawKeyword);
    const inCat  = catsList.some(cat => cat.includes(kw));
    const inName = nameNorm.includes(kw);
    const inSku  = skuNorm.includes(kw);
    const inDesc = descNorm.includes(kw);
    return inCat || inName || inSku || inDesc;
  });
}

function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const q = searchInput ? normalizeText(searchInput.value) : '';
  const chip = CATEGORY_CHIPS.find(c => c.label === activeCategory) || CATEGORY_CHIPS[0];

  filteredProducts = allProducts.filter(p => {
    const matchesCategory = productMatchesCategory(p, chip);
    
    if (!q) return matchesCategory;

    const nameNorm = normalizeText(p.name);
    const skuNorm  = normalizeText(p.sku);
    const descNorm = normalizeText(p.description);
    const matchesSearch = nameNorm.includes(q) || skuNorm.includes(q) || descNorm.includes(q);

    return matchesCategory && matchesSearch;
  });

  renderProducts(filteredProducts);
}

let carouselIndex = 0;
let carouselImages = [];

function buildCarousel(images, productName) {
  carouselImages = images.length > 0 ? images : [''];
  carouselIndex  = 0;

  const track = document.getElementById('carousel-track');
  track.innerHTML = carouselImages.map((src, i) => `
    <div class="carousel-slide">
      <img src="${src}" alt="${productName} ${i+1}" loading="${i===0?'eager':'lazy'}"
           onerror="this.src='https://placehold.co/680x680/FAF8F3/7A746E?text=Imagen'" />
    </div>`).join('');

  const dots = document.getElementById('carousel-dots');
  dots.innerHTML = carouselImages.length > 1
    ? carouselImages.map((_, i) => `<button class="carousel-dot${i===0?' active':''}" onclick="carouselGoTo(${i})"></button>`).join('')
    : '';

  document.getElementById('carousel-prev').style.display = carouselImages.length > 1 ? 'flex' : 'none';
  document.getElementById('carousel-next').style.display = carouselImages.length > 1 ? 'flex' : 'none';

  updateCarouselUI();
}

function carouselMove(dir) {
  carouselIndex = (carouselIndex + dir + carouselImages.length) % carouselImages.length;
  updateCarouselUI();
}

function carouselGoTo(i) {
  carouselIndex = i;
  updateCarouselUI();
}

function updateCarouselUI() {
  document.getElementById('carousel-track').style.transform = `translateX(-${carouselIndex * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) =>
    d.classList.toggle('active', i === carouselIndex));
  const counter = document.getElementById('carousel-counter');
  if (carouselImages.length > 1) {
    counter.textContent = `${carouselIndex + 1} / ${carouselImages.length}`;
    counter.style.display = 'block';
  } else {
    counter.style.display = 'none';
  }
}

let modalQty = {};

function openModal(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;
  currentProduct = p;
  modalQty = {};

  buildCarousel(p.images || (p.image ? [p.image] : []), p.name);

  document.getElementById('modal-title').textContent = p.name;
  document.getElementById('modal-sku').textContent = p.sku ? `Art. ${p.sku}` : '';

  const priceRow = document.getElementById('modal-price-row');
  priceRow.innerHTML = `<span class="modal-price-transfer">${formatPrice(p.price)}</span>`;

  renderModalVariants();
  updateModalBtn();

  document.getElementById('product-modal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function renderModalVariants() {
  const p = currentProduct;
  const section = document.getElementById('modal-variants-section');

  if (!p.variants || p.variants.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const groups = [];
  const groupIndex = {};
  p.variants.forEach(v => {
    const colorKey = v.color || 'Único';
    if (!(colorKey in groupIndex)) {
      groupIndex[colorKey] = groups.length;
      groups.push({ color: colorKey, variants: [] });
    }
    groups[groupIndex[colorKey]].variants.push(v);
  });

  document.getElementById('modal-variants').innerHTML = groups.map(g => `
    <div class="color-group">
      <div class="color-group-name">${g.color}</div>
      ${g.variants.map(v => {
        const hasStock = Number(v.stock) > 0;
        const qty = modalQty[v.id] || 0;
        return `
          <div class="size-row ${!hasStock ? 'no-stock' : ''}">
            <div>
              <div class="size-name">${v.size || 'Único'}</div>
              ${!hasStock ? `<div class="size-stock-note">Sin stock</div>` : ''}
            </div>
            <div class="qty-stepper">
              <button class="qty-btn" onclick="modalQtyChange(${v.id}, -1)" ${(!hasStock || qty <= 0) ? 'disabled' : ''}>−</button>
              <span class="qty-value" id="mqty-${v.id}">${qty}</span>
              <button class="qty-btn" onclick="modalQtyChange(${v.id}, 1)" ${(!hasStock || qty >= v.stock) ? 'disabled' : ''}>+</button>
            </div>
          </div>`;
      }).join('')}
    </div>
  `).join('');
}

function modalQtyChange(variantId, dir) {
  const v = currentProduct.variants.find(x => x.id === variantId);
  if (!v) return;
  const current = modalQty[variantId] || 0;
  const next = Math.max(0, Math.min(v.stock, current + dir));
  modalQty[variantId] = next;

  document.getElementById(`mqty-${variantId}`).textContent = next;

  const row = document.getElementById(`mqty-${variantId}`).closest('.qty-stepper');
  const [minusBtn, , plusBtn] = row.querySelectorAll('button, span');
  minusBtn.disabled = next <= 0;
  plusBtn.disabled  = next >= v.stock;

  updateModalBtn();
}

function updateModalBtn() {
  const btn = document.getElementById('modal-add-btn');
  const variantsConStock = currentProduct?.variants.filter(v => Number(v.stock) > 0) || [];

  if (variantsConStock.length === 0) {
    btn.textContent = 'Sin stock disponible';
    btn.disabled = true;
    btn.classList.remove('added');
    return;
  }

  const totalQty = Object.values(modalQty).reduce((a, b) => a + b, 0);

  if (totalQty > 0) {
    btn.textContent = `Agregar al pedido (${totalQty})`;
    btn.disabled = false;
    btn.classList.remove('added');
  } else {
    btn.textContent = 'Elegí color y talle';
    btn.disabled = true;
    btn.classList.remove('added');
  }
}

function addFromModal() {
  if (!currentProduct) return;

  const entries = Object.entries(modalQty).filter(([, qty]) => qty > 0);
  if (entries.length === 0) return;

  entries.forEach(([variantId, qty]) => {
    const v = currentProduct.variants.find(x => x.id === Number(variantId));
    if (!v) return;
    const cartKey = `${currentProduct.id}-${v.id}`;
    const existing = cart.find(c => c.cartKey === cartKey);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        cartKey,
        id:      currentProduct.id,
        name:    currentProduct.name,
        variant: v.name || 'Único',
        price:   currentProduct.price,
        image:   currentProduct.image,
        qty
      });
    }
  });

  updateCartUI();

  const btn = document.getElementById('modal-add-btn');
  btn.textContent = '✓ Agregado al pedido';
  btn.classList.add('added');
  setTimeout(() => closeModal(), 800);
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
  currentProduct = null;
  modalQty = {};
}

function updateCartUI() {
  document.getElementById('cart-count').textContent = cart.reduce((s, c) => s + c.qty, 0);
}

function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  goToStep(1);
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  if (!document.getElementById('product-modal').classList.contains('open')) {
    document.getElementById('overlay').classList.remove('open');
  }
}

function goToStep(n) {
  document.querySelectorAll('.cart-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`cart-step-${n}`).classList.add('active');
  document.getElementById(`tab-${n}`).classList.add('active');
  document.getElementById('drawer-title').textContent = n === 1 ? 'Tu pedido' : 'Tus datos';
  if (n === 1) renderCartStep1();
  if (n === 2) renderOrderSummary();
}

function renderCartStep1() {
  const list   = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer-1');
  if (cart.length === 0) {
    list.innerHTML = `<div class="cart-empty-msg"><span class="emoji">🛒</span>Tu pedido está vacío.</div>`;
    footer.style.display = 'none'; return;
  }
  footer.style.display = 'block';
  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image || ''}" alt="${item.name}" onerror="this.src='https://placehold.co/64x64/FAF8F3/7A746E?text=?'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-variant">${item.variant}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${item.cartKey}', -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.cartKey}', 1)">+</button>
          <button class="remove-btn" onclick="removeFromCart('${item.cartKey}')">🗑</button>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('cart-total-price').textContent = formatPrice(cart.reduce((s, c) => s + c.price * c.qty, 0));
}

function changeQty(cartKey, delta) {
  const item = cart.find(c => c.cartKey === cartKey);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.cartKey !== cartKey);
  updateCartUI();
  renderCartStep1();
}

function removeFromCart(cartKey) {
  cart = cart.filter(c => c.cartKey !== cartKey);
  updateCartUI();
  renderCartStep1();
}

function renderOrderSummary() {
  const total   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const summary = document.getElementById('order-summary');
  summary.innerHTML = `
    <div class="order-summary-title">Productos seleccionados</div>
    ${cart.map(item => `
      <div class="order-summary-item">
        <span>${item.name} — ${item.variant} x${item.qty}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>`).join('')}
    <div class="order-summary-item"><span>Total estimado</span><span>${formatPrice(total)}</span></div>`;
}

function selectDelivery(mode) {
  deliveryMode = mode;
  document.getElementById('opt-envio').classList.toggle('selected', mode === 'envio');
  document.getElementById('opt-retiro').classList.toggle('selected', mode === 'retiro');
  document.getElementById('address-fields').classList.toggle('show', mode === 'envio');
}

function sendToWhatsApp() {
  const nombre   = document.getElementById('f-nombre').value.trim();
  const apellido = document.getElementById('f-apellido').value.trim();
  const tel      = document.getElementById('f-tel').value.trim();
  if (!nombre || !apellido || !tel) { alert('Completá nombre, apellido y teléfono.'); return; }
  if (deliveryMode === 'envio') {
    const calle  = document.getElementById('f-calle').value.trim();
    const ciudad = document.getElementById('f-ciudad').value.trim();
    const prov   = document.getElementById('f-provincia').value.trim();
    if (!calle || !ciudad || !prov) { alert('Completá la dirección de envío.'); return; }
  }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const lines = cart.map(item => `  - ${item.name} - ${item.variant} (x${item.qty}) - ${formatPrice(item.price * item.qty)}`);
  let entrega = '';
  if (deliveryMode === 'envio') {
    const calle  = document.getElementById('f-calle').value.trim();
    const piso   = document.getElementById('f-piso').value.trim();
    const cp     = document.getElementById('f-cp').value.trim();
    const ciudad = document.getElementById('f-ciudad').value.trim();
    const prov   = document.getElementById('f-provincia').value.trim();
    entrega = `Envío a domicilio:\n  ${calle}${piso ? ', ' + piso : ''}${cp ? ' (CP: ' + cp + ')' : ''}\n  ${ciudad}, ${prov}`;
  } else {
    entrega = `Retiro en local`;
  }
  const notas = document.getElementById('f-notas').value.trim();
  const message = [
    'Hola, quiero hacer el siguiente pedido:',
    '', 'Productos:', ...lines, '',
    `Total: ${formatPrice(total)}`, '',
    'Mis datos:',
    `  Nombre: ${nombre} ${apellido}`,
    `  Teléfono: ${tel}`, '',
    entrega,
    ...(notas ? ['', `Notas: ${notas}`] : []),
    '', 'Quedo a la espera de la confirmación. Gracias.'
  ].join('\n');

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

  cart = [];
  updateCartUI();
  document.getElementById('f-nombre').value    = '';
  document.getElementById('f-apellido').value  = '';
  document.getElementById('f-tel').value       = '';
  document.getElementById('f-calle').value     = '';
  document.getElementById('f-piso').value      = '';
  document.getElementById('f-cp').value        = '';
  document.getElementById('f-ciudad').value    = '';
  document.getElementById('f-provincia').value = '';
  document.getElementById('f-notas').value     = '';
  closeCart();
}

function formatPrice(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}