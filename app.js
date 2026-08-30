/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   FINAL APP.JS
   AUTH + PRODUCTS + CUSTOMERS + SALES + EXPENSES
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
  return `${Number(value || 0).toFixed(2)} ₼`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("toast");
  const text = $("toastMessage");

  if (!toast || !text) {
    alert(message);
    return;
  }

  text.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

/* =========================================================
   AUTH
   SƏNİN İŞLƏYƏN LOGIN KODUN
   ========================================================= */

function showLogin() {
  $("loginPage")?.classList.remove("hidden");
  $("appPage")?.classList.add("hidden");
}

function showApp() {
  $("loginPage")?.classList.add("hidden");
  $("appPage")?.classList.remove("hidden");
}

function showMessage(message, type = "error") {
  const box = $("loginMessage");

  if (!box) return;

  box.textContent = message;
  box.className = type;
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
    currentUser = data.session.user;
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

async function login(email, password) {

  const button =
    $("loginForm")?.querySelector("button");

  if (!email || !password) {
    showMessage("E-poçt və şifrə daxil edin.");
    return;
  }

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
    currentUser = data.user;
    showApp();
    showMessage("", "success");
    await loadAll();
  }
}

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  showLogin();

  $("loginForm")?.reset();
}

/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {

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
    return;
  }

  products = data || [];

  renderProducts();
  populateProductCategoryFilter();
}

function productPurchasePrice(product) {

  return Number(
    product.purchase_price ??
    product.buy_price ??
    product.cost ??
    0
  );
}

function productSalePrice(product) {

  return Number(
    product.sale_price ??
    product.selling_price ??
    product.sell_price ??
    0
  );
}

function productStock(product) {

  return Number(
    product.stock ??
    1
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

  table.innerHTML = products.map(product => {

    const purchase =
      productPurchasePrice(product);

    const sale =
      productSalePrice(product);

    const stock =
      productStock(product);

    const sold =
      product.status === "sold" ||
      stock <= 0;

    return `
      <tr>

        <td>
          <strong>
            ${escapeHTML(
              product.name ||
              product.model ||
              "Məhsul"
            )}
          </strong>

          <small>
            ${escapeHTML(product.brand || "")}
          </small>
        </td>

        <td>
          ${escapeHTML(
            product.category || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            product.imei ||
            product.serial_number ||
            product.serial ||
            "-"
          )}
        </td>

        <td>
          ${money(purchase)}
        </td>

        <td>
          <strong>
            ${money(sale)}
          </strong>
        </td>

        <td>
          ${stock}
        </td>

        <td>
          <span class="status-badge">
            ${sold ? "Satılıb" : "Aktiv"}
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

function populateProductCategoryFilter() {

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

async function addProduct(data) {

  const product = {
    name: data.name?.trim(),
    brand: data.brand?.trim() || null,
    model: data.model?.trim() || null,
    category: data.category || "Digər",

    imei:
      data.imei?.trim() ||
      null,

    purchase_price:
      Number(data.purchase_price || 0),

    sale_price:
      Number(data.sale_price || 0),

    stock:
      Number(data.stock || 1),

    status: "active",

    notes:
      data.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("products")
      .insert(product);

  if (error) {

    console.error(error);

    showToast(
      "Məhsul əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  showToast("Məhsul uğurla əlavə edildi");

  await loadProducts();

  updateDashboard();
  updateInventory();
  updateReports();

  return true;
}

async function deleteProduct(id) {

  if (!confirm(
    "Bu məhsulu silmək istəyirsiniz?"
  )) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    showToast(
      "Məhsul silinmədi: " +
      error.message
    );

    return;
  }

  showToast("Məhsul silindi");

  await loadProducts();

  updateDashboard();
  updateInventory();
  updateReports();
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

    return;
  }

  customers = data || [];

  renderCustomers();
}

function customerName(customer) {

  return (
    customer.full_name ||
    customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "Müştəri"
  );
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
    customers.map(customer => {

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                customerName(customer)
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              customer.phone || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              customer.email || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              customer.address || "-"
            )}
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
      `;

    }).join("");
}

async function addCustomer(data) {

  const fullName =
    data.name?.trim();

  if (!fullName) {

    showToast(
      "Ad Soyad daxil edilməlidir."
    );

    return false;
  }

  /*
    VACİB:
    customers cədvəlində full_name NOT NULL olduğu
    üçün həm full_name, həm də name göndərilir.
  */

  const customer = {

    full_name: fullName,

    name: fullName,

    phone:
      data.phone?.trim() ||
      null,

    email:
      data.email?.trim() ||
      null,

    address:
      data.address?.trim() ||
      null,

    notes:
      data.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("customers")
      .insert(customer);

  if (error) {

    console.error(error);

    showToast(
      "Müştəri əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  showToast(
    "Müştəri uğurla əlavə edildi"
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

    return;
  }

  sales = data || [];

  renderSales();
  renderRecentSales();
}

function getSaleProduct(sale) {

  return products.find(
    product =>
      String(product.id) ===
      String(sale.product_id)
  );
}

function getSaleCustomer(sale) {

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
    getSaleProduct(sale);

  return Number(
    sale.purchase_price ??
    sale.cost_price ??
    productPurchasePrice(product || {}) ??
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
        getSaleProduct(sale);

      const customer =
        getSaleCustomer(sale);

      const purchase =
        salePurchase(sale);

      const salePrice =
        saleAmount(sale);

      const profit =
        saleProfit(sale);

      const number =
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
              ${escapeHTML(number)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              customerName(
                customer || {}
              )
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
              sale.payment ||
              "Nağd"
            )}
          </td>

          <td>
            ${date}
          </td>

          <td>
            ${escapeHTML(
              product?.name ||
              sale.product_name ||
              "-"
            )}
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
        getSaleProduct(sale);

      const customer =
        getSaleCustomer(sale);

      const amount =
        saleAmount(sale);

      const date =
        sale.created_at
        ? new Date(
            sale.created_at
          ).toLocaleDateString("az-AZ")
        : "-";

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
              customerName(
                customer || {}
              )
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
            ${date}
          </td>

        </tr>
      `;

    }).join("");
}

async function addSale(data) {

  const productId =
    data.product_id?.trim();

  const customerId =
    data.customer_id?.trim();

  if (!productId) {

    showToast(
      "Məhsul seçilməlidir."
    );

    return false;
  }

  if (!customerId) {

    showToast(
      "Müştəri seçilməlidir."
    );

    return false;
  }

  const product =
    products.find(
      p =>
        String(p.id) ===
        String(productId)
    );

  if (!product) {

    showToast(
      "Seçilmiş məhsul tapılmadı."
    );

    return false;
  }

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(customerId)
    );

  if (!customer) {

    showToast(
      "Seçilmiş müştəri tapılmadı."
    );

    return false;
  }

  const purchasePrice =
    productPurchasePrice(product);

  const salePrice =
    Number(
      data.sale_price ||
      productSalePrice(product)
    );

  if (salePrice <= 0) {

    showToast(
      "Satış qiyməti düzgün daxil edilməlidir."
    );

    return false;
  }

  const profit =
    salePrice - purchasePrice;

  const saleNumber =
    "SAT-" +
    Date.now()
      .toString()
      .slice(-8);

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

    total_amount:
      salePrice,

    profit:
      profit,

    payment_method:
      data.payment_method ||
      "Nağd",

    notes:
      data.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("sales")
      .insert(sale);

  if (error) {

    console.error(error);

    showToast(
      "Satış yaradılmadı: " +
      error.message
    );

    return false;
  }

  /*
    Məhsul satıldı.
  */

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
      "Məhsul status xətası:",
      productError
    );
  }

  showToast(
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

    return;
  }

  expenses = data || [];

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
    expenses.map(expense => {

      return `
        <tr>

          <td>
            ${escapeHTML(
              expense.name ||
              expense.title ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
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
                ).toLocaleDateString("az-AZ")
              : "-"
            }
          </td>

          <td>
            ${escapeHTML(
              expense.notes || "-"
            )}
          </td>

          <td></td>

        </tr>
      `;

    }).join("");
}

async function addExpense(data) {

  const expense = {

    name:
      data.name?.trim() ||
      data.title?.trim(),

    title:
      data.name?.trim() ||
      data.title?.trim(),

    category:
      data.category ||
      "Digər",

    amount:
      Number(data.amount || 0),

    notes:
      data.notes?.trim() ||
      null
  };

  const { error } =
    await supabaseClient
      .from("expenses")
      .insert(expense);

  if (error) {

    console.error(error);

    showToast(
      "Xərc əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  showToast(
    "Xərc uğurla əlavə edildi"
  );

  await loadExpenses();

  updateReports();

  return true;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

  const active =
    products.filter(
      p =>
        p.status !== "sold" &&
        productStock(p) > 0
    );

  const inventoryValue =
    active.reduce(
      (sum, p) =>
        sum +
        productPurchasePrice(p) *
        productStock(p),
      0
    );

  const now =
    new Date();

  const monthly =
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
    monthly.reduce(
      (sum, sale) =>
        sum + saleAmount(sale),
      0
    );

  const profit =
    monthly.reduce(
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
      active.length;

  if ($("stockSold"))
    $("stockSold").textContent =
      products.filter(
        p =>
          p.status === "sold" ||
          productStock(p) <= 0
      ).length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      active.filter(
        p =>
          productStock(p) <= 1
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
      (sum, p) =>
        sum +
        productPurchasePrice(p) *
        productStock(p),
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
    available.map(product => {

      return `
        <div class="stock-row">

          <span>
            ${escapeHTML(
              product.name ||
              product.model ||
              "Məhsul"
            )}
          </span>

          <strong>
            ${productStock(product)}
            ədəd
          </strong>

        </div>
      `;

    }).join("");
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

  const expenseTotal =
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
    expenseTotal;

  if ($("reportRevenue"))
    $("reportRevenue").textContent =
      money(revenue);

  if ($("reportExpenses"))
    $("reportExpenses").textContent =
      money(expenseTotal);

  if ($("reportProfit"))
    $("reportProfit").textContent =
      money(netProfit);

  if ($("reportSalesCount"))
    $("reportSalesCount").textContent =
      sales.length;

  const categoryReport =
    $("categoryReport");

  if (!categoryReport)
    return;

  const map = {};

  products.forEach(product => {

    const category =
      product.category ||
      "Digər";

    map[category] =
      (map[category] || 0) + 1;
  });

  const categories =
    Object.entries(map);

  if (!categories.length) {

    categoryReport.innerHTML =
      "Məlumat yoxdur";

    return;
  }

  categoryReport.innerHTML =
    categories.map(
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

function openPage(pageName) {

  document
    .querySelectorAll(".content-page")
    .forEach(page =>
      page.classList.remove(
        "active-page"
      )
    );

  document
    .querySelectorAll(".nav-item")
    .forEach(item =>
      item.classList.remove(
        "active"
      )
    );

  const target =
    $(`${pageName}Page`);

  const nav =
    document.querySelector(
      `.nav-item[data-page="${pageName}"]`
    );

  if (target)
    target.classList.add(
      "active-page"
    );

  if (nav)
    nav.classList.add("active");

  if ($("pageTitle"))
    $("pageTitle").textContent =
      pageTitles[pageName] ||
      pageName;
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
    ?.classList
    .remove("hidden");
}

function closeModal() {

  $("modalOverlay")
    ?.classList
    .add("hidden");

  if ($("modalBody"))
    $("modalBody").innerHTML = "";
}

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

        <div
          style="grid-column:1/-1"
        >
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
            name="name"
            required
            placeholder="Müştərinin adı və soyadı"
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

        <div
          style="grid-column:1/-1"
        >
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
      product =>
        product.status !== "sold" &&
        productStock(product) > 0
    );

  if (!available.length) {

    showToast(
      "Satış üçün anbarda məhsul yoxdur."
    );

    return;
  }

  if (!customers.length) {

    showToast(
      "Əvvəlcə müştəri əlavə edin."
    );

    return;
  }

  openModal(
    "Yeni satış",
    "Məhsulu, müştərini və real satış qiymətini seçin.",
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

              <option value="${product.id}">

                ${escapeHTML(
                  product.name ||
                  product.model ||
                  "Məhsul"
                )}

                — Satış:
                ${money(
                  productSalePrice(product)
                )}

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
            required
          >

            <option value="">
              Müştəri seçin
            </option>

            ${customers.map(customer => `

              <option value="${customer.id}">

                ${escapeHTML(
                  customerName(customer)
                )}

              </option>

            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>Alış qiyməti</label>

          <input
            id="salePurchaseDisplay"
            type="text"
            readonly
            value="0.00 ₼"
          >

        </div>

        <div class="form-group">

          <label>
            Satış qiyməti
          </label>

          <input
            id="salePriceInput"
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            required
          >

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

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

          <textarea name="notes"></textarea>

        </div>

        <div
          style="grid-column:1/-1"
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

  const purchaseDisplay =
    $("salePurchaseDisplay");

  function updateSalePrice() {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(productSelect.value)
      );

    if (!product) {

      if (priceInput)
        priceInput.value = "";

      if (purchaseDisplay)
        purchaseDisplay.value =
          "0.00 ₼";

      return;
    }

    const purchase =
      productPurchasePrice(product);

    const sale =
      productSalePrice(product);

    if (purchaseDisplay)
      purchaseDisplay.value =
        money(purchase);

    if (priceInput)
      priceInput.value =
        sale.toFixed(2);
  }

  productSelect
    ?.addEventListener(
      "change",
      updateSalePrice
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

        <div
          style="grid-column:1/-1"
        >

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

function setupSearch() {

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
              row.textContent
                .toLowerCase();

            if (
              status === "sold"
            ) {
              row.style.display =
                text.includes("satılıb")
                ? ""
                : "none";
            }

            if (
              status === "active"
            ) {
              row.style.display =
                text.includes("aktiv")
                ? ""
                : "none";
            }

          });

      }
    );
}

/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    /* LOGIN */

    $("loginForm")
      ?.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          await login(
            $("loginEmail")
              ?.value
              .trim(),

            $("loginPassword")
              ?.value
          );

        }
      );

    /* LOGOUT */

    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );

    /* NAVIGATION */

    document
      .querySelectorAll(".nav-item")
      .forEach(item => {

        item.addEventListener(
          "click",
          () =>
            openPage(
              item.dataset.page
            )
        );

      });

    document
      .querySelectorAll(
        "[data-page-action]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            openPage(
              button.dataset.pageAction
            )
        );

      });

    /* MODALS */

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

    setupSearch();

    openPage("dashboard");

    await checkSession();

  }
);

/* =========================================================
   GLOBAL
   ========================================================= */

window.deleteProduct =
  deleteProduct;

window.openPage =
  openPage;
