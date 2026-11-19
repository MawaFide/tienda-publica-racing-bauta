(function () {
  const config = window.RACING_BAUTA_STORE || {};
  const grid = document.getElementById("productGrid");
  const template = document.getElementById("productTemplate");
  const status = document.getElementById("status");
  const count = document.getElementById("count");
  const emptyState = document.getElementById("emptyState");
  const search = document.getElementById("search");
  const productFilter = document.getElementById("productFilter");
  const sortBy = document.getElementById("sortBy");
  let products = [];
  let dollarRate = null;
  const money = new Intl.NumberFormat("es-CU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  // sale_price is the final CUP price, already including the profit markup.
  // The administrator app publishes CUP per US dollar to Supabase.
  function usdPrice(product) {
    const rate = Number(dollarRate);
    return Number.isFinite(rate) && rate > 0 ? product.sale_price / rate : null;
  }
  function setStatus(text) { status.textContent = text; }
  function initials(product) {
    return `${product.product_name || ""} ${product.model_name || ""}`.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "RB";
  }
  function contactUrl(product) {
    const phone = (config.whatsappPhone || "").replace(/\D/g, "");
    const text = encodeURIComponent(`Hola, quiero consultar por ${product.product_name} ${product.model_name}.`);
    if (phone) return `https://wa.me/${phone}?text=${text}`;
    return `mailto:${config.contactEmail || ""}?subject=Consulta Racing-Bauta&body=${text}`;
  }
  function normalize(row) {
    return {
      id: row.id || row.model_id,
      product_name: row.product_name || "Producto",
      model_name: row.model_name || "Modelo",
      sale_price: Number(row.sale_price || 0),
      quantity: Number(row.quantity || 0),
      image_url: row.image_url || "",
      updated_at: row.updated_at || ""
    };
  }
  async function loadProducts() {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      setStatus("Sin configurar");
      products = [];
      renderFilters();
      render();
      return;
    }
    const base = config.supabaseUrl.replace(/\/$/, "");
    const url = `${base}/rest/v1/store_products?select=*&quantity=gt.0&order=product_name.asc&order=model_name.asc`;
    const response = await fetch(url, {
      headers: {
        apikey: config.supabaseAnonKey
      }
    });
    if (!response.ok) throw new Error(`Supabase respondio ${response.status}`);
    products = (await response.json()).map(normalize);
    // No manual fallback: a missing rate must never create misleading prices.
    dollarRate = null;
    try {
      const rateResponse = await fetch(`${base}/rest/v1/rm_store_settings?select=dollar_rate&singleton=eq.true`, {
        headers: { apikey: config.supabaseAnonKey }
      });
      if (rateResponse.ok) {
        const rows = await rateResponse.json();
        const rate = Number(rows[0]?.dollar_rate);
        if (Number.isFinite(rate) && rate > 0) dollarRate = rate;
      }
    } catch (error) {
      console.warn("No se pudo actualizar la tasa de cambio de la tienda.");
    }
    setStatus(dollarRate === null ? "Tasa pendiente" : "Actualizado");
    renderFilters();
    render();
  }
  function renderFilters() {
    const selected = productFilter.value;
    const names = [...new Set(products.map((item) => item.product_name))].sort((a, b) => a.localeCompare(b));
    productFilter.innerHTML = '<option value="">Todos</option>';
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      productFilter.appendChild(option);
    }
    productFilter.value = names.includes(selected) ? selected : "";
  }
  function filteredProducts() {
    const term = search.value.trim().toLowerCase();
    const productName = productFilter.value;
    const rows = products.filter((item) => {
      const matchesText = `${item.product_name} ${item.model_name}`.toLowerCase().includes(term);
      const matchesProduct = !productName || item.product_name === productName;
      return item.quantity > 0 && matchesText && matchesProduct;
    });
    const order = sortBy.value;
    rows.sort((a, b) => {
      if (order === "price_asc") return a.sale_price - b.sale_price;
      if (order === "price_desc") return b.sale_price - a.sale_price;
      if (order === "stock_desc") return b.quantity - a.quantity;
      return `${a.product_name} ${a.model_name}`.localeCompare(`${b.product_name} ${b.model_name}`);
    });
    return rows;
  }
  function render() {
    const rows = filteredProducts();
    grid.innerHTML = "";
    count.textContent = String(rows.length);
    emptyState.hidden = rows.length !== 0;
    for (const product of rows) {
      const node = template.content.firstElementChild.cloneNode(true);
      const image = node.querySelector(".photo");
      const fallback = node.querySelector(".photo-fallback");
      node.querySelector(".category").textContent = product.product_name;
      node.querySelector("h2").textContent = product.model_name;
      node.querySelector(".price").textContent = `${money.format(product.sale_price)} CUP`;
      const usd = usdPrice(product);
      node.querySelector(".price-usd").textContent = usd === null
        ? "US: por confirmar"
        : `${money.format(usd)} US`;
      node.querySelector(".price-usd").title = usd === null
        ? "Tasa de cambio pendiente de configurar"
        : `1 US = ${money.format(Number(dollarRate))} CUP`;
      node.querySelector(".stock").textContent = `${product.quantity} disp.`;
      fallback.textContent = initials(product);
      fallback.hidden = false;
      image.loading = "lazy";
      image.addEventListener("load", () => { fallback.hidden = true; });
      node.querySelector(".contact").href = contactUrl(product);
      if (product.image_url) {
        image.src = product.image_url;
        image.alt = `${product.product_name} ${product.model_name}`;
        image.addEventListener("error", () => { image.hidden = true; fallback.hidden = false; });
      } else {
        image.hidden = true;
      }
      grid.appendChild(node);
    }
  }
  for (const input of [search, productFilter, sortBy]) input.addEventListener("input", render);
  async function refresh() {
    try { await loadProducts(); } catch (error) {
    console.error(error);
    setStatus("Sin conexión; reintentando");
    } finally { setTimeout(refresh, 15000); }
  }
  refresh();
})();
