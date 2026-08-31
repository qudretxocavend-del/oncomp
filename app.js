```javascript
/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   PREMIUM FULL APP.JS
   Login sistemi qorunub saxlanılıb
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

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date + "T00:00:00");

  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("az-AZ");
}

function showToast(message) {
  const toast = $("toast");
  const text = $("toastMessage");

  if (!toast || !text) return;

  text.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

/* =========================================================
   AUTH — BU HİSSƏYƏ TOXUNMURUQ
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
  const messageBox = $("loginMessage");

  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = type;
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

  currentUser = data.user;

  showApp();

  showMessage(
    "Uğurla daxil oldunuz.",
    "success"
  );

  await loadAll();
}

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;

  showLogin();

  $("loginForm")?.reset();
}

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
  populateProductCategoryFilter();
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
      Number(
        product.purchase_price ??
        product.buy_price ??
        product.cost ??
        0
      );

    const sale =
      Number(
        product.sale_price ??
        product.selling_price ??
        0
      );

    const stock =
      Number(product.stock ?? 1);

    const status =
      product.status === "sold" ||
      stock <= 0
        ? "Satılıb"
        : "Aktiv";

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
            ${escapeHTML(
              product.brand || ""
            )}
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

function populateProductCategoryFilter() {

  const select =
    $("productCategoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    )
  ];

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

    name:
      formData.name || "Məhsul",

    brand:
      formData.brand || null,

    model:
      formData.model || null,

    category:
      formData.category || "Digər",

    imei:
      formData.imei || null,

    purchase_price:
      Number(formData.purchase_price || 0),

    sale_price:
      Number(formData.sale_price || 0),

    stock:
      Number(formData.stock || 1),

    status:
      "active",

    notes:
      formData.notes || null,

    product_date:
      formData.product_date || today()
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

  showToast(
    "Məhsul uğurla əlavə edildi"
  );

  await loadProducts();

  updateDashboard();
  updateInventory();

  return true;
}

async function deleteProduct(id) {

  if (
    !confirm(
      "Bu məhsulu silmək istəyirsiniz?"
    )
  ) {
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

  showToast(
    "Məhsul silindi"
  );

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

    console.error(
      "Customers:",
      error
    );

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
    customers.map(customer => {

      const name =
        customer.full_name ||
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        "Müştəri";

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(name)}
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
            ${formatDate(
              customer.created_at
                ? customer.created_at.split("T")[0]
                : null
            )}
          </td>

          <td></td>

        </tr>
      `;

    }).join("");
}

async function addCustomer(formData) {

  const fullName =
    formData.full_name ||
    formData.name ||
    "";

  if (!fullName.trim()) {

    showToast(
      "Müştərinin adı daxil edilməlidir."
    );

    return false;
  }

  const customer = {

    full_name:
      fullName.trim(),

    name:
      fullName.trim(),

    phone:
      formData.phone || null,

    email:
      formData.email || null,

    address:
      formData.address || null,

    notes:
      formData.notes || null
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

    console.error(
      "Sales:",
      error
    );

    sales = [];

  } else {

    sales = data || [];
  }

  renderSales();
  renderRecentSales();
}

function getSaleProduct(sale) {

  return products.find(
    p =>
      String(p.id) ===
      String(sale.product_id)
  );
}

function getSaleCustomer(sale) {

  return customers.find(
    c =>
      String(c.id) ===
      String(sale.customer_id)
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
        Number(
          sale.purchase_price ??
          sale.cost_price ??
          product?.purchase_price ??
          0
        );

      const salePrice =
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          sale.total ??
          0
        );

      const profit =
        Number(
          sale.profit ??
          (salePrice - purchase)
        );

      const saleNumber =
        sale.sale_number ||
        `SAT-${String(
          sales.length - index
        ).padStart(4, "0")}`;

      const customerName =
        customer?.full_name ||
        customer?.name ||
        sale.customer_name ||
        "Müştəri";

      const productName =
        product?.name ||
        product?.model ||
        sale.product_name ||
        "Məhsul";

      const saleDate =
        sale.sale_date ||
        (
          sale.created_at
            ? sale.created_at.split("T")[0]
            : null
        );

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(saleNumber)}
            </strong>
          </td>

          <td>
            ${escapeHTML(productName)}
          </td>

          <td>
            ${escapeHTML(customerName)}
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
            ${formatDate(saleDate)}
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

      const salePrice =
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        );

      const customerName =
        customer?.full_name ||
        customer?.name ||
        sale.customer_name ||
        "-";

      const productName =
        product?.name ||
        product?.model ||
        sale.product_name ||
        "-";

      const saleDate =
        sale.sale_date ||
        (
          sale.created_at
            ? sale.created_at.split("T")[0]
            : null
        );

      return `
        <tr>

          <td>
            ${escapeHTML(productName)}
          </td>

          <td>
            ${escapeHTML(customerName)}
          </td>

          <td>
            <strong>
              ${money(salePrice)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              sale.payment_method ||
              "Nağd"
            )}
          </td>

          <td>
            ${formatDate(saleDate)}
          </td>

        </tr>
      `;

    }).join("");
}

async function addSale(formData) {

  const productId =
    String(formData.product_id || "").trim();

  const customerId =
    String(formData.customer_id || "").trim();

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
        productId
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
        customerId
    );

  if (!customer) {

    showToast(
      "Seçilmiş müştəri tapılmadı."
    );

    return false;
  }

  const purchasePrice =
    Number(
      product.purchase_price ??
      product.buy_price ??
      product.cost ??
      0
    );

  const salePrice =
    Number(
      formData.sale_price ||
      product.sale_price ||
      product.selling_price ||
      0
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
    `SAT-${Date.now()
      .toString()
      .slice(-8)}`;

  const saleDate =
    formData.sale_date ||
    today();

  const sale = {

    sale_number:
      saleNumber,

    product_id:
      productId,

    customer_id:
      customerId,

    product_name:
      product.name ||
      product.model ||
      "Məhsul",

    customer_name:
      customer.full_name ||
      customer.name ||
      "Müştəri",

    purchase_price:
      purchasePrice,

    sale_price:
      salePrice,

    total_amount:
      salePrice,

    amount:
      salePrice,

    profit:
      profit,

    payment_method:
      formData.payment_method ||
      "Nağd",

    sale_date:
      saleDate,

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

    showToast(
      "Satış yaradılmadı: " +
      error.message
    );

    return false;
  }

  /*
   * Məhsulu satılmış kimi işarələ
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
      "Product update:",
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
    expenses.map(expense => {

      const expenseDate =
        expense.expense_date ||
        (
          expense.created_at
            ? expense.created_at.split("T")[0]
            : null
        );

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
            ${formatDate(expenseDate)}
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

async function addExpense(formData) {

  const expense = {

    name:
      formData.name ||
      formData.title ||
      "Xərc",

    category:
      formData.category ||
      "Digər",

    amount:
      Number(formData.amount || 0),

    expense_date:
      formData.expense_date ||
      today(),

    notes:
      formData.notes ||
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

  const activeProducts =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  const inventoryValue =
    activeProducts.reduce(
      (sum, p) =>
        sum +
        Number(
          p.purchase_price ??
          p.buy_price ??
          p.cost ??
          0
        ) *
        Number(p.stock ?? 1),
      0
    );

  const now =
    new Date();

  const monthlySales =
    sales.filter(s => {

      const date =
        new Date(
          (
            s.sale_date ||
            s.created_at
          ) + "T00:00:00"
        );

      return (
        date.getMonth() ===
        now.getMonth() &&
        date.getFullYear() ===
        now.getFullYear()
      );

    });

  const monthlyRevenue =
    monthlySales.reduce(
      (sum, s) =>
        sum +
        Number(
          s.sale_price ??
          s.total_amount ??
          s.amount ??
          0
        ),
      0
    );

  const monthlyProfit =
    monthlySales.reduce(
      (sum, s) =>
        sum +
        Number(
          s.profit || 0
        ),
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
      money(monthlyRevenue);

  if ($("statProfit"))
    $("statProfit").textContent =
      money(monthlyProfit);

  if ($("stockAvailable"))
    $("stockAvailable").textContent =
      activeProducts.length;

  if ($("stockSold"))
    $("stockSold").textContent =
      products.filter(
        p => p.status === "sold"
      ).length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      activeProducts.filter(
        p =>
          Number(p.stock ?? 1) <= 1
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
        Number(
          p.purchase_price || 0
        ) *
        Number(
          p.stock ?? 1
        ),
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
    available.map(p => `

      <div class="stock-row">

        <span>
          ${escapeHTML(
            p.name ||
            p.model ||
            "Məhsul"
          )}
        </span>

        <strong>
          ${Number(
            p.stock ?? 1
          )} ədəd
        </strong>

      </div>

    `).join("");
}

/* =========================================================
   DATE REPORT SYSTEM
   ========================================================= */

function getDateRange(type, year, month, day) {

  year = Number(year);

  month = Number(month);

  day = Number(day);

  let start;
  let end;

  if (type === "daily") {

    start =
      new Date(
        year,
        month,
        day
      );

    end =
      new Date(
        year,
        month,
        day + 1
      );

  }

  else if (type === "weekly") {

    const selected =
      new Date(
        year,
        month,
        day
      );

    const weekday =
      selected.getDay();

    const mondayOffset =
      weekday === 0
        ? -6
        : 1 - weekday;

    start =
      new Date(
        selected
      );

    start.setDate(
      selected.getDate() +
      mondayOffset
    );

    end =
      new Date(start);

    end.setDate(
      start.getDate() + 7
    );

  }

  else if (type === "monthly") {

    start =
      new Date(
        year,
        month,
        1
      );

    end =
      new Date(
        year,
        month + 1,
        1
      );

  }

  else {

    start =
      new Date(
        year,
        0,
        1
      );

    end =
      new Date(
        year + 1,
        0,
        1
      );
  }

  return {
    start,
    end
  };
}

function dateInRange(dateString, range) {

  if (!dateString) return false;

  const date =
    new Date(
      dateString + "T00:00:00"
    );

  return (
    date >= range.start &&
    date < range.end
  );
}

function updateReports() {

  const revenue =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        ),
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

  const profit =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.profit || 0
        ),
      0
    );

  if ($("reportRevenue"))
    $("reportRevenue").textContent =
      money(revenue);

  if ($("reportExpenses"))
    $("reportExpenses").textContent =
      money(expenseTotal);

  if ($("reportProfit"))
    $("reportProfit").textContent =
      money(
        profit -
        expenseTotal
      );

  if ($("reportSalesCount"))
    $("reportSalesCount").textContent =
      sales.length;

  renderCategoryReport();
}

function renderCategoryReport() {

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
   PREMIUM REPORT FILTER UI
   ========================================================= */

function createReportFilters() {

  const reportsPage =
    $("reportsPage");

  if (!reportsPage) return;

  if ($("oncompReportFilters"))
    return;

  const toolbar =
    reportsPage.querySelector(
      ".page-toolbar"
    );

  if (!toolbar) return;

  const filterBox =
    document.createElement("div");

  filterBox.id =
    "oncompReportFilters";

  filterBox.style.cssText = `
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    align-items:center;
    margin-top:18px;
    margin-bottom:20px;
  `;

  filterBox.innerHTML = `

    <select id="reportPeriod">

      <option value="daily">
        Günlük
      </option>

      <option value="weekly">
        Həftəlik
      </option>

      <option value="monthly" selected>
        Aylıq
      </option>

      <option value="yearly">
        İllik
      </option>

    </select>

    <select id="reportYear">
      ${Array.from(
        { length: 75 },
        (_, i) => {
          const year =
            2026 + i;

          return `
            <option value="${year}">
              ${year}
            </option>
          `;
        }
      ).join("")}
    </select>

    <select id="reportMonth">

      <option value="0">
        Yanvar
      </option>

      <option value="1">
        Fevral
      </option>

      <option value="2">
        Mart
      </option>

      <option value="3">
        Aprel
      </option>

      <option value="4">
        May
      </option>

      <option value="5">
        İyun
      </option>

      <option value="6">
        İyul
      </option>

      <option value="7">
        Avqust
      </option>

      <option value="8">
        Sentyabr
      </option>

      <option value="9">
        Oktyabr
      </option>

      <option value="10">
        Noyabr
      </option>

      <option value="11">
        Dekabr
      </option>

    </select>

    <select id="reportDay"></select>

    <button
      id="applyReportBtn"
      class="primary-btn"
    >
      Hesabatı göstər
    </button>

  `;

  toolbar.parentNode.insertBefore(
    filterBox,
    toolbar.nextSibling
  );

  const now =
    new Date();

  $("reportYear").value =
    String(
      Math.min(
        2100,
        Math.max(
          2026,
          now.getFullYear()
        )
      )
    );

  $("reportMonth").value =
    String(
      now.getMonth()
    );

  updateReportDays();

  $("reportPeriod")
    ?.addEventListener(
      "change",
      updateReportFilterState
    );

  $("reportYear")
    ?.addEventListener(
      "change",
      updateReportDays
    );

  $("reportMonth")
    ?.addEventListener(
      "change",
      updateReportDays
    );

  $("applyReportBtn")
    ?.addEventListener(
      "click",
      generateSelectedReport
    );

  updateReportFilterState();
}

function updateReportDays() {

  const year =
    Number(
      $("reportYear")?.value
    );

  const month =
    Number(
      $("reportMonth")?.value
    );

  const daySelect =
    $("reportDay");

  if (!daySelect) return;

  const days =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  daySelect.innerHTML =
    Array.from(
      { length: days },
      (_, i) => {

        const day =
          i + 1;

        return `
          <option value="${day}">
            ${String(day).padStart(
              2,
              "0"
            )}
          </option>
        `;
      }
    ).join("");

  const currentDay =
    new Date().getDate();

  if (
    currentDay <= days &&
    year === new Date().getFullYear() &&
    month === new Date().getMonth()
  ) {
    daySelect.value =
      String(currentDay);
  }
}

function updateReportFilterState() {

  const type =
    $("reportPeriod")?.value;

  const month =
    $("reportMonth");

  const day =
    $("reportDay");

  if (!month || !day) return;

  if (type === "yearly") {

    month.disabled = true;
    day.disabled = true;

  }

  else if (type === "monthly") {

    month.disabled = false;
    day.disabled = true;

  }

  else {

    month.disabled = false;
    day.disabled = false;
  }
}

function generateSelectedReport() {

  const type =
    $("reportPeriod")?.value ||
    "monthly";

  const year =
    Number(
      $("reportYear")?.value ||
      new Date().getFullYear()
    );

  const month =
    Number(
      $("reportMonth")?.value ||
      0
    );

  const day =
    Number(
      $("reportDay")?.value ||
      1
    );

  const range =
    getDateRange(
      type,
      year,
      month,
      day
    );

  const filteredSales =
    sales.filter(sale => {

      const date =
        sale.sale_date ||
        (
          sale.created_at
            ? sale.created_at.split("T")[0]
            : null
        );

      return dateInRange(
        date,
        range
      );
    });

  const filteredExpenses =
    expenses.filter(expense => {

      const date =
        expense.expense_date ||
        (
          expense.created_at
            ? expense.created_at.split("T")[0]
            : null
        );

      return dateInRange(
        date,
        range
      );
    });

  const revenue =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        ),
      0
    );

  const expensesTotal =
    filteredExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const grossProfit =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.profit || 0
        ),
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
      filteredSales.length;

  renderFilteredSalesReport(
    filteredSales
  );

  showToast(
    "Hesabat yeniləndi"
  );
}

function renderFilteredSalesReport(
  filteredSales
) {

  const chart =
    $("reportChart");

  if (!chart) return;

  if (!filteredSales.length) {

    chart.innerHTML = `
      <div class="empty-chart">
        Seçilmiş tarix üzrə satış yoxdur
      </div>
    `;

    return;
  }

  const total =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        ),
      0
    );

  chart.innerHTML = `

    <div style="
      padding:30px;
      text-align:center;
    ">

      <div style="
        font-size:14px;
        opacity:.65;
        margin-bottom:8px;
      ">
        Seçilmiş dövr üzrə satış
      </div>

      <div style="
        font-size:32px;
        font-weight:800;
        margin-bottom:10px;
      ">
        ${money(total)}
      </div>

      <div style="
        font-size:14px;
        opacity:.7;
      ">
        ${filteredSales.length}
        satış əməliyyatı
      </div>

    </div>

  `;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const pageTitles = {

  dashboard:
    "Dashboard",

  products:
    "Məhsullar",

  sales:
    "Satışlar",

  customers:
    "Müştərilər",

  inventory:
    "Anbar",

  expenses:
    "Xərclər",

  reports:
    "Hesabatlar",

  settings:
    "Parametrlər"
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
    nav.classList.add(
      "active"
    );

  if ($("pageTitle"))
    $("pageTitle").textContent =
      pageTitles[pageName] ||
      pageName;

  if (
    pageName === "reports"
  ) {
    createReportFilters();
  }
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
    ?.classList.remove(
      "hidden"
    );
}

function closeModal() {

  $("modalOverlay")
    ?.classList.add(
      "hidden"
    );

  if ($("modalBody"))
    $("modalBody").innerHTML =
      "";
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

          <label>
            Seriya / IMEI
          </label>

          <input name="imei">

        </div>

        <div class="form-group">

          <label>
            Alış qiyməti
          </label>

          <input
            type="number"
            step="0.01"
            min="0"
            name="purchase_price"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Satış qiyməti
          </label>

          <input
            type="number"
            step="0.01"
            min="0"
            name="sale_price"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Stok
          </label>

          <input
            type="number"
            min="1"
            value="1"
            name="stock"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Məhsul tarixi
          </label>

          <input
            type="date"
            name="product_date"
            value="${today()}"
            required
          >

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

          <label>
            Qeyd
          </label>

          <textarea
            name="notes"
          ></textarea>

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

        <div class="form-group">

          <label>
            Ad Soyad
          </label>

          <input
            name="full_name"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Telefon
          </label>

          <input
            name="phone"
          >

        </div>

        <div class="form-group">

          <label>
            E-poçt
          </label>

          <input
            type="email"
            name="email"
          >

        </div>

        <div class="form-group">

          <label>
            Ünvan
          </label>

          <input
            name="address"
          >

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >

          <label>
            Qeyd
          </label>

          <textarea
            name="notes"
          ></textarea>

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

  const availableProducts =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  openModal(
    "Yeni satış",
    "Məhsul, müştəri, qiymət və tarixi seçin.",
    `

      <form
        id="saleModalForm"
        class="form-grid"
      >

        <div class="form-group">

          <label>
            Məhsul
          </label>

          <select
            name="product_id"
            id="saleProductSelect"
            required
          >

            <option value="">
              Məhsul seçin
            </option>

            ${availableProducts.map(p => `

              <option
                value="${p.id}"
              >

                ${escapeHTML(
                  p.name ||
                  p.model ||
                  "Məhsul"
                )}

                —
                ${money(
                  p.sale_price ||
                  0
                )}

              </option>

            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>
            Müştəri
          </label>

          <select
            name="customer_id"
            required
          >

            <option value="">
              Müştəri seçin
            </option>

            ${customers.map(c => `

              <option
                value="${c.id}"
              >

                ${escapeHTML(
                  c.full_name ||
                  c.name ||
                  "Müştəri"
                )}

              </option>

            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>
            Satış qiyməti
          </label>

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

          <label>
            Satış tarixi
          </label>

          <input
            type="date"
            name="sale_date"
            value="${today()}"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Ödəniş üsulu
          </label>

          <select
            name="payment_method"
          >

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

          <label>
            Qeyd
          </label>

          <textarea
            name="notes"
          ></textarea>

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

  productSelect?.addEventListener(
    "change",
    () => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(
              productSelect.value
            )
        );

      if (
        product &&
        priceInput
      ) {

        priceInput.value =
          product.sale_price ??
          product.selling_price ??
          0;
      }

    }
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

          <label>
            Xərc adı
          </label>

          <input
            name="name"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Kateqoriya
          </label>

          <select
            name="category"
          >

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

          <label>
            Məbləğ
          </label>

          <input
            type="number"
            step="0.01"
            min="0"
            name="amount"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Xərc tarixi
          </label>

          <input
            type="date"
            name="expense_date"
            value="${today()}"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Qeyd
          </label>

          <input
            name="notes"
          >

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
}

/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

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

    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );

    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            openPage(
              button.dataset.page
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
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (session) {

      currentUser =
        session.user;

      showApp();

      if (
        event === "SIGNED_IN"
      ) {
        await loadAll();
      }

    } else {

      currentUser = null;

      showLogin();

    }

  }
);

/* =========================================================
   GLOBAL
   ========================================================= */

window.deleteProduct =
  deleteProduct;

window.openPage =
  openPage;

window.openProductModal =
  openProductModal;

window.openCustomerModal =
  openCustomerModal;

window.openSaleModal =
  openSaleModal;

window.openExpenseModal =
  openExpenseModal;

window.generateSelectedReport =
  generateSelectedReport;
```
