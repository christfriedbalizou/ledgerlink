// LedgerLink Frontend JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Initialize tooltips, dropdowns, etc.
  initializeComponents();

  // Handle form submissions
  initializeForms();

  // Handle navigation
  initializeNavigation();
});

function initializeComponents() {
  // Add any component initializations here
  console.log("LedgerLink UI initialized");
}

function initializeForms() {
  // Handle settings form submission
  const settingsForm = document.querySelector("#settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", handleSettingsSubmit);
  }

  // Handle admin form submission
  const adminForm = document.querySelector("#admin-form");
  if (adminForm) {
    adminForm.addEventListener("submit", handleAdminSubmit);
  }
}

function initializeNavigation() {
  // Handle mobile menu toggle if needed
  // Add smooth scrolling for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

async function handleSettingsSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const settings = Object.fromEntries(formData);

  try {
    const response = await fetch("/api/user/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      showNotification("Settings saved successfully!", "success");
    } else {
      throw new Error("Failed to save settings");
    }
  } catch (error) {
    showNotification("Error saving settings: " + error.message, "error");
  }
}

async function handleAdminSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const settings = Object.fromEntries(formData);

  try {
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      showNotification("Global settings saved successfully!", "success");
    } else {
      throw new Error("Failed to save global settings");
    }
  } catch (error) {
    showNotification("Error saving settings: " + error.message, "error");
  }
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
    type === "success"
      ? "bg-green-100 text-green-800"
      : type === "error"
        ? "bg-red-100 text-red-800"
        : type === "warning"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-blue-100 text-blue-800"
  }`;

  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Plaid Link Integration (placeholder)
function linkNewAccount() {
  // This will be implemented when Plaid Link is integrated
  showNotification("Plaid Link integration coming soon!", "info");
}

// Account management functions
async function removeAccount(accountId) {
  if (!confirm("Are you sure you want to remove this account?")) {
    return;
  }

  try {
    const response = await fetch(`/api/plaid/account/${accountId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showNotification("Account removed successfully!", "success");
      // Reload page to update account list
      window.location.reload();
    } else {
      throw new Error("Failed to remove account");
    }
  } catch (error) {
    showNotification("Error removing account: " + error.message, "error");
  }
}

// Sync functions
async function triggerManualSync() {
  try {
    showNotification("Starting manual sync...", "info");

    const response = await fetch("/api/sync/manual", {
      method: "POST",
    });

    if (response.ok) {
      showNotification("Manual sync completed successfully!", "success");
    } else {
      throw new Error("Manual sync failed");
    }
  } catch (error) {
    showNotification("Error during sync: " + error.message, "error");
  }
}

// Export global functions for use in templates
window.linkNewAccount = linkNewAccount;
window.removeAccount = removeAccount;
window.triggerManualSync = triggerManualSync;
window.showNotification = showNotification;
