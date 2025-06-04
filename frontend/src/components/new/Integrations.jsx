import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github, LogOut, Settings, CheckCircle, XCircle, AlertTriangle, Loader2, Home, Eye, BarChart2, GitMerge, GitPullRequestClosed, GitPullRequestArrow, FileText, PlusCircle, ListFilter, ExternalLink, Sun, Moon
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000'; // Your backend API base URL

// Helper function to get a cookie by name
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const cookies = typeof document.cookie === 'string' ? document.cookie : '';
  const value = cookies.split('; ').find(row => row.startsWith(name + '='));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
};

// Helper function to delete a cookie
const deleteCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

// Mock project details to display when actual data is not available
const mockProjectDetailsData = {
  files_analyzed: 0,
  pull_requests_analyzed: 0,
  pull_requests_merged: 0,
  pull_requests_closed: 0,
  pull_requests_open: 0,
  // Add any other fields your projectDetails might have with default/mock values
};


const Integrations = ({ darkMode: initialDarkMode }) => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return initialDarkMode || false;
    const storedMode = localStorage.getItem('darkMode');
    return storedMode ? JSON.parse(storedMode) : (initialDarkMode || false);
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loadingStatus, setLoadingStatus] = useState(true); // For initial page load status
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
  const [addingBotStates, setAddingBotStates] = useState({});
  const [navigatingToDetails, setNavigatingToDetails] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const toggleDarkModeHandler = () => {
    setDarkMode(prevMode => !prevMode);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
  }, [darkMode]);

  const fetchUserProjects = useCallback(async (showLoading = true) => {
    const token = getCookie("access_token"); // This should be the GitHub PAT if that's what your backend expects
    if (!token) {
        setIsLoggedIn(false);
        setProjects([]);
        setLoadingStatus(false); 
        // No token, so we shouldn't try to navigate to /login here if already on integrations page
        // If this page is protected, a higher-level router guard should handle redirection.
        return;
    }

    if (showLoading) setLoadingProjects(true);
    setErrorMessage('');

    try {
        // The /users/projects endpoint in users.py expects the GitHub access token
        // to be passed via an HttpOnly cookie named "access_token".
        // The 'credentials: include' ensures this cookie is sent.
        const response = await fetch(`${API_BASE_URL}/users/projects`, {
            method: 'POST', // As per users.py
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}), // Empty body as per users.py
            credentials: 'include' // Crucial for sending HttpOnly cookies
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            setIsLoggedIn(true); // Successfully fetched projects, so user is "logged in" in the context of this page
            setProjects(data.projects || []);
        } else {
            if (response.status === 401) { // Unauthorized - token might be invalid or expired
                deleteCookie('access_token'); // Clear the potentially invalid token
                setIsLoggedIn(false);
                setProjects([]);
                setErrorMessage(data?.message || 'Authentication failed. Your session may have expired. Please login again via GitHub.');
                // Consider navigating to a page that allows re-initiating GitHub login,
                // or rely on the "Login with GitHub" button if it becomes visible.
                // navigate('/login'); // This depends on your app's login flow for GitHub
            } else {
                setErrorMessage(data?.message || `Failed to fetch projects (Status: ${response.status})`);
            }
        }
    } catch (error) {
        setErrorMessage(`Error fetching projects: ${error.message}. Ensure backend is running and reachable.`);
        setIsLoggedIn(false); 
        setProjects([]);
    } finally {
        if (showLoading) setLoadingProjects(false);
        setLoadingStatus(false); 
    }
  }, [navigate]); // navigate is a dependency of fetchUserProjects

  useEffect(() => {
    setLoadingStatus(true); 
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const code = urlParams.get('code'); // From GitHub OAuth redirect

    // This 'code' is the authorization code from GitHub, which your backend /github endpoint
    // exchanges for an access token and then sets as an HttpOnly cookie.
    if (code) {
        // If a code is present, it implies the user is returning from GitHub OAuth.
        // The backend should handle the code exchange and set the access_token cookie.
        // We then clear the code from the URL and fetch projects,
        // which should now succeed if the cookie was set.
        if (typeof window !== 'undefined') {
            // Clear the 'code' from URL to prevent re-processing on refresh
            navigate(window.location.pathname, { replace: true });
        }
        // After clearing the code, fetchUserProjects will use the cookie (if set by backend).
        fetchUserProjects();
    } else {
        // No code in URL, attempt to fetch projects normally (might use existing cookie)
        fetchUserProjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUserProjects]); // fetchUserProjects is memoized

  const handleGitLogin = () => {
    // This function redirects the user to the backend endpoint that initiates the GitHub OAuth flow.
    // The backend will then redirect the user to GitHub.
    setStatusMessage('');
    setErrorMessage('');
    try {
        // The backend's /github endpoint handles the redirect to GitHub.
        window.location.href = `${API_BASE_URL}/github`;
    } catch (error) {
        setErrorMessage(`Error initiating GitHub login: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    // For GitHub integration, "logout" primarily means deleting the access_token cookie.
    setStatusMessage('');
    setErrorMessage('');
    deleteCookie('access_token'); // This is the GitHub PAT stored in the cookie
    if (typeof window !== 'undefined') {
        localStorage.removeItem('user'); // If you store any other user info
    }
    setIsLoggedIn(false);
    setProjects([]);
    setSelectedProjectForDetails(null);
    setProjectDetails(null);
    setView('dashboard');
    // After logout, the user might be shown the "Login with GitHub" button again,
    // or you might redirect them to a generic login page if your app has multiple auth methods.
    // navigate('/login'); // Optional: redirect to a general login page
  };

  const handleAddBotToProject = async (projectToAddBot) => {
    if (!projectToAddBot || !projectToAddBot.id || !projectToAddBot.name_with_namespace) {
      setErrorMessage("Invalid project data provided.");
      return;
    }
    const projectId = projectToAddBot.id;
    const projectName = projectToAddBot.name_with_namespace;

    setAddingBotStates(prev => ({ ...prev, [projectId]: true }));
    setStatusMessage('');
    setErrorMessage('');
    setNavigatingToDetails(projectId); // Show loader on the card while bot is being added and details are fetched

    try {
      const response = await fetch(`${API_BASE_URL}/users/bot/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectName }), // Backend expects 'project_id' as name_with_namespace
        credentials: 'include' // Send cookies (like the access_token for GitHub PAT)
      });
      const data = await response.json();

      if ((response.status === 200 || response.status === 201 || response.status === 207) && data.status === 'success') {
        setStatusMessage(data.message || `Assistant tasks initiated for ${projectName}!`);
        
        // Refresh projects list in the background to get updated statuses
        await fetchUserProjects(false); 

        // After bot is added, backend might return updated project status.
        // We need to find the project (either from current list or assume it might be updated by fetchUserProjects)
        // and then fetch its full details to navigate to the details view.
        setTimeout(() => {
            // Attempt to find the project in the potentially updated 'projects' state.
            // If backend returns 'data.updated_project_status', use it to enrich the project object.
            const potentiallyUpdatedProject = 
                projects.find(p => p.id === projectToAddBot.id) ||  // Find from current list
                { ...projectToAddBot, status: data.updated_project_status || projectToAddBot.status }; // Fallback or enrich

            fetchProjectDetails(potentiallyUpdatedProject); // Navigate to details view
        }, 300);

      } else {
        setErrorMessage(data.message || `Failed to add assistant to ${projectName}. Status: ${response.status}`);
        setNavigatingToDetails(null); // Clear card-specific loader if 'add bot' failed before detail navigation
      }
    } catch (error) {
      setErrorMessage(`Error adding assistant to ${projectName}: ${error.message}`);
      setNavigatingToDetails(null); // Clear card-specific loader on any error
    } finally {
      setAddingBotStates(prev => ({ ...prev, [projectId]: false }));
      // navigatingToDetails is cleared within fetchProjectDetails's finally block or on error during add.
    }
  };

  const fetchProjectDetails = async (project) => {
    if (!project || !project.name_with_namespace) {
        setErrorMessage("Cannot fetch details: Invalid project data.");
        setLoadingProjectDetails(false);
        setNavigatingToDetails(null);
        return;
    }
    setSelectedProjectForDetails(project);
    setView('projectDetails');
    setLoadingProjectDetails(true);
    setProjectDetails(null); // Clear previous details
    setErrorMessage('');

    try {
      const [owner, repo_name] = project.name_with_namespace.split('/');
      const response = await fetch(`${API_BASE_URL}/users/projects/${owner}/${repo_name}/details`, {
        credentials: 'include' // Send cookies (like the access_token for GitHub PAT)
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setProjectDetails(data.details);
      } else {
        setErrorMessage(data.message || `Failed to fetch details for ${project.name_with_namespace}.`);
        setProjectDetails(null); // Explicitly set to null on error
      }
    } catch (error) {
      setErrorMessage(`Error fetching details for ${project.name_with_namespace}: ${error.message}`);
      setProjectDetails(null); // Explicitly set to null on error
    } finally {
      setLoadingProjectDetails(false);
      // Clear the card-specific loader if it was for this project
      if (navigatingToDetails === project.id) {
        setNavigatingToDetails(null);
      }
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedProjectForDetails(null);
    setProjectDetails(null);
    fetchUserProjects(false); // Refresh dashboard data silently
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    if (filter === 'bot_added') return project.status?.bot_status === 'added';
    if (filter === 'bot_not_added') return project.status?.bot_status !== 'added';
    return true;
  });

  const getStatusIcon = (status, type) => {
    const commonClasses = "mr-1.5 h-4 w-4";
    const currentStatus = status || (type === 'bot' ? 'not_added' : 'not_configured');
    if (type === 'bot') {
      if (currentStatus === 'added') return <CheckCircle className={`${commonClasses} text-green-500`} />;
      if (currentStatus === 'config_missing_bot_username') return <AlertTriangle className={`${commonClasses} text-orange-500`} />;
      return <AlertTriangle className={`${commonClasses} text-yellow-500`} />;
    }
    if (type === 'webhook') {
      if (currentStatus === 'active') return <CheckCircle className={`${commonClasses} text-green-500`} />;
      if (currentStatus === 'inactive') return <XCircle className={`${commonClasses} text-red-500`} />;
      if (currentStatus === 'config_missing_webhook_url' || currentStatus === 'config_missing_on_add') return <AlertTriangle className={`${commonClasses} text-orange-500`} />;
      return <AlertTriangle className={`${commonClasses} text-yellow-500`} />;
    }
    return null;
  };

  const getStatusText = (status, type) => {
    const currentStatus = status || (type === 'bot' ? 'not_added' : 'not_configured');
    const formattedStatus = currentStatus.replace(/_/g, ' '); // Replace underscores with spaces for display
    if (type === 'bot') {
      switch (currentStatus) {
        case 'added': return 'Bot Active';
        case 'not_added': return 'Bot Not Active';
        case 'config_missing_bot_username': return 'Bot Username Not Configured (Server)';
        case 'unknown_repo_fetch_error': return 'Error Fetching Repository Info';
        case 'unknown_collab_check_error': return 'Error Checking Bot Status';
        default: return `Bot Status: ${formattedStatus}`;
      }
    }
    if (type === 'webhook') {
      switch (currentStatus) {
        case 'active': return 'Webhook Active';
        case 'inactive': return 'Webhook Inactive';
        case 'not_configured': return 'Webhook Not Configured';
        case 'config_missing_webhook_url': return 'Webhook URL Not Configured (Server)';
        case 'unknown_repo_fetch_error': return 'Error Fetching Repository Info';
        case 'unknown_hook_fetch_error': return 'Error Checking Webhook Status';
        case 'setup_failed_on_add': return 'Webhook Setup Failed';
        default: return `Webhook Status: ${formattedStatus}`;
      }
    }
    return 'Unknown Status';
  };

  // Global loading screen for initial page setup
  if (loadingStatus) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-gray-800'}`}>
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
        <p className="mt-4 text-lg">Loading Your Integrations...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-100 text-gray-800'}`}>
      <header className={`p-4 shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto flex justify-between items-center">
          <button
            onClick={() => {
              if (view === 'projectDetails') handleBackToDashboard();
              else navigate('/chat'); // Assuming '/chat' is the main app page
            }}
            title={view === 'projectDetails' ? "Back to Dashboard" : "Go to Chat"}
            className={`flex items-center px-3 py-2 rounded-md transition duration-200 text-sm font-medium ${darkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-slate-200'}`}
          >
            <Home className="h-4 w-4 mr-2" />
            {view === 'projectDetails' ? "Dashboard" : "Chat"}
          </button>
          <h1 className="text-xl font-semibold">GitHub Integrations</h1>
          <div className="flex items-center gap-x-4">
            <button
              onClick={toggleDarkModeHandler}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-full transition duration-200 ${darkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {/* Show Logout button only if isLoggedIn is true (determined by successful project fetch) */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className={`flex items-center px-3 py-2 rounded-md transition duration-200 text-sm font-medium ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {statusMessage && !errorMessage && ( // Show status only if no error
          <div className="mb-6 p-3 rounded-md bg-green-100 text-green-700 border border-green-200 flex items-center text-sm">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-md bg-red-100 text-red-700 border border-red-200 flex items-center text-sm">
            <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* If not logged in (no valid token or failed initial project fetch), show GitHub login prompt */}
        {!isLoggedIn ? (
          <div className={`p-8 rounded-lg shadow-xl text-center max-w-md mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold mb-4">Connect to GitHub</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enable automated code reviews and project insights by connecting your GitHub account.
            </p>
            <button
              onClick={handleGitLogin}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-md font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 focus:ring-offset-gray-900'
                  : 'bg-black hover:bg-gray-800 text-white focus:ring-gray-500 focus:ring-offset-white'
              }`}
            >
              <Github className="h-5 w-5 mr-2" />
              Login with GitHub
            </button>
            {/* Optionally, add a message here if there was an error during the GitHub auth flow itself */}
            {/* For example, if the backend /github or /github/callback endpoints report an error via URL params */}
          </div>
        ) : view === 'dashboard' ? (
          <div>
            <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            
              <h2 className="text-2xl font-semibold">Your GitHub Projects</h2>
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={`pl-3 pr-8 py-2 rounded-md border shadow-sm focus:outline-none text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="all">All Projects</option>
                  <option value="bot_added">Bot Active</option>
                  <option value="bot_not_added">Bot Not Active</option>
                </select>
                <ListFilter className={`absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
            </div>
            {loadingProjects ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                <p className="ml-3">{navigatingToDetails ? 'Preparing project details...' : 'Loading projects...'}</p>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                  <div key={project.id} className={`p-6 rounded-lg shadow-lg flex flex-col justify-between transition-all hover:shadow-xl ${darkMode ? 'bg-gray-800 hover:border-blue-500/50 border border-gray-700' : 'bg-white hover:border-blue-500/50 border border-gray-200'}`}>
                    <div>
                      <a
                        href={project.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-lg font-semibold mb-1 truncate hover:underline ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                        title={`Go to ${project.name_with_namespace} on GitHub`}
                      >
                        {project.name_with_namespace}
                        <ExternalLink className="inline-block h-4 w-4 ml-1.5 align-text-bottom" />
                      </a>
                      <p className={`text-xs mb-3 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} title={project.description}>
                        {project.description || "No description."}
                      </p>
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center" title={getStatusText(project.status?.bot_status, 'bot')}>
                          {getStatusIcon(project.status?.bot_status, 'bot')}
                          <span>{getStatusText(project.status?.bot_status, 'bot')}</span>
                        </div>
                        <div className="flex items-center" title={getStatusText(project.status?.webhook_status, 'webhook')}>
                          {getStatusIcon(project.status?.webhook_status, 'webhook')}
                          <span>{getStatusText(project.status?.webhook_status, 'webhook')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto space-y-2">
                      {project.status?.bot_status !== 'added' && (
                        <button
                          onClick={() => handleAddBotToProject(project)}
                          disabled={addingBotStates[project.id] || navigatingToDetails === project.id}
                          className={`w-full flex items-center justify-center text-sm py-2 px-3 rounded-md font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 ${
                            darkMode
                            ? 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-400 focus:ring-offset-gray-800 disabled:bg-blue-700'
                            : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500 focus:ring-offset-white disabled:bg-blue-300'
                          }`}
                        >
                          {addingBotStates[project.id] || navigatingToDetails === project.id ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                          {addingBotStates[project.id] ? 'Adding...' : (navigatingToDetails === project.id ? 'Loading...' : 'Add Assistant')}
                        </button>
                      )}
                      <button
                        onClick={() => fetchProjectDetails(project)}
                        disabled={!!navigatingToDetails && navigatingToDetails !== project.id} // Disable if another project is loading details
                        className={`w-full flex items-center justify-center text-sm py-2 px-3 rounded-md font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 ${
                          darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500 focus:ring-offset-gray-800 disabled:bg-gray-600'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-400 focus:ring-offset-white disabled:bg-gray-100'
                        }`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-center py-10 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                { projects.length === 0 && !loadingProjects ? "No projects found with Admin permissions, or failed to load." : "No projects match the current filter."}
              </p>
            )}
          </div>
        ) : view === 'projectDetails' && selectedProjectForDetails ? (
          <div className={`p-6 md:p-8 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-semibold">{selectedProjectForDetails.name_with_namespace}</h2>
              <a
                href={selectedProjectForDetails.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center text-sm py-2 px-3 rounded-md font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-blue-400 focus:ring-gray-500 focus:ring-offset-gray-800'
                  : 'bg-gray-200 hover:bg-gray-300 text-blue-600 focus:ring-gray-400 focus:ring-offset-white'
                }`}
                title={`Go to ${selectedProjectForDetails.name_with_namespace} on GitHub`}
              >
                <Github className="h-4 w-4 mr-2" />
                View Repository
              </a>
            </div>
            {loadingProjectDetails ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                <p className="ml-3">Loading project details...</p>
              </div>
            ) : (
              // MODIFIED: Conditional rendering for projectDetails or mockProjectDetailsData
              (projectDetails || (!loadingProjectDetails && !errorMessage)) ? ( // Show real or mock if no error and not loading
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[ 
                    { icon: FileText, label: "Files Analyzed", value: (projectDetails || mockProjectDetailsData).files_analyzed, color: "text-blue-500" },
                    { icon: GitPullRequestArrow, label: "PRs Analyzed", value: (projectDetails || mockProjectDetailsData).pull_requests_analyzed, color: "text-purple-500" },
                    { icon: GitMerge, label: "PRs Merged", value: (projectDetails || mockProjectDetailsData).pull_requests_merged, color: "text-green-500" },
                    { icon: GitPullRequestClosed, label: "PRs Closed (Not Merged)", value: (projectDetails || mockProjectDetailsData).pull_requests_closed, color: "text-red-500" },
                    { icon: Settings, label: "PRs Currently Open", value: (projectDetails || mockProjectDetailsData).pull_requests_open, color: "text-yellow-500" },
                  ].map(item => (
                    <div key={item.label} className={`p-4 rounded-md shadow ${darkMode ? 'bg-gray-700' : 'bg-slate-50'}`}>
                      <div className="flex items-center mb-2">
                        <item.icon className={`h-6 w-6 mr-3 ${item.color} ${darkMode ? item.color.replace('500', '400') : ''}`} />
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.label}</p>
                      </div>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value !== undefined && item.value !== null ? item.value : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : ( // This case will be hit if there was an error message during fetchProjectDetails
                <p className={`text-center py-10 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  {errorMessage ? errorMessage : "No details available for this project. Ensure the bot has been added and metrics are tracked."}
                </p>
              )
            )}
            {/* Informational message if mock data is being shown due to lack of real data (and no error) */}
            {!loadingProjectDetails && !projectDetails && !errorMessage && (
                 <p className={`text-center py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    (Displaying default metrics as specific data could not be retrieved for this project.)
                </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Integrations;
