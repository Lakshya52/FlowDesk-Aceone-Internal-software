# 🏢 FlowDesk Project Overview

FlowDesk is a sophisticated, full-stack internal management ecosystem designed exclusively for **Aceone Futuristic (OPC) Private Limited**. It centralizes complex business operations—from high-level project management to granular day-to-day tasks—into a single, high-performance platform.

## 🏗 Modular Architecture

The software is built on a modern **MERN-like** stack (using TypeScript for end-to-end type safety):
- **Frontend**: React + TypeScript with a custom CSS design system optimized for readability and performance.
- **Backend**: Node.js + Express + Mongoose, providing a robust RESTful API.
- **Real-time**: Integrated Socket.io for immediate updates on chats and notifications.
- **Storage**: MongoDB with GridFS integration for handling secure document attachments.

---

## 🚀 Core Features

### 1. Project Management (Assignments)
The heart of FlowDesk. Projects are categorized into:
- **Ongoing Work**: Active projects currently being handled by teams.
- **Completed**: A permanent archive of finished projects for history and auditing.
- **Recurring Blueprints**: A powerful automation system. Blueprints act as templates that automatically spawn new project instances (Daily, Weekly, Monthly, or Yearly) with pre-filled tasks and teams.

### 2. Task Ecosystem
Tasks are granular units of work within projects:
- **State Management**: Tasks progress from `Todo` to `In Progress`, `Review`, and finally `Completed`.
- **Checkpointing**: Every task supports subtask checklists for tracking multi-step processes.
- **Team Ownership**: Tasks can be assigned to specific individuals or entire teams.

### 3. AI Buddy Integration
A built-in AI assistant that assists team members with:
- Project analysis and deadline forecasting.
- Generating task descriptions.
- Providing technical guidance based on previous project history.

### 4. Collaborative Canvas
A digital whiteboard and note-taking space where teams can:
- Create post-it style notes for brainstorming.
- Organize visual workflows.
- Switch between **Personal** and **Collaborative** modes for private drafting vs. team sessions.

### 5. Communication & Notification
- **Real-time Chat**: Dedicated chat rooms for every project.
- **Activity Logs**: A comprehensive audit trail of every change made to a project or task.
- **Dynamic Notifications**: In-app alerts for assignments, mentions, and approaching deadlines.

---

## 🔒 Security & Permissions

FlowDesk implements a strict Role-Based Access Control (RBAC) system:
- **Admin**: Full system control, financial reports, and user management.
- **Manager**: Oversees specific teams, creates assignments, and approves completed work.
- **Member**: Focuses on task execution, updates, and collaboration within their assigned projects.

## 🛠 Advanced Features
- **Intelligent Spawning**: The recurring engine ensures no duplicates are created and "catches up" if the system was offline during a scheduled cycle.
- **"No Due Date" Handling**: Specialized logic to handle projects and tasks without finite deadlines, preventing the common "Unix Epoch (1970)" bug.
- **Glassmorphism UI**: A premium, semi-transparent design language that reduces eye strain and provides a modern look-and-feel.
