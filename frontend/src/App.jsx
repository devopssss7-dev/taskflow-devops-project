import { useEffect, useMemo, useState } from "react"

const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`

const emptyForm = { title: "", description: "", priority: "MEDIUM" }

function formatStatus(status) {
  return status === "IN_PROGRESS" ? "In Progress" : status === "TODO" ? "To Do" : "Done"
}

function formatTime(value) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

function App() {
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [filter, setFilter] = useState("ALL")
  const [page, setPage] = useState("dashboard")
  const [form, setForm] = useState(emptyForm)
  const [apiOnline, setApiOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const request = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, options)
    if (!res.ok) {
      let detail = `Request failed (${res.status})`
      try {
        const body = await res.json()
        detail = body.detail || detail
      } catch {}
      throw new Error(detail)
    }
    if (res.status === 204) return null
    return res.json()
  }

  const loadTasks = async () => {
    const data = await request("/api/tasks")
    setTasks(data)
  }

  const loadActivity = async () => {
    const data = await request("/api/activity")
    setActivities(data)
  }

  const load = async () => {
    try {
      setError("")
      const [health, taskData, activityData] = await Promise.all([
        request("/health"),
        request("/api/tasks"),
        request("/api/activity"),
      ])
      setApiOnline(health.status === "healthy")
      setTasks(taskData)
      setActivities(activityData)
    } catch (err) {
      setApiOnline(false)
      setError(err.message || "Unable to connect to the API")
    }
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(
    () => filter === "ALL" ? tasks : tasks.filter(t => t.status === filter),
    [tasks, filter]
  )

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "TODO").length,
    progress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    done: tasks.filter(t => t.status === "DONE").length,
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      setBusy(true)
      setError("")
      await request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim() })
      })
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (task, status) => {
    if (status === task.status) return
    try {
      setBusy(true)
      setError("")
      await request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) return
    try {
      setBusy(true)
      setError("")
      await request(`/api/tasks/${id}`, { method: "DELETE" })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const nav = (target) => {
    setPage(target)
    if (target === "activity") loadActivity().catch(err => setError(err.message))
  }

  const renderTaskList = (items = visible) => (
    <div className="task-list">
      {items.length === 0 ? (
        <div className="empty">No tasks found.</div>
      ) : items.map(task => (
        <div className="task" key={task.id}>
          <div
            className={`check ${task.status === "DONE" ? "checked" : ""}`}
            onClick={() => changeStatus(task, task.status === "DONE" ? "TODO" : "DONE")}
            title={task.status === "DONE" ? "Mark as To Do" : "Mark as Done"}
          >
            {task.status === "DONE" ? "✓" : ""}
          </div>
          <div className="task-info">
            <b>{task.title}</b>
            <span>{task.description || "No description"}</span>
            <small className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</small>
          </div>
          <select value={task.status} onChange={e => changeStatus(task, e.target.value)} disabled={busy}>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
          <button className="delete" onClick={() => remove(task.id)} disabled={busy} title="Delete task">×</button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">T</span><span>TaskFlow</span></div>
        <nav>
          <button className={`nav-item ${page === "dashboard" ? "active" : ""}`} onClick={() => nav("dashboard")}>▦ <span>Dashboard</span></button>
          <button className={`nav-item ${page === "tasks" ? "active" : ""}`} onClick={() => nav("tasks")}>✓ <span>My Tasks</span></button>
          <button className={`nav-item ${page === "activity" ? "active" : ""}`} onClick={() => nav("activity")}>◷ <span>Activity</span></button>
        </nav>
        <div className="side-bottom">
          <div className="env">● Production<br/><small>TaskFlow Platform</small></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{page === "dashboard" ? "Dashboard" : page === "tasks" ? "My Tasks" : "Activity"}</h1>
            <p>{page === "dashboard" ? "Manage your team's work in one place." : page === "tasks" ? "Create and manage your team's tasks." : "See what changed in TaskFlow."}</p>
          </div>
          <div className="user"><div className="avatar">AK</div><div><b>DevOps User</b><small>Administrator</small></div></div>
        </header>

        {error && <div className="error">{error}</div>}

        {page === "activity" ? (
          <section className="panel activity-panel">
            <div className="panel-head"><div><h2>Recent Activity</h2><p>Changes made to tasks are recorded here.</p></div><button className="refresh" onClick={() => loadActivity()}>Refresh</button></div>
            <div className="activity-list">
              {activities.length === 0 ? <div className="empty">No activity yet.</div> : activities.map(item => (
                <div className="activity" key={item.id}>
                  <div className="activity-dot">●</div>
                  <div><b>{item.message}</b><span>{item.action.replaceAll("_", " ")} · {formatTime(item.created_at)}</span></div>
                </div>
              ))}
            </div>
          </section>
        ) : page === "tasks" ? (
          <section className="panel tasks-panel full-panel">
            <div className="panel-head">
              <div><h2>My Tasks</h2><p>All tasks stored in PostgreSQL.</p></div>
              <div className="filters">
                {[["ALL", "All"], ["TODO", "To Do"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"]].map(([key, label]) =>
                  <button className={filter === key ? "selected" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>
                )}
              </div>
            </div>
            {renderTaskList()}
          </section>
        ) : (
          <>
            <section className="stats">
              <div className="stat"><span>Total Tasks</span><strong>{stats.total}</strong><em>All tasks</em></div>
              <div className="stat"><span>To Do</span><strong>{stats.todo}</strong><em>Waiting to start</em></div>
              <div className="stat"><span>In Progress</span><strong>{stats.progress}</strong><em>Currently active</em></div>
              <div className="stat"><span>Completed</span><strong>{stats.done}</strong><em>Successfully done</em></div>
            </section>

            <section className="grid">
              <div className="panel tasks-panel">
                <div className="panel-head">
                  <div><h2>Tasks</h2><p>Track and manage your team's tasks.</p></div>
                  <div className="filters">
                    {[["ALL", "All"], ["TODO", "To Do"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"]].map(([key, label]) =>
                      <button className={filter === key ? "selected" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>
                    )}
                  </div>
                </div>
                {renderTaskList()}
              </div>

              <div className="panel add-panel">
                <div className="panel-head"><div><h2>Create Task</h2><p>Add work to your team.</p></div></div>
                <form onSubmit={addTask}>
                  <label>Task title<input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. Configure Kubernetes" /></label>
                  <label>Description<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Describe the task..." /></label>
                  <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
                  <button className="primary" type="submit" disabled={busy || !apiOnline}>{busy ? "Saving..." : "+ Create Task"}</button>
                </form>
              </div>
            </section>
          </>
        )}

        <footer>
          <span>TaskFlow Platform · DevOps Project</span>
          <span className={apiOnline ? "online" : "offline"}>● API {apiOnline ? "Connected" : "Offline"}</span>
        </footer>
      </main>
    </div>
  )
}

export default App
