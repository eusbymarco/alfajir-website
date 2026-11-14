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
const CART_STORAGE_KEY = "alfajir-cart";
const COMPARE_STORAGE_KEY = "alfajir-compare";
const MAX_COMPARE_PRODUCTS = 4;
let cartItems = loadCartItems();
let compareIds = loadComparedProductIds();
let activeSlide = 0;
let sliderTimer;
const activeBrands = new Map();
const categoryFilters = new Map();
const PHONE_PLUS_URL = "https://www.phonepluskenya.com/shop.html";
const brandLogoAssets = new Map([
  ["armco", "images/brand-logos/armco-mark.avif"],
  ["haier", "images/brand-logos/haier.svg"],
  ["hisense", "images/brand-logos/hisense.svg"],
  ["lg", "images/brand-logos/lg.svg"],
  ["midea", "images/brand-logos/midea.svg"],
  ["nutribullet", "images/brand-logos/nutribullet.svg"],
  ["samsung", "images/brand-logos/samsung.svg"],
  ["tcl", "images/brand-logos/tcl.svg"],
  ["tefal", "images/brand-logos/tefal.svg"],
  ["von", "images/brand-logos/von-mark.png"]
]);

const categoryCatalog = [
  { key: "televisions", title: "Televisions" },
  { key: "refrigerators", title: "Refrigerators" },
  { key: "washing-machines", title: "Washing Machines" },
  { key: "sound-bars", title: "Soundbars" },
  { key: "chest-freezers", title: "Chest Freezers" },
  { key: "air-conditioners", title: "Air Conditioners" },
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
  const categories = new Map(categoryCatalog
    .filter((config) => products.some((product) => product.category === config.key))
    .map((config) => [config.key, config.title]));

  products.forEach((product) => {
    if (product.category && !categories.has(product.category)) {
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

function getProductModel(product) {
  const model = product.model || product.specs?.model;
  return model && String(model).trim() && String(model).toLowerCase() !== "not specified" ? String(model).trim() : "";
}

function hasValidPrice(product) {
  const price = Number(product.price);
  return product.price !== null && product.price !== undefined && Number.isFinite(price) && price > 0;
}

function loadComparedProductIds() {
  try {
    const savedIds = JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) || "[]");
    if (!Array.isArray(savedIds)) {
      console.error("Saved ALFAJIR comparison is not a valid product list.");
      return [];
    }
    return [...new Set(savedIds.filter((id) => typeof id === "string" && products.some((product) => product.id === id)))]
      .slice(0, MAX_COMPARE_PRODUCTS);
  } catch (error) {
    console.error("Could not read the saved ALFAJIR comparison.", error);
    return [];
  }
}

function getComparedProducts() {
  return compareIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);
}

function saveComparison() {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
  renderComparisonBar();
  syncCompareButtons();
}

function showComparisonMessage(message) {
  let status = document.getElementById("comparison-status");
  if (!status) {
    status = document.createElement("div");
    status.id = "comparison-status";
    status.className = "comparison-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.append(status);
  }
  status.textContent = message;
  status.classList.add("is-visible");
  window.clearTimeout(status.hideTimer);
  status.hideTimer = window.setTimeout(() => status.classList.remove("is-visible"), 2800);
}

function addToComparison(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    showComparisonMessage("This product could not be added to comparison.");
    return;
  }
  if (compareIds.includes(productId)) {
    removeFromComparison(productId);
    showComparisonMessage(`${product.name} removed from comparison.`);
    return;
  }
  const comparedProducts = getComparedProducts();
  if (comparedProducts.length >= MAX_COMPARE_PRODUCTS) {
    showComparisonMessage("You can compare up to four products. Remove one to add another.");
    return;
  }
  if (comparedProducts.length && comparedProducts[0].category !== product.category) {
    showComparisonMessage(`Compare products in the same category. Your current selection is ${titleFromCategory(comparedProducts[0].category)}.`);
    return;
  }
  compareIds.push(productId);
  saveComparison();
  showComparisonMessage(`${product.name} added to comparison.`);
}

function removeFromComparison(productId) {
  compareIds = compareIds.filter((id) => id !== productId);
  saveComparison();
}

function clearComparison() {
  compareIds = [];
  saveComparison();
  showComparisonMessage("Comparison selection cleared.");
}

function getComparisonSpecValue(product, key) {
  if (key === "description") {
    return product.description || "";
  }
  const matchingEntry = Object.entries(product.specs || {}).find(([specKey]) =>
    specKey.toLowerCase() === key.toLowerCase()
  );
  const value = matchingEntry?.[1];
  if (value === null || value === undefined || String(value).trim() === ""
    || ["not specified", "to be confirmed"].includes(String(value).trim().toLowerCase())) {
    return "Not specified";
  }
  return String(value);
}

function getComparisonSpecKeys(category, comparedProducts) {
  const preferredSpecs = {
    televisions: ["screenSize", "resolution", "displayTechnology", "smartPlatform", "operatingSystem", "hdr", "audio", "connectivity"],
    refrigerators: ["capacity", "configuration", "coolingTechnology", "energyRating", "dimensions"],
    "washing-machines": ["load", "type", "capacity", "programs", "spinSpeed", "energyRating"],
    "sound-bars": ["audio", "power", "connectivity", "subwoofer"],
    "chest-freezers": ["capacity", "type", "coolingTechnology", "energyRating", "color"],
    "air-conditioners": ["capacity", "inverter", "type", "energyRating", "coolingTechnology"],
    "kitchen-appliances": ["type", "burnerConfiguration", "size", "power", "capacity", "functions", "connectivity"],
    "home-appliances": ["type", "colour", "power", "capacity", "loading", "water"]
  };
  const allKeys = new Set(comparedProducts.flatMap((product) =>
    Object.keys(product.specs || {}).filter((key) => !["model", "warranty"].includes(key.toLowerCase()))
  ));
  const preferred = preferredSpecs[category] || [];
  const knownPreferred = preferred.filter((key) =>
    [...allKeys].some((candidate) => candidate.toLowerCase() === key.toLowerCase())
  );
  const remaining = [...allKeys].filter((key) =>
    !knownPreferred.some((preferredKey) => preferredKey.toLowerCase() === key.toLowerCase())
  );
  return [...knownPreferred, ...remaining].slice(0, 10);
}

function renderComparisonPage() {
  const comparisonPage = document.getElementById("comparison-page");
  if (!comparisonPage) return;
  const comparedProducts = getComparedProducts();
  if (!comparedProducts.length) {
    comparisonPage.innerHTML = `
      <section class="comparison-empty">
        <h1>Compare products</h1>
        <p>Your comparison list is empty. Add products from the catalogue to compare their details.</p>
        <a class="hero-link" href="index.html#category-sections">Browse products</a>
      </section>
    `;
    return;
  }

  const category = comparedProducts[0].category;
  const categoryName = sectionConfig.find((config) => config.key === category)?.title || titleFromCategory(category);
  const specKeys = getComparisonSpecKeys(category, comparedProducts);
  const rows = [
    { key: "brand", label: "Brand", value: (product) => product.brand || "Not specified" },
    { key: "model", label: "Model", value: (product) => getProductModel(product) || "Not specified" },
    { key: "price", label: "Price", value: (product) => formatPrice(product.price) },
    ...specKeys.map((key) => ({ key, label: formatSpecLabel(key), value: (product) => getComparisonSpecValue(product, key) })),
    { key: "description", label: "Features", value: (product) => product.description || "Not specified" },
    { key: "availability", label: "Availability", value: (product) => product.stock === true ? "In stock" : product.stock === false ? "Out of stock" : "Not specified" },
    { key: "warranty", label: "Warranty", value: (product) => {
      const warranty = product.warranty || product.specs?.warranty;
      if (warranty && typeof warranty === "object" && warranty.years) return `${warranty.years} year${Number(warranty.years) === 1 ? "" : "s"}`;
      return warranty && !["to be confirmed", "not specified"].includes(String(warranty).toLowerCase())
        ? String(warranty)
        : "Not specified";
    } }
  ];

  comparisonPage.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>›</span><span>Compare products</span></nav>
    <div class="section-heading comparison-heading">
      <div><p class="section-kicker">${escapeHTML(categoryName)}</p><h1>Compare products</h1><p>${comparedProducts.length} of ${MAX_COMPARE_PRODUCTS} products selected</p></div>
      <button class="clear-filters" type="button" data-compare-clear>Clear all</button>
    </div>
    ${comparedProducts.length < 2 ? '<p class="comparison-hint">Add one more product in this category to compare specifications side by side.</p>' : ""}
    <div class="comparison-table-scroll" role="region" aria-label="Product comparison" tabindex="0">
      <table class="comparison-table">
        <thead><tr><th scope="col">Product</th>${comparedProducts.map((product) => `
          <th scope="col">
            <div class="comparison-product">
              <button type="button" class="comparison-remove" data-compare-remove="${escapeHTML(product.id)}" aria-label="Remove ${escapeHTML(product.name)} from comparison">×</button>
              <img src="${escapeHTML(product.image || "")}" alt="${escapeHTML(product.name)}" loading="lazy">
              <strong>${escapeHTML(product.name)}</strong>
              <a class="comparison-detail-link" href="product.html?id=${encodeURIComponent(product.id)}">View Details</a>
              <button class="add-to-cart comparison-add-to-cart" type="button" data-product-id="${escapeHTML(product.id)}"${product.stock === false ? " disabled" : ""}>${product.stock === false ? "Out of Stock" : "Add to Cart"}</button>
            </div>
          </th>
        `).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => {
            const values = comparedProducts.map(row.value);
            const distinctValues = new Set(values.filter((value) => value !== "Not specified" && value !== "Price on request"));
            const differs = distinctValues.size > 1;
            return `<tr class="${differs ? "comparison-row-differs" : ""}"><th scope="row">${escapeHTML(row.label)}</th>${values.map((value) => `<td>${escapeHTML(value)}</td>`).join("")}</tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function syncCompareButtons() {
  document.querySelectorAll("[data-compare-product]").forEach((button) => {
    const selected = compareIds.includes(button.dataset.compareProduct);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", `${selected ? "Remove from" : "Add to"} comparison: ${button.dataset.productName}`);
    const label = button.querySelector(".compare-label");
    if (label) label.textContent = selected ? "Comparing" : "Compare";
  });
  const detailButton = document.querySelector("[data-compare-detail]");
  if (detailButton) {
    const selected = compareIds.includes(detailButton.dataset.compareDetail);
    detailButton.classList.toggle("is-selected", selected);
    detailButton.setAttribute("aria-pressed", String(selected));
    const label = detailButton.querySelector(".compare-label");
    if (label) label.textContent = selected ? "Added to Compare" : "Add to Compare";
  }
}

function renderComparisonBar() {
  let bar = document.getElementById("comparison-bar");
  if (!compareIds.length) {
    bar?.remove();
    document.body.classList.remove("has-comparison-bar");
    return;
  }
  if (!bar) {
    bar = document.createElement("aside");
    bar.id = "comparison-bar";
    bar.className = "comparison-bar";
    bar.setAttribute("aria-label", "Selected products for comparison");
    bar.setAttribute("aria-live", "polite");
    document.body.append(bar);
  }
  const comparedProducts = getComparedProducts();
  bar.innerHTML = `
    <div class="comparison-bar-products">
      <strong class="comparison-bar-count">${comparedProducts.length} of ${MAX_COMPARE_PRODUCTS} selected</strong>
      ${comparedProducts.map((product) => `
        <div class="comparison-bar-item">
          <img src="${escapeHTML(product.image || "")}" alt="" loading="lazy">
          <span title="${escapeHTML(product.name)}">${escapeHTML(product.name)}</span>
          <button type="button" data-compare-remove="${escapeHTML(product.id)}" aria-label="Remove ${escapeHTML(product.name)} from comparison">×</button>
        </div>
      `).join("")}
    </div>
    <div class="comparison-bar-actions">
      <button type="button" class="comparison-clear" data-compare-clear>Clear all</button>
      <a class="comparison-now" href="compare.html"${comparedProducts.length < 2 ? ' aria-disabled="true" tabindex="-1"' : ""}>Compare Now</a>
    </div>
  `;
  document.body.classList.add("has-comparison-bar");
}

function selectAffordableProducts(categoryProducts, limit) {
  const pricedProducts = categoryProducts.filter(hasValidPrice).slice().sort((a, b) => Number(a.price) - Number(b.price));
  const selected = [];
  const selectedBrands = new Set();

  pricedProducts.forEach((product) => {
    if (selected.length < limit && product.brand && !selectedBrands.has(product.brand)) {
      selected.push(product);
      selectedBrands.add(product.brand);
    }
  });

  pricedProducts.forEach((product) => {
    if (selected.length < limit && !selected.includes(product)) {
      selected.push(product);
    }
  });

  return selected;
}

function loadCartItems() {
  const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!storedCart) return [];

  try {
    const parsedCart = JSON.parse(storedCart);
    if (!Array.isArray(parsedCart)) {
      console.error("Saved ALFAJIR cart is not a valid item list.");
      return [];
    }
    return parsedCart
      .filter((item) => item && typeof item.id === "string" && Number.isSafeInteger(item.quantity) && item.quantity > 0)
      .map(({ id, quantity }) => ({ id, quantity }));
  } catch (error) {
    console.error("Could not read the saved ALFAJIR cart.", error);
    return [];
  }
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
    televisions: ["screenSize", "resolution", "displayTechnology",],
    refrigerators: ["capacity", "configuration", "energyRating", "dimensions"],
    "washing-machines": ["load", "type", "spinSpeed", "motorTechnology", "energyRating"],
    "sound-bars": ["power", "audio", "connectivity", "subwoofer", "battery"],
    "chest-freezers": ["capacity", "type", "color"],
    "kitchen-appliances": ["burnerConfiguration", "size", "power", "capacity", "colour", "functions", "jar", "set"],
    "home-appliances": ["type", "colour", "power", "loading", "water", "capacity"]
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
  const model = getProductModel(product);
  const unavailable = product.stock === false;

  return `
    <article class="product-card" data-category="${escapeHTML(product.category || "")}" data-brand="${escapeHTML(product.brand || "")}" data-product-id="${escapeHTML(product.id)}">
      <div class="product-image-wrap">
        <a class="product-image-link" href="${detailsUrl}" aria-label="View details for ${escapeHTML(product.name)}">
          <img src="${escapeHTML(product.image || "")}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async">
        </a>
        <button class="compare-trigger" type="button" data-compare-product="${escapeHTML(product.id)}"
          data-product-name="${escapeHTML(product.name)}" aria-pressed="false" aria-label="Add to comparison: ${escapeHTML(product.name)}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v17m-5 1h10M5 6h14M5 6 2 13h6L5 6Zm14 0-3 7h6l-3-7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="compare-label">Compare</span>
        </button>
      </div>
      <a class="product-card-link" href="${detailsUrl}" aria-label="View details for ${escapeHTML(product.name)}">
        <div class="product-body">
          <p class="product-brand">${escapeHTML(product.brand || "")}</p>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          ${model ? `<p class="product-model">Model: ${escapeHTML(model)}</p>` : ""}
          <span class="product-price">${formatPrice(product.price)}</span>
          <span class="product-details-action">View Details</span>
        </div>
      </a>
      <button class="add-to-cart" type="button" data-product-id="${escapeHTML(product.id)}"${unavailable ? " disabled" : ""}>${unavailable ? "Out of Stock" : "Add to Cart"}</button>
    </article>
  `;
}

function renderFeaturedProducts() {
  if (!featuredGrid) {
    return;
  }
  const featured = [];
  const featuredBrands = new Set();
  sectionConfig.forEach((config) => {
    const candidates = products.filter((product) => product.category === config.key && hasValidPrice(product))
      .slice()
      .sort((a, b) => Number(a.price) - Number(b.price));
    const targetIndex = Math.floor((candidates.length - 1) * 0.3);
    const product = candidates.slice(targetIndex).find((candidate) => candidate.brand && !featuredBrands.has(candidate.brand))
      || candidates.find((candidate) => candidate.brand && !featuredBrands.has(candidate.brand))
      || candidates[targetIndex];
    if (product && !featured.includes(product)) {
      featured.push(product);
      if (product.brand) featuredBrands.add(product.brand);
    }
  });
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
    const categoryProducts = products.filter((product) => product.category === config.key);
    const selection = selectAffordableProducts(categoryProducts, 4);
    grid.innerHTML = selection.length ? selection.map(renderProductCard).join("") : '<p class="category-empty">No products available yet.</p>';
  });
}

function selectApplianceShowcaseProducts(categoryKey, categoryProducts) {
  const subcategories = categoryKey === "kitchen-appliances"
    ? kitchenApplianceCategories.filter((item) => item.key !== "other").map((item) => item.key)
    : homeApplianceCategories.map((item) => item.key);
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

  const menuItems = [
    '<a class="nav-home" href="index.html">Home</a>',
    '<a class="nav-category-link nav-shop" href="index.html#category-sections">Shop</a>'
  ];

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

  const brands = new Map();
  const brandCategories = new Map();
  products.forEach((product) => {
    const brand = String(product.brand || "").trim();
    const key = brand.toLowerCase();
    if (key && !brands.has(key)) {
      brands.set(key, brand);
    }
    if (key && product.category) {
      const categories = brandCategories.get(key) || new Map();
      categories.set(product.category, (categories.get(product.category) || 0) + 1);
      brandCategories.set(key, categories);
    }
  });

  const logoBrands = [...brands].filter(([key]) => brandLogoAssets.has(key));
  const renderLogoCards = (isDuplicate = false) => logoBrands.map(([key, brand]) => {
    const logoPath = brandLogoAssets.get(key);
    const category = [...(brandCategories.get(key) || new Map())]
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const categoryUrl = category
      ? `category.html?category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}`
      : "category.html";
    const tabIndex = isDuplicate ? ' tabindex="-1"' : "";
    return `<a class="brand-logo-card" href="${categoryUrl}" aria-label="Shop ${escapeHTML(brand)}"${tabIndex}><img class="brand-logo-image brand-logo-image--${key}" src="${logoPath}" alt="" decoding="async"></a>`;
  }).join("");

  brandStrip.innerHTML = `
    <div class="brand-strip-track">
      <div class="brand-logo-group">${renderLogoCards()}</div>
      <div class="brand-logo-group" aria-hidden="true">${renderLogoCards(true)}</div>
    </div>`;

  brandStrip.querySelectorAll("img").forEach((logo) => {
    logo.addEventListener("error", () => {
      logo.parentElement.remove();
    }, { once: true });
  });
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
  cartItems = cartItems.filter((item) => products.some((product) => product.id === item.id));
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  if (cartCountElement) {
    cartCountElement.textContent = String(itemCount);
    cartCountElement.parentElement.setAttribute("aria-label", `View cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`);
  }
  renderCartContents();
}

function getCartTotal() {
  return cartItems.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return total + (product && hasValidPrice(product) ? Number(product.price) * item.quantity : 0);
  }, 0);
}

function renderCartContents() {
  const cartContents = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("cart-checkout");
  if (!cartContents || !cartTotal || !checkoutButton) return;

  const rows = cartItems.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) return "";
    return `
      <article class="cart-item">
        <img src="${escapeHTML(product.image || "")}" alt="" loading="lazy">
        <div class="cart-item-copy">
          <strong>${escapeHTML(product.brand || "")}</strong>
          <p>${escapeHTML(product.name)}</p>
          <span>${formatPrice(product.price)}</span>
          <label>Qty <input type="number" min="1" step="1" value="${item.quantity}" data-cart-quantity="${escapeHTML(item.id)}" aria-label="Quantity for ${escapeHTML(product.name)}"></label>
        </div>
        <button type="button" class="cart-remove" data-cart-remove="${escapeHTML(item.id)}">Remove</button>
      </article>
    `;
  }).join("");

  cartContents.innerHTML = rows || '<p class="cart-empty">Your cart is empty. Add products to start an order.</p>';
  cartTotal.textContent = formatPrice(getCartTotal());
  checkoutButton.disabled = cartItems.length === 0;
}

function openCart() {
  const cartDialog = document.getElementById("cart-dialog");
  if (!cartDialog) return;
  renderCartContents();
  cartDialog.showModal();
  document.querySelector(".cart-button")?.setAttribute("aria-expanded", "true");
}

function saveCart() {
  updateCartCount();
}

function addToCart(product, quantity) {
  const currentItem = cartItems.find((item) => item.id === product.id);
  if (currentItem) {
    currentItem.quantity += quantity;
  } else {
    cartItems.push({ id: product.id, quantity });
  }
  saveCart();
}

function createCartDialog() {
  if (document.getElementById("cart-dialog")) return;
  const cartDialog = document.createElement("dialog");
  cartDialog.id = "cart-dialog";
  cartDialog.className = "cart-dialog";
  cartDialog.setAttribute("aria-labelledby", "cart-heading");
  cartDialog.innerHTML = `
    <div class="cart-dialog-inner">
      <div class="cart-dialog-heading">
        <h2 id="cart-heading">Your Cart</h2>
        <button type="button" class="mobile-filter-close" data-cart-close aria-label="Close cart">×</button>
      </div>
      <div id="cart-items" class="cart-items" aria-live="polite"></div>
      <div class="cart-summary">
        <span>Estimated total</span>
        <strong id="cart-total">KSh 0</strong>
      </div>
      <p class="cart-checkout-note">Continue to WhatsApp to share your order details and confirm delivery and payment options.</p>
      <button type="button" id="cart-checkout" class="add-to-cart cart-checkout">Continue to WhatsApp</button>
    </div>
  `;
  document.body.append(cartDialog);

  cartDialog.addEventListener("close", () => {
    document.querySelector(".cart-button")?.setAttribute("aria-expanded", "false");
  });
  cartDialog.addEventListener("click", (event) => {
    if (event.target === cartDialog || event.target.closest("[data-cart-close]")) {
      cartDialog.close();
      return;
    }
    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      cartItems = cartItems.filter((item) => item.id !== removeButton.dataset.cartRemove);
      saveCart();
      return;
    }
    if (event.target.id === "cart-checkout" && cartItems.length) {
      const orderLines = cartItems.map((item) => {
        const product = products.find((entry) => entry.id === item.id);
        const price = hasValidPrice(product) ? `KSh ${Number(product.price).toLocaleString()} each` : "Price to be confirmed";
        return `- ${product.name} (${product.brand || "ALFAJIR"}), Qty ${item.quantity}, ${price}`;
      });
      const message = [
        "Hello ALFAJIR, I would like to place an order:",
        ...orderLines,
        `Estimated total: ${formatPrice(getCartTotal())}`,
        "Please confirm availability, delivery, and payment options."
      ].join("\n");
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  });
  cartDialog.addEventListener("change", (event) => {
    const quantityInput = event.target.closest("[data-cart-quantity]");
    if (!quantityInput) return;
    const quantity = Number.parseInt(quantityInput.value, 10);
    const item = cartItems.find((entry) => entry.id === quantityInput.dataset.cartQuantity);
    if (!item) return;
    item.quantity = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
    saveCart();
  });
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides[activeSlide]?.parentElement.classList.toggle(
    "has-poster-slide",
    slides[activeSlide].classList.contains("hero-slide-poster")
  );
  slides[activeSlide]?.parentElement.classList.toggle(
    "has-banner-slide",
    slides[activeSlide].classList.contains("hero-slide-banner")
  );

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

    const link = event.target.closest("a");
    if (link) {
      categoryNavigation.querySelectorAll(".nav-category").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".nav-category-toggle").setAttribute("aria-expanded", "false");
      });
      if (link.matches(".nav-home, .nav-shop, .nav-category-title, .nav-category-link, .category-menu-link")) {
        navigation.classList.remove("is-open");
        menuToggle?.setAttribute("aria-expanded", "false");
      }
    }
  });
}

createCartDialog();
document.querySelector(".cart-button")?.addEventListener("click", openCart);
document.addEventListener("click", (event) => {
  const compareButton = event.target.closest("[data-compare-product], [data-compare-detail]");
  if (compareButton) {
    event.preventDefault();
    event.stopPropagation();
    addToComparison(compareButton.dataset.compareProduct || compareButton.dataset.compareDetail);
    if (document.getElementById("comparison-page")) renderComparisonPage();
    return;
  }
  const removeButton = event.target.closest("[data-compare-remove]");
  if (removeButton) {
    event.preventDefault();
    event.stopPropagation();
    const product = products.find((item) => item.id === removeButton.dataset.compareRemove);
    removeFromComparison(removeButton.dataset.compareRemove);
    showComparisonMessage(`${product?.name || "Product"} removed from comparison.`);
    if (document.getElementById("comparison-page")) renderComparisonPage();
    return;
  }
  if (event.target.closest("[data-compare-clear]")) {
    clearComparison();
    if (document.getElementById("comparison-page")) renderComparisonPage();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== COMPARE_STORAGE_KEY) return;
  compareIds = loadComparedProductIds();
  renderComparisonBar();
  syncCompareButtons();
  if (document.getElementById("comparison-page")) renderComparisonPage();
});

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = String(new FormData(searchForm).get("q") || "").trim();
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
  if (!button || button.disabled) return;
  const product = products.find((item) => item.id === button.dataset.productId);
  if (!product || product.stock === false) return;

  const quantityInput = button.closest(".product-detail-copy")?.querySelector(".product-quantity");
  const requestedQuantity = quantityInput ? Number.parseInt(quantityInput.value, 10) : 1;
  const quantity = Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;
  addToCart(product, quantity);
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
saveComparison();
renderComparisonPage();
const initialSearchQuery = new URLSearchParams(window.location.search).get("q");
if (initialSearchQuery && searchResultsSection) {
  if (searchForm?.elements.q) searchForm.elements.q.value = initialSearchQuery;
  renderSearchResults(initialSearchQuery);
}
