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
/* =========================================================
   ONCOMP — PREMIUM REPORT SYSTEM + EXPENSE EDIT/DELETE
   AUTH HİSSƏSİNƏ TOXUNMUR
   ========================================================= */

(function () {

  /* =======================================================
     DATE HELPERS
     ======================================================= */

  function reportDate(value) {
    if (!value) return null;

    const d = new Date(
      value.length === 10
        ? value + "T00:00:00"
        : value
    );

    return isNaN(d.getTime()) ? null : d;
  }

  function reportDateText(value) {
    const d = reportDate(value);

    if (!d) return "-";

    return d.toLocaleDateString("az-AZ");
  }

  function reportMoney(value) {
    return Number(value || 0).toLocaleString("az-AZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " ₼";
  }

  function reportToday() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  /* =======================================================
     EXPENSE EDIT
     ======================================================= */

  window.editExpense = function (id) {

    const expense = expenses.find(
      e => String(e.id) === String(id)
    );

    if (!expense) {
      showToast("Xərc tapılmadı.");
      return;
    }

    openModal(
      "Xərci redaktə et",
      "Xərc məlumatlarını dəyişdirin və yadda saxlayın.",
      `
        <form id="editExpenseForm" class="form-grid">

          <div class="form-group">
            <label>Xərc adı</label>
            <input
              name="name"
              value="${escapeHTML(
                expense.name ||
                expense.title ||
                ""
              )}"
              required
            >
          </div>

          <div class="form-group">
            <label>Kateqoriya</label>

            <select name="category">

              <option value="İcarə"
                ${expense.category === "İcarə" ? "selected" : ""}>
                İcarə
              </option>

              <option value="Kommunal"
                ${expense.category === "Kommunal" ? "selected" : ""}>
                Kommunal
              </option>

              <option value="Nəqliyyat"
                ${expense.category === "Nəqliyyat" ? "selected" : ""}>
                Nəqliyyat
              </option>

              <option value="Əmək haqqı"
                ${expense.category === "Əmək haqqı" ? "selected" : ""}>
                Əmək haqqı
              </option>

              <option value="Digər"
                ${expense.category === "Digər" ? "selected" : ""}>
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
              value="${Number(
                expense.amount || 0
              ).toFixed(2)}"
              required
            >
          </div>

          <div class="form-group">
            <label>Xərc tarixi</label>

            <input
              type="date"
              name="expense_date"
              min="2000-01-01"
              max="2100-12-31"
              value="${
                expense.expense_date ||
                reportToday()
              }"
              required
            >
          </div>

          <div
            class="form-group"
            style="grid-column:1/-1"
          >
            <label>Qeyd</label>

            <textarea name="notes">${
              escapeHTML(
                expense.notes || ""
              )
            }</textarea>
          </div>

          <div
            style="
              grid-column:1/-1;
              display:flex;
              gap:10px;
              justify-content:flex-end;
            "
          >

            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Ləğv et
            </button>

            <button
              type="submit"
              class="primary-btn"
            >
              Dəyişiklikləri yadda saxla
            </button>

          </div>

        </form>
      `
    );

    $("editExpenseForm")?.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const data = Object.fromEntries(
          new FormData(event.target).entries()
        );

        const {
          error
        } = await supabaseClient
          .from("expenses")
          .update({
            name: data.name,
            category: data.category || null,
            amount: Number(data.amount || 0),
            expense_date:
              data.expense_date || reportToday(),
            notes: data.notes || null
          })
          .eq("id", id);

        if (error) {

          console.error(error);

          showToast(
            "Xərc yenilənmədi: " +
            error.message
          );

          return;
        }

        showToast(
          "Xərc uğurla yeniləndi."
        );

        closeModal();

        await loadExpenses();

        updateDashboard();

        updateReports();
      }
    );
  };

  /* =======================================================
     EXPENSE DELETE
     ======================================================= */

  window.deleteExpense = async function (id) {

    const expense = expenses.find(
      e => String(e.id) === String(id)
    );

    if (!expense) {
      showToast("Xərc tapılmadı.");
      return;
    }

    const name =
      expense.name ||
      expense.title ||
      "bu xərc";

    const ok = confirm(
      `"${name}" xərcini silmək istəyirsiniz?`
    );

    if (!ok) return;

    const {
      error
    } = await supabaseClient
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {

      console.error(error);

      showToast(
        "Xərc silinmədi: " +
        error.message
      );

      return;
    }

    showToast(
      "Xərc uğurla silindi."
    );

    await loadExpenses();

    updateDashboard();

    updateReports();
  };

  /* =======================================================
     PREMIUM EXPENSE TABLE
     ======================================================= */

  window.renderExpenses = function () {

    const table = $("expensesTable");

    if (!table) return;

    if (!expenses.length) {

      table.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            Hələ heç bir xərc əlavə edilməyib
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML = expenses.map(expense => {

      const date =
        expense.expense_date ||
        expense.created_at;

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                expense.name ||
                expense.title ||
                "Xərc"
              )}
            </strong>
          </td>

          <td>
            <span class="status-badge">
              ${escapeHTML(
                expense.category ||
                "Digər"
              )}
            </span>
          </td>

          <td>
            <strong>
              ${reportMoney(
                expense.amount
              )}
            </strong>
          </td>

          <td>
            ${reportDateText(date)}
          </td>

          <td>
            ${escapeHTML(
              expense.notes ||
              "-"
            )}
          </td>

          <td>
            <div
              style="
                display:flex;
                gap:8px;
                align-items:center;
              "
            >

              <button
                type="button"
                class="text-btn"
                onclick="editExpense('${expense.id}')"
              >
                Redaktə
              </button>

              <button
                type="button"
                class="text-btn"
                onclick="deleteExpense('${expense.id}')"
              >
                Sil
              </button>

            </div>
          </td>

        </tr>
      `;

    }).join("");
  };

  /* =======================================================
     PREMIUM REPORT PAGE
     ======================================================= */

  function createPremiumReports() {

    const page = $("reportsPage");

    if (!page) return;

    page.innerHTML = `
      <div class="premium-report-wrapper">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:20px;
            margin-bottom:24px;
            flex-wrap:wrap;
          "
        >

          <div>
            <h2 style="margin:0 0 6px;">
              Maliyyə hesabatları
            </h2>

            <p style="margin:0;opacity:.65;">
              OnComp üzrə satış, xərc və mənfəət analitikası
            </p>
          </div>

          <button
            type="button"
            class="primary-btn"
            id="printReportBtn"
          >
            Hesabatı çap et
          </button>

        </div>


        <!-- PERIOD -->

        <div
          class="report-filter-card"
          style="
            padding:20px;
            margin-bottom:24px;
            border-radius:16px;
          "
        >

          <div
            style="
              display:grid;
              grid-template-columns:
                repeat(auto-fit,minmax(170px,1fr));
              gap:15px;
              align-items:end;
            "
          >

            <div class="form-group">

              <label>
                Hesabat dövrü
              </label>

              <select id="reportPeriod">

                <option value="daily">
                  Gündəlik
                </option>

                <option value="weekly">
                  Həftəlik
                </option>

                <option
                  value="monthly"
                  selected
                >
                  Aylıq
                </option>

                <option value="yearly">
                  İllik
                </option>

                <option value="custom">
                  Xüsusi tarix
                </option>

              </select>

            </div>


            <div
              class="form-group"
              id="reportStartGroup"
              style="display:none;"
            >

              <label>
                Başlanğıc tarixi
              </label>

              <input
                type="date"
                id="reportStartDate"
                min="2000-01-01"
                max="2100-12-31"
              >

            </div>


            <div
              class="form-group"
              id="reportEndGroup"
              style="display:none;"
            >

              <label>
                Son tarix
              </label>

              <input
                type="date"
                id="reportEndDate"
                min="2000-01-01"
                max="2100-12-31"
              >

            </div>


            <div class="form-group">

              <label>
                İl
              </label>

              <select id="reportYear">
                ${Array.from(
                  { length: 101 },
                  (_, i) => {
                    const year = 2000 + i;
                    return `
                      <option value="${year}">
                        ${year}
                      </option>
                    `;
                  }
                ).join("")}
              </select>

            </div>


            <div
              class="form-group"
              id="reportMonthGroup"
            >

              <label>
                Ay
              </label>

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

            </div>

          </div>

        </div>


        <!-- SUMMARY -->

        <div
          id="reportSummaryCards"
          style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(190px,1fr));
            gap:16px;
            margin-bottom:28px;
          "
        ></div>


        <!-- TABLE -->

        <div
          class="report-table-card"
          style="
            padding:20px;
            border-radius:16px;
            margin-bottom:24px;
          "
        >

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              margin-bottom:18px;
            "
          >

            <div>
              <h3 style="margin:0;">
                Əməliyyat hesabatı
              </h3>

              <small
                id="reportPeriodText"
                style="opacity:.6;"
              ></small>
            </div>

          </div>

          <div style="overflow-x:auto;">

            <table
              style="
                width:100%;
                border-collapse:collapse;
              "
            >

              <thead>

                <tr>

                  <th>Tarix</th>
                  <th>Növ</th>
                  <th>Əməliyyat</th>
                  <th>Məbləğ</th>
                  <th>Mənfəət</th>
                  <th>Kateqoriya</th>

                </tr>

              </thead>

              <tbody id="premiumReportTable">

              </tbody>

            </table>

          </div>

        </div>


        <!-- ANALYTICS -->

        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(auto-fit,minmax(280px,1fr));
            gap:20px;
          "
        >

          <div
            class="report-table-card"
            style="
              padding:20px;
              border-radius:16px;
            "
          >

            <h3>
              Kateqoriya üzrə satış
            </h3>

            <div id="reportCategorySales"></div>

          </div>


          <div
            class="report-table-card"
            style="
              padding:20px;
              border-radius:16px;
            "
          >

            <h3>
              Ödəniş üsulları
            </h3>

            <div id="reportPaymentSales"></div>

          </div>


          <div
            class="report-table-card"
            style="
              padding:20px;
              border-radius:16px;
            "
          >

            <h3>
              Xərclər üzrə kateqoriyalar
            </h3>

            <div id="reportExpenseCategories"></div>

          </div>

        </div>

      </div>
    `;

    const now = new Date();

    $("reportYear").value =
      String(now.getFullYear());

    $("reportMonth").value =
      String(now.getMonth());

    $("reportStartDate").value =
      `${now.getFullYear()}-01-01`;

    $("reportEndDate").value =
      reportToday();


    $("reportPeriod")?.addEventListener(
      "change",
      function () {

        const custom =
          this.value === "custom";

        $("reportStartGroup").style.display =
          custom ? "" : "none";

        $("reportEndGroup").style.display =
          custom ? "" : "none";

        $("reportYear").parentElement.style.display =
          custom ? "none" : "";

        $("reportMonthGroup").style.display =
          (
            this.value === "monthly"
            || this.value === "daily"
            || this.value === "weekly"
          )
            ? ""
            : "none";

        updatePremiumReports();
      }
    );


    $("reportYear")?.addEventListener(
      "change",
      updatePremiumReports
    );

    $("reportMonth")?.addEventListener(
      "change",
      updatePremiumReports
    );

    $("reportStartDate")?.addEventListener(
      "change",
      updatePremiumReports
    );

    $("reportEndDate")?.addEventListener(
      "change",
      updatePremiumReports
    );


    $("printReportBtn")?.addEventListener(
      "click",
      () => {

        window.print();

      }
    );

    updatePremiumReports();
  }


  /* =======================================================
     GET REPORT RANGE
     ======================================================= */

  function getPremiumReportRange() {

    const period =
      $("reportPeriod")?.value ||
      "monthly";

    const now = new Date();

    let start;
    let end;

    if (period === "daily") {

      const year =
        Number(
          $("reportYear")?.value ||
          now.getFullYear()
        );

      const month =
        Number(
          $("reportMonth")?.value ??
          now.getMonth()
        );

      const day =
        now.getDate();

      start = new Date(
        year,
        month,
        day
      );

      end = new Date(
        year,
        month,
        day + 1
      );

    }

    else if (period === "weekly") {

      start =
        getWeekStartPremium(now);

      end =
        new Date(start);

      end.setDate(
        end.getDate() + 7
      );

    }

    else if (period === "monthly") {

      const year =
        Number(
          $("reportYear")?.value ||
          now.getFullYear()
        );

      const month =
        Number(
          $("reportMonth")?.value ??
          now.getMonth()
        );

      start = new Date(
        year,
        month,
        1
      );

      end = new Date(
        year,
        month + 1,
        1
      );

    }

    else if (period === "yearly") {

      const year =
        Number(
          $("reportYear")?.value ||
          now.getFullYear()
        );

      start = new Date(
        year,
        0,
        1
      );

      end = new Date(
        year + 1,
        0,
        1
      );

    }

    else {

      const startValue =
        $("reportStartDate")?.value;

      const endValue =
        $("reportEndDate")?.value;

      start =
        reportDate(
          startValue
        ) ||
        new Date(2000, 0, 1);

      end =
        reportDate(
          endValue
        ) ||
        new Date(2100, 11, 31);

      end.setDate(
        end.getDate() + 1
      );

    }

    return {
      start,
      end,
      period
    };
  }


  function getWeekStartPremium(date) {

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
      0,
      0,
      0,
      0
    );

    return d;
  }


  /* =======================================================
     PREMIUM REPORT CALCULATION
     ======================================================= */

  window.updatePremiumReports = function () {

    if (!$("premiumReportTable")) {
      createPremiumReports();
      return;
    }

    const {
      start,
      end,
      period
    } = getPremiumReportRange();


    const filteredSales =
      sales.filter(sale => {

        const d =
          reportDate(
            sale.sale_date ||
            sale.created_at
          );

        return (
          d &&
          d >= start &&
          d < end
        );

      });


    const filteredExpenses =
      expenses.filter(expense => {

        const d =
          reportDate(
            expense.expense_date ||
            expense.created_at
          );

        return (
          d &&
          d >= start &&
          d < end
        );

      });


    /* SALES */

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


    const cost =
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.purchase_price ??
            getSaleProduct(sale)?.purchase_price ??
            0
          ),
        0
      );


    const grossProfit =
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.profit ??
            (
              Number(
                sale.sale_price ??
                sale.total_amount ??
                0
              ) -
              Number(
                sale.purchase_price ??
                getSaleProduct(sale)?.purchase_price ??
                0
              )
            )
          ),
        0
      );


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


    /* =====================================================
       CARDS
       ===================================================== */

    $("reportSummaryCards").innerHTML = `

      <div class="report-stat-card">
        <small>Satış gəliri</small>
        <strong>
          ${reportMoney(revenue)}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Alış maya dəyəri</small>
        <strong>
          ${reportMoney(cost)}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Ümumi mənfəət</small>
        <strong>
          ${reportMoney(grossProfit)}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Xərclər</small>
        <strong>
          ${reportMoney(expenseTotal)}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Xalis mənfəət</small>
        <strong>
          ${reportMoney(netProfit)}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Satış sayı</small>
        <strong>
          ${filteredSales.length}
        </strong>
      </div>

      <div class="report-stat-card">
        <small>Xərc sayı</small>
        <strong>
          ${filteredExpenses.length}
        </strong>
      </div>

    `;


    /* =====================================================
       PERIOD TEXT
       ===================================================== */

    let periodText = "";

    if (period === "daily") {
      periodText =
        "Bugünün hesabatı";
    }

    else if (period === "weekly") {
      periodText =
        "Cari həftənin hesabatı";
    }

    else if (period === "monthly") {
      periodText =
        "Seçilmiş ayın hesabatı";
    }

    else if (period === "yearly") {
      periodText =
        "Seçilmiş ilin hesabatı";
    }

    else {
      periodText =
        `${reportDateText(
          $("reportStartDate")?.value
        )} — ${reportDateText(
          $("reportEndDate")?.value
        )}`;
    }

    $("reportPeriodText").textContent =
      periodText;


    /* =====================================================
       OPERATION TABLE
       ===================================================== */

    const rows = [];

    filteredSales.forEach(sale => {

      const product =
        getSaleProduct(sale);

      const salePrice =
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        );

      const purchase =
        Number(
          sale.purchase_price ??
          product?.purchase_price ??
          0
        );

      const profit =
        Number(
          sale.profit ??
          salePrice - purchase
        );

      rows.push({

        date:
          sale.sale_date ||
          sale.created_at,

        type:
          "Satış",

        operation:
          product?.name ||
          sale.product_name ||
          "Məhsul",

        amount:
          salePrice,

        profit:
          profit,

        category:
          product?.category ||
          "Digər"

      });

    });


    filteredExpenses.forEach(expense => {

      rows.push({

        date:
          expense.expense_date ||
          expense.created_at,

        type:
          "Xərc",

        operation:
          expense.name ||
          expense.title ||
          "Xərc",

        amount:
          Number(
            expense.amount || 0
          ),

        profit:
          -Number(
            expense.amount || 0
          ),

        category:
          expense.category ||
          "Digər"

      });

    });


    rows.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


    if (!rows.length) {

      $("premiumReportTable").innerHTML = `
        <tr>
          <td
            colspan="6"
            class="empty-state"
          >
            Seçilmiş dövr üzrə məlumat yoxdur
          </td>
        </tr>
      `;

    }

    else {

      $("premiumReportTable").innerHTML =
        rows.map(row => `

          <tr>

            <td>
              ${reportDateText(
                row.date
              )}
            </td>

            <td>
              <span class="status-badge">
                ${row.type}
              </span>
            </td>

            <td>
              <strong>
                ${escapeHTML(
                  row.operation
                )}
              </strong>
            </td>

            <td>
              ${reportMoney(
                row.amount
              )}
            </td>

            <td>
              ${reportMoney(
                row.profit
              )}
            </td>

            <td>
              ${escapeHTML(
                row.category
              )}
            </td>

          </tr>

        `).join("");

    }


    /* =====================================================
       CATEGORY SALES
       ===================================================== */

    const categoryMap = {};

    filteredSales.forEach(sale => {

      const product =
        getSaleProduct(sale);

      const category =
        product?.category ||
        "Digər";

      const amount =
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        );

      if (!categoryMap[category]) {
        categoryMap[category] = {
          amount: 0,
          count: 0
        };
      }

      categoryMap[category].amount +=
        amount;

      categoryMap[category].count++;
    });


    const categoryEntries =
      Object.entries(
        categoryMap
      );


    if (!categoryEntries.length) {

      $("reportCategorySales").innerHTML =
        `<div class="empty-state">
          Məlumat yoxdur
        </div>`;

    }

    else {

      $("reportCategorySales").innerHTML =
        categoryEntries.map(
          ([category, data]) => `

            <div
              class="stock-row"
              style="
                display:flex;
                justify-content:space-between;
                padding:12px 0;
              "
            >

              <span>
                ${escapeHTML(
                  category
                )}

                <small>
                  (${data.count} satış)
                </small>
              </span>

              <strong>
                ${reportMoney(
                  data.amount
                )}
              </strong>

            </div>

          `
        ).join("");

    }


    /* =====================================================
       PAYMENT METHODS
       ===================================================== */

    const paymentMap = {};

    filteredSales.forEach(sale => {

      const payment =
        sale.payment_method ||
        sale.payment ||
        "Nağd";

      const amount =
        Number(
          sale.sale_price ??
          sale.total_amount ??
          sale.amount ??
          0
        );

      paymentMap[payment] =
        (paymentMap[payment] || 0) +
        amount;

    });


    const paymentEntries =
      Object.entries(
        paymentMap
      );


    if (!paymentEntries.length) {

      $("reportPaymentSales").innerHTML =
        `<div class="empty-state">
          Məlumat yoxdur
        </div>`;

    }

    else {

      $("reportPaymentSales").innerHTML =
        paymentEntries.map(
          ([payment, amount]) => `

            <div
              class="stock-row"
              style="
                display:flex;
                justify-content:space-between;
                padding:12px 0;
              "
            >

              <span>
                ${escapeHTML(
                  payment
                )}
              </span>

              <strong>
                ${reportMoney(
                  amount
                )}
              </strong>

            </div>

          `
        ).join("");

    }


    /* =====================================================
       EXPENSE CATEGORIES
       ===================================================== */

    const expenseMap = {};

    filteredExpenses.forEach(expense => {

      const category =
        expense.category ||
        "Digər";

      expenseMap[category] =
        (
          expenseMap[category] ||
          0
        ) +
        Number(
          expense.amount || 0
        );

    });


    const expenseEntries =
      Object.entries(
        expenseMap
      );


    if (!expenseEntries.length) {

      $("reportExpenseCategories").innerHTML =
        `<div class="empty-state">
          Xərc yoxdur
        </div>`;

    }

    else {

      $("reportExpenseCategories").innerHTML =
        expenseEntries.map(
          ([category, amount]) => `

            <div
              class="stock-row"
              style="
                display:flex;
                justify-content:space-between;
                padding:12px 0;
              "
            >

              <span>
                ${escapeHTML(
                  category
                )}
              </span>

              <strong>
                ${reportMoney(
                  amount
                )}
              </strong>

            </div>

          `
        ).join("");

    }

  };


  /* =======================================================
     OVERRIDE EXISTING REPORT FUNCTION
     ======================================================= */

  window.updateReports = function () {

    if (!$("reportsPage")) return;

    if (!$("premiumReportTable")) {
      createPremiumReports();
      return;
    }

    updatePremiumReports();

  };


  /* =======================================================
     INITIALIZE
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => {

        createPremiumReports();

      }
    );

  }

  else {

    createPremiumReports();

  }


})();
/* =========================================================
   CUSTOMER EDIT + DELETE
   ========================================================= */

async function editCustomer(id) {

  const customer = customers.find(
    c => String(c.id) === String(id)
  );

  if (!customer) {
    showToast("Müştəri tapılmadı.");
    return;
  }

  openModal(
    "Müştərini redaktə et",
    "Müştəri məlumatlarını yeniləyin.",
    `
      <form id="editCustomerForm" class="form-grid">

        <div class="form-group">
          <label>Ad Soyad</label>
          <input
            name="full_name"
            value="${escapeHTML(
              customer.full_name ||
              customer.name ||
              ""
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
          style="grid-column:1/-1"
        >
          <label>Qeyd</label>
          <textarea name="notes">${escapeHTML(
            customer.notes || ""
          )}</textarea>
        </div>

        <div style="grid-column:1/-1">
          <button
            type="submit"
            class="primary-btn"
          >
            Dəyişiklikləri yadda saxla
          </button>
        </div>

      </form>
    `
  );

  $("editCustomerForm")?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const data =
        Object.fromEntries(
          new FormData(event.target).entries()
        );

      if (!data.full_name?.trim()) {
        showToast("Ad Soyad boş ola bilməz.");
        return;
      }

      const { error } =
        await supabaseClient
          .from("customers")
          .update({
            full_name: data.full_name.trim(),
            name: data.full_name.trim(),
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null
          })
          .eq("id", id);

      if (error) {

        console.error(error);

        showToast(
          "Müştəri yenilənmədi: " +
          error.message
        );

        return;
      }

      showToast(
        "Müştəri məlumatları yeniləndi."
      );

      closeModal();

      await loadCustomers();

      renderSales();
      renderRecentSales();

    }
  );
}


async function deleteCustomer(id) {

  const customer =
    customers.find(
      c => String(c.id) === String(id)
    );

  if (!customer) return;

  const customerName =
    customer.full_name ||
    customer.name ||
    "bu müştəri";

  if (
    !confirm(
      `"${customerName}" müştərisini silmək istəyirsiniz?`
    )
  ) {
    return;
  }

  /* Əvvəl satışların olub-olmadığını yoxla */

  const relatedSales =
    sales.filter(
      s =>
        String(s.customer_id) ===
        String(id)
    );

  if (relatedSales.length) {

    showToast(
      "Bu müştərinin satış tarixçəsi var. Müştərini silmək mümkün deyil."
    );

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
    "Müştəri uğurla silindi."
  );

  await loadCustomers();

  updateDashboard();

}


/* =========================================================
   SALES EDIT + DELETE
   ========================================================= */

async function editSale(id) {

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

  const customer =
    getSaleCustomer(sale);

  const currentPrice =
    Number(
      sale.sale_price ??
      sale.total_amount ??
      sale.amount ??
      0
    );

  const purchasePrice =
    Number(
      sale.purchase_price ??
      product?.purchase_price ??
      0
    );

  openModal(
    "Satışı redaktə et",
    "Satış məlumatlarını yeniləyin.",
    `
      <form id="editSaleForm" class="form-grid">

        <div class="form-group">
          <label>Məhsul</label>
          <input
            value="${escapeHTML(
              product?.name ||
              sale.product_name ||
              "Məhsul"
            )}"
            disabled
          >
        </div>

        <div class="form-group">
          <label>Müştəri</label>
          <input
            value="${escapeHTML(
              customer?.full_name ||
              customer?.name ||
              sale.customer_name ||
              "Müştəri"
            )}"
            disabled
          >
        </div>

        <div class="form-group">
          <label>Alış qiyməti</label>
          <input
            value="${purchasePrice.toFixed(2)}"
            disabled
          >
        </div>

        <div class="form-group">
          <label>Yeni satış qiyməti</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="sale_price"
            value="${currentPrice.toFixed(2)}"
            required
          >
        </div>

        <div class="form-group">
          <label>Ödəniş üsulu</label>

          <select name="payment_method">

            <option value="Nağd"
              ${
                sale.payment_method === "Nağd"
                  ? "selected"
                  : ""
              }>
              Nağd
            </option>

            <option value="Kart"
              ${
                sale.payment_method === "Kart"
                  ? "selected"
                  : ""
              }>
              Kart
            </option>

            <option value="Köçürmə"
              ${
                sale.payment_method === "Köçürmə"
                  ? "selected"
                  : ""
              }>
              Köçürmə
            </option>

            <option value="Nisyə"
              ${
                sale.payment_method === "Nisyə"
                  ? "selected"
                  : ""
              }>
              Nisyə
            </option>

          </select>
        </div>

        <div class="form-group">
          <label>Satış tarixi</label>

          <input
            type="date"
            name="sale_date"
            min="2000-01-01"
            max="2100-12-31"
            value="${
              sale.sale_date
                ? String(sale.sale_date).slice(0, 10)
                : todayISO()
            }"
            required
          >
        </div>

        <div
          class="form-group"
          style="grid-column:1/-1"
        >
          <label>Qeyd</label>

          <textarea name="notes">${escapeHTML(
            sale.notes || ""
          )}</textarea>
        </div>

        <div style="grid-column:1/-1">

          <button
            type="submit"
            class="primary-btn"
          >
            Satışı yenilə
          </button>

        </div>

      </form>
    `
  );

  $("editSaleForm")?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const data =
        Object.fromEntries(
          new FormData(event.target).entries()
        );

      const newPrice =
        Number(data.sale_price || 0);

      if (newPrice <= 0) {
        showToast(
          "Satış qiyməti düzgün daxil edilməlidir."
        );
        return;
      }

      const newProfit =
        newPrice - purchasePrice;

      const { error } =
        await supabaseClient
          .from("sales")
          .update({

            sale_price:
              newPrice,

            total_amount:
              newPrice,

            amount:
              newPrice,

            profit:
              newProfit,

            payment_method:
              data.payment_method ||
              "Nağd",

            sale_date:
              data.sale_date ||
              todayISO(),

            notes:
              data.notes ||
              null

          })
          .eq("id", id);

      if (error) {

        console.error(error);

        showToast(
          "Satış yenilənmədi: " +
          error.message
        );

        return;
      }

      showToast(
        "Satış məlumatları yeniləndi."
      );

      closeModal();

      await loadSales();

      updateDashboard();
      updateReports();

    }
  );
}


async function deleteSale(id) {

  const sale =
    sales.find(
      s => String(s.id) === String(id)
    );

  if (!sale) return;

  if (
    !confirm(
      "Bu satışı silmək istəyirsiniz?"
    )
  ) {
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
    Satış silindikdən sonra məhsulu
    yenidən aktiv/anbarda göstəririk.
  */

  if (sale.product_id) {

    const { error: productError } =
      await supabaseClient
        .from("products")
        .update({
          status: "active",
          stock: 1
        })
        .eq("id", sale.product_id);

    if (productError) {

      console.error(
        "Məhsul statusu:",
        productError
      );

    }
  }

  showToast(
    "Satış uğurla silindi."
  );

  await loadAll();

}


/* =========================================================
   RENDER CUSTOMERS — EDIT / DELETE BUTTONS
   ========================================================= */

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

          <td>

            <button
              class="text-btn"
              onclick="editCustomer('${customer.id}')"
            >
              Redaktə
            </button>

            <button
              class="text-btn"
              onclick="deleteCustomer('${customer.id}')"
            >
              Sil
            </button>

          </td>

        </tr>
      `;

    }).join("");

}


/* =========================================================
   RENDER SALES — EDIT / DELETE BUTTONS
   ========================================================= */

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
      product?.purchase_price ??
      0
    );

    const salePrice = Number(
      sale.sale_price ??
      sale.total_amount ??
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

    const date =
      sale.sale_date ||
      sale.created_at;

    return `
      <tr>

        <td>
          <strong>
            ${escapeHTML(saleNumber)}
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
              ? new Date(date).toLocaleDateString("az-AZ")
              : "-"
          }
        </td>

      </tr>
    `;

  }).join("");

}

            <button
              class="text-btn"
              onclick="editSale('${sale.id}')"
            >
              Redaktə
            </button>

            <button
              class="text-btn"
              onclick="deleteSale('${sale.id}')"
            >
              Sil
            </button>

          </td>

        </tr>
      `;

    }).join("");

}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.editCustomer =
  editCustomer;

window.deleteCustomer =
  deleteCustomer;

window.editSale =
  editSale;

window.deleteSale =
  deleteSale;
