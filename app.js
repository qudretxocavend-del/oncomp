```javascript
/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
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

const $ = (id) => document.getElementById(id);

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

  if (!toast || !text) return;

  text.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

/* =========================================================
   AUTH
   ========================================================= */

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();

  if (data?.session) {
    currentUser = data.session.user;
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

function showLogin() {
  $("loginPage")?.classList.remove("hidden");
  $("appPage")?.classList.add("hidden");
}

function showApp() {
  $("loginPage")?.classList.add("hidden");
  $("appPage")?.classList.remove("hidden");
}

async function login(email, password) {
  const message = $("loginMessage");

  if (message) {
    message.textContent = "Giriş edilir...";
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (message) {
      message.textContent = error.message;
    }

    return;
  }

  currentUser = data.user;

  if (message) {
    message.textContent = "";
  }

  showApp();
  await loadAll();
}

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  showLogin();
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
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

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
    const purchase = Number(
      product.purchase_price ??
      product.buy_price ??
      product.cost ??
      0
    );

    const sale = Number(
      product.sale_price ??
      product.selling_price ??
      0
    );

    const stock = Number(product.stock ?? 1);

    const status =
      product.status === "sold" || stock <= 0
        ? "Satılıb"
        : "Aktiv";

    return `
      <tr>
        <td>
          <strong>${escapeHTML(product.name || product.model || "Məhsul")}</strong>
          <small>${escapeHTML(product.brand || "")}</small>
        </td>

        <td>${escapeHTML(product.category || "-")}</td>

        <td>${escapeHTML(product.imei || product.serial_number || product.serial || "-")}</td>

        <td>${money(purchase)}</td>

        <td>${money(sale)}</td>

        <td>${stock}</td>

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
  const select = $("productCategoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    )
  ];

  select.innerHTML = `
    <option value="">Bütün kateqoriyalar</option>
    ${categories.map(c =>
      `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join("")}
  `;
}

async function addProduct(formData) {
  const product = {
    name: formData.name,
    brand: formData.brand || null,
    model: formData.model || null,
    category: formData.category || null,
    imei: formData.imei || null,
    purchase_price: Number(formData.purchase_price || 0),
    sale_price: Number(formData.sale_price || 0),
    stock: Number(formData.stock ?? 1),
    status: "active",
    notes: formData.notes || null
  };

  const { error } = await supabaseClient
    .from("products")
    .insert(product);

  if (error) {
    console.error(error);
    showToast("Məhsul əlavə edilmədi: " + error.message);
    return false;
  }

  showToast("Məhsul əlavə edildi");
  await loadProducts();
  updateDashboard();

  return true;
}

async function deleteProduct(id) {
  if (!confirm("Bu məhsulu silmək istəyirsiniz?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    showToast("Məhsul silinmədi: " + error.message);
    return;
  }

  showToast("Məhsul silindi");
  await loadProducts();
  updateDashboard();
}

/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {
  const { data, error } = await supabaseClient
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Customers:", error);
    customers = [];
  } else {
    customers = data || [];
  }

  renderCustomers();
}

function renderCustomers() {
  const table = $("customersTable");

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

  table.innerHTML = customers.map(customer => `
    <tr>
      <td>
        <strong>
          ${escapeHTML(
            customer.name ||
            customer.full_name ||
            `${customer.first_name || ""} ${customer.last_name || ""}`
          )}
        </strong>
      </td>

      <td>${escapeHTML(customer.phone || "-")}</td>

      <td>${escapeHTML(customer.email || "-")}</td>

      <td>${escapeHTML(customer.address || "-")}</td>

      <td>
        ${customer.created_at
          ? new Date(customer.created_at).toLocaleDateString("az-AZ")
          : "-"}
      </td>

      <td></td>
    </tr>
  `).join("");
}

async function addCustomer(formData) {
  const customer = {
    name: formData.name,
    phone: formData.phone || null,
    email: formData.email || null,
    address: formData.address || null,
    notes: formData.notes || null
  };

  const { error } = await supabaseClient
    .from("customers")
    .insert(customer);

  if (error) {
    showToast("Müştəri əlavə edilmədi: " + error.message);
    return false;
  }

  showToast("Müştəri əlavə edildi");

  await loadCustomers();

  return true;
}

/* =========================================================
   SALES
   ========================================================= */

async function loadSales() {
  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Sales:", error);
    sales = [];
  } else {
    sales = data || [];
  }

  renderSales();
  renderRecentSales();
}

function getSaleProduct(sale) {
  return products.find(
    p => String(p.id) === String(sale.product_id)
  );
}

function getSaleCustomer(sale) {
  return customers.find(
    c => String(c.id) === String(sale.customer_id)
  );
}

function renderSales() {
  const table = $("salesTable");

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

  table.innerHTML = sales.map((sale, index) => {
    const product = getSaleProduct(sale);
    const customer = getSaleCustomer(sale);

    const purchase = Number(
      sale.purchase_price ??
      sale.cost_price ??
      product?.purchase_price ??
      0
    );

    const salePrice = Number(
      sale.sale_price ??
      sale.selling_price ??
      sale.amount ??
      sale.total ??
      0
    );

    const profit = Number(
      sale.profit ??
      (salePrice - purchase)
    );

    const saleNumber =
      sale.sale_number ||
      `SAT-${String(sales.length - index).padStart(4, "0")}`;

    return `
      <tr>

        <td>
          <strong>${escapeHTML(saleNumber)}</strong>
        </td>

        <td>
          ${escapeHTML(
            product?.name ||
            product?.model ||
            sale.product_name ||
            "Məhsul"
          )}
        </td>

        <td>
          ${escapeHTML(
            customer?.name ||
            customer?.full_name ||
            sale.customer_name ||
            "Müştəri"
          )}
        </td>

        <td>
          ${money(purchase)}
        </td>

        <td>
          <strong>${money(salePrice)}</strong>
        </td>

        <td>
          ${money(profit)}
        </td>

        <td>
          ${escapeHTML(
            sale.payment_method ||
            sale.payment ||
            "Nağd"
          )}
        </td>

        <td>
          ${sale.created_at
            ? new Date(sale.created_at).toLocaleDateString("az-AZ")
            : "-"}
        </td>

      </tr>
    `;
  }).join("");
}

function renderRecentSales() {
  const table = $("recentSalesTable");

  if (!table) return;

  const recent = sales.slice(0, 5);

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

  table.innerHTML = recent.map(sale => {
    const product = getSaleProduct(sale);
    const customer = getSaleCustomer(sale);

    const salePrice = Number(
      sale.sale_price ??
      sale.amount ??
      sale.total ??
      0
    );

    return `
      <tr>
        <td>
          ${escapeHTML(product?.name || sale.product_name || "-")}
        </td>

        <td>
          ${escapeHTML(customer?.name || sale.customer_name || "-")}
        </td>

        <td>
          <strong>${money(salePrice)}</strong>
        </td>

        <td>
          ${escapeHTML(sale.payment_method || sale.payment || "Nağd")}
        </td>

        <td>
          ${sale.created_at
            ? new Date(sale.created_at).toLocaleDateString("az-AZ")
            : "-"}
        </td>
      </tr>
    `;
  }).join("");
}

async function addSale(formData) {
  const productId = formData.product_id;
  const customerId = formData.customer_id;

  if (!productId || !customerId) {
    showToast("Məhsul və müştəri seçilməlidir.");
    return false;
  }

  const product = products.find(
    p => String(p.id) === String(productId)
  );

  if (!product) {
    showToast("Seçilmiş məhsul tapılmadı.");
    return false;
  }

  const customer = customers.find(
    c => String(c.id) === String(customerId)
  );

  if (!customer) {
    showToast("Seçilmiş müştəri tapılmadı.");
    return false;
  }

  const purchasePrice = Number(
    product.purchase_price ??
    product.buy_price ??
    product.cost ??
    0
  );

  const salePrice = Number(
    formData.sale_price ||
    product.sale_price ||
    product.selling_price ||
    0
  );

  const profit = salePrice - purchasePrice;

  const saleNumber =
    `SAT-${Date.now().toString().slice(-8)}`;

  const sale = {
    sale_number: saleNumber,
    product_id: productId,
    customer_id: customerId,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    amount: salePrice,
    profit: profit,
    payment_method: formData.payment_method || "Nağd",
    notes: formData.notes || null
  };

  const { error } = await supabaseClient
    .from("sales")
    .insert(sale);

  if (error) {
    console.error(error);
    showToast("Satış yaradılmadı: " + error.message);
    return false;
  }

  /* Məhsulu satılmış kimi işarələ */
  await supabaseClient
    .from("products")
    .update({
      stock: 0,
      status: "sold"
    })
    .eq("id", productId);

  showToast("Satış uğurla yaradıldı");

  await loadAll();

  return true;
}

/* =========================================================
   EXPENSES
   ========================================================= */

async function loadExpenses() {
  const { data, error } = await supabaseClient
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Expenses:", error);
    expenses = [];
  } else {
    expenses = data || [];
  }

  renderExpenses();
}

function renderExpenses() {
  const table = $("expensesTable");

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

  table.innerHTML = expenses.map(expense => `
    <tr>
      <td>${escapeHTML(expense.name || expense.title || "-")}</td>
      <td>${escapeHTML(expense.category || "-")}</td>
      <td>${money(expense.amount)}</td>
      <td>
        ${expense.created_at
          ? new Date(expense.created_at).toLocaleDateString("az-AZ")
          : "-"}
      </td>
      <td>${escapeHTML(expense.notes || "-")}</td>
      <td></td>
    </tr>
  `).join("");
}

async function addExpense(formData) {
  const expense = {
    name: formData.name || formData.title,
    category: formData.category || null,
    amount: Number(formData.amount || 0),
    notes: formData.notes || null
  };

  const { error } = await supabaseClient
    .from("expenses")
    .insert(expense);

  if (error) {
    showToast("Xərc əlavə edilmədi: " + error.message);
    return false;
  }

  showToast("Xərc əlavə edildi");

  await loadExpenses();
  updateReports();

  return true;
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {
  const activeProducts = products.filter(
    p => p.status !== "sold" && Number(p.stock ?? 1) > 0
  );

  const inventoryValue = activeProducts.reduce(
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

  const now = new Date();

  const monthlySales = sales.filter(s => {
    if (!s.created_at) return false;

    const date = new Date(s.created_at);

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  const monthlyRevenue = monthlySales.reduce(
    (sum, s) =>
      sum +
      Number(
        s.sale_price ??
        s.amount ??
        s.total ??
        0
      ),
    0
  );

  const monthlyProfit = monthlySales.reduce(
    (sum, s) =>
      sum +
      Number(
        s.profit ??
        0
      ),
    0
  );

  if ($("statProducts"))
    $("statProducts").textContent = products.length;

  if ($("statInventory"))
    $("statInventory").textContent = money(inventoryValue);

  if ($("statSales"))
    $("statSales").textContent = money(monthlyRevenue);

  if ($("statProfit"))
    $("statProfit").textContent = money(monthlyProfit);

  if ($("stockAvailable"))
    $("stockAvailable").textContent = activeProducts.length;

  if ($("stockSold"))
    $("stockSold").textContent =
      products.filter(p => p.status === "sold").length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      activeProducts.filter(
        p => Number(p.stock ?? 1) <= 1
      ).length;
}

/* =========================================================
   INVENTORY
   ========================================================= */

function updateInventory() {
  const available = products.filter(
    p => p.status !== "sold" && Number(p.stock ?? 1) > 0
  );

  const sold = products.filter(
    p => p.status === "sold" || Number(p.stock ?? 1) <= 0
  );

  const critical = available.filter(
    p => Number(p.stock ?? 1) <= 1
  );

  const value = available.reduce(
    (sum, p) =>
      sum +
      Number(p.purchase_price ?? 0) *
      Number(p.stock ?? 1),
    0
  );

  if ($("inventoryAvailable"))
    $("inventoryAvailable").textContent = available.length;

  if ($("inventoryCritical"))
    $("inventoryCritical").textContent = critical.length;

  if ($("inventorySold"))
    $("inventorySold").textContent = sold.length;

  if ($("inventoryValue"))
    $("inventoryValue").textContent = money(value);

  const list = $("inventoryList");

  if (!list) return;

  if (!available.length) {
    list.innerHTML = `
      <div class="empty-state">
        Anbarda məhsul yoxdur
      </div>
    `;
    return;
  }

  list.innerHTML = available.map(p => `
    <div class="stock-row">
      <span>
        ${escapeHTML(p.name || p.model || "Məhsul")}
      </span>

      <strong>
        ${Number(p.stock ?? 1)} ədəd
      </strong>
    </div>
  `).join("");
}

/* =========================================================
   REPORTS
   ========================================================= */

function updateReports() {
  const revenue = sales.reduce(
    (sum, s) =>
      sum +
      Number(
        s.sale_price ??
        s.amount ??
        s.total ??
        0
      ),
    0
  );

  const expenseTotal = expenses.reduce(
    (sum, e) =>
      sum +
      Number(e.amount || 0),
    0
  );

  const profit = sales.reduce(
    (sum, s) =>
      sum +
      Number(s.profit || 0),
    0
  );

  if ($("reportRevenue"))
    $("reportRevenue").textContent = money(revenue);

  if ($("reportExpenses"))
    $("reportExpenses").textContent = money(expenseTotal);

  if ($("reportProfit"))
    $("reportProfit").textContent =
      money(profit - expenseTotal);

  if ($("reportSalesCount"))
    $("reportSalesCount").textContent =
      sales.length;

  const categoryReport = $("categoryReport");

  if (!categoryReport) return;

  const categoryMap = {};

  products.forEach(product => {
    const category = product.category || "Digər";

    categoryMap[category] =
      (categoryMap[category] || 0) + 1;
  });

  const categories = Object.entries(categoryMap);

  if (!categories.length) {
    categoryReport.innerHTML = "Məlumat yoxdur";
    return;
  }

  categoryReport.innerHTML = categories.map(
    ([category, count]) => `
      <div class="stock-row">
        <span>${escapeHTML(category)}</span>
        <strong>${count}</strong>
      </div>
    `
  ).join("");
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function openPage(page) {
  document.querySelectorAll(".content-page")
    .forEach(section => {
      section.classList.remove("active-page");
    });

  document.querySelectorAll(".nav-item")
    .forEach(button => {
      button.classList.remove("active");
    });

  const pageElement = $(`${page}Page`);

  if (pageElement) {
    pageElement.classList.add("active-page");
  }

  const navButton =
    document.querySelector(
      `.nav-item[data-page="${page}"]`
    );

  if (navButton) {
    navButton.classList.add("active");
  }

  const titles = {
    dashboard: "Dashboard",
    products: "Məhsullar",
    sales: "Satışlar",
    customers: "Müştərilər",
    inventory: "Anbar",
    expenses: "Xərclər",
    reports: "Hesabatlar",
    settings: "Parametrlər"
  };

  if ($("pageTitle"))
    $("pageTitle").textContent =
      titles[page] || "Dashboard";
}

/* =========================================================
   MODAL
   ========================================================= */

function openModal(title, description, html) {
  if ($("modalTitle"))
    $("modalTitle").textContent = title;

  if ($("modalDescription"))
    $("modalDescription").textContent = description;

  if ($("modalBody"))
    $("modalBody").innerHTML = html;

  $("modalOverlay")?.classList.remove("hidden");
}

function closeModal() {
  $("modalOverlay")?.classList.add("hidden");

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
      <form id="productModalForm" class="form-grid">

        <div class="form-group">
          <label>Məhsul adı</label>
          <input name="name" required>
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
            <option value="Notebook">Notebook</option>
            <option value="Planşet">Planşet</option>
            <option value="Digər">Digər</option>
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
            name="purchase_price"
            required
          >
        </div>

        <div class="form-group">
          <label>Satış qiyməti</label>
          <input
            type="number"
            step="0.01"
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

        <div class="form-group" style="grid-column:1/-1">
          <label>Qeyd</label>
          <textarea name="notes"></textarea>
        </div>

        <div style="grid-column:1/-1">
          <button type="submit" class="primary-btn">
            Məhsulu yadda saxla
          </button>
        </div>

      </form>
    `
  );

  $("productModalForm")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const form = new FormData(event.target);

      const data = Object.fromEntries(form.entries());

      const success = await addProduct(data);

      if (success) {
        closeModal();
      }
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
      <form id="customerModalForm" class="form-grid">

        <div class="form-group">
          <label>Ad Soyad</label>
          <input name="name" required>
        </div>

        <div class="form-group">
          <label>Telefon</label>
          <input name="phone">
        </div>

        <div class="form-group">
          <label>E-poçt</label>
          <input type="email" name="email">
        </div>

        <div class="form-group">
          <label>Ünvan</label>
          <input name="address">
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label>Qeyd</label>
          <textarea name="notes"></textarea>
        </div>

        <div style="grid-column:1/-1">
          <button type="submit" class="primary-btn">
            Müştərini yadda saxla
          </button>
        </div>

      </form>
    `
  );

  $("customerModalForm")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const data =
        Object.fromEntries(
          new FormData(event.target).entries()
        );

      const success =
        await addCustomer(data);

      if (success) {
        closeModal();
      }
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
    "Məhsul, müştəri və satış qiymətini seçin.",
    `
      <form id="saleModalForm" class="form-grid">

        <div class="form-group">
          <label>Məhsul</label>

          <select name="product_id" id="saleProductSelect" required>
            <option value="">Məhsul seçin</option>

            ${availableProducts.map(p => `
              <option value="${p.id}">
                ${escapeHTML(
                  p.name ||
                  p.model ||
                  "Məhsul"
                )}
                — ${money(p.sale_price)}
              </option>
            `).join("")}

          </select>
        </div>

        <div class="form-group">
          <label>Müştəri</label>

          <select name="customer_id" required>
            <option value="">Müştəri seçin</option>

            ${customers.map(c => `
              <option value="${c.id}">
                ${escapeHTML(
                  c.name ||
                  c.full_name ||
                  "Müştəri"
                )}
              </option>
            `).join("")}

          </select>
        </div>

        <div class="form-group">
          <label>Satış qiyməti</label>

          <input
            type="number"
            step="0.01"
            name="sale_price"
            id="salePriceInput"
            required
          >
        </div>

        <div class="form-group">
          <label>Ödəniş üsulu</label>

          <select name="payment_method">
            <option value="Nağd">Nağd</option>
            <option value="Kart">Kart</option>
            <option value="Köçürmə">Köçürmə</option>
            <option value="Nisyə">Nisyə</option>
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label>Qeyd</label>
          <textarea name="notes"></textarea>
        </div>

        <div style="grid-column:1/-1">
          <button type="submit" class="primary-btn">
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
            String(productSelect.value)
        );

      if (product && priceInput) {
        priceInput.value =
          product.sale_price ??
          product.selling_price ??
          0;
      }
    }
  );

  $("saleModalForm")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const form =
        new FormData(event.target);

      const data =
        Object.fromEntries(form.entries());

      /*
        Əsas düzəliş:
        select value-ları birbaşa FormData-dan
        götürülür və string olaraq Supabase-ə
        göndərilir.
      */

      const success =
        await addSale(data);

      if (success) {
        closeModal();
      }
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
      <form id="expenseModalForm" class="form-grid">

        <div class="form-group">
          <label>Xərc adı</label>
          <input name="name" required>
        </div>

        <div class="form-group">
          <label>Kateqoriya</label>
          <select name="category">
            <option value="İcarə">İcarə</option>
            <option value="Kommunal">Kommunal</option>
            <option value="Nəqliyyat">Nəqliyyat</option>
            <option value="Əmək haqqı">Əmək haqqı</option>
            <option value="Digər">Digər</option>
          </select>
        </div>

        <div class="form-group">
          <label>Məbləğ</label>
          <input
            type="number"
            step="0.01"
            name="amount"
            required
          >
        </div>

        <div class="form-group">
          <label>Qeyd</label>
          <input name="notes">
        </div>

        <div style="grid-column:1/-1">
          <button type="submit" class="primary-btn">
            Xərci yadda saxla
          </button>
        </div>

      </form>
    `
  );

  $("expenseModalForm")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const data =
        Object.fromEntries(
          new FormData(event.target).entries()
        );

      const success =
        await addExpense(data);

      if (success) {
        closeModal();
      }
    }
  );
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
  $("productSearch")?.addEventListener(
    "input",
    event => {
      const query =
        event.target.value.toLowerCase().trim();

      document
        .querySelectorAll("#productsTable tr")
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

  $("customerSearch")?.addEventListener(
    "input",
    event => {
      const query =
        event.target.value.toLowerCase().trim();

      document
        .querySelectorAll("#customersTable tr")
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
  () => {

    $("loginForm")?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        await login(
          $("loginEmail").value.trim(),
          $("loginPassword").value
        );
      }
    );

    $("logoutBtn")?.addEventListener(
      "click",
      logout
    );

    document
      .querySelectorAll(".nav-item")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => openPage(button.dataset.page)
        );
      });

    document
      .querySelectorAll("[data-page-action]")
      .forEach(button => {
        button.addEventListener(
          "click",
          () =>
            openPage(button.dataset.pageAction)
        );
      });

    $("addProductBtn")?.addEventListener(
      "click",
      openProductModal
    );

    $("addCustomerBtn")?.addEventListener(
      "click",
      openCustomerModal
    );

    $("newSaleBtn")?.addEventListener(
      "click",
      openSaleModal
    );

    $("addExpenseBtn")?.addEventListener(
      "click",
      openExpenseModal
    );

    $("closeModalBtn")?.addEventListener(
      "click",
      closeModal
    );

    $("modalOverlay")?.addEventListener(
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

    checkSession();
  }
);

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
   GLOBAL FUNCTIONS
   ========================================================= */

window.deleteProduct = deleteProduct;
window.openPage = openPage;
```
