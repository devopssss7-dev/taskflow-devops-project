from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Activity, Task
from .schemas import ActivityResponse, TaskCreate, TaskResponse, TaskUpdate

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TaskFlow API",
    version="1.1.0",
    description="Task management API for an end-to-end DevOps project.",
)

# The frontend is served separately (port 80) from the API (port 8000).
# No cookies/authentication are used yet, so wildcard CORS is sufficient
# for this project deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def log_activity(db: Session, action: str, message: str, task_id: int | None = None):
    db.add(Activity(action=action, message=message, task_id=task_id))


@app.get("/health")
def health():
    return {"status": "healthy", "service": "taskflow-api"}


@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).order_by(Task.id.desc()).all()


@app.post("/api/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    item = Task(**task.model_dump())
    db.add(item)
    db.flush()
    log_activity(db, "CREATED", f'Created task "{item.title}"', item.id)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, changes: TaskUpdate, db: Session = Depends(get_db)):
    item = db.query(Task).filter(Task.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")

    changes_data = changes.model_dump(exclude_unset=True)
    old_status = item.status
    for key, value in changes_data.items():
        setattr(item, key, value)

    if "status" in changes_data and changes_data["status"] != old_status:
        log_activity(
            db,
            "STATUS_CHANGED",
            f'Task "{item.title}" moved from {old_status.replace("_", " ")} to {item.status.replace("_", " ")}',
            item.id,
        )
    else:
        log_activity(db, "UPDATED", f'Updated task "{item.title}"', item.id)

    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    item = db.query(Task).filter(Task.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")

    title = item.title
    log_activity(db, "DELETED", f'Deleted task "{title}"', item.id)
    db.delete(item)
    db.commit()


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    rows = dict(db.query(Task.status, func.count(Task.id)).group_by(Task.status).all())
    return {
        "total": sum(rows.values()),
        "todo": rows.get("TODO", 0),
        "in_progress": rows.get("IN_PROGRESS", 0),
        "done": rows.get("DONE", 0),
    }


@app.get("/api/activity", response_model=list[ActivityResponse])
def activity(db: Session = Depends(get_db)):
    return db.query(Activity).order_by(Activity.id.desc()).limit(100).all()
