from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import Base, engine, get_db
from .models import Task
from .schemas import TaskCreate, TaskUpdate, TaskResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TaskFlow API",
    version="1.0.0",
    description="Task management API for an end-to-end DevOps project.",
)

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
    db.commit()
    db.refresh(item)
    return item

@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, changes: TaskUpdate, db: Session = Depends(get_db)):
    item = db.query(Task).filter(Task.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in changes.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    item = db.query(Task).filter(Task.id == task_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(item)
    db.commit()

@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    rows = dict(
        db.query(Task.status, func.count(Task.id))
        .group_by(Task.status)
        .all()
    )
    return {
        "total": sum(rows.values()),
        "todo": rows.get("TODO", 0),
        "in_progress": rows.get("IN_PROGRESS", 0),
        "done": rows.get("DONE", 0),
    }
