/**@import {DepartmentsResponse, Department, UsersResponse, User, UserRoles} from "./constants.js" */
import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";
import { getUserData } from "./fetchHelpers.js";

/**
 * Current logged-in user data cache
 * @type {User|null}
 */
let currentUser = null;
let collapseIdCount = 1;

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
 * Display error message in the staff list container
 * @param {string} message - Error message to display
 */
function showError(message) {
    const staffList = getElement("staffList", HTMLDivElement);
    if (!staffList) return;

    // Clear existing content
    staffList.querySelectorAll(".thread-item").forEach(el => el.remove());

    // Create error message
    const errorEl = document.createElement("div");
    errorEl.className = "alert alert-danger mt-3";
    errorEl.textContent = message;
    staffList.appendChild(errorEl);
}

/**
 * Renders a staff member as a thread item
 * @param {User} user - User data to render
 * @returns {HTMLDivElement|null} The created thread item element or null if invalid data
 */
function createStaffThreadItem(user) {
    if (!user || !user.id) return null;
    const collapseId = `staff-collapse-${collapseIdCount++}`

    const threadItem = document.createElement("div");
    threadItem.className = "thread-item";
    threadItem.innerHTML = `
        <div class="thread-visible">
            <div>
                <div class="thread-top">
                    <h3 class="thread-top__text">
                        ${user.name || "Unknown"}
                    </h3>
                </div>
                <span>
                    <b>Role</b>: ${user.role ?? "Unknown"}
                </span>
            </div>
            <div class="profile__dropdown">
                  <button class="thread-btn btn collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#${collapseId}" aria-expanded="false"
                    aria-controls="${collapseId}">▼</button>
            </div>
        </div>
        <div class="thread-collapse collapse" id="${collapseId}">
                <hr>
                <div><b>Role</b> <span>${user.role ?? "Unknown"}</span></div>
                <div><b>Created At</b> <span>${user.createdAt ?? "Unknown"}</span></div>
                ${user.username ? `<div><b>Username</b> <span>${user.username}</span></div>` : ""}
        </div>
    `;
    return threadItem;
}

/**
 * Loads and displays staff members from the current user's department
 * @returns {Promise<void>}
 */
async function loadStaff() {
    try {
        // Get current user if not already cached
        if (!currentUser) {
            currentUser = await getUserData("@me");
        }

        if (!currentUser?.department?.id) {
            showError("Could not determine your department. Please check your profile.");
            return;
        }

        // Fetch users in the same department
        const res = await fetch(`${API_URL}/api/users?department=${currentUser.department.id}`, {
            credentials: "include"
        });

        if (statusRedirect(res, "href")) return;

        /** @type {UsersResponse} */
        const users = await res.json();

        // Select the staff list container
        const staffList = getElement("staffList", HTMLDivElement);
        if (!staffList) return;

        // Update department name in the heading
        const staffDept = getElement("staffDept", HTMLElement);
        if (staffDept) {
            staffDept.textContent = `${currentUser.department.name} Staff Members`;
        }

        // Remove any existing thread items
        staffList.querySelectorAll(".thread-item").forEach(el => el.remove());

        // Create and append a thread-item for each staff member
        if (Array.isArray(users.data) && users.data.length > 0) {
            users.data.forEach(user => {
                const threadItem = createStaffThreadItem(user);
                if (threadItem) staffList.appendChild(threadItem);
            });
        } else {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "text-muted mt-3";
            emptyMessage.textContent = "No staff members found in this department.";
            staffList.appendChild(emptyMessage);
        }
    } catch (error) {
        console.error("Error loading staff:", error);
        showError("Failed to load staff data. Please try refreshing the page.");
    }
};

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

        if (!userDeptSelect || !addUserButton) {
            console.error("Required UI elements not found");
            return;
        }

        // Only show button for superadmin or admin
        const isAdmin = currentUser.role === "superadmin" || currentUser.role === "admin";
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
                        if (dept && dept.id && dept.name) {
                            const option = document.createElement("option");
                            option.value = String(dept.id);
                            option.textContent = dept.name;
                            userDeptSelect.appendChild(option);
                        }
                    });
                }

                userDeptSelect.disabled = false;
            } else if (currentUser.role === "admin" && currentUser.department) {
                // Only their department for admin, and disabled
                userDeptSelect.innerHTML = "";
                const option = document.createElement("option");
                option.value = String(currentUser.department.id || "");
                option.textContent = currentUser.department.name || "Unknown Department";
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
                    feedback.textContent = message;
                    feedback.classList.add("invalid-feedback", "d-block");
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
                    feedback.textContent = "";
                    feedback.classList.remove("d-block");
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

    const nameField = getElement("user-name", HTMLInputElement);
    const roleField = getElement("user-role", HTMLSelectElement);
    const deptField = getElement("user-department", HTMLSelectElement);
    const passwordField = getElement("user-password", HTMLInputElement);
    const submitBtn = getElement("user-form-submit", HTMLButtonElement);

    // Check if all required form elements are present
    if (!nameField || !roleField || !deptField || !passwordField || !submitBtn) {
        console.error("Form fields not found");
        return;
    }

    const formFields = [nameField, roleField, deptField, passwordField];

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
            } else {
                clearFormErrors(formFields);
                form.reset();
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            showFormErrors(formFields, "Network or server error occurred");
        } finally {
            updateSubmitButton(submitBtn, false);
        }
    });
}

/**
 * Initialize the page when DOM content is loaded
 */
function initPage() {
    // Fetch user data once and cache it for use across functions
    getUserData("@me").then(user => {
        currentUser = user;
        // Now initialize all page components
        loadStaff();
        setupNewUserModal();
        handleNewUserForm();
    }).catch(error => {
        console.error("Failed to initialize page:", error);
        showError("Failed to load user data. Please try refreshing the page.");
    });
}

// Initialize the page when DOM is ready
document.addEventListener("DOMContentLoaded", initPage);