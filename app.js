```javascript
/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   Supabase + Frontend
   ========================================================= */

const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";

/*
  Vercel-də Environment Variable:
  SUPABASE_ANON_KEY = sənin sb_publishable_... açarın

  Əgər local test edirsənsə, aşağıdakı sətrə öz publishable
  key-ni yaza bilərsən.
*/
const SUPABASE_KEY =
  window.ONCOMP_SUPABASE_KEY ||
  "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   ELEMENTLƏR
   ========================================================= */

const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");

const logoutBtn = document.getElementById("logoutBtn");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");


/* =========================================================
   KÖMƏKÇİ FUNKSİYALAR
   ========================================================= */

function showLoginMessage(message, type = "error") {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.className = `login-message ${type}`;
}


function showToast(message) {
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}


function formatMoney(value) {
  return new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0)) + " ₼";
}


function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("az-AZ");
}


function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   LOGIN / AUTH
   ========================================================= */

async function checkSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(error);
      showLoginMessage("Supabase bağlantısında problem yarandı.");
      return;
    }

    if (data.session) {
      await showApplication(data.session.user);
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showLoginMessage("Sistemə qoşulmaq mümkün olmadı.");
  }
}


function showLogin() {
  loginPage.classList.remove("hidden");
  appPage.classList.add("hidden");
}


async function showApplication(user) {
  loginPage.classList.add("hidden");
  appPage.classList.remove("hidden");

  const adminName = document.getElementById("adminName");

  if (adminName) {
    adminName.textContent =
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Admin";
  }

  await loadDashboard();
}


loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showLoginMessage("E-poçt və şifrəni daxil edin.");
    return;
  }

  const button = loginForm.querySelector("button[type='submit']");

  if (button) {
    button.disabled = true;
    button.textContent = "Daxil olunur...";
  }

  showLoginMessage("");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error);

      if (
        error.message?.toLowerCase().includes("invalid login credentials")
      ) {
        showLoginMessage("E-poçt və ya şifrə yanlışdır.");
      } else {
        showLoginMessage(error.message || "Giriş zamanı xəta baş verdi.");
      }

      return;
    }

    if (data.session) {
      showLoginMessage("Uğurla daxil oldunuz.", "success");
      await showApplication(data.user);
    }
  } catch (error) {
    console.error(error);
    showLoginMessage("Giriş zamanı gözlənilməz xəta baş verdi.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Daxil ol";
    }
  }
});


logoutBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();

  appPage.classList.add("hidden");
  loginPage.classList.remove("hidden");

  loginEmail.value = "";
  loginPassword.value = "";

  showToast("Sistemdən çıxış edildi.");
});


supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    await showApplication(session.user);
  }

  if (event === "SIGNED_OUT") {
    showLogin();
  }
});


/* =========================================================
   NAVİQASİYA
   ========================================================= */

const pageNames = {
  dashboard: "Dashboard",
  products: "Məhsullar",
  sales: "Satışlar",
  customers: "Müştərilər",
  inventory: "Anbar",
  expenses: "Xərclər",
  reports: "Hesabatlar",
  settings: "Parametrlər"
};


function openPage(page) {
  document.querySelectorAll(".content-page").forEach(section => {
    section.classList.remove("active-page");
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.remove("active");
  });

  const target = document.getElementById(`${page}Page`);
  const navButton = document.querySelector(
    `.nav-item[data-page="${page}"]`
  );

  if (target) {
    target.classList.add("active-page");
  }

  if (navButton) {
    navButton.classList.add("active");
  }

  const pageTitle = document.getElementById("pageTitle");

  if (pageTitle) {
    pageTitle.textContent = pageNames[page] || page;
  }

  if (page === "dashboard") loadDashboard();
  if (page === "products") loadProducts();
  if (page === "sales") loadSales();
  if (page === "customers") loadCustomers();
  if (page === "inventory") loadInventory();
  if (page === "expenses") loadExpenses();
  if (page === "reports") loadReports();
}


document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});


document.querySelectorAll("[data-page-action]").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.pageAction);
  });
});


/* =========================================================
   MODAL
   ========================================================= */

function openModal(title, description, html) {
  modalTitle.textContent = title;
  modalDescription.textContent = description;
  modalBody.innerHTML = html;

  modalOverlay.classList.remove("hidden");
}


function closeModal() {
  modalOverlay.classList.add("hidden");
  modalBody.innerHTML = "";
}


closeModalBtn?.addEventListener("click", closeModal);


modalOverlay?.addEventListener("click", event => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {
  try {
    const [
      productsResult,
      salesResult
    ] = await Promise.all([
      supabaseClient
        .from("products")
        .select("*"),

      supabaseClient
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    const products = productsResult.data || [];
    const sales = salesResult.data || [];

    if (productsResult.error) {
      console.warn("Products:", productsResult.error.message);
    }

    if (salesResult.error) {
      console.warn("Sales:", salesResult.error.message);
    }

    updateDashboardStats(products, sales);
    renderRecentSales(sales);
    renderStockSummary(products);
  } catch (error) {
    console.error("Dashboard:", error);
  }
}


function updateDashboardStats(products, sales) {
  const activeProducts = products.filter(
    product => product.status !== "sold"
  );

  const inventoryValue = activeProducts.reduce(
    (sum, product) =>
      sum + Number(product.purchase_price || product.buy_price || 0),
    0
  );

  const now = new Date();

  const monthlySales = sales.filter(sale => {
    const date = new Date(sale.created_at || sale.date);

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  const salesTotal = monthlySales.reduce(
    (sum, sale) =>
      sum + Number(sale.sale_price || sale.total || sale.amount || 0),
    0
  );

  const profitTotal = monthlySales.reduce(
    (sum, sale) =>
      sum + Number(sale.profit || 0),
    0
  );

  setText("statProducts", products.length);
  setText("statInventory", formatMoney(inventoryValue));
  setText("statSales", formatMoney(salesTotal));
  setText("statProfit", formatMoney(profitTotal));
}


function renderStockSummary(products) {
  const available = products.filter(
    p => p.status !== "sold"
  ).length;

  const sold = products.filter(
    p => p.status === "sold"
  ).length;

  const critical = products.filter(
    p => Number(p.stock || 0) <= 1 && p.status !== "sold"
  ).length;

  setText("stockAvailable", available);
  setText("stockCritical", critical);
  setText("stockSold", sold);
}


function renderRecentSales(sales) {
  const tbody = document.getElementById("recentSalesTable");

  if (!tbody) return;

  if (!sales.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          Hələ satış yoxdur
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sales.map(sale => `
    <tr>
      <td>${escapeHTML(
        sale.product_name ||
        sale.product ||
        "Məhsul"
      )}</td>

      <td>${escapeHTML(
        sale.customer_name ||
        sale.customer ||
        "-"
      )}</td>

      <td>${formatMoney(
        sale.sale_price ||
        sale.total ||
        sale.amount
      )}</td>

      <td>${escapeHTML(
        sale.payment_method ||
        sale.payment ||
        "-"
      )}</td>

      <td>${formatDate(
        sale.created_at ||
        sale.date
      )}</td>
    </tr>
  `).join("");
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {
  const tbody = document.getElementById("productsTable");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-state">
        Yüklənir...
      </td>
    </tr>
  `;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Məhsullar yüklənmədi.
        </td>
      </tr>
    `;

    return;
  }

  renderProducts(data || []);
  populateCategories(data || []);
}


function renderProducts(products) {
  const tbody = document.getElementById("productsTable");

  if (!products.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Məhsul yoxdur
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>

      <td>
        <strong>
          ${escapeHTML(
            product.name ||
            product.product_name ||
            `${product.brand || ""} ${product.model || ""}`
          )}
        </strong>
      </td>

      <td>
        ${escapeHTML(product.category || "-")}
      </td>

      <td>
        ${escapeHTML(
          product.serial_number ||
          product.imei ||
          "-"
        )}
      </td>

      <td>
        ${formatMoney(
          product.purchase_price ||
          product.buy_price
        )}
      </td>

      <td>
        ${formatMoney(
          product.sale_price ||
          product.sell_price
        )}
      </td>

      <td>
        ${product.stock ?? 1}
      </td>

      <td>
        ${product.status === "sold"
          ? "Satılıb"
          : "Aktiv"}
      </td>

      <td>
        <button
          class="text-btn"
          onclick="deleteProduct('${product.id}')"
        >
          Sil
        </button>
      </td>

    </tr>
  `).join("");
}


function populateCategories(products) {
  const select = document.getElementById("productCategoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    )
  ];

  select.innerHTML =
    `<option value="">Bütün kateqoriyalar</option>` +
    categories
      .map(category =>
        `<option value="${escapeHTML(category)}">
          ${escapeHTML(category)}
        </option>`
      )
      .join("");
}


document.getElementById("addProductBtn")?.addEventListener(
  "click",
  showAddProductModal
);


function showAddProductModal() {
  openModal(
    "Yeni məhsul",
    "Notebook və ya planşet məlumatlarını daxil edin.",
    `
      <form id="productForm">

        <div class="form-grid">

          <div class="form-group">
            <label>Məhsul adı</label>
            <input id="productName" required>
          </div>

          <div class="form-group">
            <label>Kateqoriya</label>
            <input id="productCategory" placeholder="Notebook / Planşet" required>
          </div>

          <div class="form-group">
            <label>Marka</label>
            <input id="productBrand">
          </div>

          <div class="form-group">
            <label>Model</label>
            <input id="productModel">
          </div>

          <div class="form-group">
            <label>Seriya / IMEI</label>
            <input id="productSerial">
          </div>

          <div class="form-group">
            <label>Alış qiyməti</label>
            <input id="productBuyPrice" type="number" step="0.01">
          </div>

          <div class="form-group">
            <label>Satış qiyməti</label>
            <input id="productSellPrice" type="number" step="0.01">
          </div>

          <div class="form-group">
            <label>Stok</label>
            <input id="productStock" type="number" value="1">
          </div>

        </div>

        <button class="primary-btn" type="submit">
          Yadda saxla
        </button>

      </form>
    `
  );

  document.getElementById("productForm")
    ?.addEventListener("submit", saveProduct);
}


async function saveProduct(event) {
  event.preventDefault();

  const product = {
    name: document.getElementById("productName").value.trim(),
    category: document.getElementById("productCategory").value.trim(),
    brand: document.getElementById("productBrand").value.trim(),
    model: document.getElementById("productModel").value.trim(),
    serial_number: document.getElementById("productSerial").value.trim(),
    purchase_price: Number(
      document.getElementById("productBuyPrice").value || 0
    ),
    sale_price: Number(
      document.getElementById("productSellPrice").value || 0
    ),
    stock: Number(
      document.getElementById("productStock").value || 1
    ),
    status: "active"
  };

  const { error } = await supabaseClient
    .from("products")
    .insert(product);

  if (error) {
    console.error(error);
    showToast("Məhsul əlavə edilmədi.");
    return;
  }

  closeModal();
  showToast("Məhsul uğurla əlavə edildi.");

  await loadProducts();
  await loadDashboard();
}


async function deleteProduct(id) {
  if (!confirm("Bu məhsulu silmək istəyirsiniz?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("Məhsul silinmədi.");
    return;
  }

  showToast("Məhsul silindi.");

  await loadProducts();
  await loadDashboard();
}


/* =========================================================
   SALES
   ========================================================= */

async function loadSales() {
  const tbody = document.getElementById("salesTable");

  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Hələ satış yoxdur
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(sale => `
    <tr>
      <td>${escapeHTML(sale.sale_number || sale.id)}</td>
      <td>${escapeHTML(sale.customer_name || "-")}</td>
      <td>${formatMoney(sale.total || sale.amount)}</td>
      <td>${formatMoney(sale.profit)}</td>
      <td>${escapeHTML(sale.payment_method || "-")}</td>
      <td>${formatDate(sale.created_at)}</td>
    </tr>
  `).join("");
}


/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {
  const tbody = document.getElementById("customersTable");

  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Müştəri yoxdur
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(customer => `
    <tr>
      <td>${escapeHTML(
        customer.name ||
        customer.full_name ||
        "-"
      )}</td>

      <td>${escapeHTML(customer.phone || "-")}</td>

      <td>${escapeHTML(customer.email || "-")}</td>

      <td>${escapeHTML(customer.address || "-")}</td>

      <td>${formatDate(customer.created_at)}</td>

      <td></td>
    </tr>
  `).join("");
}


/* =========================================================
   INVENTORY
   ========================================================= */

async function loadInventory() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const products = data || [];

  const available = products.filter(
    p => p.status !== "sold"
  );

  const sold = products.filter(
    p => p.status === "sold"
  );

  const critical = available.filter(
    p => Number(p.stock || 0) <= 1
  );

  const value = available.reduce(
    (sum, p) =>
      sum + Number(
        p.purchase_price ||
        p.buy_price ||
        0
      ),
    0
  );

  setText("inventoryAvailable", available.length);
  setText("inventoryCritical", critical.length);
  setText("inventorySold", sold.length);
  setText("inventoryValue", formatMoney(value));

  const list = document.getElementById("inventoryList");

  if (!list) return;

  if (!available.length) {
    list.innerHTML = `
      <div class="empty-state">
        Anbarda məhsul yoxdur
      </div>
    `;
    return;
  }

  list.innerHTML = available.map(product => `
    <div class="stock-row">
      <span>
        ${escapeHTML(product.name || product.product_name || "Məhsul")}
      </span>
      <strong>
        ${product.stock ?? 1}
      </strong>
    </div>
  `).join("");
}


/* =========================================================
   EXPENSES
   ========================================================= */

async function loadExpenses() {
  const tbody = document.getElementById("expensesTable");

  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Xərc yoxdur
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(expense => `
    <tr>
      <td>${escapeHTML(expense.title || "-")}</td>
      <td>${escapeHTML(expense.category || "-")}</td>
      <td>${formatMoney(expense.amount)}</td>
      <td>${formatDate(expense.created_at)}</td>
      <td>${escapeHTML(expense.note || "-")}</td>
      <td></td>
    </tr>
  `).join("");
}


/* =========================================================
   REPORTS
   ========================================================= */

async function loadReports() {
  const [salesResult, expensesResult] = await Promise.all([
    supabaseClient.from("sales").select("*"),
    supabaseClient.from("expenses").select("*")
  ]);

  const sales = salesResult.data || [];
  const expenses = expensesResult.data || [];

  const revenue = sales.reduce(
    (sum, sale) =>
      sum + Number(
        sale.total ||
        sale.amount ||
        sale.sale_price ||
        0
      ),
    0
  );

  const expenseTotal = expenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount || 0),
    0
  );

  const profit = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.profit || 0),
    0
  ) - expenseTotal;

  setText("reportRevenue", formatMoney(revenue));
  setText("reportExpenses", formatMoney(expenseTotal));
  setText("reportProfit", formatMoney(profit));
  setText("reportSalesCount", sales.length);

  const categoryReport =
    document.getElementById("categoryReport");

  if (categoryReport) {
    const counts = {};

    sales.forEach(sale => {
      const category =
        sale.category ||
        sale.product_category ||
        "Digər";

      counts[category] =
        (counts[category] || 0) + 1;
    });

    const entries = Object.entries(counts);

    if (!entries.length) {
      categoryReport.innerHTML = "Məlumat yoxdur";
    } else {
      categoryReport.innerHTML = entries.map(
        ([category, count]) => `
          <div class="stock-row">
            <span>${escapeHTML(category)}</span>
            <strong>${count}</strong>
          </div>
        `
      ).join("");
    }
  }
}


/* =========================================================
   SETTINGS
   ========================================================= */

document.getElementById("saveSettingsBtn")
  ?.addEventListener("click", () => {
    localStorage.setItem(
      "oncomp_company_name",
      document.getElementById("companyName")?.value || "ONCOMP"
    );

    localStorage.setItem(
      "oncomp_company_email",
      document.getElementById("companyEmail")?.value || ""
    );

    localStorage.setItem(
      "oncomp_company_phone",
      document.getElementById("companyPhone")?.value || ""
    );

    localStorage.setItem(
      "oncomp_company_address",
      document.getElementById("companyAddress")?.value || ""
    );

    showToast("Parametrlər yadda saxlanıldı.");
  });


/* =========================================================
   AXTARIŞ
   ========================================================= */

document.getElementById("productSearch")
  ?.addEventListener("input", async event => {
    const value = event.target.value
      .toLowerCase()
      .trim();

    const { data } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    const filtered = (data || []).filter(product => {
      const text = `
        ${product.name || ""}
        ${product.product_name || ""}
        ${product.brand || ""}
        ${product.model || ""}
        ${product.category || ""}
        ${product.serial_number || ""}
        ${product.imei || ""}
      `.toLowerCase();

      return text.includes(value);
    });

    renderProducts(filtered);
  });


document.getElementById("customerSearch")
  ?.addEventListener("input", async event => {
    const value = event.target.value
      .toLowerCase()
      .trim();

    const { data } = await supabaseClient
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    const filtered = (data || []).filter(customer => {
      const text = `
        ${customer.name || ""}
        ${customer.full_name || ""}
        ${customer.phone || ""}
        ${customer.email || ""}
      `.toLowerCase();

      return text.includes(value);
    });

    const tbody =
      document.getElementById("customersTable");

    if (!tbody) return;

    tbody.innerHTML = filtered.map(customer => `
      <tr>
        <td>${escapeHTML(customer.name || customer.full_name || "-")}</td>
        <td>${escapeHTML(customer.phone || "-")}</td>
        <td>${escapeHTML(customer.email || "-")}</td>
        <td>${escapeHTML(customer.address || "-")}</td>
        <td>${formatDate(customer.created_at)}</td>
        <td></td>
      </tr>
    `).join("");
  });


/* =========================================================
   ÜMUMİ
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


/* =========================================================
   BAŞLAT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
});
```
