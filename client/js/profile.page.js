import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

const loadUserData = async () => {
    try {
        const res = await fetch(`${API_URL}/api/users/@me`, { credentials: "include" })
        if (statusRedirect(res, "href")) return;

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
        const user = await res.json();
        console.log(user)

        const nameElem = document.getElementById('name')
        const roleElem = document.getElementById('role') //HTMLSelectElement
        const deptElem = document.getElementById('department')
        const userElem = document.getElementById('username')
        const passElem = document.getElementById('password')


        const autoFields = [{ key: "name", element: nameElem }, { key: "role", element: roleElem }, { key: "username", element: userElem }]

        autoFields.forEach((e) => {
            if (!e.element || !(e.element instanceof HTMLInputElement)) return;

            e.element.value = user.data[0][e.key]
        })

        if (user.data[0].role != "superadmin") {
            const restrictFields = [roleElem, deptElem, userElem]
            restrictFields.forEach((e) => {
                console.log(e?.nodeName)
                if (!e || !(e instanceof HTMLInputElement)) return;
                e.disabled = true;
            })
        }
        // FIXME: role cant be assigned as HTMLInputElement

    } catch (e) {
        console.error(e);
        window.location.replace("./servererror.html");
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);