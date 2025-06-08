import { API_URL } from "./constants.js";
import { getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

const loadUserData = async () => {
    try {
        const resDepts = await fetch(`${API_URL}/api/departments`, { credentials: "include" })
        if (statusRedirect(resDepts, "href")) return;

        const user = await getUserData();

        /**
         * @type {{
         * message: string,
         * data: {
         * id: number;
         * name: string;
         * }[]}
         * }
         */
        const departments = await resDepts.json();

        const idElem = document.getElementById('userId')
        const nameElem = document.getElementById('name')
        const roleElem = document.getElementById('role') //HTMLSelectElement
        const deptElem = document.getElementById('department')
        const userElem = document.getElementById('username')


        if (!deptElem) return;
        if (!(deptElem instanceof HTMLSelectElement)) return;

        departments.data.forEach((d) => {
            const element = document.createElement("option");
            element.value = d.id.toString();
            element.innerText = d.name;

            deptElem.add(element);
        })


        const autoFields = [{ key: "name", element: nameElem }, { key: "role", element: roleElem }, { key: "username", element: userElem }, { key: "id", element: idElem }]

        autoFields.forEach((el) => {
            const e = el.element
            if (!e) return;
            if (e instanceof HTMLInputElement) {
                e.value = user[el.key]
            }

            if (e instanceof HTMLSelectElement) {
                e.value = user[el.key]
            }
        })

        deptElem.value = user.department?.id !== undefined ? user.department.id.toString() : "";

        if (user.role != "superadmin") {
            const restrictFields = [roleElem, deptElem, userElem, idElem]
            restrictFields.forEach((e) => {
                if (!e) return;
                if (e instanceof HTMLInputElement) {
                    e.disabled = true;
                }

                if (e instanceof HTMLSelectElement) {
                    e.disabled = true;
                }
            })
        }

    } catch (e) {
        console.error(e);
        window.location.replace("./servererror.html");
    }
}

const profileFormHandling = async () => {
    const formElem = document.getElementById('update-form');
    const btn = document.getElementById("form-submit");
    const alertPlaceholder = document.getElementById("alert-placeholder");

    if (!formElem) return;
    if (formElem instanceof HTMLFormElement) {
        formElem.addEventListener('submit', async (event) => {
            event.preventDefault()

            if (!btn) return;
            if (!(btn instanceof HTMLButtonElement)) return;

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Updating...`


            /** @type {HTMLInputElement} */
            const userIdValue = formElem.elements["userId"]
            /** @type {HTMLInputElement} */
            const nameValue = formElem.elements["name"]
            /** @type {HTMLSelectElement} */
            const roleValue = formElem.elements["role"]
            /** @type {HTMLInputElement} */
            const deptValue = formElem.elements["department"]
            /** @type {HTMLInputElement} */
            const userValue = formElem.elements["username"]
            /** @type {HTMLInputElement} */
            const passValue = formElem.elements["password"]

            const reqBody = new URLSearchParams();
            const elements = [nameValue, roleValue, deptValue, userValue, passValue];
            for (const el of elements) {
                if ((!el.disabled) && (el.name) && (el.value !== "")) {
                    reqBody.append(el.name, el.value)
                }
            }

            const res = await fetch(`${API_URL}/api/users/${userIdValue.value}`, {
                method: "PUT",
                body: reqBody,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                credentials: "include"
            })

            if (!res.ok) {
                btn.disabled = false;
                btn.innerHTML = `Save`
                if (alertPlaceholder) alertPlaceholder.innerHTML = `<div class="alert alert-danger" role="alert">An error occurred.</div>`;
                console.error(await res.json());
            } else {
                btn.disabled = true;
                btn.innerHTML = "Updated Successfully";
                setTimeout(() => {
                    window.location.reload();
                }, 1000)
            }
        })
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);
document.addEventListener("DOMContentLoaded", profileFormHandling);