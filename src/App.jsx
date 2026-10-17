import React, { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import { validateTaskTitle } from "./lib/task-validation.js";
import { filterTodos, taskPriorities } from "./lib/task-priorities.js";
import { moveProject, validateProjectName } from "./lib/projects.js";
import { validateTagName } from "./lib/tags.js";
import { getSubtaskProgress, groupVisibleTodos } from "./lib/subtasks.js";

const filters = ["All", "Active", "Done", "Trash"];

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [todos, setTodos] = useState([]);
  const [todosReady, setTodosReady] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagsReady, setTagsReady] = useState(false);
  const [openManageMenu, setOpenManageMenu] = useState(null);
  const manageMenuRefs = useRef({});
  const [manageMenuPosition, setManageMenuPosition] = useState({ left: 259, top: 12 });
  const [projectName, setProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [tagName, setTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [task, setTask] = useState("");
  const [subtaskParentId, setSubtaskParentId] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [undoTodoId, setUndoTodoId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [pendingTodoIds, setPendingTodoIds] = useState([]);
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (!openManageMenu) return undefined;

    const updatePosition = () => {
      const menu = manageMenuRefs.current[openManageMenu];
      const summary = menu?.querySelector("summary");
      const sidebar = menu?.closest(".sidebar");
      if (!summary || !sidebar) return;

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(340, viewportWidth - 24);
      const maxHeight = Math.min(viewportHeight * 0.65, 520);
      const preferredLeft = sidebar.getBoundingClientRect().right + 4;
      const left = Math.max(12, Math.min(preferredLeft, viewportWidth - width - 12));
      const preferredTop = summary.getBoundingClientRect().top;
      const top = Math.max(12, Math.min(preferredTop, viewportHeight - maxHeight - 12));

      setManageMenuPosition((current) => (
        current.left === left && current.top === top ? current : { left, top }
      ));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openManageMenu]);

  const handleManageMenuToggle = (menu, event) => {
    const isOpen = event.currentTarget.open;
    setOpenManageMenu((current) => {
      if (isOpen) return menu;
      return current === menu ? null : current;
    });
  };

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setTodos([]);
      setProjects([]);
      setTags([]);
      setTagsReady(false);
      setTodosReady(false);
      return;
    }

    let active = true;
    setTodosReady(false);
    setTagsReady(false);
    setTagFilter("all");
    setEditingTagId(null);
    setListError("");
    Promise.all([
      supabase
        .from("todos")
        .select("id, title, completed, created_at, deleted_at, priority, project_id, parent_task_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, position, is_archived")
        .order("position")
        .order("created_at"),
      supabase
        .from("tags")
        .select("id, name")
        .order("created_at"),
      supabase
        .from("todo_tags")
        .select("todo_id, tag_id"),
    ]).then(([todoResult, projectResult, tagResult, todoTagResult]) => {
      if (!active) return;
      const loadErrors = [todoResult, projectResult, tagResult, todoTagResult]
        .filter((result) => result.error)
        .map((result) => result.error.message);
      if (loadErrors.length > 0) setListError(loadErrors.join(" "));
      if (projectResult.error) setProjects([]);
      else setProjects(projectResult.data ?? []);
      if (tagResult.error) setTags([]);
      else setTags(tagResult.data ?? []);
      if (todoResult.error) {
        setTodos([]);
      } else {
        const tagsById = new Map((tagResult.data ?? []).map((tag) => [tag.id, tag]));
        const tagsByTodoId = new Map();
        if (!todoTagResult.error) {
          for (const assignment of todoTagResult.data ?? []) {
            const tag = tagsById.get(assignment.tag_id);
            if (!tag) continue;
            const assignedTags = tagsByTodoId.get(assignment.todo_id) ?? [];
            assignedTags.push(tag);
            tagsByTodoId.set(assignment.todo_id, assignedTags);
          }
        }
        setTodos((todoResult.data ?? []).map((todo) => ({
          ...todo,
          tags: tagsByTodoId.get(todo.id) ?? [],
        })));
      }
      setTagsReady(!tagResult.error && !todoTagResult.error);
      setTodosReady(true);
    });

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    setAuthMessage("");

    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (result.error) {
      setAuthError(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Check your inbox for a confirmation link, then come back to sign in.");
    } else {
      setPassword("");
    }
  }

  async function addTodo(event) {
    event.preventDefault();
    const { title, error: validationError } = validateTaskTitle(task);
    if (busy) return;
    if (validationError) {
      setListError(validationError);
      return;
    }

    setBusy(true);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("todos")
        .insert({
          title,
          user_id: session.user.id,
          project_id: projectFilter === "all" || projectFilter === "unassigned" ? null : projectFilter,
        })
        .select("id, title, completed, created_at, deleted_at, priority, project_id, parent_task_id")
        .single();
      if (error) {
        setListError(error.message);
        return;
      }
      let assignedTags = [];
      const selectedTagForTask = tags.find((item) => item.id === tagFilter);
      if (selectedTagForTask) {
        let tagError;
        try {
          ({ error: tagError } = await supabase.from("todo_tags").insert({
            user_id: session.user.id,
            todo_id: data.id,
            tag_id: selectedTagForTask.id,
          }));
        } catch (error) {
          tagError = error;
        }
        if (tagError) {
          const message = tagError instanceof Error ? tagError.message : "Check your connection and try again.";
          setListError(`Task created, but its tag could not be assigned: ${message}`);
        } else {
          assignedTags = [selectedTagForTask];
        }
      }
      setTodos((current) => [{ ...data, tags: assignedTags }, ...current]);
      setTask("");
    } catch {
      setListError("Unable to add this task. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addSubtask(event, parentTodo) {
    event.preventDefault();
    const { title, error: validationError } = validateTaskTitle(subtaskTitle);
    if (busy || parentTodo.parent_task_id !== null) return;
    if (validationError) {
      setListError(validationError);
      return;
    }

    setBusy(true);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("todos")
        .insert({
          title,
          user_id: session.user.id,
          project_id: parentTodo.project_id,
          parent_task_id: parentTodo.id,
        })
        .select("id, title, completed, created_at, deleted_at, priority, project_id, parent_task_id")
        .single();
      if (error) {
        setListError(error.message);
        return;
      }
      let assignedTags = [];
      if ((parentTodo.tags ?? []).length > 0) {
        let tagError;
        try {
          ({ error: tagError } = await supabase.from("todo_tags").insert(
            parentTodo.tags.map((tag) => ({
              user_id: session.user.id,
              todo_id: data.id,
              tag_id: tag.id,
            })),
          ));
        } catch (error) {
          tagError = error;
        }
        if (tagError) {
          const message = tagError instanceof Error ? tagError.message : "Check your connection and try again.";
          setListError(`Subtask created, but its tags could not be inherited: ${message}`);
        } else {
          assignedTags = parentTodo.tags;
        }
      }
      setTodos((current) => [{ ...data, tags: assignedTags }, ...current]);
      setSubtaskParentId(null);
      setSubtaskTitle("");
    } catch {
      setListError("Unable to add this subtask. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addProject(event) {
    event.preventDefault();
    const { name, error: validationError } = validateProjectName(projectName);
    if (validationError || busy) {
      if (validationError) setListError(validationError);
      return;
    }
    setBusy(true);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, user_id: session.user.id, position: projects.filter((project) => !project.is_archived).length })
        .select("id, name, position, is_archived")
        .single();
      if (error) {
        setListError(error.message);
        return;
      }
      setProjects((current) => [...current, data]);
      setProjectFilter(data.id);
      setProjectName("");
    } catch {
      setListError("Unable to create this project. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addTag(event) {
    event.preventDefault();
    const { name, error: validationError } = validateTagName(tagName);
    if (validationError || busy) {
      if (validationError) setListError(validationError);
      return;
    }

    setBusy(true);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, user_id: session.user.id })
        .select("id, name")
        .single();
      if (error) {
        setListError(error.message);
        return;
      }
      setTags((current) => [...current, data]);
      setTagName("");
    } catch {
      setListError("Unable to create this tag. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTagEdit(event, tag) {
    event.preventDefault();
    const { name, error } = validateTagName(editingTagName);
    if (error) {
      setListError(error);
      return;
    }
    if (name === tag.name) {
      setEditingTagId(null);
      return;
    }

    setBusy(true);
    setListError("");
    try {
      const { data, error: updateError } = await supabase
        .from("tags")
        .update({ name })
        .eq("id", tag.id)
        .select("id, name")
        .single();
      if (updateError) {
        setListError(updateError.message);
        return;
      }
      setTags((current) => current.map((item) => item.id === data.id ? data : item));
      setTodos((current) => current.map((todo) => ({
        ...todo,
        tags: (todo.tags ?? []).map((item) => item.id === data.id ? data : item),
      })));
      setEditingTagId(null);
    } catch {
      setListError("Unable to rename this tag. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTag(tag) {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all tasks.`)) return;

    setBusy(true);
    setListError("");
    try {
      const { error } = await supabase.from("tags").delete().eq("id", tag.id);
      if (error) {
        setListError(error.message);
        return;
      }
      setTags((current) => current.filter((item) => item.id !== tag.id));
      setTodos((current) => current.map((todo) => ({
        ...todo,
        tags: (todo.tags ?? []).filter((item) => item.id !== tag.id),
      })));
      if (tagFilter === tag.id) setTagFilter("all");
      if (editingTagId === tag.id) setEditingTagId(null);
    } catch {
      setListError("Unable to delete this tag. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTodoTag(todo, tag) {
    if (pendingTodoIds.includes(todo.id) || !tagsReady) return;

    setPendingTodoIds((current) => [...current, todo.id]);
    setListError("");
    const assigned = (todo.tags ?? []).some((item) => item.id === tag.id);
    try {
      const result = assigned
        ? await supabase.from("todo_tags").delete().eq("todo_id", todo.id).eq("tag_id", tag.id)
        : await supabase.from("todo_tags").insert({
          user_id: session.user.id,
          todo_id: todo.id,
          tag_id: tag.id,
        });
      if (result.error) {
        setListError(result.error.message);
        return;
      }
      setTodos((current) => current.map((item) => item.id === todo.id
        ? {
          ...item,
          tags: assigned
            ? (item.tags ?? []).filter((itemTag) => itemTag.id !== tag.id)
            : [...(item.tags ?? []), tag],
        }
        : item));
    } catch {
      setListError("Unable to update this task's tags. Check your connection and try again.");
    } finally {
      setPendingTodoIds((current) => current.filter((id) => id !== todo.id));
    }
  }

  async function saveProjectEdit(event, project) {
    event.preventDefault();
    const { name, error } = validateProjectName(editingProjectName);
    if (error) {
      setListError(error);
      return;
    }
    if (name === project.name) {
      setEditingProjectId(null);
      return;
    }

    setBusy(true);
    setListError("");
    try {
      const { data, error: updateError } = await supabase
        .from("projects")
        .update({ name })
        .eq("id", project.id)
        .select("id, name, position, is_archived")
        .single();
      if (updateError) {
        setListError(updateError.message);
        return;
      }
      setProjects((current) => current.map((item) => item.id === data.id ? data : item));
      setEditingProjectId(null);
    } catch {
      setListError("Unable to rename this project. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setProjectArchived(project, isArchived) {
    setBusy(true);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ is_archived: isArchived })
        .eq("id", project.id)
        .select("id, name, position, is_archived")
        .single();
      if (error) {
        setListError(error.message);
        return;
      }
      setProjects((current) => current.map((item) => item.id === data.id ? data : item));
      if (isArchived && projectFilter === project.id) setProjectFilter("all");
    } catch {
      setListError("Unable to update this project. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete project "${project.name}"? Its tasks will be kept without a project.`)) return;

    setBusy(true);
    setListError("");
    try {
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) {
        setListError(error.message);
        return;
      }
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setTodos((current) => current.map((todo) => todo.project_id === project.id ? { ...todo, project_id: null } : todo));
      if (projectFilter === project.id) setProjectFilter("all");
    } catch {
      setListError("Unable to delete this project. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reorderProject(project, direction) {
    const activeProjects = projects.filter((item) => !item.is_archived);
    const reordered = moveProject(activeProjects, project.id, direction);
    if (reordered === activeProjects) return;

    setBusy(true);
    setListError("");
    try {
      const updates = await Promise.all(reordered.map((item, position) => (
        supabase.from("projects").update({ position }).eq("id", item.id)
      )));
      const failedUpdate = updates.find(({ error }) => error);
      if (failedUpdate) {
        setListError(failedUpdate.error.message);
        const { data, error } = await supabase.from("projects")
          .select("id, name, position, is_archived")
          .order("position")
          .order("created_at");
        if (error) setListError(`${failedUpdate.error.message} Could not refresh project order: ${error.message}`);
        else setProjects(data ?? []);
        return;
      }
      const positions = new Map(reordered.map((item, index) => [item.id, index]));
      setProjects((current) => current
        .map((item) => positions.has(item.id) ? { ...item, position: positions.get(item.id) } : item)
        .sort((left, right) => left.position - right.position));
    } catch {
      setListError("Unable to reorder projects. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateTodo(todo, changes) {
    if (pendingTodoIds.includes(todo.id)) return false;
    setPendingTodoIds((current) => [...current, todo.id]);
    setListError("");
    try {
      const { data, error } = await supabase
        .from("todos")
        .update(changes)
        .eq("id", todo.id)
        .select("id, title, completed, created_at, deleted_at, priority, project_id, parent_task_id")
        .single();
      if (error) {
        setListError(error.message);
        return false;
      }
      setTodos((current) => current.map((item) => item.id === todo.id ? { ...data, tags: item.tags ?? [] } : item));
      return true;
    } catch {
      setListError("Unable to save this task. Check your connection and try again.");
      return false;
    } finally {
      setPendingTodoIds((current) => current.filter((id) => id !== todo.id));
    }
  }

  function beginTodoEdit(todo) {
    setListError("");
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
  }

  function cancelTodoEdit() {
    setEditingTodoId(null);
    setEditingTitle("");
  }

  async function saveTodoEdit(event, todo) {
    event.preventDefault();
    const { title, error } = validateTaskTitle(editingTitle);
    if (error) {
      setListError(error);
      return;
    }
    if (title === todo.title) {
      cancelTodoEdit();
      return;
    }

    if (await updateTodo(todo, { title })) cancelTodoEdit();
  }

  async function deleteTodo(todo) {
    if (pendingTodoIds.includes(todo.id)) return;

    if (filter === "Trash") {
      if (!window.confirm(`Permanently delete "${todo.title}"? This cannot be undone.`)) return;
      setPendingTodoIds((current) => [...current, todo.id]);
      setListError("");
      try {
        const { error } = await supabase.from("todos").delete().eq("id", todo.id);
        if (error) {
          setListError(error.message);
          return;
        }
        setTodos((current) => current
          .filter((item) => item.id !== todo.id)
          .map((item) => item.parent_task_id === todo.id ? { ...item, parent_task_id: null } : item));
        if (undoTodoId === todo.id) setUndoTodoId(null);
      } catch {
        setListError("Unable to permanently delete this task. Check your connection and try again.");
      } finally {
        setPendingTodoIds((current) => current.filter((id) => id !== todo.id));
      }
      return;
    }

    const updated = await updateTodo(todo, { deleted_at: new Date().toISOString() });
    if (updated) setUndoTodoId(todo.id);
  }

  async function restoreTodo(todo) {
    if (await updateTodo(todo, { deleted_at: null })) {
      if (undoTodoId === todo.id) setUndoTodoId(null);
    }
  }

  async function undoDelete() {
    const todo = todos.find((item) => item.id === undoTodoId);
    if (todo) await restoreTodo(todo);
  }

  useEffect(() => {
    if (undoTodoId === null) return undefined;
    const timeoutId = window.setTimeout(() => setUndoTodoId(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [undoTodoId]);

  async function signOut() {
    setSignOutBusy(true);
    setSignOutError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) setSignOutError(error.message);
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    } finally {
      setSignOutBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="setup-screen">
        <div className="setup-card">
          <span className="brand-mark" aria-hidden="true">l.</span>
          <p className="eyebrow">ONE SMALL SETUP</p>
          <h1>Your list is almost ready.</h1>
          <p>Add your Supabase project URL and publishable key to a <code>.env</code> file to enable accounts and private lists.</p>
          <p className="setup-hint">Start with <code>.env.example</code>, then follow the setup guide in <code>README.md</code>.</p>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return <main className="loading-screen"><span className="loader" />Getting your list ready</main>;
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <a className="brand" href="/" aria-label="Little List home"><span className="brand-mark">l.</span><span>little list</span></a>
          <p className="eyebrow">A LITTLE SPACE FOR YOUR DAY</p>
          <h1>{authMode === "login" ? "Welcome back." : "Make a little space."}</h1>
          <p className="auth-description">
            {authMode === "login"
              ? "Sign in and pick up right where you left off."
              : "Create your own private list. Just for you."}
          </p>
          <form className="auth-form" onSubmit={handleAuthSubmit} aria-busy={busy}>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="At least 6 characters" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {authError && <p className="notice error" role="alert">{authError}</p>}
            {authMessage && <p className="notice success" role="status">{authMessage}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? "One moment…" : authMode === "login" ? "Sign in" : "Create account"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="auth-switch">
            {authMode === "login" ? "New around here?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); setAuthMessage(""); }}>
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
        <p className="auth-footer">Your list is yours alone <span>·</span> private by design</p>
      </main>
    );
  }

  const visibleTodos = filterTodos(todos, filter, priorityFilter, projectFilter, tagFilter);
  const remaining = todos.filter((todo) => todo.deleted_at === null && !todo.completed).length;
  const trashedCount = todos.filter((todo) => todo.deleted_at !== null).length;
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const selectedProject = projects.find((project) => project.id === projectFilter);
  const selectedTag = tags.find((tag) => tag.id === tagFilter);
  const isInboxView = filter === "All" && projectFilter === "all" && tagFilter === "all";
  const viewTitle = filter === "Trash"
    ? "Trash"
    : selectedTag?.name ?? selectedProject?.name ?? (filter === "All" ? "Inbox" : filter);
  const visibleGroups = groupVisibleTodos(visibleTodos);

  function renderTodoRow(todo, isSubtask = false) {
    return (
      <div className={`todo-row${todo.completed ? " completed" : ""}${isSubtask ? " subtask-row" : ""}${filter === "Trash" ? " trash-row" : ""}`} key={todo.id}>
        {filter !== "Trash" && (
          <button className="todo-check" type="button" aria-label={todo.completed ? `Mark ${todo.title} as active` : `Mark ${todo.title} as done`} aria-pressed={todo.completed} disabled={pendingTodoIds.includes(todo.id)} onClick={() => updateTodo(todo, { completed: !todo.completed })}>
            {todo.completed && <span aria-hidden="true">✓</span>}
          </button>
        )}
        {filter !== "Trash" && editingTodoId === todo.id ? (
          <form className="todo-edit-form" onSubmit={(event) => saveTodoEdit(event, todo)}>
            <input
              aria-label={`Edit ${todo.title}`}
              autoFocus
              maxLength="200"
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") cancelTodoEdit();
              }}
            />
            <button className="todo-action-button" type="submit" disabled={pendingTodoIds.includes(todo.id)}>Save</button>
            <button className="todo-action-button" type="button" onClick={cancelTodoEdit}>Cancel</button>
          </form>
        ) : (
          <>
            <div className="todo-content">
              <span className="todo-title">{todo.title}</span>
              {(todo.tags ?? []).length > 0 && (
                <div className="todo-tag-chips">
                  {todo.tags.map((tag) => <span className="tag-chip" key={tag.id}>{tag.name}</span>)}
                </div>
              )}
              {filter !== "Trash" && (
                <details className="todo-tag-picker">
                  <summary aria-label={`Manage tags for ${todo.title}`}>
                    Tags{(todo.tags ?? []).length > 0 ? ` (${todo.tags.length})` : ""}
                  </summary>
                  <fieldset disabled={!tagsReady || pendingTodoIds.includes(todo.id)}>
                    <legend className="visually-hidden">Tags for {todo.title}</legend>
                    {tags.length > 0 ? tags.map((tag) => (
                      <label key={tag.id}>
                        <input
                          type="checkbox"
                          checked={(todo.tags ?? []).some((item) => item.id === tag.id)}
                          onChange={() => toggleTodoTag(todo, tag)}
                        />
                        {tag.name}
                      </label>
                    )) : <span className="tag-picker-empty">Use the tags menu to create a tag.</span>}
                  </fieldset>
                </details>
              )}
            </div>
            <div className="todo-actions">
              <label className={`priority-select-wrap priority-${todo.priority}`}>
                {filter !== "Trash" && <span className="visually-hidden">Priority for {todo.title}</span>}
                {filter === "Trash" ? (
                  <span className="priority-badge">{todo.priority === "none" ? "No priority" : todo.priority}</span>
                ) : (
                  <select
                    aria-label={`Priority for ${todo.title}`}
                    value={todo.priority}
                    disabled={pendingTodoIds.includes(todo.id)}
                    onChange={(event) => updateTodo(todo, { priority: event.target.value })}
                  >
                    {taskPriorities.map((priority) => (
                      <option key={priority} value={priority}>{priority === "none" ? "No priority" : priority[0].toUpperCase() + priority.slice(1)}</option>
                    ))}
                  </select>
                )}
              </label>
              {filter === "Trash" ? (
                <>
                  <button className="todo-action-button" type="button" disabled={pendingTodoIds.includes(todo.id)} onClick={() => restoreTodo(todo)}>Restore</button>
                  <button className="delete-button permanent-delete-button" type="button" aria-label={`Permanently delete ${todo.title}`} disabled={pendingTodoIds.includes(todo.id)} onClick={() => deleteTodo(todo)}>×</button>
                </>
              ) : (
                <>
                  {todo.parent_task_id === null && (
                    <button
                      className="todo-action-button subtask-toggle"
                      type="button"
                      aria-label={`${subtaskParentId === todo.id ? "Cancel adding" : "Add"} subtask for ${todo.title}`}
                      onClick={() => { setSubtaskParentId(subtaskParentId === todo.id ? null : todo.id); setSubtaskTitle(""); }}
                    >
                      + Subtask
                    </button>
                  )}
                  <button className="todo-action-button edit-button" type="button" aria-label={`Edit ${todo.title}`} disabled={pendingTodoIds.includes(todo.id)} onClick={() => beginTodoEdit(todo)}>Edit</button>
                  <button className="delete-button" type="button" aria-label={`Delete ${todo.title}`} disabled={pendingTodoIds.includes(todo.id)} onClick={() => deleteTodo(todo)}>×</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <main className="app-screen">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Little List home"><span className="brand-mark">l.</span><span>little list</span></a>
        <div className="account">
          <span className="account-email">{session.user.email}</span>
          <button className="signout-button" type="button" onClick={signOut} disabled={signOutBusy}>
            {signOutBusy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Task navigation">
          <button className="sidebar-add-button" type="button" onClick={() => document.getElementById("new-task-input")?.focus()}>
            <span aria-hidden="true">+</span> Add task
          </button>
          <nav className="sidebar-nav" aria-label="Task views">
            {filters.map((item) => (
              <button
                key={item}
                className={`sidebar-link${filter === item && projectFilter === "all" && tagFilter === "all" ? " selected" : ""}`}
                type="button"
                onClick={() => { setFilter(item); setProjectFilter("all"); setTagFilter("all"); }}
                aria-current={filter === item && projectFilter === "all" && tagFilter === "all" ? "page" : undefined}
              >
                <span className={`sidebar-icon sidebar-icon-${item.toLowerCase()}`} aria-hidden="true">
                  {item === "All" ? "⌂" : item === "Active" ? "○" : item === "Done" ? "✓" : "⌫"}
                </span>
                <span>{item === "All" ? "Inbox" : item}</span>
                {item === "Active" && remaining > 0 && <span className="sidebar-count">{remaining}</span>}
                {item === "Trash" && trashedCount > 0 && <span className="sidebar-count">{trashedCount}</span>}
              </button>
            ))}
          </nav>

          <section className="sidebar-section" aria-label="Projects">
            <div className="sidebar-section-heading">
              <h2>Projects</h2>
              <details ref={(node) => { manageMenuRefs.current.projects = node; }} className="sidebar-manage-menu" open={openManageMenu === "projects"} onToggle={(event) => handleManageMenuToggle("projects", event)}>
                <summary aria-label="Manage projects">···</summary>
                <div className="sidebar-manage-popover" style={{ "--manage-menu-left": `${manageMenuPosition.left}px`, "--manage-menu-top": `${manageMenuPosition.top}px` }}>
                  <form className="project-create-form" onSubmit={addProject}>
                    <label className="visually-hidden" htmlFor="new-project-name">New project name</label>
                    <input id="new-project-name" aria-label="New project name" placeholder="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength="60" />
                    <button className="todo-action-button" type="submit" disabled={busy || !projectName.trim()}>Add</button>
                  </form>
                  <button className="todo-action-button archived-toggle" type="button" onClick={() => setShowArchivedProjects((current) => !current)}>
                    {showArchivedProjects ? "Show active projects" : "Show archived projects"}
                  </button>
                  {projects.filter((project) => project.is_archived === showArchivedProjects).length > 0 ? (
                    <ul className="project-list">
                      {projects
                        .filter((project) => project.is_archived === showArchivedProjects)
                        .map((project, index, listedProjects) => (
                          <li key={project.id} className="project-row">
                            {editingProjectId === project.id ? (
                              <form className="project-edit-form" onSubmit={(event) => saveProjectEdit(event, project)}>
                                <input aria-label={`Rename ${project.name}`} value={editingProjectName} maxLength="60" onChange={(event) => setEditingProjectName(event.target.value)} autoFocus />
                                <button className="todo-action-button" type="submit" disabled={busy}>Save</button>
                                <button className="todo-action-button" type="button" onClick={() => setEditingProjectId(null)}>Cancel</button>
                              </form>
                            ) : (
                              <>
                                <span className="project-row-name">{project.name}</span>
                                <div className="project-row-actions">
                                  {!project.is_archived && (
                                    <>
                                      <button className="todo-action-button" type="button" aria-label={`Move ${project.name} up`} disabled={busy || index === 0} onClick={() => reorderProject(project, -1)}>↑</button>
                                      <button className="todo-action-button" type="button" aria-label={`Move ${project.name} down`} disabled={busy || index === listedProjects.length - 1} onClick={() => reorderProject(project, 1)}>↓</button>
                                      <button className="todo-action-button" type="button" disabled={busy} onClick={() => { setEditingProjectId(project.id); setEditingProjectName(project.name); }}>Rename</button>
                                    </>
                                  )}
                                  <button className="todo-action-button" type="button" disabled={busy} onClick={() => setProjectArchived(project, !project.is_archived)}>{project.is_archived ? "Unarchive" : "Archive"}</button>
                                  <button className="todo-action-button project-delete-button" type="button" disabled={busy} onClick={() => deleteProject(project)}>Delete</button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                    </ul>
                  ) : <p className="project-list-empty">{showArchivedProjects ? "No archived projects." : "No projects yet."}</p>}
                </div>
              </details>
            </div>
            {projects.filter((project) => !project.is_archived).map((project) => (
              <button key={project.id} className={`sidebar-link project-sidebar-link${projectFilter === project.id ? " selected" : ""}`} type="button" onClick={() => { setProjectFilter(project.id); setTagFilter("all"); setFilter("All"); }}>
                <span className="project-dot" aria-hidden="true" /><span>{project.name}</span>
              </button>
            ))}
          </section>

          <section className="sidebar-section sidebar-tag-section" aria-label="Tags">
            <div className="sidebar-section-heading">
              <h2>Tags</h2>
              <details ref={(node) => { manageMenuRefs.current.tags = node; }} className="sidebar-manage-menu" open={openManageMenu === "tags"} onToggle={(event) => handleManageMenuToggle("tags", event)}>
                <summary aria-label="Manage tags">···</summary>
                <div className="sidebar-manage-popover tag-manage-popover" style={{ "--manage-menu-left": `${manageMenuPosition.left}px`, "--manage-menu-top": `${manageMenuPosition.top}px` }}>
                  <form className="tag-create-form" onSubmit={addTag}>
                    <label className="visually-hidden" htmlFor="new-tag-name">New tag name</label>
                    <input id="new-tag-name" aria-label="New tag name" placeholder="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} maxLength="80" />
                    <button className="todo-action-button" type="submit" disabled={busy || !tagName.trim()}>Add</button>
                  </form>
                  {tags.length > 0 ? (
                    <ul className="tag-list">
                      {tags.map((tag) => (
                        <li key={tag.id} className="tag-row">
                          {editingTagId === tag.id ? (
                            <form className="tag-edit-form" onSubmit={(event) => saveTagEdit(event, tag)}>
                              <input aria-label={`Rename ${tag.name}`} value={editingTagName} maxLength="80" onChange={(event) => setEditingTagName(event.target.value)} autoFocus />
                              <button className="todo-action-button" type="submit" disabled={busy}>Save</button>
                              <button className="todo-action-button" type="button" onClick={() => setEditingTagId(null)}>Cancel</button>
                            </form>
                          ) : (
                            <>
                              <span className="tag-chip">{tag.name}</span>
                              <div className="tag-row-actions">
                                <button className="todo-action-button" type="button" disabled={busy} onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); }}>Rename</button>
                                <button className="todo-action-button project-delete-button" type="button" disabled={busy} onClick={() => deleteTag(tag)}>Delete</button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="project-list-empty">No tags yet.</p>}
                </div>
              </details>
            </div>
            {tags.map((tag) => (
              <button key={tag.id} className={`sidebar-link tag-sidebar-link${tagFilter === tag.id ? " selected" : ""}`} type="button" onClick={() => { setTagFilter(tag.id); setProjectFilter("all"); setFilter("All"); }}>
                <span className="tag-sidebar-mark" aria-hidden="true">#</span><span>{tag.name}</span>
              </button>
            ))}
          </section>
          <div className="sidebar-bottom">
            <span className="privacy-note"><span aria-hidden="true">◉</span> Your list is private</span>
          </div>
        </aside>

        <section className="list-shell">
          {signOutError && <p className="notice error list-notice" role="alert">{signOutError}</p>}
          <div className="list-heading">
            <div>
              <p className="eyebrow">{today}</p>
              <h1>{viewTitle}</h1>
            </div>
            <span className="view-task-count">{filter === "Trash" ? trashedCount : visibleTodos.length} {filter === "Trash" ? "in Trash" : visibleTodos.length === 1 ? "task" : "tasks"}</span>
          </div>

          {filter !== "Trash" && (
            <form className="add-form" onSubmit={addTodo}>
              <span className="add-plus" aria-hidden="true">+</span>
              <input id="new-task-input" aria-label="Add a task" placeholder="Add a task" value={task} onChange={(event) => setTask(event.target.value)} maxLength="200" />
              <button className="primary-button add-button" type="submit" disabled={busy || !task.trim()}>Add task</button>
            </form>
          )}

          <div className="list-toolbar">
            <span className="list-toolbar-label">{filter === "Trash" ? "Deleted tasks" : "Tasks"}</span>
          <label className="priority-filter">
            <span className="visually-hidden">Priority</span>
            <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">Filter by priority</option>
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>{priority === "none" ? "No priority" : priority[0].toUpperCase() + priority.slice(1)}</option>
              ))}
            </select>
          </label>
          </div>

        {listError && <p className="notice error list-notice" role="alert">{listError}</p>}
        {undoTodoId !== null && filter !== "Trash" && (
          <p className="notice success undo-notice" role="status">
            Task moved to Trash.
            <button type="button" className="todo-action-button undo-button" onClick={undoDelete}>Undo</button>
          </p>
        )}
        {!todosReady ? (
          <div className="list-loading" role="status"><span className="loader" aria-hidden="true" />Loading your list</div>
        ) : visibleTodos.length === 0 ? (
          <div className="empty-state">
            <span className="empty-illustration" aria-hidden="true">{filter === "Done" ? "✳" : filter === "Trash" ? "⌫" : "○"}</span>
            <h2>{filter === "Trash" ? "Trash is empty." : isInboxView ? "A fresh page." : `Nothing ${filter === "Active" ? "left to do" : filter === "Done" ? "done yet" : "here"}.`}</h2>
            <p>{filter === "Trash" ? "Deleted tasks will stay here so you can restore them." : isInboxView ? "Add your first task above. It doesn't have to be a big one." : "Try another view or add a new task."}</p>
          </div>
        ) : (
          <ul className="todo-list">
            {visibleGroups.map(({ todo, children }) => {
              const progress = getSubtaskProgress(todos, todo.id);
              return (
                <li className="todo-group" key={todo.id}>
                  {renderTodoRow(todo)}
                  {subtaskParentId === todo.id && filter !== "Trash" && (
                    <form className="subtask-create-form" onSubmit={(event) => addSubtask(event, todo)}>
                      <label className="visually-hidden" htmlFor={`subtask-title-${todo.id}`}>Subtask for {todo.title}</label>
                      <input
                        id={`subtask-title-${todo.id}`}
                        aria-label={`Subtask for ${todo.title}`}
                        placeholder="Add a subtask"
                        maxLength="200"
                        value={subtaskTitle}
                        onChange={(event) => setSubtaskTitle(event.target.value)}
                        autoFocus
                      />
                      <button className="todo-action-button" type="submit" disabled={busy || !subtaskTitle.trim()}>Add</button>
                      <button className="todo-action-button" type="button" onClick={() => { setSubtaskParentId(null); setSubtaskTitle(""); }}>Cancel</button>
                    </form>
                  )}
                  {progress.total > 0 && (
                    <div className={`subtask-section${children.length === 0 ? " subtask-section-filtered" : ""}`}>
                      <span className="subtask-progress">{progress.completed} / {progress.total} completed</span>
                      {children.length > 0 && (
                        <ul className="subtask-list">
                          {children.map((child) => (
                            <li className="subtask-item" key={child.id}>{renderTodoRow(child, true)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <footer className="list-footer">
          <span>{filter === "Trash" ? "Deleted tasks can be restored or removed permanently." : "One thing at a time."}</span>
        </footer>
      </section>
      </div>
    </main>
  );
}

export default App;
