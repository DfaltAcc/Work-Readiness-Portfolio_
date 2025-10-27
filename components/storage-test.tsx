"use client"

import React, { useState } from 'react'
import { useFileStorage, useFileStorageState } from '@/lib/storage/file-storage-context'

export function StorageTest() {
  const [testResult, setTestResult] = useState<string>('')
  const { storeFile } = useFileStorage()
  const { isInitialized, storageMethod, files } = useFileStorageState()

  const runStorageTest = async () => {
    try {
      setTestResult('🔄 Testing storage...')
      
      // Create a small test file
      const testContent = 'Hello, this is a test file!'
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
      
      console.log('🧪 Starting storage test with file:', testFile)
      
      // Try to store the file
      const fileId = await storeFile(testFile, 'document')
      
      setTestResult(`✅ Storage test passed! File ID: ${fileId}`)
      console.log('✅ Storage test successful:', fileId)
      
    } catch (error) {
      setTestResult(`❌ Storage test failed: ${error}`)
      console.error('❌ Storage test error:', error)
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-900/90 text-white p-4 rounded-lg text-sm max-w-sm z-50">
      <h4 className="font-bold mb-2">Storage Test</h4>
      <div className="space-y-2">
        <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
        <div>Method: {storageMethod}</div>
        <div>Files: {files.length}</div>
        <button 
          onClick={runStorageTest}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
        >
          Test Storage
        </button>
        {testResult && (
          <div className="text-xs mt-2 p-2 bg-black/30 rounded">
            {testResult}
          </div>
        )}
      </div>
    </div>
  )
}