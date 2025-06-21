/** @import { DepartmentsResponse } from "./constants.js" */
import { API_URL } from "./constants.js";
import { getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

const loadDepartments = async () => {
    try {
        const res = await fetch(`${API_URL}/api/departments`, {
            credentials: "include"
        })
        if (statusRedirect(res, "href")) return;

        /**@type {DepartmentsResponse} */
        const departments = await res.json();

        // Select the container for thread items
        const mainContent = document.querySelector(".main-content");
        if (!mainContent) return;

        let deptCollapseCount = 1;

        // Create and append a thread-item for each department
        departments.data.forEach(dept => {
            const threadItem = document.createElement("div");
            const collapseId = `dept-collapse-${deptCollapseCount++}`
            threadItem.className = "thread-item";
            threadItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h3>
                                <a href="/departments/${dept.id}"  class="thread-top__text">
                                ${dept.name}
                                </a>
                            </h3>
                        </div>
                        <span>
                            <b>Members</b>: ${dept.members ?? "Unknown"}
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
                    <div><b>ID</b> <span>${dept.id ?? "Unknown"}</span></div>
                    <div><b>Members</b> <span>${dept.members ?? "Unknown"}</span></div>
                    <div><b>Created At</b> <span>${dept.createdAt ?? "Unknown"}</span></div>
                </div>
            `;
            mainContent.appendChild(threadItem);
        });

    } catch (e) {
        console.error(e);
    }
}

const checkRole = async () => {
    const user = await getUserData("@me");
    if (user.role != "superadmin") {
        const addDeptButton = document.getElementById("addDeptButton");
        if (addDeptButton) addDeptButton.remove();
        const newDeptModal = document.getElementById("newDeptModal");
        if (newDeptModal) newDeptModal.remove();
    }
}

const formHandling = async () => {
    const form = document.getElementById("new-dept-form");
    if (!(form instanceof HTMLFormElement)) return;

    const nameField = document.getElementById("name")
    if (!(nameField instanceof HTMLInputElement)) return;
    const descField = document.getElementById("description");
    if (!(descField instanceof HTMLTextAreaElement)) return;

    const feedback = document.getElementById("name-feedback");

    form.addEventListener("submit", async (event) => {
        event.preventDefault()

        if (!form.checkValidity()) {
            event.stopPropagation()
            nameField.classList.add("is-invalid");
        } else {
            const btn = document.getElementById("form-submit");
            if (!btn) return;
            if (!(btn instanceof HTMLButtonElement)) return;

            nameField.classList.remove("is-invalid");

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Creating...`

            const res = await fetch(`${API_URL}/api/departments`, {
                method: "POST",
                body: new URLSearchParams({ name: nameField.value, description: descField.value }),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                credentials: "include"
            })

            /**
                 * @type {{ message: string }}
                 */
            const data = await res.json();

            if (!res.ok) {
                btn.disabled = false;
                btn.innerHTML = `Create`
                if (feedback) {
                    feedback.classList.remove("valid-feedback");
                    feedback.classList.add("invalid-feedback");
                    feedback.innerText = data.message;
                }

                nameField.classList.add("is-invalid");
            } else {
                btn.disabled = true;
                btn.innerHTML = `Create`
                if (feedback) {
                    feedback.classList.remove("invalid-feedback");
                    feedback.classList.add("valid-feedback");
                    feedback.innerText = data.message;
                }
                nameField.classList.add("is-valid");
                setTimeout(() => {
                    nameField.value = "";
                    descField.value = "";
                    window.location.reload();
                }, 500)
            }
        }
    })
}


document.addEventListener("DOMContentLoaded", loadDepartments);
document.addEventListener("DOMContentLoaded", formHandling);
document.addEventListener("DOMContentLoaded", checkRole);