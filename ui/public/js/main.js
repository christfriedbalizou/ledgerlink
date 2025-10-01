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
  const raw = Object.fromEntries(formData);
  const payload = {
    ...(raw.integrationPreference
      ? {
          enableActual: raw.integrationPreference === "actual",
          enableEmailExport: raw.integrationPreference === "email",
        }
      : {
          enableActual:
            raw.enableActual === "on" ||
            raw.enableActual === "true" ||
            raw.enableActual === true,
          enableEmailExport:
            raw.enableEmailExport === "on" ||
            raw.enableEmailExport === "true" ||
            raw.enableEmailExport === true,
        }),
  };
  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-60", "cursor-not-allowed");
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";
  }
  try {
    const response = await fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      showNotification("Settings saved successfully!", "success");
      if (submitBtn) submitBtn.textContent = "Saved";
    } else {
      throw new Error("Failed to save settings");
    }
  } catch (err) {
    showNotification("Error saving settings: " + err.message, "error");
    if (submitBtn) submitBtn.textContent = "Error";
  }
  setTimeout(() => {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
      submitBtn.textContent = submitBtn.dataset.originalText || "Save Changes";
    }
  }, 1800);
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

function toggleMenu(button) {
  const menu = button.parentElement.querySelector(".menu");
  if (!menu) return;
  const isHidden = menu.classList.contains("hidden");
  document.querySelectorAll(".menu").forEach((m) => m.classList.add("hidden"));
  if (isHidden) menu.classList.remove("hidden");
  const close = (e) => {
    if (!menu.contains(e.target) && e.target !== button) {
      menu.classList.add("hidden");
      document.removeEventListener("click", close);
    }
  };
  setTimeout(() => document.addEventListener("click", close), 0);
}
let pendingDelete = { type: null, id: null };

function deleteInstitution(id) {
  pendingDelete = { type: "institution", id };
  openDeleteModal(
    "Delete Institution",
    "Are you sure you want to permanently delete this institution and all linked accounts/items? This action cannot be undone.",
  );
}

function deleteAccount(id) {
  pendingDelete = { type: "account", id };
  openDeleteModal(
    "Delete Account",
    "Are you sure you want to permanently delete this account?",
  );
}

function openDeleteModal(title, body) {
  const modal = document.getElementById("delete-modal");
  if (!modal) return;
  document.getElementById("delete-modal-title").textContent = title;
  document.getElementById("delete-modal-body").textContent = body;
  const forceSection = document.getElementById("force-delete-section");
  if (forceSection) forceSection.remove();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDeleteModal() {
  const modal = document.getElementById("delete-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  pendingDelete = { type: null, id: null };
}

async function confirmDeletion() {
  if (!pendingDelete.id) return;
  if (pendingDelete.type === "institution") return performInstitutionDelete();
  if (pendingDelete.type === "account") return performAccountDelete();
}

async function performInstitutionDelete() {
  try {
    const resp = await fetch(`/api/plaid/institution/${pendingDelete.id}`, {
      method: "DELETE",
    });
    if (!resp.ok)
      throw new Error((await resp.json().catch(() => ({}))).error || "Delete failed");
    closeDeleteModal();
    showNotification("Institution deleted", "success");
    removeInstitutionCard(pendingDelete.id);
  } catch (e) {
    showNotification("Error: " + e.message, "error");
  }
}

async function performAccountDelete() {
  try {
    const resp = await fetch(`/api/plaid/account/${pendingDelete.id}`, {
      method: "DELETE",
    });
    if (!resp.ok)
      throw new Error((await resp.json().catch(() => ({}))).error || "Delete failed");
    closeDeleteModal();
    showNotification("Account deleted", "success");
    removeAccountRow(pendingDelete.id);
  } catch (e) {
    showNotification("Error: " + e.message, "error");
  }
}

function removeInstitutionCard(id) {
  const btn = document.querySelector(
    `.card button[onclick*="deleteInstitution('${id}')"]`,
  );
  if (btn) {
    const card = btn.closest(".card");
    if (card) {
      // Count accounts in this institution before removal
      const accountsList = card.querySelector(".institution-accounts-list");
      const accountCount = accountsList
        ? accountsList.querySelectorAll("li").length
        : 0;
      card.classList.add("opacity-0", "transition", "duration-300");
      setTimeout(() => {
        card.remove();
        // Update global account stats by subtracting accountCount
        decrementGlobalAccountCount(accountCount);
      }, 320);
    }
  }
}

function decrementGlobalAccountCount(n) {
  // Find the dt with text "Connected Accounts" then its nextElementSibling (dd)
  const dts = document.querySelectorAll("dl dt.text-sm.font-medium");
  for (const dt of dts) {
    if (
      dt.textContent.trim() === "Connected Accounts" &&
      dt.nextElementSibling &&
      dt.nextElementSibling.tagName === "DD"
    ) {
      const dd = dt.nextElementSibling;
      const current = parseInt(dd.textContent, 10);
      const next = Math.max(0, current - n);
      dd.textContent = next;
      break;
    }
  }
}

function removeAccountRow(id) {
  const btn = document.querySelector(`li button[onclick*="deleteAccount('${id}')"]`);
  if (btn) {
    const li = btn.closest("li");
    if (li) {
      li.classList.add("opacity-0", "transition", "duration-300");
      const card = li.closest(".card");
      setTimeout(() => {
        li.remove();
        if (card) {
          updateInstitutionAccountCount(card);
        }
      }, 320);
    }
  }
}

function updateInstitutionAccountCount(card) {
  try {
    const list = card.querySelector(".institution-accounts-list");
    const countSpan = card.querySelector(".inst-account-count");
    const labelSpan = card.querySelector(".inst-account-label");
    if (!countSpan) return;
    const remaining = list ? list.querySelectorAll("li").length : 0;
    countSpan.textContent = remaining;
    if (labelSpan) {
      labelSpan.textContent = remaining === 1 ? " account" : " accounts";
    }
    if (remaining === 0) {
      // Replace the now-empty list with a placeholder message if not already present
      if (list) {
        list.remove();
      }
      if (!card.querySelector(".no-accounts-msg")) {
        const msg = document.createElement("p");
        msg.className = "mt-4 text-sm text-gray-500 no-accounts-msg";
        msg.textContent = "No accounts yet for this institution.";
        card.appendChild(msg);
      }
    }
    // Refresh global account stats counter at top without full reload
    fetchAccountStats();
  } catch (e) {
    console.warn("Failed to update institution account count", e);
  }
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

    plaidLinkHandler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (public_token, metadata) => {
        try {
          showNotification("Link success. Finalizing...", "info");
          const institutionName = metadata.institution?.name || "Unknown";
          const plaidInstitutionId = metadata.institution?.institution_id || null;
          const product =
            (metadata?.products && metadata.products[0]) || "transactions";
          // Capture all accounts metadata if present
          const accountsPayload = Array.isArray(metadata.accounts)
            ? metadata.accounts.map((a) => ({
                id: a.id,
                name: a.name,
                officialName: a.official_name,
                mask: a.mask,
                type: a.type,
                subtype: a.subtype,
                balances: a.balances || {},
              }))
            : [];
          const resp = await fetch("/api/plaid/set-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              public_token,
              institutionName,
              plaidInstitutionId,
              product,
              accounts: accountsPayload,
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

window.linkNewAccount = linkNewAccount;
window.removeAccount = removeAccount;
window.triggerManualSync = triggerManualSync;
window.showNotification = showNotification;
window.toggleMenu = toggleMenu;
window.deleteInstitution = deleteInstitution;
window.deleteAccount = deleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeletion = confirmDeletion;
window.updateInstitutionAccountCount = updateInstitutionAccountCount;
