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

function linkNewAccount() {
  showNotification("Plaid Link integration coming soon!", "info");
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
