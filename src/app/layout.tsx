import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CS2 Stats Hub",
  description:
    "Plataforma de estatísticas de CS2 para o grupo — rankings, ELO, conquistas e rivalidades.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
            <Sidebar />
            <main className="min-w-0 flex-1 pb-12">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
