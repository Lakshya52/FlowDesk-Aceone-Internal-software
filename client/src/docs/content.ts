export interface Section {
  type: "h2" | "h3" | "p" | "list" | "ordered" | "code" | "callout" | "table" | "arch-cards"
  id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
  props?: Record<string, string>
}

export interface DocPage {
  title: string
  description: string
  breadcrumbs: { label: string; slug?: string }[]
  lastUpdated: string
  readingTime: string
  sections: Section[]
  prev?: { slug: string; title: string }
  next?: { slug: string; title: string }
}

export const linkSlugs: Record<string, string> = {
  Introduction: "introduction",
  Quickstart: "quickstart",
  Installation: "installation",
  Configuration: "configuration",
  "Ongoing Work": "ongoing-work",
  "Completed Projects": "completed-projects",
  "Recurring Blueprints": "recurring-blueprints",
  Assignments: "assignments",
  "Task States": "task-states",
  Checkpoints: "checkpoints",
  "Team Ownership": "team-ownership",
  Deadlines: "deadlines",
  "AI Buddy": "ai-buddy",
  "Collaborative Canvas": "collaborative-canvas",
  "Real-time Chat": "real-time-chat",
  "Activity Logs": "activity-logs",
  "RBAC Overview": "rbac-overview",
  "Admin Role": "admin-role",
  "Manager Role": "manager-role",
  "Member Role": "member-role",
  "Recurring Engine": "recurring-engine",
  "No-Due-Date Logic": "no-due-date-logic",
  "Glassmorphism UI": "glassmorphism-ui",
  "Real-time Status": "real-time-status",
}

function h2(id: string, text: string): Section {
  return { type: "h2", id, content: text }
}

function h3(text: string): Section {
  return { type: "h3", content: text }
}

function p(text: string): Section {
  return { type: "p", content: text }
}

function list(items: [string, string][]): Section {
  return { type: "list", content: items }
}

function ordered(items: string[]): Section {
  return { type: "ordered", content: items }
}

function code(text: string): Section {
  return { type: "code", content: text }
}

function callout(text: string): Section {
  return { type: "callout", content: text }
}

function table(headers: string[], rows: [string, string, string][]): Section {
  return { type: "table", content: { headers, rows } }
}

function archCards(items: [string, string][]): Section {
  return { type: "arch-cards", content: items }
}

const pages: Record<string, DocPage> = {}

function define(
  slug: string,
  page: Omit<DocPage, "prev" | "next">,
  order?: { prev?: string; next?: string }
): void {
  pages[slug] = {
    ...page,
    prev: order?.prev ? { slug: order.prev, title: pageTitle(order.prev) } : undefined,
    next: order?.next ? { slug: order.next, title: pageTitle(order.next) } : undefined,
  }
}

// Helper to look up title from a slug (needed for prev/next resolution)
function pageTitle(slug: string): string {
  const reverse = Object.fromEntries(Object.entries(linkSlugs).map(([k, v]) => [v, k]))
  return reverse[slug] || slug
}

// ── GETTING STARTED ──────────────────────────────────────────

define("introduction", {
  title: "Introduction",
  description: "An overview of FlowDesk — the internal management ecosystem for your organisation.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Getting Started" },
    { label: "Introduction" },
  ],
  lastUpdated: "June 15, 2026",
  readingTime: "8 min read",
  sections: [
    h2("what-is-flowdesk", "What is FlowDesk?"),
    p(
      "FlowDesk is a sophisticated, full-stack internal management ecosystem that centralises complex business operations — from high-level project management to granular day-to-day tasks — into a single, high-performance platform."
    ),
    p(
      "Built on a modern MERN-like stack with end-to-end TypeScript safety, FlowDesk delivers real-time collaboration, intelligent automation, and role-based access control. Whether you are tracking ongoing assignments, managing recurring project blueprints, or collaborating with your team on a digital canvas, FlowDesk provides a unified workspace tailored to your organisation's workflows."
    ),

    h2("modular-architecture", "Modular Architecture"),
    p(
      "FlowDesk is architected as a modular, full-stack application with clear separation of concerns. This design ensures maintainability, scalability, and type safety across every layer of the stack."
    ),
    archCards([
      [
        "Frontend",
        "React + TypeScript with a custom CSS design system optimised for readability and performance. The glassmorphism UI provides a premium, semi-transparent aesthetic that reduces eye strain.",
      ],
      [
        "Backend",
        "Node.js + Express + Mongoose powering a robust RESTful API with full TypeScript types shared between client and server.",
      ],
      [
        "Real-time",
        "Socket.io integration enables instant updates for chats, notifications, and live presence indicators across the platform.",
      ],
      [
        "Storage",
        "MongoDB with GridFS integration for handling secure document attachments, file uploads, and media storage.",
      ],
    ]),

    h2("project-management", "Project Management"),
    p(
      "Projects — called <strong>Assignments</strong> — are at the heart of FlowDesk. They are organised into three distinct categories."
    ),
    h3("Ongoing Work"),
    p(
      "Active projects currently being handled by teams. Each ongoing assignment tracks its progress, associated tasks, team members, and deadlines in real time."
    ),
    h3("Completed Projects"),
    p(
      "A permanent archive of finished projects for historical reference and auditing. All task data, activity logs, and file attachments are retained."
    ),
    h3("Recurring Blueprints"),
    p(
      "Blueprints act as templates that automatically spawn new project instances on a schedule — Daily, Weekly, Monthly, or Yearly — with pre-filled tasks, teams, and configurations."
    ),

    h2("task-ecosystem", "Task Ecosystem"),
    p(
      "Tasks are the granular units of work within each project. They provide fine-grained visibility into what needs to be done, who is responsible, and where things stand."
    ),
    h3("Task States"),
    p(
      "Every task progresses through a defined state machine: <code>Todo</code> → <code>In Progress</code> → <code>Review</code> → <code>Completed</code>. Each transition is logged in the activity feed."
    ),
    h3("Checkpoints"),
    p(
      "Each task supports subtask checklists for tracking multi-step processes. Complex deliverables can be broken down into verifiable sub-items."
    ),

    h2("ai-buddy-integration", "AI Buddy Integration"),
    p(
      "FlowDesk features a built-in AI assistant — <strong>AI Buddy</strong> — that helps team members work smarter and faster. It can analyse project velocity, generate task descriptions, and provide technical guidance based on project history."
    ),

    h2("collaborative-canvas", "Collaborative Canvas"),
    p(
      "The Collaborative Canvas is a digital whiteboard and note-taking space where teams can brainstorm, organise visual workflows, and capture ideas in real time with post-it style notes and visual workflow connectors."
    ),

    h2("security-and-permissions", "Security & Permissions"),
    p(
      "FlowDesk implements a strict Role-Based Access Control (RBAC) system. <strong>Admin</strong> users have full system control, <strong>Manager</strong> users oversee teams and assignments, and <strong>Member</strong> users focus on task execution and collaboration."
    ),

    h2("next-steps", "Next Steps"),
    p(
      "Head over to the <a>Quickstart</a> guide to set up your first project, or dive into <a>Task States</a> to understand the workflow model in detail."
    ),
  ],
}, { next: "quickstart" })

define("quickstart", {
  title: "Quickstart",
  description: "Set up your first project and invite your team in under 5 minutes.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Getting Started" },
    { label: "Quickstart" },
  ],
  lastUpdated: "June 14, 2026",
  readingTime: "4 min read",
  sections: [
    h2("create-your-account", "Create your account"),
    p(
      "Visit the FlowDesk login page and click <strong>Sign up</strong>. Enter your work email, full name, and create a strong password. You will receive a verification email — click the link to activate your account."
    ),
    callout(
      "Use your official work email address to ensure automatic role assignment by your system administrator."
    ),

    h2("create-a-project", "Create a project"),
    p(
      "Once logged in, click the <strong>+ New Project</strong> button in the sidebar. Fill in the project name, description, and select a category — Ongoing, Completed, or Recurring Blueprint. Set a deadline or leave it unset for open-ended work."
    ),
    p(
      "For recurring projects, choose a frequency (Daily, Weekly, Monthly, Yearly) and the system will automatically spawn new instances on schedule."
    ),

    h2("add-team-members", "Add team members"),
    p(
      "Navigate to the <strong>Members</strong> tab within your project. Search for colleagues by name or email and assign them a role — Admin, Manager, or Member. Members added to a project can immediately see and interact with its tasks."
    ),

    h2("create-your-first-task", "Create your first task"),
    p(
      "Inside the project, click <strong>Add Task</strong>. Give it a title, description, and assign it to a team member or an entire team. You can also attach files, set checkpoints, and choose a due date."
    ),
    code(`// Example: Creating a task via the API
POST /api/projects/:projectId/tasks
{
  "title": "Design landing page mockups",
  "description": "Create Figma mockups for the new landing page redesign.",
  "assignedTo": ["user_abc123"],
  "priority": "high",
  "dueDate": "2026-07-01"
}`),

    h2("next-steps", "Next steps"),
    p(
      "Now that your first project is up and running, explore <a>Task States</a> to understand how work progresses, or check <a>Recurring Blueprints</a> to automate your workflows."
    ),
  ],
}, { prev: "introduction", next: "installation" })

define("installation", {
  title: "Installation",
  description: "Install the FlowDesk CLI and configure your development environment.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Getting Started" },
    { label: "Installation" },
  ],
  lastUpdated: "June 12, 2026",
  readingTime: "3 min read",
  sections: [
    h2("system-requirements", "System Requirements"),
    list([
      ["Node.js 18+", "FlowDesk CLI requires Node.js version 18 or higher. We recommend using nvm to manage your Node versions."],
      ["npm or yarn", "The CLI is distributed via npm. Ensure you have npm 8+ or yarn 1.22+ installed."],
      ["Git", "Version control is used to sync project configuration and track changes across team members."],
    ]),

    h2("install-the-cli", "Install the CLI"),
    p("Open your terminal and run:"),
    code(`npm install -g @flowdesk-cli`),
    p("Verify the installation:"),
    code(`flowdesk --version
# Expected output: v2.1.4`),

    h2("configure-authentication", "Configure authentication"),
    p(
      "Generate an API token from your FlowDesk account settings. Then configure the CLI:"
    ),
    code(`flowdesk login --token fd_api_xxxxxxxxxxxx`),
    p(
      "Your token is stored securely in your system keychain. You can also set it as the <code>FLOWDESK_API_TOKEN</code> environment variable."
    ),

    h2("browser-access", "Browser access"),
    p(
      "No installation is required for the web application. Simply navigate to your organisation's FlowDesk URL and log in with your credentials. The web app works best on Chrome, Firefox, and Edge."
    ),

    h2("troubleshooting", "Troubleshooting"),
    callout(
      "If you encounter a <code>EACCES</code> error during global npm installation, use <code>npm install -g @flowdesk-cli --unsafe-perm</code> or consult your IT administrator for sudo access."
    ),
  ],
}, { prev: "quickstart", next: "configuration" })

define("configuration", {
  title: "Configuration",
  description: "Configure FlowDesk settings, environment variables, and team preferences.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Getting Started" },
    { label: "Configuration" },
  ],
  lastUpdated: "June 10, 2026",
  readingTime: "4 min read",
  sections: [
    h2("environment-variables", "Environment Variables"),
    p("FlowDesk supports the following environment variables for customising your local and production setup:"),
    table(
      ["Variable", "Description", "Default"],
      [
        ["FLOWDESK_API_URL", "Base URL for the FlowDesk API server", "https://api.flowdesk.io"],
        ["FLOWDESK_API_TOKEN", "Your personal API authentication token", "—"],
        ["FLOWDESK_ENV", "Environment name (development, staging, production)", "development"],
        ["FLOWDESK_LOG_LEVEL", "Logging verbosity (debug, info, warn, error)", "info"],
      ]
    ),

    h2("project-preferences", "Project Preferences"),
    p(
      "Each project can be configured with custom preferences. Navigate to <strong>Project Settings &gt; Preferences</strong> to adjust:"
    ),
    list([
      ["Default task view", "Choose between Board, List, or Calendar as the default view for new tasks."],
      ["Notification rules", "Control which events trigger in-app and email notifications for team members."],
      ["Auto-archive duration", "Set how long completed projects are retained before automatic archiving."],
    ]),

    h2("team-settings", "Team Settings"),
    p(
      "Team settings allow managers to define working hours, holiday calendars, and default assignment rules. Changes apply to all current and future projects within the team."
    ),

    h2("update-preferences", "Update Preferences"),
    p(
      "FlowDesk auto-updates to the latest version by default. To stay on an older version, set <strong>Update: Mode</strong> to <code>manual</code> or <code>none</code> in your account settings."
    ),
  ],
}, { prev: "installation", next: "ongoing-work" })

// ── PROJECT MANAGEMENT ───────────────────────────────────────

define("ongoing-work", {
  title: "Ongoing Work",
  description: "Manage active projects and monitor team progress in real time.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Project Management" },
    { label: "Ongoing Work" },
  ],
  lastUpdated: "June 13, 2026",
  readingTime: "3 min read",
  sections: [
    h2("overview", "Overview"),
    p(
      "The <strong>Ongoing Work</strong> section is the command centre for all active projects. Here you can view, filter, and manage every project currently being worked on by your teams."
    ),

    h2("dashboard-view", "Dashboard View"),
    p(
      "The dashboard displays each project as a card with its name, progress bar, assigned team members, deadline, and latest activity. Use the filters at the top to narrow down by team, priority, or date range."
    ),

    h2("tracking-progress", "Tracking Progress"),
    p(
      "Each project has a built-in progress tracker that aggregates task completion data. The percentage is calculated from the number of completed tasks divided by total tasks. Team leads can view velocity charts and forecast completion dates."
    ),

    h2("reassigning-work", "Reassigning Work"),
    p(
      "Projects can be reassigned to different teams or individual leads at any time. Navigate to <strong>Project Settings &gt; Team</strong> to change ownership. All task assignments and activity logs are preserved."
    ),

    h2("bulk-operations", "Bulk Operations"),
    p("Managers can select multiple ongoing projects and perform bulk actions:"),
    list([
      ["Change priority", "Update the priority level of several projects at once."],
      ["Extend deadlines", "Push back deadlines by a specified number of days."],
      ["Archive", "Move completed or stalled projects to the archive."],
    ]),
  ],
}, { prev: "configuration", next: "completed-projects" })

define("completed-projects", {
  title: "Completed Projects",
  description: "Archive, review, and audit finished projects.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Project Management" },
    { label: "Completed Projects" },
  ],
  lastUpdated: "June 11, 2026",
  readingTime: "2 min read",
  sections: [
    h2("archive-overview", "Archive Overview"),
    p(
      "The <strong>Completed Projects</strong> section provides a permanent archive of all finished projects. Every detail — tasks, discussions, file attachments, and activity logs — is preserved for future reference."
    ),

    h2("audit-trail", "Audit Trail"),
    p(
      "Each completed project includes a full audit trail showing who did what and when. This is invaluable for compliance, post-mortem analysis, and performance reviews. The trail includes task state changes, file uploads, comment additions, and member changes."
    ),

    h2("search-and-filter", "Search and Filter"),
    p(
      "Use the search bar to find completed projects by name, team member, or date range. Filters allow you to narrow results by project category, priority, or completion date."
    ),

    h2("restoring-projects", "Restoring Projects"),
    p(
      "If a completed project needs to be reopened, managers can restore it to the Ongoing Work section. Restoring a project preserves all its data and task states."
    ),
  ],
}, { prev: "ongoing-work", next: "recurring-blueprints" })

define("recurring-blueprints", {
  title: "Recurring Blueprints",
  description: "Automate project creation with intelligent template blueprints.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Project Management" },
    { label: "Recurring Blueprints" },
  ],
  lastUpdated: "June 14, 2026",
  readingTime: "4 min read",
  sections: [
    h2("what-are-blueprints", "What are Blueprints?"),
    p(
      "Recurring Blueprints are project templates that automatically spawn new project instances on a defined schedule. They are ideal for repetitive workflows like weekly sprints, monthly reports, or quarterly reviews."
    ),

    h2("creating-a-blueprint", "Creating a Blueprint"),
    p("To create a blueprint, navigate to <strong>Blueprints &gt; New Blueprint</strong> and configure:"),
    list([
      ["Template project", "Set up the initial project structure including tasks, team assignments, and attachments."],
      ["Schedule", "Choose Daily, Weekly, Monthly, or Yearly recurrence. Optionally set a start date and end date."],
      ["Auto-assignment", "Configure which team members are automatically added to each spawned instance."],
    ]),

    h2("intelligent-spawning", "Intelligent Spawning"),
    p(
      "The recurring engine is designed to be robust. It ensures no duplicate projects are created for the same cycle. If the system was offline during a scheduled spawn time, it automatically catches up by creating the missed instance when it comes back online."
    ),
    code(`// Server: Recurring engine catch-up logic
async function catchUpMissedCycles(blueprintId) {
  const blueprint = await Blueprint.findById(blueprintId);
  const missedCycles = calculateMissedSince(blueprint.lastSpawned, blueprint.schedule);
  for (const cycle of missedCycles) {
    await spawnProjectFromBlueprint(blueprint, cycle);
  }
  await Blueprint.updateOne(
    { _id: blueprintId },
    { lastSpawned: new Date() }
  );
}`),

    h2("managing-blueprints", "Managing Blueprints"),
    p(
      "Blueprints can be paused, edited, or deleted at any time. Pausing a blueprint prevents new instances from being spawned without deleting the template. Editing a blueprint applies changes to all future instances."
    ),
  ],
}, { prev: "completed-projects", next: "assignments" })

define("assignments", {
  title: "Assignments",
  description: "Create and manage project assignments across your organisation.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Project Management" },
    { label: "Assignments" },
  ],
  lastUpdated: "June 10, 2026",
  readingTime: "3 min read",
  sections: [
    h2("what-is-an-assignment", "What is an Assignment?"),
    p(
      "An <strong>Assignment</strong> is FlowDesk's term for a project. Each assignment bundles together tasks, team members, discussions, files, and deadlines into a single manageable unit."
    ),

    h2("creating-assignments", "Creating Assignments"),
    p("Assignments can be created from the dashboard or within a team workspace:"),
    ordered([
      "Click <strong>+ New Project</strong> from the sidebar or dashboard.",
      "Choose a category: Ongoing, Completed, or Recurring Blueprint.",
      "Fill in the project name, description, and optional deadline.",
      "Add team members and assign roles (Admin, Manager, Member).",
      "Click <strong>Create</strong> — the assignment is immediately available to all members.",
    ]),

    h2("assignment-status", "Assignment Status"),
    p(
      "Each assignment has a status indicator: <strong>Active</strong>, <strong>At Risk</strong> (past deadline or blocked), <strong>Completed</strong>, or <strong>Archived</strong>. Status is automatically updated based on task completion and deadline proximity."
    ),

    h2("assignment-templates", "Assignment Templates"),
    p(
      "Frequently used project structures can be saved as templates. When creating a new assignment, select a template to pre-populate tasks, teams, and settings."
    ),
  ],
}, { prev: "recurring-blueprints", next: "task-states" })

// ── TASK ECOSYSTEM ───────────────────────────────────────────

define("task-states", {
  title: "Task States",
  description: "Understand the task lifecycle and state transitions.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Task Ecosystem" },
    { label: "Task States" },
  ],
  lastUpdated: "June 13, 2026",
  readingTime: "3 min read",
  sections: [
    h2("state-machine", "State Machine"),
    p(
      "Every task in FlowDesk progresses through a four-state lifecycle. Each transition is logged and can trigger notifications to relevant team members."
    ),

    table(
      ["State", "Description", "Actions available"],
      [
        ["Todo", "Task has been created but work has not started", "Assign, edit, move to In Progress"],
        ["In Progress", "Work is actively being done on the task", "Add checkpoints, move to Review"],
        ["Review", "Work is complete and awaiting approval", "Comment, approve, request changes"],
        ["Completed", "Task has been approved and finished", "Archive, reopen if needed"],
      ]
    ),

    h2("state-transitions", "State Transitions"),
    p(
      "Tasks can only move forward through the state machine (Todo → In Progress → Review → Completed). However, managers can move a task back to a previous state if rework is needed."
    ),
    p(
      "When a task transitions to <strong>Review</strong>, assigned reviewers are notified. They can approve it to mark it <strong>Completed</strong> or request changes, which sends it back to <strong>In Progress</strong>."
    ),

    h2("automation-rules", "Automation Rules"),
    p(
      "Blueprint templates can include automation rules that automatically transition tasks based on conditions. For example, a task can be moved to <strong>Review</strong> when all its checkpoints are marked complete."
    ),
  ],
}, { prev: "assignments", next: "checkpoints" })

define("checkpoints", {
  title: "Checkpoints",
  description: "Break complex tasks into manageable subtasks with checkpoints.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Task Ecosystem" },
    { label: "Checkpoints" },
  ],
  lastUpdated: "June 11, 2026",
  readingTime: "2 min read",
  sections: [
    h2("what-are-checkpoints", "What are Checkpoints?"),
    p(
      "Checkpoints are subtask checklists within a task. They allow you to break complex deliverables into smaller, verifiable steps. A task can only be marked <strong>Completed</strong> when all its checkpoints are done."
    ),

    h2("adding-checkpoints", "Adding Checkpoints"),
    p(
      "Open any task and scroll to the <strong>Checkpoints</strong> section. Click <strong>+ Add Checkpoint</strong> and enter a description. You can reorder checkpoints by dragging them."
    ),
    list([
      ["Descriptive titles", "Use clear, action-oriented language (e.g. 'Draft API documentation' rather than 'Docs')."],
      ["Assign owners", "Each checkpoint can be assigned to a different team member."],
      ["Add estimates", "Optionally set time estimates for each checkpoint to track effort."],
    ]),

    h2("progress-tracking", "Progress Tracking"),
    p(
      "The parent task shows a progress bar based on completed checkpoints. This gives an instant visual indicator of how far along a task is, even before it reaches the <strong>Review</strong> state."
    ),
  ],
}, { prev: "task-states", next: "team-ownership" })

define("team-ownership", {
  title: "Team Ownership",
  description: "Assign tasks to individuals or entire teams for flexible workload management.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Task Ecosystem" },
    { label: "Team Ownership" },
  ],
  lastUpdated: "June 12, 2026",
  readingTime: "2 min read",
  sections: [
    h2("individual-assignment", "Individual Assignment"),
    p(
      "Tasks can be assigned to a specific person. The assignee is responsible for completing the task and updating its status. They receive notifications for any changes or comments on the task."
    ),

    h2("team-assignment", "Team Assignment"),
    p(
      "Tasks can also be assigned to an entire team. In this case, any member of that team can pick up the work, update its state, add checkpoints, and mark it complete. This is useful for shared responsibilities where the first available person should handle the work."
    ),

    h2("unassigned-tasks", "Unassigned Tasks"),
    p(
      "Tasks without an assignee appear in the <strong>Unassigned</strong> view. Managers can bulk-assign unassigned tasks to team members or leave them in the pool for anyone to claim."
    ),

    h2("ownership-transfer", "Ownership Transfer"),
    p(
      "Task ownership can be transferred at any time. Simply edit the task and select a new assignee or team. All checkpoint assignments, comments, and activity logs remain intact."
    ),
  ],
}, { prev: "checkpoints", next: "deadlines" })

define("deadlines", {
  title: "Deadlines",
  description: "Manage task and project deadlines, including special handling for open-ended work.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Task Ecosystem" },
    { label: "Deadlines" },
  ],
  lastUpdated: "June 10, 2026",
  readingTime: "3 min read",
  sections: [
    h2("setting-deadlines", "Setting Deadlines"),
    p(
      "Deadlines can be set at both the project and task level. Project deadlines serve as the target completion date, while task deadlines act as intermediate milestones. Both are displayed in the project dashboard with visual indicators for approaching and overdue dates."
    ),

    h2("no-due-date-handling", "No-Due-Date Handling"),
    p(
      "FlowDesk includes specialised logic for projects and tasks without finite deadlines. This prevents the common <strong>Unix Epoch (1970)</strong> bug where missing dates default to January 1, 1970. Tasks without due dates are handled gracefully throughout the system, appearing in dedicated views and never triggering false deadline alerts."
    ),
    code(`// Server: Safe date handling
function getTaskDeadline(task) {
  if (!task.dueDate || task.dueDate.getTime() === 0) {
    return null; // Explicitly null, not Unix epoch
  }
  return task.dueDate;
}`),

    h2("deadline-notifications", "Deadline Notifications"),
    p(
      "FlowDesk sends automatic notifications as deadlines approach: a warning at 7 days, a reminder at 48 hours, and an alert on the due date. Managers receive a daily digest of all upcoming and overdue deadlines across their projects."
    ),
  ],
}, { prev: "team-ownership", next: "ai-buddy" })

// ── COLLABORATION ────────────────────────────────────────────

define("ai-buddy", {
  title: "AI Buddy",
  description: "Your intelligent assistant for project analysis, task creation, and technical guidance.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Collaboration" },
    { label: "AI Buddy" },
  ],
  lastUpdated: "June 15, 2026",
  readingTime: "3 min read",
  sections: [
    h2("what-is-ai-buddy", "What is AI Buddy?"),
    p(
      "AI Buddy is a built-in intelligent assistant that helps team members work smarter and faster. Integrated directly into the project workspace, it leverages project history and contextual data to provide relevant assistance."
    ),

    h2("capabilities", "Capabilities"),
    list([
      ["Project analysis and forecasting", "AI Buddy analyses current velocity and historical data to predict realistic completion dates and identify bottlenecks."],
      ["Task description generation", "Turn a one-line summary into a detailed, structured task description with acceptance criteria and subtask suggestions."],
      ["Technical guidance", "Provides context-aware answers based on previous project history, resolved issues, and documentation."],
      ["Deadline optimisation", "Suggests optimal deadlines based on team workload and past performance."],
    ]),

    h2("how-to-use", "How to Use"),
    p(
      "You can invoke AI Buddy from any task or project view by pressing <code>Cmd + B</code> or clicking the AI icon in the toolbar. Type your question or request in natural language — AI Buddy understands context and responds accordingly."
    ),

    h2("privacy", "Privacy"),
    callout(
      "AI Buddy processes data within your organisation's workspace. No project data is used for model training or shared externally. You can disable AI Buddy in your account settings at any time."
    ),
  ],
}, { prev: "deadlines", next: "collaborative-canvas" })

define("collaborative-canvas", {
  title: "Collaborative Canvas",
  description: "A digital whiteboard for brainstorming, visual workflows, and real-time collaboration.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Collaboration" },
    { label: "Collaborative Canvas" },
  ],
  lastUpdated: "June 13, 2026",
  readingTime: "3 min read",
  sections: [
    h2("what-is-the-canvas", "What is the Canvas?"),
    p(
      "The Collaborative Canvas is a digital whiteboard and note-taking space. Teams can create post-it style notes, connect ideas with arrows, and build visual workflows on an infinite canvas."
    ),

    h2("post-it-notes", "Post-it Notes"),
    p(
      "Click anywhere on the canvas to create a new note. Each note supports rich text, colour coding, and attachments. Drag notes to rearrange them — the canvas auto-saves all changes."
    ),

    h2("visual-workflows", "Visual Workflows"),
    p(
      "Connect notes with arrows to create flowcharts, mind maps, or process diagrams. Select a note and drag from the connection handle to another note to create a link. Links are preserved when notes are moved."
    ),

    h2("personal-vs-collaborative", "Personal vs Collaborative"),
    p(
      "Switch between <strong>Personal</strong> mode for private drafting and brainstorming, and <strong>Collaborative</strong> mode for real-time team sessions. In Collaborative mode, changes are synced instantly via Socket.io — you can see teammates' cursors and edits as they happen."
    ),
  ],
}, { prev: "ai-buddy", next: "real-time-chat" })

define("real-time-chat", {
  title: "Real-time Chat",
  description: "Instant messaging within projects, powered by Socket.io.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Collaboration" },
    { label: "Real-time Chat" },
  ],
  lastUpdated: "June 12, 2026",
  readingTime: "3 min read",
  sections: [
    h2("project-chat", "Project Chat"),
    p(
      "Every project in FlowDesk has a dedicated chat room. Team members can send messages, share files, and discuss project-related topics without leaving the platform. Messages are persisted and searchable."
    ),

    h2("real-time-messaging", "Real-time Messaging"),
    p(
      "Powered by Socket.io, messages appear instantly on all connected clients. Read receipts show who has seen each message. Typing indicators let you know when someone is composing a reply."
    ),
    code(`// Client: Joining a project chat room
const socket = io(FLOWDESK_API_URL, {
  auth: { token: userApiToken }
});

socket.emit("chat:join", { projectId: "proj_abc123" });

socket.on("chat:message", (message) => {
  appendMessageToChat(message);
});

function sendMessage(text) {
  socket.emit("chat:send", {
    projectId: "proj_abc123",
    text,
  });
}`),

    h2("mentions-and-notifications", "Mentions and Notifications"),
    p(
      "Use <code>@username</code> to mention a team member in chat. They will receive an in-app notification and, if configured, an email alert. Mentions are clickable and link directly to the user's profile."
    ),

    h2("search", "Search"),
    p(
      "The chat search bar allows you to find messages by keyword, sender, or date. Search results include context from surrounding messages for better readability."
    ),
  ],
}, { prev: "collaborative-canvas", next: "activity-logs" })

define("activity-logs", {
  title: "Activity Logs",
  description: "A comprehensive audit trail of every change made across the platform.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Collaboration" },
    { label: "Activity Logs" },
  ],
  lastUpdated: "June 11, 2026",
  readingTime: "2 min read",
  sections: [
    h2("what-is-logged", "What is Logged?"),
    p(
      "Every change to a project, task, or setting is recorded in the activity log. This includes task state transitions, file uploads, comment additions, member changes, and configuration updates."
    ),
    list([
      ["Task events", "Creation, state changes, checkpoint completion, assignment changes."],
      ["Project events", "Creation, category changes, deadline updates, team membership changes."],
      ["File events", "Uploads, deletions, downloads of attachments and documents."],
      ["System events", "User logins, role changes, integration connections, blueprint spawns."],
    ]),

    h2("viewing-logs", "Viewing Logs"),
    p(
      "Activity logs are accessible from the project dashboard under the <strong>Activity</strong> tab. Each entry shows who performed the action, what changed, and when. Logs can be filtered by event type, user, and date range."
    ),

    h2("exporting-logs", "Exporting Logs"),
    p(
      "Managers and Admins can export activity logs as CSV or JSON for external auditing and compliance purposes. The export includes all filters currently applied."
    ),
  ],
}, { prev: "real-time-chat", next: "rbac-overview" })

// ── SECURITY & ROLES ─────────────────────────────────────────

define("rbac-overview", {
  title: "RBAC Overview",
  description: "Understand FlowDesk's Role-Based Access Control system.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Security & Roles" },
    { label: "RBAC Overview" },
  ],
  lastUpdated: "June 14, 2026",
  readingTime: "3 min read",
  sections: [
    h2("what-is-rbac", "What is RBAC?"),
    p(
      "FlowDesk implements a strict <strong>Role-Based Access Control (RBAC)</strong> system to ensure every user sees only what they need to see and can act only within their authorised scope."
    ),

    h2("role-hierarchy", "Role Hierarchy"),
    p("There are three primary roles, each with increasing levels of access:"),
    table(
      ["Role", "Scope", "Key Permissions"],
      [
        ["Admin", "System-wide", "User management, financial reports, role assignments, system settings"],
        ["Manager", "Team & Projects", "Create assignments, approve work, view analytics, manage team members"],
        ["Member", "Assigned projects", "Task execution, status updates, collaboration, file uploads"],
      ]
    ),

    h2("how-permissions-work", "How Permissions Work"),
    p(
      "Permissions are enforced at every API endpoint and UI component. The frontend conditionally renders actions based on the user's role, while the backend validates every request against the RBAC policy before executing."
    ),
    code(`// Server: RBAC middleware example
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

// Usage
router.delete("/users/:id", requireRole("admin"), deleteUser);`),

    h2("role-inheritance", "Role Inheritance"),
    p(
      "Roles are hierarchical: Admins inherit all Manager permissions, and Managers inherit all Member permissions. This ensures upward compatibility while maintaining strict downward access control."
    ),
  ],
}, { prev: "activity-logs", next: "admin-role" })

define("admin-role", {
  title: "Admin Role",
  description: "Full system control, user management, and configuration.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Security & Roles" },
    { label: "Admin Role" },
  ],
  lastUpdated: "June 13, 2026",
  readingTime: "2 min read",
  sections: [
    h2("admin-capabilities", "Admin Capabilities"),
    p("Administrators have full, unrestricted access to the entire FlowDesk platform:"),
    list([
      ["User management", "Create, suspend, or delete user accounts. Assign roles and manage permissions."],
      ["Financial reports", "Access billing, usage statistics, and financial dashboards."],
      ["System settings", "Configure global platform settings, integrations, and security policies."],
      ["Audit logs", "View and export all activity logs across every project and team."],
    ]),

    h2("best-practices", "Best Practices"),
    p(
      "We recommend limiting the number of Admin accounts to essential personnel only. Most day-to-day operations can be handled by Managers. Admins should use their elevated privileges only when necessary."
    ),

    h2("becoming-an-admin", "Becoming an Admin"),
    p(
      "Only existing Admins can grant the Admin role. If you need Admin access, contact your system administrator. Initial Admin accounts are configured during platform setup."
    ),
  ],
}, { prev: "rbac-overview", next: "manager-role" })

define("manager-role", {
  title: "Manager Role",
  description: "Oversee teams, create assignments, and approve completed work.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Security & Roles" },
    { label: "Manager Role" },
  ],
  lastUpdated: "June 12, 2026",
  readingTime: "2 min read",
  sections: [
    h2("manager-capabilities", "Manager Capabilities"),
    p("Managers are responsible for overseeing teams and driving projects to completion:"),
    list([
      ["Create assignments", "Start new projects, set deadlines, and assign teams."],
      ["Approve work", "Review and approve completed tasks. Move tasks back for rework if needed."],
      ["Team management", "Add or remove team members from projects. View team workload and availability."],
      ["Analytics", "Access project velocity reports, team performance metrics, and deadline forecasts."],
    ]),

    h2("scope-of-access", "Scope of Access"),
    p(
      "Managers have full access to projects they own or are assigned to. They cannot access projects belonging to other teams unless explicitly granted cross-team permissions by an Admin."
    ),

    h2("reports-and-analytics", "Reports and Analytics"),
    p(
      "Managers can generate custom reports for their projects, including burndown charts, velocity trends, and individual contributor summaries. Reports can be exported as PDF or CSV."
    ),
  ],
}, { prev: "admin-role", next: "member-role" })

define("member-role", {
  title: "Member Role",
  description: "Focus on task execution, updates, and collaboration within assigned projects.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Security & Roles" },
    { label: "Member Role" },
  ],
  lastUpdated: "June 12, 2026",
  readingTime: "2 min read",
  sections: [
    h2("member-capabilities", "Member Capabilities"),
    p("Members are the primary contributors who execute work within projects:"),
    list([
      ["Task execution", "View assigned tasks, update their state, add checkpoints, and mark them complete."],
      ["Collaboration", "Participate in project chats, comment on tasks, and use the Collaborative Canvas."],
      ["File management", "Upload, download, and manage files within assigned projects."],
      ["Notifications", "Receive alerts for assignments, mentions, and approaching deadlines."],
    ]),

    h2("member-limitations", "Member Limitations"),
    p(
      "Members cannot create projects, manage team membership, or access projects they are not assigned to. They cannot delete tasks or projects, and cannot modify project-level settings."
    ),

    h2("becoming-a-member", "Becoming a Member"),
    p(
      "New users are typically assigned the Member role by default. A Manager or Admin can promote a Member to Manager if needed. Members can request role changes through their team lead."
    ),
  ],
}, { prev: "manager-role", next: "recurring-engine" })

// ── ADVANCED ─────────────────────────────────────────────────

define("recurring-engine", {
  title: "Recurring Engine",
  description: "Deep dive into the intelligent blueprint spawning system.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Advanced" },
    { label: "Recurring Engine" },
  ],
  lastUpdated: "June 14, 2026",
  readingTime: "3 min read",
  sections: [
    h2("how-it-works", "How it Works"),
    p(
      "The Recurring Engine is a background service that continuously checks for blueprints due to spawn. Each blueprint has a schedule configuration — Daily, Weekly, Monthly, or Yearly — along with a start date and optional end date."
    ),

    h2("spawn-process", "Spawn Process"),
    p("When a blueprint is triggered, the engine performs the following steps:"),
    ordered([
      "Check if an instance for the current cycle already exists (duplicate prevention).",
      "Clone the blueprint template — copy all tasks, checkpoints, and configurations.",
      "Assign team members according to the blueprint's auto-assignment rules.",
      "Set the project start date to the current cycle date.",
      "Log the spawn event and notify assigned team members.",
    ]),

    h2("catch-up-mechanism", "Catch-Up Mechanism"),
    p(
      "If the system is offline during a scheduled spawn, the engine calculates missed cycles on restart and creates all outstanding instances. This ensures no cycle is ever skipped."
    ),
    code(`// Simplified catch-up calculation
function calculateMissedSince(lastSpawned, schedule) {
  const now = new Date();
  const missed = [];
  let cursor = new Date(lastSpawned);

  while (addInterval(cursor, schedule) < now) {
    cursor = addInterval(cursor, schedule);
    missed.push(new Date(cursor));
  }

  return missed;
}`),

    h2("monitoring", "Monitoring"),
    p(
      "Admins can view the spawn history of any blueprint, including timestamps, success/failure status, and the project IDs of spawned instances. Failed spawns are automatically retried up to three times."
    ),
  ],
}, { prev: "member-role", next: "no-due-date-logic" })

define("no-due-date-logic", {
  title: "No-Due-Date Logic",
  description: "How FlowDesk handles projects and tasks without finite deadlines.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Advanced" },
    { label: "No-Due-Date Logic" },
  ],
  lastUpdated: "June 10, 2026",
  readingTime: "2 min read",
  sections: [
    h2("the-problem", "The Problem"),
    p(
      "A common bug in project management systems is the <strong>Unix Epoch (1970)</strong> issue: when a date field is left empty, some systems default to January 1, 1970. This causes tasks to appear overdue, triggers false notifications, and clutters date-based views."
    ),

    h2("the-solution", "The Solution"),
    p(
      "FlowDesk handles missing dates explicitly. When a task or project is created without a due date, the system stores <code>null</code> instead of a default timestamp. All date-related logic checks for null values before performing calculations."
    ),
    code(`// Server: Safe date comparison
function isOverdue(dueDate) {
  if (!dueDate) return false; // No due date = not overdue
  if (dueDate.getTime() === 0) return false; // Guard against epoch
  return dueDate < new Date();
}`),

    h2("user-experience", "User Experience"),
    p(
      "Tasks without due dates appear in a dedicated <strong>Unscheduled</strong> view. They never trigger deadline notifications or appear in overdue reports. Managers can bulk-assign due dates to unscheduled tasks when priorities are established."
    ),
  ],
}, { prev: "recurring-engine", next: "glassmorphism-ui" })

define("glassmorphism-ui", {
  title: "Glassmorphism UI",
  description: "The design language and visual aesthetic of the FlowDesk platform.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Advanced" },
    { label: "Glassmorphism UI" },
  ],
  lastUpdated: "June 11, 2026",
  readingTime: "2 min read",
  sections: [
    h2("design-philosophy", "Design Philosophy"),
    p(
      "FlowDesk features a premium <strong>glassmorphism</strong> design language. Semi-transparent surfaces with backdrop blur effects create a modern, layered aesthetic that reduces visual noise and eye strain during extended use."
    ),

    h2("key-characteristics", "Key Characteristics"),
    list([
      ["Frosted glass effect", "UI elements use semi-transparent backgrounds (bg-opacity 10-30%) with backdrop-filter blur for a frosted glass appearance."],
      ["Layered depth", "Content is organised into visual layers that create a sense of depth and hierarchy without relying on heavy shadows."],
      ["Reduced eye strain", "The translucent design reduces harsh contrasts, making it easier to work for long sessions."],
      ["Customisable", "The design system is fully customisable through CSS custom properties (variables), allowing theme customisation."],
    ]),

    h2("customisation", "Customisation"),
    p(
      "Admins can customise the UI theme through the settings panel. Available options include primary colour, surface opacity, blur intensity, and dark mode. Changes apply globally across the platform."
    ),
  ],
}, { prev: "no-due-date-logic", next: "real-time-status" })

define("real-time-status", {
  title: "Real-time Status",
  description: "How FlowDesk detects and broadcasts online/offline presence in real time.",
  breadcrumbs: [
    { label: "Docs", slug: "introduction" },
    { label: "Advanced" },
    { label: "Real-time Status" },
  ],
  lastUpdated: "June 14, 2026",
  readingTime: "4 min read",
  sections: [
    h2("presence-system", "Presence System"),
    p(
      "FlowDesk's real-time status system uses <strong>Socket.io</strong> to broadcast online, offline, and idle states. Every connected client periodically sends a heartbeat to the server, which tracks the connection state of all users."
    ),

    h2("how-it-works", "How it Works"),
    p("When a user connects to FlowDesk, the following sequence occurs:"),
    ordered([
      "The client establishes a WebSocket connection via Socket.io, sending an auth token.",
      "The server verifies the token and registers the user as online, broadcasting the status change.",
      "The client sends periodic heartbeats (every 30 seconds) to confirm it is still active.",
      "If the server does not receive a heartbeat for 60 seconds, the user is marked as idle.",
      "When the tab is closed or the network disconnects, the socket closes and the user is marked offline.",
    ]),

    h2("smart-filtering", "Smart Filtering"),
    p(
      "A critical aspect of the presence system is filtering. When your own status changes (e.g. you open the app), the system must avoid highlighting all your conversations as if your colleagues are online."
    ),
    code(`// Client: Zustand store filtering logic
handleUserStatusChange(userId, status, currentUserId) {
  set((state) => ({
    conversations: state.conversations.map((conv) => {
      // Find if the status update is for the OTHER participant
      const otherParticipant = conv.participants.find(
        (p) => p._id === userId && p._id !== currentUserId
      );
      if (!otherParticipant) return conv; // Skip — it's our own status
      return {
        ...conv,
        participantStatus: { ...conv.participantStatus, [userId]: status },
      };
    }),
  }));
}`),

    h2("idle-detection", "Idle Detection"),
    p(
      "The client monitors user activity (mouse movement, keyboard input, tab focus). After 5 minutes of inactivity, it sends an <strong>idle</strong> status update. This helps team members know who is actively available vs. away from their desk."
    ),
  ],
}, { prev: "glassmorphism-ui" })

export default pages