const SIDEBAR_STATE_KEY = "sidebar-collapsed";

function setSidebarState(collapsed) {
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
}

function getSidebarState() {
    return localStorage.getItem(SIDEBAR_STATE_KEY);
}

function applySidebarState() {
    const sidebar = document.querySelector('.sidebar__wrapper');
    if (!sidebar) return;

    // Disable transitions for initial state application
    sidebar.classList.add("sidebar-no-transition");

    // If no state is stored, default to collapsed on mobile (<=620px), open otherwise
    let collapsed = false;
    const stored = getSidebarState();
    if (stored === null) {
        collapsed = window.innerWidth <= 620;
        setSidebarState(collapsed);
    } else {
        collapsed = stored === "1";
    }

    if (collapsed) {
        sidebar.classList.add("sidebar-collapsed");
    } else {
        sidebar.classList.remove("sidebar-collapsed");
    }

    // Allow browser to render, then remove the no-transition class
    setTimeout(() => {
        sidebar.classList.remove("sidebar-no-transition");
    }, 0);
}

const toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar__wrapper');
    if (!sidebar) return;
    const collapsed = !sidebar.classList.contains("sidebar-collapsed");
    sidebar.classList.toggle("sidebar-collapsed");
    setSidebarState(collapsed);
}

const openSidebar = () => {
    const sidebar = document.querySelector('.sidebar__wrapper');
    if (!sidebar) return;
    sidebar.classList.remove("sidebar-collapsed");
    setSidebarState(false);
}

const closeSidebar = () => {
    const sidebar = document.querySelector('.sidebar__wrapper');
    if (!sidebar) return;
    sidebar.classList.add("sidebar-collapsed");
    setSidebarState(true);
}

const closeSidebarIfMobile = () => {
    if (window.innerWidth <= 620) {
        closeSidebar();
    }
}

// Apply state on page load
document.addEventListener("DOMContentLoaded", applySidebarState);