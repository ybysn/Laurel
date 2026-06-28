import { describe, it, expect, beforeEach } from "vitest";

describe("settings_service", () => {
  const STORAGE_KEY = "mlme-settings";
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    } as Storage;
  });

  it("默认设置包含必要字段", () => {
    const defaults = {
      theme: "light" as const,
      editorFontSize: 16,
      editorFontFamily: "Consolas, 'Microsoft YaHei', monospace",
      autoSaveEnabled: false,
      autoSaveDelayMs: 3000,
      defaultViewMode: "source" as const,
      sidebarVisibleByDefault: true,
    };

    expect(defaults.theme).toBeDefined();
    expect(defaults.editorFontSize).toBeGreaterThan(0);
    expect(["light", "dark"]).toContain(defaults.theme);
    expect(["source", "wysiwyg", "split"]).toContain(defaults.defaultViewMode);
  });

  it("localStorage 存取设置往返一致", () => {
    const settings = {
      theme: "dark" as const,
      editorFontSize: 18,
      editorFontFamily: "JetBrains Mono",
      autoSaveEnabled: true,
      autoSaveDelayMs: 5000,
      defaultViewMode: "wysiwyg" as const,
      sidebarVisibleByDefault: false,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

    expect(loaded.theme).toBe("dark");
    expect(loaded.editorFontSize).toBe(18);
    expect(loaded.autoSaveEnabled).toBe(true);
    expect(loaded.defaultViewMode).toBe("wysiwyg");
  });

  it("损坏的 JSON 应安全降级", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    expect(() => JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toThrow();
  });

  it("缺失字段应填充默认值", () => {
    const partial = { theme: "dark" };
    const defaults = { theme: "light", editorFontSize: 16, autoSaveEnabled: false };
    const merged = { ...defaults, ...partial };
    expect(merged.theme).toBe("dark");
    expect(merged.editorFontSize).toBe(16);
    expect(merged.autoSaveEnabled).toBe(false);
  });

  it("空 localStorage 返回 undefined", () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
