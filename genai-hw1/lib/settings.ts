export type AppSettings = {
  theme: "light" | "dark";
  accentColor: string;
};

const SETTINGS_KEY = "app_settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      theme: "light",
      accentColor: "#2563eb",
    };
  }

  const raw = localStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    return {
      theme: "light",
      accentColor: "#2563eb",
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      theme: "light",
      accentColor: "#2563eb",
    };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}