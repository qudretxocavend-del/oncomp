/* =========================================================
   ONCOMP — ELEKTRON UÇOT SİSTEMİ
   PREMIUM VERSION
   Supabase + Vanilla JS
   ========================================================= */

const SUPABASE_URL =
  "https://frnbduzaiuitpxgvvzwq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

/* =========================================================
   ELEMENTS
   ========================================================= */

const loginPage = document.getElementById("loginPage");
const appPage = document.getElementById("appPage");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

let products = [];
let customers = [];
let sales = [];
let expenses = [];

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

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

function todayISO() {
  const d = new Date();

  const year = d.getFullYear();
  const month =
    String(d.getMonth() + 1).padStart(2, "0");
  const day =
    String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

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

loginForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      $("loginEmail")?.value.trim();

    const password =
      $("loginPassword")?.value;

    if (!email || !password) {

      showMessage(
        "E-poçt və şifrə daxil edin."
      );

      return;
    }

    const button =
      loginForm.querySelector("button");

    if (button) {
      button.disabled = true;
      button.textContent = "Daxil olunur...";
    }

    showMessage("");

    const {
      data,
      error
    } =
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

    if (data?.session) {

      showApp();

      showMessage(
        "Uğurla daxil oldunuz.",
        "success"
      );

      await loadAll();
    }

  }
);

logoutBtn?.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

    showLogin();

    loginForm?.reset();

  }
);

/*
  Vacib:
  Burada artıq loadDashboard() çağırmırıq.
  Supabase auth callback daxilində başqa Supabase
  sorğularını gözlətmirik.
*/

supabaseClient.auth.onAuthStateChange(
  (_event, session) => {

    if (session) {
      showApp();
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

  contentPages.forEach(page => {
    page.classList.remove("active-page");
  });

  navItems.forEach(item => {
    item.classList.remove("active");
  });

  const targetPage =
    document.getElementById(
      `${pageName}Page`
    );

  const targetNav =
    document.querySelector(
      `.nav-item[data-page="${pageName}"]`
    );

  targetPage?.classList.add(
    "active-page"
  );

  targetNav?.classList.add("active");

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      pageTitles[pageName] ||
      pageName;
  }

  if (pageName === "reports") {
    updateReports();
  }

  if (pageName === "inventory") {
    updateInventory();
  }

}

navItems.forEach(item => {

  item.addEventListener(
    "click",
    () => {

      const page =
        item.dataset.page;

      if (page) {
        openPage(page);
      }

    }
  );

});

document
  .querySelectorAll("[data-page-action]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.pageAction;

        if (page) {
          openPage(page);
        }

      }
    );

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

  const {
    data,
    error
  } =
    await supabaseClient
      .from("products")
      .select("*")
      .order(
        "product_date",
        { ascending: false }
      );

  if (error) {

    console.error(
      "Products:",
      error
    );

    products = [];

  } else {

    products = data || [];

  }

  renderProducts();
  populateProductCategoryFilter();

}

function renderProducts() {

  const table =
    $("productsTable");

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
        Number(
          product.stock ?? 1
        );

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

    ${categories.map(c => `
      <option value="${escapeHTML(c)}">
        ${escapeHTML(c)}
      </option>
    `).join("")}
  `;

}

async function addProduct(formData) {

  const product = {

    name:
      formData.name,

    brand:
      formData.brand || null,

    model:
      formData.model || null,

    category:
      formData.category || null,

    imei:
      formData.imei || null,

    purchase_price:
      Number(
        formData.purchase_price || 0
      ),

    sale_price:
      Number(
        formData.sale_price || 0
      ),

    stock:
      Number(
        formData.stock || 1
      ),

    status:
      "active",

    notes:
      formData.notes || null,

    product_date:
      formData.product_date ||
      todayISO()

  };

  const {
    error
  } =
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
    "Məhsul uğurla əlavə edildi."
  );

  await loadProducts();
  updateDashboard();

  return true;
}

async function deleteProduct(id) {

  if (
    !confirm(
      "Bu məhsulu silmək istəyirsiniz?"
    )
  ) return;

  const {
    error
  } =
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
    "Məhsul silindi."
  );

  await loadProducts();

  updateDashboard();
  updateInventory();

}

/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("customers")
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {

    console.error(error);

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
        `${customer.first_name || ""} ${
          customer.last_name || ""
        }`.trim();

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                name || "Müştəri"
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
                  ).toLocaleDateString(
                    "az-AZ"
                  )
                : "-"
            }
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

  /*
    full_name mütləq göndərilir.
    Səndə əvvəlki xəta məhz buna görə çıxırdı.
  */

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

  const {
    error
  } =
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
    "Müştəri uğurla əlavə edildi."
  );

  await loadCustomers();

  return true;
}

/* =========================================================
   SALES
   ========================================================= */

async function loadSales() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("sales")
      .select("*")
      .order(
        "sale_date",
        { ascending: false }
      );

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
          salePrice - purchase
        );

      const saleNumber =
        sale.sale_number ||
        `SAT-${String(
          sales.length - index
        ).padStart(4, "0")}`;

      const date =
        sale.sale_date ||
        sale.created_at;

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
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              customer?.full_name ||
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
              sale.payment ||
              "Nağd"
            )}
          </td>

          <td>
            ${
              date
                ? new Date(
                    date
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

      const date =
        sale.sale_date ||
        sale.created_at;

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
              customer?.full_name ||
              customer?.name ||
              sale.customer_name ||
              "-"
            )}
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
            ${
              date
                ? new Date(
                    date
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

  const customer =
    customers.find(
      c =>
        String(c.id) ===
        String(customerId)
    );

  if (!product) {

    showToast(
      "Məhsul tapılmadı."
    );

    return false;
  }

  if (!customer) {

    showToast(
      "Müştəri tapılmadı."
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
      formData.sale_date ||
      todayISO(),

    notes:
      formData.notes ||
      null

  };

  const {
    error
  } =
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
    Məhsulu satılmış kimi qeyd et
  */

  const {
    error: productError
  } =
    await supabaseClient
      .from("products")
      .update({
        stock: 0,
        status: "sold"
      })
      .eq("id", productId);

  if (productError) {

    console.error(
      "Məhsul statusu:",
      productError
    );

  }

  showToast(
    "Satış uğurla tamamlandı."
  );

  await loadAll();

  return true;
}

/* =========================================================
   EXPENSES
   ========================================================= */

async function loadExpenses() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("expenses")
      .select("*")
      .order(
        "expense_date",
        { ascending: false }
      );

  if (error) {

    console.error(error);

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

      const date =
        expense.expense_date ||
        expense.created_at;

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
                  ).toLocaleDateString(
                    "az-AZ"
                  )
                : "-"
            }
          </td>

          <td>
            ${escapeHTML(
              expense.notes ||
              "-"
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
      formData.title,

    category:
      formData.category ||
      null,

    amount:
      Number(
        formData.amount || 0
      ),

    expense_date:
      formData.expense_date ||
      todayISO(),

    notes:
      formData.notes ||
      null

  };

  const {
    error
  } =
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
        Number(p.stock ?? 1) > 0
    );

  const inventoryValue =
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

  const now =
    new Date();

  const monthlySales =
    sales.filter(s => {

      const date =
        new Date(
          s.sale_date ||
          s.created_at
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

  const profit =
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
          p.status === "sold"
      ).length;

  if ($("stockCritical"))
    $("stockCritical").textContent =
      available.filter(
        p =>
          Number(
            p.stock ?? 1
          ) <= 1
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
        Number(
          p.stock ?? 1
        ) <= 1
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
   REPORTS
   ========================================================= */

function updateReports() {

  const revenue =
    sales.reduce(
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

  const expenseTotal =
    expenses.reduce(
      (sum, e) =>
        sum +
        Number(
          e.amount || 0
        ),
      0
    );

  const grossProfit =
    sales.reduce(
      (sum, s) =>
        sum +
        Number(
          s.profit || 0
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
      sales.length;

  renderCategoryReport();

}

/* =========================================================
   CATEGORY REPORT
   ========================================================= */

function renderCategoryReport() {

  const container =
    $("categoryReport");

  if (!container) return;

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

    container.innerHTML =
      "Məlumat yoxdur";

    return;
  }

  container.innerHTML =
    entries.map(
      ([category, count]) => `

        <div class="stock-row">

          <span>
            ${escapeHTML(
              category
            )}
          </span>

          <strong>
            ${count}
          </strong>

        </div>

      `
    ).join("");

}

/* =========================================================
   DATE REPORT SYSTEM
   ========================================================= */

function getDate(value) {

  if (!value) return null;

  const d =
    new Date(
      value + (
        value.length === 10
          ? "T00:00:00"
          : ""
      )
    );

  return isNaN(d)
    ? null
    : d;

}

function isSameDay(date, target) {

  return (
    date.getFullYear() ===
      target.getFullYear() &&
    date.getMonth() ===
      target.getMonth() &&
    date.getDate() ===
      target.getDate()
  );

}

function isSameMonth(date, target) {

  return (
    date.getFullYear() ===
      target.getFullYear() &&
    date.getMonth() ===
      target.getMonth()
  );

}

function isSameYear(date, target) {

  return (
    date.getFullYear() ===
      target.getFullYear()
  );

}

function getWeekStart(date) {

  const d =
    new Date(date);

  const day =
    d.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  d.setDate(
    d.getDate() + diff
  );

  d.setHours(
    0, 0, 0, 0
  );

  return d;

}

function isSameWeek(date, target) {

  const start =
    getWeekStart(target);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  return (
    date >= start &&
    date < end
  );

}

/* =========================================================
   DATE REPORT SELECTOR
   ========================================================= */

function getReportData(period) {

  const target =
    new Date();

  let filteredSales = [];
  let filteredExpenses = [];

  if (period === "daily") {

    filteredSales =
      sales.filter(s => {

        const d =
          getDate(
            s.sale_date ||
            s.created_at
          );

        return d &&
          isSameDay(
            d,
            target
          );

      });

    filteredExpenses =
      expenses.filter(e => {

        const d =
          getDate(
            e.expense_date ||
            e.created_at
          );

        return d &&
          isSameDay(
            d,
            target
          );

      });

  }

  else if (period === "weekly") {

    filteredSales =
      sales.filter(s => {

        const d =
          getDate(
            s.sale_date ||
            s.created_at
          );

        return d &&
          isSameWeek(
            d,
            target
          );

      });

    filteredExpenses =
      expenses.filter(e => {

        const d =
          getDate(
            e.expense_date ||
            e.created_at
          );

        return d &&
          isSameWeek(
            d,
            target
          );

      });

  }

  else if (period === "monthly") {

    filteredSales =
      sales.filter(s => {

        const d =
          getDate(
            s.sale_date ||
            s.created_at
          );

        return d &&
          isSameMonth(
            d,
            target
          );

      });

    filteredExpenses =
      expenses.filter(e => {

        const d =
          getDate(
            e.expense_date ||
            e.created_at
          );

        return d &&
          isSameMonth(
            d,
            target
          );

      });

  }

  else if (period === "yearly") {

    filteredSales =
      sales.filter(s => {

        const d =
          getDate(
            s.sale_date ||
            s.created_at
          );

        return d &&
          isSameYear(
            d,
            target
          );

      });

    filteredExpenses =
      expenses.filter(e => {

        const d =
          getDate(
            e.expense_date ||
            e.created_at
          );

        return d &&
          isSameYear(
            d,
            target
          );

      });

  }

  const revenue =
    filteredSales.reduce(
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

  const grossProfit =
    filteredSales.reduce(
      (sum, s) =>
        sum +
        Number(
          s.profit || 0
        ),
      0
    );

  const expensesTotal =
    filteredExpenses.reduce(
      (sum, e) =>
        sum +
        Number(
          e.amount || 0
        ),
      0
    );

  return {

    sales:
      filteredSales,

    expenses:
      filteredExpenses,

    revenue,

    grossProfit,

    expensesTotal,

    netProfit:
      grossProfit -
      expensesTotal

  };

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
    "Məhsul məlumatlarını və uçot tarixini daxil edin.",
    `

      <form
        id="productModalForm"
        class="form-grid"
      >

        <div class="form-group">

          <label>
            Məhsul adı
          </label>

          <input
            name="name"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Marka
          </label>

          <input
            name="brand"
          >

        </div>

        <div class="form-group">

          <label>
            Model
          </label>

          <input
            name="model"
          >

        </div>

        <div class="form-group">

          <label>
            Kateqoriya
          </label>

          <select
            name="category"
          >

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

          <input
            name="imei"
          >

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
            min="2000-01-01"
            max="2100-12-31"
            value="${todayISO()}"
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
          await addProduct(
            data
          );

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
          await addCustomer(
            data
          );

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
    "Məhsul, müştəri, faktiki satış qiyməti və tarix seçin.",
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

                — Alış:
                ${money(
                  p.purchase_price
                )}

                — Satış:
                ${money(
                  p.sale_price
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

        <div class="form-group">

          <label>
            Satış tarixi
          </label>

          <input
            type="date"
            name="sale_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${todayISO()}"
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
          Number(
            product.sale_price ||
            product.selling_price ||
            0
          ).toFixed(2);

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
          await addSale(
            data
          );

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
    "Xərc məbləğini və tarixini daxil edin.",
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
            min="2000-01-01"
            max="2100-12-31"
            value="${todayISO()}"
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
          await addExpense(
            data
          );

        if (success) {
          closeModal();
        }

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
   MODAL EVENTS
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
   INITIAL
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    openPage(
      "dashboard"
    );

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
