"use client"

import React, { useEffect, useState } from 'react'
import { useFileStorageState } from '@/lib/storage/file-storage-context'

export function StorageDebug() {
  const { isInitialized, storageMethod, files, storageUsage, storageWarning } = useFileStorageState()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    // Collect debug information
    const info = {
      isInitialized,
      storageMethod,
      filesCount: files.length,
      storageUsage,
      storageWarning,
      indexedDBSupported: !!window.indexedDB,
      localStorageSupported: !!window.localStorage,
      cryptoSupported: !!window.crypto?.subtle,
      timestamp: new Date().toISOString()
    }
    setDebugInfo(info)
    console.log('Storage Debug Info:', info)
  }, [isInitialized, storageMethod, files, storageUsage, storageWarning])

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Storage Debug</h4>
      <div className="space-y-1">
        <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
        <div>Method: {storageMethod}</div>
        <div>Files: {files.length}</div>
        <div>IndexedDB: {debugInfo.indexedDBSupported ? '✅' : '❌'}</div>
        <div>localStorage: {debugInfo.localStorageSupported ? '✅' : '❌'}</div>
        <div>Crypto: {debugInfo.cryptoSupported ? '✅' : '❌'}</div>
        {storageWarning && (
          <div className="text-yellow-400">Warning: {storageWarning.type}</div>
        )}
        {storageUsage && (
          <div>Usage: {storageUsage.percentage.toFixed(1)}%</div>
        )}
      </div>
    </div>
  )
}