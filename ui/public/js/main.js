document.addEventListener("DOMContentLoaded", function () {
  initializeComponents();
  initializeForms();
  initializeNavigation();
  initializeThemeToggle();
});

function initializeComponents() {
  console.log("LedgerLink UI initialized");
}

function initializeForms() {
  const settingsForm = document.querySelector("#settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", handleSettingsSubmit);
  }

  const adminForm = document.querySelector("#admin-form");
  if (adminForm) {
    adminForm.addEventListener("submit", handleAdminSubmit);
  }
}

function initializeNavigation() {
  const anchorElements = document.querySelectorAll('a[href^="#"]');
  anchorElements.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const targetId = anchor.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

function initializeThemeToggle() {
  const toggleButton = document.getElementById("theme-toggle");
  if (!toggleButton) return;
  const root = document.documentElement;
  const applyTheme = (mode) => {
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  };
  const storedTheme = localStorage.getItem("theme");
  applyTheme(storedTheme || "system");
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    if (!localStorage.getItem("theme")) applyTheme("system");
  });
  toggleButton.addEventListener("click", () => {
    const isDark = root.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData);
  try {
    const response = await fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      showNotification("Settings saved successfully!", "success");
    } else {
      throw new Error("Failed to save settings");
    }
  } catch (err) {
    showNotification("Error saving settings: " + err.message, "error");
  }
}

async function handleAdminSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData);
  try {
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      showNotification("Global settings saved successfully!", "success");
    } else {
      throw new Error("Failed to save global settings");
    }
  } catch (err) {
    showNotification("Error saving settings: " + err.message, "error");
  }
}

function showNotification(message, type = "info") {
  const notificationElement = document.createElement("div");
  notificationElement.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${type === "success" ? "bg-green-100 text-green-800" : type === "error" ? "bg-red-100 text-red-800" : type === "warning" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`;
  notificationElement.textContent = message;
  document.body.appendChild(notificationElement);
  setTimeout(() => {
    notificationElement.remove();
  }, 5000);
}

let plaidLinkHandler = null;
let plaidScriptLoading = null;

function setLinkButtonState(loading) {
  const buttons = [
    document.getElementById("link-account-btn"),
    document.getElementById("link-account-btn-empty"),
  ].filter(Boolean);
  buttons.forEach((btn) => {
    const spinner = btn.querySelector(".spinner");
    const label = btn.querySelector(".btn-label");
    if (loading) {
      btn.disabled = true;
      btn.classList.add("opacity-70", "cursor-not-allowed");
      if (spinner) spinner.classList.remove("hidden");
      if (label) label.textContent = "Loading...";
    } else {
      btn.disabled = false;
      btn.classList.remove("opacity-70", "cursor-not-allowed");
      if (spinner) spinner.classList.add("hidden");
      if (label)
        label.textContent =
          btn.id === "link-account-btn-empty"
            ? "Connect Your First Account"
            : "Link New Account";
    }
  });
}

async function fetchAccountStats() {
  try {
    const resp = await fetch("/api/me/account-stats");
    if (!resp.ok) return;
    const data = await resp.json();
    // Find the dt with text "Connected Accounts" then its nextElementSibling (dd)
    const dts = document.querySelectorAll("dl dt.text-sm.font-medium");
    for (const dt of dts) {
      if (
        dt.textContent.trim() === "Connected Accounts" &&
        dt.nextElementSibling &&
        dt.nextElementSibling.tagName === "DD"
      ) {
        dt.nextElementSibling.textContent = data.accounts;
        break;
      }
    }
  } catch (e) {
    console.warn("Failed to refresh account stats", e);
  }
}

function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();
  if (plaidScriptLoading) return plaidScriptLoading;
  plaidScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Plaid script"));
    document.head.appendChild(script);
  });
  return plaidScriptLoading;
}

async function linkNewAccount() {
  try {
    showNotification("Preparing Plaid Link...", "info");
    setLinkButtonState(true);
    await loadPlaidScript();
    const productSelect = document.getElementById("plaid-product");
    const product = productSelect ? productSelect.value : undefined;
    const url =
      "/api/plaid/link-token" +
      (product ? `?product=${encodeURIComponent(product)}` : "");
    const tokenResp = await fetch(url, { method: "POST" });
    if (!tokenResp.ok) throw new Error("Failed to create link token");
    const tokenData = await tokenResp.json();
    const linkToken = tokenData.link_token || tokenData.linkToken || null;
    if (!linkToken) throw new Error("link_token missing in response");

    // Reinitialize handler each time to ensure fresh token lifecycle
    plaidLinkHandler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (public_token, metadata) => {
        try {
          showNotification("Link success. Finalizing...", "info");
          const institutionName = metadata.institution?.name || "Unknown";
          const plaidInstitutionId = metadata.institution?.institution_id || null;
          const product =
            (metadata?.products && metadata.products[0]) || "transactions";
          const resp = await fetch("/api/plaid/set-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              public_token,
              institutionName,
              plaidInstitutionId,
              product,
            }),
          });
          if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to persist linked item");
          }
          showNotification("Account linked successfully!", "success");
          await fetchAccountStats();
          setTimeout(() => window.location.reload(), 1200); // fallback full reload for now
        } catch (e) {
          showNotification("Post-link error: " + e.message, "error");
        }
      },
      onExit: (err, metadata) => {
        if (err) {
          console.warn("Plaid Link exit error", err, metadata);
          showNotification(
            "Link exited: " +
              (err.display_message || err.error_message || err.error_code),
            "warning",
          );
        } else {
          showNotification("Link flow closed", "info");
        }
        setLinkButtonState(false);
      },
      onEvent: (eventName, metadata) => {
        if (eventName === "ERROR") {
          console.warn("Plaid Link event error", metadata);
        }
        fetch("/api/plaid/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventName, metadata }),
        }).catch(() => {});
      },
    });

    plaidLinkHandler.open();
  } catch (e) {
    showNotification("Unable to start Plaid Link: " + e.message, "error");
    setLinkButtonState(false);
  }
}

async function removeAccount(id) {
  if (!confirm("Are you sure you want to remove this account?")) return;
  try {
    const response = await fetch(`/api/plaid/account/${id}`, { method: "DELETE" });
    if (response.ok) {
      showNotification("Account removed successfully!", "success");
      window.location.reload();
    } else {
      throw new Error("Failed to remove account");
    }
  } catch (err) {
    showNotification("Error removing account: " + err.message, "error");
  }
}

async function triggerManualSync() {
  try {
    showNotification("Starting manual sync...", "info");
    const response = await fetch("/api/sync/manual", { method: "POST" });
    if (response.ok) {
      showNotification("Manual sync completed successfully!", "success");
    } else {
      throw new Error("Manual sync failed");
    }
  } catch (err) {
    showNotification("Error during sync: " + err.message, "error");
  }
}

// Expose selected functions globally for inline handlers
window.linkNewAccount = linkNewAccount;
window.removeAccount = removeAccount;
window.triggerManualSync = triggerManualSync;
window.showNotification = showNotification;
