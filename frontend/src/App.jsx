import React, { useState } from 'react'
import { Upload, Play, FileText, Activity, Eye, Camera, AlertCircle } from 'lucide-react'

function App() {
  const [uploadStatus, setUploadStatus] = useState('')
  const [jobStatus, setJobStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

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
              <span>Live Monitoring</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-cyan-400" />
                  Video Upload
                </h2>
              </div>
              
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400 mb-4">Drop your video file here or click to browse</p>
                <p className="text-xs text-slate-500 mb-4">Supports MP4, AVI, MOV files</p>
                <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
                  Select Video File
                </button>
              </div>
              
              {uploadStatus && (
                <div className="mt-4 p-3 bg-slate-800 rounded-md flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-cyan-400" />
                  <span className="text-sm text-slate-300">{uploadStatus}</span>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="mt-6 bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-cyan-400" />
                Analysis Results
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">0</div>
                  <div className="text-sm text-slate-400">Total Vehicles Detected</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">0</div>
                  <div className="text-sm text-slate-400">Processing Progress</div>
                </div>
              </div>
              
              {/* Video Player Placeholder */}
              <div className="mt-6 bg-slate-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                <Play className="h-12 w-12 text-slate-600" />
              </div>
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
                  <span className="text-slate-400">Processing</span>
                  <span className={`text-sm ${isProcessing ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {isProcessing ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center justify-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Report
                </button>
                <button className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors">
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
