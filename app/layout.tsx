import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { FileStorageProvider } from "@/lib/storage/file-storage-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Professional Portfolio | Work Readiness",
  description: "Digital portfolio showcasing professional development and work readiness training",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased">
        <FileStorageProvider>
          {children}
        </FileStorageProvider>
        <Analytics />
      </body>
    </html>
  )
}
