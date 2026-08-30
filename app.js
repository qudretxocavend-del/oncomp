/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   Supabase + Frontend
   ========================================================= */

const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* =========================================================
   ELEMENTS
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

let currentUser = null;


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

function showToast(message) {
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function showLoginMessage(message, error = true) {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.style.color = error ? "#dc2626" : "#16a34a";
}

function hideModal() {
    modalOverlay?.classList.add("hidden");
}

function showModal(title, description, html) {
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    modalBody.innerHTML = html;
    modalOverlay.classList.remove("hidden");
}

closeModalBtn?.addEventListener("click", hideModal);

modalOverlay?.addEventListener("click", e => {
    if (e.target === modalOverlay) {
        hideModal();
    }
});


/* =========================================================
   AUTH
   ========================================================= */

async function checkSession() {
    const { data } = await db.auth.getSession();

    if (data.session) {
        currentUser = data.session.user;
        openApp();
    } else {
        openLogin();
    }
}

function openLogin() {
    loginPage?.classList.remove("hidden");
    appPage?.classList.add("hidden");
}

async function openApp() {
    loginPage?.classList.add("hidden");
    appPage?.classList.remove("hidden");

    if (currentUser) {
        const name =
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split("@")[0] ||
            "Admin";

        const adminName = document.getElementById("adminName");

        if (adminName) {
            adminName.textContent = name;
        }
    }

    await loadDashboard();
}

loginForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    showLoginMessage("Daxil olunur...", false);

    const { data, error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showLoginMessage("E-poçt və ya şifrə yanlışdır.");
        return;
    }

    currentUser = data.user;

    showLoginMessage("Uğurla daxil oldunuz.", false);

    await openApp();
});

logoutBtn?.addEventListener("click", async () => {
    await db.auth.signOut();

    currentUser = null;

    openLogin();
});


db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
});


/* =========================================================
   NAVIGATION
   ========================================================= */

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

async function navigate(page) {

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    contentPages.forEach(section => {
        section.classList.toggle(
            "active-page",
            section.id === `${page}Page`
        );
    });

    const title = document.getElementById("pageTitle");

    if (title) {
        title.textContent = pageTitles[page] || "ONCOMP";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    switch (page) {
        case "dashboard":
            await loadDashboard();
            break;

        case "products":
            await loadProducts();
            break;

        case "sales":
            await loadSales();
            break;

        case "customers":
            await loadCustomers();
            break;

        case "inventory":
            await loadInventory();
            break;

        case "expenses":
            await loadExpenses();
            break;

        case "reports":
            await loadReports();
            break;

        case "settings":
            await loadSettings();
            break;
    }
}

navItems.forEach(item => {
    item.addEventListener("click", () => {
        navigate(item.dataset.page);
    });
});

document.querySelectorAll("[data-page-action]").forEach(button => {
    button.addEventListener("click", () => {
        navigate(button.dataset.pageAction);
    });
});


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    const { data: products } = await db
        .from("products")
        .select("*");

    const { data: sales } = await db
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

    const productList = products || [];
    const saleList = sales || [];

    const activeProducts = productList.filter(
        p => p.status !== "sold"
    );

    const soldProducts = productList.filter(
        p => p.status === "sold"
    );

    const inventoryValue = activeProducts.reduce(
        (sum, p) =>
            sum +
            Number(p.purchase_price || 0) *
            Number(p.stock || 0),
        0
    );

    const now = new Date();

    const monthSales = saleList.filter(s => {
        const d = new Date(s.sale_date || s.created_at);

        return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
        );
    });

    const monthlyRevenue = monthSales.reduce(
        (sum, s) => sum + Number(s.total_amount || 0),
        0
    );

    const monthlyProfit = monthSales.reduce(
        (sum, s) => sum + Number(s.profit || 0),
        0
    );

    setText("statProducts", productList.length);
    setText("statInventory", money(inventoryValue));
    setText("statSales", money(monthlyRevenue));
    setText("statProfit", money(monthlyProfit));

    setText("stockAvailable",
        activeProducts.reduce(
            (sum, p) => sum + Number(p.stock || 0),
            0
        )
    );

    setText(
        "stockCritical",
        activeProducts.filter(
            p => Number(p.stock || 0) <= 1
        ).length
    );

    setText("stockSold", soldProducts.length);

    renderRecentSales(saleList.slice(0, 8));

    renderSalesChart(monthSales);
}

function renderRecentSales(sales) {

    const table = document.getElementById("recentSalesTable");

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

    table.innerHTML = sales.map(s => `
        <tr>
            <td>${escapeHTML(s.product_name || "—")}</td>
            <td>${escapeHTML(s.customer_name || "—")}</td>
            <td>${money(s.total_amount)}</td>
            <td>${escapeHTML(s.payment_method || "—")}</td>
            <td>${formatDate(s.sale_date || s.created_at)}</td>
        </tr>
    `).join("");
}

function renderSalesChart(sales) {

    const chart = document.getElementById("salesChart");

    if (!chart) return;

    if (!sales.length) {
        chart.innerHTML = `
            <div class="empty-chart">
                Satış məlumatları burada görünəcək
            </div>
        `;
        return;
    }

    const days = {};

    sales.forEach(s => {
        const date = s.sale_date || s.created_at;
        const key = date
            ? new Date(date).toLocaleDateString("az-AZ")
            : "—";

        days[key] =
            (days[key] || 0) +
            Number(s.total_amount || 0);
    });

    const max = Math.max(...Object.values(days), 1);

    chart.innerHTML = `
        <div style="
            display:flex;
            align-items:flex-end;
            gap:12px;
            height:220px;
            padding:20px;
        ">
            ${Object.entries(days).map(([day, amount]) => `
                <div style="
                    flex:1;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    gap:8px;
                ">
                    <strong style="font-size:11px;">
                        ${money(amount)}
                    </strong>

                    <div style="
                        width:100%;
                        max-width:50px;
                        height:${Math.max(
                            10,
                            (amount / max) * 150
                        )}px;
                        background:currentColor;
                        border-radius:8px 8px 0 0;
                        opacity:.8;
                    "></div>

                    <small>${day}</small>
                </div>
            `).join("")}
        </div>
    `;
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    const { data, error } = await db
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        showToast("Məhsullar yüklənmədi.");
        return;
    }

    renderProducts(data || []);
}

function renderProducts(products) {

    const table = document.getElementById("productsTable");

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

    table.innerHTML = products.map(p => `
        <tr>
            <td>
                <strong>
                    ${escapeHTML(
                        [p.brand, p.model, p.name]
                        .filter(Boolean)
                        .join(" ")
                    )}
                </strong>
            </td>

            <td>${escapeHTML(p.category || "—")}</td>

            <td>
                ${escapeHTML(
                    p.imei ||
                    p.serial_number ||
                    "—"
                )}
            </td>

            <td>${money(p.purchase_price)}</td>

            <td>${money(p.sale_price)}</td>

            <td>${Number(p.stock || 0)}</td>

            <td>
                <span class="status-badge">
                    ${p.status === "sold" ? "Satılıb" : "Aktiv"}
                </span>
            </td>

            <td>
                <button
                    class="text-btn"
                    onclick="editProduct(${p.id})">
                    Redaktə
                </button>

                <button
                    class="text-btn"
                    onclick="deleteProduct(${p.id})">
                    Sil
                </button>
            </td>
        </tr>
    `).join("");
}


/* =========================================================
   ADD PRODUCT
   ========================================================= */

document.getElementById("addProductBtn")
    ?.addEventListener("click", showProductModal);

function showProductModal(product = null) {

    const isEdit = Boolean(product);

    showModal(
        isEdit ? "Məhsulu redaktə et" : "Yeni məhsul",
        isEdit
            ? "Məhsul məlumatlarını dəyişdirin."
            : "Yeni notebook və ya planşet əlavə edin.",

        `
        <form id="productForm" class="form-grid">

            <div class="form-group">
                <label>Məhsul adı</label>
                <input id="pName"
                    value="${escapeHTML(product?.name || "")}"
                    required>
            </div>

            <div class="form-group">
                <label>Marka</label>
                <input id="pBrand"
                    value="${escapeHTML(product?.brand || "")}">
            </div>

            <div class="form-group">
                <label>Model</label>
                <input id="pModel"
                    value="${escapeHTML(product?.model || "")}">
            </div>

            <div class="form-group">
                <label>Kateqoriya</label>
                <select id="pCategory">
                    <option value="">Seçin</option>
                    <option value="Notebook"
                        ${product?.category === "Notebook" ? "selected" : ""}>
                        Notebook
                    </option>
                    <option value="Planşet"
                        ${product?.category === "Planşet" ? "selected" : ""}>
                        Planşet
                    </option>
                </select>
            </div>

            <div class="form-group">
                <label>Seriya nömrəsi</label>
                <input id="pSerial"
                    value="${escapeHTML(product?.serial_number || "")}">
            </div>

            <div class="form-group">
                <label>IMEI</label>
                <input id="pImei"
                    value="${escapeHTML(product?.imei || "")}">
            </div>

            <div class="form-group">
                <label>Alış qiyməti</label>
                <input id="pPurchase"
                    type="number"
                    step="0.01"
                    value="${product?.purchase_price || 0}">
            </div>

            <div class="form-group">
                <label>Satış qiyməti</label>
                <input id="pSale"
                    type="number"
                    step="0.01"
                    value="${product?.sale_price || 0}">
            </div>

            <div class="form-group">
                <label>Stok</label>
                <input id="pStock"
                    type="number"
                    min="0"
                    value="${product?.stock ?? 1}">
            </div>

            <div class="form-group">
                <label>Vəziyyət</label>
                <select id="pCondition">
                    <option value="used"
                        ${product?.condition === "used" ? "selected" : ""}>
                        İşlənmiş
                    </option>
                    <option value="new"
                        ${product?.condition === "new" ? "selected" : ""}>
                        Yeni
                    </option>
                </select>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
                <label>Qeyd</label>
                <textarea id="pNotes"
                    rows="4">${escapeHTML(product?.notes || "")}</textarea>
            </div>

            <div style="grid-column:1/-1;">
                <button class="primary-btn" type="submit">
                    ${isEdit ? "Yadda saxla" : "Məhsulu əlavə et"}
                </button>
            </div>

        </form>
        `
    );

    document.getElementById("productForm")
        ?.addEventListener("submit", async e => {

            e.preventDefault();

            const payload = {
                name: document.getElementById("pName").value.trim(),
                brand: document.getElementById("pBrand").value.trim(),
                model: document.getElementById("pModel").value.trim(),
                category: document.getElementById("pCategory").value,
                serial_number:
                    document.getElementById("pSerial").value.trim(),
                imei:
                    document.getElementById("pImei").value.trim(),
                purchase_price:
                    Number(document.getElementById("pPurchase").value || 0),
                sale_price:
                    Number(document.getElementById("pSale").value || 0),
                stock:
                    Number(document.getElementById("pStock").value || 0),
                condition:
                    document.getElementById("pCondition").value,
                notes:
                    document.getElementById("pNotes").value.trim(),
                status:
                    product?.status || "active"
            };

            let result;

            if (isEdit) {
                result = await db
                    .from("products")
                    .update(payload)
                    .eq("id", product.id);
            } else {
                result = await db
                    .from("products")
                    .insert(payload);
            }

            if (result.error) {
                showToast(
                    "Məhsul əlavə edilmədi: " +
                    result.error.message
                );
                return;
            }

            hideModal();
            showToast(
                isEdit
                    ? "Məhsul yeniləndi."
                    : "Məhsul əlavə edildi."
            );

            await loadProducts();
            await loadDashboard();
        });
}


/* =========================================================
   EDIT / DELETE PRODUCT
   ========================================================= */

window.editProduct = async function(id) {

    const { data, error } = await db
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        showToast("Məhsul tapılmadı.");
        return;
    }

    showProductModal(data);
};


window.deleteProduct = async function(id) {

    if (!confirm("Bu məhsulu silmək istəyirsiniz?")) {
        return;
    }

    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);

    if (error) {
        showToast("Məhsul silinmədi.");
        return;
    }

    showToast("Məhsul silindi.");

    await loadProducts();
    await loadDashboard();
};


/* =========================================================
   PRODUCT SEARCH
   ========================================================= */

document.getElementById("productSearch")
    ?.addEventListener("input", async e => {

        const q = e.target.value.trim();

        let query = db
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (q) {
            query = query.or(
                `name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,imei.ilike.%${q}%,serial_number.ilike.%${q}%`
            );
        }

        const { data } = await query;

        renderProducts(data || []);
    });


/* =========================================================
   CUSTOMERS
   ========================================================= */

async function loadCustomers() {

    const { data, error } = await db
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        showToast("Müştərilər yüklənmədi.");
        return;
    }

    renderCustomers(data || []);
}

function renderCustomers(customers) {

    const table = document.getElementById("customersTable");

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

    table.innerHTML = customers.map(c => `
        <tr>
            <td><strong>${escapeHTML(c.full_name)}</strong></td>
            <td>${escapeHTML(c.phone || "—")}</td>
            <td>${escapeHTML(c.email || "—")}</td>
            <td>${escapeHTML(c.address || "—")}</td>
            <td>${formatDate(c.created_at)}</td>
            <td>
                <button
                    class="text-btn"
                    onclick="deleteCustomer(${c.id})">
                    Sil
                </button>
            </td>
        </tr>
    `).join("");
}


document.getElementById("addCustomerBtn")
    ?.addEventListener("click", showCustomerModal);


function showCustomerModal() {

    showModal(
        "Yeni müştəri",
        "Müştəri məlumatlarını daxil edin.",

        `
        <form id="customerForm" class="form-grid">

            <div class="form-group">
                <label>Ad Soyad</label>
                <input id="cName" required>
            </div>

            <div class="form-group">
                <label>Telefon</label>
                <input id="cPhone">
            </div>

            <div class="form-group">
                <label>E-poçt</label>
                <input id="cEmail" type="email">
            </div>

            <div class="form-group">
                <label>Ünvan</label>
                <input id="cAddress">
            </div>

            <div class="form-group"
                 style="grid-column:1/-1;">
                <label>Qeyd</label>
                <textarea id="cNotes" rows="4"></textarea>
            </div>

            <div style="grid-column:1/-1;">
                <button class="primary-btn" type="submit">
                    Müştərini əlavə et
                </button>
            </div>

        </form>
        `
    );

    document.getElementById("customerForm")
        ?.addEventListener("submit", async e => {

            e.preventDefault();

            const payload = {
                full_name:
                    document.getElementById("cName").value.trim(),
                phone:
                    document.getElementById("cPhone").value.trim(),
                email:
                    document.getElementById("cEmail").value.trim(),
                address:
                    document.getElementById("cAddress").value.trim(),
                notes:
                    document.getElementById("cNotes").value.trim()
            };

            const { error } = await db
                .from("customers")
                .insert(payload);

            if (error) {
                showToast(
                    "Müştəri əlavə edilmədi: " +
                    error.message
                );
                return;
            }

            hideModal();
            showToast("Müştəri əlavə edildi.");

            await loadCustomers();
        });
}


window.deleteCustomer = async function(id) {

    if (!confirm("Bu müştərini silmək istəyirsiniz?")) {
        return;
    }

    const { error } = await db
        .from("customers")
        .delete()
        .eq("id", id);

    if (error) {
        showToast("Müştəri silinmədi.");
        return;
    }

    showToast("Müştəri silindi.");

    await loadCustomers();
};


/* =========================================================
   SALES
   ========================================================= */

async function loadSales() {

    const { data, error } = await db
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        showToast("Satışlar yüklənmədi.");
        return;
    }

    renderSales(data || []);
}

function renderSales(sales) {

    const table = document.getElementById("salesTable");

    if (!table) return;

    if (!sales.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Hələ satış yoxdur
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = sales.map(s => `
        <tr>
            <td>${escapeHTML(s.sale_number || "—")}</td>
            <td>${escapeHTML(s.customer_name || "—")}</td>
            <td>${money(s.total_amount)}</td>
            <td>${money(s.profit)}</td>
            <td>${escapeHTML(s.payment_method || "—")}</td>
            <td>${formatDate(s.sale_date || s.created_at)}</td>
        </tr>
    `).join("");
}


document.getElementById("newSaleBtn")
    ?.addEventListener("click", showSaleModal);


async function showSaleModal() {

    const { data: products } = await db
        .from("products")
        .select("*")
        .eq("status", "active")
        .gt("stock", 0)
        .order("created_at", { ascending: false });

    const { data: customers } = await db
        .from("customers")
        .select("*")
        .order("full_name");

    const productOptions = (products || []).map(p => `
        <option value="${p.id}">
            ${escapeHTML(
                [p.brand, p.model, p.name]
                .filter(Boolean)
                .join(" ")
            )}
            — ${money(p.sale_price)}
        </option>
    `).join("");

    const customerOptions = (customers || []).map(c => `
        <option value="${c.id}">
            ${escapeHTML(c.full_name)}
        </option>
    `).join("");

    showModal(
        "Yeni satış",
        "Satış məlumatlarını daxil edin.",

        `
        <form id="saleForm" class="form-grid">

            <div class="form-group"
                 style="grid-column:1/-1;">
                <label>Məhsul</label>

                <select id="saleProduct" required>
                    <option value="">
                        Məhsul seçin
                    </option>
                    ${productOptions}
                </select>
            </div>

            <div class="form-group"
                 style="grid-column:1/-1;">
                <label>Müştəri</label>

                <select id="saleCustomer" required>
                    <option value="">
                        Müştəri seçin
                    </option>
                    ${customerOptions}
                </select>
            </div>

            <div class="form-group">
                <label>Miqdar</label>
                <input
                    id="saleQuantity"
                    type="number"
                    min="1"
                    value="1"
                    required>
            </div>

            <div class="form-group">
                <label>Ödəniş üsulu</label>

                <select id="salePayment">
                    <option value="cash">
                        Nağd
                    </option>
                    <option value="card">
                        Kart
                    </option>
                    <option value="transfer">
                        Bank köçürməsi
                    </option>
                </select>
            </div>

            <div class="form-group"
                 style="grid-column:1/-1;">
                <label>Qeyd</label>
                <textarea id="saleNotes" rows="3"></textarea>
            </div>

            <div style="grid-column:1/-1;">
                <button class="primary-btn" type="submit">
                    Satışı tamamla
                </button>
            </div>

        </form>
        `
    );

    document.getElementById("saleForm")
        ?.addEventListener("submit", async e => {

            e.preventDefault();

            const productId =
                Number(document.getElementById("saleProduct").value);

            const customerId =
                Number(document.getElementById("saleCustomer").value);

            const quantity =
                Number(document.getElementById("saleQuantity").value);

            const payment =
                document.getElementById("salePayment").value;

            const notes =
                document.getElementById("saleNotes").value.trim();

            const product =
                (products || []).find(p => p.id === productId);

            const customer =
                (customers || []).find(c => c.id === customerId);

            if (!product || !customer) {
                showToast("Məhsul və müştəri seçilməlidir.");
                return;
            }

            if (quantity > Number(product.stock || 0)) {
                showToast("Anbarda kifayət qədər məhsul yoxdur.");
                return;
            }

            const total =
                Number(product.sale_price || 0) * quantity;

            const profit =
                (
                    Number(product.sale_price || 0) -
                    Number(product.purchase_price || 0)
                ) * quantity;

            const saleNumber =
                "ON-" +
                Date.now().toString().slice(-8);

            const salePayload = {
                sale_number: saleNumber,
                product_id: product.id,
                product_name:
                    [product.brand, product.model, product.name]
                    .filter(Boolean)
                    .join(" "),
                customer_id: customer.id,
                customer_name: customer.full_name,
                quantity,
                purchase_price:
                    Number(product.purchase_price || 0),
                sale_price:
                    Number(product.sale_price || 0),
                total_amount: total,
                profit,
                payment_method: payment,
                sale_date:
                    new Date().toISOString().slice(0, 10),
                notes
            };

            const { error: saleError } =
                await db
                    .from("sales")
                    .insert(salePayload);

            if (saleError) {
                showToast(
                    "Satış yaradılmadı: " +
                    saleError.message
                );
                return;
            }

            const newStock =
                Number(product.stock || 0) - quantity;

            const { error: productError } =
                await db
                    .from("products")
                    .update({
                        stock: newStock,
                        status:
                            newStock <= 0
                                ? "sold"
                                : "active"
                    })
                    .eq("id", product.id);

            if (productError) {
                showToast(
                    "Satış yaradıldı, lakin stok yenilənmədi."
                );
                return;
            }

            hideModal();

            showToast("Satış uğurla tamamlandı.");

            await loadSales();
            await loadDashboard();
        });
}


/* =========================================================
   INVENTORY
   ========================================================= */

async function loadInventory() {

    const { data } = await db
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

    const products = data || [];

    const available = products.reduce(
        (sum, p) => sum + Number(p.stock || 0),
        0
    );

    const critical = products.filter(
        p =>
            p.status !== "sold" &&
            Number(p.stock || 0) <= 1
    ).length;

    const sold = products.filter(
        p => p.status === "sold"
    ).length;

    const value = products.reduce(
        (sum, p) =>
            sum +
            Number(p.purchase_price || 0) *
            Number(p.stock || 0),
        0
    );

    setText("inventoryAvailable", available);
    setText("inventoryCritical", critical);
    setText("inventorySold", sold);
    setText("inventoryValue", money(value));

    const list = document.getElementById("inventoryList");

    if (!list) return;

    const availableProducts =
        products.filter(p => Number(p.stock || 0) > 0);

    if (!availableProducts.length) {
        list.innerHTML = `
            <div class="empty-state">
                Anbarda məhsul yoxdur
            </div>
        `;
        return;
    }

    list.innerHTML = availableProducts.map(p => `
        <div class="stock-row">
            <span>
                ${escapeHTML(
                    [p.brand, p.model, p.name]
                    .filter(Boolean)
                    .join(" ")
                )}
            </span>

            <strong>
                ${Number(p.stock || 0)} ədəd
            </strong>
        </div>
    `).join("");
}


/* =========================================================
   EXPENSES
   ========================================================= */

async function loadExpenses() {

    const { data, error } = await db
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

    if (error) {
        showToast("Xərclər yüklənmədi.");
        return;
    }

    renderExpenses(data || []);
}

function renderExpenses(expenses) {

    const table =
        document.getElementById("expensesTable");

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

    table.innerHTML = expenses.map(e => `
        <tr>
            <td>${escapeHTML(e.title)}</td>
            <td>${escapeHTML(e.category || "—")}</td>
            <td>${money(e.amount)}</td>
            <td>${formatDate(e.expense_date)}</td>
            <td>${escapeHTML(e.notes || "—")}</td>
            <td>
                <button
                    class="text-btn"
                    onclick="deleteExpense(${e.id})">
                    Sil
                </button>
            </td>
        </tr>
    `).join("");
}


document.getElementById("addExpenseBtn")
    ?.addEventListener("click", showExpenseModal);


function showExpenseModal() {

    showModal(
        "Yeni xərc",
        "Xərc məlumatlarını daxil edin.",

        `
        <form id="expenseForm" class="form-grid">

            <div class="form-group">
                <label>Xərc adı</label>
                <input id="eTitle" required>
            </div>

            <div class="form-group">
                <label>Kateqoriya</label>
                <input id="eCategory"
                    placeholder="Məsələn: Nəqliyyat">
            </div>

            <div class="form-group">
                <label>Məbləğ</label>
                <input
                    id="eAmount"
                    type="number"
                    step="0.01"
                    required>
            </div>

            <div class="form-group">
                <label>Tarix</label>
                <input
                    id="eDate"
                    type="date"
                    value="${new Date()
                        .toISOString()
                        .slice(0,10)}">
            </div>

            <div class="form-group"
                 style="grid-column:1/-1;">
                <label>Qeyd</label>
                <textarea id="eNotes" rows="3"></textarea>
            </div>

            <div style="grid-column:1/-1;">
                <button class="primary-btn" type="submit">
                    Xərci əlavə et
                </button>
            </div>

        </form>
        `
    );

    document.getElementById("expenseForm")
        ?.addEventListener("submit", async e => {

            e.preventDefault();

            const payload = {
                title:
                    document.getElementById("eTitle").value.trim(),

                category:
                    document.getElementById("eCategory").value.trim(),

                amount:
                    Number(
                        document.getElementById("eAmount").value || 0
                    ),

                expense_date:
                    document.getElementById("eDate").value,

                notes:
                    document.getElementById("eNotes").value.trim()
            };

            const { error } =
                await db
                    .from("expenses")
                    .insert(payload);

            if (error) {
                showToast(
                    "Xərc əlavə edilmədi: " +
                    error.message
                );
                return;
            }

            hideModal();

            showToast("Xərc əlavə edildi.");

            await loadExpenses();
            await loadReports();
        });
}


window.deleteExpense = async function(id) {

    if (!confirm("Bu xərci silmək istəyirsiniz?")) {
        return;
    }

    const { error } =
        await db
            .from("expenses")
            .delete()
            .eq("id", id);

    if (error) {
        showToast("Xərc silinmədi.");
        return;
    }

    showToast("Xərc silindi.");

    await loadExpenses();
    await loadReports();
};


/* =========================================================
   REPORTS
   ========================================================= */

async function loadReports() {

    const { data: sales } =
        await db
            .from("sales")
            .select("*");

    const { data: expenses } =
        await db
            .from("expenses")
            .select("*");

    const saleList = sales || [];
    const expenseList = expenses || [];

    const revenue = saleList.reduce(
        (sum, s) =>
            sum + Number(s.total_amount || 0),
        0
    );

    const expenseTotal = expenseList.reduce(
        (sum, e) =>
            sum + Number(e.amount || 0),
        0
    );

    const grossProfit = saleList.reduce(
        (sum, s) =>
            sum + Number(s.profit || 0),
        0
    );

    const netProfit =
        grossProfit - expenseTotal;

    setText("reportRevenue", money(revenue));
    setText("reportExpenses", money(expenseTotal));
    setText("reportProfit", money(netProfit));
    setText("reportSalesCount", saleList.length);

    renderReportChart(saleList);
    renderCategoryReport();
}

function renderReportChart(sales) {

    const chart =
        document.getElementById("reportChart");

    if (!chart) return;

    if (!sales.length) {
        chart.innerHTML = `
            <div class="empty-chart">
                Hesabat üçün məlumat yoxdur
            </div>
        `;
        return;
    }

    const months = {};

    sales.forEach(s => {

        const date =
            new Date(s.sale_date || s.created_at);

        const key =
            date.toLocaleDateString("az-AZ", {
                month: "short",
                year: "numeric"
            });

        months[key] =
            (months[key] || 0) +
            Number(s.total_amount || 0);
    });

    chart.innerHTML = `
        <div style="
            display:flex;
            flex-direction:column;
            gap:12px;
            padding:20px;
        ">
            ${Object.entries(months).map(
                ([month, amount]) => `
                    <div>
                        <div style="
                            display:flex;
                            justify-content:space-between;
                            margin-bottom:5px;
                        ">
                            <span>${month}</span>
                            <strong>${money(amount)}</strong>
                        </div>

                        <div style="
                            height:10px;
                            background:rgba(0,0,0,.08);
                            border-radius:10px;
                            overflow:hidden;
                        ">
                            <div style="
                                width:${Math.min(
                                    100,
                                    Math.max(
                                        5,
                                        amount /
                                        Math.max(
                                            ...Object.values(months)
                                        ) * 100
                                    )
                                )}%;
                                height:100%;
                                background:currentColor;
                                border-radius:10px;
                            "></div>
                        </div>
                    </div>
                `
            ).join("")}
        </div>
    `;
}

async function renderCategoryReport() {

    const container =
        document.getElementById("categoryReport");

    if (!container) return;

    const { data } =
        await db
            .from("products")
            .select("category");

    const categories = {};

    (data || []).forEach(p => {

        const category =
            p.category || "Digər";

        categories[category] =
            (categories[category] || 0) + 1;
    });

    if (!Object.keys(categories).length) {
        container.textContent = "Məlumat yoxdur";
        return;
    }

    container.innerHTML =
        Object.entries(categories).map(
            ([category, count]) => `
                <div class="stock-row">
                    <span>${escapeHTML(category)}</span>
                    <strong>${count}</strong>
                </div>
            `
        ).join("");
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettings() {

    const { data } =
        await db
            .from("settings")
            .select("*")
            .limit(1)
            .maybeSingle();

    if (!data) return;

    setValue("companyName", data.company_name);
    setValue("companyEmail", data.company_email);
    setValue("companyPhone", data.company_phone);
    setValue("companyAddress", data.company_address);
}


document.getElementById("saveSettingsBtn")
    ?.addEventListener("click", async () => {

        const payload = {
            company_name:
                document.getElementById("companyName").value.trim(),

            company_email:
                document.getElementById("companyEmail").value.trim(),

            company_phone:
                document.getElementById("companyPhone").value.trim(),

            company_address:
                document.getElementById("companyAddress").value.trim(),

            updated_at:
                new Date().toISOString()
        };

        const { data: existing } =
            await db
                .from("settings")
                .select("id")
                .limit(1)
                .maybeSingle();

        let result;

        if (existing?.id) {
            result = await db
                .from("settings")
                .update(payload)
                .eq("id", existing.id);
        } else {
            result = await db
                .from("settings")
                .insert(payload);
        }

        if (result.error) {
            showToast(
                "Parametrlər yadda saxlanmadı."
            );
            return;
        }

        showToast("Parametrlər yadda saxlanıldı.");
    });


/* =========================================================
   REFRESH REPORTS
   ========================================================= */

document.getElementById("refreshReportsBtn")
    ?.addEventListener("click", async () => {

        await loadReports();

        showToast("Hesabatlar yeniləndi.");
    });


/* =========================================================
   CUSTOMER SEARCH
   ========================================================= */

document.getElementById("customerSearch")
    ?.addEventListener("input", async e => {

        const q = e.target.value.trim();

        let query = db
            .from("customers")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (q) {
            query = query.or(
                `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
            );
        }

        const { data } = await query;

        renderCustomers(data || []);
    });


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

document.getElementById("productCategoryFilter")
    ?.addEventListener("change", async e => {

        const category = e.target.value;

        let query = db
            .from("products")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (category) {
            query = query.eq("category", category);
        }

        const { data } = await query;

        renderProducts(data || []);
    });


/* =========================================================
   STATUS FILTER
   ========================================================= */

document.getElementById("productStatusFilter")
    ?.addEventListener("change", async e => {

        const status = e.target.value;

        let query = db
            .from("products")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (status) {
            query = query.eq("status", status);
        }

        const { data } = await query;

        renderProducts(data || []);
    });


/* =========================================================
   UTILITIES
   ========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (element && value !== null && value !== undefined) {
        element.value = value;
    }
}

function formatDate(value) {

    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("az-AZ");
}


/* =========================================================
   START
   ========================================================= */

checkSession();
