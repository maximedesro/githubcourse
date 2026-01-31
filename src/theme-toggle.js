const rootElement = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");
const storageKey = "theme";

const setTheme = (theme) => {
  const useDark = theme === "dark";
  rootElement.classList.toggle("dark", useDark);
  localStorage.setItem(storageKey, useDark ? "dark" : "light");
  updateToggleState();
};

const updateToggleState = () => {
  const isDarkMode = rootElement.classList.contains("dark");
  if (!toggleButton) {
    return;
  }
  toggleButton.setAttribute("aria-pressed", isDarkMode.toString());
  toggleButton.textContent = isDarkMode ? "Light mode" : "Dark mode";
};

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const isDarkMode = rootElement.classList.contains("dark");
    setTheme(isDarkMode ? "light" : "dark");
  });
}

const storedTheme = localStorage.getItem(storageKey);
if (storedTheme === "dark" || storedTheme === "light") {
  rootElement.classList.toggle("dark", storedTheme === "dark");
}

updateToggleState();
