// @ts-nocheck
import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";
import { getUserData } from "./fetchHelpers.js";

const loadStaff = async () => {
    try {
        // Get current user
        const me = await getUserData("@me");
        if (!me?.department?.id) return;

        // Fetch users in the same department
        const res = await fetch(`${API_URL}/api/users?department=${me.department.id}`, {
            credentials: "include"
        });
        if (statusRedirect(res, "href")) return;

        /**
         * @typedef {object} StaffUser
         * @property {number} id
         * @property {string} name
         * @property {object} department
         * @property {string} role
         */
        /**
         * @type {{message: string, count: number, data: StaffUser[]}}
         */
        const users = await res.json();

        // Select the staff list container
        const staffList = document.getElementById("staffList");
        if (!staffList) return;

        // Update department name in the heading
        const staffDept = document.getElementById("staffDept");
        if (staffDept) {
            staffDept.textContent = `${me.department.name} Staff Members`;
        }

        // Remove any existing thread items
        staffList.querySelectorAll(".thread-item").forEach(el => el.remove());

        // Create and append a thread-item for each staff member
        users.data.forEach(user => {
            const threadItem = document.createElement("div");
            threadItem.className = "thread-item";
            threadItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h3 class="thread-top__text">
                                ${user.name}
                            </h3>
                        </div>
                        <span>
                            ID: ${user.id} | Role: ${user.role}
                        </span>
                    </div>
                </div>
            `;
            staffList.appendChild(threadItem);
        });

    } catch (e) {
        console.error(e);
    }
};

const setupNewUserModal = async () => {
    const me = await getUserData("@me");
    const addUserButton = document.getElementById("addUserButton");
    const userDeptSelect = document.getElementById("user-department");
    if (!userDeptSelect) return;
    if (!addUserButton) return;

    // Only show button for superadmin or admin
    if (me.role === "superadmin" || me.role === "admin") {
        addUserButton.style.display = "block";
    } else {
        addUserButton.style.display = "none";
        return;
    }

    // Populate department dropdown
    if (me.role === "superadmin") {
        // Fetch all departments
        const res = await fetch(`${API_URL}/api/departments`, { credentials: "include" });
        const data = await res.json();
        userDeptSelect.innerHTML = `<option value="">Select Department</option>`;
        data.data.forEach(dept => {
            userDeptSelect.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
        });
        userDeptSelect.disabled = false;
    } else if (me.role === "admin") {
        // Only their department, and disabled
        userDeptSelect.innerHTML = `<option value="${me.department.id}">${me.department.name}</option>`;
        userDeptSelect.disabled = true;
    }
};

const handleNewUserForm = () => {
    const form = document.getElementById("new-user-form");
    if (!(form instanceof HTMLFormElement)) return;

    const nameField = document.getElementById("user-name");
    const roleField = document.getElementById("user-role");
    const deptField = document.getElementById("user-department");
    const passwordField = document.getElementById("user-password");
    const submitBtn = document.getElementById("user-form-submit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Basic validation
        if (!form.checkValidity()) {
            event.stopPropagation();
            [nameField, roleField, deptField, passwordField].forEach(f => f.classList.add("is-invalid"));
            return;
        }

        [nameField, roleField, deptField, passwordField].forEach(f => f.classList.remove("is-invalid"));

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...`;

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
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Create`;
            // Show error feedback (simple)
            [nameField, roleField, deptField, passwordField].forEach(f => f.classList.add("is-invalid"));
            // Optionally show data.message somewhere
        } else {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Create`;
            [nameField, roleField, deptField, passwordField].forEach(f => f.classList.remove("is-invalid"));
            form.reset();
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    });
};

document.addEventListener("DOMContentLoaded", loadStaff);
document.addEventListener("DOMContentLoaded", setupNewUserModal);
document.addEventListener("DOMContentLoaded", handleNewUserForm);