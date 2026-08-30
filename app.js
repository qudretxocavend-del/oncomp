```javascript
/* =========================================================
   ONCOMP — PREMIUM ELEKTRON UÇOT SİSTEMİ
   Supabase + Vanilla JS
   ========================================================= */

const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   GLOBAL
   ========================================================= */

let currentUser = null;

let products = [];
let customers = [];
let sales = [];
let expenses = [];

const $ = id => document.getElementById(id);

function money(value) {
  return Number(value || 0).toLocaleString("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ₼";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const el = $("toast");
  const msg = $("toastMessage");

  if (!el || !msg) return;

  msg.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}

/* =========================================================
   AUTH — İŞLƏYƏN VERSİYA QORUNUR
   ========================================================= */

function showLogin() {
  $("loginPage")?.classList.remove("hidden");
  $("appPage")?.classList.add("hidden");
}

function showApp() {
  $("loginPage")?.classList.add("hidden");
  $("appPage")?.classList.remove("hidden");
}

function showMessage(message, type = "") {
  if (!$("loginMessage")) return;

  $("loginMessage").textContent = message;
  $("loginMessage").className = type;
}

async function checkSession() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    showLogin();
    return;
  }

  if (data.session) {
    currentUser = data.session.user;
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

$("loginForm")?.addEventListener("submit", async event => {
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
    $("loginForm").querySelector("button");

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
    currentUser = data.user;

    showApp();
    showMessage("");

    await loadAll();
  }
});

$("logoutBtn")?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();

  currentUser = null;

  showLogin();

  $("loginForm")?.reset();
});

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (session) {
      currentUser = session.user;
      showApp();
    } else {
      currentUser = null;
      showLogin();
    }

  }
);

/* =========================================================
   NAVIGATION
   ========================================================= */

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

function openPage(page) {

  document.querySelectorAll(".content-page")
    .forEach(el =>
      el.classList.remove("active-page")
    );

  document.querySelectorAll(".nav-item")
    .forEach(el =>
      el.classList.remove("active")
    );

  const section = $(`${page}Page`);

  if (section) {
    section.classList.add("active-page");
  }

  const nav =
    document.querySelector(
      `.nav-item[data-page="${page}"]`
    );

  if (nav) {
    nav.classList.add("active");
  }

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      pageTitles[page] || "Dashboard";
  }
}

document.querySelectorAll(".nav-item")
  .forEach(button => {

    button.addEventListener("click", () => {
      openPage(button.dataset.page);
    });

  });

document.querySelectorAll("[data-page-action]")
  .forEach(button => {

    button.addEventListener("click", () => {
      openPage(button.dataset.pageAction);
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
  populateCategoryFilter();
}

function productName(product) {
  return (
    product.name ||
    product.model ||
    "Məhsul"
  );
}

function purchasePrice(product) {
  return Number(
    product.purchase_price ??
    product.buy_price ??
    product.cost ??
    0
  );
}

function sellingPrice(product) {
  return Number(
    product.sale_price ??
    product.selling_price ??
    0
  );
}

function productStock(product) {
  return Number(
    product.stock ?? 1
  );
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

      const stock =
        productStock(product);

      const status =
        product.status === "sold" ||
        stock <= 0
          ? "Satılıb"
          : "Aktiv";

      return `
        <tr>

          <td>
            <strong>
              ${esc(productName(product))}
            </strong>

            <small>
              ${esc(product.brand || "")}
            </small>
          </td>

          <td>
            ${esc(product.category || "-")}
          </td>

          <td>
            ${esc(
              product.imei ||
              product.serial_number ||
              product.serial ||
              "-"
            )}
          </td>

          <td>
            ${money(purchasePrice(product))}
          </td>

          <td>
            <strong>
              ${money(sellingPrice(product))}
            </strong>
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
              onclick="deleteProduct('${product.id}')">
              Sil
            </button>
          </td>

        </tr>
      `;

    }).join("");
}

function populateCategoryFilter() {

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
      <option value="${esc(category)}">
        ${esc(category)}
      </option>
    `).join("")}
  `;
}

async function addProduct(formData) {

  const payload = {

    name:
      formData.name?.trim(),

    brand:
      formData.brand?.trim() || null,

    model:
      formData.model?.trim() || null,

    category:
      formData.category || "Notebook",

    imei:
      formData.imei?.trim() || null,

    purchase_price:
      Number(formData.purchase_price || 0),

    sale_price:
      Number(formData.sale_price || 0),

    stock:
      Number(formData.stock || 1),

    status:
      "active",

    notes:
      formData.notes?.trim() || null
  };

  const { error } =
    await supabaseClient
      .from("products")
      .insert(payload);

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
  updateInventory();

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
  updateInventory();
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

function customerName(customer) {

  return (
    customer.full_name ||
    customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`
  ).trim() || "Müştəri";
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
            ${esc(customerName(customer))}
          </strong>
        </td>

        <td>
          ${esc(customer.phone || "-")}
        </td>

        <td>
          ${esc(customer.email || "-")}
        </td>

        <td>
          ${esc(customer.address || "-")}
        </td>

        <td>
          ${
            customer.created_at
              ? new Date(
                  customer.created_at
                ).toLocaleDateString("az-AZ")
              : "-"
          }
        </td>

        <td></td>

      </tr>

    `).join("");
}

async function addCustomer(formData) {

  const fullName =
    (
      formData.full_name ||
      formData.name ||
      ""
    ).trim();

  if (!fullName) {

    toast(
      "Ad Soyad daxil edilməlidir."
    );

    return false;
  }

  const payload = {

    full_name:
      fullName,

    phone:
      formData.phone?.trim() || null,

    email:
      formData.email?.trim() || null,

    address:
      formData.address?.trim() || null,

    notes:
      formData.notes?.trim() || null
  };

  const { error } =
    await supabaseClient
      .from("customers")
      .insert(payload);

  if (error) {

    console.error(error);

    toast(
      "Müştəri əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  toast(
    "Müştəri uğurla əlavə edildi."
  );

  await loadCustomers();

  return true;
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

function saleProduct(sale) {

  return products.find(
    product =>
      String(product.id) ===
      String(sale.product_id)
  );
}

function saleCustomer(sale) {

  return customers.find(
    customer =>
      String(customer.id) ===
      String(sale.customer_id)
  );
}

function saleAmount(sale) {

  return Number(
    sale.sale_price ??
    sale.total_amount ??
    sale.amount ??
    sale.total ??
    0
  );
}

function salePurchase(sale) {

  const product =
    saleProduct(sale);

  return Number(
    sale.purchase_price ??
    sale.cost_price ??
    product?.purchase_price ??
    0
  );
}

function saleProfit(sale) {

  return Number(
    sale.profit ??
    (
      saleAmount(sale) -
      salePurchase(sale)
    )
  );
}

/* =========================================================
   PREMIUM SALES TABLE
   ========================================================= */

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
        saleProduct(sale);

      const customer =
        saleCustomer(sale);

      const amount =
        saleAmount(sale);

      const purchase =
        salePurchase(sale);

      const profit =
        saleProfit(sale);

      const saleNumber =
        sale.sale_number ||
        `SAT-${String(
          sales.length - index
        ).padStart(4, "0")}`;

      const date =
        sale.created_at
          ? new Date(
              sale.created_at
            ).toLocaleDateString("az-AZ")
          : "-";

      return `

        <tr>

          <td>
            <strong>
              ${esc(saleNumber)}
            </strong>
          </td>

          <td>
            ${esc(
              product
                ? productName(product)
                : sale.product_name ||
                  "Məhsul"
            )}
          </td>

          <td>
            ${esc(
              customer
                ? customerName(customer)
                : sale.customer_name ||
                  "Müştəri"
            )}
          </td>

          <td>
            ${money(purchase)}
          </td>

          <td>
            <strong>
              ${money(amount)}
            </strong>
          </td>

          <td>
            <strong>
              ${money(profit)}
            </strong>
          </td>

          <td>
            ${esc(
              sale.payment_method ||
              sale.payment ||
              "Nağd"
            )}
          </td>

          <td>
            ${date}
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
        saleProduct(sale);

      const customer =
        saleCustomer(sale);

      return `
        <tr>

          <td>
            ${esc(
              product
                ? productName(product)
                : sale.product_name ||
                  "-"
            )}
          </td>

          <td>
            ${esc(
              customer
                ? customerName(customer)
                : sale.customer_name ||
                  "-"
            )}
          </td>

          <td>
            <strong>
              ${money(saleAmount(sale))}
            </strong>
          </td>

          <td>
            ${esc(
              sale.payment_method ||
              sale.payment ||
              "Nağd"
            )}
          </td>

          <td>
            ${
              sale.created_at
                ? new Date(
                    sale.created_at
                  ).toLocaleDateString(
                    "az-AZ"
                  )
                : "-"
            }
          </td>

        </tr>
      `;

    }).join("");
}

/* =========================================================
   ADD SALE
   ========================================================= */

async function addSale(formData) {

  const productId =
    String(
      formData.product_id || ""
    ).trim();

  const customerId =
    String(
      formData.customer_id || ""
    ).trim();

  if (!productId) {

    toast(
      "Məhsul seçilməlidir."
    );

    return false;
  }

  if (!customerId) {

    toast(
      "Müştəri seçilməlidir."
    );

    return false;
  }

  const product =
    products.find(
      p =>
        String(p.id) ===
        productId
    );

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        customerId
    );

  if (!product) {

    toast(
      "Seçilmiş məhsul tapılmadı."
    );

    return false;
  }

  if (!customer) {

    toast(
      "Seçilmiş müştəri tapılmadı."
    );

    return false;
  }

  const purchase =
    purchasePrice(product);

  const price =
    Number(
      formData.sale_price ||
      sellingPrice(product)
    );

  if (price <= 0) {

    toast(
      "Satış qiyməti düzgün daxil edilməlidir."
    );

    return false;
  }

  const profit =
    price - purchase;

  const saleNumber =
    `SAT-${Date.now()
      .toString()
      .slice(-8)}`;

  const payload = {

    sale_number:
      saleNumber,

    product_id:
      productId,

    customer_id:
      customerId,

    purchase_price:
      purchase,

    sale_price:
      price,

    amount:
      price,

    profit:
      profit,

    payment_method:
      formData.payment_method ||
      "Nağd",

    notes:
      formData.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("sales")
      .insert(payload);

  if (error) {

    console.error(
      "SALE ERROR:",
      error
    );

    toast(
      "Satış yaradılmadı: " +
      error.message
    );

    return false;
  }

  /* Məhsulu avtomatik satılmış et */

  const { error: productError } =
    await supabaseClient
      .from("products")
      .update({
        stock: 0,
        status: "sold"
      })
      .eq("id", productId);

  if (productError) {

    console.error(
      "PRODUCT UPDATE:",
      productError
    );
  }

  toast(
    "Satış uğurla tamamlandı."
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

    console.error(
      "Expenses:",
      error
    );

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
          ${esc(
            expense.name ||
            expense.title ||
            "-"
          )}
        </td>

        <td>
          ${esc(
            expense.category ||
            "-"
          )}
        </td>

        <td>
          <strong>
            ${money(expense.amount)}
          </strong>
        </td>

        <td>
          ${
            expense.created_at
              ? new Date(
                  expense.created_at
                ).toLocaleDateString(
                  "az-AZ"
                )
              : "-"
          }
        </td>

        <td>
          ${esc(
            expense.notes || "-"
          )}
        </td>

        <td></td>

      </tr>

    `).join("");
}

async function addExpense(formData) {

  const payload = {

    name:
      formData.name?.trim() ||
      formData.title?.trim(),

    category:
      formData.category ||
      "Digər",

    amount:
      Number(formData.amount || 0),

    notes:
      formData.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("expenses")
      .insert(payload);

  if (error) {

    toast(
      "Xərc əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  toast(
    "Xərc uğurla əlavə edildi."
  );

  await loadExpenses();

  updateReports();

  return true;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        productStock(p) > 0
    );

  const inventoryValue =
    available.reduce(
      (sum, product) =>
        sum +
        purchasePrice(product) *
        productStock(product),
      0
    );

  const now =
    new Date();

  const monthlySales =
    sales.filter(sale => {

      if (!sale.created_at)
        return false;

      const date =
        new Date(
          sale.created_at
        );

      return (
        date.getMonth() ===
          now.getMonth() &&
        date.getFullYear() ===
          now.getFullYear()
      );

    });

  const revenue =
    monthlySales.reduce(
      (sum, sale) =>
        sum + saleAmount(sale),
      0
    );

  const profit =
    monthlySales.reduce(
      (sum, sale) =>
        sum + saleProfit(sale),
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
      products.filter(
        p =>
          p.status === "sold" ||
          productStock(p) <= 0
      ).length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      available.filter(
        p =>
          productStock(p) <= 1
      ).length;
}

/* =========================================================
   INVENTORY
   ========================================================= */

function updateInventory() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        productStock(p) > 0
    );

  const sold =
    products.filter(
      p =>
        p.status === "sold" ||
        productStock(p) <= 0
    );

  const critical =
    available.filter(
      p =>
        productStock(p) <= 1
    );

  const value =
    available.reduce(
      (sum, product) =>
        sum +
        purchasePrice(product) *
        productStock(product),
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
          ${esc(
            productName(product)
          )}
        </span>

        <strong>
          ${productStock(product)}
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
      (sum, sale) =>
        sum + saleAmount(sale),
      0
    );

  const expensesTotal =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const grossProfit =
    sales.reduce(
      (sum, sale) =>
        sum + saleProfit(sale),
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
            ${esc(category)}
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

      <form
        id="productModalForm"
        class="form-grid"
      >

        <div class="form-group">
          <label>Məhsul adı</label>
          <input
            name="name"
            required
          >
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
          style="grid-column:1/-1"
        >
          <label>Qeyd</label>
          <textarea name="notes"></textarea>
        </div>

        <div style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn"
          >
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

      <form
        id="customerModalForm"
        class="form-grid"
      >

        <div
          class="form-group"
          style="grid-column:1/-1"
        >
          <label>Ad Soyad</label>

          <input
            name="full_name"
            required
            placeholder="Müştərinin ad və soyadı"
          >
        </div>

        <div class="form-group">
          <label>Telefon</label>
          <input
            name="phone"
            placeholder="+994"
          >
        </div>

        <div class="form-group">
          <label>E-poçt</label>
          <input
            type="email"
            name="email"
          >
        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >
          <label>Ünvan</label>
          <input name="address">
        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >
          <label>Qeyd</label>
          <textarea name="notes"></textarea>
        </div>

        <div style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn"
          >
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
   SALE MODAL
   ========================================================= */

function openSaleModal() {

  const available =
    products.filter(
      p =>
        p.status !== "sold" &&
        productStock(p) > 0
    );

  openModal(
    "Yeni satış",
    "Məhsulu və müştərini seçin, satış qiymətini təsdiqləyin.",
    `

      <form
        id="saleModalForm"
        class="form-grid"
      >

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

          <label>Məhsul</label>

          <select
            name="product_id"
            id="saleProductSelect"
            required
          >

            <option value="">
              Məhsul seçin
            </option>

            ${available.map(product => `

              <option
                value="${esc(product.id)}"
              >
                ${esc(productName(product))}
                —
                ${money(sellingPrice(product))}
                —
                Stok: ${productStock(product)}
              </option>

            `).join("")}

          </select>

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

          <label>Müştəri</label>

          <select
            name="customer_id"
            id="saleCustomerSelect"
            required
          >

            <option value="">
              Müştəri seçin
            </option>

            ${customers.map(customer => `

              <option
                value="${esc(customer.id)}"
              >
                ${esc(customerName(customer))}
              </option>

            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>Alış qiyməti</label>

          <input
            id="salePurchasePreview"
            type="text"
            readonly
            value="0.00 ₼"
          >

        </div>

        <div class="form-group">

          <label>Satış qiyməti</label>

          <input
            type="number"
            step="0.01"
            min="0"
            name="sale_price"
            id="salePriceInput"
            required
          >

        </div>

        <div class="form-group">

          <label>Mənfəət</label>

          <input
            id="saleProfitPreview"
            type="text"
            readonly
            value="0.00 ₼"
          >

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
          style="grid-column:1/-1"
        >

          <label>Qeyd</label>

          <textarea
            name="notes"
          ></textarea>

        </div>

        <div
          style="
            grid-column:1/-1;
            display:flex;
            justify-content:flex-end;
          "
        >

          <button
            type="submit"
            class="primary-btn"
          >
            Satışı tamamla
          </button>

        </div>

      </form>

    `
  );

  const productSelect =
    $("saleProductSelect");

  const priceInput =
    $("salePriceInput");

  const purchasePreview =
    $("salePurchasePreview");

  const profitPreview =
    $("saleProfitPreview");

  function updateSalePreview() {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(productSelect?.value)
      );

    if (!product) {

      if (purchasePreview)
        purchasePreview.value =
          "0.00 ₼";

      if (profitPreview)
        profitPreview.value =
          "0.00 ₼";

      return;
    }

    const purchase =
      purchasePrice(product);

    const price =
      Number(
        priceInput?.value ||
        sellingPrice(product)
      );

    if (purchasePreview)
      purchasePreview.value =
        money(purchase);

    if (profitPreview)
      profitPreview.value =
        money(price - purchase);
  }

  productSelect?.addEventListener(
    "change",
    () => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(productSelect.value)
        );

      if (product && priceInput) {

        priceInput.value =
          sellingPrice(product);

      }

      updateSalePreview();

    }
  );

  priceInput?.addEventListener(
    "input",
    updateSalePreview
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

      <form
        id="expenseModalForm"
        class="form-grid"
      >

        <div class="form-group">
          <label>Xərc adı</label>

          <input
            name="name"
            required
          >
        </div>

        <div class="form-group">

          <label>Kateqoriya</label>

          <select name="category">

            <option value="İcarə">
              İcarə
            </option>

            <option value="Kommunal">
              Kommunal
            </option>

            <option value="Nəqliyyat">
              Nəqliyyat
            </option>

            <option value="Əmək haqqı">
              Əmək haqqı
            </option>

            <option value="Digər">
              Digər
            </option>

          </select>

        </div>

        <div class="form-group">

          <label>Məbləğ</label>

          <input
            type="number"
            step="0.01"
            min="0"
            name="amount"
            required
          >

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

          <label>Qeyd</label>
          <input name="notes">

        </div>

        <div style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn"
          >
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

$("productCategoryFilter")
  ?.addEventListener(
    "change",
    event => {

      const category =
        event.target.value;

      document
        .querySelectorAll(
          "#productsTable tr"
        )
        .forEach(row => {

          if (!category) {
            row.style.display = "";
            return;
          }

          row.style.display =
            row.textContent
              .includes(category)
              ? ""
              : "none";

        });

    }
  );

$("productStatusFilter")
  ?.addEventListener(
    "change",
    event => {

      const status =
        event.target.value;

      document
        .querySelectorAll(
          "#productsTable tr"
        )
        .forEach(row => {

          if (!status) {
            row.style.display = "";
            return;
          }

          const text =
            row.textContent;

          if (status === "sold") {

            row.style.display =
              text.includes("Satılıb")
                ? ""
                : "none";

          } else {

            row.style.display =
              text.includes("Aktiv")
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

      const settings = {

        companyName:
          $("companyName")?.value || "",

        companyEmail:
          $("companyEmail")?.value || "",

        companyPhone:
          $("companyPhone")?.value || "",

        companyAddress:
          $("companyAddress")?.value || ""

      };

      localStorage.setItem(
        "oncomp_settings",
        JSON.stringify(settings)
      );

      toast(
        "Parametrlər yadda saxlanıldı."
      );

    }
  );

function loadSettings() {

  try {

    const settings =
      JSON.parse(
        localStorage.getItem(
          "oncomp_settings"
        ) || "{}"
      );

    if ($("companyName"))
      $("companyName").value =
        settings.companyName ||
        "ONCOMP";

    if ($("companyEmail"))
      $("companyEmail").value =
        settings.companyEmail ||
        "";

    if ($("companyPhone"))
      $("companyPhone").value =
        settings.companyPhone ||
        "";

    if ($("companyAddress"))
      $("companyAddress").value =
        settings.companyAddress ||
        "";

  } catch (error) {

    console.error(
      "Settings:",
      error
    );

  }
}

/* =========================================================
   INITIAL
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    openPage("dashboard");

    loadSettings();

    await checkSession();

  }
);

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.openPage =
  openPage;

window.deleteProduct =
  deleteProduct;

window.openProductModal =
  openProductModal;

window.openCustomerModal =
  openCustomerModal;

window.openSaleModal =
  openSaleModal;

window.openExpenseModal =
  openExpenseModal;
```
