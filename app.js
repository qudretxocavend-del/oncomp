const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

function showLogin() {
  loginPage.classList.remove("hidden");
  appPage.classList.add("hidden");
}

function showApp() {
  loginPage.classList.add("hidden");
  appPage.classList.remove("hidden");
}

function showMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = type;
}

/* ================= AUTH ================= */

async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    showLogin();
    return;
  }

  if (data.session) {
    showApp();
    await loadDashboard();
  } else {
    showLogin();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showMessage("E-poçt və şifrə daxil edin.");
    return;
  }

  const button = loginForm.querySelector("button");

  button.disabled = true;
  button.textContent = "Daxil olunur...";
  showMessage("");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  button.disabled = false;
  button.textContent = "Daxil ol";

  if (error) {
    console.error(error);
    showMessage("E-poçt və ya şifrə yanlışdır.");
    return;
  }

  if (data.session) {
    showApp();
    showMessage("Uğurla daxil oldunuz.", "success");
    await loadDashboard();
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
  loginForm.reset();
});

/* Sessiya dəyişəndə avtomatik idarə et */
supabaseClient.auth.onAuthStateChange(async (event, session) => {

  if (session) {
    showApp();

    if (event === "SIGNED_IN") {
      await loadDashboard();
    }

  } else {
    showLogin();
  }
});

/* ================= NAVIGATION ================= */

const navItems = document.querySelectorAll(".nav-item");
const contentPages = document.querySelectorAll(".content-page");

const pageTitles = {
  dashboard: "Dashboard",
  products: "Məhsullar",
  sales: "Satışlar",
  customers: "Müştərilər",
  inventory: "Anbar",
  expenses: "Xərclər",
  reports: "Hesabatlar",
  settings: "Parametrlər"
};

function openPage(pageName) {

  contentPages.forEach(page => {
    page.classList.remove("active-page");
  });

  navItems.forEach(item => {
    item.classList.remove("active");
  });

  const targetPage = document.getElementById(`${pageName}Page`);
  const targetNav = document.querySelector(
    `.nav-item[data-page="${pageName}"]`
  );

  if (targetPage) {
    targetPage.classList.add("active-page");
  }

  if (targetNav) {
    targetNav.classList.add("active");
  }

  const title = document.getElementById("pageTitle");

  if (title) {
    title.textContent = pageTitles[pageName] || pageName;
  }
}

navItems.forEach(item => {

  item.addEventListener("click", () => {
    const page = item.dataset.page;

    if (page) {
      openPage(page);
    }
  });

});

document.querySelectorAll("[data-page-action]").forEach(button => {

  button.addEventListener("click", () => {
    const page = button.dataset.pageAction;

    if (page) {
      openPage(page);
    }
  });

});

/* ================= DASHBOARD ================= */

async function loadDashboard() {

  try {

    const { count: productsCount } =
      await supabaseClient
        .from("products")
        .select("*", {
          count: "exact",
          head: true
        });

    const { data: products } =
      await supabaseClient
        .from("products")
        .select("*");

    const { data: sales } =
      await supabaseClient
        .from("sales")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    const productTotal = productsCount || 0;

    document.getElementById("statProducts").textContent =
      productTotal;

    if (products && products.length) {

      const inventoryValue = products.reduce(
        (sum, product) =>
          sum + Number(product.purchase_price || 0),
        0
      );

      document.getElementById("statInventory").textContent =
        inventoryValue.toFixed(2) + " ₼";

      const available =
        products.filter(
          p => p.status !== "sold"
        ).length;

      const sold =
        products.filter(
          p => p.status === "sold"
        ).length;

      document.getElementById("stockAvailable").textContent =
        available;

      document.getElementById("stockSold").textContent =
        sold;
    }

    if (sales && sales.length) {

      const currentMonth =
        new Date().getMonth();

      const currentYear =
        new Date().getFullYear();

      const monthSales =
        sales.filter(s => {

          const date =
            new Date(
              s.created_at || s.sale_date
            );

          return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          );
        });

      const revenue =
        monthSales.reduce(
          (sum, sale) =>
            sum + Number(
              sale.total_amount ||
              sale.amount ||
              sale.sale_price ||
              0
            ),
          0
        );

      document.getElementById("statSales").textContent =
        revenue.toFixed(2) + " ₼";

      renderRecentSales(monthSales.slice(0, 5));
    }

  } catch (error) {

    console.error(
      "Dashboard məlumat xətası:",
      error
    );

  }
}

/* ================= RECENT SALES ================= */

function renderRecentSales(sales) {

  const table =
    document.getElementById("recentSalesTable");

  if (!table) return;

  if (!sales.length) {

    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          Hələ satış yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML = sales.map(sale => {

    const amount =
      Number(
        sale.total_amount ||
        sale.amount ||
        sale.sale_price ||
        0
      );

    const date =
      new Date(
        sale.created_at ||
        sale.sale_date
      );

    return `
      <tr>
        <td>${sale.product_name || "—"}</td>
        <td>${sale.customer_name || "—"}</td>
        <td>${amount.toFixed(2)} ₼</td>
        <td>${sale.payment_method || "—"}</td>
        <td>${date.toLocaleDateString("az-AZ")}</td>
      </tr>
    `;

  }).join("");
}

/* ================= INITIAL ================= */

document.addEventListener("DOMContentLoaded", async () => {

  openPage("dashboard");

  await checkSession();

});
/* ================= PRODUCTS ================= */

const addProductBtn = document.getElementById("addProductBtn");
const productsTable = document.getElementById("productsTable");
const productSearch = document.getElementById("productSearch");
const productCategoryFilter = document.getElementById("productCategoryFilter");
const productStatusFilter = document.getElementById("productStatusFilter");

async function loadProducts() {
  if (!productsTable) return;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Məhsullar yüklənmədi:", error);
    productsTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Məhsullar yüklənərkən xəta baş verdi
        </td>
      </tr>
    `;
    return;
  }

  renderProducts(data || []);
  updateCategoryFilter(data || []);
}

function renderProducts(products) {

  const search =
    productSearch?.value.trim().toLowerCase() || "";

  const category =
    productCategoryFilter?.value || "";

  const status =
    productStatusFilter?.value || "";

  const filtered = products.filter(product => {

    const text = `
      ${product.name || ""}
      ${product.brand || ""}
      ${product.model || ""}
      ${product.serial_number || ""}
      ${product.imei || ""}
    `.toLowerCase();

    const matchesSearch =
      !search || text.includes(search);

    const matchesCategory =
      !category || product.category === category;

    const matchesStatus =
      !status || product.status === status;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus
    );
  });

  if (!filtered.length) {
    productsTable.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Məhsul yoxdur
        </td>
      </tr>
    `;
    return;
  }

  productsTable.innerHTML = filtered.map(product => {

    const statusText =
      product.status === "sold"
        ? "Satılıb"
        : "Aktiv";

    return `
      <tr>
        <td>
          <strong>${escapeHTML(product.name || "—")}</strong>
          <br>
          <small>
            ${escapeHTML(product.brand || "")}
            ${escapeHTML(product.model || "")}
          </small>
        </td>

        <td>${escapeHTML(product.category || "—")}</td>

        <td>
          ${escapeHTML(
            product.serial_number ||
            product.imei ||
            "—"
          )}
        </td>

        <td>
          ${Number(product.purchase_price || 0).toFixed(2)} ₼
        </td>

        <td>
          ${Number(product.sale_price || 0).toFixed(2)} ₼
        </td>

        <td>${product.stock ?? 0}</td>

        <td>
          <span class="status-badge">
            ${statusText}
          </span>
        </td>

        <td>
          <button
            class="text-btn"
            onclick="deleteProduct(${product.id})"
          >
            Sil
          </button>
        </td>
      </tr>
    `;

  }).join("");
}


function updateCategoryFilter(products) {

  if (!productCategoryFilter) return;

  const current =
    productCategoryFilter.value;

  const categories = [
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )
  ];

  productCategoryFilter.innerHTML = `
    <option value="">Bütün kateqoriyalar</option>
    ${categories.map(category => `
      <option value="${escapeHTML(category)}">
        ${escapeHTML(category)}
      </option>
    `).join("")}
  `;

  productCategoryFilter.value = current;
}


/* ================= ADD PRODUCT ================= */

addProductBtn?.addEventListener("click", () => {

  const modalOverlay =
    document.getElementById("modalOverlay");

  const modalTitle =
    document.getElementById("modalTitle");

  const modalDescription =
    document.getElementById("modalDescription");

  const modalBody =
    document.getElementById("modalBody");

  modalTitle.textContent =
    "Yeni məhsul";

  modalDescription.textContent =
    "Notebook və ya planşet məlumatlarını daxil edin.";

  modalBody.innerHTML = `

    <form id="productForm">

      <div class="form-grid">

        <div class="form-group">
          <label>Məhsul adı *</label>
          <input id="productName" required
            placeholder="Məsələn: Notebook">
        </div>

        <div class="form-group">
          <label>Marka</label>
          <input id="productBrand"
            placeholder="Lenovo, HP, Apple...">
        </div>

        <div class="form-group">
          <label>Model</label>
          <input id="productModel"
            placeholder="ThinkPad T480">
        </div>

        <div class="form-group">
          <label>Kateqoriya</label>
          <select id="productCategory">
            <option value="Notebook">Notebook</option>
            <option value="Planşet">Planşet</option>
            <option value="Digər">Digər</option>
          </select>
        </div>

        <div class="form-group">
          <label>Seriya nömrəsi</label>
          <input id="productSerial"
            placeholder="Serial number">
        </div>

        <div class="form-group">
          <label>IMEI</label>
          <input id="productImei"
            placeholder="IMEI">
        </div>

        <div class="form-group">
          <label>Alış qiyməti</label>
          <input
            id="productPurchase"
            type="number"
            min="0"
            step="0.01"
            value="0">
        </div>

        <div class="form-group">
          <label>Satış qiyməti</label>
          <input
            id="productSale"
            type="number"
            min="0"
            step="0.01"
            value="0">
        </div>

        <div class="form-group">
          <label>Stok</label>
          <input
            id="productStock"
            type="number"
            min="0"
            value="1">
        </div>

        <div class="form-group">
          <label>Vəziyyət</label>
          <select id="productCondition">
            <option value="used">2-ci əl</option>
            <option value="new">Yeni</option>
            <option value="refurbished">Bərpa olunmuş</option>
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label>Qeyd</label>
          <textarea
            id="productNotes"
            rows="3"
            placeholder="Məhsul haqqında əlavə qeyd..."></textarea>
        </div>

      </div>

      <div style="
        display:flex;
        justify-content:flex-end;
        gap:10px;
        margin-top:20px;
      ">

        <button
          type="button"
          class="secondary-btn"
          id="cancelProductBtn">
          Ləğv et
        </button>

        <button
          type="submit"
          class="primary-btn">
          Məhsulu yadda saxla
        </button>

      </div>

    </form>
  `;

  modalOverlay.classList.remove("hidden");

  document
    .getElementById("cancelProductBtn")
    ?.addEventListener("click", closeProductModal);

  document
    .getElementById("productForm")
    ?.addEventListener("submit", saveProduct);
});


function closeProductModal() {

  document
    .getElementById("modalOverlay")
    ?.classList.add("hidden");
}


/* ================= SAVE PRODUCT ================= */

async function saveProduct(event) {

  event.preventDefault();

  const product = {

    name:
      document.getElementById("productName").value.trim(),

    brand:
      document.getElementById("productBrand").value.trim(),

    model:
      document.getElementById("productModel").value.trim(),

    category:
      document.getElementById("productCategory").value,

    serial_number:
      document.getElementById("productSerial").value.trim(),

    imei:
      document.getElementById("productImei").value.trim(),

    purchase_price:
      Number(document.getElementById("productPurchase").value || 0),

    sale_price:
      Number(document.getElementById("productSale").value || 0),

    stock:
      Number(document.getElementById("productStock").value || 0),

    status: "active",

    condition:
      document.getElementById("productCondition").value,

    notes:
      document.getElementById("productNotes").value.trim()
  };

  const { error } =
    await supabaseClient
      .from("products")
      .insert(product);

  if (error) {

    console.error(error);

    alert(
      "Məhsul əlavə edilmədi: " +
      error.message
    );

    return;
  }

  closeProductModal();

  await loadProducts();
  await loadDashboard();

  alert("Məhsul uğurla əlavə edildi.");
}


/* ================= DELETE PRODUCT ================= */

async function deleteProduct(id) {

  if (!confirm("Bu məhsulu silmək istəyirsiniz?")) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(error);

    alert(
      "Məhsul silinmədi: " +
      error.message
    );

    return;
  }

  await loadProducts();
  await loadDashboard();
}


/* ================= SEARCH / FILTER ================= */

productSearch?.addEventListener(
  "input",
  loadProducts
);

productCategoryFilter?.addEventListener(
  "change",
  loadProducts
);

productStatusFilter?.addEventListener(
  "change",
  loadProducts
);


/* ================= HTML SECURITY ================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ================= START PRODUCTS ================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadProducts();
  }
);
