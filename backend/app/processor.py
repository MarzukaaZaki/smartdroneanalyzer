"""
Video processing pipeline with YOLOv8 and ByteTrack
Handles vehicle detection, tracking, and counting
"""

import os
import time
import cv2
import pandas as pd
from ultralytics import YOLO
from .state import jobs

# Configuration
COUNTING_LINE_Y_RATIO = 0.6  # Sweet spot for both drone perspectives

# COCO class names for vehicles we want to count
VEHICLE_CLASSES = {
    2: 'car',
    5: 'bus', 
    7: 'truck'
    # Note: 3=motorcycle excluded, 0=person excluded
}

def process_video_task(video_path: str, job_id: str):
    """
    Process video to detect and track vehicles with adaptive processing
    """
    try:
        # Start timing
        start_time = time.time()
        
        # Initialize job state
        jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "total_count": 0
        }
        
        # Initialize type counts for breakdown
        type_counts = {"car": 0, "truck": 0, "bus": 0}
        
        # Load YOLOv8 model with ByteTrack
        model = YOLO('yolov8n.pt')
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"Cannot open video: {video_path}")
        
        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Calculate video duration and set adaptive parameters
        video_duration = total_frames / fps
        if video_duration < 60:  # < 60 seconds
            FRAME_SKIP = 1  # 100% accuracy for short videos
            save_video = True
            preview_limit_frames = total_frames  # Save entire short video
        else:  # >= 60 seconds
            FRAME_SKIP = 3  # Better balance for long videos to catch fast cars
            save_video = True
            preview_limit_frames = int(120 * fps)  # 120 seconds preview
        
        # Setup video writer for processed output (if saving video)
        out = None
        if save_video:
            os.makedirs("storage/processed_videos", exist_ok=True)
            output_path = f"storage/processed_videos/processed_{job_id}.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            out = cv2.VideoWriter(output_path, fourcc, fps // FRAME_SKIP, (width, height))
        
        # Counting line position
        counting_line_y = int(height * COUNTING_LINE_Y_RATIO)
        counted_ids = set()
        
        # Leading Edge methodology with edge tracking for bidirectional counting
        previous_positions = {}  # track_id -> {'y1': prev_y1, 'y2': prev_y2} for leading edge detection
        
        # Data collection for report
        detection_data = []
        frame_count = 0
        processed_frames = 0
        video_writer_closed = False
        
        while True:
            print(f"DEBUG: Processing frame {frame_count}")
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Skip frames for performance
            if frame_count % FRAME_SKIP != 0:
                continue
            
            processed_frames += 1
            
            # Draw counting line on every frame (before detection)
            cv2.line(frame, (0, counting_line_y), (width, counting_line_y), (0, 0, 255), 3)
            cv2.putText(frame, 'COUNTING LINE', (10, counting_line_y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Run YOLO tracking with class filtering and lower confidence for early detection
            results = model.track(frame, persist=True, classes=[2, 5, 7], conf=0.20, tracker='bytetrack.yaml')
            
            if results and results[0].boxes is not None:
                boxes = results[0].boxes
                if boxes.id is not None:
                    # Get tracking IDs and positions
                    track_ids = boxes.id.cpu().numpy().astype(int)
                    xyxy = boxes.xyxy.cpu().numpy()
                    class_ids = boxes.cls.cpu().numpy().astype(int)
                    confidences = boxes.conf.cpu().numpy().astype(float)
                    
                    # Track current frame IDs to avoid stale data
                    current_frame_ids = set()
                    
                    for i, track_id in enumerate(track_ids):
                        x1, y1, x2, y2 = xyxy[i]
                        class_id = class_ids[i]
                        
                        # Calculate positions
                        center_x = (x1 + x2) / 2
                        center_y = (y1 + y2) / 2
                        
                        # Track current frame IDs
                        current_frame_ids.add(track_id)
                        
                        # Leading Edge Logic: Use y1/y2 edges for stable bidirectional counting
                        if track_id in previous_positions:
                            prev_y1, prev_y2 = previous_positions[track_id]['y1'], previous_positions[track_id]['y2']
                            current_y1, current_y2 = y1, y2
                            
                            # Downward Cross: prev_y2 < line AND curr_y2 >= line (bottom edge crosses)
                            # Upward Cross: prev_y1 > line AND curr_y1 <= line (top edge crosses)
                            if ((prev_y2 < counting_line_y and current_y2 >= counting_line_y) or 
                                (prev_y1 > counting_line_y and current_y1 <= counting_line_y)) and track_id not in counted_ids:
                                
                                counted_ids.add(track_id)
                                jobs[job_id]["total_count"] = len(counted_ids)
                                
                                # Determine direction
                                direction = 'Away' if (prev_y2 < counting_line_y and current_y2 >= counting_line_y) else 'Toward'
                                
                                # Update type counts
                                vehicle_type = VEHICLE_CLASSES[class_id]
                                type_counts[vehicle_type] += 1
                                
                                # Log counting event
                                print(f"[COUNT] Frame {frame_count}: {vehicle_type} ID:{track_id} crossed line {direction}. Total: {len(counted_ids)}")
                                
                                # Record detection data with enriched fields
                                detection_data.append({
                                    'frame': frame_count,
                                    'timestamp': round(frame_count / fps, 2),
                                    'track_id': int(track_id),
                                    'vehicle_type': vehicle_type,
                                    'confidence': round(confidences[i], 3),
                                    'direction': direction,
                                    'event_type': 'Line Crossing'
                                })
                        
                        # Update previous positions only for current frame IDs
                        previous_positions[track_id] = {'y1': y1, 'y2': y2}
                        
                        # Draw bounding box and ID for all detected vehicles
                        color = (0, 255, 0) if track_id in counted_ids else (255, 255, 255)  # Green if counted, Cyan if not
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        
                        # Draw track ID and class name
                        label = f'ID:{track_id} {VEHICLE_CLASSES[class_id]}'
                        cv2.putText(frame, label, (int(x1), int(y1)-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                        
                        # Draw center point (for bidirectional counting visualization)
                        cv2.circle(frame, (int(center_x), int(center_y)), 4, color, -1)
            
            # Draw total count on video in large font
            count_text = f"TOTAL VEHICLES: {len(counted_ids)}"
            cv2.putText(frame, count_text, (20, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
            cv2.putText(frame, count_text, (20, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 4)  # Black outline
            
            # Visual Preview Management: Only write frames within preview limit
            if save_video and out is not None and frame_count <= preview_limit_frames:
                out.write(frame)
            elif save_video and out is not None and frame_count > preview_limit_frames and not video_writer_closed:
                # Close video writer after preview limit but continue processing
                out.release()
                video_writer_closed = True
                print(f"[INFO] Video preview completed at {preview_limit_frames/fps:.1f}s. Continuing processing for full analysis...")
            
            # Update state & reporting every 50 frames
            if processed_frames % 50 == 0:
                progress = min(100, int((frame_count / total_frames) * 100))
                jobs[job_id]["progress"] = progress
                jobs[job_id]["total_count"] = len(counted_ids)
        
        # Release resources
        cap.release()
        if out is not None:
            out.release()
        
        # Calculate processing duration
        end_time = time.time()
        processing_duration = round(end_time - start_time, 2)
        
        # Generate CSV report with enriched data
        os.makedirs("storage/reports", exist_ok=True)
        report_path = f"storage/reports/report_{job_id}.csv"
        
        # Create DataFrame with new column structure
        df = pd.DataFrame(detection_data)
        
        # Save clean CSV data
        df.to_csv(report_path, index=False)
        
        # Save separate summary JSON file
        import json
        summary_data = {
            'total_count': len(counted_ids),
            'type_counts': type_counts,
            'processing_duration': processing_duration,
            'job_id': job_id
        }
        summary_path = f"storage/reports/summary_{job_id}.json"
        with open(summary_path, 'w') as f:
            json.dump(summary_data, f, indent=2)
        
        # Update final job status with enriched data
        jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "total_count": len(counted_ids),
            "type_counts": type_counts,
            "processing_duration": processing_duration,
            "processed_video_path": output_path,
            "processed_video_url": f"http://localhost:8000/download/video/{job_id}",
            "report_path": report_path,
            "report_url": f"http://localhost:8000/download/report/{job_id}"
        }
        
    except Exception as e:
        # Update job status to failed
        jobs[job_id] = {
            "status": "failed",
            "progress": jobs[job_id].get("progress", 0),
            "total_count": jobs[job_id].get("total_count", 0),
            "error": str(e)
        }
        raise e