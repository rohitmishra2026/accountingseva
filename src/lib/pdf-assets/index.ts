import fs from "fs";
import path from "path";
import { Font } from "@react-pdf/renderer";

// Server-only. Loads the report's fonts and logo for the PDF renderer.
//
// The PDF uses Inter (the firm's own typeface) rather than the built-in
// Helvetica, for two reasons: it matches the site, and standard Helvetica
// cannot render the rupee sign. These TTFs are latin + latin-ext merged so
// every glyph the report needs, including ₹, is present.

const ASSET_DIR = path.join(process.cwd(), "src/lib/pdf-assets");

function asset(file: string): string {
  return path.join(ASSET_DIR, file);
}

let registered = false;

// Register once per server process.
export function registerReportFonts() {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: asset("Inter-Regular.ttf"), fontWeight: 400 },
      { src: asset("Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: asset("Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Inter's metrics keep long Indian-format numbers on one line; still, never
  // hyphenate a word in a table cell.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

let logoDataUri: string | null | undefined;

// The watercolour logo, as a data URI so it embeds without a network fetch.
// Returns null if the file is missing, so the PDF degrades gracefully.
export function getLogoDataUri(): string | null {
  if (logoDataUri !== undefined) return logoDataUri;
  try {
    const buf = fs.readFileSync(
      path.join(process.cwd(), "public/images/logo-card.png")
    );
    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoDataUri = null;
  }
  return logoDataUri;
}
