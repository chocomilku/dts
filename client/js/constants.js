/**@import { BadgeType } from "./fetchHelpers.js" */
import { badgeColorProvider } from "./fetchHelpers.js";


export const API_URL = "";

/**
 * transforms string-based dates into Date object.
 * @param {string} date date from database that is in UTC without `Z` at the end.
 * @returns {Date}
 */
export function dbDateTransformer(date) {
    return new Date(`${date}Z`)
}

/**
 * @typedef {"superadmin" | "admin" | "clerk" | "officer"} UserRoles
 */

/**
 * @typedef {object} User
 * @property {Department | null} department
 * @property {number} id
 * @property {UserRoles} role
 * @property {string} name
 * @property {string | null} username
 * @property {string | null} createdAt
 */

/**
 * @typedef {object} Department
 * @property {number} id
 * @property {string} name
 * @property {number | null} members
 * @property {string | null} createdAt
 * @property {string | null} description
 */

/**
 * @typedef {object} Document
 * @property {number} id
 * @property {string} trackingNumber
 * @property {"open"|"closed"} status
 * @property {string} title
 * @property {string} type
 * @property {string} details
 * @property {number} signatory
 * @property {number} author
 * @property {number} originDepartment
 * @property {number|null} assignedUser
 * @property {number|null} assignedDepartment
 * @property {string|null} createdAt
 * @property {string|null} lastUpdatedAt
 * @property {string|null} dueAt
 */

/**
 * @typedef {object} PaginationInfo
 * @property {number} total
 * @property {number} limit
 * @property {number} offset
 * @property {number} pageCount
 * @property {number} currentPage
 */

/**
* @typedef {object} DocumentLog
* @property {number} id
* @property {number} document
* @property {number} location
* @property {number} author
* @property {number|null} recipient
* @property {"user"|"dept"|null} recipientType
* @property {"created"|"closed"|"reopen"|"note"|"transfer"|"receive"|"assign"|"approve"|"deny"} action
* @property {string} logMessage
* @property {string|null} additionalDetails
* @property {string} timestamp
*/

/**
 * @typedef {object} DocumentLogsResponse
 * @property {string} message
 * @property {DocumentLog[]} data
 */

//#region Responses
/**
 * @typedef {object} UsersResponse
 * @property {string} message
 * @property {number} count
 * @property {User[]} data
 */

/**
 * @typedef {object} DepartmentsResponse
 * @property {string} message
 * @property {Department[]} data
 */

/**
 * @typedef {object} DocumentsResponse
 * @property {string} message
 * @property {Document[]} data
 * @property {PaginationInfo} pagination
 */

/**
 * @typedef {object} DocumentCountResponse
 * @property {string} message
 * @property {{ openCount: number, closedCount: number, assignedCount: number }} data
 */

//#endregion

/**
 * Formats the first letter of a string to uppercase
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
export function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @param {BadgeType} badge
 * @param {string} [altText]
 * @returns {HTMLSpanElement}
 */
export const pillBadgeProvider = (badge, altText) => {
    const badgeElement = window.document.createElement("span");
    badgeElement.className = `badge ${badgeColorProvider(badge)} rounded-pill ms-2`
    badgeElement.textContent = altText ?? capitalizeFirst(badge);
    return badgeElement
}