import './style.css';
import { supabase, isSupabaseConfigured } from './src/supabase.js';

// ============================================================
// CONFIGURACIÓN DEL ADMINISTRADOR
// Cambia estos valores para modificar el usuario y contraseña
// ============================================================
const ADMIN_USER = 'ditto';
const ADMIN_PASS = '1234';
// ============================================================

const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'poleras', label: 'Poleras' },
  { id: 'polerones', label: 'Polerones' },
  { id: 'pantalones', label: 'Pantalones' },
  { id: 'chaquetas', label: 'Chaquetas' },
  { id: 'calzado', label: 'Calzado' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'otro', label: 'Otros' }
];

const VALID_CATEGORY_IDS = PRODUCT_CATEGORIES.filter(c => c.id !== 'all').map(c => c.id);

// Default initial catalog (used only the first time)
const defaultProducts = [
  {
    id: 1,
    name: 'Vintage Carhartt Detroit Jacket',
    category: 'chaquetas',
    size: 'L',
    proportions: '68x62 cm',
    price: 75000,
    images: ['/images/hoodie.jpg'],
    isSold: false
  },
  {
    id: 2,
    name: 'Pantalón Parachute Y2K Faded',
    category: 'pantalones',
    size: '34x32',
    proportions: '44cm cintura',
    price: 45000,
    images: ['/images/jeans.jpg'],
    isSold: false
  },
  {
    id: 3,
    name: 'Polera Gráfica Bandas 90s',
    category: 'poleras',
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
let activeCategory = 'all';
let gridColumns = 4;

// DOM Elements
const productGrid = document.getElementById('product-grid');
const categoryFilters = document.getElementById('category-filters');
const gridSizeButtons = document.querySelectorAll('.grid-size-btn');
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
const orderAddressStarkenInput = document.getElementById('order-address-starken');
const orderSubmitBtn = document.getElementById('order-submit-btn');

// Delivery mode state: 'domicilio' | 'sucursal'
let deliveryMode = 'domicilio';
let selectedStarkenBranch = null;

// ================================================================
// STARKEN BRANCHES DATA
// ================================================================
const STARKEN_BRANCHES = [
  // REGION METROPOLITANA
  { name: 'Starken Santiago Centro', city: 'Santiago', address: 'Monjitas 392, Santiago', lat: -33.4372, lng: -70.6506 },
  { name: 'Starken Providencia', city: 'Providencia', address: 'Av. Providencia 1991, Providencia', lat: -33.4292, lng: -70.6108 },
  { name: 'Starken Las Condes', city: 'Las Condes', address: 'Av. Apoquindo 4800, Las Condes', lat: -33.4117, lng: -70.5750 },
  { name: 'Starken Nunoa', city: 'Nunoa', address: 'Av. Irarrazaval 1890, Nunoa', lat: -33.4572, lng: -70.6102 },
  { name: 'Starken La Florida', city: 'La Florida', address: 'Av. Vicuna Mackenna 7700, La Florida', lat: -33.5253, lng: -70.5944 },
  { name: 'Starken Maipu', city: 'Maipu', address: 'Av. Pajaritos 3939, Maipu', lat: -33.5139, lng: -70.7678 },
  { name: 'Starken Pudahuel', city: 'Pudahuel', address: 'Av. El Sol 670, Pudahuel', lat: -33.4406, lng: -70.7555 },
  { name: 'Starken Quilicura', city: 'Quilicura', address: 'Av. Manuel Antonio Matta 1855, Quilicura', lat: -33.3656, lng: -70.7303 },
  { name: 'Starken San Bernardo', city: 'San Bernardo', address: 'Av. Presidente Alessandri 4001, San Bernardo', lat: -33.5943, lng: -70.6997 },
  { name: 'Starken Puente Alto', city: 'Puente Alto', address: 'Av. Concha y Toro 1055, Puente Alto', lat: -33.6109, lng: -70.5763 },
  { name: 'Starken Penalolen', city: 'Penalolen', address: 'Av. Grecia 7801, Penalolen', lat: -33.4809, lng: -70.5480 },
  { name: 'Starken Recoleta', city: 'Recoleta', address: 'Av. Recoleta 2345, Recoleta', lat: -33.4006, lng: -70.6398 },
  { name: 'Starken Estacion Central', city: 'Estacion Central', address: 'Av. Alameda 3242, Estacion Central', lat: -33.4548, lng: -70.6839 },
  { name: 'Starken La Cisterna', city: 'La Cisterna', address: 'Av. Lo Ovalle 1235, La Cisterna', lat: -33.5318, lng: -70.6626 },
  { name: 'Starken Renca', city: 'Renca', address: 'Av. Eduardo Frei 6220, Renca', lat: -33.4044, lng: -70.7266 },
  { name: 'Starken Penaflor', city: 'Penaflor', address: 'Av. Bernardo OHiggins 691, Penaflor', lat: -33.6144, lng: -70.8814 },
  { name: 'Starken Melipilla', city: 'Melipilla', address: 'Av. OHiggins 520, Melipilla', lat: -33.6886, lng: -71.2137 },
  // VALPARAISO / VINA
  { name: 'Starken Valparaiso', city: 'Valparaiso', address: 'Av. Argentina 68, Valparaiso', lat: -33.0453, lng: -71.6205 },
  { name: 'Starken Vina del Mar', city: 'Vina del Mar', address: 'Av. Libertad 770, Vina del Mar', lat: -33.0245, lng: -71.5518 },
  { name: 'Starken Quilpue', city: 'Quilpue', address: 'Av. Los Carrera 600, Quilpue', lat: -33.0480, lng: -71.4428 },
  { name: 'Starken Villa Alemana', city: 'Villa Alemana', address: 'Av. Vina del Mar 95, Villa Alemana', lat: -33.0420, lng: -71.3742 },
  { name: 'Starken San Antonio', city: 'San Antonio', address: 'Av. Barros Luco 30, San Antonio', lat: -33.5936, lng: -71.6202 },
  { name: 'Starken La Calera', city: 'La Calera', address: 'Av. Latorre 1510, La Calera', lat: -32.7887, lng: -71.1982 },
  { name: 'Starken Los Andes', city: 'Los Andes', address: 'Av. Santa Rosa 285, Los Andes', lat: -32.8350, lng: -70.5983 },
  // OHIGGINS
  { name: 'Starken Rancagua', city: 'Rancagua', address: 'Av. Espana 660, Rancagua', lat: -34.1703, lng: -70.7444 },
  { name: 'Starken San Fernando', city: 'San Fernando', address: 'Manso de Velasco 980, San Fernando', lat: -34.5853, lng: -70.9899 },
  // MAULE
  { name: 'Starken Talca', city: 'Talca', address: 'Av. Las Heras 190, Talca', lat: -35.4264, lng: -71.6554 },
  { name: 'Starken Curico', city: 'Curico', address: 'Pena 730, Curico', lat: -34.9853, lng: -71.2390 },
  { name: 'Starken Linares', city: 'Linares', address: 'Av. Valentin Letelier 575, Linares', lat: -35.8459, lng: -71.5960 },
  // NUBLE / BIO-BIO
  { name: 'Starken Chillan', city: 'Chillan', address: 'Av. Arauco 541, Chillan', lat: -36.6064, lng: -72.1034 },
  { name: 'Starken Concepcion', city: 'Concepcion', address: 'Caupolican 521, Concepcion', lat: -36.8270, lng: -73.0498 },
  { name: 'Starken Talcahuano', city: 'Talcahuano', address: 'Av. Colon 550, Talcahuano', lat: -36.7242, lng: -73.1174 },
  { name: 'Starken Coronel', city: 'Coronel', address: 'Av. Alessandri 1200, Coronel', lat: -37.0268, lng: -73.1501 },
  { name: 'Starken Los Angeles', city: 'Los Angeles', address: 'Av. Ricardo Vicuna 301, Los Angeles', lat: -37.4702, lng: -72.3536 },
  // ARAUCANIA
  { name: 'Starken Temuco', city: 'Temuco', address: 'Av. Balmaceda 755, Temuco', lat: -38.7359, lng: -72.5904 },
  { name: 'Starken Villarrica', city: 'Villarrica', address: 'Av. Pedro de Valdivia 950, Villarrica', lat: -39.2847, lng: -72.2282 },
  { name: 'Starken Pucon', city: 'Pucon', address: 'Av. OHiggins 190, Pucon', lat: -39.2722, lng: -71.9801 },
  { name: 'Starken Angol', city: 'Angol', address: 'Av. Lautaro 290, Angol', lat: -37.7961, lng: -72.7083 },
  // LOS RIOS
  { name: 'Starken Valdivia', city: 'Valdivia', address: 'Av. Ramon Picarte 370, Valdivia', lat: -39.8196, lng: -73.2452 },
  { name: 'Starken La Union', city: 'La Union', address: 'Av. Yungay 700, La Union', lat: -40.2928, lng: -73.0854 },
  // LOS LAGOS
  { name: 'Starken Puerto Montt', city: 'Puerto Montt', address: 'Av. Diego Portales 1290, Puerto Montt', lat: -41.4693, lng: -72.9421 },
  { name: 'Starken Osorno', city: 'Osorno', address: 'Av. Matta 570, Osorno', lat: -40.5739, lng: -73.1400 },
  { name: 'Starken Puerto Varas', city: 'Puerto Varas', address: 'Del Salvador 257, Puerto Varas', lat: -41.3175, lng: -72.9861 },
  { name: 'Starken Castro Chiloe', city: 'Castro', address: 'Av. San Martin 780, Castro (Chiloe)', lat: -42.4784, lng: -73.7601 },
  { name: 'Starken Ancud Chiloe', city: 'Ancud', address: 'Av. Ramirez 258, Ancud (Chiloe)', lat: -41.8702, lng: -73.8262 },
  // AYSEN
  { name: 'Starken Coyhaique', city: 'Coyhaique', address: 'Av. Simpson 430, Coyhaique', lat: -45.5712, lng: -72.0685 },
  // MAGALLANES
  { name: 'Starken Punta Arenas', city: 'Punta Arenas', address: 'Av. Espana 1385, Punta Arenas', lat: -53.1638, lng: -70.9171 },
  // COQUIMBO / ATACAMA
  { name: 'Starken La Serena', city: 'La Serena', address: 'Av. Francisco de Aguirre 1270, La Serena', lat: -29.9044, lng: -71.2488 },
  { name: 'Starken Coquimbo', city: 'Coquimbo', address: 'Av. Videla 150, Coquimbo', lat: -29.9566, lng: -71.3395 },
  { name: 'Starken Ovalle', city: 'Ovalle', address: 'Av. Libertad 498, Ovalle', lat: -30.6023, lng: -71.1993 },
  { name: 'Starken Copiapo', city: 'Copiapo', address: 'Av. Copayapu 745, Copiapo', lat: -27.3668, lng: -70.3325 },
  { name: 'Starken Vallenar', city: 'Vallenar', address: 'Av. Merced 540, Vallenar', lat: -28.5705, lng: -70.7592 },
  // TARAPACA / ANTOFAGASTA
  { name: 'Starken Iquique', city: 'Iquique', address: 'Av. Heroes de la Concepcion 1300, Iquique', lat: -20.2208, lng: -70.1431 },
  { name: 'Starken Alto Hospicio', city: 'Alto Hospicio', address: 'Av. Camino Colchane 2340, Alto Hospicio', lat: -20.2695, lng: -70.1003 },
  { name: 'Starken Antofagasta', city: 'Antofagasta', address: 'Av. Balmaceda 2460, Antofagasta', lat: -23.6509, lng: -70.3975 },
  { name: 'Starken Calama', city: 'Calama', address: 'Av. Granaderos 2580, Calama', lat: -22.4564, lng: -68.9248 },
  // ARICA
  { name: 'Starken Arica', city: 'Arica', address: 'Av. Pedro Montt 820, Arica', lat: -18.4783, lng: -70.3126 },
];

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
// IMAGE COMPRESSION & PREVIEW
// ================================================================
function compressImage(file, maxWidth = 900, quality = 0.82) {
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

        // Export as WebP Base64 (lighter than JPEG for web)
        const dataUrl = canvas.toDataURL('image/webp', quality);
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
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('image-preview-grid');
  const placeholder = document.getElementById('file-name-display');
  if (!container) return;

  if (pendingImages.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    if (placeholder) placeholder.textContent = 'Ningún archivo seleccionado';
    return;
  }

  if (placeholder) placeholder.style.display = 'none';
  container.style.display = 'grid';

  container.innerHTML = pendingImages.map((src, i) => `
    <div class="img-preview-item" data-index="${i}">
      <img src="${src}" alt="Vista previa ${i + 1}" class="img-preview-thumb">
      <div class="img-preview-badge">${i + 1}</div>
      <div class="img-preview-actions">
        <button type="button" class="img-prev-btn" data-index="${i}" title="Mover antes" ${i === 0 ? 'disabled' : ''}>
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <button type="button" class="img-remove-btn" data-index="${i}" title="Eliminar">
          <span class="material-symbols-outlined">close</span>
        </button>
        <button type="button" class="img-next-btn" data-index="${i}" title="Mover después" ${i === pendingImages.length - 1 ? 'disabled' : ''}>
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  `).join('');

  // Event delegation on the preview grid
  container.onclick = (e) => {
    const prevBtn = e.target.closest('.img-prev-btn');
    const nextBtn = e.target.closest('.img-next-btn');
    const removeBtn = e.target.closest('.img-remove-btn');

    if (prevBtn && !prevBtn.disabled) {
      const idx = parseInt(prevBtn.getAttribute('data-index'));
      [pendingImages[idx - 1], pendingImages[idx]] = [pendingImages[idx], pendingImages[idx - 1]];
      renderImagePreviews();
    } else if (nextBtn && !nextBtn.disabled) {
      const idx = parseInt(nextBtn.getAttribute('data-index'));
      [pendingImages[idx], pendingImages[idx + 1]] = [pendingImages[idx + 1], pendingImages[idx]];
      renderImagePreviews();
    } else if (removeBtn) {
      const idx = parseInt(removeBtn.getAttribute('data-index'));
      pendingImages.splice(idx, 1);
      renderImagePreviews();
    }
  };
}

// ================================================================
// INITIALIZE
// ================================================================
async function init() {
  loadViewPreferences();
  await loadCatalog();   // productos primero
  loadCart();            // carrito después (necesita el catálogo para validar)
  restoreAdminSession(); // restaurar sesión de admin si estaba activa
  renderCategoryFilters();
  applyGridColumns();
  setupEventListeners();
  setupRealtime();
}

function loadViewPreferences() {
  const savedCategory = localStorage.getItem('ditto_category_filter');
  const savedCols = localStorage.getItem('ditto_grid_columns');
  if (savedCategory && (savedCategory === 'all' || VALID_CATEGORY_IDS.includes(savedCategory))) {
    activeCategory = savedCategory;
  }
  const cols = parseInt(savedCols, 10);
  if ([2, 3, 4].includes(cols)) {
    gridColumns = cols;
  }
}

function normalizeCategory(category) {
  return VALID_CATEGORY_IDS.includes(category) ? category : 'otro';
}

function getCategoryLabel(categoryId) {
  const match = PRODUCT_CATEGORIES.find(c => c.id === categoryId);
  return match ? match.label : 'Otros';
}

function getFilteredProducts() {
  if (activeCategory === 'all') return products;
  return products.filter(product => normalizeCategory(product.category) === activeCategory);
}

function applyGridColumns() {
  productGrid.classList.remove('grid-cols-2', 'grid-cols-3', 'grid-cols-4');
  productGrid.classList.add(`grid-cols-${gridColumns}`);
  gridSizeButtons.forEach(btn => {
    const isActive = parseInt(btn.getAttribute('data-cols'), 10) === gridColumns;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function renderCategoryFilters() {
  if (!categoryFilters) return;
  categoryFilters.innerHTML = PRODUCT_CATEGORIES.map(({ id, label }) => `
    <button
      type="button"
      class="category-filter-btn ${activeCategory === id ? 'active' : ''}"
      data-category="${id}"
      aria-pressed="${activeCategory === id ? 'true' : 'false'}"
    >${label}</button>
  `).join('');
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
        products = data.map(product => ({
          ...product,
          category: normalizeCategory(product.category)
        }));
        renderProducts();
        return;
      } else if (!skipLocalSeed) {
        // If DB is empty, check if we have local items or default products to migrate
        const saved = localStorage.getItem('ditto_catalog');
        const initial = saved ? JSON.parse(saved) : defaultProducts;
        products = initial.map(product => ({
          ...product,
          category: normalizeCategory(product.category)
        }));
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
    products = JSON.parse(saved).map(product => ({
      ...product,
      category: normalizeCategory(product.category)
    }));
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
  const visibleProducts = getFilteredProducts();

  if (products.length === 0) {
    productGrid.innerHTML = '<p class="empty-grid-msg">No hay productos aún. Usa el panel de admin para agregar.</p>';
    return;
  }

  if (visibleProducts.length === 0) {
    productGrid.innerHTML = `<p class="empty-grid-msg">No hay productos en "${getCategoryLabel(activeCategory)}".</p>`;
    return;
  }

  productGrid.innerHTML = visibleProducts.map(product => {
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
        <span class="product-category">${getCategoryLabel(normalizeCategory(product.category))}</span>
        <h3 class="product-title">${product.name}</h3>
        ${(product.size || product.proportions) ? `
          <div class="product-details">
            ${product.size ? `<span>Talla: <strong>${product.size}</strong></span>` : ''}
            ${product.proportions ? `<span>Medidas: <strong>${product.proportions}</strong></span>` : ''}
          </div>
        ` : ''}
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
  
  const metaParts = [];
  if (product.size && product.size.trim()) metaParts.push(`Talla: <strong>${product.size.trim()}</strong>`);
  if (product.proportions && product.proportions.trim()) metaParts.push(`(${product.proportions.trim()})`);
  lightboxSize.innerHTML = metaParts.join(' ');

  lightboxPrice.textContent = formatPrice(product.price);

  // Description (only shown if present)
  const lightboxDesc = document.getElementById('lightbox-description');
  if (lightboxDesc) {
    if (product.description && product.description.trim()) {
      lightboxDesc.textContent = product.description.trim();
      lightboxDesc.style.display = 'block';
    } else {
      lightboxDesc.textContent = '';
      lightboxDesc.style.display = 'none';
    }
  }

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

  // File input: compress to WebP, show previews with reorder controls
  fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    const previewGrid = document.getElementById('image-preview-grid');
    if (files.length === 0) {
      pendingImages = [];
      if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
      if (previewGrid) { previewGrid.innerHTML = ''; previewGrid.style.display = 'none'; }
      return;
    }
    if (fileNameDisplay) fileNameDisplay.style.display = 'none';
    // Compress all to WebP and show previews
    await processSelectedFiles(files);
  });

  // Admin form submit
  addProductForm.addEventListener('submit', handleAddProduct);

  // Talla: obligatoria solo para categorías de ropa (no para accesorios/otro)
  const categorySelect = document.getElementById('p-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', updateSizeFieldRequired);
  }

  scrollBtn.addEventListener('click', () => {
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  });

  if (categoryFilters) {
    categoryFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-filter-btn');
      if (!btn) return;
      activeCategory = btn.getAttribute('data-category') || 'all';
      localStorage.setItem('ditto_category_filter', activeCategory);
      renderCategoryFilters();
      renderProducts();
    });
  }

  gridSizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cols = parseInt(btn.getAttribute('data-cols'), 10);
      if (![2, 3, 4].includes(cols)) return;
      gridColumns = cols;
      localStorage.setItem('ditto_grid_columns', String(gridColumns));
      applyGridColumns();
    });
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

  // Delivery type tabs
  const deliveryTabs = document.getElementById('delivery-type-tabs');
  if (deliveryTabs) {
    deliveryTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.delivery-tab');
      if (!tab) return;
      setDeliveryMode(tab.getAttribute('data-type'));
    });
  }

  // Open Starken map modal
  const openMapBtn = document.getElementById('open-starken-map-btn');
  if (openMapBtn) openMapBtn.addEventListener('click', openStarkenMapModal);

  // Change selected Starken branch
  const changeChipBtn = document.getElementById('starken-chip-change');
  if (changeChipBtn) changeChipBtn.addEventListener('click', openStarkenMapModal);

  // Close Starken map modal
  const closeMapBtn = document.getElementById('close-starken-map');
  if (closeMapBtn) closeMapBtn.addEventListener('click', closeStarkenMapModal);
  const starkenMapOverlay = document.getElementById('starken-map-overlay');
  if (starkenMapOverlay) starkenMapOverlay.addEventListener('click', closeStarkenMapModal);

  // Starken search input
  const starkenSearch = document.getElementById('starken-search-input');
  if (starkenSearch) starkenSearch.addEventListener('input', filterStarkenBranches);
}

// ================================================================
// STARKEN MAP LOGIC
// ================================================================
let starkenMap = null;
let starkenMarkers = [];
let filteredBranches = [...STARKEN_BRANCHES];

function setDeliveryMode(mode) {
  deliveryMode = mode;
  const domicilioGroup = document.getElementById('domicilio-group');
  const sucursalGroup = document.getElementById('sucursal-group');
  const tabDomicilio = document.getElementById('tab-domicilio');
  const tabSucursal = document.getElementById('tab-sucursal');

  if (mode === 'domicilio') {
    if (domicilioGroup) domicilioGroup.style.display = '';
    if (sucursalGroup) sucursalGroup.style.display = 'none';
    if (tabDomicilio) tabDomicilio.classList.add('active');
    if (tabSucursal) tabSucursal.classList.remove('active');
    if (orderAddressInput) orderAddressInput.required = true;
  } else {
    if (domicilioGroup) domicilioGroup.style.display = 'none';
    if (sucursalGroup) sucursalGroup.style.display = '';
    if (tabDomicilio) tabDomicilio.classList.remove('active');
    if (tabSucursal) tabSucursal.classList.add('active');
    if (orderAddressInput) orderAddressInput.required = false;
  }
}

function openStarkenMapModal() {
  const modal = document.getElementById('starken-map-modal');
  const overlay = document.getElementById('starken-map-overlay');
  if (!modal || !overlay) return;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  overlay.classList.add('active');

  // Reset search
  const searchInput = document.getElementById('starken-search-input');
  if (searchInput) searchInput.value = '';
  filteredBranches = [...STARKEN_BRANCHES];

  // Init map after modal is visible (needs dimensions)
  setTimeout(() => {
    initStarkenMap();
    renderBranchList(filteredBranches);
  }, 120);
}

function closeStarkenMapModal() {
  const modal = document.getElementById('starken-map-modal');
  const overlay = document.getElementById('starken-map-overlay');
  if (!modal || !overlay) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('active');
}

function initStarkenMap() {
  // If map already initialized, just invalidate size and update markers
  if (starkenMap) {
    starkenMap.invalidateSize();
    return;
  }

  // Create custom red marker icon
  const starkenIcon = window.L ? L.divIcon({
    className: 'starken-marker',
    html: '<span class="material-symbols-outlined" style="color:#e63946;font-size:1.6rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">location_on</span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  }) : null;

  // Center on Chile
  starkenMap = L.map('starken-map', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([-35.6, -71.5], 5);

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(starkenMap);

  // Add markers for all branches
  STARKEN_BRANCHES.forEach((branch) => {
    const marker = L.marker([branch.lat, branch.lng], starkenIcon ? { icon: starkenIcon } : {})
      .addTo(starkenMap)
      .bindPopup(buildPopupContent(branch), { maxWidth: 240 });

    marker.on('click', () => {
      marker.openPopup();
      // Highlight list item
      highlightListItem(branch.name);
    });

    // Attach branch data to marker for filtering
    marker._starkenBranch = branch;
    starkenMarkers.push(marker);
  });

  // Listen for popup button clicks (event delegation on map container)
  document.getElementById('starken-map').addEventListener('click', (e) => {
    const btn = e.target.closest('.starken-select-btn');
    if (!btn) return;
    const name = btn.getAttribute('data-name');
    const branch = STARKEN_BRANCHES.find(b => b.name === name);
    if (branch) selectStarkenBranch(branch);
  });
}

function buildPopupContent(branch) {
  return `
    <div class="starken-popup">
      <div class="starken-popup-name">${branch.name}</div>
      <div class="starken-popup-city">${branch.city}</div>
      <div class="starken-popup-address">${branch.address}</div>
      <button class="starken-select-btn" data-name="${branch.name}">
        <span class="material-symbols-outlined">check_circle</span>
        Seleccionar esta sucursal
      </button>
    </div>
  `;
}

function selectStarkenBranch(branch) {
  selectedStarkenBranch = branch;

  // Update chip display
  const placeholder = document.getElementById('starken-placeholder');
  const chip = document.getElementById('starken-chip');
  const chipName = document.getElementById('starken-chip-name');
  const chipAddress = document.getElementById('starken-chip-address');
  const hiddenInput = document.getElementById('order-address-starken');

  if (placeholder) placeholder.style.display = 'none';
  if (chip) chip.style.display = 'flex';
  if (chipName) chipName.textContent = branch.name;
  if (chipAddress) chipAddress.textContent = branch.address;
  if (hiddenInput) hiddenInput.value = `${branch.name} - ${branch.address}`;

  // Clear any error state
  const sucursalGroup = document.getElementById('sucursal-group');
  if (sucursalGroup) {
    sucursalGroup.querySelectorAll('.field-error-msg').forEach(el => el.remove());
    const display = document.getElementById('starken-selected-display');
    if (display) display.classList.remove('input-error');
  }

  closeStarkenMapModal();
  showToastNotification(`📍 Sucursal seleccionada: ${branch.name}`, 'location_on', 4000);
}

function filterStarkenBranches() {
  const searchInput = document.getElementById('starken-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  filteredBranches = query
    ? STARKEN_BRANCHES.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.city.toLowerCase().includes(query) ||
        b.address.toLowerCase().includes(query)
      )
    : [...STARKEN_BRANCHES];

  // Update result count
  const countEl = document.getElementById('starken-result-count');
  if (countEl) {
    countEl.textContent = query ? `${filteredBranches.length} resultado${filteredBranches.length !== 1 ? 's' : ''}` : '';
  }

  // Show/hide markers on map
  if (starkenMap) {
    starkenMarkers.forEach(marker => {
      const branch = marker._starkenBranch;
      const visible = filteredBranches.some(b => b.name === branch.name);
      if (visible) {
        if (!starkenMap.hasLayer(marker)) marker.addTo(starkenMap);
      } else {
        if (starkenMap.hasLayer(marker)) marker.remove();
      }
    });

    // Fit map to visible markers
    if (filteredBranches.length > 0 && filteredBranches.length < STARKEN_BRANCHES.length) {
      const group = L.featureGroup(
        starkenMarkers.filter(m => filteredBranches.some(b => b.name === m._starkenBranch.name))
      );
      starkenMap.fitBounds(group.getBounds().pad(0.3));
    } else if (filteredBranches.length === STARKEN_BRANCHES.length) {
      starkenMap.setView([-35.6, -71.5], 5);
    }
  }

  renderBranchList(filteredBranches);
}

function renderBranchList(branches) {
  const container = document.getElementById('starken-branch-items');
  if (!container) return;

  if (branches.length === 0) {
    container.innerHTML = '<p class="starken-no-results">No se encontraron sucursales.</p>';
    return;
  }

  container.innerHTML = branches.map(branch => `
    <div class="starken-list-item" data-name="${branch.name}">
      <div class="starken-list-item-info">
        <span class="starken-list-item-name">${branch.name}</span>
        <span class="starken-list-item-address">${branch.address}</span>
      </div>
      <button class="starken-list-select-btn" data-name="${branch.name}" title="Seleccionar">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  `).join('');

  // Event delegation on list
  container.onclick = (e) => {
    const btn = e.target.closest('.starken-list-select-btn') || e.target.closest('.starken-list-item');
    if (!btn) return;
    const name = btn.getAttribute('data-name');
    const branch = STARKEN_BRANCHES.find(b => b.name === name);
    if (!branch) return;

    // If a list item (not just button) was clicked, fly map to it and open popup
    if (e.target.closest('.starken-list-item') && !e.target.closest('.starken-list-select-btn')) {
      if (starkenMap) {
        starkenMap.flyTo([branch.lat, branch.lng], 14, { duration: 0.8 });
        const marker = starkenMarkers.find(m => m._starkenBranch.name === name);
        if (marker) setTimeout(() => marker.openPopup(), 900);
      }
    } else {
      selectStarkenBranch(branch);
    }
    highlightListItem(name);
  };
}

function highlightListItem(name) {
  const container = document.getElementById('starken-branch-items');
  if (!container) return;
  container.querySelectorAll('.starken-list-item').forEach(item => {
    item.classList.toggle('highlighted', item.getAttribute('data-name') === name);
  });
  // Scroll highlighted into view
  const highlighted = container.querySelector('.starken-list-item.highlighted');
  if (highlighted) highlighted.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    sessionStorage.setItem('ditto_admin', '1'); // persistir sesión
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
function restoreAdminSession() {
  if (sessionStorage.getItem('ditto_admin') === '1') {
    document.body.classList.add('admin-mode');
    openAdminBtn.textContent = '[ + AGREGAR PRODUCTO ]';
  }
}
function openAdminForNew() {
  // Reset form for adding a new product
  editIdField.value = '';
  addProductForm.reset();
  fileNameDisplay.textContent = 'Ningún archivo seleccionado';
  fileNameDisplay.style.display = '';
  const previewGrid = document.getElementById('image-preview-grid');
  if (previewGrid) { previewGrid.innerHTML = ''; previewGrid.style.display = 'none'; }
  pendingImages = [];
  adminTitle.textContent = '[ AGREGAR PRODUCTO ]';
  adminSubmitBtn.textContent = '[ GUARDAR EN CATÁLOGO ]';
  adminModal.classList.add('active');
  adminOverlay.classList.add('active');
  updateSizeFieldRequired();
}

function closeAdmin() {
  adminModal.classList.remove('active');
  adminOverlay.classList.remove('active');
}

function logoutAdmin() {
  document.body.classList.remove('admin-mode');
  openAdminBtn.textContent = '[ ADMIN PANEL ]';
  sessionStorage.removeItem('ditto_admin'); // limpiar sesión guardada
  closeAdmin();
  closeLoginModal();
  renderProducts();
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  // Fill form with existing data
  editIdField.value = product.id;
  document.getElementById('p-name').value = product.name || '';
  document.getElementById('p-category').value = normalizeCategory(product.category);
  document.getElementById('p-description').value = product.description || '';
  document.getElementById('p-price').value = product.price || '';

  // Parse size
  if (product.size && product.size.includes(',')) {
    const [sMain, sNat] = product.size.split(',').map(s => s.trim());
    document.getElementById('p-size').value = sMain || '';
    document.getElementById('p-size-nat').value = sNat || '';
  } else {
    document.getElementById('p-size').value = product.size || '';
    document.getElementById('p-size-nat').value = '';
  }

  // Reset & Parse proportions
  document.getElementById('p-waist').value = '';
  document.getElementById('p-rise').value = '';
  document.getElementById('p-length').value = '';
  document.getElementById('p-cuff').value = '';
  document.getElementById('p-proportions').value = '';

  if (product.proportions) {
    const parts = product.proportions.split('|').map(p => p.trim());
    const remaining = [];
    parts.forEach(part => {
      const lower = part.toLowerCase();
      if (lower.startsWith('cintura:')) {
        document.getElementById('p-waist').value = part.replace(/^cintura:\s*/i, '');
      } else if (lower.startsWith('tiro:')) {
        document.getElementById('p-rise').value = part.replace(/^tiro:\s*/i, '');
      } else if (lower.startsWith('largo:')) {
        document.getElementById('p-length').value = part.replace(/^largo:\s*/i, '');
      } else if (lower.startsWith('basta:')) {
        document.getElementById('p-cuff').value = part.replace(/^basta:\s*/i, '');
      } else {
        remaining.push(part);
      }
    });
    if (remaining.length > 0) {
      document.getElementById('p-proportions').value = remaining.join(' | ');
    }
  }

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
  updateSizeFieldRequired();
}

function updateSizeFieldRequired() {
  const categorySelect = document.getElementById('p-category');
  const sizeInput = document.getElementById('p-size');
  const sizeLabel = document.getElementById('p-size-label');
  if (!categorySelect || !sizeInput) return;

  const noSizeCategories = ['accesorios', 'otro'];
  const isOptional = noSizeCategories.includes(categorySelect.value);

  sizeInput.required = !isOptional;
  if (sizeLabel) {
    sizeLabel.textContent = isOptional
      ? 'Talla / Dimensiones (Opcional):'
      : 'Talla Principal / US:';
  }
  sizeInput.placeholder = isOptional
    ? 'Ej: Talla única, 30cm, etc.'
    : 'Ej: 32x32 US o L';
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

  const name = document.getElementById('p-name').value.trim();
  const category = normalizeCategory(document.getElementById('p-category').value);
  const description = document.getElementById('p-description').value.trim();
  const sizeMain = document.getElementById('p-size').value.trim();
  const sizeNat = document.getElementById('p-size-nat').value.trim();
  const waist = document.getElementById('p-waist').value.trim();
  const rise = document.getElementById('p-rise').value.trim();
  const length = document.getElementById('p-length').value.trim();
  const cuff = document.getElementById('p-cuff').value.trim();
  const otherProportions = document.getElementById('p-proportions').value.trim();
  const price = parseInt(document.getElementById('p-price').value);
  const editId = editIdField.value;

  // Format combined size
  const finalSize = sizeNat ? (sizeMain ? `${sizeMain}, ${sizeNat}` : sizeNat) : sizeMain;

  // Format combined proportions
  const parts = [];
  if (waist) parts.push(`Cintura: ${waist.toLowerCase().includes('cm') ? waist : waist + ' cm'}`);
  if (rise) parts.push(`Tiro: ${rise.toLowerCase().includes('cm') ? rise : rise + ' cm'}`);
  if (length) parts.push(`Largo: ${length.toLowerCase().includes('cm') ? length : length + ' cm'}`);
  if (cuff) parts.push(`Basta: ${cuff.toLowerCase().includes('cm') ? cuff : cuff + ' cm'}`);
  if (otherProportions) parts.push(otherProportions);
  const finalProportions = parts.length > 0 ? parts.join(' | ') : '';

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
      category,
      description,
      size: finalSize,
      proportions: finalProportions,
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
    // CREATE new product (only standard DB columns)
    const newProduct = {
      id: Date.now(),
      name,
      category,
      description,
      size: finalSize,
      proportions: finalProportions,
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
  fileNameDisplay.style.display = '';
  const postSaveGrid = document.getElementById('image-preview-grid');
  if (postSaveGrid) { postSaveGrid.innerHTML = ''; postSaveGrid.style.display = 'none'; }
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
    ${cart.map((item, idx) => {
      const details = [];
      if (item.size && item.size.trim()) details.push(`Talla: <strong>${item.size.trim()}</strong>`);
      if (item.proportions && item.proportions.trim()) details.push(`Medidas: ${item.proportions.trim()}`);
      const subText = details.join(' | ');
      return `
        <div class="order-summary-item">
          <div class="order-item-left">
            <span class="order-item-title">${idx + 1}. ${item.name}</span>
            ${subText ? `<span class="order-item-sub">${subText}</span>` : ''}
          </div>
          <span class="order-item-price">${formatPrice(item.price)}</span>
        </div>
      `;
    }).join('')}
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

  // Address depends on delivery mode
  const addressVal = deliveryMode === 'sucursal'
    ? (orderAddressStarkenInput && orderAddressStarkenInput.value.trim()) || ''
    : (orderAddressInput && orderAddressInput.value.trim()) || '';

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

  // 6. Address / Starken branch validation
  if (deliveryMode === 'sucursal') {
    if (!addressVal) {
      const display = document.getElementById('starken-selected-display');
      if (display) {
        display.classList.add('input-error');
        const sucursalGroup = document.getElementById('sucursal-group');
        if (sucursalGroup) {
          let errorElem = sucursalGroup.querySelector('.field-error-msg');
          if (!errorElem) {
            errorElem = document.createElement('span');
            errorElem.className = 'field-error-msg';
            sucursalGroup.appendChild(errorElem);
          }
          errorElem.textContent = 'Selecciona una sucursal Starken en el mapa';
        }
      }
      hasErrors = true;
    }
  } else {
    if (!addressVal || addressVal.length < 4) {
      showFieldError(orderAddressInput, 'Ingresa tu dirección completa de despacho');
      hasErrors = true;
    }
  }

  if (hasErrors) {
    // Focus first invalid input
    const firstInvalid = orderForm.querySelector('.input-error');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const formattedRut = formatRut(rutVal);
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const deliveryLabel = deliveryMode === 'sucursal' ? 'Retiro en Sucursal Starken' : 'Despacho a Domicilio';

  // Build complete structured purchase form message
  let message = `HOLA DITTO\n`;
  message += `════════════════════════════════\n\n`;
  message += `🛍️ PRENDAS SOLICITADAS:\n\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}️⃣ ${item.name}\n`;
    if (item.size && item.size.trim()) {
      message += `   • Talla: ${item.size.trim()}\n`;
    }
    if (item.proportions && item.proportions.trim()) {
      message += `   • Medidas: ${item.proportions.trim()}\n`;
    }
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
  message += `• Tipo de entrega: ${deliveryLabel}\n`;
  message += `• ${deliveryMode === 'sucursal' ? 'Sucursal Starken' : 'Dirección de despacho'}: ${addressVal}\n`;
  message += `• Medio de Pago: Transferencia Bancaria\n\n`;
  message += `¡Hola Ditto! Vengo desde el catálogo web y deseo comprar estas piezas. ¿Me confirmas disponibilidad y datos de transferencia? 🙌`;

  // Visual feedback en el botón
  const originalBtnText = orderSubmitBtn ? orderSubmitBtn.innerText : '';
  if (orderSubmitBtn) {
    orderSubmitBtn.innerText = '✅ ¡PEDIDO COPIADO! ABRIENDO INSTAGRAM...';
    orderSubmitBtn.style.backgroundColor = '#1b5e20';
    orderSubmitBtn.style.borderColor = '#1b5e20';
    orderSubmitBtn.style.color = '#ffffff';
    orderSubmitBtn.disabled = true;
  }

  // ── Abrir Instagram DM ────────────────────────────────────────────
  // DEBE ir ANTES de cualquier "await" — iOS Safari bloquea window.open
  // si no está directamente en el stack del gesto del usuario.
  // ig.me/m/USERNAME es el enlace oficial de Instagram para abrir DM.
  const igDMUrl = 'https://ig.me/m/dittomarkett';
  const igWindow = window.open(igDMUrl, '_blank');
  // Si el navegador bloqueó la nueva pestaña (algunos Android), navegar aquí
  if (!igWindow) {
    window.location.href = igDMUrl;
  }

  // ── Copiar al portapapeles (async va después de abrir la ventana) ──
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

  showToastNotification('📋 ¡Pedido copiado! Pégalo en el chat de Instagram 🙌', 'content_paste_go', 6000);

  // Restaurar botón y cerrar modal
  setTimeout(() => {
    if (orderSubmitBtn) {
      orderSubmitBtn.innerText = originalBtnText;
      orderSubmitBtn.style.backgroundColor = '';
      orderSubmitBtn.style.borderColor = '';
      orderSubmitBtn.style.color = '';
      orderSubmitBtn.disabled = false;
    }
    closeOrderModal();
  }, 3000);
}

let toastTimeout = null;
function showToastNotification(messageText, iconName = 'check_circle', duration = 4500) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span class="material-symbols-outlined toast-icon">${iconName}</span>
    <span>${messageText}</span>
  `;

  toast.classList.add('active');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, duration);
}

init();

