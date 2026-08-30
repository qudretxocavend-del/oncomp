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
