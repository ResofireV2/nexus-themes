(function () {
  "use strict";

  const NE      = window.NexusExtensions;
  const React   = window.React;
  const { useState, useEffect, useCallback, useRef } = React;
  const { toast, Select } = window.NexusComponents;
  const SLUG    = "theme-showcase";

  // ---------------------------------------------------------------------------
  // API helpers
  // ---------------------------------------------------------------------------

  function apiHeaders() {
    const token = localStorage.getItem("nexus_token");
    return token
      ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`/ext/${SLUG}/api${path}`, {
      headers: apiHeaders(),
      ...opts,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Explore item — "Themes" in the left sidebar
  // ---------------------------------------------------------------------------

  NE.registerExploreItem({
    slug:     SLUG,
    path:     "/",
    label:    "Themes",
    icon:     "fa-palette",
    priority: 60,
  });

// ---------------------------------------------------------------------------
  // Public Themes page — /ext/theme-showcase
  // ---------------------------------------------------------------------------

  function ThemesPage({ currentUser }) {
    const [themes, setThemes]   = useState(null);
    const [error, setError]     = useState(null);
    const [search, setSearch]   = useState("");
    const [filter, setFilter]   = useState("all");   // all | dark | light
    const [sort, setSort]       = useState("latest"); // latest | oldest | az

    useEffect(() => {
      fetch(`/ext/${SLUG}/api/themes`, {
        headers: (() => {
          const t = localStorage.getItem("nexus_token");
          return t ? { "Authorization": `Bearer ${t}` } : {};
        })(),
      })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => setThemes(d.themes || []))
        .catch(() => setError("Failed to load themes."));
    }, []);

    const filtered = React.useMemo(() => {
      if (!themes) return [];
      let list = [...themes];

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(t =>
          (t.name   || "").toLowerCase().includes(q) ||
          (t.author || "").toLowerCase().includes(q)
        );
      }

      if (filter === "dark")  list = list.filter(t => t.mode === "dark"  || t.mode === "both");
      if (filter === "light") list = list.filter(t => t.mode === "light" || t.mode === "both");

      if (sort === "latest") list.sort((a, b) => new Date(b.inserted_at) - new Date(a.inserted_at));
      if (sort === "oldest") list.sort((a, b) => new Date(a.inserted_at) - new Date(b.inserted_at));
      if (sort === "az")     list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      return list;
    }, [themes, search, filter, sort]);

    if (error) return React.createElement("div", {
      style: { padding: "3rem 0", textAlign: "center", color: "var(--t4)", fontSize: 14 }
    }, error);

    if (!themes) return React.createElement("div", {
      style: { padding: "3rem 0", textAlign: "center", color: "var(--t4)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }
    },
      React.createElement("i", { className: "ti ti-loader-2 spin" }),
      "Loading…"
    );

    return React.createElement("div", { style: { paddingTop: 24, paddingBottom: 40 } },

      // Page header
      React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("h1", {
          style: { fontSize: 22, fontWeight: 600, color: "var(--t1)", margin: "0 0 4px" }
        }, "Themes"),
        React.createElement("p", {
          style: { fontSize: 14, color: "var(--t3)", margin: 0 }
        }, "Explore visual styles available for Nexus")
      ),

      // Search + filter + sort row
      React.createElement("div", {
        style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }
      },
        // Search input
        React.createElement("div", { style: { position: "relative", flex: "0 0 200px" } },
          React.createElement("i", {
            className: "ti ti-search",
            style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--t4)", pointerEvents: "none" }
          }),
          React.createElement("input", {
            value: search,
            onChange: e => setSearch(e.target.value),
            placeholder: "Search themes…",
            style: {
              width: "100%", fontSize: 13, padding: "6px 10px 6px 30px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--b2)",
              background: "var(--s2)", color: "var(--t1)",
              boxSizing: "border-box",
              outline: "none",
            }
          })
        ),

        // Divider
        React.createElement("div", { style: { width: 1, height: 18, background: "var(--b1)" } }),

        // Filter pills
        ...["all", "dark", "light"].map(f =>
          React.createElement("button", {
            key: f,
            onClick: () => setFilter(f),
            style: {
              fontSize: 12, padding: "4px 12px", borderRadius: 99,
              border: filter === f ? "0.5px solid var(--b2)" : "0.5px solid var(--b1)",
              background: filter === f ? "var(--s2)" : "transparent",
              color: filter === f ? "var(--t1)" : "var(--t3)",
              cursor: "pointer",
              textTransform: "capitalize",
            }
          }, f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1))
        ),

        // Divider
        React.createElement("div", { style: { width: 1, height: 18, background: "var(--b1)" } }),

        // Sort pills
        ...[ ["latest", "Latest"], ["oldest", "Oldest"], ["az", "A–Z"] ].map(([val, label]) =>
          React.createElement("button", {
            key: val,
            onClick: () => setSort(val),
            style: {
              fontSize: 12, padding: "4px 12px", borderRadius: 99,
              border: sort === val ? "0.5px solid var(--b2)" : "0.5px solid var(--b1)",
              background: sort === val ? "var(--s2)" : "transparent",
              color: sort === val ? "var(--t1)" : "var(--t3)",
              cursor: "pointer",
            }
          }, label)
        )
      ),

      // Empty state
      filtered.length === 0 && React.createElement("div", {
        style: { padding: "4rem 0", textAlign: "center", color: "var(--t4)", fontSize: 14 }
      },
        React.createElement("i", { className: "ti ti-palette", style: { fontSize: 32, display: "block", marginBottom: 10, opacity: 0.3 } }),
        themes.length === 0 ? "No themes have been added yet." : "No themes match your search."
      ),

      // Card grid
      filtered.length > 0 && React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }
      },
        ...filtered.map(theme =>
          React.createElement(ThemeCard, {
            key: theme.id,
            theme,
          })
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Theme card
  // ---------------------------------------------------------------------------

  function ThemeCard({ theme }) {
    return React.createElement("div", {
      style: {
        background: "var(--s1)",
        border: "0.5px solid var(--b1)",
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
        cursor: "default",
      }
    },
      // Thumbnail — real image or generated mock
      React.createElement("div", {
        style: { width: "100%", aspectRatio: "16/10", position: "relative", overflow: "hidden" }
      },
        theme.thumbnail_url
          ? React.createElement("img", {
              src: theme.thumbnail_url,
              alt: theme.name,
              style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
            })
          : React.createElement(ThumbMock, { cssVars: theme.css_vars })
      ),

      // Card body
      React.createElement("div", { style: { padding: "10px 12px 12px" } },
        React.createElement("p", {
          style: { fontSize: 13, fontWeight: 500, color: "var(--t1)", margin: "0 0 2px" }
        }, theme.name || "Untitled"),
        React.createElement("p", {
          style: { fontSize: 11, color: "var(--t3)", margin: "0 0 8px" }
        }, [theme.author && `by ${theme.author}`, theme.mode].filter(Boolean).join(" · ")),

        // Swatches
        React.createElement(Swatches, { cssVars: theme.css_vars }),

        // Preview button — stub, wired in Stage 5
        React.createElement("button", {
          className: "btn-ghost",
          style: { width: "100%", fontSize: 12, padding: "5px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
          onClick: () => toast("Preview coming in the next update", "warn"),
        },
          React.createElement("i", { className: "ti ti-eye", style: { fontSize: 13 } }),
          "Preview theme"
        )
      )
    );
  }

  NE.registerRoute(SLUG, "/", ThemesPage, { title: "Themes" });

  // ---------------------------------------------------------------------------
  // Colour swatch preview — mini forum mock built from css_vars
  // ---------------------------------------------------------------------------

  function ThumbMock({ cssVars }) {
    const v   = cssVars || {};
    const bg  = v["--bg"]  || v["--s1"] || "#1a1a2e";
    const s1  = v["--s1"]  || "#16213e";
    const s2  = v["--s2"]  || "#0f3460";
    const ac  = v["--ac"]  || "#7F77DD";
    const t1  = v["--t1"]  || "#e2e2e2";

    return React.createElement("div", {
      style: {
        width: "100%", height: "100%", display: "flex",
        flexDirection: "column", background: bg,
      }
    },
      // Topbar
      React.createElement("div", {
        style: {
          height: "18%", background: s1, display: "flex",
          alignItems: "center", padding: "0 8px", gap: 4,
        }
      },
        React.createElement("div", {
          style: { width: 5, height: 5, borderRadius: "50%", background: ac },
        }),
        React.createElement("div", {
          style: {
            flex: 1, height: 3, background: "rgba(128,128,128,0.2)",
            borderRadius: 2, marginLeft: 4,
          },
        })
      ),
      // Body
      React.createElement("div", {
        style: { flex: 1, display: "flex" }
      },
        // Sidebar
        React.createElement("div", {
          style: {
            width: "26%", background: s1, padding: "6px 5px",
            display: "flex", flexDirection: "column", gap: 4,
            borderRight: "0.5px solid rgba(128,128,128,0.1)",
          }
        },
          React.createElement("div", { style: { height: 5, borderRadius: 2, background: ac, width: "80%" } }),
          React.createElement("div", { style: { height: 5, borderRadius: 2, background: "rgba(128,128,128,0.25)", width: "65%" } }),
          React.createElement("div", { style: { height: 5, borderRadius: 2, background: "rgba(128,128,128,0.25)", width: "70%" } }),
        ),
        // Main
        React.createElement("div", {
          style: { flex: 1, padding: 5, display: "flex", flexDirection: "column", gap: 4 }
        },
          React.createElement("div", {
            style: { background: s2, borderRadius: 3, padding: "4px 5px", display: "flex", flexDirection: "column", gap: 3 }
          },
            React.createElement("div", { style: { height: 3, borderRadius: 2, background: t1, width: "70%" } }),
            React.createElement("div", { style: { height: 3, borderRadius: 2, background: t1, opacity: 0.45, width: "90%" } }),
            React.createElement("div", { style: { height: 3, borderRadius: 2, background: t1, opacity: 0.45, width: "55%" } }),
          ),
          React.createElement("div", {
            style: { background: s2, borderRadius: 3, padding: "4px 5px", display: "flex", flexDirection: "column", gap: 3 }
          },
            React.createElement("div", { style: { height: 3, borderRadius: 2, background: t1, width: "60%" } }),
            React.createElement("div", { style: { height: 3, borderRadius: 2, background: t1, opacity: 0.45, width: "80%" } }),
          )
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Colour swatches row
  // ---------------------------------------------------------------------------

  function Swatches({ cssVars }) {
    const v = cssVars || {};
    const colours = [v["--bg"], v["--ac"], v["--s1"], v["--t1"]].filter(Boolean);
    return React.createElement("div", {
      style: { display: "flex", gap: 4, marginBottom: 8 }
    },
      ...colours.map((c, i) =>
        React.createElement("div", {
          key: i,
          style: {
            width: 12, height: 12, borderRadius: "50%",
            background: c,
            border: "0.5px solid var(--b2)",
          },
        })
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  function EmptyState({ onNew }) {
    return React.createElement("div", {
      style: {
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 10, color: "var(--t3)", padding: "2rem",
      }
    },
      React.createElement("i", { className: "ti ti-palette", style: { fontSize: 32, opacity: 0.4 } }),
      React.createElement("p", { style: { fontSize: 13, margin: 0 } }, "No themes yet."),
      React.createElement("button", {
        className: "btn-primary",
        style: { fontSize: 12, padding: "5px 14px" },
        onClick: onNew,
      }, "Add your first theme")
    );
  }

  // ---------------------------------------------------------------------------
  // Theme form (create / edit)
  // ---------------------------------------------------------------------------

  const BLANK_FORM = {
    name: "", author: "", description: "",
    mode: "dark", status: "draft",
    css_vars: {}, stylesheet_url: "",
    github_repo: "", thumbnail_url: null,
  };

  function ThemeForm({ theme, onSaved, onDeleted, onCancel }) {
    const isNew = !theme;

    const [form, setForm]         = useState(() => {
      if (!theme) return { ...BLANK_FORM };
      return {
        name:           theme.name        || "",
        author:         theme.author      || "",
        description:    theme.description || "",
        mode:           theme.mode        || "dark",
        status:         theme.status      || "draft",
        css_vars:       theme.css_vars    || {},
        stylesheet_url: theme.stylesheet_url || "",
        github_repo:    theme.github_repo || "",
        thumbnail_url:  theme.thumbnail_url || null,
      };
    });
    const [cssVarsText, setCssVarsText]   = useState(
      () => theme?.css_vars ? JSON.stringify(theme.css_vars, null, 2) : ""
    );
    const [cssVarsError, setCssVarsError] = useState(null);
    const [githubUrl, setGithubUrl]       = useState("");
    const [fetching, setFetching]         = useState(false);
    const [saving, setSaving]             = useState(false);
    const [deleting, setDeleting]         = useState(false);
    const [thumbUploading, setThumbUploading] = useState(false);
    const fileInputRef = useRef();

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    // Sync cssVarsText -> form.css_vars
    function handleCssVarsChange(text) {
      setCssVarsText(text);
      try {
        const parsed = text.trim() ? JSON.parse(text) : {};
        set("css_vars", parsed);
        setCssVarsError(null);
      } catch {
        setCssVarsError("Invalid JSON");
      }
    }

    // GitHub fetch
    async function handleFetch() {
      if (!githubUrl.trim()) return;
      setFetching(true);
      try {
        const data = await apiFetch("/admin/themes/fetch-github", {
          method: "POST",
          body: JSON.stringify({ url: githubUrl.trim() }),
        });
        setForm(f => ({
          ...f,
          name:           data.name        || f.name,
          author:         data.author      || f.author,
          description:    data.description || f.description,
          mode:           data.mode        || f.mode,
          css_vars:       data.css_vars    || f.css_vars,
          stylesheet_url: data.stylesheet_url || f.stylesheet_url,
          github_repo:    data.github_repo || f.github_repo,
        }));
        if (data.css_vars) {
          setCssVarsText(JSON.stringify(data.css_vars, null, 2));
          setCssVarsError(null);
        }
        toast("Theme data fetched from GitHub");
      } catch (e) {
        toast(e.message || "Fetch failed", "err");
      } finally {
        setFetching(false);
      }
    }

    // Thumbnail upload
    async function handleThumbUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      setThumbUploading(true);
      try {
        const result = await NE.uploadFile(file, {
          slug: SLUG,
          type: "extension_image",
          recordId: theme ? String(theme.id) : "new",
        });
        if (result.error) throw new Error(result.error);
        set("thumbnail_url", result.url);
        toast("Thumbnail uploaded");
      } catch (e) {
        toast(e.message || "Upload failed", "err");
      } finally {
        setThumbUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }

    // Save
    async function handleSave(publishStatus) {
      if (cssVarsError) { toast("Fix CSS vars JSON before saving", "err"); return; }
      setSaving(true);
      const payload = { ...form, status: publishStatus };
      // stylesheet_url: if fetched from GitHub, stored on server; send as-is
      try {
        if (isNew) {
          const { theme: saved } = await apiFetch("/admin/themes", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast("Theme created");
          onSaved(saved);
        } else {
          const { theme: saved } = await apiFetch(`/admin/themes/${theme.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          toast("Theme saved");
          onSaved(saved);
        }
      } catch (e) {
        toast(e.message || "Save failed", "err");
      } finally {
        setSaving(false);
      }
    }

    // Delete
    async function handleDelete() {
      if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
      setDeleting(true);
      try {
        await apiFetch(`/admin/themes/${theme.id}`, { method: "DELETE" });
        toast("Theme deleted");
        onDeleted(theme.id);
      } catch (e) {
        toast(e.message || "Delete failed", "err");
      } finally {
        setDeleting(false);
      }
    }

    const labelStyle  = { fontSize: 13, color: "var(--t3)", marginBottom: 5, display: "block" };
    const inputStyle  = {
      width: "100%", fontSize: 14, padding: "8px 12px",
      borderRadius: 10,
      border: "0.5px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)", color: "var(--t1)",
      boxSizing: "border-box",
    };
    const row2Style   = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
    const fieldStyle  = { marginBottom: 14 };

    return React.createElement("div", {
      style: {
        flex: 1, background: "var(--s1)",
        border: "0.5px solid var(--b1)",
        borderRadius: "var(--border-radius-lg)",
        padding: "14px 16px",
        overflowY: "auto",
      }
    },
      // Header
      React.createElement("div", {
        style: {
          fontSize: 15, fontWeight: 500, color: "var(--t1)",
          marginBottom: 14, paddingBottom: 12,
          borderBottom: "0.5px solid var(--b1)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }
      },
        React.createElement("span", null, isNew ? "New theme" : (form.name || "Edit theme")),
        form.status === "published" && React.createElement("span", {
          style: {
            fontSize: 11, padding: "3px 10px", borderRadius: 99,
            background: "rgba(16,185,129,0.12)", color: "var(--green)",
          }
        }, "published")
      ),

      // GitHub import section
      React.createElement("div", {
        style: {
          background: "var(--s2)", borderRadius: "var(--border-radius-md)",
          padding: "10px 12px", marginBottom: 12,
        }
      },
        React.createElement("label", { style: { ...labelStyle, fontSize: 13 } }, "Import from GitHub"),
        React.createElement("div", { style: { display: "flex", gap: 8 } },
          React.createElement("input", {
            style: { ...inputStyle, flex: 1 },
            value: githubUrl,
            onChange: e => setGithubUrl(e.target.value),
            placeholder: "https://github.com/author/nexus-my-theme",
            onKeyDown: e => e.key === "Enter" && handleFetch(),
          }),
          React.createElement("button", {
            className: "btn-ghost",
            style: { fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" },
            onClick: handleFetch,
            disabled: fetching || !githubUrl.trim(),
          },
            fetching
              ? React.createElement("i", { className: "ti ti-loader-2 spin", style: { fontSize: 13 } })
              : React.createElement(React.Fragment, null,
                  React.createElement("i", { className: "ti ti-download", style: { fontSize: 12, marginRight: 4 } }),
                  "Fetch"
                )
          )
        ),
        React.createElement("p", {
          style: { fontSize: 12, color: "var(--t4)", margin: "6px 0 0" }
        }, "Fetches the latest release, extracts theme.json and theme.css, and pre-fills the form.")
      ),

      // Name + Author
      React.createElement("div", { style: row2Style },
        React.createElement("div", { style: fieldStyle },
          React.createElement("label", { style: labelStyle }, "Theme name"),
          React.createElement("input", {
            style: inputStyle, value: form.name,
            onChange: e => set("name", e.target.value),
            placeholder: "My Theme",
          })
        ),
        React.createElement("div", { style: fieldStyle },
          React.createElement("label", { style: labelStyle }, "Author"),
          React.createElement("input", {
            style: inputStyle, value: form.author,
            onChange: e => set("author", e.target.value),
            placeholder: "username",
          })
        )
      ),

      // Description
      React.createElement("div", { style: fieldStyle },
        React.createElement("label", { style: labelStyle }, "Description"),
        React.createElement("input", {
          style: inputStyle, value: form.description,
          onChange: e => set("description", e.target.value),
          placeholder: "A short description of the theme",
        })
      ),

      // Mode + GitHub repo
      React.createElement("div", { style: row2Style },
        React.createElement("div", { style: fieldStyle },
          React.createElement("label", { style: labelStyle }, "Mode"),
          React.createElement(Select, {
            value: form.mode,
            onChange: v => set("mode", v),
            options: [
              { value: "dark",  label: "Dark" },
              { value: "light", label: "Light" },
              { value: "both",  label: "Both" },
            ],
            style: { ...inputStyle, padding: "5px 8px" },
          })
        ),
        React.createElement("div", { style: fieldStyle },
          React.createElement("label", { style: labelStyle }, "GitHub repo"),
          React.createElement("input", {
            style: { ...inputStyle, color: "var(--t3)", fontSize: 11 },
            value: form.github_repo,
            onChange: e => set("github_repo", e.target.value),
            placeholder: "author/repo-name",
          })
        )
      ),

      // CSS vars
      React.createElement("div", { style: fieldStyle },
        React.createElement("label", { style: { ...labelStyle, display: "flex", justifyContent: "space-between" } },
          React.createElement("span", null, "CSS variables (JSON)"),
          cssVarsError && React.createElement("span", { style: { color: "var(--red)", fontSize: 12 } }, cssVarsError)
        ),
        React.createElement("textarea", {
          style: {
            ...inputStyle, fontFamily: "monospace", fontSize: 11,
            resize: "vertical", minHeight: 60,
            color: cssVarsError ? "var(--red)" : "var(--t2)",
          },
          value: cssVarsText,
          onChange: e => handleCssVarsChange(e.target.value),
          placeholder: '{"--bg":"#0d0d14","--ac":"#7F77DD"}',
          spellCheck: false,
        })
      ),

      // Stylesheet URL (read-only if fetched from GitHub)
      React.createElement("div", { style: fieldStyle },
        React.createElement("label", { style: labelStyle },
          form.github_repo ? "Stylesheet — served locally" : "Stylesheet URL"
        ),
        React.createElement("input", {
          style: {
            ...inputStyle,
            color: "var(--t3)", fontSize: 11, fontFamily: "monospace",
          },
          value: form.stylesheet_url || "",
          onChange: e => set("stylesheet_url", e.target.value),
          placeholder: "https://example.com/theme.css or auto-filled from GitHub",
          readOnly: !!form.github_repo,
        })
      ),

      // Thumbnail
      React.createElement("div", { style: fieldStyle },
        React.createElement("label", { style: labelStyle }, "Thumbnail"),
        React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-start" } },

          // Preview or placeholder
          React.createElement("div", {
            style: {
              flex: "0 0 120px", aspectRatio: "16/10", borderRadius: "var(--border-radius-md)",
              overflow: "hidden", border: "0.5px solid var(--b1)", position: "relative",
            }
          },
            form.thumbnail_url
              ? React.createElement("img", {
                  src: form.thumbnail_url,
                  style: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
                  alt: "thumbnail",
                })
              : React.createElement(ThumbMock, { cssVars: form.css_vars })
          ),

          // Upload zone
          React.createElement("div", {
            style: {
              flex: 1,
              border: "0.5px dashed var(--b2)",
              borderRadius: "var(--border-radius-md)",
              minHeight: 76,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, cursor: "pointer",
              background: "var(--s2)",
            },
            onClick: () => fileInputRef.current?.click(),
          },
            thumbUploading
              ? React.createElement("i", { className: "ti ti-loader-2 spin", style: { fontSize: 20, color: "var(--t3)" } })
              : React.createElement(React.Fragment, null,
                  React.createElement("i", { className: "ti ti-photo-up", style: { fontSize: 20, color: "var(--t3)" } }),
                  React.createElement("span", { style: { fontSize: 13, color: "var(--t3)" } },
                    form.thumbnail_url ? "Replace thumbnail" : "Upload thumbnail"
                  ),
                  React.createElement("span", { style: { fontSize: 11, color: "var(--t4)" } }, "PNG or WebP · 800×500 px")
                )
          ),
          React.createElement("input", {
            ref: fileInputRef, type: "file",
            accept: "image/png,image/webp,image/jpeg",
            style: { display: "none" },
            onChange: handleThumbUpload,
          })
        )
      ),

      // Footer actions
      React.createElement("div", {
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 12, paddingTop: 10, borderTop: "0.5px solid var(--b1)",
        }
      },
        // Left: delete or cancel
        !isNew
          ? React.createElement("button", {
              onClick: handleDelete,
              disabled: deleting,
              style: {
                fontSize: 11, padding: "4px 10px",
                borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--b1)",
                background: "transparent", color: "var(--red)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }
            },
              React.createElement("i", { className: "ti ti-trash", style: { fontSize: 11 } }),
              deleting ? "Deleting…" : "Delete"
            )
          : React.createElement("button", {
              onClick: onCancel,
              style: {
                fontSize: 11, padding: "4px 10px",
                borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--b1)",
                background: "transparent", color: "var(--t3)",
                cursor: "pointer",
              }
            }, "Cancel"),

        // Right: save actions
        React.createElement("div", { style: { display: "flex", gap: 8 } },
          React.createElement("button", {
            onClick: () => handleSave("draft"),
            disabled: saving,
            style: {
              fontSize: 11, padding: "4px 12px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--b2)",
              background: "transparent", color: "var(--t2)",
              cursor: "pointer",
            }
          }, saving ? "Saving…" : "Save as draft"),
          React.createElement("button", {
            onClick: () => handleSave("published"),
            disabled: saving,
            style: {
              fontSize: 11, padding: "4px 12px",
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--ac)",
              background: "transparent", color: "var(--ac-text)",
              cursor: "pointer",
            }
          }, saving ? "Saving…" : "Save & publish")
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Admin panel — list + form
  // ---------------------------------------------------------------------------

  function ThemeAdminPanel() {
    const [themes, setThemes]       = useState(null); // null = loading
    const [selected, setSelected]   = useState(null); // theme id or "new"
    const [error, setError]         = useState(null);

    const load = useCallback(async () => {
      try {
        const { themes } = await apiFetch("/admin/themes");
        setThemes(themes);
        setError(null);
      } catch (e) {
        setError(e.message || "Failed to load themes");
      }
    }, []);

    useEffect(() => { load(); }, [load]);

    function handleNew() { setSelected("new"); }

    function handleSaved(saved) {
      setThemes(prev => {
        if (!prev) return [saved];
        const existing = prev.find(t => t.id === saved.id);
        return existing
          ? prev.map(t => t.id === saved.id ? saved : t)
          : [saved, ...prev];
      });
      setSelected(saved.id);
    }

    function handleDeleted(id) {
      setThemes(prev => (prev || []).filter(t => t.id !== id));
      setSelected(null);
    }

    const selectedTheme = selected === "new"
      ? null
      : (themes || []).find(t => t.id === selected) || null;

    if (error) {
      return React.createElement("div", {
        style: { padding: "2rem", color: "var(--red)", fontSize: 13 }
      }, error);
    }

    if (themes === null) {
      return React.createElement("div", {
        style: {
          padding: "2rem", display: "flex", alignItems: "center",
          gap: 8, color: "var(--t3)", fontSize: 13,
        }
      },
        React.createElement("i", { className: "ti ti-loader-2 spin" }),
        "Loading…"
      );
    }

    return React.createElement("div", {
      style: { display: "flex", gap: 14, alignItems: "flex-start", height: "100%" }
    },

      // Left: theme list
      React.createElement("div", {
        style: { flex: "0 0 200px", display: "flex", flexDirection: "column", gap: 6 }
      },
        React.createElement("div", {
          style: {
            fontSize: 10, fontWeight: 500, color: "var(--t3)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 2,
          }
        }, "Themes"),

        themes.length === 0 && selected !== "new"
          ? null
          : themes.map(t =>
              React.createElement("div", {
                key: t.id,
                onClick: () => setSelected(t.id),
                style: {
                  background: selected === t.id ? "rgba(127,119,221,0.08)" : "var(--s1)",
                  border: selected === t.id
                    ? "0.5px solid var(--ac)"
                    : "0.5px solid var(--b1)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "9px 11px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 9,
                }
              },
                // Colour swatch
                React.createElement("div", {
                  style: {
                    width: 34, height: 22, borderRadius: 3, flexShrink: 0,
                    overflow: "hidden", border: "0.5px solid var(--b1)",
                    background: t.css_vars?.["--bg"] || "var(--s2)",
                  }
                },
                  t.thumbnail_url
                    ? React.createElement("img", {
                        src: t.thumbnail_url,
                        style: { width: "100%", height: "100%", objectFit: "cover" },
                        alt: "",
                      })
                    : null
                ),
                React.createElement("div", null,
                  React.createElement("div", {
                    style: {
                      fontSize: 12, fontWeight: 500,
                      color: selected === t.id ? "var(--ac-text)" : "var(--t1)",
                    }
                  }, t.name || "Untitled"),
                  React.createElement("div", {
                    style: {
                      fontSize: 10,
                      color: selected === t.id ? "var(--ac)" : "var(--t3)",
                    }
                  }, `${t.mode} · ${t.status}`)
                )
              )
            ),

        React.createElement("button", {
          onClick: handleNew,
          style: {
            fontSize: 11, padding: "7px 10px",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--b2)",
            background: "transparent", color: "var(--t2)",
            cursor: "pointer",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 5, width: "100%",
          }
        },
          React.createElement("i", { className: "ti ti-plus", style: { fontSize: 12 } }),
          "New theme"
        )
      ),

      // Right: form or empty state
      selected
        ? React.createElement(ThemeForm, {
            key: selected,
            theme: selectedTheme,
            onSaved: handleSaved,
            onDeleted: handleDeleted,
            onCancel: () => setSelected(null),
          })
        : themes.length === 0
          ? React.createElement(EmptyState, { onNew: handleNew })
          : React.createElement("div", {
              style: {
                flex: 1, display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--t4)", fontSize: 13,
              }
            }, "Select a theme to edit, or add a new one.")
    );
  }

  NE.registerAdminPanel(SLUG, {
    label:     "Theme Showcase",
    icon:      "fa-palette",
    component: ThemeAdminPanel,
  });

})();
