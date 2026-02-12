from app.models import Course, Quiz
from app.database import SessionLocal

# Setup DB connection
db = SessionLocal()


def populate_java_quiz():
    print("Populating Java Quiz...")

    # 1. Find or Create Java Course
    java_course = db.query(Course).filter(Course.title.ilike("%Java%")).first()
    if not java_course:
        print("Java course not found. Creating 'Introduction to Java'...")
        java_course = Course(
            title="Introduction to Java",
            description="Learn the basics of Java programming and LMS concepts.",
            video_url="https://www.youtube.com/watch?v=eIrMbAQSU34",  # Placeholder or actual video
        )
        db.add(java_course)
        db.commit()
        db.refresh(java_course)

    print(f"Using Course: {java_course.title} ({java_course.id})")

    # 2. Check if Quiz already exists
    existing_quiz = (
        db.query(Quiz)
        .filter(
            Quiz.course_id == java_course.id, Quiz.title == "Java & LMS Knowledge Check"
        )
        .first()
    )
    if existing_quiz:
        print("Quiz already exists. updating questions...")
        quiz = existing_quiz
    else:
        print("Creating new quiz...")
        quiz = Quiz(course_id=java_course.id, title="Java & LMS Knowledge Check")

    # 3. Define 25 Questions
    questions = [
        # Java Basics
        {
            "question": "What is the correct syntax to output 'Hello World' in Java?",
            "options": [
                "print ('Hello World');",
                "Console.WriteLine('Hello World');",
                "System.out.println('Hello World');",
                "echo('Hello World');",
            ],
            "correct_index": 2,
        },
        {
            "question": "Which data type is used to create a variable that should store text?",
            "options": ["String", "txt", "string", "Text"],
            "correct_index": 0,
        },
        {
            "question": "How do you create a variable with the numeric value 5?",
            "options": ["num x = 5", "x = 5;", "float x = 5;", "int x = 5;"],
            "correct_index": 3,
        },
        {
            "question": "Which method can be used to find the length of a string?",
            "options": ["getSize()", "length()", "len()", "getLength()"],
            "correct_index": 1,
        },
        {
            "question": "Which operator is used to add together two values?",
            "options": ["&", "*", "+", "++"],
            "correct_index": 2,
        },
        {
            "question": "The value of a string variable can be surrounded by single quotes.",
            "options": ["True", "False", "Depends on OS", "Only characters"],
            "correct_index": 1,
        },
        {
            "question": "Which method can be used to return a string in upper case letters?",
            "options": ["touppercase()", "toUpperCase()", "tuc()", "upperCase()"],
            "correct_index": 1,
        },
        {
            "question": "Which data type is used to create a variable that should store text?",
            "options": ["MyString", "string", "String", "txt"],
            "correct_index": 2,
        },
        {
            "question": "How do you start writing a method in Java?",
            "options": [
                "method myMethod()",
                "function myMethod()",
                "void myMethod()",
                "proc myMethod()",
            ],
            "correct_index": 2,
        },
        {
            "question": "Which keyword is used to create a class in Java?",
            "options": ["class", "MyClass", "class()", "className"],
            "correct_index": 0,
        },
        {
            "question": "What is the correct way to create an object called myObj of MyClass?",
            "options": [
                "new myObj = MyClass();",
                "MyClass myObj = new MyClass();",
                "class myObj = new MyClass();",
                "new MyClass myObj;",
            ],
            "correct_index": 1,
        },
        {
            "question": "Which statement is used to stop a loop?",
            "options": ["stop", "break", "return", "exit"],
            "correct_index": 1,
        },
        {
            "question": "Which keyword is used to import a package from the Java API library?",
            "options": ["import", "getlib", "package", "lib"],
            "correct_index": 0,
        },
        {
            "question": "How do you insert COMMENTS in Java code?",
            "options": [
                "# This is a comment",
                "// This is a comment",
                "/* This is a comment",
                "<!-- This is a comment -->",
            ],
            "correct_index": 1,
        },
        {
            "question": "Which loop is guaranteed to execute at least once?",
            "options": ["for", "while", "do-while", "foreach"],
            "correct_index": 2,
        },
        # LMS Concepts
        {
            "question": "What does LMS stand for?",
            "options": [
                "Learning Management System",
                "Learning Master Standard",
                "Local Management Service",
                "Level Management Syntax",
            ],
            "correct_index": 0,
        },
        {
            "question": "Which of the following is a primary benefit of an LMS?",
            "options": [
                "Printing paper certificates",
                "Tracking user progress automatedly",
                "Manual grading",
                "Networking hardware",
            ],
            "correct_index": 1,
        },
        {
            "question": "What is a 'Learning Path'?",
            "options": [
                "A physical hallway in a school",
                "A curated sequence of courses",
                "A variable in Java",
                "A database table",
            ],
            "correct_index": 1,
        },
        {
            "question": "SCORM is a standard related to:",
            "options": [
                "Java compiling",
                "E-learning content interoperability",
                "Database queries",
                "Video compression",
            ],
            "correct_index": 1,
        },
        {
            "question": "Which feature allows an LMS to handle multiple users simultaneously?",
            "options": [
                "Scalability",
                "Single-threading",
                "Local hosting only",
                "Serial processing",
            ],
            "correct_index": 0,
        },
        {
            "question": "Gamification in LMS usually involves:",
            "options": [
                "Playing video games all day",
                "Badges, leaderboards, and points",
                "Gambling with real money",
                "Game development coding",
            ],
            "correct_index": 1,
        },
        {
            "question": "What is the purpose of 'Blended Learning'?",
            "options": [
                "Mixing fruit",
                "Combining online and in-person learning",
                "Using only videos",
                "Using only text",
            ],
            "correct_index": 1,
        },
        {
            "question": "Which role typically administers the LMS?",
            "options": ["Learner", "Guest", "Admin", "Instructor"],
            "correct_index": 2,
        },
        {
            "question": "An LMS reporting feature helps in:",
            "options": [
                "Writing code",
                "Analyzing learner performance",
                "Creating videos",
                "Editing images",
            ],
            "correct_index": 1,
        },
        {
            "question": "Why is 'Mobile Compatibility' important for an LMS?",
            "options": [
                "It isn't",
                "To allow learning on the go",
                "To use more battery",
                "To compel users to buy phones",
            ],
            "correct_index": 1,
        },
    ]

    quiz.questions = questions
    db.add(quiz)
    db.commit()
    print("Successfully populated quiz with 25 questions.")


if __name__ == "__main__":
    populate_java_quiz()
