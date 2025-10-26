"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Image, X, Download, Eye, AlertCircle, Trash2 } from "lucide-react"
import { useFileStorage, useFileStorageState } from "@/lib/storage/file-storage-context"
import { StoredFileInfo } from "@/lib/storage/types"
import { StorageUsageIndicator } from "./storage-usage-indicator"

interface DocumentUploadProps {
  onDocumentUpload?: (file: File) => void
  maxSizeMB?: number
  acceptedFormats?: string[]
  title?: string
  description?: string
}

export function DocumentUpload({ 
  onDocumentUpload, 
  maxSizeMB = 10, 
  acceptedFormats = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif'],
  title = "Upload Supporting Documents",
  description = "Add certificates, images, or documents as evidence"
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [storedFileInfos, setStoredFileInfos] = useState<StoredFileInfo[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File storage hooks
  const { storeFile, retrieveFile, deleteFile, isLoading: storageLoading, error: storageError } = useFileStorage()
  const { files, isInitialized, storageWarning, canUploadFile, getUploadWarning } = useFileStorageState()

  // Restore previously uploaded documents on component mount
  useEffect(() => {
    const restoreDocuments = async () => {
      if (!isInitialized) return

      // Find all document files
      const documentFiles = files.filter(file => file.category === 'document')
      if (documentFiles.length === 0) return

      try {
        const restoredFiles: File[] = []
        const restoredUrls: string[] = []
        const restoredInfos: StoredFileInfo[] = []

        for (const fileInfo of documentFiles) {
          const file = await retrieveFile(fileInfo.id)
          if (file) {
            restoredFiles.push(file)
            restoredUrls.push(URL.createObjectURL(file))
            restoredInfos.push(fileInfo)
            onDocumentUpload?.(file)
          }
        }

        setUploadedFiles(restoredFiles)
        setFileUrls(restoredUrls)
        setStoredFileInfos(restoredInfos)
      } catch (error) {
        console.error('Failed to restore documents:', error)
      }
    }

    restoreDocuments()
  }, [isInitialized, files, retrieveFile, onDocumentUpload])

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
      return `Please upload a supported file (${acceptedFormats.join(', ')})`
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="w-5 h-5 text-blue-600" />
    }
    return <FileText className="w-5 h-5 text-green-600" />
  }

  const isImageFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')
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

        const fileId = await storeFile(file, 'document')
        
        clearInterval(progressInterval)
        setUploadProgress(100)

        // Create stored file info
        const fileInfo: StoredFileInfo = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          category: 'document',
          storedAt: new Date(),
          compressed: false // Will be updated by the storage service
        }
        setStoredFileInfos(prev => [...prev, fileInfo])
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

      setUploadedFiles(prev => [...prev, file])
      const url = URL.createObjectURL(file)
      setFileUrls(prev => [...prev, url])
      onDocumentUpload?.(file)
    } catch (error) {
      console.error('Failed to store document:', error)
      alert('Failed to save document. It will only be available for this session.')
      
      // Continue with session-only storage
      setUploadedFiles(prev => [...prev, file])
      const url = URL.createObjectURL(file)
      setFileUrls(prev => [...prev, url])
      onDocumentUpload?.(file)
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, isInitialized, storeFile, onDocumentUpload])

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

  const removeFile = async (index: number) => {
    try {
      // Delete from persistent storage if available
      const storedFileInfo = storedFileInfos[index]
      if (storedFileInfo && isInitialized) {
        await deleteFile(storedFileInfo.id)
      }
    } catch (error) {
      console.error('Failed to delete document from storage:', error)
    }

    // Clean up local state
    const urlToRevoke = fileUrls[index]
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke)
    }
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    setFileUrls(prev => prev.filter((_, i) => i !== index))
    setStoredFileInfos(prev => prev.filter((_, i) => i !== index))
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadFile = (file: File, url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewFile = (url: string, fileName: string) => {
    if (isImageFile(fileName)) {
      window.open(url, '_blank')
    } else {
      // For documents, we'll just download them since we can't preview in browser
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">
              Supporting Evidence
            </Badge>
            {storedFileInfos.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {storedFileInfos.length} Saved
              </Badge>
            )}
          </div>
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">
            {description} (Max {maxSizeMB}MB, {acceptedFormats.join(', ')})
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

      {/* Upload Area */}
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
          multiple={false}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drag and drop your file here, or{' '}
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

      {/* Upload Progress */}
      {(isUploading || storageLoading) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              {isUploading ? 'Processing file...' : 'Loading files...'}
            </span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {isUploading ? `${uploadProgress}% complete` : 'Loading from storage...'}
          </p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-sm font-medium">Uploaded Files</h5>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => {
              const storedInfo = storedFileInfos[index]
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        {storedInfo && (
                          <>
                            <span>•</span>
                            <span>Saved {storedInfo.storedAt.toLocaleDateString()}</span>
                            {storedInfo.compressed && (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => previewFile(fileUrls[index], file.name)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file, fileUrls[index])}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Image Preview */}
          {uploadedFiles.some((file, index) => isImageFile(file.name)) && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium">Image Preview</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploadedFiles.map((file, index) => 
                  isImageFile(file.name) ? (
                    <div key={index} className="relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={fileUrls[index]}
                        alt={file.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
                        <p className="text-xs truncate">{file.name}</p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Storage Usage Indicator */}
      {isInitialized && (
        <StorageUsageIndicator showDetails={false} />
      )}
    </Card>
  )
}