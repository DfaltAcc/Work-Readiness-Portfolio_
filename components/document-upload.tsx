"use client"

import { useState, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Image, X, Download, Eye } from "lucide-react"

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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setUploadedFiles(prev => [...prev, file])
          const url = URL.createObjectURL(file)
          setFileUrls(prev => [...prev, url])
          onDocumentUpload?.(file)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }, [maxSizeMB, acceptedFormats, onDocumentUpload])

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

  const removeFile = (index: number) => {
    const urlToRevoke = fileUrls[index]
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke)
    }
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    setFileUrls(prev => prev.filter((_, i) => i !== index))
    
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
          <Badge variant="secondary" className="mb-2">
            Supporting Evidence
          </Badge>
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">
            {description} (Max {maxSizeMB}MB, {acceptedFormats.join(', ')})
          </p>
        </div>
      </div>

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
      {isUploading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Uploading file...</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-sm font-medium">Uploaded Files</h5>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
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
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
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
    </Card>
  )
}