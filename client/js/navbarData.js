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
        const nameElem = document.getElementsByClassName('profile__name')
        const deptElem = document.getElementsByClassName('profile__dept')

        if (nameElem) {
            for (let i = 0; i < nameElem.length; i++) {
                nameElem[i].textContent = user.data[0].name ?? "Unknown";
            }

        }

        if (deptElem) {
            for (let i = 0; i < deptElem.length; i++) {
                deptElem[i].textContent = user.data[0].department?.name ?? "No Department";
            }
        }

    } catch (e) {
        console.error(e);
        window.location.replace("./servererror.html");
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);