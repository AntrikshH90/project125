/* ============================================================
   EMERGENCY MITRA - TAILWIND THEME CONFIG (js/tailwind-config.js)
   ============================================================
   Defines the design system used by the Tailwind Play CDN:
     - colors       : Material-3 style palette (primary, surface,
                      error, containers, outline variants...)
     - borderRadius : DEFAULT / lg / xl / full radius tokens
     - spacing      : custom spacing scale (xs, sm, md, lg...)
     - fontFamily   : Inter + Noto Sans Devanagari font tokens
     - fontSize     : typographic scale (display-lg, headline...)

   IMPORTANT: this file must stay loaded immediately AFTER the
   tailwind CDN <script> tag in index.html.
   ============================================================ */

        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "error": "#ba1a1a",
                        "inverse-on-surface": "#eef0ff",
                        "on-primary-fixed-variant": "#005047",
                        "outline-variant": "#bec9c5",
                        "surface": "#faf8ff",
                        "on-tertiary-container": "#81d6cc",
                        "on-tertiary": "#ffffff",
                        "on-secondary-fixed": "#00201c",
                        "on-secondary": "#ffffff",
                        "background": "#faf8ff",
                        "surface-container-lowest": "#ffffff",
                        "on-surface": "#131b2e",
                        "on-primary": "#ffffff",
                        "surface-tint": "#1c695f",
                        "on-secondary-container": "#006f64",
                        "tertiary-container": "#005e57",
                        "primary": "#00453d",
                        "tertiary-fixed-dim": "#80d5cb",
                        "on-surface-variant": "#3f4946",
                        "secondary-fixed-dim": "#4fdbc8",
                        "tertiary-fixed": "#9cf2e8",
                        "on-primary-container": "#8dd5c8",
                        "primary-container": "#075e54",
                        "tertiary": "#00443f",
                        "surface-container-low": "#f2f3ff",
                        "on-background": "#131b2e",
                        "inverse-primary": "#8cd4c7",
                        "outline": "#6f7976",
                        "on-tertiary-fixed": "#00201d",
                        "surface-container": "#eaedff",
                        "surface-bright": "#faf8ff",
                        "surface-container-highest": "#dae2fd",
                        "on-tertiary-fixed-variant": "#00504a",
                        "on-error": "#ffffff",
                        "surface-container-high": "#e2e7ff",
                        "primary-fixed-dim": "#8cd4c7",
                        "surface-variant": "#dae2fd",
                        "error-container": "#ffdad6",
                        "secondary-container": "#6df5e1",
                        "on-primary-fixed": "#00201c",
                        "on-error-container": "#93000a",
                        "secondary": "#006b5f",
                        "on-secondary-fixed-variant": "#005048",
                        "primary-fixed": "#a8f0e3",
                        "inverse-surface": "#283044",
                        "secondary-fixed": "#71f8e4",
                        "surface-dim": "#d2d9f4"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "2xl": "48px",
                        "sm": "8px",
                        "margin-desktop": "32px",
                        "md": "16px",
                        "unit": "4px",
                        "xl": "32px",
                        "lg": "24px",
                        "container-max": "1280px",
                        "margin-mobile": "16px",
                        "gutter": "16px",
                        "xs": "4px"
                    },
                    "fontFamily": {
                        "body-md": [
                            "Inter"
                        ],
                        "headline-lg-mobile": [
                            "Inter"
                        ],
                        "label-sm": [
                            "Inter"
                        ],
                        "hindi-body": [
                            "Noto Sans Devanagari"
                        ],
                        "headline-lg": [
                            "Inter"
                        ],
                        "display-lg": [
                            "Inter"
                        ],
                        "title-md": [
                            "Inter"
                        ],
                        "body-lg": [
                            "Inter"
                        ]
                    },
                    "fontSize": {
                        "body-md": [
                            "16px",
                            {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                            }
                        ],
                        "headline-lg-mobile": [
                            "24px",
                            {
                                "lineHeight": "1.3",
                                "fontWeight": "700"
                            }
                        ],
                        "label-sm": [
                            "14px",
                            {
                                "lineHeight": "1.4",
                                "letterSpacing": "0.01em",
                                "fontWeight": "500"
                            }
                        ],
                        "hindi-body": [
                            "18px",
                            {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                            }
                        ],
                        "headline-lg": [
                            "32px",
                            {
                                "lineHeight": "1.3",
                                "fontWeight": "700"
                            }
                        ],
                        "display-lg": [
                            "48px",
                            {
                                "lineHeight": "1.2",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                            }
                        ],
                        "title-md": [
                            "20px",
                            {
                                "lineHeight": "1.4",
                                "fontWeight": "600"
                            }
                        ],
                        "body-lg": [
                            "18px",
                            {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                            }
                        ]
                    }
                },
            },
        }
