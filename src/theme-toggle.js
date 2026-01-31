const rootElement = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const toggleIcon = toggleButton?.querySelector(".theme-toggle__icon");
const storageKey = "theme";

const applyTheme = (theme, { persist = false } = {}) => {
  const useDark = theme === "dark";
  rootElement.classList.toggle("dark", useDark);
  if (persist) {
    localStorage.setItem(storageKey, useDark ? "dark" : "light");
  }
  updateToggleState();
};

const updateToggleState = () => {
  const isDarkMode = rootElement.classList.contains("dark");
  if (!toggleButton) {
    return;
  }
  toggleButton.setAttribute("aria-pressed", isDarkMode.toString());
  toggleButton.setAttribute(
    "aria-label",
    isDarkMode ? "Enable light mode" : "Enable dark mode"
  );
  if (toggleIcon) {
    toggleIcon.textContent = isDarkMode ? "☀️" : "🌙";
  }
};

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const isDarkMode = rootElement.classList.contains("dark");
    applyTheme(isDarkMode ? "light" : "dark", { persist: true });
  });
}

const storedTheme = localStorage.getItem(storageKey);
const hasStoredTheme = storedTheme === "dark" || storedTheme === "light";
const prefersDark =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const initialTheme = hasStoredTheme ? storedTheme : prefersDark ? "dark" : "light";
applyTheme(initialTheme, { persist: hasStoredTheme });

updateToggleState();
