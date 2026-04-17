import React, { useState, useEffect, useRef } from 'react'
import { Upload, Play, FileText, Activity, Eye, Camera, AlertCircle, Loader2, Download } from 'lucide-react'
import axios from 'axios'

function App() {
  const [appState, setAppState] = useState('idle') // idle, processing, completed
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const pollingIntervalRef = useRef(null)

  // Poll job status every 2 seconds when processing
  useEffect(() => {
    if (appState === 'processing' && jobId) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:8000/status/${jobId}`)
          setJobStatus(response.data)
          
          if (response.data.status === 'completed') {
            setAppState('completed')
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
          } else if (response.data.status === 'failed') {
            setAppState('idle')
            setUploadStatus(`Processing failed: ${response.data.error}`)
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
          }
        } catch (error) {
          console.error('Error polling status:', error)
        }
      }, 2000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [appState, jobId])

  const handleFileSelect = async (file) => {
    if (!file) return
    
    setUploadStatus('Uploading video...')
    setAppState('processing')
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setJobId(response.data.job_id)
      setUploadStatus('Video uploaded successfully. Processing started...')
    } catch (error) {
      setUploadStatus(`Upload failed: ${error.message}`)
      setAppState('idle')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const resetApp = () => {
    setAppState('idle')
    setJobId(null)
    setJobStatus(null)
    setUploadStatus('')
  }

  // Render different states
  const renderIdleState = () => (
    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors cursor-pointer"
         onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
         onClick={() => fileInputRef.current?.click()}>
      <Upload className="h-12 w-12 mx-auto mb-4 text-slate-500" />
      <p className="text-slate-400 mb-4">Drop your video file here or click to browse</p>
      <p className="text-xs text-slate-500 mb-4">Supports MP4, AVI, MOV files</p>
      <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
        Select Video File
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )

  const renderProcessingState = () => (
    <div className="text-center py-8">
      <Loader2 className="h-16 w-16 mx-auto mb-6 text-cyan-400 animate-spin" />
      <h3 className="text-xl font-semibold text-white mb-2">Processing Video</h3>
      <p className="text-slate-400 mb-4">Job ID: {jobId}</p>
      
      {/* Progress Circle */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-800"
          />
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - (jobStatus?.progress || 0) / 100)}`}
            className="text-cyan-400 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{jobStatus?.progress || 0}%</span>
        </div>
      </div>
      
      {/* Live Vehicle Counter */}
      <div className="bg-slate-800 rounded-lg p-4 max-w-sm mx-auto">
        <div className="text-3xl font-bold text-cyan-400">{jobStatus?.total_count || 0}</div>
        <div className="text-sm text-slate-400">Vehicles Counted</div>
      </div>
    </div>
  )

  const renderCompletedState = () => (
    <div>
      {/* Final Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-cyan-400">{jobStatus?.total_count || 0}</div>
          <div className="text-sm text-slate-400">Total Vehicles</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">100%</div>
          <div className="text-sm text-slate-400">Processing Complete</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{jobId}</div>
          <div className="text-sm text-slate-400">Job ID</div>
        </div>
      </div>

      {/* Video Player */}
      {jobStatus?.processed_video_url && (
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Play className="h-5 w-5 mr-2 text-cyan-400" />
            Processed Video
          </h3>
          <video
            controls
            className="w-full rounded-lg"
            src={jobStatus.processed_video_url}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Download Report Button */}
      {jobStatus?.report_url && (
        <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center">
          <Download className="h-5 w-5 mr-2" />
          Download CSV Report
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Camera className="h-8 w-8 text-cyan-400" />
              <h1 className="text-xl font-bold text-white">Traffic Surveillance System</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Activity className="h-4 w-4" />
              <span className="capitalize">{appState}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  {appState === 'idle' && <Upload className="h-5 w-5 mr-2 text-cyan-400" />}
                  {appState === 'processing' && <Loader2 className="h-5 w-5 mr-2 text-cyan-400 animate-spin" />}
                  {appState === 'completed' && <Eye className="h-5 w-5 mr-2 text-cyan-400" />}
                  {appState === 'idle' && 'Video Upload'}
                  {appState === 'processing' && 'Processing Video'}
                  {appState === 'completed' && 'Analysis Results'}
                </h2>
                {appState !== 'idle' && (
                  <button
                    onClick={resetApp}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Start New Analysis
                  </button>
                )}
              </div>
              
              {/* State-specific content */}
              {appState === 'idle' && renderIdleState()}
              {appState === 'processing' && renderProcessingState()}
              {appState === 'completed' && renderCompletedState()}
              
              {uploadStatus && appState === 'idle' && (
                <div className="mt-4 p-3 bg-slate-800 rounded-md flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-cyan-400" />
                  <span className="text-sm text-slate-300">{uploadStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Panel */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Backend</span>
                  <span className="text-green-400 text-sm">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">State</span>
                  <span className={`text-sm capitalize ${
                    appState === 'idle' ? 'text-slate-500' :
                    appState === 'processing' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {appState}
                  </span>
                </div>
                {jobId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Job ID</span>
                    <span className="text-cyan-400 text-sm">{jobId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {jobStatus?.report_url && (
                  <a
                    href={jobStatus.report_url}
                    download
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center justify-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download Report
                  </a>
                )}
                <button 
                  onClick={resetApp}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
