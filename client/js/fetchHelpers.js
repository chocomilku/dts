import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

let cachedDept = null;
let deptPromise = null;

/**
 * @typedef {object} DepartmentData
 * @property {number} id - Department ID
 * @property {string} name - Department name
 */

/**
 * @typedef {object} DepartmentResponse
 * @property {string} message - Status message
 * @property {DepartmentData[]} data - Array with one department object
 */

/**
 * Fetches and caches a department's data from the API.
 * If the data is already cached, returns it immediately.
 * If a fetch is in progress, returns the existing promise.
 * Otherwise, fetches the department data and caches it.
 *
 * @async
 * @param {number} id - Department ID to fetch.
 * @returns {Promise<DepartmentData>} Resolves with the department data object.
*/
export async function getDepartmentData(id) {
    if (cachedDept) return cachedDept;
    if (deptPromise) return deptPromise;

    deptPromise = fetch(`${API_URL}/api/departments/${id}`, { credentials: "include" }).then(async res => {
        if (statusRedirect(res, "href")) throw new Error("Redirected");

        /** @type {DepartmentResponse} */
        const data = await res.json();
        cachedDept = data.data[0];
        return cachedDept;
    }).catch(e => {
        deptPromise = null;
        throw e;
    })

    return deptPromise;
}

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
export async function getUserData(id) {
    if (cachedUser) return cachedUser;
    if (userPromise) return userPromise;

    userPromise = fetch(`${API_URL}/api/users/${id}`, {
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