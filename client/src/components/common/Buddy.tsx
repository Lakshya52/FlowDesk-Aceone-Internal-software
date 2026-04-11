import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot } from "lucide-react";

const PAGE_KNOWLEDGE: Record<string, { title: string; description: string; features: string[]; tips?: string[] }> = {
  "/": { title: "Landing Page", description: "Welcome to FlowDesk - Your complete project management solution.", features: ["Hero section", "Feature highlights", "Quick navigation", "Call-to-action buttons"] },
  "/login": { title: "Login Page", description: "Secure authentication portal for FlowDesk.", features: ["Email/password login", "Remember me", "Forgot Password flow", "OTP verification"], tips: ["Use Remember Me to stay logged in", "Check spam for OTP emails"] },
  "/dashboard": { title: "Dashboard", description: "Central hub showing real-time overview of projects, tasks, and team activity.", features: ["Task status pie chart", "Weekly activity line chart", "Recent assignments", "Team overview", "Quick stats cards", "Real-time activity feed"], tips: ["Check daily for project health", "Red = overdue items"] },
  "/assignments": { title: "Assignments (Projects)", description: "Manage all your projects in one place.", features: ["Create Assignment button (top right)", "Assignment list with filters", "Search and sort", "Progress tracking", "Team collaboration"], tips: ["Set realistic deadlines", "Add all team members from start"] },
  "/tasks": { title: "Tasks", description: "Create and manage individual tasks across all projects.", features: ["Create Task button (top right)", "Filter by status/priority/assignee", "Drag-and-drop status updates", "Bulk actions", "Subtasks and comments"], tips: ["Break large tasks into subtasks", "Use tags for categorization"] },
  "/calendar": { title: "Calendar", description: "Visual calendar showing deadlines, holidays, and important dates.", features: ["Monthly view", "Color-coded events", "Click for task details", "Export options"], tips: ["Check every morning", "Export to personal calendar"] },
  "/files": { title: "Files", description: "Central repository for all project files and documents.", features: ["Upload button and drag-drop", "Folder organization", "Search and filter", "File preview", "Version history", "Sharing"], tips: ["Max 10MB per file", "Use descriptive names"] },
  "/teams": { title: "Teams", description: "Manage teams, invite members, assign roles.", features: ["View all teams", "Create team", "Invite Member", "Role management (Admin/Member/Viewer)", "Team activity feed"], tips: ["Admins have full control", "Review pending invites regularly"] },
  "/reports": { title: "Reports", description: "Generate comprehensive reports on projects, tasks, and performance.", features: ["Employee/Project/Task reports", "Date range filters", "Export to PDF/Excel", "Scheduled reports"], tips: ["Schedule weekly reports", "Export to Excel for analysis"] },
  "/settings": { title: "Settings", description: "Customize your FlowDesk experience.", features: ["Profile settings", "Change password", "Notification preferences", "Theme toggle (Light/Dark)", "Two-factor auth"], tips: ["Enable 2FA for security", "Dark mode reduces eye strain"] },
};

const COMMON_QUESTIONS: { keywords: string[]; answer: string }[] = [
  { keywords: ["create task", "new task", "add task", "make task"], answer: "To create a task:\n\n1. Go to Tasks page (/tasks)\n2. Click Create Task (top right)\n3. Fill in: Title, Description, Assignee, Due date, Priority\n4. Click Save\n\nPro tip: Use Ctrl+N shortcut!" },
  { keywords: ["create assignment", "new assignment", "create project", "new project"], answer: "To create an assignment (project):\n\n1. Go to Assignments page (/assignments)\n2. Click Create Assignment (top right)\n3. Enter: Name, Description, Team members, Deadline, Priority\n4. Click Create\n\nYou can then add tasks and files!" },
  { keywords: ["invite team", "invite member", "add member", "add teammate"], answer: "To invite team members:\n\n1. Go to Teams page (/teams)\n2. Click Invite Member\n3. Enter email address(es)\n4. Select role (Admin/Member/Viewer)\n5. Click Send Invite\n\nThey will receive an email invitation!" },
  { keywords: ["upload file", "add file", "attach file"], answer: "To upload files:\n\n1. Go to Files page (/files)\n2. Click Upload OR drag files directly\n3. Select destination folder\n4. Choose files (max 10MB each)\n5. Click Upload\n\nOrganize in folders and share with team!" },
  { keywords: ["generate report", "view report", "export report", "analytics"], answer: "To generate reports:\n\n1. Go to Reports page (/reports)\n2. Select report type (Employee/Project/Task)\n3. Apply filters (date range, team, project)\n4. Click Generate\n5. Export as PDF or Excel\n\nSchedule auto-reports for regular updates!" },
  { keywords: ["change password", "reset password", "forgot password"], answer: "To change password:\n\nIf logged in:\n1. Go to Settings > Security > Change Password\n2. Enter current and new password\n3. Click Update\n\nIf locked out:\n1. Login page > Forgot Password\n2. Enter email and get OTP\n3. Verify OTP and set new password" },
  { keywords: ["dark mode", "light mode", "theme", "appearance"], answer: "To change theme:\n\n1. Go to Settings (/settings)\n2. Find Appearance/Theme section\n3. Choose: Light, Dark, or Auto\n4. Changes apply instantly\n\nDark mode is great for night work!" },
  { keywords: ["delete task", "remove task", "archive task"], answer: "To delete a task:\n\n1. Go to Tasks page\n2. Click the task\n3. Click Delete/Remove (menu)\n4. Confirm deletion\n\nDeleted tasks may be recoverable from trash." },
  { keywords: ["edit task", "update task", "modify task"], answer: "To edit a task:\n\n1. Go to Tasks page\n2. Click the task\n3. Click Edit (pencil icon)\n4. Modify any field\n5. Click Save\n\nAll changes are tracked in activity history!" },
  { keywords: ["navigate", "how to use", "where is", "help", "guide"], answer: "FlowDesk Navigation Guide:\n\nMain Pages:\n- /dashboard - Overview and stats\n- /assignments - Projects\n- /tasks - Individual tasks\n- /calendar - Deadlines\n- /files - Documents\n- /teams - Team management\n- /reports - Analytics\n- /settings - Configuration\n\nTips:\n- Use sidebar for navigation\n- Search bar finds anything\n- Create buttons are top-right\n\nWhat would you like to do?" },
  { keywords: ["keyboard shortcut", "hotkey", "ctrl"], answer: "Keyboard Shortcuts:\n\nGlobal:\n- Ctrl+K: Quick search\n- Ctrl+N: Create new (context-aware)\n- Esc: Close modals\n- Enter: Save/confirm\n\nUse these for faster workflow!" },
  { keywords: ["notification", "email notification", "alert"], answer: "To manage notifications:\n\n1. Go to Settings\n2. Click Notifications\n3. Configure:\n   - Email on/off\n   - In-app notifications\n   - Frequency (Instant/Daily/Weekly)\n   - Types (tasks, mentions, etc.)\n4. Click Save" },
];

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const calculateMatch = (message: string, keywords: string[]): number => {
  const lowerMsg = message.toLowerCase();
  let maxScore = 0;
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerMsg === lowerKeyword) return 100;
    if (lowerMsg.includes(lowerKeyword)) maxScore = Math.max(maxScore, 50 + lowerKeyword.length * 2);
    const msgWords = lowerMsg.split(/\s+/);
    const keywordWords = lowerKeyword.split(/\s+/);
    for (const kwWord of keywordWords) {
      for (const msgWord of msgWords) {
        if ((msgWord.includes(kwWord) || kwWord.includes(msgWord)) && kwWord.length >= 3) {
          maxScore = Math.max(maxScore, 20 + Math.min(kwWord.length, msgWord.length) * 3);
        }
        if (kwWord.length >= 4 && msgWord.length >= 4) {
          const dist = levenshteinDistance(kwWord, msgWord);
          if (dist <= 2) maxScore = Math.max(maxScore, 30 - dist * 10);
        }
      }
    }
  }
  return maxScore;
};

const getRuleBasedResponse = (message: string, path: string): string | null => {
  const lowerMsg = message.toLowerCase();

  for (const [pagePath, pageInfo] of Object.entries(PAGE_KNOWLEDGE)) {
    const pageName = pageInfo.title.toLowerCase().split(" ")[0];
    const variants = [pageName, pageInfo.title.toLowerCase(), ...pageInfo.features.map(f => f.toLowerCase().split(" ")[0])];
    const isPageQuestion = lowerMsg.includes("what") && (lowerMsg.includes("page") || lowerMsg.includes("feature")) ||
      lowerMsg.includes("tell me about") || lowerMsg.includes("explain");
    const matchScore = calculateMatch(lowerMsg, variants);
    if ((isPageQuestion && matchScore > 20) || matchScore > 40) {
      let resp = pageInfo.title + "\n\n" + pageInfo.description + "\n\nKey Features:\n" + pageInfo.features.map(f => "- " + f).join("\n");
      if (pageInfo.tips) resp += "\n\nPro Tips:\n" + pageInfo.tips.map(t => "- " + t).join("\n");
      return resp;
    }
    if ((lowerMsg.includes("this page") || lowerMsg.includes("current page") || lowerMsg.includes("here")) && path === pagePath) {
      let resp = pageInfo.title + "\n\n" + pageInfo.description + "\n\nKey Features:\n" + pageInfo.features.map(f => "- " + f).join("\n");
      if (pageInfo.tips) resp += "\n\nPro Tips:\n" + pageInfo.tips.map(t => "- " + t).join("\n");
      return resp;
    }
  }

  let bestMatch: { question: typeof COMMON_QUESTIONS[0]; score: number } | null = null;
  for (const qa of COMMON_QUESTIONS) {
    const score = calculateMatch(lowerMsg, qa.keywords);
    if (score > 30 && (!bestMatch || score > bestMatch.score)) bestMatch = { question: qa, score };
  }
  if (bestMatch) return bestMatch.question.answer;

  const actions: Record<string, string> = { create: "Create", make: "Create", add: "Create", delete: "Delete", remove: "Delete", edit: "Edit", update: "Edit", find: "Find", view: "View" };
  const targets: Record<string, string> = { task: "tasks", tasks: "tasks", assignment: "assignments", project: "assignments", file: "files", files: "files", team: "teams", member: "teams", report: "reports", setting: "settings" };

  let detectedAction: string | null = null, detectedTarget: string | null = null;
  for (const [kw, act] of Object.entries(actions)) if (lowerMsg.includes(kw)) { detectedAction = act; break; }
  for (const [kw, tgt] of Object.entries(targets)) if (lowerMsg.includes(kw)) { detectedTarget = tgt; break; }

  if (detectedAction && detectedTarget) {
    const pages: Record<string, string> = { tasks: "/tasks", assignments: "/assignments", files: "/files", teams: "/teams", reports: "/reports", settings: "/settings" };
    return "To " + detectedAction.toLowerCase() + " a " + detectedTarget + ":\n\n1. Go to the " + detectedTarget + " page (" + pages[detectedTarget] + ")\n2. Look for the " + detectedAction + " button (usually top right for creating)\n3. Follow the prompts\n4. Save changes\n\nNeed more specific help? Ask away!";
  }

  return null;
};

const Buddy: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const ruleResponse = getRuleBasedResponse(userMessage, location.pathname);
    if (ruleResponse) {
      setMessages([...newMessages, { role: "assistant", content: ruleResponse }]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, path: location.pathname, history: newMessages.slice(-10) }),
      });
      let reply = "Great question! Here is what I recommend:\n\nNavigate to the relevant page:\n- Tasks: /tasks\n- Projects: /assignments\n- Files: /files\n- Teams: /teams\n- Reports: /reports\n- Settings: /settings\n\nEach page has intuitive controls. Look for action buttons (usually top right).\n\nWhat specifically are you trying to do? I will guide you step-by-step!";
      if (res.ok) {
        const data = await res.json();
        if (data.reply && data.reply.length > 10) reply = data.reply;
      }
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "I am here to help! Based on your question, navigate to the relevant page and look for action buttons. Each page has a Create button for adding new items. What specifically are you trying to accomplish?" }]);
    }
    setIsLoading(false);
  };

  const quickQuestions = ["What does this page do?", "How do I create a task?", "How to invite team members?", "Where can I upload files?"];

  return (
    <>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full cursor-pointer shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center"
        title="Open FlowDesk Buddy"
      >
        <MessageCircle className="w-6 h-6" />
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50 border border-gray-200">

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex justify-between items-center" style={{ padding: "20px" }}>
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">FlowDesk Buddy</h3>
                <p className="text-xs text-blue-100">Your friendly guide</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 h-96 flex flex-col overflow-y-auto space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 text-center text-gray-500 py-12" style={{ padding: "20px", margin: "10px" }}>
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-lg font-semibold text-gray-700">Hi! I am your FlowDesk Buddy</p>
                <p className="text-sm text-gray-500 mt-2">Ask me anything about the app!</p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setInput("What does this page do?")}
                    className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    style={{ padding: "10px" }}
                  >
                    What does this page do?
                  </button>
                  <button
                    onClick={() => setInput("How do I create a task?")}
                    className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    style={{ padding: "10px" }}
                  >
                    How to create a task?
                  </button>
                  <button
                    onClick={() => setInput("Help me navigate")}
                    className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                    style={{ padding: "10px" }}
                  >
                    Help me navigate
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ margin: "10px" }}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md shadow-md"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                    }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ padding: "10px" }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start" style={{ margin: "10px", padding: "10px" }}>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm" style={{ padding: "10px" }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-3" style={{ margin: "10px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about features..."
                className="flex-1 border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors"
                disabled={isLoading}
                style={{ padding: "10px", color: "#000000" }}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center"
                style={{ padding: "10px" }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Buddy;
