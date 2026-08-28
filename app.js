/* =========================================================
   ONCOMP — Elektron Uçot Sistemi
   Supabase bağlantısı və əsas tətbiq məntiqi
   ========================================================= */

/* ---------- SUPABASE ---------- */

const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const supabaseHeaders = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
};


/* ---------- ELEMENTLƏR ---------- */

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginBtn");

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const connectionStatus = document.getElementById("connectionStatus");


/* ---------- KÖMƏKÇİ FUNKSİYALAR ---------- */

function showMessage(message, type = "info") {
    let box = document.getElementById("oncompMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "oncompMessage";

        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "9999";
        box.style.padding = "14px 18px";
        box.style.borderRadius = "12px";
        box.style.fontSize = "14px";
        box.style.fontWeight = "600";
        box.style.boxShadow = "0 10px 30px rgba(0,0,0,.15)";

        document.body.appendChild(box);
    }

    box.textContent = message;

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
        box.remove();
    }, 3500);
}


/* ---------- SUPABASE YOXLAMASI ---------- */

async function checkSupabaseConnection() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/`,
            {
                method: "GET",
                headers: supabaseHeaders
            }
        );

        if (response.ok) {
            updateConnectionStatus(true);
            return true;
        }

        updateConnectionStatus(false);
        return false;

    } catch (error) {
        console.error("Supabase connection error:", error);
        updateConnectionStatus(false);
        return false;
    }
}


/* ---------- BAĞLANTI STATUSU ---------- */

function updateConnectionStatus(connected) {

    if (!connectionStatus) return;

    if (connected) {
        connectionStatus.textContent = "Supabase bağlantısı aktivdir";
        connectionStatus.style.color = "#16a34a";
    } else {
        connectionStatus.textContent = "Supabase bağlantısı yoxdur";
        connectionStatus.style.color = "#dc2626";
    }
}


/* ---------- GİRİŞ ---------- */

async function loginUser() {

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        showMessage(
            "E-poçt və şifrəni daxil edin.",
            "error"
        );
        return;
    }

    if (!email.includes("@")) {
        showMessage(
            "Düzgün e-poçt ünvanı daxil edin.",
            "error"
        );
        return;
    }

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Daxil olunur...";
    }

    try {

        const response = await fetch(
            `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
            {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error_description ||
                data.msg ||
                "Giriş mümkün olmadı."
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

        showMessage(
            "Uğurla daxil oldunuz.",
            "success"
        );

        setTimeout(() => {
            openDashboard(data.user);
        }, 500);

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "Giriş zamanı xəta baş verdi.",
            "error"
        );

    } finally {

        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Daxil ol";
        }
    }
}


/* ---------- DASHBOARD ---------- */

function openDashboard(user) {

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (dashboardSection) {
        dashboardSection.style.display = "block";
    }

    createDashboard(user);
}


/* ---------- DASHBOARD YARADILMASI ---------- */

function createDashboard(user) {

    if (!dashboardSection) return;

    dashboardSection.innerHTML = `
        <div class="oncomp-dashboard">

            <header class="dashboard-header">

                <div>
                    <div class="dashboard-brand">
                        <span class="brand-mark">OC</span>
                        <span>ONCOMP</span>
                    </div>

                    <p>Elektron Uçot Sistemi</p>
                </div>

                <div class="dashboard-user">

                    <div class="user-info">
                        <strong>
                            ${escapeHTML(user?.email || "İstifadəçi")}
                        </strong>

                        <small>
                            Sistem istifadəçisi
                        </small>
                    </div>

                    <button
                        id="logoutBtn"
                        class="logout-button"
                    >
                        Çıxış
                    </button>

                </div>

            </header>


            <main class="dashboard-content">

                <section class="welcome-card">

                    <div>
                        <span class="eyebrow">
                            ONCOMP SYSTEM
                        </span>

                        <h1>
                            Elektron uçot paneli
                        </h1>

                        <p>
                            2-ci əl notebook və planşet satışlarının
                            idarə olunması üçün mərkəzi sistem.
                        </p>
                    </div>

                </section>


                <section class="stats-grid">

                    <div class="stat-card">
                        <span>Ümumi məhsullar</span>
                        <strong id="totalProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <span>Satışda olanlar</span>
                        <strong id="activeProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <span>Satılan məhsullar</span>
                        <strong id="soldProducts">0</strong>
                    </div>

                    <div class="stat-card">
                        <span>Ümumi gəlir</span>
                        <strong id="totalRevenue">0 ₼</strong>
                    </div>

                </section>


                <section class="system-section">

                    <div class="section-title">
                        <div>
                            <span class="eyebrow">
                                İDARƏETMƏ
                            </span>

                            <h2>
                                Sistem bölmələri
                            </h2>
                        </div>
                    </div>


                    <div class="modules-grid">

                        <button class="module-card" data-module="products">
                            <span class="module-icon">▣</span>
                            <strong>Məhsullar</strong>
                            <small>
                                Notebook və planşet uçotu
                            </small>
                        </button>


                        <button class="module-card" data-module="sales">
                            <span class="module-icon">₼</span>
                            <strong>Satışlar</strong>
                            <small>
                                Satış əməliyyatlarının idarəsi
                            </small>
                        </button>


                        <button class="module-card" data-module="customers">
                            <span class="module-icon">◎</span>
                            <strong>Müştərilər</strong>
                            <small>
                                Müştəri məlumatları
                            </small>
                        </button>


                        <button class="module-card" data-module="reports">
                            <span class="module-icon">◫</span>
                            <strong>Hesabatlar</strong>
                            <small>
                                Maliyyə və satış hesabatları
                            </small>
                        </button>


                        <button class="module-card" data-module="inventory">
                            <span class="module-icon">▤</span>
                            <strong>Anbar</strong>
                            <small>
                                Stok və məhsul qalığı
                            </small>
                        </button>


                        <button class="module-card" data-module="settings">
                            <span class="module-icon">⚙</span>
                            <strong>Ayarlar</strong>
                            <small>
                                Sistem parametrləri
                            </small>
                        </button>

                    </div>

                </section>

            </main>

        </div>
    `;


    document
        .getElementById("logoutBtn")
        ?.addEventListener("click", logoutUser);


    document
        .querySelectorAll(".module-card")
        .forEach(card => {

            card.addEventListener("click", () => {

                const module =
                    card.dataset.module;

                openModule(module);
            });

        });


    loadDashboardStatistics();
}


/* ---------- MODULLAR ---------- */

function openModule(module) {

    const titles = {
        products: "Məhsullar",
        sales: "Satışlar",
        customers: "Müştərilər",
        reports: "Hesabatlar",
        inventory: "Anbar",
        settings: "Ayarlar"
    };

    const title =
        titles[module] || "Bölmə";

    showMessage(
        `${title} bölməsi hazırlanır...`,
        "info"
    );
}


/* ---------- STATİSTİKA ---------- */

async function loadDashboardStatistics() {

    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/products?select=id,status,sale_price`,
            {
                method: "GET",
                headers: supabaseHeaders
            }
        );

        if (!response.ok) return;

        const products = await response.json();

        const total =
            products.length;

        const active =
            products.filter(
                item => item.status === "active"
            ).length;

        const sold =
            products.filter(
                item => item.status === "sold"
            ).length;

        const revenue =
            products
                .filter(item => item.status === "sold")
                .reduce(
                    (sum, item) =>
                        sum + Number(item.sale_price || 0),
                    0
                );


        const totalElement =
            document.getElementById("totalProducts");

        const activeElement =
            document.getElementById("activeProducts");

        const soldElement =
            document.getElementById("soldProducts");

        const revenueElement =
            document.getElementById("totalRevenue");


        if (totalElement)
            totalElement.textContent = total;

        if (activeElement)
            activeElement.textContent = active;

        if (soldElement)
            soldElement.textContent = sold;

        if (revenueElement)
            revenueElement.textContent =
                `${revenue.toFixed(2)} ₼`;

    } catch (error) {

        console.error(
            "Statistics error:",
            error
        );

    }
}


/* ---------- ÇIXIŞ ---------- */

function logoutUser() {

    localStorage.removeItem(
        "oncomp_access_token"
    );

    localStorage.removeItem(
        "oncomp_refresh_token"
    );

    localStorage.removeItem(
        "oncomp_user"
    );

    if (dashboardSection) {
        dashboardSection.style.display = "none";
    }

    if (loginSection) {
        loginSection.style.display = "block";
    }

    showMessage(
        "Sistemdən çıxış edildi.",
        "success"
    );
}


/* ---------- SESSION YOXLAMASI ---------- */

function checkExistingSession() {

    const token =
        localStorage.getItem(
            "oncomp_access_token"
        );

    const userData =
        localStorage.getItem(
            "oncomp_user"
        );

    if (token && userData) {

        try {

            const user =
                JSON.parse(userData);

            openDashboard(user);

        } catch (error) {

            logoutUser();

        }
    }
}


/* ---------- HTML TƏHLÜKƏSİNDƏN QORUNMA ---------- */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ---------- ENTER İLƏ GİRİŞ ---------- */

passwordInput?.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            loginUser();
        }

    }
);


/* ---------- LOGIN BUTTON ---------- */

loginButton?.addEventListener(
    "click",
    loginUser
);


/* ---------- BAŞLANĞIC ---------- */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await checkSupabaseConnection();

        checkExistingSession();

    }
);
