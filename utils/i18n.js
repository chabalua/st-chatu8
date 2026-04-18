/**
 * st-chatu8 i18n (Internationalization) Module
 *
 * Supported languages:
 *   zh  – 简体中文 (default)
 *   vi  – Tiếng Việt
 *
 * How it works:
 *   1. On init, the saved language (localStorage key "chatu8_lang") is loaded.
 *      If none is found, Chinese ("zh") is used.
 *   2. All DOM elements that carry a  data-i18n  attribute are translated.
 *   3. A MutationObserver keeps watching for newly added nodes so that
 *      dynamically loaded tab content is translated automatically.
 *   4. Calling  window.chatu8_i18n.setLanguage(lang)  switches the language
 *      at runtime and re-translates the whole document.
 *
 * Adding / editing translations:
 *   Open  i18n/zh.json  or  i18n/vi.json  and edit the key-value pairs.
 *   To add a new language, create  i18n/<code>.json  with the same keys
 *   and add a corresponding <option> to the language selector in
 *   html/settings/main.html.
 *
 * Usage in HTML:
 *   <!-- translate text content -->
 *   <label data-i18n="main_label_enabled">启用插件</label>
 *
 *   <!-- translate title attribute -->
 *   <button data-i18n-title="btn_toggle_theme" title="切换主题">…</button>
 *
 *   <!-- translate placeholder attribute -->
 *   <input data-i18n-placeholder="some_key" placeholder="…">
 */

const EXTENSION_PATH =
    '/scripts/extensions/third-party/st-chatu8';

const STORAGE_KEY = 'chatu8_lang';
const DEFAULT_LANG = 'zh';

const chatu8_i18n = {
    /** Currently active language code, e.g. "zh" or "vi". */
    currentLang: DEFAULT_LANG,

    /** Flat key→string map for the active language. */
    translations: {},

    // ------------------------------------------------------------------ //
    //  Core API                                                            //
    // ------------------------------------------------------------------ //

    /**
     * Translate a single key.
     * Falls back to `fallback` if provided, then to the key itself.
     *
     * @param {string} key
     * @param {string} [fallback]
     * @returns {string}
     */
    t(key, fallback) {
        return this.translations[key] ?? fallback ?? key;
    },

    /**
     * Load a language file, apply translations, and persist the choice.
     *
     * @param {string} lang  Language code ("zh", "vi", …)
     */
    async setLanguage(lang) {
        try {
            const url = `${EXTENSION_PATH}/i18n/${lang}.json`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem(STORAGE_KEY, lang);

            // Re-translate the whole document on language switch.
            this.applyTranslations(document);

            // Keep the language selector in sync (may be in multiple tabs).
            document
                .querySelectorAll('.chatu8-lang-select')
                .forEach(el => { el.value = lang; });

            console.log(`[st-chatu8 i18n] Language set to "${lang}".`);
        } catch (err) {
            console.error('[st-chatu8 i18n] Failed to load language:', err);
        }
    },

    // ------------------------------------------------------------------ //
    //  DOM helpers                                                         //
    // ------------------------------------------------------------------ //

    /**
     * Apply translations to all eligible elements inside `rootEl`.
     *
     * @param {Document|Element} rootEl
     */
    applyTranslations(rootEl) {
        const query = (sel, fn) =>
            rootEl.querySelectorAll
                ? rootEl.querySelectorAll(sel).forEach(fn)
                : document.querySelectorAll(sel).forEach(fn);

        // Text content
        query('[data-i18n]', el => {
            const key = el.getAttribute('data-i18n');
            const val = this.translations[key];
            if (val !== undefined) el.textContent = val;
        });

        // title attribute
        query('[data-i18n-title]', el => {
            const key = el.getAttribute('data-i18n-title');
            const val = this.translations[key];
            if (val !== undefined) el.setAttribute('title', val);
        });

        // placeholder attribute
        query('[data-i18n-placeholder]', el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = this.translations[key];
            if (val !== undefined) el.setAttribute('placeholder', val);
        });

        // Keep any language selectors in sync
        query('.chatu8-lang-select', el => {
            el.value = this.currentLang;
        });
    },

    // ------------------------------------------------------------------ //
    //  Initialisation                                                      //
    // ------------------------------------------------------------------ //

    /**
     * Bootstrap the i18n system.
     * Loads the saved language and starts a MutationObserver so that
     * dynamically loaded tab content is translated automatically.
     */
    async init() {
        const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
        await this.setLanguage(saved);

        // Watch for dynamically loaded tab content and translate it
        // as soon as it is inserted into the DOM.
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.applyTranslations(node);
                    }
                }
            }
        });

        // Observe document.body once it is available.
        const attachObserver = () => {
            const target = document.body ?? document.documentElement;
            observer.observe(target, { childList: true, subtree: true });
        };

        if (document.body) {
            attachObserver();
        } else {
            document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
        }
    },
};

// Expose globally so inline HTML event handlers can reach it.
window.chatu8_i18n = chatu8_i18n;

// Auto-initialise when the module is imported.
chatu8_i18n.init().catch(err =>
    console.error('[st-chatu8 i18n] Initialisation failed:', err)
);

export { chatu8_i18n };

