import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

// Accessibility smoke suite (ROADMAP-PHASE7.md Task 7.4.4). @axe-core/playwright
// was installed as a devDependency but never wired into a test — this closes
// that gap. Same "runs against a real server + live Supabase project"
// constraint as e2e/rbac.spec.ts (see playwright.config.ts).
//
// Scoped to the public storefront (unauthenticated, no seed-account
// dependency) — the highest-traffic, customer-facing surface and the one
// named explicitly in the original Phase 7 plan. Dashboard/admin a11y is a
// natural follow-up once this pattern is proven, reusing
// loginAndClearForcedPasswordChange from rbac.spec.ts.
//
// wcag2a/wcag2aa/wcag21aa tags match the project's stated WCAG 2.2 AA target
// (see the accessibility skill in .claude/); best-practice rules are
// excluded so this doesn't fail on axe's non-normative opinions.

const STOREFRONT_SLUG = "orendezvous";

const PAGES = [
  { name: "home", path: `/${STOREFRONT_SLUG}` },
  { name: "menu", path: `/${STOREFRONT_SLUG}/menu` },
  { name: "about", path: `/${STOREFRONT_SLUG}/about` },
  { name: "contact", path: `/${STOREFRONT_SLUG}/contact` },
  { name: "reservation", path: `/${STOREFRONT_SLUG}/reservation` },
];

for (const { name, path } of PAGES) {
  test(`storefront ${name} (${path}) has no serious/critical a11y violations`, async ({
    page,
  }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (serious.length > 0) {
      const details = serious
        .map(
          (v) =>
            `\n  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n    ${v.helpUrl}`,
        )
        .join("");
      console.log(`Accessibility violations on ${path}:${details}`);
    }

    expect(serious, `serious/critical violations on ${path}`).toEqual([]);
  });
}
