import { API_URL } from "./constants.js"
import { statusRedirect } from "./statusRedirect.js"

let cachedUser = null;
let userPromise = null;

/**
 * Fetches and caches the current user's data from the API.
 * If the data is already cached, returns it immediately.
 * If a fetch is in progress, returns the existing promise.
 * Otherwise, fetches the user data and caches it.
 *
 * @async
 * @returns {Promise<{
 *   department: { id: number, name: string } | null,
 *   id: number,
 *   role: "superadmin" | "admin" | "clerk" | "officer",
 *   name: string,
 *   username: string,
 *   createdAt: string | null
 * }>} Resolves with the user data object.
 */
export async function getUserData() {
    if (cachedUser) return cachedUser;
    if (userPromise) return userPromise;

    userPromise = fetch(`${API_URL}/api/users/@me`, {
        credentials: "include"
    }).then(async res => {
        if (statusRedirect(res, "href")) throw new Error("Redirected");

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
        const data = await res.json();
        cachedUser = data.data[0]
        return cachedUser;
    }).catch(e => {
        userPromise = null;
        throw e;
    })

    return userPromise;
}

const loadUserData = async () => {
    try {
        const user = await getUserData();
        const nameElem = document.getElementsByClassName('profile__name')
        const deptElem = document.getElementsByClassName('profile__dept')

        if (nameElem) {
            for (let i = 0; i < nameElem.length; i++) {
                nameElem[i].textContent = user.name ?? "Unknown";
            }

        }

        if (deptElem) {
            for (let i = 0; i < deptElem.length; i++) {
                deptElem[i].textContent = user.department?.name ?? "No Department";
            }
        }

    } catch (e) {
        console.error(e);
        window.location.replace("/servererror");
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);