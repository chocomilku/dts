import { API_URL } from "./constants.js"
import { statusRedirect } from "./statusRedirect.js"

const loadUserData = async () => {
    try {
        const res = await fetch(`${API_URL}/api/users/@me`, { credentials: "include" })
        if (statusRedirect(res, "href")) return;

        /**
         * @type {{message: string, data: {
         * department: {
         * id: number;
         * name: string;
         * } | null;
         * id: number;
         * role: "superadmin" | "admin" | "clerk" | "officer";
         * name: string;
         * createdAt: string | null;
         * }[]}}
         */
        const user = await res.json();
        console.log(user)
        const nameElem = document.getElementById('profile__name')
        const deptElem = document.getElementById('profile__dept')

        if (nameElem) nameElem.textContent = user.data[0].name ?? "Unknown"
        if (deptElem) deptElem.textContent = user.data[0].department?.name ?? "No Department"

    } catch (e) {
        console.error(e);
        window.location.replace("./servererror.html");
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);