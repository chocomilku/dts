import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

const loadUserData = async () => {
    try {
        const resUserMe = await fetch(`${API_URL}/api/users/@me`, { credentials: "include" })
        const resDepts = await fetch(`${API_URL}/api/departments`)
        if (statusRedirect(resUserMe, "href")) return;
        if (statusRedirect(resDepts, "href")) return;

        /**
         * @type {{message: string, data: {
        * department: {
        *  id: number;
        *  name: string} | null;
        * id: number;
        * role: "superadmin" | "admin" | "clerk" | "officer";
        * name: string;
        * username: string;
        * createdAt: string | null;
        * }[]}}
        */
        const user = await resUserMe.json();

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
        console.log(user)
        console.log(departments);

        const nameElem = document.getElementById('name')
        const roleElem = document.getElementById('role') //HTMLSelectElement
        const deptElem = document.getElementById('department')
        const userElem = document.getElementById('username')
        const passElem = document.getElementById('password')

        if (!deptElem) return;
        if (!(deptElem instanceof HTMLSelectElement)) return;

        departments.data.forEach((d) => {
            const element = document.createElement("option");
            element.value = d.id.toString();
            element.innerText = d.name;

            deptElem.add(element);
        })

        const autoFields = [{ key: "name", element: nameElem }, { key: "role", element: roleElem }, { key: "username", element: userElem }]

        autoFields.forEach((el) => {
            const e = el.element
            if (!e) return;
            if (e instanceof HTMLInputElement) {
                e.value = user.data[0][el.key]
            }

            if (e instanceof HTMLSelectElement) {
                e.value = user.data[0][el.key]
            }
        })

        if (user.data[0].role != "superadmin") {
            const restrictFields = [roleElem, deptElem, userElem]
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

document.addEventListener("DOMContentLoaded", loadUserData);