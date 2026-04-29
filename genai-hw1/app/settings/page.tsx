"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  clearAllConversations,
  clearAllFolders,
  clearAllLocalData,
} from "@/lib/storage";
import {
  AppSettings,
  applyTheme,
  clearSettings,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hsvToHex(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16).padStart(2, "0");
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) {
    return { r: 37, g: 99, b: 235 };
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (nextColor: string) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const initialHsv = useMemo(() => {
    const { r, g, b } = hexToRgb(color);
    return rgbToHsv(r, g, b);
  }, [color]);

  const [hue, setHue] = useState(initialHsv.h);
  const [saturation, setSaturation] = useState(initialHsv.s);
  const [value, setValue] = useState(initialHsv.v);

  useEffect(() => {
    const { r, g, b } = hexToRgb(color);
    const hsv = rgbToHsv(r, g, b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setValue(hsv.v);
  }, [color]);

  useEffect(() => {
    onChange(hsvToHex(hue, saturation, value));
  }, [hue, saturation, value]);

  function updateFromPointer(clientX: number, clientY: number) {
    const el = areaRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);

    const nextS = x / rect.width;
    const nextV = 1 - y / rect.height;

    setSaturation(nextS);
    setValue(nextV);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl border border-[color:var(--border)] shadow-sm"
          style={{ backgroundColor: color }}
        />
        <div>
          <div className="text-sm text-[color:var(--text-muted)]">目前顏色</div>
          <div className="font-mono text-sm">{color.toUpperCase()}</div>
        </div>
      </div>

      <div
        ref={areaRef}
        className="relative w-full h-56 rounded-2xl cursor-crosshair overflow-hidden neo-card"
        style={{
          backgroundColor: hsvToHex(hue, 1, 1),
          backgroundImage:
            "linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0) 100%), linear-gradient(to top, #000000 0%, rgba(0,0,0,0) 100%)",
        }}
        onMouseDown={(e) => {
          setDragging(true);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (dragging) updateFromPointer(e.clientX, e.clientY);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow"
          style={{
            left: `${saturation * 100}%`,
            top: `${(1 - value) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Hue</div>
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => setHue(Number(e.target.value))}
          className="w-full neo-range"
        />
      </div>

      <div>
        <div className="text-sm font-medium mb-2">也可以直接選顏色</div>
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 rounded-lg neo-input"
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    theme: "light",
    accentColor: "#2563eb",
    systemPrompt: "",
  });

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettings(settings);
    applyTheme(settings.theme);
  }, [settings]);

  function handleThemeChange(theme: "light" | "dark") {
    setSettings((prev) => ({
      ...prev,
      theme,
    }));
  }

  function handleAccentChange(color: string) {
    setSettings((prev) => ({
      ...prev,
      accentColor: color,
    }));
  }

  function handleSystemPromptChange(systemPrompt: string) {
    setSettings((prev) => ({
      ...prev,
      systemPrompt,
    }));
  }

  function handleClearAllConversations() {
    const ok = window.confirm("要清除全部對話嗎？");
    if (!ok) return;
    clearAllConversations();
    alert("全部對話已清除。");
  }

  function handleClearAllFolders() {
    const ok = window.confirm("要清除全部資料夾嗎？");
    if (!ok) return;
    clearAllFolders();
    alert("全部資料夾已清除。");
  }

  function handleClearAllData() {
    const ok = window.confirm("要清除所有本地記憶嗎？這會刪掉對話、資料夾與設定。");
    if (!ok) return;

    clearAllLocalData();
    clearSettings();
    alert("所有本地資料已清除。");
  }

  return (
    <main className="min-h-screen bg-[var(--surface-muted)] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold cyber-title">Settings</h1>
          <Link
            href="/"
            className="rounded-lg px-4 py-2 neo-button neo-button--ghost"
          >
            回聊天頁
          </Link>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl p-5 cyber-panel cyber-panel--glass">
            <h2 className="text-lg font-semibold mb-4 cyber-title">外觀設定</h2>

            <div className="mb-6">
              <div className="font-medium mb-2">Theme</div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`px-4 py-2 rounded-lg neo-button ${
                    settings.theme === "light" ? "neo-button--accent" : "neo-button--ghost"
                  }`}
                  style={
                    settings.theme === "light"
                      ? ({ "--accent": "#35f4ff" } as CSSProperties)
                      : undefined
                  }
                >
                  Light
                </button>

                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`px-4 py-2 rounded-lg neo-button ${
                    settings.theme === "dark" ? "neo-button--accent" : "neo-button--ghost"
                  }`}
                  style={
                    settings.theme === "dark"
                      ? ({ "--accent": "#9b6bff" } as CSSProperties)
                      : undefined
                  }
                >
                  Dark
                </button>
              </div>
            </div>

            <div>
              <div className="font-medium mb-3">Accent Color</div>
              <ColorPicker
                color={settings.accentColor}
                onChange={handleAccentChange}
              />
            </div>
          </section>

          <section className="rounded-2xl p-5 cyber-panel cyber-panel--glass">
            <h2 className="text-lg font-semibold mb-4 cyber-title">系統提示（System Prompt）</h2>

            <div>
              <div className="text-sm text-[color:var(--text-subtle)] mb-3">
                全局系統提示將應用於所有新對話。可在每個對話中個別修改。
              </div>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
                placeholder="輸入默認的系統提示..."
                className="w-full h-32 rounded-lg p-3 font-mono text-sm neo-textarea text-[color:var(--foreground)] placeholder:text-[color:var(--text-muted)]"
              />
            </div>
          </section>

          <section className="rounded-2xl p-5 cyber-panel cyber-panel--glass">
            <h2 className="text-lg font-semibold mb-4 cyber-title">記憶與資料</h2>

            <div className="space-y-3">
              <button
                onClick={handleClearAllConversations}
                className="w-full text-left rounded-lg px-4 py-3 neo-button neo-button--ghost"
              >
                清除全部對話
              </button>

              <button
                onClick={handleClearAllFolders}
                className="w-full text-left rounded-lg px-4 py-3 neo-button neo-button--ghost"
              >
                清除全部資料夾
              </button>

              <button
                onClick={handleClearAllData}
                className="w-full text-left rounded-lg px-4 py-3 neo-button neo-button--ghost text-[color:var(--neon-magenta)] hover:bg-[var(--danger-muted)]"
              >
                清除所有本地記憶與設定
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}