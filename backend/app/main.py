import os
import uuid
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .state import jobs
from .processor import process_video_task

app = FastAPI(
    title="Smart Drone Traffic Analyzer",
    description="API for analyzing drone video footage to detect and track vehicles",
    version="1.0.0"
)

# Add CORS middleware to allow React frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],  # React dev server + Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for processed videos and reports
app.mount("/static", StaticFiles(directory="storage"), name="static")

@app.get("/")
async def root():
    """
    Root endpoint to verify API is running
    """
    return {
        "message": "Welcome to Smart Drone Traffic Analyzer API",
        "status": "running",
        "version": "1.0.0",
        "description": "Upload drone videos to detect and track vehicles"
    }

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Upload video file and create processing job
    """
    try:
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)
        
        # Create file path using job_id
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
        file_path = f"uploads/{job_id}.{file_extension}"
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Add processing task to background
        background_tasks.add_task(process_video_task, file_path, job_id)
        
        return {
            "job_id": job_id,
            "message": "Video uploaded successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get job status and progress
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]

@app.get("/download/video/{job_id}")
async def download_video(job_id: str):
    """
    Download processed video file
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = jobs[job_id]
    if job_data.get("status") != "completed" or not job_data.get("processed_video_path"):
        raise HTTPException(status_code=404, detail="Video not available")
    
    video_path = job_data["processed_video_path"]
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    filename = f"processed_{job_id}.mp4"
    return FileResponse(
        path=video_path,
        filename=filename,
        media_type="video/mp4"
    )

@app.get("/download/report/{job_id}")
async def download_report(job_id: str):
    """
    Download CSV report file
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_data = jobs[job_id]
    if job_data.get("status") != "completed" or not job_data.get("report_path"):
        raise HTTPException(status_code=404, detail="Report not available")
    
    report_path = job_data["report_path"]
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    filename = f"report_{job_id}.csv"
    return FileResponse(
        path=report_path,
        filename=filename,
        media_type="text/csv"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)