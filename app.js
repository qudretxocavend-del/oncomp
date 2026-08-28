const SUPABASE_URL = "https://frnbduzaiuitpxgvvzwq.supabase.co";
const SUPABASE_KEY = "sb_publishable_LyQAUsn6sYJlxVzL5gNDNQ_PHQEH8mO";

const loginForm = document.querySelector("form");

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const emailInput =
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name="email"]');

    const passwordInput =
      document.querySelector('input[type="password"]') ||
      document.querySelector('input[name="password"]');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      alert("E-poçt və şifrəni daxil edin.");
      return;
    }

    const button =
      loginForm.querySelector('button[type="submit"]') ||
      loginForm.querySelector("button");

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
          "E-poçt və ya şifrə yanlışdır."
        );
      }

      localStorage.setItem(
        "oncomp_session",
        JSON.stringify(data)
      );

      window.location.href = "dashboard.html";

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Daxil ol";
      }
    }
  });
}
