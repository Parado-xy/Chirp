/**
 * Main JavaScript functionality for Chirp
 * Enhanced with modern features and interactions
 */

// Theme management
class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem("theme") || "light";
    this.init();
  }

  init() {
    this.applyTheme();
    this.bindEvents();
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.theme);
    localStorage.setItem("theme", this.theme);

    // Update theme toggle button
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      const icon = themeToggle.querySelector("i");
      if (icon) {
        icon.className = this.theme === "dark" ? "bx bx-sun" : "bx bx-moon";
      }
    }
  }

  toggle() {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.applyTheme();

    // Add smooth transition effect
    document.documentElement.style.transition = "all 0.3s ease";
    setTimeout(() => {
      document.documentElement.style.transition = "";
    }, 300);
  }

  bindEvents() {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggle());
    }
  }
}

// Enhanced clipboard functionality
class ClipboardManager {
  constructor() {
    this.init();
  }

  init() {
    this.bindCopyButtons();
  }

  async copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopyFeedback(button, "Copied!", "success");
    } catch (err) {
      // Fallback for older browsers
      this.fallbackCopy(text, button);
    }
  }

  fallbackCopy(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      this.showCopyFeedback(button, "Copied!", "success");
    } catch (err) {
      this.showCopyFeedback(button, "Copy failed", "error");
    }

    document.body.removeChild(textArea);
  }

  showCopyFeedback(button, message, type) {
    const originalContent = button.innerHTML;
    const originalClasses = button.className;

    // Update button appearance
    button.innerHTML = `<i class="bx ${
      type === "success" ? "bx-check" : "bx-x"
    }"></i> ${message}`;
    button.className =
      originalClasses + ` btn-${type === "success" ? "success" : "danger"}`;

    // Reset after delay
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.className = originalClasses;
    }, 2000);
  }

  bindCopyButtons() {
    // Bind existing copy buttons
    document.querySelectorAll(".copy-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = button.getAttribute("data-clipboard-target");
        const targetText = button.getAttribute("data-clipboard-text");

        let textToCopy = "";

        if (targetId) {
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            textToCopy = targetElement.textContent || targetElement.innerText;
          }
        } else if (targetText) {
          textToCopy = targetText;
        } else {
          // Look for nearest code block or text container
          const codeBlock = button
            .closest(".code-block")
            ?.querySelector("code, pre");
          const textContainer = button
            .closest(".api-key-container")
            ?.querySelector("code");

          if (codeBlock) {
            textToCopy = codeBlock.textContent || codeBlock.innerText;
          } else if (textContainer) {
            textToCopy = textContainer.textContent || textContainer.innerText;
          }
        }

        if (textToCopy) {
          this.copyToClipboard(textToCopy, button);
        }
      });
    });
  }
}

// Form enhancements
class FormManager {
  constructor() {
    this.init();
  }

  init() {
    this.bindPasswordToggle();
    this.enhanceFormValidation();
    this.bindFormSubmissions();
  }

  bindPasswordToggle() {
    document.querySelectorAll(".toggle-password").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const input = button.parentNode.querySelector("input");
        const icon = button.querySelector("i");

        if (input && icon) {
          if (input.type === "password") {
            input.type = "text";
            icon.classList.replace("bx-show", "bx-hide");
            button.setAttribute("title", "Hide password");
          } else {
            input.type = "password";
            icon.classList.replace("bx-hide", "bx-show");
            button.setAttribute("title", "Show password");
          }
        }
      });
    });
  }

  enhanceFormValidation() {
    const forms = document.querySelectorAll("form[data-validate]");
    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input, textarea, select");

      inputs.forEach((input) => {
        input.addEventListener("blur", () => this.validateField(input));
        input.addEventListener("input", () => this.clearFieldError(input));
      });

      form.addEventListener("submit", (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
        }
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let message = "";

    // Remove existing error state
    this.clearFieldError(field);

    // Required field validation
    if (field.required && !value) {
      isValid = false;
      message = `${this.getFieldLabel(field)} is required`;
    }

    // Email validation
    else if (type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        message = "Please enter a valid email address";
      }
    }

    // Password validation
    else if (type === "password" && value && field.name === "password") {
      if (value.length < 8) {
        isValid = false;
        message = "Password must be at least 8 characters long";
      }
    }

    // Password confirmation
    else if (field.name === "confirmPassword" && value) {
      const passwordField = document.querySelector('input[name="password"]');
      if (passwordField && value !== passwordField.value) {
        isValid = false;
        message = "Passwords do not match";
      }
    }

    if (!isValid) {
      this.showFieldError(field, message);
    }

    return isValid;
  }

  validateForm(form) {
    const inputs = form.querySelectorAll(
      "input[required], textarea[required], select[required]"
    );
    let isValid = true;

    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  showFieldError(field, message) {
    field.classList.add("is-invalid");

    let errorElement = field.parentNode.querySelector(".invalid-feedback");
    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.className = "invalid-feedback";
      field.parentNode.appendChild(errorElement);
    }

    errorElement.textContent = message;
  }

  clearFieldError(field) {
    field.classList.remove("is-invalid");
    const errorElement = field.parentNode.querySelector(".invalid-feedback");
    if (errorElement) {
      errorElement.remove();
    }
  }

  getFieldLabel(field) {
    const label = field.closest(".form-group")?.querySelector("label");
    if (label) {
      return label.textContent.replace("*", "").trim();
    }
    return field.name.charAt(0).toUpperCase() + field.name.slice(1);
  }

  bindFormSubmissions() {
    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          this.setLoadingState(submitBtn, true);

          // Reset loading state after a delay (you might want to handle this based on actual form response)
          setTimeout(() => {
            this.setLoadingState(submitBtn, false);
          }, 2000);
        }
      });
    });
  }

  setLoadingState(button, loading) {
    if (loading) {
      button.classList.add("loading");
      button.disabled = true;
      button.setAttribute("data-original-text", button.textContent);
      button.textContent = "Please wait...";
    } else {
      button.classList.remove("loading");
      button.disabled = false;
      const originalText = button.getAttribute("data-original-text");
      if (originalText) {
        button.textContent = originalText;
        button.removeAttribute("data-original-text");
      }
    }
  }
}

// Animation and interaction enhancements
class AnimationManager {
  constructor() {
    this.init();
  }

  init() {
    this.observeElements();
    this.bindHoverEffects();
    this.initScrollAnimations();
  }

  observeElements() {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("fade-in");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -50px 0px",
        }
      );

      // Observe elements that should animate in
      document
        .querySelectorAll(".feature-card, .dashboard-card, .auth-card")
        .forEach((el) => {
          observer.observe(el);
        });
    }
  }

  bindHoverEffects() {
    // Add hover lift effect to interactive elements
    document
      .querySelectorAll(".feature-card, .dashboard-card, .btn, .card")
      .forEach((el) => {
        el.classList.add("hover-lift");
      });
  }

  initScrollAnimations() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }
}

// Toast notification system
class ToastManager {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = "info", duration = 5000) {
    const toast = this.createToast(message, type);
    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 100);

    // Auto remove
    setTimeout(() => {
      this.remove(toast);
    }, duration);

    return toast;
  }

  createToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: var(--${
        type === "success"
          ? "success-color"
          : type === "error"
          ? "error-color"
          : type === "warning"
          ? "warning-color"
          : "info-color"
      });
      color: white;
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      max-width: 350px;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="bx ${this.getIcon(type)}"></i>
        <span>${message}</span>
        <button style="background: none; border: none; color: white; margin-left: auto; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">
          <i class="bx bx-x"></i>
        </button>
      </div>
    `;

    toast.classList.add("show");
    toast.style.transform = "translateX(0)";

    toast.addEventListener("click", () => this.remove(toast));

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: "bx-check-circle",
      error: "bx-error-circle",
      warning: "bx-error",
      info: "bx-info-circle",
    };
    return icons[type] || icons.info;
  }

  remove(toast) {
    toast.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

// Progress bar utility
class ProgressBar {
  constructor(element) {
    this.element = element;
    this.bar = element.querySelector(".progress-bar");
  }

  setProgress(percentage, animated = true) {
    if (this.bar) {
      if (animated) {
        this.bar.style.transition = "width 0.6s ease";
      }
      this.bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
      this.bar.setAttribute("aria-valuenow", percentage);
    }
  }

  pulse() {
    if (this.bar) {
      this.bar.style.animation = "progress-shine 2s infinite";
    }
  }
}

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Show API Key Modal on successful registration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("registered") === "true") {
    const apiKeyModal = document.getElementById("apiKeyModal");
    if (apiKeyModal && typeof bootstrap !== "undefined") {
      const modal = new bootstrap.Modal(apiKeyModal);
      modal.show();
    }
  }

  // Initialize managers
  window.themeManager = new ThemeManager();
  window.clipboardManager = new ClipboardManager();
  window.formManager = new FormManager();
  window.animationManager = new AnimationManager();
  window.toastManager = new ToastManager();

  // Initialize progress bars
  document.querySelectorAll(".progress").forEach((progressEl) => {
    const progressBar = new ProgressBar(progressEl);

    // If data attribute exists, set progress
    const percentage = progressEl.getAttribute("data-percentage");
    if (percentage) {
      setTimeout(() => {
        progressBar.setProgress(parseInt(percentage));
      }, 500);
    }
  });

  // Auto-close alerts after 5 seconds
  document.querySelectorAll(".alert:not(.alert-permanent)").forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Enhance navbar on scroll
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let lastScrollTop = 0;
    window.addEventListener("scroll", () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 100) {
        navbar.classList.add("navbar-scrolled");
      } else {
        navbar.classList.remove("navbar-scrolled");
      }

      lastScrollTop = scrollTop;
    });
  }

  // Add keyboard navigation support
  document.addEventListener("keydown", (e) => {
    // Close modals with Escape key
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.show");
      if (activeModal) {
        const closeBtn = activeModal.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) closeBtn.click();
      }
    }

    // Theme toggle with Ctrl/Cmd + Shift + T
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
      e.preventDefault();
      window.themeManager.toggle();
    }
  });

  console.log("🎉 Chirp UI Enhanced - All systems ready!");
});

// Expose utilities globally for use in templates
window.ChirpUI = {
  toast: (message, type, duration) =>
    window.toastManager.show(message, type, duration),
  copy: (text, button) => window.clipboardManager.copyToClipboard(text, button),
  toggleTheme: () => window.themeManager.toggle(),
};
