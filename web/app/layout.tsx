import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Noto_Sans_Devanagari,
  Noto_Sans_Telugu,
  Noto_Serif_Devanagari,
  Noto_Serif_Telugu,
} from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const serif =Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

// Hindi and Telugu glyphs, behind the Latin fonts in every font stack (globals.css). Not preloaded:
// the browser fetches them only when the page actually shows that script. (next/font needs literal options.)
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", preload: false, adjustFontFallback: false });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", preload: false, adjustFontFallback: false });
const devaSerif = Noto_Serif_Devanagari({ variable: "--font-deva-serif", preload: false, adjustFontFallback: false });
const teluguSerif = Noto_Serif_Telugu({ variable: "--font-telugu-serif", preload: false, adjustFontFallback: false });

export const metadata: Metadata = {
  title: "ScamCheck: is this message or call a scam?",
  description:
    "Paste a message or upload a screenshot, call recording, video, or PDF to check it for signs of digital fraud.",
};

export const viewport: Viewport = {
  themeColor: "#f5f0e6",
};

const fontVariables = [sans, mono, serif, deva, telugu, devaSerif, teluguSerif].map((f) => f.variable).join(" ");

// `lang` starts as English; the language menu updates it on the client (i18n/index.tsx).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
