const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const vacancyList = document.getElementById("vacancy-list");

async function loadVacancies() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/vacancies?select=*&active=eq.true&order=created_at.desc`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase xətası: ${response.status}`);
    }

    const vacancies = await response.json();

    if (!vacancies.length) {
      vacancyList.innerHTML = `
        <div class="loading">
          Hazırda aktiv vakansiya yoxdur.
        </div>
      `;
      return;
    }

    vacancyList.innerHTML = vacancies.map(vacancy => `
      <article class="vacancy-card">
        <h3>${escapeHtml(vacancy.title || "Vakansiya")}</h3>

        <div class="vacancy-company">
          ${escapeHtml(vacancy.company || "Şirkət göstərilməyib")}
        </div>

        <p class="vacancy-description">
          ${escapeHtml(vacancy.description || "Ətraflı məlumat yoxdur.")}
        </p>

        <div class="vacancy-info">
          ${vacancy.city ? `<span>📍 ${escapeHtml(vacancy.city)}</span>` : ""}
          ${vacancy.category ? `<span>💼 ${escapeHtml(vacancy.category)}</span>` : ""}
          ${vacancy.salary ? `<span>💰 ${escapeHtml(vacancy.salary)}</span>` : ""}
          ${vacancy.work_schedule ? `<span>🕐 ${escapeHtml(vacancy.work_schedule)}</span>` : ""}
        </div>
      </article>
    `).join("");

  } catch (error) {
    console.error(error);

    vacancyList.innerHTML = `
      <div class="loading">
        Vakansiyalar yüklənərkən xəta baş verdi.
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadVacancies();
