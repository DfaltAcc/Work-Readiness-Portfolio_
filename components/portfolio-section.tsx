"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoUpload } from "@/components/video-upload"
import { DocumentUpload } from "@/components/document-upload"
import { useFileStorageState } from "@/lib/storage/file-storage-context"

interface Evidence {
  title: string
  description: string
  highlights: string[]
}

interface Reflection {
  situation: string
  task: string
  action: string
  result: string
}

interface PortfolioSectionProps {
  id: string
  title: string
  description: string
  evidence: Evidence
  reflection: Reflection
}

export function PortfolioSection({ id, title, description, evidence, reflection }: PortfolioSectionProps) {
  const { files, isInitialized } = useFileStorageState()
  const [sectionFiles, setSectionFiles] = useState({ videos: 0, documents: 0 })

  // Track files for this section (we'll use a simple approach based on file timestamps and section context)
  useEffect(() => {
    if (!isInitialized) return

    // Count files by category - in a real implementation, you might want to associate files with specific sections
    const videoCount = files.filter(file => file.category === 'video').length
    const documentCount = files.filter(file => file.category === 'document').length
    
    setSectionFiles({ videos: videoCount, documents: documentCount })
  }, [files, isInitialized])

  return (
    <section id={id} className="scroll-mt-24">
      <div className="space-y-12">
        {/* Section Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">{title}</h2>
            {isInitialized && (sectionFiles.videos > 0 || sectionFiles.documents > 0) && (
              <div className="flex items-center gap-2">
                {sectionFiles.videos > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {sectionFiles.videos} Video{sectionFiles.videos !== 1 ? 's' : ''} Saved
                  </Badge>
                )}
                {sectionFiles.documents > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {sectionFiles.documents} Document{sectionFiles.documents !== 1 ? 's' : ''} Saved
                  </Badge>
                )}
              </div>
            )}
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl text-balance leading-relaxed">{description}</p>
          {isInitialized && (
            <p className="text-sm text-green-600">
              ✓ File persistence enabled - your uploads will be saved across sessions
            </p>
          )}
          {!isInitialized && (
            <p className="text-sm text-amber-600">
              ⚠ Storage unavailable - files will only persist for this session
            </p>
          )}
        </div>

        {/* Video Upload - Only show for mock interview section */}
        {id === "mock-interview" && (
          <VideoUpload
            maxSizeMB={150}
            acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
          />
        )}

        {/* Permanent Media Display */}
        {id === "professional-networking" && (
          <Card className="p-6 space-y-4 border-border/50 shadow-sm">
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2">
                Networking Evidence
              </Badge>
              <h3 className="text-xl font-semibold">Professional Networking Success</h3>
              <p className="text-sm text-muted-foreground">Visual evidence of networking achievements and professional connections</p>
            </div>
            <div className="rounded-lg overflow-hidden bg-muted p-4">
              <Image 
                src="/1761155060880.jpeg" 
                alt="Professional networking evidence and achievements"
                width={800}
                height={600}
                className="w-full h-auto max-h-96 object-contain rounded-md"
                priority
              />
            </div>
          </Card>
        )}

        {/* Document Upload - Show for all sections */}
        <DocumentUpload
          maxSizeMB={10}
          acceptedFormats={['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp']}
          title="Upload Supporting Documents"
          description="Add certificates, screenshots, or documents as evidence"
        />

        {/* Evidence Card */}
        <Card className="p-8 md:p-12 space-y-6 border-border/50 shadow-sm">
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-2">
              Evidence
            </Badge>
            <h3 className="text-2xl font-semibold">{evidence.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{evidence.description}</p>
          </div>

          <div className="space-y-3 pt-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Key Highlights</h4>
            <ul className="space-y-2">
              {evidence.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-accent mt-1.5">•</span>
                  <span className="text-foreground leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Reflection Card - STAR Technique */}
        <Card className="p-8 md:p-12 space-y-8 border-border/50 shadow-sm">
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-2">
              Reflection: STAR Technique
            </Badge>
            <h3 className="text-2xl font-semibold">Learning Reflection</h3>
          </div>

          <div className="grid gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  S
                </div>
                <h4 className="text-lg font-semibold">Situation</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.situation}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  T
                </div>
                <h4 className="text-lg font-semibold">Task</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.task}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  A
                </div>
                <h4 className="text-lg font-semibold">Action</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.action}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  R
                </div>
                <h4 className="text-lg font-semibold">Result</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.result}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
