/* ==========================================================================
   Yuan Qu Cool — shared behaviour
   --------------------------------------------------------------------------
   Progressive enhancement only: every page is complete HTML without it.

   1. Landing page plugin cards rendered from js/plugins.js
   2. Documentation table of contents + scroll spy
   3. Code blocks: language label, copy button, lightweight highlighting
   4. Demo videos play only while visible
   5. Prev/next plugin pager on documentation pages
   6. Small niceties: sticky header state, link prefetch, footer year
   ========================================================================== */

(function () {
    "use strict";

    var data = window.YQC || {};
    var site = data.site || {};
    var plugins = (data.plugins || [])
        .slice()
        .sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Registry paths such as "plugins/auto-uv/" are written relative to the site
    // root, while pages live one or two directories deep. site.js always sits at
    // <root>/js/site.js, so its own URL gives us a reliable base — even when the
    // site is served from a sub-path.
    var siteBase = (function () {
        var script = document.currentScript;
        if (script && script.src) {
            return new URL("../", script.src);
        }
        return new URL("/", window.location.href);
    })();

    function fromSiteRoot(path) {
        if (!path) {
            return path;
        }
        try {
            return new URL(path, siteBase).href;
        } catch (error) {
            return path;
        }
    }

    document.documentElement.classList.remove("no-js");
    document.documentElement.classList.add("js");

    /* ------------------------------------------------------------------
       Helpers
       ------------------------------------------------------------------ */

    function getPlugin(slug) {
        for (var i = 0; i < plugins.length; i++) {
            if (plugins[i].slug === slug) {
                return plugins[i];
            }
        }
        return null;
    }

    function currentSlug() {
        return document.body.getAttribute("data-plugin") || "";
    }

    function node(tag, attrs, children) {
        var element = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (key) {
                if (key === "text") {
                    element.textContent = attrs[key];
                } else if (key === "html") {
                    element.innerHTML = attrs[key];
                } else if (key === "className") {
                    element.className = attrs[key];
                } else {
                    element.setAttribute(key, attrs[key]);
                }
            });
        }
        (children || []).forEach(function (child) {
            if (child) {
                element.appendChild(child);
            }
        });
        return element;
    }

    /* ------------------------------------------------------------------
       1. Landing page — plugin cards
       ------------------------------------------------------------------ */

    function buildCard(plugin) {
        var media = node("figure", { className: "card-media" }, [
            node("img", {
                src: fromSiteRoot(plugin.cover),
                alt: plugin.coverAlt || plugin.name,
                width: "960",
                height: "600",
                loading: "lazy",
                decoding: "async"
            }),
            plugin.flag
                ? node("span", {
                    className:
                        "card-flag" + (plugin.flag === "New" ? " card-flag--new" : ""),
                    text: plugin.flag
                })
                : null
        ]);

        var title = node("h3", { className: "card-title" }, [
            node("a", { href: fromSiteRoot(plugin.docs), text: plugin.name }),
            node("span", { className: "arrow", "aria-hidden": "true", text: "→" })
        ]);

        var chips = node(
            "ul",
            { className: "chips" },
            (plugin.highlights || []).slice(0, 4).map(function (label) {
                return node("li", { text: label });
            })
        );

        var storeIsLive = Boolean(plugin.store) && plugin.storeLive !== false;
        var store = storeIsLive
            ? node("a", {
                className: "card-store",
                href: plugin.store,
                target: "_blank",
                rel: "noopener",
                text: "Asset Store ↗"
            })
            : node("span", {
                className: "card-store card-store--soon",
                title: plugin.store
                    ? "The Asset Store listing is in review; it goes live once Unity approves it."
                    : "Coming to the Asset Store soon",
                text: "Asset Store · soon"
            });

        var body = node("div", { className: "card-body" }, [
            title,
            node("p", { className: "card-tagline", text: plugin.tagline }),
            node("p", { className: "card-desc", text: plugin.summary }),
            chips,
            node("div", { className: "card-foot" }, [
                node("span", {
                    className: "card-meta",
                    text: [plugin.engine, plugin.kind].filter(Boolean).join(" · ")
                }),
                store
            ])
        ]);

        return node("article", {
            className: "plugin-card accent--" + (plugin.accent || "coral")
        }, [media, body]);
    }

    function renderLanding() {
        var grid = document.getElementById("plugin-grid");
        if (!grid) {
            return;
        }
        plugins.forEach(function (plugin) {
            grid.appendChild(buildCard(plugin));
        });
        document.documentElement.classList.add("cards-ready");
    }

    /* ------------------------------------------------------------------
       2. Documentation — table of contents + scroll spy
       ------------------------------------------------------------------ */

    function buildToc() {
        var article = document.querySelector(".prose");
        var aside = document.querySelector("[data-toc]");
        if (!article || !aside) {
            return;
        }

        var headings = Array.prototype.slice.call(article.querySelectorAll("h2[id]"));
        if (!headings.length) {
            return;
        }

        function linkFor(heading) {
            return node("a", {
                href: "#" + heading.id,
                text: heading.textContent.replace(/\s+/g, " ").trim()
            });
        }

        var list = node(
            "ol",
            null,
            headings.map(function (heading) {
                return node("li", null, [linkFor(heading)]);
            })
        );

        aside.appendChild(
            node("span", { className: "toc-title", text: "On this page" })
        );
        aside.appendChild(list);

        // Mobile: a collapsible copy of the same navigation.
        var layout = document.querySelector(".doc-layout");
        if (layout) {
            var details = node("details", { className: "toc-mobile" }, [
                node("summary", { text: "Contents" }),
                node("nav", null, [list.cloneNode(true)])
            ]);
            details.querySelectorAll("a").forEach(function (anchor) {
                anchor.addEventListener("click", function () {
                    details.open = false;
                });
            });
            layout.insertBefore(details, layout.firstChild);
        }

        // Scroll spy
        var anchors = Array.prototype.slice.call(
            aside.querySelectorAll("a[href^='#']")
        );

        var ticking = false;
        function update() {
            ticking = false;
            var offset = 132;
            var active = headings[0];
            for (var i = headings.length - 1; i >= 0; i--) {
                if (headings[i].getBoundingClientRect().top <= offset) {
                    active = headings[i];
                    break;
                }
            }
            anchors.forEach(function (anchor) {
                var isActive = anchor.getAttribute("href") === "#" + active.id;
                anchor.classList.toggle("is-active", isActive);
                if (isActive && aside.scrollHeight > aside.clientHeight) {
                    var anchorTop = anchor.offsetTop;
                    if (
                        anchorTop < aside.scrollTop ||
                        anchorTop > aside.scrollTop + aside.clientHeight - 40
                    ) {
                        aside.scrollTop = Math.max(0, anchorTop - aside.clientHeight / 2);
                    }
                }
            });
        }

        window.addEventListener(
            "scroll",
            function () {
                if (!ticking) {
                    ticking = true;
                    window.requestAnimationFrame(update);
                }
            },
            { passive: true }
        );
        // Late layout shifts (images, videos, fonts) move the headings, so
        // refresh the active entry once everything has settled.
        window.addEventListener("load", update);
        window.addEventListener("resize", update, { passive: true });
        update();
        window.setTimeout(update, 1500);
    }

    /* ------------------------------------------------------------------
       3. Code blocks
       ------------------------------------------------------------------ */

    var CSharpKeywords = [
        "abstract", "as", "async", "await", "base", "break", "case", "catch", "class",
        "const", "continue", "default", "delegate", "do", "else", "enum", "event",
        "explicit", "extern", "false", "finally", "fixed", "for", "foreach", "get",
        "global", "goto", "if", "implicit", "in", "init", "interface", "internal",
        "is", "lock", "namespace", "new", "null", "operator", "out", "override",
        "params", "partial", "private", "protected", "public", "readonly", "record",
        "ref", "required", "return", "sealed", "set", "sizeof", "stackalloc", "static",
        "struct", "switch", "this", "throw", "true", "try", "typeof", "unsafe", "using",
        "var", "virtual", "void", "where", "while", "yield"
    ];
    var keywordSet = Object.create(null);
    CSharpKeywords.forEach(function (word) {
        keywordSet[word] = true;
    });

    var TOKEN_PATTERN =
        /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(@?"(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?f?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

    function escapeHtml(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function highlightCSharp(source) {
        return escapeHtml(source).replace(TOKEN_PATTERN, function (
            match, comment, str, chr, num, identifier
        ) {
            if (comment) {
                return '<span class="tok-cmt">' + comment + "</span>";
            }
            if (str || chr) {
                return '<span class="tok-str">' + (str || chr) + "</span>";
            }
            if (num) {
                return '<span class="tok-num">' + num + "</span>";
            }
            if (identifier) {
                if (keywordSet[identifier]) {
                    return '<span class="tok-kw">' + identifier + "</span>";
                }
                if (/^[A-Z][A-Za-z0-9_]+$/.test(identifier)) {
                    return '<span class="tok-type">' + identifier + "</span>";
                }
            }
            return match;
        });
    }

    function enhanceCodeBlocks() {
        var blocks = Array.prototype.slice.call(
            document.querySelectorAll(".prose pre")
        );

        blocks.forEach(function (pre) {
            var code = pre.querySelector("code");
            if (!code) {
                return;
            }

            var language =
                pre.getAttribute("data-lang") ||
                (code.className.indexOf("csharp") >= 0 || code.className.indexOf("cs") >= 0
                    ? "C#"
                    : /[;{}]|=>/.test(code.textContent)
                        ? "C#"
                        : "Text");

            var raw = code.textContent;
            if (language === "C#") {
                code.innerHTML = highlightCSharp(raw);
            }

            var wrapper = node("div", { className: "code-block" });
            var copy = node("button", {
                className: "code-copy",
                type: "button",
                "aria-label": "Copy code to clipboard",
                text: "Copy"
            });

            copy.addEventListener("click", function () {
                var done = function () {
                    copy.textContent = "Copied";
                    copy.classList.add("is-copied");
                    window.setTimeout(function () {
                        copy.textContent = "Copy";
                        copy.classList.remove("is-copied");
                    }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(raw).then(done, function () {});
                } else {
                    var area = document.createElement("textarea");
                    area.value = raw;
                    area.setAttribute("readonly", "");
                    area.style.position = "absolute";
                    area.style.left = "-9999px";
                    document.body.appendChild(area);
                    area.select();
                    try {
                        document.execCommand("copy");
                        done();
                    } catch (error) {
                        /* clipboard unavailable */
                    }
                    document.body.removeChild(area);
                }
            });

            var head = node("div", { className: "code-head" }, [
                node("span", { text: language }),
                copy
            ]);

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(head);
            wrapper.appendChild(pre);
        });
    }

    /* ------------------------------------------------------------------
       4. Demo videos — autoplay only while on screen
       ------------------------------------------------------------------ */

    function setupVideos() {
        var videos = Array.prototype.slice.call(
            document.querySelectorAll("video[data-autoplay]")
        );
        if (!videos.length) {
            return;
        }

        // Reserve the box before metadata arrives: a <video> without metadata
        // ignores its width/height attributes for aspect ratio, which would make
        // the page jump as each clip loads.
        videos.forEach(function (video) {
            var w = video.getAttribute("width");
            var h = video.getAttribute("height");
            if (w && h) {
                video.style.aspectRatio = w + " / " + h;
            }
        });

        if (reduceMotion) {
            videos.forEach(function (video) {
                video.controls = true;
                video.preload = "metadata";
            });
            return;
        }

        if (!("IntersectionObserver" in window)) {
            videos.forEach(function (video) {
                video.play().catch(function () {});
            });
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    var video = entry.target;
                    if (entry.isIntersecting) {
                        video.play().catch(function () {});
                    } else if (!video.paused) {
                        video.pause();
                    }
                });
            },
            { threshold: 0.25 }
        );

        videos.forEach(function (video) {
            observer.observe(video);
        });
    }

    /* ------------------------------------------------------------------
       5. Prev / next plugin pager
       ------------------------------------------------------------------ */

    function renderPager() {
        var pager = document.querySelector("[data-plugin-pager]");
        if (!pager) {
            return;
        }

        var slug = currentSlug();
        var others = plugins.filter(function (plugin) {
            return plugin.slug !== slug;
        });
        if (!others.length) {
            pager.remove();
            return;
        }

        var index = -1;
        plugins.forEach(function (plugin, i) {
            if (plugin.slug === slug) {
                index = i;
            }
        });
        // Prefer the next plugin in the registry, then wrap to the others.
        var ordered = plugins
            .slice(index + 1)
            .concat(plugins.slice(0, Math.max(index, 0)))
            .filter(function (plugin) {
                return plugin.slug !== slug;
            });

        ordered.forEach(function (plugin, i) {
            pager.appendChild(
                node(
                    "a",
                    {
                        className: "pager-link" + (i % 2 === 1 ? " pager-link--next" : ""),
                        href: fromSiteRoot(plugin.docs)
                    },
                    [
                        node("span", {
                            className: "pager-label",
                            text: i === 0 ? "Next plugin" : "Also from Yuan Qu Cool"
                        }),
                        node("span", { className: "pager-name", text: plugin.name }),
                        node("span", {
                            className: "pager-tagline",
                            text: plugin.tagline
                        })
                    ]
                )
            );
        });
    }

    /* ------------------------------------------------------------------
       6. Store state — the docs hero mirrors the registry
       ------------------------------------------------------------------ */

    function stampStoreButton() {
        var link = document.querySelector("[data-store-button]");
        var plugin = getPlugin(currentSlug());
        if (!link || !plugin || !plugin.store) {
            return;
        }
        if (plugin.storeLive === false) {
            link.replaceWith(
                node("span", {
                    className: "btn btn--soon",
                    "aria-disabled": "true",
                    title: "The Asset Store listing is in review; it goes live once Unity approves it.",
                    text: "Asset Store · soon"
                })
            );
            return;
        }
        // Keep the static href honest with the registry (no-JS visitors use it).
        link.href = plugin.store;
    }

    /* ------------------------------------------------------------------
       7. Small niceties
       ------------------------------------------------------------------ */

    function headerState() {
        var header = document.querySelector(".site-header");
        if (!header) {
            return;
        }
        var ticking = false;
        function update() {
            ticking = false;
            header.classList.toggle("is-scrolled", window.scrollY > 8);
        }
        window.addEventListener(
            "scroll",
            function () {
                if (!ticking) {
                    ticking = true;
                    window.requestAnimationFrame(update);
                }
            },
            { passive: true }
        );
        // Late layout shifts (images, videos, fonts) move the headings, so
        // refresh the active entry once everything has settled.
        window.addEventListener("load", update);
        window.addEventListener("resize", update, { passive: true });
        update();
        window.setTimeout(update, 1500);
    }

    function prefetchLinks() {
        // Respect data-saver mode; on a handful of static pages prefetching is
        // otherwise cheap and makes card clicks feel instant.
        if (navigator.connection && navigator.connection.saveData) {
            return;
        }
        var seen = Object.create(null);
        function maybePrefetch(anchor) {
            if (!anchor || anchor.dataset.noPrefetch) {
                return;
            }
            var href = anchor.getAttribute("href");
            if (!href || href.charAt(0) === "#" || anchor.target === "_blank") {
                return;
            }
            var url;
            try {
                url = new URL(href, window.location.href);
            } catch (error) {
                return;
            }
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
                return;
            }
            if (seen[url.pathname]) {
                return;
            }
            seen[url.pathname] = true;
            var link = document.createElement("link");
            link.rel = "prefetch";
            link.href = url.href;
            link.as = "document";
            document.head.appendChild(link);
        }

        document.addEventListener(
            "pointerover",
            function (event) {
                var anchor = event.target.closest && event.target.closest("a[href]");
                maybePrefetch(anchor);
            },
            { passive: true }
        );
        document.addEventListener("focusin", function (event) {
            var anchor = event.target.closest && event.target.closest("a[href]");
            maybePrefetch(anchor);
        });
    }

    function stampCounts() {
        document.querySelectorAll("[data-plugin-count]").forEach(function (element) {
            var count = plugins.length;
            element.textContent = count + (count === 1 ? " plugin" : " plugins");
        });
    }

    function stampYear() {
        var year = String(new Date().getFullYear());
        document.querySelectorAll("[data-year]").forEach(function (element) {
            element.textContent = year;
        });
    }

    /* ------------------------------------------------------------------
       Boot
       ------------------------------------------------------------------ */

    function boot() {
        renderLanding();
        buildToc();
        enhanceCodeBlocks();
        setupVideos();
        renderPager();
        headerState();
        prefetchLinks();
        stampCounts();
        stampStoreButton();
        stampYear();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
