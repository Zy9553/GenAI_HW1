export type AppSettings = {
  theme: "light" | "dark";
  accentColor: string;
  systemPrompt: string;
};

const SETTINGS_KEY = "app_settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      theme: "light",
      accentColor: "#2563eb",
      systemPrompt: "",
    };
  }

  const raw = localStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    return {
      theme: "light",
      accentColor: "#2563eb",
      systemPrompt: "",
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      theme: "light",
      accentColor: "#2563eb",
      systemPrompt: "",
    };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

export function applyTheme(theme: AppSettings["theme"]) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}