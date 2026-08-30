/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   PREMIUM APP.JS
   Supabase + Vanilla JS
   ========================================================= */

const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   ELEMENTS
   ========================================================= */

const $ = id => document.getElementById(id);

const loginPage = $("loginPage");
const appPage = $("appPage");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const logoutBtn = $("logoutBtn");

let products = [];
let customers = [];
let sales = [];
let expenses = [];

/* =========================================================
   HELPERS
   ========================================================= */

function money(value) {
  return Number(value || 0).toLocaleString("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ₼";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message, type = "error") {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.className = type;
}

function toast(message) {
  const el = $("toast");
  const text = $("toastMessage");

  if (!el || !text) return;

  text.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}

/* =========================================================
   AUTH — İŞLƏYƏN LOGIN QORUNUR
   ========================================================= */

function showLogin() {
  loginPage?.classList.remove("hidden");
  appPage?.classList.add("hidden");
}

function showApp() {
  loginPage?.classList.add("hidden");
  appPage?.classList.remove("hidden");
}

async function checkSession() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    showLogin();
    return;
  }

  if (data?.session) {
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

loginForm?.addEventListener("submit", async event => {

  event.preventDefault();

  const email =
    $("loginEmail")?.value.trim();

  const password =
    $("loginPassword")?.value;

  if (!email || !password) {
    showMessage("E-poçt və şifrə daxil edin.");
    return;
  }

  const button =
    loginForm.querySelector("button");

  if (button) {
    button.disabled = true;
    button.textContent = "Daxil olunur...";
  }

  showMessage("");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (button) {
    button.disabled = false;
    button.textContent = "Daxil ol";
  }

  if (error) {
    console.error(error);
    showMessage("E-poçt və ya şifrə yanlışdır.");
    return;
  }

  if (data?.session) {
    showApp();
    showMessage("Uğurla daxil oldunuz.", "success");
    await loadAll();
  }
});

logoutBtn?.addEventListener("click", async () => {

  await supabaseClient.auth.signOut();

  showLogin();

  loginForm?.reset();
});

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (session) {
      showApp();

      if (event === "SIGNED_IN") {
        await loadAll();
      }

    } else {
      showLogin();
    }
  }
);

/* =========================================================
   NAVIGATION
   ========================================================= */

const navItems =
  document.querySelectorAll(".nav-item");

const contentPages =
  document.querySelectorAll(".content-page");

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

  contentPages.forEach(page =>
    page.classList.remove("active-page")
  );

  navItems.forEach(item =>
    item.classList.remove("active")
  );

  const page =
    $(`${pageName}Page`);

  const nav =
    document.querySelector(
      `.nav-item[data-page="${pageName}"]`
    );

  page?.classList.add("active-page");
  nav?.classList.add("active");

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      pageTitles[pageName] || pageName;
  }

  if (pageName === "dashboard")
    updateDashboard();

  if (pageName === "inventory")
    updateInventory();

  if (pageName === "reports")
    updateReports();
}

navItems.forEach(item => {

  item.addEventListener("click", () => {

    const page = item.dataset.page;

    if (page)
      openPage(page);

  });

});

document
  .querySelectorAll("[data-page-action]")
  .forEach(button => {

    button.addEventListener("click", () => {

      const page =
        button.dataset.pageAction;

      if (page)
        openPage(page);

    });

  });

/* =========================================================
   LOAD ALL
   ========================================================= */

async function loadAll() {

  await Promise.all([
    loadProducts(),
    loadCustomers(),
    loadSales(),
    loadExpenses()
  ]);

  updateDashboard();
  updateInventory();
  updateReports();
}

/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

  const { data, error } =
    await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Products:", error);
    products = [];
  } else {
    products = data || [];
  }

  renderProducts();
  updateProductCategoryFilter();
}

function renderProducts() {

  const table = $("productsTable");

  if (!table) return;

  if (!products.length) {

    table.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Məhsul yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    products.map(product => {

      const purchase =
        Number(product.purchase_price || 0);

      const sale =
        Number(product.sale_price || 0);

      const stock =
        Number(product.stock ?? 1);

      const status =
        product.status === "sold" || stock <= 0
          ? "Satılıb"
          : "Aktiv";

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(product.name || "Məhsul")}
            </strong>
            <small>
              ${escapeHTML(
                [product.brand, product.model]
                  .filter(Boolean)
                  .join(" ")
              )}
            </small>
          </td>

          <td>
            ${escapeHTML(product.category || "-")}
          </td>

          <td>
            ${escapeHTML(product.imei || "-")}
          </td>

          <td>
            ${money(purchase)}
          </td>

          <td>
            <strong>${money(sale)}</strong>
          </td>

          <td>
            ${stock}
          </td>

          <td>
            <span class="status-badge">
              ${status}
            </span>
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
      `;

    }).join("");
}

function updateProductCategoryFilter() {

  const select =
    $("productCategoryFilter");

  if (!select) return;

  const categories =
    [...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    )];

  select.innerHTML = `
    <option value="">
      Bütün kateqoriyalar
    </option>

    ${categories.map(category => `
      <option value="${escapeHTML(category)}">
        ${escapeHTML(category)}
      </option>
    `).join("")}
  `;
}

async function addProduct(formData) {

  const product = {

    name: formData.name?.trim(),

    brand:
      formData.brand?.trim() || null,

    model:
      formData.model?.trim() || null,

    category:
      formData.category || null,

    imei:
      formData.imei?.trim() || null,

    purchase_price:
      Number(formData.purchase_price || 0),

    sale_price:
      Number(formData.sale_price || 0),

    stock:
      Number(formData.stock || 1),

    status: "active",

    notes:
      formData.notes?.trim() || null
  };

  if (!product.name) {
    toast("Məhsul adı daxil edilməlidir.");
    return false;
  }

  const { error } =
    await supabaseClient
      .from("products")
      .insert(product);

  if (error) {

    console.error(error);

    toast(
      "Məhsul əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  toast("Məhsul uğurla əlavə edildi.");

  await loadProducts();

  updateDashboard();

  return true;
}

async function deleteProduct(id) {

  if (!confirm(
    "Bu məhsulu silmək istəyirsiniz?"
  )) return;

  const { error } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    toast(
      "Məhsul silinmədi: " +
      error.message
    );

    return;
  }

  toast("Məhsul silindi.");

  await loadProducts();

  updateDashboard();
}

/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {

  const { data, error } =
    await supabaseClient
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error("Customers:", error);

    customers = [];

  } else {

    customers = data || [];

  }

  renderCustomers();
}

function renderCustomers() {

  const table =
    $("customersTable");

  if (!table) return;

  if (!customers.length) {

    table.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Müştəri yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    customers.map(customer => `

      <tr>

        <td>
          <strong>
            ${escapeHTML(customer.name || "-")}
          </strong>
        </td>

        <td>
          ${escapeHTML(customer.phone || "-")}
        </td>

        <td>
          ${escapeHTML(customer.email || "-")}
        </td>

        <td>
          ${escapeHTML(customer.address || "-")}
        </td>

        <td>
          ${customer.created_at
            ? new Date(
                customer.created_at
              ).toLocaleDateString("az-AZ")
            : "-"}
        </td>

        <td>
          <button
            class="text-btn"
            onclick="deleteCustomer('${customer.id}')"
          >
            Sil
          </button>
        </td>

      </tr>

    `).join("");
}

async function addCustomer(formData) {
  const fullName = (formData.name || formData.full_name || "").trim();

  if (!fullName) {
    showToast("Ad Soyad daxil edilməlidir.");
    return false;
  }

  const customer = {
    full_name: fullName,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim() || null,
    address: formData.address?.trim() || null,
    notes: formData.notes?.trim() || null
  };

  const { data, error } = await supabaseClient
    .from("customers")
    .insert(customer)
    .select()
    .single();

  if (error) {
    console.error("Customer insert error:", error);
    showToast("Müştəri əlavə edilmədi: " + (error.message || "Naməlum xəta"));
    return false;
  }

  console.log("Customer created:", data);

  showToast("Müştəri uğurla əlavə edildi.");

  await loadCustomers();

  return true;
}

  const { error } =
    await supabaseClient
      .from("customers")
      .insert(customer);

  if (error) {

    toast(
      "Müştəri əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  toast("Müştəri əlavə edildi.");

  await loadCustomers();

  return true;
}

async function deleteCustomer(id) {

  if (!confirm(
    "Bu müştərini silmək istəyirsiniz?"
  )) return;

  const { error } =
    await supabaseClient
      .from("customers")
      .delete()
      .eq("id", id);

  if (error) {

    toast(
      "Müştəri silinmədi: " +
      error.message
    );

    return;
  }

  toast("Müştəri silindi.");

  await loadCustomers();
}

/* =========================================================
   SALES
   ========================================================= */

async function loadSales() {

  const { data, error } =
    await supabaseClient
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error("Sales:", error);

    sales = [];

  } else {

    sales = data || [];

  }

  renderSales();
  renderRecentSales();
}

function getProduct(id) {

  return products.find(
    p => String(p.id) === String(id)
  );
}

function getCustomer(id) {

  return customers.find(
    c => String(c.id) === String(id)
  );
}

function renderSales() {

  const table =
    $("salesTable");

  if (!table) return;

  if (!sales.length) {

    table.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          Hələ satış yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    sales.map((sale, index) => {

      const product =
        getProduct(sale.product_id);

      const customer =
        getCustomer(sale.customer_id);

      const purchase =
        Number(sale.purchase_price || 0);

      const salePrice =
        Number(sale.sale_price || sale.amount || 0);

      const profit =
        Number(
          sale.profit ??
          (salePrice - purchase)
        );

      const number =
        sale.sale_number ||
        `SAT-${String(
          sales.length - index
        ).padStart(4, "0")}`;

      return `

        <tr>

          <td>
            <strong>
              ${escapeHTML(number)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              product?.name ||
              sale.product_name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              customer?.name ||
              sale.customer_name ||
              "-"
            )}
          </td>

          <td>
            ${money(purchase)}
          </td>

          <td>
            <strong>
              ${money(salePrice)}
            </strong>
          </td>

          <td>
            <strong>
              ${money(profit)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              sale.payment_method ||
              "Nağd"
            )}
          </td>

          <td>
            ${sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleDateString("az-AZ")
              : "-"}
          </td>

        </tr>

      `;

    }).join("");
}

function renderRecentSales() {

  const table =
    $("recentSalesTable");

  if (!table) return;

  const recent =
    sales.slice(0, 5);

  if (!recent.length) {

    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          Hələ satış yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    recent.map(sale => {

      const product =
        getProduct(sale.product_id);

      const customer =
        getCustomer(sale.customer_id);

      const amount =
        Number(
          sale.sale_price ||
          sale.amount ||
          0
        );

      return `

        <tr>

          <td>
            ${escapeHTML(
              product?.name ||
              sale.product_name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              customer?.name ||
              sale.customer_name ||
              "-"
            )}
          </td>

          <td>
            <strong>
              ${money(amount)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              sale.payment_method ||
              "Nağd"
            )}
          </td>

          <td>
            ${sale.created_at
              ? new Date(
                  sale.created_at
                ).toLocaleDateString("az-AZ")
              : "-"}
          </td>

        </tr>

      `;

    }).join("");
}

async function addSale(formData) {

  const productId =
    formData.product_id;

  const customerId =
    formData.customer_id;

  if (!productId || !customerId) {

    toast(
      "Məhsul və müştəri seçilməlidir."
    );

    return false;
  }

  const product =
    getProduct(productId);

  const customer =
    getCustomer(customerId);

  if (!product) {

    toast("Məhsul tapılmadı.");

    return false;
  }

  if (!customer) {

    toast("Müştəri tapılmadı.");

    return false;
  }

  const purchasePrice =
    Number(
      product.purchase_price || 0
    );

  const salePrice =
    Number(
      formData.sale_price || 0
    );

  if (salePrice <= 0) {

    toast(
      "Satış qiyməti 0-dan böyük olmalıdır."
    );

    return false;
  }

  const profit =
    salePrice - purchasePrice;

  const saleNumber =
    `SAT-${Date.now()
      .toString()
      .slice(-8)}`;

  const sale = {

    sale_number:
      saleNumber,

    product_id:
      productId,

    customer_id:
      customerId,

    purchase_price:
      purchasePrice,

    sale_price:
      salePrice,

    amount:
      salePrice,

    profit:
      profit,

    payment_method:
      formData.payment_method ||
      "Nağd",

    notes:
      formData.notes ||
      null
  };

  const { error } =
    await supabaseClient
      .from("sales")
      .insert(sale);

  if (error) {

    console.error(error);

    toast(
      "Satış yaradılmadı: " +
      error.message
    );

    return false;
  }

  /*
    Məhsul satıldı.
  */

  await supabaseClient
    .from("products")
    .update({
      stock: 0,
      status: "sold"
    })
    .eq("id", productId);

  toast(
    `Satış tamamlandı — ${money(salePrice)}`
  );

  await loadAll();

  return true;
}

/* =========================================================
   EXPENSES
   ========================================================= */

async function loadExpenses() {

  const { data, error } =
    await supabaseClient
      .from("expenses")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error("Expenses:", error);

    expenses = [];

  } else {

    expenses = data || [];

  }

  renderExpenses();
}

function renderExpenses() {

  const table =
    $("expensesTable");

  if (!table) return;

  if (!expenses.length) {

    table.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Xərc yoxdur
        </td>
      </tr>
    `;

    return;
  }

  table.innerHTML =
    expenses.map(expense => `

      <tr>

        <td>
          <strong>
            ${escapeHTML(
              expense.name || "-"
            )}
          </strong>
        </td>

        <td>
          ${escapeHTML(
            expense.category || "-"
          )}
        </td>

        <td>
          <strong>
            ${money(expense.amount)}
          </strong>
        </td>

        <td>
          ${expense.created_at
            ? new Date(
                expense.created_at
              ).toLocaleDateString("az-AZ")
            : "-"}
        </td>

        <td>
          ${escapeHTML(
            expense.notes || "-"
          )}
        </td>

        <td>
          <button
            class="text-btn"
            onclick="deleteExpense('${expense.id}')"
          >
            Sil
          </button>
        </td>

      </tr>

    `).join("");
}

async function addExpense(formData) {

  const expense = {

    name:
      formData.name?.trim(),

    category:
      formData.category || null,

    amount:
      Number(formData.amount || 0),

    notes:
      formData.notes?.trim() || null
  };

  const { error } =
    await supabaseClient
      .from("expenses")
      .insert(expense);

  if (error) {

    toast(
      "Xərc əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  toast("Xərc əlavə edildi.");

  await loadExpenses();

  updateReports();

  return true;
}

async function deleteExpense(id) {

  if (!confirm(
    "Bu xərci silmək istəyirsiniz?"
  )) return;

  const { error } =
    await supabaseClient
      .from("expenses")
      .delete()
      .eq("id", id);

  if (error) {

    toast(
      "Xərc silinmədi: " +
      error.message
    );

    return;
  }

  toast("Xərc silindi.");

  await loadExpenses();

  updateReports();
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  const sold =
    products.filter(
      p =>
        p.status === "sold" ||
        Number(p.stock ?? 1) <= 0
    );

  const inventoryValue =
    available.reduce(
      (sum, p) =>
        sum +
        Number(p.purchase_price || 0) *
        Number(p.stock || 1),
      0
    );

  const now =
    new Date();

  const monthly =
    sales.filter(s => {

      if (!s.created_at)
        return false;

      const date =
        new Date(s.created_at);

      return (
        date.getMonth() ===
          now.getMonth() &&
        date.getFullYear() ===
          now.getFullYear()
      );

    });

  const revenue =
    monthly.reduce(
      (sum, s) =>
        sum +
        Number(
          s.sale_price ||
          s.amount ||
          0
        ),
      0
    );

  const profit =
    monthly.reduce(
      (sum, s) =>
        sum +
        Number(s.profit || 0),
      0
    );

  if ($("statProducts"))
    $("statProducts").textContent =
      products.length;

  if ($("statInventory"))
    $("statInventory").textContent =
      money(inventoryValue);

  if ($("statSales"))
    $("statSales").textContent =
      money(revenue);

  if ($("statProfit"))
    $("statProfit").textContent =
      money(profit);

  if ($("stockAvailable"))
    $("stockAvailable").textContent =
      available.length;

  if ($("stockSold"))
    $("stockSold").textContent =
      sold.length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      available.filter(
        p => Number(p.stock || 1) <= 1
      ).length;

  renderRecentSales();
}

/* =========================================================
   INVENTORY
   ========================================================= */

function updateInventory() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  const sold =
    products.filter(
      p =>
        p.status === "sold" ||
        Number(p.stock ?? 1) <= 0
    );

  const critical =
    available.filter(
      p =>
        Number(p.stock ?? 1) <= 1
    );

  const value =
    available.reduce(
      (sum, p) =>
        sum +
        Number(p.purchase_price || 0) *
        Number(p.stock || 1),
      0
    );

  if ($("inventoryAvailable"))
    $("inventoryAvailable").textContent =
      available.length;

  if ($("inventoryCritical"))
    $("inventoryCritical").textContent =
      critical.length;

  if ($("inventorySold"))
    $("inventorySold").textContent =
      sold.length;

  if ($("inventoryValue"))
    $("inventoryValue").textContent =
      money(value);

  const list =
    $("inventoryList");

  if (!list) return;

  if (!available.length) {

    list.innerHTML = `
      <div class="empty-state">
        Anbarda məhsul yoxdur
      </div>
    `;

    return;
  }

  list.innerHTML =
    available.map(product => `

      <div class="stock-row">

        <span>
          <strong>
            ${escapeHTML(
              product.name || "Məhsul"
            )}
          </strong>

          <small>
            ${escapeHTML(
              product.category || ""
            )}
          </small>
        </span>

        <strong>
          ${Number(product.stock || 1)}
          ədəd
        </strong>

      </div>

    `).join("");
}

/* =========================================================
   REPORTS
   ========================================================= */

function updateReports() {

  const revenue =
    sales.reduce(
      (sum, s) =>
        sum +
        Number(
          s.sale_price ||
          s.amount ||
          0
        ),
      0
    );

  const expensesTotal =
    expenses.reduce(
      (sum, e) =>
        sum +
        Number(e.amount || 0),
      0
    );

  const grossProfit =
    sales.reduce(
      (sum, s) =>
        sum +
        Number(s.profit || 0),
      0
    );

  const netProfit =
    grossProfit -
    expensesTotal;

  if ($("reportRevenue"))
    $("reportRevenue").textContent =
      money(revenue);

  if ($("reportExpenses"))
    $("reportExpenses").textContent =
      money(expensesTotal);

  if ($("reportProfit"))
    $("reportProfit").textContent =
      money(netProfit);

  if ($("reportSalesCount"))
    $("reportSalesCount").textContent =
      sales.length;

  const categoryReport =
    $("categoryReport");

  if (!categoryReport) return;

  const map = {};

  products.forEach(product => {

    const category =
      product.category ||
      "Digər";

    map[category] =
      (map[category] || 0) + 1;

  });

  const entries =
    Object.entries(map);

  if (!entries.length) {

    categoryReport.innerHTML =
      "Məlumat yoxdur";

    return;
  }

  categoryReport.innerHTML =
    entries.map(
      ([category, count]) => `

        <div class="stock-row">

          <span>
            ${escapeHTML(category)}
          </span>

          <strong>
            ${count}
          </strong>

        </div>

      `
    ).join("");
}

/* =========================================================
   MODAL
   ========================================================= */

function openModal(
  title,
  description,
  html
) {

  if ($("modalTitle"))
    $("modalTitle").textContent =
      title;

  if ($("modalDescription"))
    $("modalDescription").textContent =
      description;

  if ($("modalBody"))
    $("modalBody").innerHTML =
      html;

  $("modalOverlay")
    ?.classList.remove("hidden");
}

function closeModal() {

  $("modalOverlay")
    ?.classList.add("hidden");

  if ($("modalBody"))
    $("modalBody").innerHTML = "";
}

$("closeModalBtn")
  ?.addEventListener(
    "click",
    closeModal
  );

$("modalOverlay")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("modalOverlay")
      ) {
        closeModal();
      }

    }
  );

/* =========================================================
   PRODUCT MODAL
   ========================================================= */

function openProductModal() {

  openModal(
    "Yeni məhsul",
    "Məhsul məlumatlarını daxil edin.",
    `

    <form id="productModalForm"
          class="form-grid">

      <div class="form-group">
        <label>Məhsul adı</label>
        <input name="name"
               required>
      </div>

      <div class="form-group">
        <label>Marka</label>
        <input name="brand">
      </div>

      <div class="form-group">
        <label>Model</label>
        <input name="model">
      </div>

      <div class="form-group">
        <label>Kateqoriya</label>

        <select name="category">

          <option value="Notebook">
            Notebook
          </option>

          <option value="Planşet">
            Planşet
          </option>

          <option value="Digər">
            Digər
          </option>

        </select>

      </div>

      <div class="form-group">
        <label>Seriya / IMEI</label>
        <input name="imei">
      </div>

      <div class="form-group">
        <label>Alış qiyməti</label>

        <input
          type="number"
          step="0.01"
          min="0"
          name="purchase_price"
          required
        >

      </div>

      <div class="form-group">
        <label>Satış qiyməti</label>

        <input
          type="number"
          step="0.01"
          min="0"
          name="sale_price"
          required
        >

      </div>

      <div class="form-group">
        <label>Stok</label>

        <input
          type="number"
          min="1"
          value="1"
          name="stock"
          required
        >

      </div>

      <div
        class="form-group"
        style="grid-column:1/-1">

        <label>Qeyd</label>

        <textarea name="notes"></textarea>

      </div>

      <div style="grid-column:1/-1">

        <button
          type="submit"
          class="primary-btn">

          Məhsulu yadda saxla

        </button>

      </div>

    </form>

    `
  );

  $("productModalForm")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

        const success =
          await addProduct(data);

        if (success)
          closeModal();

      }
    );
}

/* =========================================================
   CUSTOMER MODAL
   ========================================================= */

function openCustomerModal() {

  openModal(
    "Yeni müştəri",
    "Müştəri məlumatlarını daxil edin.",
    `

    <form id="customerModalForm"
          class="form-grid">

      <div class="form-group">
        <label>Ad Soyad</label>
        <input name="name"
               required>
      </div>

      <div class="form-group">
        <label>Telefon</label>
        <input name="phone">
      </div>

      <div class="form-group">
        <label>E-poçt</label>
        <input
          type="email"
          name="email">
      </div>

      <div class="form-group">
        <label>Ünvan</label>
        <input name="address">
      </div>

      <div
        class="form-group"
        style="grid-column:1/-1">

        <label>Qeyd</label>

        <textarea name="notes"></textarea>

      </div>

      <div style="grid-column:1/-1">

        <button
          type="submit"
          class="primary-btn">

          Müştərini yadda saxla

        </button>

      </div>

    </form>

    `
  );

  $("customerModalForm")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

        const success =
          await addCustomer(data);

        if (success)
          closeModal();

      }
    );
}

/* =========================================================
   SALE MODAL — PREMIUM
   ========================================================= */

function openSaleModal() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  if (!available.length) {

    toast(
      "Satış üçün anbarda məhsul yoxdur."
    );

    return;
  }

  if (!customers.length) {

    toast(
      "Əvvəlcə müştəri əlavə edin."
    );

    return;
  }

  openModal(
    "Yeni satış",
    "Məhsulu, müştərini və real satış qiymətini seçin.",
    `

    <form id="saleModalForm"
          class="form-grid">

      <div class="form-group"
           style="grid-column:1/-1">

        <label>Məhsul</label>

        <select
          name="product_id"
          id="saleProductSelect"
          required>

          <option value="">
            Məhsul seçin
          </option>

          ${available.map(product => `

            <option value="${product.id}">

              ${escapeHTML(
                product.name ||
                "Məhsul"
              )}

              —
              ${money(
                product.sale_price
              )}

            </option>

          `).join("")}

        </select>

      </div>

      <div class="form-group"
           style="grid-column:1/-1">

        <label>Müştəri</label>

        <select
          name="customer_id"
          required>

          <option value="">
            Müştəri seçin
          </option>

          ${customers.map(customer => `

            <option value="${customer.id}">

              ${escapeHTML(
                customer.name ||
                "Müştəri"
              )}

            </option>

          `).join("")}

        </select>

      </div>

      <div class="form-group">

        <label>Alış qiyməti</label>

        <input
          id="salePurchasePrice"
          type="number"
          readonly
          value="0">

      </div>

      <div class="form-group">

        <label>Satış qiyməti</label>

        <input
          id="salePriceInput"
          type="number"
          step="0.01"
          min="0"
          name="sale_price"
          required>

      </div>

      <div class="form-group">

        <label>Gözlənilən mənfəət</label>

        <input
          id="saleProfitInput"
          type="text"
          readonly
          value="0.00 ₼">

      </div>

      <div class="form-group">

        <label>Ödəniş üsulu</label>

        <select name="payment_method">

          <option value="Nağd">
            Nağd
          </option>

          <option value="Kart">
            Kart
          </option>

          <option value="Köçürmə">
            Köçürmə
          </option>

          <option value="Nisyə">
            Nisyə
          </option>

        </select>

      </div>

      <div
        class="form-group"
        style="grid-column:1/-1">

        <label>Qeyd</label>

        <textarea name="notes"></textarea>

      </div>

      <div style="grid-column:1/-1">

        <button
          type="submit"
          class="primary-btn">

          Satışı tamamla

        </button>

      </div>

    </form>

    `
  );

  const productSelect =
    $("saleProductSelect");

  const purchaseInput =
    $("salePurchasePrice");

  const saleInput =
    $("salePriceInput");

  const profitInput =
    $("saleProfitInput");

  function calculateSale() {

    const product =
      getProduct(
        productSelect?.value
      );

    if (!product) {

      if (purchaseInput)
        purchaseInput.value = "0";

      if (saleInput)
        saleInput.value = "";

      if (profitInput)
        profitInput.value =
          "0.00 ₼";

      return;
    }

    const purchase =
      Number(
        product.purchase_price || 0
      );

    const sale =
      Number(
        saleInput?.value ||
        product.sale_price ||
        0
      );

    if (purchaseInput)
      purchaseInput.value =
        purchase.toFixed(2);

    if (
      saleInput &&
      !saleInput.value
    ) {
      saleInput.value =
        Number(
          product.sale_price || 0
        ).toFixed(2);
    }

    const finalSale =
      Number(
        saleInput?.value || 0
      );

    const profit =
      finalSale - purchase;

    if (profitInput)
      profitInput.value =
        money(profit);
  }

  productSelect?.addEventListener(
    "change",
    calculateSale
  );

  saleInput?.addEventListener(
    "input",
    calculateSale
  );

  $("saleModalForm")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

        const success =
          await addSale(data);

        if (success)
          closeModal();

      }
    );
}

/* =========================================================
   EXPENSE MODAL
   ========================================================= */

function openExpenseModal() {

  openModal(
    "Yeni xərc",
    "Xərc məlumatlarını daxil edin.",
    `

    <form id="expenseModalForm"
          class="form-grid">

      <div class="form-group">

        <label>Xərc adı</label>

        <input
          name="name"
          required>

      </div>

      <div class="form-group">

        <label>Kateqoriya</label>

        <select name="category">

          <option>İcarə</option>
          <option>Kommunal</option>
          <option>Nəqliyyat</option>
          <option>Əmək haqqı</option>
          <option>Digər</option>

        </select>

      </div>

      <div class="form-group">

        <label>Məbləğ</label>

        <input
          type="number"
          step="0.01"
          min="0"
          name="amount"
          required>

      </div>

      <div class="form-group">

        <label>Qeyd</label>

        <input name="notes">

      </div>

      <div style="grid-column:1/-1">

        <button
          type="submit"
          class="primary-btn">

          Xərci yadda saxla

        </button>

      </div>

    </form>

    `
  );

  $("expenseModalForm")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            ).entries()
          );

        const success =
          await addExpense(data);

        if (success)
          closeModal();

      }
    );
}

/* =========================================================
   SEARCH
   ========================================================= */

$("productSearch")
  ?.addEventListener(
    "input",
    event => {

      const query =
        event.target.value
          .toLowerCase()
          .trim();

      document
        .querySelectorAll(
          "#productsTable tr"
        )
        .forEach(row => {

          row.style.display =
            row.textContent
              .toLowerCase()
              .includes(query)
                ? ""
                : "none";

        });

    }
  );

$("customerSearch")
  ?.addEventListener(
    "input",
    event => {

      const query =
        event.target.value
          .toLowerCase()
          .trim();

      document
        .querySelectorAll(
          "#customersTable tr"
        )
        .forEach(row => {

          row.style.display =
            row.textContent
              .toLowerCase()
              .includes(query)
                ? ""
                : "none";

        });

    }
  );

/* =========================================================
   FILTERS
   ========================================================= */

$("productCategoryFilter")
  ?.addEventListener(
    "change",
    event => {

      const value =
        event.target.value;

      document
        .querySelectorAll(
          "#productsTable tr"
        )
        .forEach(row => {

          if (!value) {

            row.style.display = "";
            return;

          }

          row.style.display =
            row.textContent
              .includes(value)
                ? ""
                : "none";

        });

    }
  );

$("productStatusFilter")
  ?.addEventListener(
    "change",
    event => {

      const value =
        event.target.value;

      document
        .querySelectorAll(
          "#productsTable tr"
        )
        .forEach(row => {

          if (!value) {

            row.style.display = "";
            return;

          }

          const text =
            row.textContent
              .toLowerCase();

          if (
            value === "sold"
          ) {

            row.style.display =
              text.includes("satılıb")
                ? ""
                : "none";

          } else {

            row.style.display =
              text.includes("aktiv")
                ? ""
                : "none";

          }

        });

    }
  );

/* =========================================================
   BUTTONS
   ========================================================= */

$("addProductBtn")
  ?.addEventListener(
    "click",
    openProductModal
  );

$("addCustomerBtn")
  ?.addEventListener(
    "click",
    openCustomerModal
  );

$("newSaleBtn")
  ?.addEventListener(
    "click",
    openSaleModal
  );

$("addExpenseBtn")
  ?.addEventListener(
    "click",
    openExpenseModal
  );

$("refreshReportsBtn")
  ?.addEventListener(
    "click",
    async () => {

      await loadAll();

      toast(
        "Hesabatlar yeniləndi."
      );

    }
  );

/* =========================================================
   SETTINGS
   ========================================================= */

$("saveSettingsBtn")
  ?.addEventListener(
    "click",
    () => {

      localStorage.setItem(
        "oncomp_company_name",
        $("companyName")?.value || "ONCOMP"
      );

      localStorage.setItem(
        "oncomp_company_email",
        $("companyEmail")?.value || ""
      );

      localStorage.setItem(
        "oncomp_company_phone",
        $("companyPhone")?.value || ""
      );

      localStorage.setItem(
        "oncomp_company_address",
        $("companyAddress")?.value || ""
      );

      toast(
        "Parametrlər yadda saxlanıldı."
      );

    }
  );

/* =========================================================
   INITIAL
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    openPage("dashboard");

    await checkSession();

  }
);

/* =========================================================
   GLOBAL
   ========================================================= */

window.openPage = openPage;
window.deleteProduct = deleteProduct;
window.deleteCustomer = deleteCustomer;
window.deleteExpense = deleteExpense;
