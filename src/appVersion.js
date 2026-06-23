/** Single source: `package.json` `version` (bundled by Vite). */
import pkg from "../package.json";

export const APP_VERSION = typeof pkg.version === "string" ? pkg.version : "—";
