import { describe, expect, it } from "vitest";
import translations from "@/lib/translations.json";
import { langConfig } from "@/lib/site-config";

describe("enabled content languages", () => {
  const dictionaries = translations as Record<string, Record<string, string>>;
  it.each(["bn", "hi", "pt-BR", "id", "tr", "ar", "fa"])("covers all translated phrases in %s", (lang) => {
    const phrases = Object.keys(dictionaries["bn"] ?? {});
    expect(phrases.length).toBeGreaterThan(500);
    for (const phrase of phrases) expect(dictionaries[lang]?.[phrase]?.trim()).toBeTruthy();
  });
  it("keeps all eight languages enabled and both RTL languages", () => {
    expect(langConfig({}).enabled).toEqual(["en", "bn", "hi", "pt-BR", "id", "tr", "ar", "fa"]);
    expect(langConfig({}).rtl).toEqual(["ar", "fa"]);
  });
});