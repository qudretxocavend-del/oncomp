const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
};

const $ = (id) => document.getElementById(id);

function message(text, type = "info") {
    let box = $("oncomp-message");

    if (!box) {
        box = document.createElement("div");
        box.id = "oncomp-message";
        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "99999";
        box.style.padding = "14px 20px";
        box.style.borderRadius = "12px";
        box.style.fontWeight = "600";
        box.style.fontFamily = "Arial, sans-serif";
        box.style.boxShadow = "0 10px 30px rgba(0,0,0,.15)";
        document.body.appendChild(box);
    }

    box.textContent = text;

    if (type === "success") {
        box.style.background = "#ecfdf5";
        box.style.color = "#047857";
    } else if (type === "error") {
        box.style.background = "#fef2f2";
        box.style.color = "#b91c1c";
    } else {
        box.style.background = "#eff6ff";
        box.style.color = "#1d4ed8";
    }

    setTimeout(() => {
        if (box) box.remove();
    }, 3500);
}


/* ==========================================
   SUPABASE AUTH
========================================== */

async function login() {

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
        message("E-poçt və şifrəni daxil edin.", "error");
        return;
    }

    const button = $("loginBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Daxil olunur...";
    }

    try {

        const response = await fetch(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error_description ||
                data.msg ||
                "E-poçt və ya şifrə yanlışdır."
            );
        }

        localStorage.setItem(
            "oncomp_access_token",
            data.access_token
        );

        localStorage.setItem(
            "oncomp_refresh_token",
            data.refresh_token
        );

        localStorage.setItem(
            "oncomp_user",
            JSON.stringify(data.user)
        );

        message("Uğurla daxil oldunuz.", "success");

        setTimeout(() => {
            showDashboard(data.user);
        }, 500);

    } catch (error) {

        console.error(error);

        message(
            error.message || "Giriş zamanı xəta baş verdi.",
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "Daxil ol";
        }
    }
}


/* ==========================================
   DASHBOARD
========================================== */

function showDashboard(user) {

    const loginSection = $("loginSection");
    const dashboardSection = $("dashboardSection");

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (!dashboardSection) return;

    dashboardSection.style.display = "block";

    dashboardSection.innerHTML = `

        <div class="oncomp-dashboard">

            <header class="dashboard-header">

                <div class="brand-area">
                    <div class="brand-logo">OC</div>

                    <div>
                        <h1>ONCOMP</h1>
                        <span>Elektron Uçot Sistemi</span>
                    </div>
                </div>

                <div class="account-area">

                    <div class="account-info">
                        <strong>
                            ${escapeHTML(user?.email || "İstifadəçi")}
                        </strong>

                        <span>
                            Sistem istifadəçisi
                        </span>
                    </div>

                    <button id="logoutBtn">
                        Çıxış
                    </button>

                </div>

            </header>


            <main class="dashboard-main">

                <section class="hero-panel">

                    <span>ONCOMP MANAGEMENT</span>

                    <h2>
                        Elektron uçot panelinə xoş gəlmisiniz.
                    </h2>

                    <p>
                        2-ci əl notebook və planşet satışlarını,
                        müştəriləri, anbarı və maliyyə göstəricilərini
                        vahid sistemdən idarə edin.
                    </p>

                </section>


                <section class="statistics">

                    <div class="stat-card">
                        <small>Ümumi məhsul</small>
                        <strong id="totalProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <small>Aktiv məhsul</small>
                        <strong id="activeProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <small>Satış</small>
                        <strong id="soldProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <small>Ümumi gəlir</small>
                        <strong id="totalRevenue">0 ₼</strong>
                    </div>

                </section>


                <section class="modules">

                    <div class="section-heading">
                        <span>SİSTEM</span>
                        <h2>İdarəetmə bölmələri</h2>
                    </div>


                    <div class="module-grid">

                        <button class="module-card"
                            data-module="products">

                            <b>01</b>

                            <h3>Məhsullar</h3>

                            <p>
                                Notebook və planşet uçotu
                            </p>

                        </button>


                        <button class="module-card"
                            data-module="sales">

                            <b>02</b>

                            <h3>Satışlar</h3>

                            <p>
                                Satış əməliyyatlarının idarəsi
                            </p>

                        </button>


                        <button class="module-card"
                            data-module="customers">

                            <b>03</b>

                            <h3>Müştərilər</h3>

                            <p>
                                Müştəri məlumatları
                            </p>

                        </button>


                        <button class="module-card"
                            data-module="inventory">

                            <b>04</b>

                            <h3>Anbar</h3>

                            <p>
                                Məhsul qalığı və stok
                            </p>

                        </button>


                        <button class="module-card"
                            data-module="reports">

                            <b>05</b>

                            <h3>Hesabatlar</h3>

                            <p>
                                Satış və maliyyə hesabatları
                            </p>

                        </button>


                        <button class="module-card"
                            data-module="settings">

                            <b>06</b>

                            <h3>Ayarlar</h3>

                            <p>
                                Sistem parametrləri
                            </p>

                        </button>

                    </div>

                </section>

            </main>

        </div>
    `;


    $("logoutBtn")?.addEventListener(
        "click",
        logout
    );


    document
        .querySelectorAll(".module-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => openModule(card.dataset.module)
            );

        });


    loadStatistics();
}


/* ==========================================
   STATİSTİKA
========================================== */

async function loadStatistics() {

    const token =
        localStorage.getItem("oncomp_access_token");

    if (!token) return;

    const authHeaders = {
        ...headers,
        Authorization: `Bearer ${token}`
    };

    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/products?select=id,status,sale_price`,
            {
                headers: authHeaders
            }
        );

        if (!response.ok) {
            console.error(
                "Products query failed:",
                await response.text()
            );
            return;
        }

        const products = await response.json();

        const total = products.length;

        const active =
            products.filter(
                p => p.status === "active"
            ).length;

        const sold =
            products.filter(
                p => p.status === "sold"
            ).length;

        const revenue =
            products
                .filter(p => p.status === "sold")
                .reduce(
                    (sum, p) =>
                        sum + Number(p.sale_price || 0),
                    0
                );


        if ($("totalProducts"))
            $("totalProducts").textContent = total;

        if ($("activeProducts"))
            $("activeProducts").textContent = active;

        if ($("soldProducts"))
            $("soldProducts").textContent = sold;

        if ($("totalRevenue"))
            $("totalRevenue").textContent =
                `${revenue.toFixed(2)} ₼`;

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );
    }
}


/* ==========================================
   MODULLAR
========================================== */

function openModule(module) {

    const names = {
        products: "Məhsullar",
        sales: "Satışlar",
        customers: "Müştərilər",
        inventory: "Anbar",
        reports: "Hesabatlar",
        settings: "Ayarlar"
    };

    message(
        `${names[module] || "Bölmə"} — növbəti mərhələdə açılacaq.`,
        "info"
    );
}


/* ==========================================
   ÇIXIŞ
========================================== */

function logout() {

    localStorage.removeItem(
        "oncomp_access_token"
    );

    localStorage.removeItem(
        "oncomp_refresh_token"
    );

    localStorage.removeItem(
        "oncomp_user"
    );

    location.reload();
}


/* ==========================================
   SESSION
========================================== */

function restoreSession() {

    const token =
        localStorage.getItem("oncomp_access_token");

    const userData =
        localStorage.getItem("oncomp_user");

    if (!token || !userData) return;

    try {

        const user =
            JSON.parse(userData);

        showDashboard(user);

    } catch {

        logout();
    }
}


/* ==========================================
   HTML SECURITY
========================================== */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================
   EVENTS
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        $("loginBtn")?.addEventListener(
            "click",
            login
        );

        $("password")?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    login();
                }

            }
        );

        restoreSession();
    }
);
