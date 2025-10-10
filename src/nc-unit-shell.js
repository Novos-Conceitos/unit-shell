/*! nc-unit-shell.js — Navbar/Footer dinâmicos por unidade (Webflow)
 *  Desenvolvido por Novos Conceitos
 *  Documentação: https://github.com/Novos-Conceitos/unit-shell
 */

(() => {
  // ===================== CONFIG =====================
  // Versão e duração do cache controláveis por projeto (via window.UnitShellConfig)
  function readGlobalCacheVersion() {
    try {
      if (
        window.UnitShellConfig &&
        typeof window.UnitShellConfig.cacheVersion === "string"
      ) {
        return window.UnitShellConfig.cacheVersion;
      }
    } catch {}
    return "v1";
  }

  function readGlobalCacheTTL() {
    try {
      if (
        window.UnitShellConfig &&
        typeof window.UnitShellConfig.cacheTTL === "number"
      ) {
        return window.UnitShellConfig.cacheTTL;
      }
    } catch {}
    // fallback: 12h
    return 1000 * 60 * 60 * 12;
  }

  const EFFECTIVE_CACHE_VERSION = readGlobalCacheVersion();
  const CACHE_PREFIX = `nc_unitCache_${EFFECTIVE_CACHE_VERSION}_`;
  const CACHE_TTL_MS = readGlobalCacheTTL();
  const LAST_UNIT_KEY = "nc_lastUnit";

  const BODY_UNIT_ATTR_SLUG = "data-unit-slug";
  const BODY_UNIT_ATTR_BASE = "data-unit-base";

  const COMPONENTS = [
    { source: "[data-unit-nav]", target: "[data-nav-target]", key: "nav" },
    {
      source: "[data-unit-footer]",
      target: "[data-footer-target]",
      key: "footer",
    },
  ];

  // ===================== HELPERS =====================
  const now = () => Date.now();

  function saveLastUnit(obj) {
    try {
      localStorage.setItem(LAST_UNIT_KEY, JSON.stringify(obj));
    } catch {}
  }

  function readLastUnit() {
    try {
      return JSON.parse(localStorage.getItem(LAST_UNIT_KEY) || "null");
    } catch {
      return null;
    }
  }

  // Monta URL da unidade, priorizando data-unit-base; se ausente, usa config global; senão fallback.
  function buildUnitURL(slug, baseFromDOM = null) {
    if (baseFromDOM) return `${String(baseFromDOM).replace(/\/$/, "")}/${slug}`;
    if (
      window.UnitShellConfig &&
      typeof window.UnitShellConfig.unitPathPrefix === "function"
    ) {
      return String(window.UnitShellConfig.unitPathPrefix(slug));
    }
    return `/${slug}`;
  }

  function makeCacheKey(lastUnit) {
    const baseKey = (lastUnit.base || "").replace(/\W+/g, "_");
    return `${CACHE_PREFIX}${baseKey}_${lastUnit.slug}`;
  }

  function saveCacheByKey(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify({ t: now(), data: payload }));
    } catch {}
  }

  function readCacheByKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { t, data } = JSON.parse(raw);
      if (!t || now() - t > CACHE_TTL_MS) return null;
      return data || null;
    } catch {
      return null;
    }
  }

  function reinitWebflowInteractions() {
    try {
      if (window.Webflow && window.Webflow.require) {
        const ix2 = window.Webflow.require("ix2");
        if (ix2 && ix2.init) ix2.init();
      }
    } catch {}
  }

  // ===================== FETCH & EXTRACT =====================
  async function fetchUnitPageHTML(lastUnit) {
    const url = buildUnitURL(lastUnit.slug, lastUnit.base);
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Falha ao carregar a página da unidade");
    return res.text();
  }

  function extractComponentsFromHTML(html) {
    const doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = html;
    const out = {};
    COMPONENTS.forEach(({ source, key }) => {
      const el = doc.querySelector(source);
      if (el) out[key] = el.outerHTML;
    });
    return out;
  }

  // ===================== ANCHORS =====================
  // Reescreve apenas âncoras locais (#id e /#id)
  function rewriteSelfAnchors(containerEl, lastUnit) {
    const baseURL = buildUnitURL(lastUnit.slug, lastUnit.base);
    containerEl.querySelectorAll("a[href]").forEach((a) => {
      const raw = (a.getAttribute("href") || "").trim();
      if (!raw) return;

      const lower = raw.toLowerCase();
      if (
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("mailto:") ||
        lower.startsWith("tel:") ||
        lower.startsWith("javascript:")
      )
        return;

      if (raw === "#") return;
      if (raw.startsWith("#")) {
        a.setAttribute("href", `${baseURL}${raw}`);
        return;
      }
      if (raw.startsWith("/#")) {
        a.setAttribute("href", `${baseURL}${raw.slice(1)}`);
        return;
      }
    });
  }

  // ===================== INJECTION =====================
  function injectHTML(targetSelector, html, lastUnit) {
    const target = document.querySelector(targetSelector);
    if (!target || !html) return false;

    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    rewriteSelfAnchors(tmp, lastUnit);
    target.innerHTML = tmp.innerHTML;
    return true;
  }

  function injectComponents(components, lastUnit) {
    let changed = false;
    COMPONENTS.forEach(({ target, key }) => {
      if (components && components[key]) {
        changed = injectHTML(target, components[key], lastUnit) || changed;
      }
    });
    if (changed) reinitWebflowInteractions();
  }

  // ===================== MAIN =====================
  document.addEventListener("DOMContentLoaded", async () => {
    // Evita execução no Designer/Editor
    if (
      window.Webflow &&
      window.Webflow.env &&
      (Webflow.env("design") || Webflow.env("editor"))
    )
      return;

    const body = document.body;
    const currentSlug = body.getAttribute(BODY_UNIT_ATTR_SLUG);

    // Página da unidade: salva slug/base e preenche cache local
    if (currentSlug) {
      const currentBase = body.getAttribute(BODY_UNIT_ATTR_BASE) || null;
      const lastUnit = { slug: currentSlug, base: currentBase };
      saveLastUnit(lastUnit);

      const parts = {};
      COMPONENTS.forEach(({ source, key }) => {
        const el = document.querySelector(source);
        if (el) parts[key] = el.outerHTML;
      });

      if (Object.keys(parts).length) {
        const key = makeCacheKey(lastUnit);
        saveCacheByKey(key, parts);
      }
      return;
    }

    // Outras páginas: injeta navbar/footer da última unidade
    const lastUnit = readLastUnit();
    if (!lastUnit || !lastUnit.slug) return;

    const key = makeCacheKey(lastUnit);
    const cached = readCacheByKey(key);
    if (cached) {
      injectComponents(cached, lastUnit);
      return;
    }

    try {
      const html = await fetchUnitPageHTML(lastUnit);
      const parts = extractComponentsFromHTML(html);
      if (Object.keys(parts).length) {
        saveCacheByKey(key, parts);
        injectComponents(parts, lastUnit);
      }
    } catch {
      // mantém navbar/footer padrão
    }
  });

  // ===================== UTILITÁRIOS =====================
  window.UnitShell = {
    clearCache: () => {
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
        });
        localStorage.removeItem(LAST_UNIT_KEY);
      } catch {}
    },
    cacheVersion: EFFECTIVE_CACHE_VERSION,
    cacheTTL: CACHE_TTL_MS,
  };
})();