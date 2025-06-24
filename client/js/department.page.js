/**@import {User, UsersResponse, Department, DepartmentsResponse} from "./constants.js" */
import { API_URL, dbDateTransformer } from "./constants.js";
import { getDepartmentData, getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

/**
 * Current logged-in user data cache
 * @type {User|null}
 */
let currentUser = null;

// Reference to Bootstrap Modal object
let userModal = null;

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
        deptDescription.innerHTML = !department.description ? "<i>No department description.</i>" : department.description
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
                ${user.email ? `<div><b>Email</b> <span>${user.email}</span></div>` : ""}
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

    // Clear existing content
    staffRoles.innerHTML = "";

    if (members.length < 1) {
        staffRoles.innerHTML = `<div class="alert alert-info mt-3">No staff members yet in this department. </div>`;
        return;
    }

    // Group members by role
    const roles = members.reduce((acc, user) => {
        const role = user.role || "Unassigned";
        if (!acc[role]) {
            acc[role] = [];
        }
        acc[role].push(user);
        return acc;
    }, {});

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
    try {
        // Get current user for permission checks
        if (!currentUser) {
            currentUser = await getUserData("@me");
        }

        const data = await fetchDepartmentData();
        if (data && data.department && data.members) {
            renderDepartmentDetails(data.department);
            renderStaff(data.members.data);

            // Setup modal and form handlers
            setupNewUserModal();
            handleNewUserForm();
        } else {
            // Handle error case, maybe show an error message on the page
            const mainContent = document.getElementById("departmentPage");
            if (mainContent) {
                mainContent.innerHTML = `<div class="alert alert-danger">Could not load department data.</div>`;
            }
        }
    } catch (error) {
        console.error("Error loading page data:", error);
        const mainContent = document.getElementById("departmentPage");
        if (mainContent) {
            mainContent.innerHTML = `<div class="alert alert-danger">An error occurred while loading the page.</div>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", loadPageData);

/**
 * Gets an element by ID with type checking
 * @template {HTMLElement} T
 * @param {string} id - Element ID
 * @param {new() => T} [type] - Element type constructor
 * @returns {T|null}
 */
function getElement(id, type) {
    const element = document.getElementById(id);
    if (!element) return null;
    if (type && !(element instanceof type)) return null;
    return /** @type {T} */(element);
}

/**
 * Sets up the new user modal based on current user's permissions
 * @returns {Promise<void>}
 */
async function setupNewUserModal() {
    try {
        // Get current user if not already cached
        if (!currentUser) {
            currentUser = await getUserData("@me");
        }

        if (!currentUser) {
            console.error("Failed to get user data");
            return;
        }

        const addUserButton = getElement("addUserButton", HTMLButtonElement);
        const userDeptSelect = getElement("user-department", HTMLSelectElement);
        const departmentId = getDepartmentNumberFromUrl();

        if (!userDeptSelect || !addUserButton) {
            console.error("Required UI elements not found");
            return;
        }

        // Only show button for superadmin or admin
        const isAdmin = (currentUser.role === "superadmin") || (currentUser.role === "admin" && currentUser.department?.id === Number(departmentId));
        addUserButton.style.display = isAdmin ? "block" : "none";

        if (!isAdmin) return;

        // Populate department dropdown based on role
        try {
            if (currentUser.role === "superadmin") {
                // Fetch all departments for superadmin
                const res = await fetch(`${API_URL}/api/departments`, {
                    credentials: "include"
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch departments: ${res.status}`);
                }

                /** @type {DepartmentsResponse} */
                const data = await res.json();

                // Clear and repopulate dropdown
                userDeptSelect.innerHTML = `<option value="">Select Department</option>`;

                if (Array.isArray(data.data)) {
                    data.data.forEach(dept => {
                        const option = document.createElement("option");
                        option.value = dept.id.toString();
                        option.textContent = dept.name;
                        // Pre-select the current department
                        if (dept.id.toString() === departmentId) {
                            option.selected = true;
                        }
                        userDeptSelect.appendChild(option);
                    });
                }

                userDeptSelect.disabled = false;
            } else if (currentUser.role === "admin") {
                // For regular admin, only show the current department and disable selection
                const department = await getDepartmentData(parseInt(departmentId));

                userDeptSelect.innerHTML = "";
                const option = document.createElement("option");
                option.value = departmentId;
                option.textContent = department?.name || "Current Department";
                option.selected = true;
                userDeptSelect.appendChild(option);
                userDeptSelect.disabled = true;
            }
        } catch (error) {
            console.error("Error loading departments:", error);
            userDeptSelect.innerHTML = `<option value="">Error loading departments</option>`;
        }
    } catch (error) {
        console.error("Error setting up user modal:", error);
    }
}

/**
 * Shows form validation errors
 * @param {Array<HTMLElement|null>} fields - Form fields to mark as invalid
 * @param {string} [message] - Optional error message to display
 */
function showFormErrors(fields, message) {
    fields.forEach(field => {
        if (field) {
            field.classList.add("is-invalid");

            // Find corresponding feedback element if exists
            if (message && field.id) {
                const feedback = document.getElementById(`${field.id}-feedback`);
                if (feedback) {
                    feedback.className = "invalid-feedback d-block";
                    feedback.textContent = message;
                }
            }
        }
    });
}

/**
 * Clears form validation errors
 * @param {Array<HTMLElement|null>} fields - Form fields to clear
 */
function clearFormErrors(fields) {
    fields.forEach(field => {
        if (field) {
            field.classList.remove("is-invalid");

            // Clear feedback element if exists
            if (field.id) {
                const feedback = document.getElementById(`${field.id}-feedback`);
                if (feedback) {
                    feedback.className = "";
                    feedback.textContent = "";
                }
            }
        }
    });
}

/**
 * Updates submit button state during form submission
 * @param {HTMLButtonElement|null} button - The submit button
 * @param {boolean} isLoading - Whether the button should show loading state
 */
function updateSubmitButton(button, isLoading) {
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...`
        : `Create`;
}

/**
 * Sets up the new user form submission handler
 */
function handleNewUserForm() {
    const form = getElement("new-user-form", HTMLFormElement);
    if (!form) return;

    // Set up the modal reference
    const modalElement = document.getElementById('newUserModal');
    if (modalElement) {
        // @ts-ignore - Bootstrap is loaded globally
        userModal = new bootstrap.Modal(modalElement);
    }

    const nameField = getElement("user-name", HTMLInputElement);
    const roleField = getElement("user-role", HTMLSelectElement);
    const deptField = getElement("user-department", HTMLSelectElement);
    const emailField = getElement("user-email", HTMLInputElement);
    const passwordField = getElement("user-password", HTMLInputElement);
    const submitBtn = getElement("user-form-submit", HTMLButtonElement);

    // Check if all required form elements are present
    if (!nameField || !roleField || !deptField || !emailField || !passwordField || !submitBtn) {
        console.error("Form fields not found");
        return;
    }

    const formFields = [nameField, roleField, deptField, emailField, passwordField];

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Basic validation
        if (!form.checkValidity()) {
            event.stopPropagation();
            showFormErrors(formFields);
            return;
        }

        clearFormErrors(formFields);
        updateSubmitButton(submitBtn, true);

        try {
            const body = new URLSearchParams({
                name: nameField.value,
                role: roleField.value,
                departmentId: deptField.value,
                email: emailField.value,
                password: passwordField.value
            });

            const res = await fetch(`${API_URL}/api/users`, {
                method: "POST",
                body,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                credentials: "include"
            });

            const data = await res.json();

            if (!res.ok) {
                showFormErrors(formFields, data.message || "Error creating user");
                updateSubmitButton(submitBtn, false);
            } else {
                // Success
                clearFormErrors(formFields);
                form.reset();

                // Close the modal and refresh the page to show the new user
                if (userModal) {
                    userModal.hide();
                }

                // Reload staff data
                setTimeout(() => {
                    loadPageData();
                }, 500);

                updateSubmitButton(submitBtn, false);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            showFormErrors(formFields, "Network or server error occurred");
            updateSubmitButton(submitBtn, false);
        }
    });
}

