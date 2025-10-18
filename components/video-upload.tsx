"use client"

import { useState, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Video, X, Play, Pause } from "lucide-react"

interface VideoUploadProps {
  onVideoUpload?: (file: File) => void
  maxSizeMB?: number
  acceptedFormats?: string[]
}

export function VideoUpload({ 
  onVideoUpload, 
  maxSizeMB = 100, 
  acceptedFormats = ['mp4', 'mov', 'avi', 'webm'] 
}: VideoUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !acceptedFormats.includes(fileExtension)) {
      return `Please upload a video file (${acceptedFormats.join(', ')})`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`
    }
    return null
  }

  const handleFiles = useCallback((files: FileList) => {
    const file = files[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      alert(error)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setUploadedVideo(file)
          const url = URL.createObjectURL(file)
          setVideoUrl(url)
          onVideoUpload?.(file)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }, [maxSizeMB, acceptedFormats, onVideoUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  const removeVideo = () => {
    setUploadedVideo(null)
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Badge variant="secondary" className="mb-2">
            Video Evidence
          </Badge>
          <h4 className="text-lg font-semibold">Upload Supporting Video</h4>
          <p className="text-sm text-muted-foreground">
            Add a video to demonstrate your work (Max {maxSizeMB}MB, {acceptedFormats.join(', ')})
          </p>
        </div>
      </div>

      {!uploadedVideo && !isUploading && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.map(format => `.${format}`).join(',')}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Drag and drop your video here, or{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary"
                  onClick={onButtonClick}
                >
                  browse files
                </Button>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {acceptedFormats.join(', ')} up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Uploading video...</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
        </div>
      )}

      {uploadedVideo && videoUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">{uploadedVideo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedVideo.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeVideo}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-auto max-h-64 object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayPause}
              className="flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}