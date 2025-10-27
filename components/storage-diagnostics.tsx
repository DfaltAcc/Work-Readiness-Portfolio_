"use client"

import React, { useState, useEffect } from 'react'

export function StorageDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    const results: string[] = []
    const diag: any = {}

    // Test 1: Check if IndexedDB is available
    diag.indexedDBAvailable = !!window.indexedDB
    results.push(`IndexedDB Available: ${diag.indexedDBAvailable ? '✅' : '❌'}`)

    // Test 2: Check if localStorage is available
    diag.localStorageAvailable = !!window.localStorage
    results.push(`localStorage Available: ${diag.localStorageAvailable ? '✅' : '❌'}`)

    // Test 3: Check if crypto.subtle is available
    diag.cryptoAvailable = !!(window.crypto && window.crypto.subtle)
    results.push(`Crypto API Available: ${diag.cryptoAvailable ? '✅' : '❌'}`)

    // Test 4: Try to open IndexedDB
    if (diag.indexedDBAvailable) {
      try {
        const request = indexedDB.open('test-db', 1)
        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            request.result.close()
            indexedDB.deleteDatabase('test-db')
            resolve(true)
          }
          request.onerror = () => reject(request.error)
          request.onupgradeneeded = () => {
            // Create a test store
            request.result.createObjectStore('test')
          }
        })
        diag.indexedDBWorking = true
        results.push('IndexedDB Test: ✅ Working')
      } catch (error) {
        diag.indexedDBWorking = false
        results.push(`IndexedDB Test: ❌ Failed - ${error}`)
      }
    }

    // Test 5: Try localStorage
    if (diag.localStorageAvailable) {
      try {
        localStorage.setItem('test-key', 'test-value')
        const value = localStorage.getItem('test-key')
        localStorage.removeItem('test-key')
        diag.localStorageWorking = value === 'test-value'
        results.push(`localStorage Test: ${diag.localStorageWorking ? '✅' : '❌'} Working`)
      } catch (error) {
        diag.localStorageWorking = false
        results.push(`localStorage Test: ❌ Failed - ${error}`)
      }
    }

    // Test 6: Check storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        diag.storageQuota = estimate.quota
        diag.storageUsed = estimate.usage
        results.push(`Storage Quota: ${Math.round((estimate.quota || 0) / 1024 / 1024)}MB available`)
        results.push(`Storage Used: ${Math.round((estimate.usage || 0) / 1024 / 1024)}MB`)
      } catch (error) {
        results.push(`Storage Quota: ❌ Failed to check - ${error}`)
      }
    }

    setDiagnostics(diag)
    setTestResults(results)
  }

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed top-4 left-4 bg-gray-900/95 text-white p-4 rounded-lg text-xs max-w-md z-50 max-h-96 overflow-y-auto">
      <h4 className="font-bold mb-2 text-yellow-400">🔍 Storage Diagnostics</h4>
      <div className="space-y-1">
        {testResults.map((result, index) => (
          <div key={index} className="font-mono">{result}</div>
        ))}
      </div>
      <button 
        onClick={runDiagnostics}
        className="mt-3 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
      >
        Re-run Tests
      </button>
    </div>
  )
}