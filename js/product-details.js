const productDetailsRoot = document.getElementById("product-details");
const productId = new URLSearchParams(window.location.search).get("id");
const product = window.ALFAJIR_PRODUCTS.find((item) => item.id === productId);

function escapeProductHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatProductSpecLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function renderProductDetails(productData) {
  const images = [...new Set([productData.image, ...(productData.images || [])].filter(Boolean))];
  const productSpecs = { ...(productData.specs || {}) };
  const specs = Object.entries(productSpecs)
    .filter(([key]) => !["model", "warranty"].includes(key.toLowerCase()))
    .map(([key, value]) => `
      <div class="details-spec-item">
        <dt>${escapeProductHTML(formatProductSpecLabel(key))}</dt>
        <dd>${escapeProductHTML(value)}</dd>
      </div>
    `)
    .join("");
  const warranty = productData.warranty || productData.specs?.warranty;
  const warrantyDisplay = typeof warranty === "object" && warranty !== null && warranty.years
    ? `${warranty.years} year${Number(warranty.years) === 1 ? "" : "s"}`
    : warranty;
  const validWarranty = (typeof warrantyDisplay === "string" || typeof warrantyDisplay === "number")
    && !["to be confirmed", "not specified"].includes(String(warrantyDisplay).toLowerCase());
  const model = productData.model || productData.specs?.model;
  const hasModel = model && String(model).trim() && String(model).toLowerCase() !== "not specified";
  const price = Number(productData.price);
  const hasPrice = productData.price !== null && productData.price !== undefined && Number.isFinite(price) && price > 0;
  const enquiry = [
    `Hello ALFAJIR, I am enquiring about ${productData.name}.`,
    `Brand: ${productData.brand || "Not specified"}`,
    `Model: ${hasModel ? model : "Not specified"}`,
    `Price: ${hasPrice ? `KSh ${price.toLocaleString()}` : "Please confirm"}`
  ].join("\n");

  document.title = `${productData.name} | ALFAJIR`;
  productDetailsRoot.innerHTML = `
    <article class="product-detail">
      <div class="product-gallery">
        <div class="product-detail-image">
          <img class="product-gallery-main" src="${escapeProductHTML(images[0] || "")}" alt="${escapeProductHTML(productData.name)}">
        </div>
        ${images.length > 1 ? `
          <div class="product-gallery-thumbnails" aria-label="Product images">
            ${images.map((image, index) => `
              <button class="product-gallery-thumbnail${index === 0 ? " is-active" : ""}"
                type="button" data-image="${escapeProductHTML(image)}" aria-label="Show product image ${index + 1}"
                aria-pressed="${index === 0}">
                <img src="${escapeProductHTML(image)}" alt="">
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="product-detail-copy">
        <p class="product-brand">${escapeProductHTML(productData.brand || "")}</p>
        <h1>${escapeProductHTML(productData.name)}</h1>
        ${hasModel ? `<p class="detail-model">Model: ${escapeProductHTML(model)}</p>` : ""}
        <p class="product-price detail-price">${hasPrice ? `KSh ${price.toLocaleString()}` : "Price on request"}</p>
        <p class="product-stock${productData.stock === false ? " is-out" : ""}">
          ${productData.stock === false ? "Out of stock" : productData.stock === true ? "In stock" : "Availability to be confirmed"}
        </p>
        <label class="quantity-control">
          <span>Quantity</span>
          <input class="product-quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
        </label>
        <button class="add-to-cart detail-add-to-cart" type="button" data-product-id="${escapeProductHTML(productData.id)}"${productData.stock === false ? " disabled" : ""}>${productData.stock === false ? "Out of Stock" : "Add to Cart"}</button>
        <button class="compare-trigger detail-compare-trigger" type="button" data-compare-detail="${escapeProductHTML(productData.id)}"
          data-product-name="${escapeProductHTML(productData.name)}" aria-pressed="false">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v17m-5 1h10M5 6h14M5 6 2 13h6L5 6Zm14 0-3 7h6l-3-7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="compare-label">Add to Compare</span>
        </button>
        <a class="whatsapp-enquiry" href="https://wa.me/${window.ALFAJIR_WHATSAPP_NUMBER}?text=${encodeURIComponent(enquiry)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a>
        ${productData.description ? `
          <section class="product-detail-description" aria-labelledby="description-heading">
            <h2 id="description-heading">Product description</h2>
            <p>${escapeProductHTML(productData.description)}</p>
          </section>
        ` : ""}
        ${validWarranty ? `<p class="detail-warranty"><strong>Warranty:</strong> ${escapeProductHTML(warrantyDisplay)}</p>` : ""}
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
