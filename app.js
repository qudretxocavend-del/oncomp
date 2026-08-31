```javascript
/*
=========================================================
   ONCOMP — Elektron Uçot Sistemi

   AUTH + DASHBOARD + PRODUCTS + SALES +
   CUSTOMERS + INVENTORY + EXPENSES + REPORTS
=========================================================
*/

const SUPABASE_URL =
  "https://frnbduzaiuitpxgvvzwq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

/*
=========================================================
   GLOBAL
=========================================================
*/

let products = [];
let customers = [];
let sales = [];
let expenses = [];

const $ = id => document.getElementById(id);

function money(value) {
  return (
    Number(value || 0).toLocaleString("az-AZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " ₼"
  );
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

/*
=========================================================
   AUTH
=========================================================
*/

const loginPage = $("loginPage");
const appPage = $("appPage");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const logoutBtn = $("logoutBtn");

function showLogin() {
  loginPage?.classList.remove("hidden");
  appPage?.classList.add("hidden");
}

function showApp() {
  loginPage?.classList.add("hidden");
  appPage?.classList.remove("hidden");
}

function showMessage(message, type = "error") {
  if (!loginMessage) return;

  loginMessage.textContent = message;
  loginMessage.className = type;
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
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  if (!email || !password) {
    showMessage("E-poçt və şifrə daxil edin.");
    return;
  }

  const button = loginForm.querySelector("button");

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

    showMessage(
      "E-poçt və ya şifrə yanlışdır."
    );

    return;
  }

  if (data.session) {
    showApp();

    showMessage(
      "Uğurla daxil oldunuz.",
      "success"
    );

    await loadAll();
  }
});

logoutBtn?.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    showLogin();

    loginForm?.reset();
  }
);

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {
    if (session) {
      showApp();
    } else {
      showLogin();
    }
  }
);

/*
=========================================================
   NAVIGATION
=========================================================
*/

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
  contentPages.forEach(page => {
    page.classList.remove("active-page");
  });

  navItems.forEach(item => {
    item.classList.remove("active");
  });

  const targetPage =
    $(`${pageName}Page`);

  const targetNav =
    document.querySelector(
      `.nav-item[data-page="${pageName}"]`
    );

  targetPage?.classList.add("active-page");
  targetNav?.classList.add("active");

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      pageTitles[pageName] || pageName;
  }

  if (pageName === "reports") {
    updateReports();
  }

  if (pageName === "dashboard") {
    updateDashboard();
  }
}

navItems.forEach(item => {
  item.addEventListener("click", () => {
    openPage(item.dataset.page);
  });
});

document
  .querySelectorAll("[data-page-action]")
  .forEach(button => {
    button.addEventListener("click", () => {
      openPage(button.dataset.pageAction);
    });
  });

/*
=========================================================
   LOAD ALL
=========================================================
*/

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

/*
=========================================================
   PRODUCTS
=========================================================
*/

async function loadProducts() {
  const { data, error } =
    await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    products = [];
  } else {
    products = data || [];
  }

  renderProducts();
  populateProductCategoryFilter();
}

function getProductPurchase(product) {
  return Number(
    product?.purchase_price ??
    product?.buy_price ??
    product?.cost ??
    0
  );
}

function getProductSale(product) {
  return Number(
    product?.sale_price ??
    product?.selling_price ??
    0
  );
}

function getProductDate(product) {
  return (
    product.product_date ||
    product.purchase_date ||
    product.created_at
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
      const purchase =
        getProductPurchase(product);

      const sale =
        getProductSale(product);

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
            ${money(sale)}
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
    name: formData.name,
    brand: formData.brand || null,
    model: formData.model || null,
    category: formData.category || null,
    imei: formData.imei || null,
    purchase_price:
      Number(formData.purchase_price || 0),
    sale_price:
      Number(formData.sale_price || 0),
    stock:
      Number(formData.stock || 1),
    status: "active",
    notes: formData.notes || null
  };

  if (formData.product_date) {
    product.product_date =
      formData.product_date;
  }

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

  showToast("Məhsul əlavə edildi");

  await loadProducts();

  updateDashboard();
  updateInventory();
  updateReports();

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

/*
=========================================================
   CUSTOMERS
=========================================================
*/

async function loadCustomers() {
  const { data, error } =
    await supabaseClient
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    customers = [];
  } else {
    customers = data || [];
  }

  renderCustomers();
}

function getCustomerName(customer) {
  return (
    customer.name ||
    customer.full_name ||
    `${customer.first_name || ""}
     ${customer.last_name || ""}`.trim() ||
    "Müştəri"
  );
}

/*
---------------------------------------------------------
   MÜŞTƏRİLƏR — REDAKTƏ + SİL
---------------------------------------------------------
*/

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
            ${escapeHTML(
              getCustomerName(customer)
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

        <td>
          <button
            class="text-btn"
            onclick="editCustomer('${customer.id}')">
            Redaktə et
          </button>

          <button
            class="text-btn"
            onclick="deleteCustomer('${customer.id}')">
            Sil
          </button>
        </td>
      </tr>
    `).join("");
}

async function addCustomer(formData) {
  const fullName =
    formData.name?.trim() ||
    `${formData.first_name || ""}
     ${formData.last_name || ""}`.trim();

  const customer = {
    name: fullName,
    full_name: fullName,
    phone: formData.phone || null,
    email: formData.email || null,
    address: formData.address || null,
    notes: formData.notes || null
  };

  const { error } =
    await supabaseClient
      .from("customers")
      .insert(customer);

  if (error) {
    showToast(
      "Müştəri əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  showToast("Müştəri əlavə edildi");

  await loadCustomers();

  updateReports();

  return true;
}

async function editCustomer(id) {
  const customer =
    customers.find(
      c => String(c.id) === String(id)
    );

  if (!customer) {
    showToast("Müştəri tapılmadı.");
    return;
  }

  openModal(
    "Müştərini redaktə et",
    "Müştəri məlumatlarını dəyişdirin.",
    `
      <form
        id="editCustomerForm"
        class="form-grid">

        <div class="form-group">
          <label>Ad Soyad</label>

          <input
            name="name"
            value="${escapeHTML(
              getCustomerName(customer)
            )}"
            required
          >
        </div>

        <div class="form-group">
          <label>Telefon</label>

          <input
            name="phone"
            value="${escapeHTML(
              customer.phone || ""
            )}"
          >
        </div>

        <div class="form-group">
          <label>E-poçt</label>

          <input
            type="email"
            name="email"
            value="${escapeHTML(
              customer.email || ""
            )}"
          >
        </div>

        <div class="form-group">
          <label>Ünvan</label>

          <input
            name="address"
            value="${escapeHTML(
              customer.address || ""
            )}"
          >
        </div>

        <div
          class="form-group"
          style="grid-column:1/-1">

          <label>Qeyd</label>

          <textarea
            name="notes"
          >${escapeHTML(
            customer.notes || ""
          )}</textarea>
        </div>

        <div
          style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn">

            Dəyişikliyi yadda saxla

          </button>
        </div>
      </form>
    `
  );

  $("editCustomerForm")
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

        const fullName =
          data.name?.trim();

        const updateData = {
          name: fullName,
          full_name: fullName,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null
        };

        const { error } =
          await supabaseClient
            .from("customers")
            .update(updateData)
            .eq("id", id);

        if (error) {
          console.error(error);

          showToast(
            "Müştəri yenilənmədi: " +
            error.message
          );

          return;
        }

        closeModal();

        showToast(
          "Müştəri məlumatları yeniləndi"
        );

        await loadCustomers();

        await loadSales();

        updateDashboard();
        updateReports();
      }
    );
}

async function deleteCustomer(id) {
  const customer =
    customers.find(
      c => String(c.id) === String(id)
    );

  if (!customer) {
    showToast("Müştəri tapılmadı.");
    return;
  }

  const name =
    getCustomerName(customer);

  if (!confirm(
    `"${name}" adlı müştərini silmək istəyirsiniz?`
  )) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("customers")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(error);

    showToast(
      "Müştəri silinmədi: " +
      error.message
    );

    return;
  }

  showToast(
    "Müştəri silindi"
  );

  await loadCustomers();

  updateReports();
}

/*
=========================================================
   SALES
=========================================================
*/

async function loadSales() {
  const { data, error } =
    await supabaseClient
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
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

function getSaleAmount(sale) {
  return Number(
    sale.sale_price ??
    sale.total_amount ??
    sale.amount ??
    sale.total ??
    0
  );
}

function getSalePurchase(sale) {
  const product =
    getSaleProduct(sale);

  return Number(
    sale.purchase_price ??
    sale.cost_price ??
    getProductPurchase(product)
  );
}

function getSaleProfit(sale) {
  if (
    sale.profit !== null &&
    sale.profit !== undefined
  ) {
    return Number(sale.profit);
  }

  return (
    getSaleAmount(sale) -
    getSalePurchase(sale)
  );
}

function getSaleDate(sale) {
  return (
    sale.sale_date ||
    sale.created_at
  );
}

/*
---------------------------------------------------------
   SATIŞLAR — REDAKTƏ + SİL DÜYMƏLƏRİ
---------------------------------------------------------
*/

function renderSales() {
  const table =
    $("salesTable");

  if (!table) return;

  if (!sales.length) {
    table.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
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
        getSalePurchase(sale);

      const amount =
        getSaleAmount(sale);

      const profit =
        getSaleProfit(sale);

      const saleNumber =
        sale.sale_number ||
        `SAT-${String(
          sales.length - index
        ).padStart(4, "0")}`;

      const date =
        getSaleDate(sale);

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                saleNumber
              )}
            </strong>
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
              customer
                ? getCustomerName(customer)
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
            ${escapeHTML(
              sale.payment_method ||
              sale.payment ||
              "Nağd"
            )}
          </td>

          <td>
            ${
              date
                ? new Date(
                    date
                  ).toLocaleDateString("az-AZ")
                : "-"
            }
          </td>

          <td>

            <button
              class="text-btn"
              onclick="editSale('${sale.id}')">
              Redaktə et
            </button>

            <button
              class="text-btn"
              onclick="deleteSale('${sale.id}')">
              Sil
            </button>

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

      const date =
        getSaleDate(sale);

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
              customer
                ? getCustomerName(customer)
                : sale.customer_name ||
                  "-"
            )}
          </td>

          <td>
            <strong>
              ${money(
                getSaleAmount(sale)
              )}
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
            ${
              date
                ? new Date(
                    date
                  ).toLocaleDateString("az-AZ")
                : "-"
            }
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
    getProductPurchase(product);

  const salePrice =
    Number(
      formData.sale_price ||
      getProductSale(product)
    );

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

    total_amount:
      salePrice,

    profit:
      profit,

    payment_method:
      formData.payment_method ||
      "Nağd",

    notes:
      formData.notes || null
  };

  if (formData.sale_date) {
    sale.sale_date =
      formData.sale_date;
  }

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

  await supabaseClient
    .from("products")
    .update({
      stock: 0,
      status: "sold"
    })
    .eq("id", productId);

  showToast(
    "Satış uğurla yaradıldı"
  );

  await loadAll();

  return true;
}

/*
---------------------------------------------------------
   SATIŞ REDAKTƏ
---------------------------------------------------------
*/

async function editSale(id) {
  const sale =
    sales.find(
      s => String(s.id) === String(id)
    );

  if (!sale) {
    showToast("Satış tapılmadı.");
    return;
  }

  const currentProduct =
    getSaleProduct(sale);

  const currentCustomer =
    getSaleCustomer(sale);

  openModal(
    "Satışı redaktə et",
    "Satış məlumatlarını dəyişdirin.",
    `
      <form
        id="editSaleForm"
        class="form-grid">

        <div class="form-group">

          <label>Məhsul</label>

          <select
            name="product_id"
            required>

            <option value="">
              Məhsul seçin
            </option>

            ${products.map(p => `
              <option
                value="${p.id}"
                ${String(p.id) === String(sale.product_id)
                  ? "selected"
                  : ""}>

                ${escapeHTML(
                  p.name ||
                  p.model ||
                  "Məhsul"
                )}

                — ${money(
                  getProductSale(p)
                )}

              </option>
            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>Müştəri</label>

          <select
            name="customer_id"
            required>

            <option value="">
              Müştəri seçin
            </option>

            ${customers.map(c => `
              <option
                value="${c.id}"
                ${String(c.id) === String(sale.customer_id)
                  ? "selected"
                  : ""}>

                ${escapeHTML(
                  getCustomerName(c)
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
            value="${Number(
              getSaleAmount(sale)
            )}"
            required>

        </div>

        <div class="form-group">

          <label>Satış tarixi</label>

          <input
            type="date"
            name="sale_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              sale.sale_date ||
              (
                sale.created_at
                  ? new Date(
                      sale.created_at
                    )
                    .toISOString()
                    .split("T")[0]
                  : ""
              )
            }"
            required>

        </div>

        <div class="form-group">

          <label>Ödəniş üsulu</label>

          <select
            name="payment_method">

            <option
              value="Nağd"
              ${
                (sale.payment_method ||
                 sale.payment ||
                 "Nağd") === "Nağd"
                  ? "selected"
                  : ""
              }>
              Nağd
            </option>

            <option
              value="Kart"
              ${
                (sale.payment_method ||
                 sale.payment) === "Kart"
                  ? "selected"
                  : ""
              }>
              Kart
            </option>

            <option
              value="Köçürmə"
              ${
                (sale.payment_method ||
                 sale.payment) === "Köçürmə"
                  ? "selected"
                  : ""
              }>
              Köçürmə
            </option>

            <option
              value="Nisyə"
              ${
                (sale.payment_method ||
                 sale.payment) === "Nisyə"
                  ? "selected"
                  : ""
              }>
              Nisyə
            </option>

          </select>

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1">

          <label>Qeyd</label>

          <textarea
            name="notes"
          >${escapeHTML(
            sale.notes || ""
          )}</textarea>

        </div>

        <div
          style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn">

            Dəyişikliyi yadda saxla

          </button>

        </div>

      </form>
    `
  );

  $("editSaleForm")
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

        const product =
          products.find(
            p =>
              String(p.id) ===
              String(data.product_id)
          );

        if (!product) {
          showToast(
            "Seçilmiş məhsul tapılmadı."
          );

          return;
        }

        const customer =
          customers.find(
            c =>
              String(c.id) ===
              String(data.customer_id)
          );

        if (!customer) {
          showToast(
            "Seçilmiş müştəri tapılmadı."
          );

          return;
        }

        const purchasePrice =
          getProductPurchase(product);

        const salePrice =
          Number(
            data.sale_price || 0
          );

        const profit =
          salePrice -
          purchasePrice;

        const updateData = {
          product_id:
            data.product_id,

          customer_id:
            data.customer_id,

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
            data.notes || null
        };

        if (data.sale_date) {
          updateData.sale_date =
            data.sale_date;
        }

        const { error } =
          await supabaseClient
            .from("sales")
            .update(updateData)
            .eq("id", id);

        if (error) {
          console.error(error);

          showToast(
            "Satış yenilənmədi: " +
            error.message
          );

          return;
        }

        /*
          Əvvəlki məhsul satışdan çıxarılırsa,
          onun stoku yenidən aktiv edilir.
        */

        if (
          currentProduct &&
          String(currentProduct.id) !==
            String(data.product_id)
        ) {
          await supabaseClient
            .from("products")
            .update({
              stock: 1,
              status: "active"
            })
            .eq(
              "id",
              currentProduct.id
            );
        }

        /*
          Yeni seçilən məhsul satılmış kimi
          işarələnir.
        */

        await supabaseClient
          .from("products")
          .update({
            stock: 0,
            status: "sold"
          })
          .eq(
            "id",
            data.product_id
          );

        closeModal();

        showToast(
          "Satış məlumatları yeniləndi"
        );

        await loadAll();
      }
    );
}

/*
---------------------------------------------------------
   SATIŞ SİL
---------------------------------------------------------
*/

async function deleteSale(id) {
  const sale =
    sales.find(
      s => String(s.id) === String(id)
    );

  if (!sale) {
    showToast("Satış tapılmadı.");
    return;
  }

  const product =
    getSaleProduct(sale);

  const productName =
    product?.name ||
    product?.model ||
    sale.product_name ||
    "Məhsul";

  if (!confirm(
    `"${productName}" üzrə bu satışı silmək istəyirsiniz?`
  )) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("sales")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(error);

    showToast(
      "Satış silinmədi: " +
      error.message
    );

    return;
  }

  /*
    Satış silindikdə məhsul yenidən
    anbarda aktiv vəziyyətə qaytarılır.
  */

  if (product) {
    await supabaseClient
      .from("products")
      .update({
        stock: 1,
        status: "active"
      })
      .eq(
        "id",
        product.id
      );
  }

  showToast(
    "Satış silindi və məhsul anbara qaytarıldı"
  );

  await loadAll();
}

/*
=========================================================
   EXPENSES
=========================================================
*/

async function loadExpenses() {
  const { data, error } =
    await supabaseClient
      .from("expenses")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    expenses = [];
  } else {
    expenses = data || [];
  }

  renderExpenses();
}

function getExpenseDate(expense) {
  return (
    expense.expense_date ||
    expense.date ||
    expense.created_at
  );
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
      const date =
        getExpenseDate(expense);

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                expense.name ||
                expense.title ||
                "-"
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
              ${money(
                expense.amount
              )}
            </strong>
          </td>

          <td>
            ${
              date
                ? new Date(
                    date
                  ).toLocaleDateString("az-AZ")
                : "-"
            }
          </td>

          <td>
            ${escapeHTML(
              expense.notes || "-"
            )}
          </td>

          <td>

            <button
              class="text-btn"
              onclick="editExpense('${expense.id}')">
              Redaktə et
            </button>

            <button
              class="text-btn"
              onclick="deleteExpense('${expense.id}')">
              Sil
            </button>

          </td>

        </tr>
      `;
    }).join("");
}

async function addExpense(formData) {
  /*
    Bazada title NOT NULL olduğu üçün
    həm title, həm name göndəririk.
  */

  const expenseName =
    (
      formData.name ||
      formData.title ||
      ""
    ).trim();

  const expense = {
    title:
      expenseName,

    name:
      expenseName,

    category:
      formData.category || null,

    amount:
      Number(formData.amount || 0),

    notes:
      formData.notes || null
  };

  if (formData.expense_date) {
    expense.expense_date =
      formData.expense_date;
  }

  const { error } =
    await supabaseClient
      .from("expenses")
      .insert(expense);

  if (error) {
    showToast(
      "Xərc əlavə edilmədi: " +
      error.message
    );

    return false;
  }

  showToast(
    "Xərc əlavə edildi"
  );

  await loadExpenses();

  updateReports();

  return true;
}

async function editExpense(id) {
  const expense =
    expenses.find(
      e =>
        String(e.id) ===
        String(id)
    );

  if (!expense) {
    showToast(
      "Xərc tapılmadı."
    );

    return;
  }

  openModal(
    "Xərci redaktə et",
    "Xərc məlumatlarını dəyişdirin.",
    `
      <form
        id="editExpenseForm"
        class="form-grid">

        <div class="form-group">

          <label>Xərc adı</label>

          <input
            name="name"
            value="${escapeHTML(
              expense.name ||
              expense.title ||
              ""
            )}"
            required>

        </div>

        <div class="form-group">

          <label>Kateqoriya</label>

          <select
            name="category">

            <option
              ${
                expense.category === "İcarə"
                  ? "selected"
                  : ""
              }>
              İcarə
            </option>

            <option
              ${
                expense.category === "Kommunal"
                  ? "selected"
                  : ""
              }>
              Kommunal
            </option>

            <option
              ${
                expense.category === "Nəqliyyat"
                  ? "selected"
                  : ""
              }>
              Nəqliyyat
            </option>

            <option
              ${
                expense.category === "Əmək haqqı"
                  ? "selected"
                  : ""
              }>
              Əmək haqqı
            </option>

            <option
              ${
                expense.category === "Digər"
                  ? "selected"
                  : ""
              }>
              Digər
            </option>

          </select>

        </div>

        <div class="form-group">

          <label>Məbləğ</label>

          <input
            type="number"
            step="0.01"
            name="amount"
            value="${Number(
              expense.amount || 0
            )}"
            required>

        </div>

        <div class="form-group">

          <label>Tarix</label>

          <input
            type="date"
            name="expense_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              expense.expense_date ||
              expense.date ||
              (
                expense.created_at
                  ? new Date(
                      expense.created_at
                    )
                    .toISOString()
                    .split("T")[0]
                  : ""
              )
            }">

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1">

          <label>Qeyd</label>

          <textarea
            name="notes"
          >${escapeHTML(
            expense.notes || ""
          )}</textarea>

        </div>

        <div
          style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn">

            Dəyişikliyi yadda saxla

          </button>

        </div>

      </form>
    `
  );

  $("editExpenseForm")
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

        const expenseName =
          (
            data.name ||
            ""
          ).trim();

        const updateData = {
          title:
            expenseName,

          name:
            expenseName,

          category:
            data.category,

          amount:
            Number(
              data.amount || 0
            ),

          notes:
            data.notes || null
        };

        if (data.expense_date) {
          updateData.expense_date =
            data.expense_date;
        }

        const { error } =
          await supabaseClient
            .from("expenses")
            .update(updateData)
            .eq("id", id);

        if (error) {
          showToast(
            "Xərc yenilənmədi: " +
            error.message
          );

          return;
        }

        closeModal();

        showToast(
          "Xərc yeniləndi"
        );

        await loadExpenses();

        updateReports();
      }
    );
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
    showToast(
      "Xərc silinmədi: " +
      error.message
    );

    return;
  }

  showToast(
    "Xərc silindi"
  );

  await loadExpenses();

  updateReports();
}

/*
=========================================================
   DASHBOARD
=========================================================
*/

function updateDashboard() {
  const activeProducts =
    products.filter(
      p =>
        p.status !== "sold" &&
        Number(p.stock ?? 1) > 0
    );

  const inventoryValue =
    activeProducts.reduce(
      (sum, product) =>
        sum +
        getProductPurchase(product) *
        Number(product.stock ?? 1),
      0
    );

  const now = new Date();

  const monthlySales =
    sales.filter(sale => {
      const date =
        new Date(
          getSaleDate(sale)
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
      (sum, sale) =>
        sum +
        getSaleAmount(sale),
      0
    );

  const monthlyProfit =
    monthlySales.reduce(
      (sum, sale) =>
        sum +
        getSaleProfit(sale),
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

/*
=========================================================
   INVENTORY
=========================================================
*/

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
        getProductPurchase(p) *
        Number(p.stock ?? 1),
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

/*
=========================================================
   REPORTS
=========================================================
*/

function getDateOnly(dateValue) {
  if (!dateValue)
    return null;

  const date =
    new Date(dateValue);

  if (isNaN(date.getTime()))
    return null;

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function startOfWeek(date) {
  const result =
    new Date(date);

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + diff
  );

  result.setHours(
    0, 0, 0, 0
  );

  return result;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

function isInReportPeriod(
  dateValue,
  period
) {
  const date =
    getDateOnly(dateValue);

  if (!date)
    return false;

  const now =
    new Date();

  const today =
    getDateOnly(now);

  if (period === "daily") {
    return isSameDay(
      date,
      today
    );
  }

  if (period === "weekly") {
    const weekStart =
      startOfWeek(today);

    const weekEnd =
      new Date(weekStart);

    weekEnd.setDate(
      weekEnd.getDate() + 6
    );

    return (
      date >= weekStart &&
      date <= weekEnd
    );
  }

  if (period === "monthly") {
    return (
      date.getMonth() ===
        now.getMonth() &&
      date.getFullYear() ===
        now.getFullYear()
    );
  }

  if (period === "yearly") {
    return (
      date.getFullYear() ===
      now.getFullYear()
    );
  }

  return true;
}

function updateReports() {
  const periodSelect =
    $("reportPeriod");

  const period =
    periodSelect?.value ||
    "monthly";

  const filteredSales =
    sales.filter(
      sale =>
        isInReportPeriod(
          getSaleDate(sale),
          period
        )
    );

  const filteredExpenses =
    expenses.filter(
      expense =>
        isInReportPeriod(
          getExpenseDate(expense),
          period
        )
    );

  const revenue =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        getSaleAmount(sale),
      0
    );

  const cost =
    filteredSales.reduce(
      (sum, sale) =>
        sum +
        getSalePurchase(sale),
      0
    );

  const grossProfit =
    revenue - cost;

  const expenseTotal =
    filteredExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
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
      filteredSales.length;

  if ($("reportCost"))
    $("reportCost").textContent =
      money(cost);

  if ($("reportGrossProfit"))
    $("reportGrossProfit").textContent =
      money(grossProfit);

  if ($("reportNetProfit"))
    $("reportNetProfit").textContent =
      money(netProfit);

  if ($("reportAverageSale")) {
    const average =
      filteredSales.length
        ? revenue /
          filteredSales.length
        : 0;

    $("reportAverageSale")
      .textContent =
      money(average);
  }

  const categoryReport =
    $("categoryReport");

  if (categoryReport) {
    const categoryMap = {};

    filteredSales.forEach(sale => {
      const product =
        getSaleProduct(sale);

      const category =
        product?.category ||
        "Digər";

      if (!categoryMap[category]) {
        categoryMap[category] = {
          count: 0,
          revenue: 0,
          profit: 0
        };
      }

      categoryMap[category].count++;

      categoryMap[category].revenue +=
        getSaleAmount(sale);

      categoryMap[category].profit +=
        getSaleProfit(sale);
    });

    const entries =
      Object.entries(
        categoryMap
      );

    if (!entries.length) {
      categoryReport.innerHTML =
        `
          <div class="empty-state">
            Seçilmiş dövrdə məlumat yoxdur
          </div>
        `;
    } else {
      categoryReport.innerHTML =
        entries.map(
          ([category, info]) => `
            <div class="stock-row">

              <span>

                <strong>
                  ${escapeHTML(
                    category
                  )}
                </strong>

                <small>
                  ${info.count} satış
                </small>

              </span>

              <strong>
                ${money(
                  info.revenue
                )}
              </strong>

            </div>
          `
        ).join("");
    }
  }

  const reportChart =
    $("reportChart");

  if (reportChart) {
    reportChart.innerHTML = `
      <div class="report-summary">

        <div>
          <span>Satış gəliri</span>
          <strong>
            ${money(revenue)}
          </strong>
        </div>

        <div>
          <span>Maya dəyəri</span>
          <strong>
            ${money(cost)}
          </strong>
        </div>

        <div>
          <span>Brüt mənfəət</span>
          <strong>
            ${money(grossProfit)}
          </strong>
        </div>

        <div>
          <span>Xərclər</span>
          <strong>
            ${money(expenseTotal)}
          </strong>
        </div>

        <div>
          <span>Xalis mənfəət</span>
          <strong>
            ${money(netProfit)}
          </strong>
        </div>

      </div>
    `;
  }

  const reportSalesTable =
    $("reportSalesTable");

  if (reportSalesTable) {
    if (!filteredSales.length) {
      reportSalesTable.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="empty-state">

            Bu dövrdə satış yoxdur

          </td>
        </tr>
      `;
    } else {
      reportSalesTable.innerHTML =
        filteredSales.map(sale => {
          const product =
            getSaleProduct(sale);

          const customer =
            getSaleCustomer(sale);

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
                  customer
                    ? getCustomerName(customer)
                    : sale.customer_name ||
                      "-"
                )}
              </td>

              <td>
                ${money(
                  getSalePurchase(sale)
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    getSaleAmount(sale)
                  )}
                </strong>
              </td>

              <td>
                ${money(
                  getSaleProfit(sale)
                )}
              </td>

              <td>
                ${
                  getSaleDate(sale)
                    ? new Date(
                        getSaleDate(sale)
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
  }
}

/*
=========================================================
   MODAL
=========================================================
*/

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
    $("modalBody").innerHTML =
      "";
}

/*
=========================================================
   PRODUCT MODAL
=========================================================
*/

function openProductModal() {
  openModal(
    "Yeni məhsul",
    "Məhsul məlumatlarını daxil edin.",
    `
      <form
        id="productModalForm"
        class="form-grid">

        <div class="form-group">

          <label>Məhsul adı</label>

          <input
            name="name"
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
            name="purchase_price"
            required>

        </div>

        <div class="form-group">

          <label>Satış qiyməti</label>

          <input
            type="number"
            step="0.01"
            name="sale_price"
            required>

        </div>

        <div class="form-group">

          <label>Stok</label>

          <input
            type="number"
            min="1"
            value="1"
            name="stock"
            required>

        </div>

        <div class="form-group">

          <label>Tarix</label>

          <input
            type="date"
            name="product_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              new Date()
                .toISOString()
                .split("T")[0]
            }"
            required>

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1">

          <label>Qeyd</label>

          <textarea
            name="notes"></textarea>

        </div>

        <div
          style="grid-column:1/-1">

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

/*
=========================================================
   CUSTOMER MODAL
=========================================================
*/

function openCustomerModal() {
  openModal(
    "Yeni müştəri",
    "Müştəri məlumatlarını daxil edin.",
    `
      <form
        id="customerModalForm"
        class="form-grid">

        <div class="form-group">

          <label>Ad Soyad</label>

          <input
            name="name"
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

          <textarea
            name="notes"></textarea>

        </div>

        <div
          style="grid-column:1/-1">

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

/*
=========================================================
   SALE MODAL
=========================================================
*/

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
        class="form-grid">

        <div class="form-group">

          <label>Məhsul</label>

          <select
            name="product_id"
            id="saleProductSelect"
            required>

            <option value="">
              Məhsul seçin
            </option>

            ${availableProducts.map(p => `
              <option value="${p.id}">

                ${escapeHTML(
                  p.name ||
                  p.model ||
                  "Məhsul"
                )}

                — ${money(
                  getProductSale(p)
                )}

              </option>
            `).join("")}

          </select>

        </div>

        <div class="form-group">

          <label>Müştəri</label>

          <select
            name="customer_id"
            required>

            <option value="">
              Müştəri seçin
            </option>

            ${customers.map(c => `
              <option value="${c.id}">

                ${escapeHTML(
                  getCustomerName(c)
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
            required>

        </div>

        <div class="form-group">

          <label>Satış tarixi</label>

          <input
            type="date"
            name="sale_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              new Date()
                .toISOString()
                .split("T")[0]
            }"
            required>

        </div>

        <div class="form-group">

          <label>Ödəniş üsulu</label>

          <select
            name="payment_method">

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

          <textarea
            name="notes"></textarea>

        </div>

        <div
          style="grid-column:1/-1">

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
          getProductSale(product);
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

/*
=========================================================
   EXPENSE MODAL
=========================================================
*/

function openExpenseModal() {
  openModal(
    "Yeni xərc",
    "Xərc məlumatlarını daxil edin.",
    `
      <form
        id="expenseModalForm"
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
            name="amount"
            required>

        </div>

        <div class="form-group">

          <label>Xərc tarixi</label>

          <input
            type="date"
            name="expense_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              new Date()
                .toISOString()
                .split("T")[0]
            }"
            required>

        </div>

        <div
          class="form-group"
          style="grid-column:1/-1">

          <label>Qeyd</label>

          <input name="notes">

        </div>

        <div
          style="grid-column:1/-1">

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

/*
=========================================================
   REPORT FILTER
=========================================================
*/

function createReportFilterIfMissing() {
  const reportsPage =
    $("reportsPage");

  if (!reportsPage)
    return;

  if ($("reportPeriod"))
    return;

  const toolbar =
    reportsPage.querySelector(
      ".page-toolbar"
    );

  if (!toolbar)
    return;

  const filter =
    document.createElement("div");

  filter.className =
    "report-period-control";

  filter.innerHTML = `
    <label
      style="
        display:block;
        margin-bottom:6px;
        font-weight:600;
      ">

      Hesabat dövrü

    </label>

    <select
      id="reportPeriod"
      style="
        padding:10px 14px;
        border-radius:10px;
        border:1px solid #ddd;
      ">

      <option value="daily">
        Bugün
      </option>

      <option value="weekly">
        Bu həftə
      </option>

      <option
        value="monthly"
        selected>

        Bu ay

      </option>

      <option value="yearly">
        Bu il
      </option>

    </select>
  `;

  toolbar.appendChild(filter);

  $("reportPeriod")
    ?.addEventListener(
      "change",
      updateReports
    );
}

/*
=========================================================
   SEARCH
=========================================================
*/

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
}

/*
=========================================================
   MODAL EVENTS
=========================================================
*/

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

/*
=========================================================
   BUTTONS
=========================================================
*/

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

      showToast(
        "Hesabatlar yeniləndi"
      );
    }
  );

/*
=========================================================
   INITIAL
=========================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    openPage("dashboard");

    createReportFilterIfMissing();

    setupSearch();

    await checkSession();
  }
);

/*
=========================================================
   GLOBAL FUNCTIONS
=========================================================
*/

window.openPage =
  openPage;

window.deleteProduct =
  deleteProduct;

window.editExpense =
  editExpense;

window.deleteExpense =
  deleteExpense;

window.editCustomer =
  editCustomer;

window.deleteCustomer =
  deleteCustomer;

window.editSale =
  editSale;

window.deleteSale =
  deleteSale;
```
