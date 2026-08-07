import { useEffect, useMemo, useState } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const seed = [
  { id: 1, title: "Configure AWS infrastructure", description: "Create VPC and security groups", status: "DONE", priority: "HIGH" },
  { id: 2, title: "Build Jenkins pipeline", description: "Automate build and deployment", status: "IN_PROGRESS", priority: "HIGH" },
  { id: 3, title: "Add Prometheus monitoring", description: "Monitor application and cluster", status: "TODO", priority: "MEDIUM" }
]

function App() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState("ALL")
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM" })
  const [apiOnline, setApiOnline] = useState(false)

  const load = async () => {
    try {
      const [tasksRes, healthRes] = await Promise.all([
        fetch(`${API}/api/tasks`),
        fetch(`${API}/health`)
      ])
      if (!tasksRes.ok) throw new Error()
      setTasks(await tasksRes.json())
      setApiOnline(healthRes.ok)
    } catch {
      setTasks(seed)
      setApiOnline(false)
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
    done: tasks.filter(t => t.status === "DONE").length
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      const res = await fetch(`${API}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error()
      setForm({ title: "", description: "", priority: "MEDIUM" })
      load()
    } catch {
      setTasks(prev => [{ id: Date.now(), ...form, status: "TODO" }, ...prev])
      setForm({ title: "", description: "", priority: "MEDIUM" })
    }
  }

  const changeStatus = async (task, status) => {
    try {
      await fetch(`${API}/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      load()
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t))
    }
  }

  const remove = async (id) => {
    try {
      await fetch(`${API}/api/tasks/${id}`, { method: "DELETE" })
      load()
    } catch {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">T</span><span>TaskFlow</span></div>
        <nav>
          <div className="nav-item active">▦ <span>Dashboard</span></div>
          <div className="nav-item">✓ <span>My Tasks</span></div>
          <div className="nav-item">◷ <span>Activity</span></div>
        </nav>
        <div className="side-bottom">
          <div className="env">● Production<br/><small>TaskFlow Platform</small></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Manage your team's work in one place.</p>
          </div>
          <div className="user"><div className="avatar">AK</div><div><b>DevOps User</b><small>Administrator</small></div></div>
        </header>

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
                {["ALL", "TODO", "IN_PROGRESS", "DONE"].map(x =>
                  <button className={filter === x ? "selected" : ""} onClick={() => setFilter(x)} key={x}>
                    {x === "ALL" ? "All" : x === "IN_PROGRESS" ? "In Progress" : x === "TODO" ? "To Do" : "Done"}
                  </button>
                )}
              </div>
            </div>

            <div className="task-list">
              {visible.map(task => (
                <div className="task" key={task.id}>
                  <div className={`check ${task.status === "DONE" ? "checked" : ""}`} onClick={() => changeStatus(task, task.status === "DONE" ? "TODO" : "DONE")}>{task.status === "DONE" ? "✓" : ""}</div>
                  <div className="task-info">
                    <b>{task.title}</b>
                    <span>{task.description}</span>
                    <small className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</small>
                  </div>
                  <select value={task.status} onChange={e => changeStatus(task, e.target.value)}>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <button className="delete" onClick={() => remove(task.id)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel add-panel">
            <div className="panel-head"><div><h2>Create Task</h2><p>Add work to your team.</p></div></div>
            <form onSubmit={addTask}>
              <label>Task title<input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. Configure Kubernetes" /></label>
              <label>Description<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Describe the task..." /></label>
              <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
              <button className="primary" type="submit">+ Create Task</button>
            </form>
          </div>
        </section>

        <footer>
          <span>TaskFlow Platform · DevOps Project</span>
          <span className={apiOnline ? "online" : "offline"}>● API {apiOnline ? "Connected" : "Demo Mode"}</span>
        </footer>
      </main>
    </div>
  )
}

export default App
