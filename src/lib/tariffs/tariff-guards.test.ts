// @ts-expect-error Vitest запускается через pnpm dlx (без локального пакета в devDependencies).
import { describe, expect, it } from "vitest";

import {
  FREE_STRUCTURE_ERROR,
  assertCanCreateStructure,
  deriveOrganizationTariffLimits,
  isContentBlockFilled,
  isContentEditingBlocked,
} from "./tariff-guards";

type TierRow = {
  id: string;
  price_monthly: number;
  limits: Record<string, unknown> | null;
};

function createTierRow(overrides: Partial<TierRow>): TierRow {
  return {
    id: "custom-tier",
    price_monthly: 1000,
    limits: {},
    ...overrides,
  };
}

function createSupabaseMock(options: {
  organizationTierId: string | null;
  tier: TierRow | null;
}) {
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          if (table === "organizations") {
            return {
              data: { tier_id: options.organizationTierId },
              error: null,
            };
          }

          if (table === "subscription_tiers") {
            return {
              data: options.tier,
              error: null,
            };
          }

          return { data: null, error: null };
        },
      };
    },
  };
}

describe("tariff guards", () => {
  it("Free tariff: запрещает создание структуры", async () => {
    const freeFromMissingTier = deriveOrganizationTariffLimits(null);
    expect(freeFromMissingTier.can_create_structure).toBe(false);
    expect(freeFromMissingTier.force_demo).toBe(false);

    const denied = await assertCanCreateStructure(
      createSupabaseMock({
        organizationTierId: null,
        tier: null,
      }) as never,
      null,
    );

    expect(denied).toEqual({
      ok: false,
      error: FREE_STRUCTURE_ERROR,
    });
  });

  it("Catalog tariff: структура доступна, force_demo=true, лимит 3 урока", async () => {
    const catalog = deriveOrganizationTariffLimits(
      createTierRow({
        id: "catalog-pro",
        price_monthly: 9000,
        limits: {
          lms_unlocked: false,
          max_lessons: 3,
        },
      }) as never,
    );

    expect(catalog.can_create_structure).toBe(true);
    expect(catalog.force_demo).toBe(true);
    expect(catalog.max_content_lessons).toBe(3);

    expect(
      isContentEditingBlocked(catalog, {
        filledLessonsCount: 3,
        currentLessonHasContent: false,
      }),
    ).toBe(true);

    expect(
      isContentEditingBlocked(catalog, {
        filledLessonsCount: 3,
        currentLessonHasContent: true,
      }),
    ).toBe(false);
  });

  it("LMS/Corporate tariff: структура доступна, контент без лимита, force_demo=false", async () => {
    const lms = deriveOrganizationTariffLimits(
      createTierRow({
        id: "corp_enterprise",
        price_monthly: 80000,
        limits: {
          lms_unlocked: true,
          max_lessons: null,
        },
      }) as never,
    );

    expect(lms.can_create_structure).toBe(true);
    expect(lms.max_content_lessons).toBeNull();
    expect(lms.force_demo).toBe(false);

    expect(
      isContentEditingBlocked(lms, {
        filledLessonsCount: 999,
        currentLessonHasContent: false,
      }),
    ).toBe(false);
  });

  it("assertCanCreateStructure: пропускает не-free тариф", async () => {
    const supabase = createSupabaseMock({
      organizationTierId: "catalog-pro",
      tier: createTierRow({
        id: "catalog-pro",
        price_monthly: 9000,
        limits: { lms_unlocked: false, max_lessons: 3 },
      }),
    });

    const result = await assertCanCreateStructure(
      supabase as never,
      "org-1",
    );

    expect(result).toEqual({ ok: true });
  });
});

describe("isContentBlockFilled", () => {
  describe("text blocks", () => {
    it("returns false for empty string content", () => {
      expect(isContentBlockFilled("text", "")).toBe(false);
    });

    it("returns false for whitespace-only html", () => {
      expect(isContentBlockFilled("text", { html: "   " })).toBe(false);
    });

    it("returns false for empty paragraph tags", () => {
      expect(isContentBlockFilled("text", { html: "<p></p>" })).toBe(false);
      expect(isContentBlockFilled("text", { html: "<p><br></p>" })).toBe(false);
      expect(isContentBlockFilled("text", { html: "<p><br/></p>" })).toBe(false);
    });

    it("returns false for html with only non-breaking spaces", () => {
      expect(isContentBlockFilled("text", { html: "<p>&nbsp;</p>" })).toBe(
        false,
      );
      expect(isContentBlockFilled("text", { html: "<p>&#160;</p>" })).toBe(
        false,
      );
      expect(isContentBlockFilled("text", { html: "<p>\u00a0</p>" })).toBe(
        false,
      );
    });

    it("returns false for missing or empty html field", () => {
      expect(isContentBlockFilled("text", {})).toBe(false);
      expect(isContentBlockFilled("text", { html: "" })).toBe(false);
    });

    it("returns true for meaningful text content", () => {
      expect(
        isContentBlockFilled("text", { html: "<p>Real content</p>" }),
      ).toBe(true);
    });
  });

  describe("youtube and vimeo blocks", () => {
    it("returns false when url is missing or empty", () => {
      expect(isContentBlockFilled("youtube", {})).toBe(false);
      expect(isContentBlockFilled("vimeo", { url: "" })).toBe(false);
      expect(isContentBlockFilled("youtube", { url: "   " })).toBe(false);
    });

    it("returns true for a valid video url", () => {
      const videoUrl = "https://youtube.com/watch?v=dQw4w9WgXcQ";
      expect(isContentBlockFilled("youtube", { url: videoUrl })).toBe(true);
      expect(isContentBlockFilled("vimeo", { url: "https://vimeo.com/123" })).toBe(
        true,
      );
    });
  });

  it("returns false for unsupported block types", () => {
    expect(isContentBlockFilled("image", { imageUrl: "https://example.com/a.png" })).toBe(
      false,
    );
  });
});
