from pydantic import BaseModel
from typing import Optional # Added for optional fields if any in future

# Existing Schemas
class BotAddSchema(BaseModel):
    project_id: str

class GetProjectsSchema(BaseModel):
    pass

# Added Schemas for Project Details
class ProjectDetailsMetrics(BaseModel):
    files_analyzed: int
    pull_requests_analyzed: int
    pull_requests_merged: int
    pull_requests_closed: int
    pull_requests_open: int

class ProjectDetailsResponse(BaseModel):
    status: str
    details: ProjectDetailsMetrics

# You might also want a schema for individual project data if you pass it around
# For example, if your /users/projects endpoint was to return typed objects
class ProjectStatusModelSchema(BaseModel): # Renamed from ProjectStatusModel to avoid conflict if imported elsewhere
    bot_status: str = "not_added"
    webhook_status: str = "not_configured"

class ProjectMetricsModelSchema(BaseModel): # Renamed from ProjectMetricsModel
    files_analyzed: int = 0
    pull_requests_analyzed: int = 0
    pull_requests_merged: int = 0
    pull_requests_closed: int = 0
    pull_requests_open: int = 0

class ProjectDataSchema(BaseModel): # Renamed from ProjectModel
    id: str 
    name_with_namespace: str 
    html_url: Optional[str] = None
    description: Optional[str] = None
    status: ProjectStatusModelSchema = ProjectStatusModelSchema()
    metrics: ProjectMetricsModelSchema = ProjectMetricsModelSchema()
    last_updated: str 
