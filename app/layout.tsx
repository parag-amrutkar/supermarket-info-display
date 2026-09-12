import type { Metadata, Viewport } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beacon Box",
  description: "In-store kiosk display and content system.",
};

// The kiosk panel is a fixed 9:16 portrait touchscreen, so the page is locked
// to the device width and zoom is disabled — a pinch-zoomed kiosk stays zoomed.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light",
  themeColor: "#f8f9fa", // must match --background, or the tab/toolbar tint mismatches
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden overscroll-none touch-manipulation select-none [-webkit-tap-highlight-color:transparent]">
        {children}
      </body>
    </html>
  );
}
