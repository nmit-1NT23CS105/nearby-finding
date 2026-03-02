import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Nearby Finder | Discover Places Around You",
    template: "%s | Nearby Finder"
  },
  description:
    "Premium nearby search platform with map/list views, real-time open status, travel time estimation, and advanced filters.",
  keywords: [
    "nearby places",
    "place finder",
    "local search",
    "hospitals nearby",
    "restaurants nearby",
    "map search"
  ],
  openGraph: {
    type: "website",
    title: "Nearby Finder",
    description: "Search nearby places by place name or coordinates with premium map experience.",
    siteName: "Nearby Finder"
  },
  twitter: {
    card: "summary_large_image",
    title: "Nearby Finder",
    description: "Search places nearby with advanced radius and category filtering."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
