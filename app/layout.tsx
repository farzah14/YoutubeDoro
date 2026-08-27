import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const themeBootstrap = [
  "(function () {",
  "  try {",
  "    var saved = window.localStorage.getItem('ytdoro:theme');",
  "    var allowed = ['night-study', 'rainy-evening', 'sunset-study'];",
  "    var theme = saved;",
  "    try { theme = saved ? JSON.parse(saved) : 'night-study'; } catch (_) {}",
  "    document.documentElement.dataset.theme = allowed.indexOf(theme) >= 0 ? theme : 'night-study';",
  "  } catch (_) {",
  "    document.documentElement.dataset.theme = 'night-study';",
  "  }",
  "})();",
].join("\n");

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#091424",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "YoutubeDoro",
  description: "Minimalist Pomodoro timer for focused learning",
  manifest: "/manifest.json",
  openGraph: {
    title: "YoutubeDoro",
    description: "Focus. Learn. A professional Pomodoro timer.",
    siteName: "YoutubeDoro",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      data-theme="night-study"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
