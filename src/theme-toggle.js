const rootElement = document.documentElement;
const toggleButton = document.querySelector(".theme-toggle");

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
    rootElement.classList.toggle("dark");
    updateToggleState();
  });
}

updateToggleState();
