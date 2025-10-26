"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Video, X, Play, Pause, AlertCircle } from "lucide-react"
import { useFileStorage, useFileStorageState } from "@/lib/storage/file-storage-context"
import { StoredFileInfo } from "@/lib/storage/types"
import { StorageUsageIndicator } from "./storage-usage-indicator"

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
  const [storedFileInfo, setStoredFileInfo] = useState<StoredFileInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // File storage hooks
  const { storeFile, retrieveFile, deleteFile, isLoading: storageLoading, error: storageError } = useFileStorage()
  const { files, isInitialized, storageWarning, canUploadFile, getUploadWarning } = useFileStorageState()

  // Restore previously uploaded video on component mount
  useEffect(() => {
    const restoreVideo = async () => {
      if (!isInitialized) return

      // Find the most recent video file
      const videoFiles = files.filter(file => file.category === 'video')
      if (videoFiles.length === 0) return

      const latestVideo = videoFiles.sort((a, b) => 
        new Date(b.storedAt).getTime() - new Date(a.storedAt).getTime()
      )[0]

      try {
        const file = await retrieveFile(latestVideo.id)
        if (file) {
          setUploadedVideo(file)
          setStoredFileInfo(latestVideo)
          const url = URL.createObjectURL(file)
          setVideoUrl(url)
          onVideoUpload?.(file)
        }
      } catch (error) {
        console.error('Failed to restore video:', error)
      }
    }

    restoreVideo()
  }, [isInitialized, files, retrieveFile, onVideoUpload])

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
    
    // Check storage quota if storage is initialized
    if (isInitialized && !canUploadFile(file.size)) {
      return 'Not enough storage space available. Please delete some files first.'
    }
    
    return null
  }

  const handleFiles = useCallback(async (files: FileList) => {
    const file = files[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      alert(error)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Store file in persistent storage if available
      if (isInitialized) {
        // Simulate progress during storage
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 15, 90))
        }, 300)

        const fileId = await storeFile(file, 'video')
        
        clearInterval(progressInterval)
        setUploadProgress(100)

        // Create stored file info
        const fileInfo: StoredFileInfo = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          category: 'video',
          storedAt: new Date(),
          compressed: false // Will be updated by the storage service
        }
        setStoredFileInfo(fileInfo)
      } else {
        // Fallback to session-only storage
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval)
              return 100
            }
            return prev + 10
          })
        }, 200)
      }

      setUploadedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      onVideoUpload?.(file)
    } catch (error) {
      console.error('Failed to store video:', error)
      alert('Failed to save video. It will only be available for this session.')
      
      // Continue with session-only storage
      setUploadedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      onVideoUpload?.(file)
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, isInitialized, storeFile, onVideoUpload])

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

  const removeVideo = async () => {
    try {
      // Delete from persistent storage if available
      if (storedFileInfo && isInitialized) {
        await deleteFile(storedFileInfo.id)
      }
    } catch (error) {
      console.error('Failed to delete video from storage:', error)
    }

    // Clean up local state
    setUploadedVideo(null)
    setStoredFileInfo(null)
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
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">
              Video Evidence
            </Badge>
            {storedFileInfo && (
              <Badge variant="outline" className="text-xs">
                Saved
              </Badge>
            )}
          </div>
          <h4 className="text-lg font-semibold">Upload Supporting Video</h4>
          <p className="text-sm text-muted-foreground">
            Add a video to demonstrate your work (Max {maxSizeMB}MB, {acceptedFormats.join(', ')})
          </p>
          {!isInitialized && (
            <p className="text-xs text-amber-600">
              Storage unavailable - files will only persist for this session
            </p>
          )}
        </div>
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-800">{storageWarning.message}</p>
        </div>
      )}

      {/* Storage Error */}
      {storageError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-800">{storageError}</p>
        </div>
      )}

      {!uploadedVideo && !isUploading && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
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

      {(isUploading || storageLoading) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              {isUploading ? 'Processing video...' : 'Loading video...'}
            </span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {isUploading ? `${uploadProgress}% complete` : 'Loading from storage...'}
          </p>
        </div>
      )}

      {uploadedVideo && videoUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">{uploadedVideo.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{(uploadedVideo.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {storedFileInfo && (
                    <>
                      <span>•</span>
                      <span>Saved {storedFileInfo.storedAt.toLocaleDateString()}</span>
                      {storedFileInfo.compressed && (
                        <>
                          <span>•</span>
                          <span>Compressed</span>
                        </>
                      )}
                    </>
                  )}
                </div>
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

      {/* Storage Usage Indicator */}
      {isInitialized && (
        <StorageUsageIndicator showDetails={false} />
      )}
    </Card>
  )
}