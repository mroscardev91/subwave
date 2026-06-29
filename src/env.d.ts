/// <reference types="astro/client" />

import type { UIStrings } from "@/i18n/ui";

declare global {
  interface Window {
    /** Runtime strings for the active locale (set per page in Layout.astro). */
    __I18N__: UIStrings["client"];
    /** Active locale code, e.g. "en" | "es". */
    __LANG__: string;
  }
}

export {};
