(function () {
  "use strict";

  const NE   = window.NexusExtensions;
  const SLUG = "theme-showcase";

  // ---------------------------------------------------------------------------
  // Explore item — "Themes" in the left sidebar
  // ---------------------------------------------------------------------------

  NE.registerExploreItem({
    slug:     SLUG,
    path:     "/",
    label:    "Themes",
    icon:     "fa-palette",
    priority: 60
  });

  // ---------------------------------------------------------------------------
  // Route — /ext/theme-showcase
  // placeholder component rendered until Stage 4
  // ---------------------------------------------------------------------------

  function ThemesPagePlaceholder() {
    return window.React.createElement(
      "div",
      { style: { padding: "2rem", color: "var(--t2)", fontSize: 14 } },
      "Theme Showcase — coming soon."
    );
  }

  NE.registerRoute(SLUG, "/", ThemesPagePlaceholder, { title: "Themes" });

  // ---------------------------------------------------------------------------
  // Admin panel — placeholder until Stage 2
  // ---------------------------------------------------------------------------

  function ThemeAdminPlaceholder() {
    return window.React.createElement(
      "div",
      { style: { padding: "2rem", color: "var(--t2)", fontSize: 14 } },
      "Theme Showcase admin panel — coming soon."
    );
  }

  NE.registerAdminPanel(SLUG, {
    label:     "Theme Showcase",
    icon:      "fa-palette",
    component: ThemeAdminPlaceholder
  });

})();
