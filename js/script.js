const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".slider-dot"));
const previousButton = document.querySelector(".slider-previous");
const nextButton = document.querySelector(".slider-next");
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-navigation");
const categoryNavigation = document.getElementById("category-navigation");
const searchForm = document.querySelector(".search-form");
const cartCountElement = document.querySelector(".cart-count");
const categorySectionsRoot = document.getElementById("category-sections");
const categoryPage = document.getElementById("category-page");
const featuredGrid = document.getElementById("featured-products");
const brandStrip = document.getElementById("brand-strip");
const searchResultsSection = document.getElementById("search-results");
const searchResultsGrid = document.getElementById("search-results-products");
const searchResultsHeading = document.getElementById("search-results-heading");

const products = Array.isArray(window.ALFAJIR_PRODUCTS) ? window.ALFAJIR_PRODUCTS : [];
let cartCount = 0;
let activeSlide = 0;
let sliderTimer;
const activeBrands = new Map();
const categoryFilters = new Map();
const PHONE_PLUS_URL = "https://phonepluskenya.co.ke/";

const categoryCatalog = [
  { key: "televisions", title: "Televisions" },
  { key: "refrigerators", title: "Refrigerators" },
  { key: "washing-machines", title: "Washing Machines" },
  { key: "sound-bars", title: "Soundbars" },
  { key: "chest-freezers", title: "Chest Freezers" },
  { key: "kitchen-appliances", title: "Kitchen Appliances" },
  { key: "home-appliances", title: "Home Appliances" }
];

const homeApplianceCategories = [
  { key: "iron-boxes", title: "Irons" },
  { key: "water-dispensers", title: "Water Dispensers" },
  { key: "other", title: "Other Home Appliances" }
];

const kitchenApplianceCategories = [
  { key: "blenders", title: "Blenders" },
  { key: "cookers", title: "Cookers" },
  { key: "microwaves", title: "Microwaves" },
  { key: "kettles", title: "Kettles" },
  { key: "other", title: "Other Kitchen Appliances" }
];

function titleFromCategory(category) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCategoryConfig() {
  const categories = new Map(categoryCatalog.map((config) => [config.key, config.title]));

  products.forEach((product) => {
    if (product.category && product.category !== "chest-freezers" && !categories.has(product.category)) {
      categories.set(product.category, titleFromCategory(product.category));
    }
  });

  return Array.from(categories, ([key, title]) => ({
    key,
    title,
    brands: [...new Set(products
      .filter((product) => product.category === key && product.brand)
      .map((product) => product.brand))]
  }));
}

const sectionConfig = getCategoryConfig();

function formatPrice(price) {
  if (price === null || price === undefined || Number(price) === 0) {
    return "Price on request";
  }

  return `KSh ${Number(price).toLocaleString()}`;
}

function generateFallbackModel(product) {
  const source = [product?.brand, product?.name, product?.id, product?.specs?.model]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .join(" ");

  const model = source
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((token) => token.toUpperCase())
    .join("-");

  return model || "MODEL";
}

function getProductModel(product) {
  const model = product.model || product.specs?.model || generateFallbackModel(product);
  return model && String(model).trim() && String(model).toLowerCase() !== "not specified" ? model : "Model details pending";
}

function selectBrandDiverseProducts(categoryProducts, limit) {
  const selected = [];
  const brands = new Set();

  categoryProducts.forEach((product) => {
    if (selected.length < limit && product.brand && !brands.has(product.brand)) {
      selected.push(product);
      brands.add(product.brand);
    }
  });

  categoryProducts.forEach((product) => {
    if (selected.length < limit && !selected.includes(product)) {
      selected.push(product);
    }
  });

  return selected;
}

function getCategoryFilter(categoryKey) {
  if (!categoryFilters.has(categoryKey)) {
    categoryFilters.set(categoryKey, { minPrice: "", maxPrice: "", sort: "recommended", specs: {}, subcategory: "" });
  }

  return categoryFilters.get(categoryKey);
}

function formatSpecLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function getProductSubcategory(product, categoryKey) {
  if (categoryKey === "kitchen-appliances") {
    return getKitchenApplianceSubcategory(product);
  }
  return product.subcategory || "";
}

function getFamilyProducts(categoryKey, subcategoryKey = "") {
  return products.filter((product) => product.category === categoryKey
    && (!subcategoryKey || getProductSubcategory(product, categoryKey) === subcategoryKey));
}

function getFilterableSpecs(categoryKey, categoryProducts) {
  const specs = new Map();
  const preferredSpecs = {
    televisions: ["screenSize", "resolution", "displayTechnology", "refreshRate", "smartPlatform"],
    refrigerators: ["capacity", "configuration", "energyRating", "coolingTechnology", "dimensions"],
    "washing-machines": ["load", "type", "spinSpeed", "motorTechnology", "energyRating"],
    "sound-bars": ["power", "audio", "connectivity", "subwoofer", "battery"],
    "chest-freezers": ["capacity", "type", "color"],
    "kitchen-appliances": ["burnerConfiguration", "size", "power", "capacity", "colour", "functions", "jar", "set"],
    "home-appliances": ["type", "colour", "power", "loading", "cooling", "water", "capacity"]
  };

  categoryProducts.forEach((product) => {
    Object.entries(product.specs || {}).forEach(([key, value]) => {
      const option = String(value || "").trim();
      const normalizedValue = option.toLowerCase();
      const normalizedKey = key.toLowerCase();
      if (["model", "warranty"].includes(normalizedKey) || !option || option.length > 60
        || normalizedValue === "not specified" || normalizedValue === "to be confirmed") {
        return;
      }
      if (!specs.has(normalizedKey)) {
        specs.set(normalizedKey, { label: key, values: new Map() });
      }
      if (!specs.get(normalizedKey).values.has(normalizedValue)) {
        specs.get(normalizedKey).values.set(normalizedValue, option);
      }
    });
  });

  const preferred = preferredSpecs[categoryKey] || [];
  return [...specs.entries()]
    .filter(([, spec]) => spec.values.size > 1 && spec.values.size <= 24)
    .sort(([keyA], [keyB]) => {
      const indexA = preferred.indexOf(keyA);
      const indexB = preferred.indexOf(keyB);
      return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
        - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
    })
    .slice(0, 5)
    .map(([key, spec]) => [key, spec.label, [...spec.values.values()]]);
}

function renderCategoryFilters(config, familyProducts) {
  const filter = getCategoryFilter(config.key);
  const brands = [...new Set(familyProducts.map((product) => product.brand).filter(Boolean))];
  const selectedBrand = activeBrands.get(config.key) || "All Brands";
  const subcategories = config.key === "kitchen-appliances"
    ? kitchenApplianceCategories
    : config.key === "home-appliances"
      ? homeApplianceCategories
      : [];
  const availableSubcategories = subcategories.filter((subcategory) =>
    familyProducts.some((product) => getProductSubcategory(product, config.key) === subcategory.key)
  );
  const brandFilters = brands.length ? `
    <fieldset class="catalog-filter-group">
      <legend>Brand</legend>
      <div class="catalog-brand-options">
        ${["All Brands", ...brands].map((brand) => `
          <button class="filter-chip${selectedBrand === brand ? " is-active" : ""}"
            type="button" data-filter-brand="${escapeHTML(brand)}" data-category="${config.key}"
            aria-pressed="${selectedBrand === brand}">${escapeHTML(brand)}</button>
        `).join("")}
      </div>
    </fieldset>
  ` : "";
  const subcategoryFilter = availableSubcategories.length ? `
    <label class="catalog-filter">
      <span>Type</span>
      <select data-filter-subcategory data-category="${config.key}" aria-label="Filter by type">
        <option value="">All types</option>
        ${availableSubcategories.map((subcategory) => `
          <option value="${escapeHTML(subcategory.key)}"${filter.subcategory === subcategory.key ? " selected" : ""}>${escapeHTML(subcategory.title)}</option>
        `).join("")}
      </select>
    </label>
  ` : "";
  const hasPrices = familyProducts.some((product) => Number.isFinite(Number(product.price)) && Number(product.price) > 0);
  const priceFilters = hasPrices ? `
    <div class="catalog-price-range">
      <label class="catalog-filter">
        <span>Minimum price (KSh)</span>
        <input type="number" min="0" inputmode="numeric" placeholder="Any" value="${filter.minPrice}"
          data-filter-price="minPrice" data-category="${config.key}">
      </label>
      <label class="catalog-filter">
        <span>Maximum price (KSh)</span>
        <input type="number" min="0" inputmode="numeric" placeholder="Any" value="${filter.maxPrice}"
          data-filter-price="maxPrice" data-category="${config.key}">
      </label>
    </div>
  ` : "";
  const specFilters = getFilterableSpecs(config.key, familyProducts).map(([key, label, values]) => `
    <label class="catalog-filter">
      <span>${escapeHTML(formatSpecLabel(label))}</span>
      <select data-filter-spec="${escapeHTML(key)}" data-category="${config.key}" aria-label="Filter by ${escapeHTML(formatSpecLabel(label))}">
        <option value="">All</option>
        ${values.map((value) => `<option value="${escapeHTML(value)}"${filter.specs[key] === value ? " selected" : ""}>${escapeHTML(value)}</option>`).join("")}
      </select>
    </label>
  `).join("");

  return `
    ${subcategoryFilter}
    ${brandFilters}
    ${priceFilters}
    ${specFilters}
  `;
}

function renderCategorySidebar(config, familyProducts, mobile = false) {
  return `
    <div class="catalog-sidebar-heading">
      <h2>Filter by</h2>
      <button class="clear-filters" type="button" data-clear-filters="${config.key}">Clear all</button>
    </div>
    <div class="catalog-sidebar-filters">${renderCategoryFilters(config, familyProducts)}</div>
    ${mobile ? `<button class="filter-apply" type="button" data-close-filters>Show results</button>` : ""}
  `;
}

function renderCategoryLayout(config, familyProducts) {
  const filter = getCategoryFilter(config.key);
  const hasPrices = familyProducts.some((product) => Number.isFinite(Number(product.price)) && Number(product.price) > 0);
  const hasDates = familyProducts.some((product) => product.dateAdded);
  return `
    <div class="catalog-layout">
      <aside class="catalog-sidebar" aria-label="Product filters">
        ${renderCategorySidebar(config, familyProducts)}
      </aside>
      <section class="catalog-results" aria-label="${config.title} products">
        <div class="catalog-toolbar">
          <p class="result-count" aria-live="polite"></p>
          <label class="catalog-sort">
            <span>Sort by</span>
            <select data-filter-sort="${config.key}" aria-label="Sort ${config.title}">
              <option value="recommended"${filter.sort === "recommended" ? " selected" : ""}>Recommended</option>
              ${hasPrices ? `
                <option value="price-ascending"${filter.sort === "price-ascending" ? " selected" : ""}>Price: Low to High</option>
                <option value="price-descending"${filter.sort === "price-descending" ? " selected" : ""}>Price: High to Low</option>
              ` : ""}
              ${hasDates ? `<option value="newest"${filter.sort === "newest" ? " selected" : ""}>Newest</option>` : ""}
            </select>
          </label>
          <button class="mobile-filter-button" type="button" data-open-filters="${config.key}">Filter</button>
        </div>
        <div class="product-grid category-product-grid" data-grid-for="${config.key}"></div>
      </section>
    </div>
    <dialog class="mobile-filter-panel" aria-label="Product filters">
      <div class="mobile-filter-panel-inner">
        <div class="mobile-filter-panel-heading">
          <h2>Filter ${config.title}</h2>
          <button class="mobile-filter-close" type="button" data-close-filters aria-label="Close filters">×</button>
        </div>
        ${renderCategorySidebar(config, familyProducts, true)}
      </div>
    </dialog>
  `;
}

function renderProductCard(product) {
  const detailsUrl = `product.html?id=${encodeURIComponent(product.id)}`;

  return `
    <article class="product-card" data-category="${product.category}" data-brand="${product.brand}" data-product-id="${product.id}">
      <a class="product-card-link" href="${detailsUrl}" aria-label="View details for ${product.name}">
        <div class="product-image-wrap">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-body">
          <p class="product-brand">${product.brand}</p>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-model">Model: ${getProductModel(product)}</p>
          <span class="product-price">${formatPrice(product.price)}</span>
          <span class="product-details-action">View Details</span>
        </div>
      </a>
      <button class="add-to-cart" type="button" data-product-id="${product.id}">Add to Cart</button>
    </article>
  `;
}

function renderFeaturedProducts() {
  if (!featuredGrid) {
    return;
  }
  const featured = selectBrandDiverseProducts(products.filter((product) => product.featured), 4);
  featuredGrid.innerHTML = featured.map(renderProductCard).join("");
}

function renderSearchResults(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || !searchResultsSection || !searchResultsGrid || !searchResultsHeading) {
    searchResultsSection?.setAttribute("hidden", "");
    return;
  }
  const results = products.filter((product) => [
    product.name, product.brand, product.model, product.category, product.description,
    ...Object.values(product.specs || {})
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
  searchResultsHeading.textContent = `${results.length} result${results.length === 1 ? "" : "s"} for “${query.trim()}”`;
  searchResultsGrid.innerHTML = results.length
    ? results.map(renderProductCard).join("")
    : '<p class="category-empty">No matching products found.</p>';
  searchResultsSection.hidden = false;
}

function renderCategorySections() {
  if (!categorySectionsRoot) {
    return;
  }

  const html = sectionConfig
    .filter((config) => products.some((product) => product.category === config.key))
    .map((config) => {
      return `
        <section class="product-section section-wrap" id="${config.key}" data-category-section="${config.key}">
          <div class="section-heading">
            <div>
              <p class="section-kicker">CURATED SELECTION</p>
              <h2>${config.title}</h2>
            </div>
            <a class="view-link" href="category.html?category=${config.key}">View All →</a>
          </div>
          <div class="product-grid category-product-grid" data-grid-for="${config.key}"></div>
        </section>
      `;
    })
    .join("");

  categorySectionsRoot.innerHTML = html;

  sectionConfig.filter((config) => products.some((product) => product.category === config.key)).forEach((config) => {
    const grid = categorySectionsRoot.querySelector(`[data-grid-for="${config.key}"]`);
    const categoryProducts = products.filter((product) => product.category === config.key
      && (config.key !== "home-appliances" || product.subcategory !== "other"));
    const selection = ["kitchen-appliances", "home-appliances"].includes(config.key)
      ? selectApplianceShowcaseProducts(config.key, categoryProducts)
      : selectBrandDiverseProducts(categoryProducts, 4);
    grid.innerHTML = selection.length ? selection.map(renderProductCard).join("") : '<p class="category-empty">No products available yet.</p>';
  });
}

function selectApplianceShowcaseProducts(categoryKey, categoryProducts) {
  const subcategories = categoryKey === "kitchen-appliances"
    ? kitchenApplianceCategories.filter((item) => item.key !== "other").map((item) => item.key)
    : homeApplianceCategories.filter((item) => item.key !== "other").map((item) => item.key);
  const groups = subcategories.map((subcategory) => categoryProducts.filter((product) => {
    const productSubcategory = categoryKey === "kitchen-appliances"
      ? getKitchenApplianceSubcategory(product)
      : product.subcategory;
    return productSubcategory === subcategory;
  }));
  const perSubcategory = categoryKey === "kitchen-appliances" ? 1 : 2;
  const selected = [];

  for (let index = 0; index < perSubcategory; index += 1) {
    groups.forEach((group) => {
      const candidates = group.filter((product) => !selected.includes(product));
      const diverseProduct = candidates.find((product) =>
        !selected.some((item) => item.brand === product.brand)
      );
      if (selected.length < 4 && (diverseProduct || candidates[0])) {
        selected.push(diverseProduct || candidates[0]);
      }
    });
  }

  return selected;
}

function getKitchenApplianceSubcategory(product) {
  return product.subcategory || (product.specs?.type === "Cooker" ? "cookers" : "other");
}

function renderCategoryPage() {
  if (!categoryPage) return;
  const params = new URLSearchParams(window.location.search);
  const key = params.get("category");
  const config = sectionConfig.find((item) => item.key === key);
  if (!config) {
    categoryPage.innerHTML = '<div class="product-not-found"><h1>Category not found</h1><a href="index.html">Return home</a></div>';
    return;
  }
  const subcategoryKey = params.get("subcategory") || "";
  const subcategories = key === "kitchen-appliances" ? kitchenApplianceCategories
    : key === "home-appliances" ? homeApplianceCategories : [];
  if (subcategoryKey && !subcategories.some((subcategory) => subcategory.key === subcategoryKey)) {
    categoryPage.innerHTML = `<div class="product-not-found"><h1>Appliance category not found</h1><a href="category.html?category=${key}">Browse ${config.title}</a></div>`;
    return;
  }
  const filter = getCategoryFilter(key);
  filter.subcategory = subcategoryKey;
  const familyProducts = getFamilyProducts(key);
  const filteredFamilyProducts = getFamilyProducts(key, subcategoryKey);
  const requestedBrand = params.get("brand");
  const availableBrands = new Set(filteredFamilyProducts.map((product) => product.brand).filter(Boolean));
  if (requestedBrand && availableBrands.has(requestedBrand)) {
    activeBrands.set(key, requestedBrand);
  } else if (activeBrands.get(key) && !availableBrands.has(activeBrands.get(key))) {
    activeBrands.delete(key);
  }
  document.title = `${config.title} | ALFAJIR`;
  categoryPage.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>›</span><span>${config.title}</span></nav>
    <div class="section-heading category-page-heading"><div><p class="section-kicker">SHOP BY CATEGORY</p><h1>${config.title}</h1></div></div>
    ${renderCategoryLayout(config, familyProducts)}`;
  renderCategoryProducts(key);
}

function renderCategoryProducts(categoryKey) {
  const root = categoryPage || categorySectionsRoot;
  const grid = root?.querySelector(`[data-grid-for="${categoryKey}"]`);
  if (!grid) {
    return;
  }
  const filter = getCategoryFilter(categoryKey);
  const activeBrand = activeBrands.get(categoryKey) || "All Brands";
  let categoryProducts = getFamilyProducts(categoryKey, filter.subcategory).filter((product) => {
    if (activeBrand !== "All Brands" && product.brand !== activeBrand) {
      return false;
    }
    if (filter.minPrice !== "" || filter.maxPrice !== "") {
      if (product.price === null || product.price === undefined || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0) return false;
      const price = Number(product.price);
      if (filter.minPrice !== "" && price < Number(filter.minPrice)) return false;
      if (filter.maxPrice !== "" && price > Number(filter.maxPrice)) return false;
    }
    return Object.entries(filter.specs).every(([key, value]) => {
      if (!value) return true;
      return Object.entries(product.specs || {}).some(([specKey, specValue]) =>
        specKey.toLowerCase() === key.toLowerCase() && String(specValue || "").trim() === value
      );
    });
  });

  if (filter.sort === "price-ascending" || filter.sort === "price-descending") {
    const direction = filter.sort === "price-ascending" ? 1 : -1;
    categoryProducts = categoryProducts.slice().sort((a, b) => {
      const parsedA = Number(a.price);
      const parsedB = Number(b.price);
      const priceA = a.price === null || a.price === undefined || !Number.isFinite(parsedA) || parsedA <= 0 ? null : parsedA;
      const priceB = b.price === null || b.price === undefined || !Number.isFinite(parsedB) || parsedB <= 0 ? null : parsedB;
      if (priceA === null) return priceB === null ? 0 : 1;
      if (priceB === null) return -1;
      return (priceA - priceB) * direction;
    });
  } else if (filter.sort === "newest") {
    categoryProducts = categoryProducts.slice().sort((a, b) => {
      const dateA = Date.parse(a.dateAdded || "") || 0;
      const dateB = Date.parse(b.dateAdded || "") || 0;
      return dateB - dateA;
    });
  }

  grid.innerHTML = categoryProducts.length
    ? categoryProducts.map(renderProductCard).join("")
    : getFamilyProducts(categoryKey).length
      ? '<p class="category-empty">No products match your filters.</p>'
      : '<p class="category-empty">No products available yet.</p>';
  const count = root.querySelector(".result-count");
  if (count) count.textContent = `${categoryProducts.length} product${categoryProducts.length === 1 ? "" : "s"}`;
}

function renderCategoryNavigation() {
  if (!categoryNavigation) {
    return;
  }

  const menuItems = ['<a class="nav-home" href="index.html">Home</a>'];

  sectionConfig.forEach((config) => {
    const applianceCategories = config.key === "home-appliances"
      ? homeApplianceCategories
      : config.key === "kitchen-appliances"
        ? kitchenApplianceCategories
        : null;
    const menuLinks = applianceCategories
      ? [
        `<a class="category-menu-link" href="category.html?category=${config.key}" data-category="${config.key}">All ${config.title}</a>`,
        ...applianceCategories.map((subcategory) =>
          `<a class="category-menu-link" href="category.html?category=${config.key}&subcategory=${subcategory.key}" data-category="${config.key}">${subcategory.title}</a>`
        )
      ]
      : [
        `<a class="category-menu-link" href="category.html?category=${config.key}" data-category="${config.key}" data-brand="All Brands">All ${config.title}</a>`,
        ...config.brands.map((brand) =>
          `<a class="category-menu-link" href="category.html?category=${config.key}&brand=${encodeURIComponent(brand)}" data-category="${config.key}" data-brand="${brand}">${brand}</a>`
        )
      ];
    const brandLinks = menuLinks.join("");

    menuItems.push(`
      <div class="nav-category">
        <a class="nav-category-title" href="category.html?category=${config.key}">${config.title}</a>
        <button class="nav-category-toggle" type="button" aria-label="Browse ${config.title} ${applianceCategories ? "types" : "brands"}" aria-expanded="false" aria-controls="menu-${config.key}"></button>
        <div class="category-menu" id="menu-${config.key}">
          ${brandLinks}
        </div>
      </div>
    `);

  });

  menuItems.push(`<a class="nav-category-link" href="${PHONE_PLUS_URL}" target="_blank" rel="noopener noreferrer">Smart Phones</a>`);
  categoryNavigation.innerHTML = menuItems.join("");
}

function renderBrandStrip() {
  if (!brandStrip) {
    return;
  }

  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))];
  brandStrip.innerHTML = brands.map((brand) => `<span>${brand}</span>`).join("");
}

function applyBrandFilter(categoryKey, brandName) {
  activeBrands.set(categoryKey, brandName);
  renderCategoryProducts(categoryKey);
  const root = categoryPage || categorySectionsRoot;
  root?.querySelectorAll(`[data-filter-brand][data-category="${categoryKey}"]`).forEach((button) => {
    const isActive = button.dataset.filterBrand === brandName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.getElementById(categoryKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncCategoryFilterControls(categoryKey) {
  const root = categoryPage || categorySectionsRoot;
  if (!root) return;
  const filter = getCategoryFilter(categoryKey);
  const selectedBrand = activeBrands.get(categoryKey) || "All Brands";
  root.querySelectorAll(`[data-category="${categoryKey}"]`).forEach((control) => {
    if (control.dataset.filterPrice) {
      control.value = filter[control.dataset.filterPrice];
    } else if (control.dataset.filterSpec) {
      control.value = filter.specs[control.dataset.filterSpec] || "";
    } else if (control.hasAttribute("data-filter-subcategory")) {
      control.value = filter.subcategory;
    } else if (control.hasAttribute("data-filter-brand")) {
      const isActive = control.dataset.filterBrand === selectedBrand;
      control.classList.toggle("is-active", isActive);
      control.setAttribute("aria-pressed", String(isActive));
    }
  });
  const sort = root.querySelector(`[data-filter-sort="${categoryKey}"]`);
  if (sort) sort.value = filter.sort;
}

function updateCartCount() {
  if (cartCountElement) {
    cartCountElement.textContent = String(cartCount);
  }
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === activeSlide;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeSlide;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

function restartSlider() {
  if (!slides.length) {
    return;
  }

  window.clearInterval(sliderTimer);
  sliderTimer = window.setInterval(() => showSlide(activeSlide + 1), 6500);
}

if (previousButton) {
  previousButton.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    restartSlider();
  });
}

if (nextButton) {
  nextButton.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    restartSlider();
  });
}

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    showSlide(index);
    restartSlider();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearInterval(sliderTimer);
  } else {
    restartSlider();
  }
});

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("is-open", !isOpen);
  });

}

if (categoryNavigation) {
  categoryNavigation.addEventListener("click", (event) => {
    const toggle = event.target.closest(".nav-category-toggle");
    if (toggle) {
      const category = toggle.closest(".nav-category");
      const isOpen = toggle.getAttribute("aria-expanded") === "true";

      categoryNavigation.querySelectorAll(".nav-category").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".nav-category-toggle").setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        category.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const link = event.target.closest(".category-menu-link");
    if (link) {
      categoryNavigation.querySelectorAll(".nav-category").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".nav-category-toggle").setAttribute("aria-expanded", "false");
      });
      navigation.classList.remove("is-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    }
  });
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = new FormData(searchForm).get("q").toString().trim();
    if (!searchResultsSection) {
      window.location.href = `index.html?q=${encodeURIComponent(query)}`;
      return;
    }
    if (!query) {
      searchResultsSection.hidden = true;
      return;
    }
    renderSearchResults(query);
    searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (searchResultsSection) {
  searchResultsSection.addEventListener("click", (event) => {
    if (!event.target.closest(".clear-search")) return;
    searchResultsSection.hidden = true;
    searchForm.reset();
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (categorySectionsRoot || categoryPage) {
  const filterRoot = categoryPage || categorySectionsRoot;
  filterRoot.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-filters]");
    if (openButton) {
      filterRoot.querySelector(".mobile-filter-panel")?.showModal();
      return;
    }
    const closeButton = event.target.closest("[data-close-filters]");
    if (closeButton) {
      closeButton.closest("dialog")?.close();
      return;
    }
    const clearButton = event.target.closest("[data-clear-filters]");
    if (clearButton) {
      const categoryKey = clearButton.dataset.clearFilters;
      const subcategory = new URLSearchParams(window.location.search).get("subcategory") || "";
      categoryFilters.set(categoryKey, { minPrice: "", maxPrice: "", sort: "recommended", specs: {}, subcategory });
      activeBrands.delete(categoryKey);
      syncCategoryFilterControls(categoryKey);
      renderCategoryProducts(categoryKey);
      return;
    }
    const brandButton = event.target.closest("[data-filter-brand]");
    if (brandButton) {
      applyBrandFilter(brandButton.dataset.category, brandButton.dataset.filterBrand);
      return;
    }
  });

  const updateFilter = (event) => {
    const control = event.target;
    const categoryKey = control.dataset.category || control.dataset.filterSort;
    if (!categoryKey) return;
    const filter = getCategoryFilter(categoryKey);
    if (control.dataset.filterPrice) {
      filter[control.dataset.filterPrice] = control.value;
    } else if (control.dataset.filterSpec) {
      if (control.value) {
        filter.specs[control.dataset.filterSpec] = control.value;
      } else {
        delete filter.specs[control.dataset.filterSpec];
      }
    } else if (control.dataset.filterSort) {
      filter.sort = control.value;
    } else if (control.hasAttribute("data-filter-subcategory")) {
      filter.subcategory = control.value;
    }
    syncCategoryFilterControls(categoryKey);
    renderCategoryProducts(categoryKey);
  };
  filterRoot.addEventListener("change", updateFilter);
  filterRoot.addEventListener("input", (event) => {
    if (event.target.dataset.filterPrice) updateFilter(event);
  });

}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".add-to-cart");
  if (!button) {
    return;
  }

  const quantityInput = document.querySelector(".product-quantity");
  const quantity = quantityInput ? Math.max(1, Number.parseInt(quantityInput.value, 10) || 1) : 1;
  cartCount += quantity;
  updateCartCount();
  button.textContent = "Added";
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = "Add to Cart";
    button.disabled = false;
  }, 900);
});

if (slides.length) {
  showSlide(0);
  restartSlider();
}

renderFeaturedProducts();
renderCategoryNavigation();
renderCategorySections();
renderCategoryPage();
renderBrandStrip();
updateCartCount();
const initialSearchQuery = new URLSearchParams(window.location.search).get("q");
if (initialSearchQuery && searchResultsSection) {
  if (searchForm?.elements.q) searchForm.elements.q.value = initialSearchQuery;
  renderSearchResults(initialSearchQuery);
}
