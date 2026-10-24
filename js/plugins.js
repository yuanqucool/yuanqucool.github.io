/* ==========================================================================
   Yuan Qu Cool — plugin registry
   --------------------------------------------------------------------------
   Single source of truth for the portal. The landing page renders its plugin
   grid from this list, and each documentation page uses it for its pager and
   header links. To publish a new plugin:

     1. Copy a folder under plugins/<slug>/ with an index.html and its images.
     2. Add an entry to the array below (keep `order` ascending).
     3. Pick an existing `accent` class from css/site.css (or add one there).

   Nothing else needs to be edited: navigation, cards, pager and "next plugin"
   links are derived from this data.
   ========================================================================== */

window.YQC = {
    site: {
        name: "Yuan Qu Cool",
        email: "yuanqucool@gmail.com",
        youtube: "https://www.youtube.com/@YuanQuCool",
        tagline:
            "Focused Unity packages for procedural 3D: node-based mesh generation and runtime UV unwrapping."
    },

    plugins: [
        {
            // URL segment; the docs page lives at plugins/<slug>/
            slug: "poly-skeleton-mesh",
            name: "Poly Skeleton Mesh",
            // One-line promise, shown under the title on cards and docs pages.
            tagline: "Build low-poly meshes from a skeleton of nodes.",
            // Two or three sentences for the card body.
            summary:
                "Shape a silhouette by dragging node handles, set radius and cross-section per node, then splice meshes together. Bone controllers deform the result and the exporter writes a prefab with a regular or skinned renderer.",
            // Short chips shown on the card.
            highlights: ["Node-tree modeling", "Mesh splicing", "Skinned export", "Runtime API"],
            kind: "Editor tool · Runtime API",
            engine: "Unity 6+",
            // Visual identity: matches an .accent--* class in css/site.css.
            accent: "coral",
            cover: "plugins/poly-skeleton-mesh/images/cover.jpg",
            coverAlt:
                "A low-poly tree generated with Poly Skeleton Mesh, shown with its skeleton nodes selected in the Unity scene view.",
            flag: "Procedural modeling",
            docs: "plugins/poly-skeleton-mesh/",
            store: "https://assetstore.unity.com/packages/slug/313559",
            order: 1
        },
        {
            slug: "auto-uv",
            name: "Auto UV",
            tagline: "Non-overlapping UVs at runtime, in the editor, anywhere.",
            summary:
                "Generate a second UV set for any mesh — lightmap UV2 out of the box. Normal-cone charting, LSCM flattening with ARAP refinement and gap-free packing, with a layout preview you can actually read.",
            highlights: ["UV0–UV7", "Lightmap UV2", "No overlaps", "Deterministic", "Burst + jobs"],
            kind: "Runtime package · Editor window",
            engine: "Unity 6+",
            accent: "blue",
            cover: "plugins/auto-uv/images/cover.jpg",
            coverAlt:
                "Three procedural meshes unwrapped by Auto UV with colour-block UV islands and their layout panels behind them.",
            flag: "New",
            docs: "plugins/auto-uv/",
            // Canonical Asset Store URL. The listing is still in Unity review, so
            // the card shows a quiet "soon" label instead of a link; set
            // `storeLive: true` (or delete the flag) once the page is public.
            store: "https://assetstore.unity.com/packages/slug/421610",
            order: 2
        }
    ]
};
