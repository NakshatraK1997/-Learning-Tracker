from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID


# Token
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "learner"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    """
    Schema for updating user profile information.
    All fields are optional to allow partial updates.
    """

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class User(UserBase):
    id: UUID
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User


# Quiz Schemas
class Question(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    answer: Optional[str] = None  # Optional letter format for backwards compat

    class Config:
        from_attributes = True


class QuizBase(BaseModel):
    title: str
    questions: List[Question]


class QuizCreate(QuizBase):
    course_id: UUID


class Quiz(QuizBase):
    id: UUID
    course_id: UUID

    class Config:
        from_attributes = True


class QuizSubmissionCreate(BaseModel):
    quiz_id: UUID
    answers: List[int]  # List of selected indices


class QuizSubmission(BaseModel):
    id: UUID
    quiz_id: UUID
    user_id: UUID
    score: int
    submitted_at: datetime

    class Config:
        from_attributes = True


# Resource Schemas
class ResourceBase(BaseModel):
    file_name: str
    file_size: str
    file_url: str


class ResourceCreate(ResourceBase):
    course_id: UUID


class Resource(ResourceBase):
    id: UUID
    course_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Course Schemas
class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None


class Course(CourseBase):
    id: UUID
    created_at: datetime
    quizzes: List[Quiz] = []
    resources: List[Resource] = []

    class Config:
        from_attributes = True


# Progress
class ProgressBase(BaseModel):
    is_completed: bool = False
    playback_position: float = 0.0
    notes: Optional[str] = None


class ProgressUpdate(ProgressBase):
    pass


class Progress(ProgressBase):
    id: UUID
    user_id: UUID
    course_id: UUID
    last_updated: datetime

    class Config:
        from_attributes = True


# Enrollment
class AssignCourse(BaseModel):
    user_id: UUID
    course_id: UUID


# Reports


class UserReportItem(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    courses_enrolled: int
    courses_completed: int
    completion_percentage: float


class CourseProgressReport(BaseModel):
    course_id: UUID
    course_title: str
    video_status: str  # "Not Started", "Started", "Completed" (though completed is mostly quiz based now)
    quiz_score: Optional[int]
    is_completed: bool


class UserDetailedReport(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    courses: List[CourseProgressReport]
