// Bundled fonts, from the Fontsource packages. Nothing loads from the network.
// Design drop 3 (design/tokens.md, Fonts): Source Sans 3 for everything and Source Code Pro for
// figures in tables and logs, both variable files over their weight axis. The platform is English
// only (decisions.md, Oct 24, 11:35 PM and 11:55 PM), so no Chinese font file ships. The seal's and
// the maker mark's Latin initials keep Noto Serif SC 600 (--c-font-seal), its Latin subset only.
import "@fontsource-variable/source-sans-3/wght.css";
import "@fontsource-variable/source-code-pro/wght.css";
import "@fontsource/noto-serif-sc/latin-600.css";
