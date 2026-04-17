# Smart Drone Traffic Analyzer
An end-to-end traffic surveillance system that uses Computer Vision to identify, track, and count vehicles in drone footage. Built for high-performance processing of both short-form clips and long-form (30min+) datasets.
## Local Setup & Installation

### Prerequisites
Make sure you have the following installed:
- Python 3.10+
- Node.js & npm

---

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment

# On Windows
.\venv\Scripts\activate

# On macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload
```

---

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

### Access the Application

Once both servers are running:

- Frontend: http://localhost:5173 *(or as shown in terminal)*
- Backend API: http://127.0.0.1:8000

## System Architecture

The application follows a **decoupled full-stack architecture** to ensure a responsive UI during computationally heavy video processing.

### Backend (FastAPI & YOLOv8)
- Built with FastAPI for high-performance asynchronous handling  
- Video processing runs via `BackgroundTasks` to avoid blocking requests  
- API immediately returns a **Job ID**, preventing browser timeouts (even for long videos ~30+ minutes)

### Frontend (React & Vite)
- Designed with a **“Command Center” UI** using Tailwind CSS  
- Communicates with backend via **REST polling (every 2 seconds)**  
- Chosen over WebSockets for simplicity, reliability, and easier debugging  

### Storage Strategy
- Static directory mounted for serving processed outputs  
- Videos and CSV reports are accessed directly via URLs  
- Reduces API overhead and improves delivery efficiency  

---

## Tracking Methodology & Edge Case Handling

To address **double-counting and occlusions**, the system implements a custom  
**Bidirectional Leading-Edge Counting Engine**.

### 1. Temporal State Tracking
- Maintains a `track_history` dictionary across frames  
- Detects **crossing events** using motion over time (not single-frame position)  
- Solves the “teleportation” issue where fast vehicles skip the counting line  

---

### 2. Bidirectional Leading-Edge Logic
Handles traffic moving in both directions:

- **Downward traffic** → triggered when bottom edge (`y2`) crosses the line  
- **Upward traffic** → triggered when top edge (`y1`) crosses the line  

This ensures vehicles are counted **as soon as they enter the zone**, regardless of direction or perspective.

---

### 3. Double-Counting Prevention
- Uses a persistent **Unique ID Registry** (`set`)  
- Each tracked object is counted only once per session  
- Handles:
  - Vehicles stopping on the line  
  - Bounding box jitter / oscillation  

---

## ⚙️ Engineering Assumptions & Optimizations

### Adaptive Frame Skipping
- Detects video duration dynamically  
- `< 60s` → process every frame (maximum accuracy)  
- `≥ 60s` → apply frame skipping (`FRAME_SKIP = 3–5`) for performance  

---

### Hybrid Visualization Preview
- Visual overlays rendered only for the **first 120 seconds**  
- Full video still processed in the background  
- Ensures:
  - Smaller output files  
  - Smooth browser playback  
  - Complete and accurate final CSV report  

---

### Native Browser Compatibility
- Videos encoded using **H.264 (`avc1`) codec**  
- Ensures seamless playback in standard HTML5 video players  
- No external plugins required  

