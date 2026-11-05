const productDetailsRoot = document.getElementById("product-details");
const productId = new URLSearchParams(window.location.search).get("id");
const product = window.ALFAJIR_PRODUCTS.find((item) => item.id === productId);

function formatProductSpecLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function generateFallbackModel(productData) {
  const source = [productData?.brand, productData?.name, productData?.id, productData?.specs?.model]
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

function renderProductDetails(productData) {
  const images = [...new Set([productData.image, ...(productData.images || [])].filter(Boolean))];
  const productSpecs = { ...(productData.specs || {}) };
  if (productData.category === "televisions" && !productSpecs.refreshRate) {
    productSpecs.refreshRate = "Not specified";
  }
  if (productData.category === "televisions") {
    if (!productSpecs.connectivity) productSpecs.connectivity = "To be confirmed";
    productSpecs.warranty = "1 Year";
  }
  const specs = Object.entries(productSpecs)
    .filter(([key]) => key !== "model")
    .map(([key, value]) => `
      <div class="details-spec-item">
        <dt>${formatProductSpecLabel(key)}</dt>
        <dd>${value === "To be confirmed" || value === "Not specified" ? "Not provided yet" : value}</dd>
      </div>
    `)
    .join("");
  const warranty = productData.warranty || productData.specs?.warranty;
  const warrantyDisplay = warranty === "To be confirmed" || warranty === "Not specified"
    ? "Not provided yet"
    : warranty;
  const model = productData.model || productData.specs?.model || generateFallbackModel(productData);
  const confirmedModel = model && String(model).trim() && String(model).toLowerCase() !== "not specified"
    ? model
    : "Model details pending";

  document.title = `${productData.name} | ALFAJIR`;
  productDetailsRoot.innerHTML = `
    <article class="product-detail">
      <div class="product-gallery">
        <div class="product-detail-image">
          <img class="product-gallery-main" src="${images[0] || ""}" alt="${productData.name}">
        </div>
        ${images.length > 1 ? `
          <div class="product-gallery-thumbnails" aria-label="Product images">
            ${images.map((image, index) => `
              <button class="product-gallery-thumbnail${index === 0 ? " is-active" : ""}"
                type="button" data-image="${image}" aria-label="Show product image ${index + 1}"
                aria-pressed="${index === 0}">
                <img src="${image}" alt="">
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="product-detail-copy">
        <p class="product-brand">${productData.brand || ""}</p>
        <h1>${productData.name}</h1>
        <p class="detail-model">Model: ${confirmedModel}</p>
        <p class="product-price detail-price">${productData.price === null || productData.price === undefined
          ? "Price on request"
          : `KSh ${Number(productData.price).toLocaleString()}`}</p>
        <p class="product-stock${productData.stock === false ? " is-out" : ""}">
          ${productData.stock === false ? "Out of stock" : productData.stock === true ? "In stock" : "Availability to be confirmed"}
        </p>
        <label class="quantity-control">
          <span>Quantity</span>
          <input class="product-quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
        </label>
        <button class="add-to-cart detail-add-to-cart" type="button" data-product-id="${productData.id}">Add to Cart</button>
        <section class="product-detail-description" aria-labelledby="description-heading">
          <h2 id="description-heading">Product description</h2>
          <p>${productData.description || "Description not provided yet."}</p>
        </section>
        ${warranty && productData.category !== "televisions" ? `<p class="detail-warranty"><strong>Warranty:</strong> ${warrantyDisplay}</p>` : ""}
        <section class="product-detail-specifications" aria-labelledby="specifications-heading">
          <h2 id="specifications-heading">Specifications</h2>
          ${specs
            ? `<dl class="details-spec-list">${specs}</dl>`
            : '<p class="details-unavailable">Specifications not provided yet.</p>'}
        </section>
      </div>
    </article>
  `;
}

if (product) {
  renderProductDetails(product);
} else {
  document.title = "Product Not Found | ALFAJIR";
  productDetailsRoot.innerHTML = `
    <section class="product-not-found">
      <h1>Product not found</h1>
      <p>This product may have been removed or the link may be incomplete.</p>
      <a class="hero-link" href="index.html">Return to shopping</a>
    </section>
  `;
}

productDetailsRoot.addEventListener("click", (event) => {
  const thumbnail = event.target.closest(".product-gallery-thumbnail");
  if (!thumbnail) return;
  productDetailsRoot.querySelector(".product-gallery-main").src = thumbnail.dataset.image;
  productDetailsRoot.querySelectorAll(".product-gallery-thumbnail").forEach((button) => {
    const isActive = button === thumbnail;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
});
