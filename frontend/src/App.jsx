import React, { useState, useEffect, useRef } from 'react'
import { Upload, Play, FileText, Activity, Eye, Camera, AlertCircle, Loader2, Download, Monitor } from 'lucide-react'
import axios from 'axios'

function App() {
  // State Management
  const [state, setState] = useState({
    appState: 'idle', // idle, processing, completed, error
    jobId: null,
    status: null,
    progress: 0,
    totalCount: 0,
    resultUrls: {
      video: null,
      report: null
    },
    uploadStatus: ''
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('Initializing YOLO Engine...')
  const fileInputRef = useRef(null)
  const pollingIntervalRef = useRef(null)

  // Poll job status every 2 seconds when processing
  useEffect(() => {
    if (state.appState === 'processing' && state.jobId) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:8000/status/${state.jobId}`)
          const jobData = response.data
          
          setState(prev => ({
            ...prev,
            status: jobData,
            progress: jobData.progress || 0,
            totalCount: jobData.total_count || 0
          }))
          
          if (jobData.status === 'completed') {
            setState(prev => ({
              ...prev,
              appState: 'completed',
              resultUrls: {
                video: jobData.processed_video_url,
                report: jobData.report_url
              }
            }))
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
            }
          } else if (jobData.status === 'failed') {
            setState(prev => ({
              ...prev,
              appState: 'error',
              uploadStatus: `Processing failed: ${jobData.error}`
            }))
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
  }, [state.appState, state.jobId])

  // Cycle through processing messages
  useEffect(() => {
    if (state.appState === 'processing') {
      const messages = [
        'Initializing YOLO Engine...',
        'Analyzing Traffic Flow...',
        'Generating Analytics Report...'
      ]
      let index = 0
      const interval = setInterval(() => {
        index = (index + 1) % messages.length
        setProcessingMessage(messages[index])
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [state.appState])

  const handleFileSelect = async (file) => {
    if (!file) return
    
    setState(prev => ({
      ...prev,
      appState: 'processing',
      uploadStatus: 'Uploading video...'
    }))
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setState(prev => ({
        ...prev,
        jobId: response.data.job_id,
        uploadStatus: 'Video uploaded successfully. Processing started...'
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        appState: 'error',
        uploadStatus: `Upload failed: ${error.message}`
      }))
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
    setState({
      appState: 'idle',
      jobId: null,
      status: null,
      progress: 0,
      totalCount: 0,
      resultUrls: {
        video: null,
        report: null
      },
      uploadStatus: ''
    })
  }

  // Render different states
  const renderIdleState = () => (
    <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
      isDragging ? 'border-[#8a3a6c] bg-[#8a3a6c]/10 shadow-lg shadow-[#8a3a6c]/20' : 'border-slate-600 hover:border-[#8a3a6c] hover:bg-[#8a3a6c]/5'
    }`} 
      onDragEnter={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={handleDrop} 
      onClick={() => fileInputRef.current?.click()}>
      <Upload className={`h-12 w-12 mx-auto mb-4 transition-all duration-300 ${
        isDragging ? 'text-[#8a3a6c] animate-bounce' : 'text-slate-400'
      }`} />
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
      <Loader2 className="h-16 w-16 mx-auto mb-6 text-[#8a3a6c] animate-spin" />
      <h3 className="text-xl font-semibold text-white mb-2">{processingMessage}</h3>
      
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
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - (state.progress || 0) / 100)}`}
            className="text-[#8a3a6c] transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{state.progress || 0}%</span>
        </div>
      </div>
      
      {/* Live Vehicle Counter */}
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4 max-w-sm mx-auto">
        <div className="text-6xl font-bold text-[#8a3a6c] mb-2">{state.totalCount || 0}</div>
        <div className="text-sm text-slate-400">Vehicles Counted</div>
      </div>
    </div>
  )

  const renderCompletedState = () => (
    <div>
      {/* Final Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4 shadow-[#8a3a6c]/20 shadow-lg">
          <div className="text-2xl font-bold text-[#8a3a6c]">{state.totalCount || 0}</div>
          <div className="text-sm text-slate-400">Total Vehicles</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4">
          <div className="text-2xl font-bold text-green-400">100%</div>
          <div className="text-sm text-slate-400">Processing Complete</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4">
          <div className="text-2xl font-bold text-blue-400">{state.status?.processing_duration ? `${state.status.processing_duration}s` : '0.0s'}</div>
          <div className="text-sm text-slate-400">Analysis Time</div>
        </div>
      </div>

      {/* Vehicle Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4">
          <div className="text-xl font-semibold text-white mb-2">Cars</div>
          <div className="text-2xl font-bold text-[#8a3a6c]">{state.status?.type_counts?.car || 0}</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4">
          <div className="text-xl font-semibold text-white mb-2">Trucks</div>
          <div className="text-2xl font-bold text-[#8a3a6c]">{state.status?.type_counts?.truck || 0}</div>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-4">
          <div className="text-xl font-semibold text-white mb-2">Buses</div>
          <div className="text-2xl font-bold text-[#8a3a6c]">{state.status?.type_counts?.bus || 0}</div>
        </div>
      </div>

      {/* Video Player */}
      {state.resultUrls?.video ? (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Play className="h-5 w-5 mr-2 text-[#8a3a6c]" />
            Processed Video
          </h3>
          <div className="relative bg-black rounded-lg overflow-hidden border-2 border-slate-700">
            <video
              controls
              className="w-full rounded-lg"
              src={state.resultUrls.video}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/5 p-6 mb-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Video Monitor</h3>
            <p className="text-slate-400 text-center">Waiting for analysis...</p>
          </div>
        </div>
      )}

      {/* Download Report Button */}
      {state.resultUrls?.report && (
        <a
          href={state.resultUrls.report}
          download
          className="w-full bg-gradient-to-r from-[#8a3a6c] to-[#9b5b7d] hover:from-[#9b5b7d] hover:to-[#8a3a6c] text-white px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#8a3a6c]/20"
        >
          <Download className="h-5 w-5 mr-2" />
          Download CSV Report
        </a>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img src='/logo.png' className="h-8 w-8 rounded-full bg-white p-1" alt="ANTS Group Logo" />
              <h1 className="text-xl font-bold text-white">ANTS Group | Smart Traffic Analyzer</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Activity className="h-4 w-4 text-[#8a3a6c]" />
              <span className="capitalize">{state.appState}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/10 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  {state.appState === 'idle' && <Upload className="h-5 w-5 mr-2 text-[#8a3a6c]" />}
                  {state.appState === 'processing' && <Loader2 className="h-5 w-5 mr-2 text-[#8a3a6c] animate-spin" />}
                  {state.appState === 'completed' && <Eye className="h-5 w-5 mr-2 text-[#8a3a6c]" />}
                  {state.appState === 'idle' && 'Video Upload'}
                  {state.appState === 'processing' && 'Processing Video'}
                  {state.appState === 'completed' && 'Analysis Results'}
                </h2>
                {state.appState !== 'idle' && (
                  <button
                    onClick={resetApp}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Start New Analysis
                  </button>
                )}
              </div>
              
              {/* State-specific content */}
              {state.appState === 'idle' && renderIdleState()}
              {state.appState === 'processing' && renderProcessingState()}
              {state.appState === 'completed' && renderCompletedState()}
              
              {state.uploadStatus && state.appState === 'idle' && (
                <div className="mt-4 p-3 bg-slate-800 rounded-md flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-[#8a3a6c]" />
                  <span className="text-sm text-slate-300">{state.uploadStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/10 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Backend</span>
                  <span className="text-green-400 text-sm flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Live
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">State</span>
                  <span className={`text-sm capitalize ${
                    state.appState === 'idle' ? 'text-slate-500' :
                    state.appState === 'processing' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {state.appState}
                  </span>
                </div>
                {state.jobId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Job ID</span>
                    <span className="text-[#8a3a6c] text-sm">
                      {state.jobId.length > 12 ? `${state.jobId.slice(0, 4)}...${state.jobId.slice(-4)}` : state.jobId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/10 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {state.resultUrls?.report && (
                  <a
                    href={state.resultUrls.report}
                    download
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center justify-center border border-[#8a3a6c] hover:border-[#a04d85]"
                  >
                    <FileText className="h-4 w-4 mr-2 text-[#8a3a6c]" />
                    Download Report
                  </a>
                )}
                <button 
                  onClick={resetApp}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors border border-[#8a3a6c] hover:border-[#a04d85]"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-500 text-sm font-light">
        © 2026 ANTS Group Technical Assessment
      </footer>
    </div>
  )
}

export default App
