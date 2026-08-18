import './style.css';
import { supabase, isSupabaseConfigured } from './src/supabase.js';

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
const orderEmailInput = document.getElementById('order-email');
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
async function init() {
  loadCart();
  await loadCatalog();
  setupEventListeners();
  setupRealtime();
}

function setupRealtime() {
  if (!isSupabaseConfigured || !supabase) return;
  supabase
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      await loadCatalog(true);
    })
    .subscribe();
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
}

// ================================================================
// CATALOG PERSISTENCE
// ================================================================
async function loadCatalog(skipLocalSeed = false) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        products = data;
        renderProducts();
        return;
      } else if (!skipLocalSeed) {
        // If DB is empty, check if we have local items or default products to migrate
        const saved = localStorage.getItem('ditto_catalog');
        const initial = saved ? JSON.parse(saved) : defaultProducts;
        products = initial;
        renderProducts();
        return;
      }
    } catch (err) {
      console.warn('Error loading from Supabase, falling back to localStorage:', err);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('ditto_catalog');
  if (saved) {
    products = JSON.parse(saved);
  } else {
    products = [...defaultProducts];
    saveCatalog();
  }
  renderProducts();
}

function saveCatalog() {
  try {
    localStorage.setItem('ditto_catalog', JSON.stringify(products));
  } catch (e) {
    console.warn('Local storage quota exceeded');
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
  if (closeOrderModalBtn) closeOrderModalBtn.addEventListener('click', closeOrderModal);
  if (orderOverlay) orderOverlay.addEventListener('click', closeOrderModal);
  if (orderForm) orderForm.addEventListener('submit', handleOrderSubmit);

  if (checkoutBtn) checkoutBtn.addEventListener('click', openOrderModal);
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

async function deleteProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Seguro que quieres eliminar "${product.name}" del catálogo?`)) return;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('Error deleting from Supabase:', error);
    } catch (err) {
      console.error('Supabase delete error:', err);
    }
  }

  products = products.filter(p => p.id !== id);
  // Also remove from cart if present
  cart = cart.filter(item => item.id !== id);
  saveCart();
  saveCatalog();
  updateCartUI();
  renderProducts();
}

async function toggleSold(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  product.isSold = !product.isSold;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('products').update({ isSold: product.isSold }).eq('id', id);
      if (error) console.error('Error updating sold status in Supabase:', error);
    } catch (err) {
      console.error('Supabase update error:', err);
    }
  }

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
    const targetId = parseInt(editId);
    const updatedData = {
      name,
      size,
      proportions,
      price,
      images: finalImages
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('products').update(updatedData).eq('id', targetId);
        if (error) console.error('Error updating product in Supabase:', error);
      } catch (err) {
        console.error('Supabase update error:', err);
      }
    }

    const idx = products.findIndex(p => p.id === targetId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updatedData };
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('products').insert([newProduct]);
        if (error) console.error('Error adding product in Supabase:', error);
      } catch (err) {
        console.error('Supabase insert error:', err);
      }
    }

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

    // Subtle feedback animation on the cart button
    if (cartToggle) {
      cartToggle.classList.add('cart-bump');
      setTimeout(() => cartToggle.classList.remove('cart-bump'), 300);
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

// ================================================================
// FORM VALIDATIONS & HELPERS
// ================================================================
function validateChileanRut(rutStr) {
  const clean = rutStr.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 7 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expected = 11 - (sum % 11);
  const calculatedDv = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();
  return dv === calculatedDv;
}

function formatRut(rutStr) {
  const clean = rutStr.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // Format body with dots
  let formattedBody = '';
  for (let i = body.length - 1, j = 1; i >= 0; i--, j++) {
    formattedBody = body[i] + formattedBody;
    if (j % 3 === 0 && i !== 0) formattedBody = '.' + formattedBody;
  }
  return `${formattedBody}-${dv}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function validatePhone(phone) {
  const clean = phone.replace(/[^0-9+]/g, '');
  // Chilean format: +569XXXXXXXX, 9XXXXXXXX, or 8-9 digits
  return clean.length >= 8 && clean.length <= 13;
}

function showFieldError(inputElement, message) {
  if (!inputElement) return;
  inputElement.classList.add('input-error');
  const parent = inputElement.closest('.form-group') || inputElement.parentElement;
  let errorElem = parent.querySelector('.field-error-msg');
  if (!errorElem) {
    errorElem = document.createElement('span');
    errorElem.className = 'field-error-msg';
    parent.appendChild(errorElem);
  }
  errorElem.textContent = message;
}

function clearFieldErrors() {
  if (!orderForm) return;
  orderForm.querySelectorAll('.input-error').forEach(input => input.classList.remove('input-error'));
  orderForm.querySelectorAll('.field-error-msg').forEach(msg => msg.remove());
}

// Live error clearance on typing
if (orderForm) {
  orderForm.addEventListener('input', (e) => {
    if (e.target && e.target.classList.contains('input-error')) {
      e.target.classList.remove('input-error');
      const parent = e.target.closest('.form-group') || e.target.parentElement;
      const errorElem = parent?.querySelector('.field-error-msg');
      if (errorElem) errorElem.remove();
    }
  });

  // Auto-format RUT field on blur/input
  if (orderRutInput) {
    orderRutInput.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (val.length >= 7) {
        e.target.value = formatRut(val);
      }
    });
  }
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  if (cart.length === 0) return;

  clearFieldErrors();

  const nameVal = (orderNameInput && orderNameInput.value.trim()) || '';
  const emailVal = (orderEmailInput && orderEmailInput.value.trim()) || '';
  const rutVal = (orderRutInput && orderRutInput.value.trim()) || '';
  const phoneVal = (orderPhoneInput && orderPhoneInput.value.trim()) || '';
  const cityVal = (orderCityInput && orderCityInput.value.trim()) || '';
  const addressVal = (orderAddressInput && orderAddressInput.value.trim()) || '';

  let hasErrors = false;

  // 1. Name validation
  if (!nameVal || nameVal.length < 3) {
    showFieldError(orderNameInput, 'Ingresa tu nombre y apellido');
    hasErrors = true;
  }

  // 2. Email validation
  if (!emailVal || !validateEmail(emailVal)) {
    showFieldError(orderEmailInput, 'Ingresa un correo electrónico válido (ej: nombre@gmail.com)');
    hasErrors = true;
  }

  // 3. RUT validation
  if (!rutVal || !validateChileanRut(rutVal)) {
    showFieldError(orderRutInput, 'Ingresa un RUT chileno válido (ej: 12.345.678-9)');
    hasErrors = true;
  }

  // 4. Phone validation
  if (!phoneVal || !validatePhone(phoneVal)) {
    showFieldError(orderPhoneInput, 'Ingresa un teléfono o WhatsApp válido (ej: +56 9 1234 5678)');
    hasErrors = true;
  }

  // 5. City validation
  if (!cityVal || cityVal.length < 3) {
    showFieldError(orderCityInput, 'Ingresa tu ciudad o comuna');
    hasErrors = true;
  }

  // 6. Address validation
  if (!addressVal || addressVal.length < 4) {
    showFieldError(orderAddressInput, 'Ingresa tu dirección completa o sucursal Starken');
    hasErrors = true;
  }

  if (hasErrors) {
    // Focus first invalid input
    const firstInvalid = orderForm.querySelector('.input-error');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const formattedRut = formatRut(rutVal);
  const total = cart.reduce((sum, item) => sum + item.price, 0);

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
  message += `• Nombre Completo: ${nameVal}\n`;
  message += `• Correo Electrónico: ${emailVal}\n`;
  message += `• RUT: ${formattedRut}\n`;
  message += `• Teléfono / WhatsApp: ${phoneVal}\n`;
  message += `• Ciudad / Comuna: ${cityVal}\n`;
  message += `• Sucursal Starken o Domicilio: ${addressVal}\n`;
  message += `• Medio de Pago: Transferencia Bancaria\n\n`;
  message += `¡Hola Ditto! Vengo desde el catálogo web y deseo comprar estas piezas. ¿Me confirmas disponibilidad y datos de transferencia? 🙌`;

  // Copy to clipboard immediately
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
    } else {
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = message;
      tempTextArea.style.position = 'fixed';
      tempTextArea.style.left = '-999999px';
      tempTextArea.style.top = '-999999px';
      document.body.appendChild(tempTextArea);
      tempTextArea.focus();
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
    }
  } catch (err) {
    console.warn('Clipboard write fallback:', err);
  }

  // Open Instagram immediately in direct user interaction context
  window.open('https://ig.me/m/dittomarkett', '_blank');
  closeOrderModal();
}

init();

