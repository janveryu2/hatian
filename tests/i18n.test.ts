import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/locales/en";
import { tl } from "@/lib/i18n/locales/tl";

describe("i18n Dictionary Integrity", () => {
  it("should have matching key hierarchy between English and Tagalog", () => {
    function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.entries(obj).flatMap(([k, v]) => {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") {
          return getKeys(v as Record<string, unknown>, fullKey);
        }
        return [fullKey];
      });
    }

    const enKeys = getKeys(en as unknown as Record<string, unknown>).sort();
    const tlKeys = getKeys(tl as unknown as Record<string, unknown>).sort();

    expect(enKeys).toEqual(tlKeys);
  });

  it("should include conversational Tagalog phrases instead of formal/deep Tagalog", () => {
    // Assert casual Taglish/conversational terms
    expect(tl.home.youOwe).toBe("Utang mo");
    expect(tl.home.owedToYou).toBe("Utang sa'yo");
    expect(tl.home.allSettledUp).toBe("Bayad na lahat!");
    expect(tl.bills.addBill).toBe("Mag-add ng Bill");
    expect(tl.bills.daysPresentTitle).toBe("Ilang Araw sa Dorm");
    expect(tl.bills.payLaterButton).toBe("Later na lang");
    expect(tl.bills.markPaidButton).toBe("Bayad na →");

    // Ensure formal/deep words are NOT present
    const allTlText = JSON.stringify(tl).toLowerCase();
    expect(allTlText).not.toContain("salapi");
    expect(allTlText).not.toContain("pananagutan");
    expect(allTlText).not.toContain("katuwang");
  });

  it("should format interpolated string parameters properly", () => {
    const template = tl.bills.provisionalBanner;
    const interpolated = template.replace("{names}", "Janver, Miggy");
    expect(interpolated).toBe(
      "Tantya pa lang: hinihintay pa si Janver, Miggy na mag-enter ng days"
    );
  });
});
