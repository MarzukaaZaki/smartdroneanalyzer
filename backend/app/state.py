"""
Global state management for job tracking
Avoids circular imports between API and processor
"""

# Global jobs dictionary to track all processing jobs
jobs = {}
