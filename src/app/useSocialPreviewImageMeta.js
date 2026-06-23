import { useEffect } from "react";
import { viteEnv } from "@/config/env.js";

/** Set og:image and twitter:image to the deploy icon URL when VITE_PUBLIC_SITE_URL is set. */
export function useSocialPreviewImageMeta() {
  useEffect(() => {
    const base = viteEnv.publicSiteUrl;
    if (!base) return;
    const url = `${base}/icon-512.png`;
    const ensure = (sel, set) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        set(el);
        document.head.appendChild(el);
      }
      el.setAttribute("content", url);
    };
    ensure('meta[property="og:image"]', (el) => el.setAttribute("property", "og:image"));
    ensure('meta[name="twitter:image"]', (el) => el.setAttribute("name", "twitter:image"));
  }, []);
}
