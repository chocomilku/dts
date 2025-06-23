/**@import {DepartmentsResponse, Department, UsersResponse, User} from "./constants.js" */
import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

const deptCache = new Map();

/**
 * Fetches and caches a department's data from the API.
 * If the data is already cached, returns it immediately.
 * If a fetch is in progress, returns the existing promise.
 * Otherwise, fetches the department data and caches it.
 *
 * @async
 * @param {number} id - Department ID to fetch.
 * @returns {Promise<Department>} Resolves with the department data object.
*/
export async function getDepartmentData(id) {
    if (deptCache.has(id)) return deptCache.get(id);

    const promise = fetch(`${API_URL}/api/departments/${id}`, { credentials: "include" })
        .then(async res => {
            if (statusRedirect(res, "href")) throw new Error("Redirected");
            /** @type {DepartmentsResponse} */
            const data = await res.json();
            const dept = data.data[0];
            deptCache.set(id, Promise.resolve(dept));
            return dept;
        })
        .catch(e => {
            deptCache.delete(id);
            throw e;
        });

    deptCache.set(id, promise);
    return promise;
}

const userCache = new Map();

/**
 * Fetches and caches a user's data from the API by ID.
 * If the data is already cached for that ID, returns it immediately.
 * If a fetch is in progress for that ID, returns the existing promise.
 * Otherwise, fetches the user data and caches it.
 *
 * @async
 * @param {number|string} id - User ID to fetch, or "@me" for current user.
 * @returns {Promise<User>} Resolves with the user data object.
 */
export async function getUserData(id) {
    if (userCache.has(id)) return userCache.get(id);

    const promise = fetch(`${API_URL}/api/users/${id}`, {
        credentials: "include"
    }).then(async res => {
        if (statusRedirect(res, "href")) throw new Error("Redirected");

        /**@type {UsersResponse} */
        const data = await res.json();
        const user = data.data[0];
        userCache.set(id, Promise.resolve(user));
        return user;
    }).catch(e => {
        userCache.delete(id);
        throw e;
    });

    userCache.set(id, promise);
    return promise;
}


/**
 * Badge types for badgeColorProvider.
 * @typedef {"open"|"reopen"|"created"|"approve"|"transfer"|"receive"|"assign"|"closed"|"deny"|"overdue"|string} BadgeType
 */

/**
 * Provides Bootstrap badge color classes based on type.
 * @param {BadgeType} type
 * @returns {string}
 */
export const badgeColorProvider = (type) => {
    // bg-success-subtle text-success-emphasis
    switch (type) {
        case "open":
        case "reopen":
        case "created":
        case "approve":
            return `bg-success-subtle text-success-emphasis`

        case "transfer":
            return `bg-warning-subtle text-warning-emphasis`

        case "receive":
            return `bg-info-subtle text-info-emphasis`

        case "assign":
            return `bg-primary-subtle text-primary-emphasis`

        case "closed":
        case "deny":
        case "overdue":
            return `bg-danger-subtle text-danger-emphasis`

        default:
            return `bg-secondary-subtle text-secondary-emphasis`
    }
}