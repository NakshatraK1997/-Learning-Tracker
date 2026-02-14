import uuid
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    String,
    Text,
    DateTime,
    Float,
    JSON,
    Integer,  # Keep for backwards compatibility if needed
    Uuid,  # Generic UUID type compatible with SQLite
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="learner")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship(
        "Enrollment", back_populates="student", cascade="all, delete-orphan"
    )
    progress = relationship(
        "Progress", back_populates="student", cascade="all, delete-orphan"
    )
    quiz_submissions = relationship(
        "QuizSubmission", back_populates="student", cascade="all, delete-orphan"
    )


class Course(Base):
    __tablename__ = "courses"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    video_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )
    progress = relationship(
        "Progress", back_populates="course", cascade="all, delete-orphan"
    )
    quizzes = relationship(
        "Quiz", back_populates="course", cascade="all, delete-orphan"
    )
    resources = relationship(
        "Resource", back_populates="course", cascade="all, delete-orphan"
    )


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_id = Column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    file_name = Column(String)
    file_size = Column(String)
    file_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="resources")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_id = Column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String)
    questions = Column(JSON)

    course = relationship("Course", back_populates="quizzes")
    submissions = relationship(
        "QuizSubmission", back_populates="quiz", cascade="all, delete-orphan"
    )

    @property
    def normalized_questions(self):
        """Convert questions to include correct_index if they only have answer"""
        if not self.questions:
            return []

        normalized = []
        for q in self.questions:
            q_copy = dict(q)
            # If answer exists but correct_index doesn't, convert it
            if "answer" in q_copy and "correct_index" not in q_copy:
                answer_letter = q_copy["answer"]
                if answer_letter:
                    q_copy["correct_index"] = ord(answer_letter.upper()) - ord("A")
            # If correct_index exists but answer doesn't, convert it
            elif "correct_index" in q_copy and "answer" not in q_copy:
                idx = q_copy["correct_index"]
                if idx is not None:
                    q_copy["answer"] = chr(ord("A") + idx)
            normalized.append(q_copy)
        return normalized


class QuizSubmission(Base):
    __tablename__ = "quiz_submissions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    quiz_id = Column(Uuid(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"))
    score = Column(Integer)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="quiz_submissions")
    quiz = relationship("Quiz", back_populates="submissions")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    assigned_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    is_completed = Column(Boolean, default=False)
    playback_position = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User", back_populates="progress")
    course = relationship("Course", back_populates="progress")
