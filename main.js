import './style.css';

// ============================================================
// CONFIGURACIÓN DEL ADMINISTRADOR
// Cambia estos valores para modificar el usuario y contraseña
// ============================================================
const ADMIN_USER = 'ditto';
const ADMIN_PASS = '1234';
// ============================================================

// Default initial catalog (used only the first time)
const defaultProducts = [
  {
    id: 1,
    name: 'Vintage Carhartt Detroit Jacket',
    size: 'L',
    proportions: '68x62 cm',
    price: 75000,
    images: ['/images/hoodie.jpg'],
    isSold: false
  },
  {
    id: 2,
    name: 'Pantalón Parachute Y2K Faded',
    size: '34x32',
    proportions: '44cm cintura',
    price: 45000,
    images: ['/images/jeans.jpg'],
    isSold: false
  },
  {
    id: 3,
    name: 'Polera Gráfica Bandas 90s',
    size: 'XL',
    proportions: '75x58 cm',
    price: 25000,
    images: ['/images/tee.jpg'],
    isSold: false
  }
];

// State
let products = [];
let cart = [];
let carouselState = {};
let pendingImages = []; // Stores Base64 images from file selector
let currentLightbox = { productId: null, imageIndex: 0 };

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartToggle = document.getElementById('cart-toggle');
const closeCart = document.getElementById('close-cart');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');
const scrollBtn = document.getElementById('scroll-to-shop');

// Lightbox Elements
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxSize = document.getElementById('lightbox-size');
const lightboxPrice = document.getElementById('lightbox-price');
const lightboxCounter = document.getElementById('lightbox-counter');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxThumbnails = document.getElementById('lightbox-thumbnails');

// Order Form Modal Elements
const orderModal = document.getElementById('order-modal');
const orderOverlay = document.getElementById('order-overlay');
const closeOrderModalBtn = document.getElementById('close-order-modal');
const orderSummaryBox = document.getElementById('order-summary-box');
const orderForm = document.getElementById('order-form');
const orderNameInput = document.getElementById('order-name');
const orderRutInput = document.getElementById('order-rut');
const orderPhoneInput = document.getElementById('order-phone');
const orderCityInput = document.getElementById('order-city');
const orderAddressInput = document.getElementById('order-address');
const orderSubmitBtn = document.getElementById('order-submit-btn');

// Admin Elements
const openAdminBtn = document.getElementById('open-admin-btn');
const logoutAdminBtn = document.getElementById('logout-admin-btn');
const closeAdminBtn = document.getElementById('close-admin');
const adminModal = document.getElementById('admin-modal');
const adminOverlay = document.getElementById('admin-overlay');
const addProductForm = document.getElementById('add-product-form');
const fileInput = document.getElementById('p-images');
const fileNameDisplay = document.getElementById('file-name-display');
const adminTitle = document.getElementById('admin-title');
const adminSubmitBtn = document.getElementById('admin-submit-btn');
const editIdField = document.getElementById('p-edit-id');

// Login Elements
const loginModal = document.getElementById('login-modal');
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginUserInput = document.getElementById('login-user');
const loginPassInput = document.getElementById('login-pass');
const loginError = document.getElementById('login-error');
const closeLoginBtn = document.getElementById('close-login');

// ================================================================
// IMAGE COMPRESSION
// ================================================================
function compressImage(file, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Scale down if wider than maxWidth
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Export as JPEG Base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function processSelectedFiles(files) {
  pendingImages = [];
  const promises = Array.from(files).map(f => compressImage(f));
  pendingImages = await Promise.all(promises);
}

// ================================================================
// INITIALIZE
// ================================================================
function init() {
  loadCatalog();
  loadCart();
  renderProducts();
  setupEventListeners();
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
}

// ================================================================
// CATALOG PERSISTENCE
// ================================================================
function loadCatalog() {
  const saved = localStorage.getItem('ditto_catalog');
  if (saved) {
    products = JSON.parse(saved);
  } else {
    products = [...defaultProducts];
    saveCatalog();
  }
}

function saveCatalog() {
  try {
    localStorage.setItem('ditto_catalog', JSON.stringify(products));
  } catch (e) {
    alert('⚠️ No hay suficiente memoria en el navegador para guardar más productos. Intenta eliminar algunos productos antiguos.');
  }
}

// ================================================================
// RENDER PRODUCTS & CAROUSEL
// ================================================================
function renderProducts() {
  if (products.length === 0) {
    productGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1 / -1;">No hay productos aún. Usa el panel de admin para agregar.</p>';
    return;
  }

  productGrid.innerHTML = products.map(product => {
    if (carouselState[product.id] === undefined) {
      carouselState[product.id] = 0;
    }
    const currentImgIndex = carouselState[product.id];
    const images = (product.images && product.images.length > 0) ? product.images : ['/images/logo.jpg'];
    const hasMultipleImages = images.length > 1;

    const isInCart = cart.some(item => item.id === product.id);
    const isDisabled = product.isSold || isInCart;
    let btnText = '[ AGREGAR ]';
    if (product.isSold) btnText = 'NO DISPONIBLE';
    else if (isInCart) btnText = '[ EN BOLSA ]';

    return `
    <div class="product-card ${product.isSold ? 'sold-out' : ''}">
      ${product.isSold ? '<div class="sold-badge">VENDIDO</div>' : ''}
      
      <div class="carousel-container" data-pid="${product.id}">
        <div class="carousel-track" style="transform: translateX(-${currentImgIndex * 100}%);">
          ${images.map((img, idx) => `<img src="${img}" alt="${product.name}" class="carousel-slide" data-pid="${product.id}" data-index="${idx}">`).join('')}
        </div>
        ${hasMultipleImages ? `
          <button class="carousel-btn prev" data-pid="${product.id}" aria-label="Foto anterior">
            <span class="material-symbols-outlined" style="font-size: 1.1rem; pointer-events: none;">chevron_left</span>
          </button>
          <button class="carousel-btn next" data-pid="${product.id}" aria-label="Foto siguiente">
            <span class="material-symbols-outlined" style="font-size: 1.1rem; pointer-events: none;">chevron_right</span>
          </button>
          <div class="carousel-dots">
            ${images.map((_, i) => `<div class="dot ${i === currentImgIndex ? 'active' : ''}"></div>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-details">
          <span>Talla: <strong>${product.size}</strong></span>
          <span>Medidas: <strong>${product.proportions}</strong></span>
        </div>
        <span class="product-price">${formatPrice(product.price)}</span>
        <button class="add-to-cart" data-id="${product.id}" ${isDisabled ? 'disabled' : ''} style="${isInCart ? 'border-color: var(--accent-color); color: var(--accent-color);' : ''}">
          ${btnText}
        </button>
        <div class="product-admin-actions">
          <button class="edit-product-btn" data-id="${product.id}">✏️ Editar</button>
          <button class="toggle-sold-btn" data-id="${product.id}">${product.isSold ? '🔄 Marcar Disponible' : '🚫 Marcar Vendido'}</button>
          <button class="delete-product-btn" data-id="${product.id}">🗑️ Eliminar</button>
        </div>
      </div>
    </div>
  `}).join('');
}

function handleCarousel(e) {
  if (e.target.classList.contains('carousel-btn')) {
    const isNext = e.target.classList.contains('next');
    const pid = parseInt(e.target.getAttribute('data-pid'));
    const product = products.find(p => p.id === pid);
    if (product && product.images) {
      const maxIndex = product.images.length - 1;
      if (isNext) {
        carouselState[pid] = carouselState[pid] >= maxIndex ? 0 : carouselState[pid] + 1;
      } else {
        carouselState[pid] = carouselState[pid] <= 0 ? maxIndex : carouselState[pid] - 1;
      }
      renderProducts();
    }
  }
}

// ================================================================
// LIGHTBOX MODAL (ZOOM & CARRUSEL AMPLIADO)
// ================================================================
function openLightbox(productId, imageIndex = 0) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const images = (product.images && product.images.length > 0) ? product.images : ['/images/logo.jpg'];
  const safeIndex = Math.max(0, Math.min(imageIndex, images.length - 1));

  currentLightbox = {
    productId,
    imageIndex: safeIndex
  };

  updateLightboxUI();

  lightboxModal.classList.add('active');
  lightboxOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxModal.classList.remove('active');
  lightboxOverlay.classList.remove('active');
  document.body.style.overflow = '';

  // Synchronize card carousel to current image viewed in lightbox
  if (currentLightbox.productId) {
    carouselState[currentLightbox.productId] = currentLightbox.imageIndex;
    renderProducts();
  }
}

function updateLightboxUI() {
  const product = products.find(p => p.id === currentLightbox.productId);
  if (!product) return;

  const images = (product.images && product.images.length > 0) ? product.images : ['/images/logo.jpg'];
  const idx = currentLightbox.imageIndex;
  const currentImgSrc = images[idx] || images[0];

  lightboxImg.src = currentImgSrc;
  lightboxImg.alt = `${product.name} - Foto ${idx + 1}`;
  lightboxTitle.textContent = product.name;
  lightboxSize.innerHTML = `Talla: <strong>${product.size}</strong> (${product.proportions})`;
  lightboxPrice.textContent = formatPrice(product.price);

  if (images.length > 1) {
    lightboxCounter.style.display = 'block';
    lightboxCounter.textContent = `${idx + 1} / ${images.length}`;
    lightboxPrev.style.display = 'flex';
    lightboxNext.style.display = 'flex';

    // Render thumbnails
    lightboxThumbnails.innerHTML = images.map((img, i) => `
      <img src="${img}" alt="Miniatura ${i + 1}" class="lightbox-thumb ${i === idx ? 'active' : ''}" data-index="${i}">
    `).join('');
  } else {
    lightboxCounter.style.display = 'none';
    lightboxPrev.style.display = 'none';
    lightboxNext.style.display = 'none';
    lightboxThumbnails.innerHTML = '';
  }
}

function nextLightboxImage() {
  const product = products.find(p => p.id === currentLightbox.productId);
  if (!product || !product.images || product.images.length <= 1) return;

  const total = product.images.length;
  currentLightbox.imageIndex = (currentLightbox.imageIndex + 1) % total;
  updateLightboxUI();

  // Also sync card state immediately
  carouselState[product.id] = currentLightbox.imageIndex;
}

function prevLightboxImage() {
  const product = products.find(p => p.id === currentLightbox.productId);
  if (!product || !product.images || product.images.length <= 1) return;

  const total = product.images.length;
  currentLightbox.imageIndex = (currentLightbox.imageIndex - 1 + total) % total;
  updateLightboxUI();

  // Also sync card state immediately
  carouselState[product.id] = currentLightbox.imageIndex;
}

// ================================================================
// EVENT LISTENERS
// ================================================================
function setupEventListeners() {
  cartToggle.addEventListener('click', toggleCart);
  closeCart.addEventListener('click', toggleCart);
  cartOverlay.addEventListener('click', toggleCart);

  // Lightbox controls
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxOverlay.addEventListener('click', closeLightbox);
  lightboxNext.addEventListener('click', nextLightboxImage);
  lightboxPrev.addEventListener('click', prevLightboxImage);

  // Lightbox thumbnail navigation
  lightboxThumbnails.addEventListener('click', (e) => {
    const thumb = e.target.closest('.lightbox-thumb');
    if (thumb) {
      const idx = parseInt(thumb.getAttribute('data-index'));
      currentLightbox.imageIndex = idx;
      if (currentLightbox.productId) {
        carouselState[currentLightbox.productId] = idx;
      }
      updateLightboxUI();
    }
  });

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
  window.addEventListener('keydown', (e) => {
    if (lightboxModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextLightboxImage();
      } else if (e.key === 'ArrowLeft') {
        prevLightboxImage();
      }
    }
  });

  // Admin open with auth
  openAdminBtn.addEventListener('click', () => {
    if (document.body.classList.contains('admin-mode')) {
      openAdminForNew();
      return;
    }
    openLoginModal();
  });
  closeAdminBtn.addEventListener('click', closeAdmin);
  adminOverlay.addEventListener('click', closeAdmin);
  logoutAdminBtn.addEventListener('click', logoutAdmin);
  closeLoginBtn.addEventListener('click', closeLoginModal);
  loginOverlay.addEventListener('click', closeLoginModal);
  loginForm.addEventListener('submit', handleLogin);

  // File input: show selected filenames
  fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    if (files.length === 0) {
      fileNameDisplay.textContent = 'Ningún archivo seleccionado';
      pendingImages = [];
      return;
    }
    // Show file names
    const names = Array.from(files).map(f => f.name);
    fileNameDisplay.innerHTML = names.map(n => `<span class="file-tag">${n}</span>`).join('');

    // Compress and store
    await processSelectedFiles(files);
  });

  // Admin form submit
  addProductForm.addEventListener('submit', handleAddProduct);

  scrollBtn.addEventListener('click', () => {
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  });

  // Product Grid interactions
  productGrid.addEventListener('click', (e) => {
    const target = e.target;

    // Carousel buttons (prevent opening lightbox)
    if (target.classList.contains('carousel-btn') || target.closest('.carousel-btn')) {
      const btn = target.classList.contains('carousel-btn') ? target : target.closest('.carousel-btn');
      handleCarousel({ target: btn });
      return;
    }

    // Dot indicators (prevent opening lightbox)
    if (target.classList.contains('dot')) {
      return;
    }

    // Click on image / slide or carousel container -> Open Lightbox
    const slide = target.closest('.carousel-slide');
    if (slide) {
      const pid = parseInt(slide.getAttribute('data-pid'));
      const idx = parseInt(slide.getAttribute('data-index') || (carouselState[pid] || 0));
      openLightbox(pid, idx);
      return;
    }

    const container = target.closest('.carousel-container');
    if (container) {
      const pid = parseInt(container.getAttribute('data-pid'));
      const idx = carouselState[pid] || 0;
      openLightbox(pid, idx);
      return;
    }

    if (target.classList.contains('add-to-cart') && !target.disabled) {
      addToCart(parseInt(target.getAttribute('data-id')));
    }
    if (target.classList.contains('delete-product-btn')) {
      deleteProduct(parseInt(target.getAttribute('data-id')));
    }
    if (target.classList.contains('toggle-sold-btn')) {
      toggleSold(parseInt(target.getAttribute('data-id')));
    }
    if (target.classList.contains('edit-product-btn')) {
      editProduct(parseInt(target.getAttribute('data-id')));
    }
  });

  // Cart interactions
  cartItemsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      removeFromCart(parseInt(e.target.getAttribute('data-id')));
    }
  });

  // Order Modal controls
  closeOrderModalBtn.addEventListener('click', closeOrderModal);
  orderOverlay.addEventListener('click', closeOrderModal);
  orderForm.addEventListener('submit', handleOrderSubmit);

  checkoutBtn.addEventListener('click', openOrderModal);
}

// ================================================================
// ADMIN LOGIN
// ================================================================
function openLoginModal() {
  loginForm.reset();
  loginError.hidden = true;
  loginModal.classList.add('active');
  loginOverlay.classList.add('active');
  loginUserInput.focus();
}

function closeLoginModal() {
  loginModal.classList.remove('active');
  loginOverlay.classList.remove('active');
  loginError.hidden = true;
}

function handleLogin(e) {
  e.preventDefault();
  const user = loginUserInput.value.trim();
  const pass = loginPassInput.value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    document.body.classList.add('admin-mode');
    openAdminBtn.textContent = '[ + AGREGAR PRODUCTO ]';
    closeLoginModal();
    renderProducts();
    return;
  }

  loginError.hidden = false;
  loginPassInput.value = '';
  loginPassInput.focus();
}

// ================================================================
// ADMIN LOGIC
// ================================================================
function openAdminForNew() {
  // Reset form for adding a new product
  editIdField.value = '';
  addProductForm.reset();
  fileNameDisplay.textContent = 'Ningún archivo seleccionado';
  pendingImages = [];
  adminTitle.textContent = '[ AGREGAR PRODUCTO ]';
  adminSubmitBtn.textContent = '[ GUARDAR EN CATÁLOGO ]';
  adminModal.classList.add('active');
  adminOverlay.classList.add('active');
}

function closeAdmin() {
  adminModal.classList.remove('active');
  adminOverlay.classList.remove('active');
}

function logoutAdmin() {
  document.body.classList.remove('admin-mode');
  openAdminBtn.textContent = '[ ADMIN PANEL ]';
  closeAdmin();
  closeLoginModal();
  renderProducts();
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Fill form with existing data
  editIdField.value = product.id;
  document.getElementById('p-name').value = product.name;
  document.getElementById('p-size').value = product.size;
  document.getElementById('p-proportions').value = product.proportions;
  document.getElementById('p-price').value = product.price;

  // Show existing images as tags
  if (product.images && product.images.length > 0) {
    const existingNames = product.images.map((img, i) => {
      const name = img.startsWith('data:') ? `Foto ${i + 1} (guardada)` : img.split('/').pop();
      return `<span class="file-tag">${name}</span>`;
    });
    fileNameDisplay.innerHTML = existingNames.join('');
  }
  pendingImages = []; // Will keep old images unless new ones are selected

  adminTitle.textContent = '[ EDITAR PRODUCTO ]';
  adminSubmitBtn.textContent = '[ ACTUALIZAR PRODUCTO ]';
  adminModal.classList.add('active');
  adminOverlay.classList.add('active');
}

function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Seguro que quieres eliminar "${product.name}" del catálogo?`)) return;

  products = products.filter(p => p.id !== id);
  // Also remove from cart if present
  cart = cart.filter(item => item.id !== id);
  saveCart();
  saveCatalog();
  updateCartUI();
  renderProducts();
}

function toggleSold(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  product.isSold = !product.isSold;

  // Remove from cart if now sold
  if (product.isSold) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
  }
  saveCatalog();
  renderProducts();
}

async function handleAddProduct(e) {
  e.preventDefault();

  const name = document.getElementById('p-name').value;
  const size = document.getElementById('p-size').value;
  const proportions = document.getElementById('p-proportions').value;
  const price = parseInt(document.getElementById('p-price').value);
  const editId = editIdField.value;

  // If new files were selected, use them; otherwise keep existing (for edit)
  let finalImages;
  if (pendingImages.length > 0) {
    finalImages = pendingImages;
  } else if (editId) {
    // Editing: keep existing images
    const existing = products.find(p => p.id === parseInt(editId));
    finalImages = existing ? existing.images : ['/images/logo.jpg'];
  } else {
    // New product without images
    alert('Por favor selecciona al menos una foto para el producto.');
    return;
  }

  if (editId) {
    // UPDATE existing product
    const idx = products.findIndex(p => p.id === parseInt(editId));
    if (idx !== -1) {
      products[idx].name = name;
      products[idx].size = size;
      products[idx].proportions = proportions;
      products[idx].price = price;
      products[idx].images = finalImages;
    }
  } else {
    // CREATE new product
    const newProduct = {
      id: Date.now(),
      name,
      size,
      proportions,
      price,
      images: finalImages,
      isSold: false
    };
    products.unshift(newProduct);
  }

  saveCatalog();
  addProductForm.reset();
  fileNameDisplay.textContent = 'Ningún archivo seleccionado';
  pendingImages = [];
  editIdField.value = '';
  closeAdmin();
  renderProducts();

  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

// ================================================================
// CART LOGIC
// ================================================================
function toggleCart() {
  cartSidebar.classList.toggle('active');
  cartOverlay.classList.toggle('active');
}

function addToCart(id) {
  if (cart.some(item => item.id === id)) return;
  const product = products.find(p => p.id === id);
  if (product && !product.isSold) {
    cart.push({ ...product, cartId: Date.now() });
    saveCart();
    updateCartUI();
    renderProducts();
    if (!cartSidebar.classList.contains('active')) {
      toggleCart();
    }
  }
}

function removeFromCart(cartId) {
  cart = cart.filter(item => item.cartId !== cartId);
  saveCart();
  updateCartUI();
  renderProducts();
}

function saveCart() {
  localStorage.setItem('ditto_cart', JSON.stringify(cart));
}

function loadCart() {
  const saved = localStorage.getItem('ditto_cart');
  if (saved) {
    cart = JSON.parse(saved);
    cart = cart.filter(cartItem => {
      const catalogItem = products.find(p => p.id === cartItem.id);
      return catalogItem && !catalogItem.isSold;
    });
    updateCartUI();
  }
}

function updateCartUI() {
  cartCount.textContent = cart.length;
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Vacío.</div>';
    checkoutBtn.disabled = true;
    cartTotalPrice.textContent = '$0';
    return;
  }
  checkoutBtn.disabled = false;
  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.images && item.images.length > 0 ? item.images[0] : '/images/logo.jpg'}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
        <button class="remove-item" data-id="${item.cartId}">[ QUITAR ]</button>
      </div>
    </div>
  `).join('');
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalPrice.textContent = formatPrice(total);
}

// ================================================================
// CHECKOUT & INSTAGRAM ORDER FORM
// ================================================================
function openOrderModal() {
  if (cart.length === 0) return;

  // Close cart sidebar
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  // Render product summary in order modal
  orderSummaryBox.innerHTML = `
    ${cart.map((item, idx) => `
      <div class="order-summary-item">
        <div class="order-item-left">
          <span class="order-item-title">${idx + 1}. ${item.name}</span>
          <span class="order-item-sub">Talla: <strong>${item.size}</strong> | Medidas: ${item.proportions}</span>
        </div>
        <span class="order-item-price">${formatPrice(item.price)}</span>
      </div>
    `).join('')}
    <div class="order-summary-total">
      <span>TOTAL DE LA VENTA:</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;

  orderModal.classList.add('active');
  orderOverlay.classList.add('active');
}

function closeOrderModal() {
  orderModal.classList.remove('active');
  orderOverlay.classList.remove('active');
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  if (cart.length === 0) return;

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const name = orderNameInput.value.trim() || '____________________';
  const rut = orderRutInput.value.trim() || '____________________';
  const phone = orderPhoneInput.value.trim() || '____________________';
  const city = orderCityInput.value.trim() || '____________________';
  const address = orderAddressInput.value.trim() || '____________________';

  // Build complete structured purchase form message
  let message = `📋 FORMULARIO DE COMPRA - DITTO MARKET\n`;
  message += `════════════════════════════════\n\n`;
  message += `🛍️ PRENDAS SOLICITADAS:\n\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}️⃣ ${item.name}\n`;
    message += `   • Talla: ${item.size}\n`;
    message += `   • Medidas: ${item.proportions}\n`;
    message += `   • Valor: ${formatPrice(item.price)}\n\n`;
  });

  message += `────────────────────────────────\n`;
  message += `💰 TOTAL DE LA VENTA: ${formatPrice(total)}\n`;
  message += `────────────────────────────────\n\n`;
  message += `📦 DATOS DE ENVÍO (STARKEN):\n`;
  message += `• Nombre Completo: ${name}\n`;
  message += `• RUT: ${rut}\n`;
  message += `• Teléfono / WhatsApp: ${phone}\n`;
  message += `• Ciudad / Comuna: ${city}\n`;
  message += `• Sucursal Starken o Domicilio: ${address}\n`;
  message += `• Medio de Pago: Transferencia Bancaria\n\n`;
  message += `¡Hola Ditto Market! Vengo desde el catálogo web y deseo comprar estas piezas. ¿Me confirmas disponibilidad y datos de transferencia? 🙌`;

  try {
    await navigator.clipboard.writeText(message);
    const originalText = orderSubmitBtn.innerText;
    orderSubmitBtn.innerText = '¡PEDIDO COPIADO! ABRIENDO INSTAGRAM...';
    orderSubmitBtn.style.background = '#008800';
    orderSubmitBtn.style.borderColor = '#008800';
    orderSubmitBtn.style.color = '#fff';

    setTimeout(() => {
      window.open('https://ig.me/m/dittomarkett', '_blank');
      orderSubmitBtn.innerText = originalText;
      orderSubmitBtn.style.background = '';
      orderSubmitBtn.style.borderColor = '';
      orderSubmitBtn.style.color = '';
      closeOrderModal();
    }, 1200);
  } catch (err) {
    // Fallback if clipboard API is blocked
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = message;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);

    window.open('https://ig.me/m/dittomarkett', '_blank');
    closeOrderModal();
  }
}

init();
