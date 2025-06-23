/**@import {User, UsersResponse, Department} from "./constants.js" */
import { API_URL, dbDateTransformer } from "./constants.js";
import { getDepartmentData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

/**
 * Gets the department number from the URL
 * @returns {string} The department number
 */
function getDepartmentNumberFromUrl() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[urlParts.length - 1];
}

async function fetchDepartmentData() {
    try {
        const departmentNumber = getDepartmentNumberFromUrl();

        const departmentData = await getDepartmentData(parseInt(departmentNumber));

        const usersRes = await fetch(`${API_URL}/api/users?department=${departmentNumber}`);
        if (statusRedirect(usersRes, "href")) return null;

        if (!usersRes.ok) {
            // show something that fetching this errored out
            return null
        }

        /**@type {UsersResponse} */
        const departmentUsers = await usersRes.json();

        return {
            department: departmentData,
            members: departmentUsers
        }

    } catch (error) {
        console.error("Error fetching derpartment data: ", error)
        return null;
    }
}

/**
 * @type {number}
 */
let collapseIdCount = 1;

/**
 * Renders department details on the page
 * @param {Department} department - Department data
 */
function renderDepartmentDetails(department) {
    const deptTitle = document.getElementById("deptTitle");
    const deptDescription = document.getElementById("deptDesc");

    if (deptTitle) {
        deptTitle.textContent = department.name;
    }
    if (deptDescription) {
        deptDescription.textContent = department.description || "";
    }
}

/**
 * Renders a staff member as a thread item
 * @param {User} user - User data to render
 * @returns {HTMLDivElement|null} The created thread item element or null if invalid data
 */
function createStaffThreadItem(user) {
    if (!user || !user.id) return null;
    const collapseId = `staff-collapse-${collapseIdCount++}`;

    const threadItem = document.createElement("div");
    threadItem.className = "thread-item";
    threadItem.innerHTML = `
        <div class="thread-visible">
        <div>
            <div class="thread-top">
                <h3 class="thread-top__text">${user.name}</h3>
            </div>
            <span>
                <b>Role</b>: ${user.role ?? "Unknown"}
            </span>
        </div>
            <button class="thread-btn btn" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">▼</button>
        </div>
        <div class="collapse" id="${collapseId}">
            <div class="thread-collapse">
            <hr>
                <div><b>Role</b> <span>${user.role ?? "Unknown"}</span></div>
                <div><b>Created At</b> <span>${user.createdAt ? dbDateTransformer(user.createdAt).toLocaleString() : "Unknown"}</span></div>
                ${user.username ? `<div><b>Username</b> <span>${user.username}</span></div>` : ""}
            </div>
        </div>
    `;
    return threadItem;
}

/**
 * Renders staff members grouped by role into an accordion
 * @param {User[]} members - Array of user data
 */
function renderStaff(members) {
    const staffRoles = document.getElementById("staffRoles");
    if (!staffRoles) return;

    // Group members by role
    const roles = members.reduce((acc, user) => {
        const role = user.role || "Unassigned";
        if (!acc[role]) {
            acc[role] = [];
        }
        acc[role].push(user);
        return acc;
    }, {});

    // Clear existing content
    staffRoles.innerHTML = "";

    // Define the order of roles
    const roleOrder = ["superadmin", "admin", "officer", "clerk", "Unassigned"];

    // Create accordion for each role in the specified order
    roleOrder.forEach(role => {
        // Skip if no users with this role
        if (!roles[role] || roles[role].length === 0) return;

        const roleId = role.replace(/\s+/g, '-').toLowerCase();
        const collapseId = `role-collapse-${roleId}`;
        const headerId = `role-header-${roleId}`;

        const accordionItem = document.createElement("div");
        accordionItem.className = "accordion-item";

        const accordionHeader = document.createElement("h2");
        accordionHeader.className = "accordion-header";
        accordionHeader.id = headerId;

        const accordionButton = document.createElement("button");
        accordionButton.className = "accordion-button collapsed";
        accordionButton.type = "button";
        accordionButton.dataset.bsToggle = "collapse";
        accordionButton.dataset.bsTarget = `#${collapseId}`;
        accordionButton.ariaExpanded = "false";
        accordionButton.setAttribute("aria-controls", collapseId)
        accordionButton.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} (${roles[role].length})`;

        const accordionCollapse = document.createElement("div");
        accordionCollapse.id = collapseId;
        accordionCollapse.className = "accordion-collapse collapse";
        accordionCollapse.setAttribute("aria-labelledby", headerId);
        accordionCollapse.dataset.bsParent = "#staffRoles";

        const accordionBody = document.createElement("div");
        accordionBody.className = "accordion-body d-flex flex-column gap-2";

        roles[role].forEach(user => {
            const staffItem = createStaffThreadItem(user);
            if (staffItem) {
                accordionBody.appendChild(staffItem);
            }
        });

        accordionHeader.appendChild(accordionButton);
        accordionCollapse.appendChild(accordionBody);
        accordionItem.appendChild(accordionHeader);
        accordionItem.appendChild(accordionCollapse);
        staffRoles.appendChild(accordionItem);
    });
}


/**
 * Main function to load and render page data
 */
async function loadPageData() {
    const data = await fetchDepartmentData();
    if (data && data.department && data.members) {
        renderDepartmentDetails(data.department);
        renderStaff(data.members.data);
    } else {
        // Handle error case, maybe show an error message on the page
        const mainContent = document.getElementById("departmentPage");
        if (mainContent) {
            mainContent.innerHTML = `<div class="alert alert-danger">Could not load department data.</div>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", loadPageData);

