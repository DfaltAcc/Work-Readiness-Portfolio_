"use client"

import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VideoUpload } from "@/components/video-upload"
import { DocumentUpload } from "@/components/document-upload"
import { useFileStorageState, useFileStorage } from "@/lib/storage/file-storage-context"
import { StoredFileInfo } from "@/lib/storage/types"
import { Download, FileText, Video, Image as ImageIcon, Trash2 } from "lucide-react"

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
              <img 
                src="/networking-evidence.jpeg" 
                alt="Professional networking evidence and achievements"
                className="w-full h-auto max-h-96 object-contain rounded-md"
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  const target = e.currentTarget;
                  target.src = '/placeholder.jpg'; // Fallback to placeholder
                }}
                onLoad={() => console.log('Image loaded successfully')}
              />
              <noscript>
                <p className="text-sm text-muted-foreground mt-2">
                  Image: Professional networking evidence and achievements
                </p>
              </noscript>
            </div>
          </Card>
        )}

        {/* Saved Files Display */}
        {isInitialized && files.length > 0 && (
          <SavedFilesDisplay files={files} sectionId={id} />
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

// Component to display saved files
function SavedFilesDisplay({ files, sectionId }: { files: StoredFileInfo[], sectionId: string }) {
  const { retrieveFile, deleteFile } = useFileStorage()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map())
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Load file URLs for images and videos
  useEffect(() => {
    const loadFileUrls = async () => {
      const newUrls = new Map<string, string>()
      
      for (const file of files) {
        // Only load URLs for images and videos
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          try {
            const retrievedFile = await retrieveFile(file.id)
            if (retrievedFile) {
              const url = URL.createObjectURL(retrievedFile)
              newUrls.set(file.id, url)
            }
          } catch (error) {
            console.error(`Failed to load file ${file.id}:`, error)
          }
        }
      }
      
      setFileUrls(newUrls)
    }

    loadFileUrls()

    // Cleanup URLs on unmount
    return () => {
      fileUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [files, retrieveFile])

  const toggleExpanded = (fileId: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const handleDownload = async (file: StoredFileInfo) => {
    try {
      setIsLoading(file.id)
      const retrievedFile = await retrieveFile(file.id)
      
      if (retrievedFile) {
        // Create download link
        const url = URL.createObjectURL(retrievedFile)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download file:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleDelete = async (file: StoredFileInfo) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        setIsLoading(file.id)
        await deleteFile(file.id)
      } catch (error) {
        console.error('Failed to delete file:', error)
      } finally {
        setIsLoading(null)
      }
    }
  }

  const getFileIcon = (file: StoredFileInfo) => {
    if (file.category === 'video') {
      return <Video className="w-4 h-4" />
    }
    
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />
    }
    
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (files.length === 0) {
    return null
  }

  return (
    <Card className="p-6 space-y-4 border-border/50 shadow-sm">
      <div className="space-y-2">
        <Badge variant="secondary" className="mb-2">
          Saved Evidence Files
        </Badge>
        <h3 className="text-xl font-semibold">Permanently Stored Files</h3>
        <p className="text-sm text-muted-foreground">
          Files uploaded to this portfolio section are saved permanently across browser sessions
        </p>
      </div>
      
      <div className="space-y-3">
        {files.map((file) => {
          const fileUrl = fileUrls.get(file.id)
          const isExpanded = expandedFiles.has(file.id)
          const isImage = file.type.startsWith('image/')
          const isVideo = file.type.startsWith('video/')
          const hasPreview = isImage || isVideo

          return (
            <div key={file.id} className="bg-muted/50 rounded-lg border overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getFileIcon(file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatDate(file.storedAt)}</span>
                      {file.compressed && (
                        <Badge variant="outline" className="text-xs">
                          Compressed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasPreview && fileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpanded(file.id)}
                      className="h-8 px-2"
                    >
                      {isExpanded ? 'Hide' : 'Show'}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    disabled={isLoading === file.id}
                    className="h-8 px-2"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(file)}
                    disabled={isLoading === file.id}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Image/Video Preview */}
              {isExpanded && fileUrl && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg overflow-hidden bg-background border">
                    {isImage && (
                      <img
                        src={fileUrl}
                        alt={file.name}
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    )}
                    {isVideo && (
                      <video
                        src={fileUrl}
                        controls
                        className="w-full h-auto max-h-96"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>💾 Files are stored locally in your browser using IndexedDB and will persist across sessions</p>
        <p>🔒 Your files are private and never uploaded to external servers</p>
      </div>
    </Card>
  )
}
