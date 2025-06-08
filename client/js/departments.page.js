import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

const loadDepartments = async () => {
    try {
        const res = await fetch(`${API_URL}/api/departments`, {
            credentials: "include"
        })
        if (statusRedirect(res, "href")) return;

        /**
         * @type {{message: string, data:{
         * id: number;
         * name: string;
         * }[]}}
         */
        const departments = await res.json();

        // Select the container for thread items
        const mainContent = document.querySelector(".main-content");
        if (!mainContent) return;

        // Create and append a thread-item for each department
        departments.data.forEach(dept => {
            const threadItem = document.createElement("div");
            threadItem.className = "thread-item";
            threadItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h3 class="thread-top__text">
                                ${dept.name}
                            </h3>
                        </div>
                        <span>
                            ID: ${dept.id} | Members: ?
                        </span>
                    </div>
                </div>
            `;
            mainContent.appendChild(threadItem);
        });

    } catch (e) {
        console.error(e);
        window.location.replace("/servererror");
    }
}

const formHandling = async () => {
    const form = document.getElementById("new-dept-form");
    if (!(form instanceof HTMLFormElement)) return;

    const nameField = document.getElementById("name")
    if (!(nameField instanceof HTMLInputElement)) return;

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
                body: new URLSearchParams({ name: nameField.value }),
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
                    window.location.reload();
                }, 500)
            }
        }
    })
}


document.addEventListener("DOMContentLoaded", loadDepartments);
document.addEventListener("DOMContentLoaded", formHandling);