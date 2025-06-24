/**@import {PaginationInfo} from "./constants.js" */
import { API_URL } from "./constants.js";
import { getDepartmentData, getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

/**
 * @typedef {object} FeedbackAuthor
 * @property {number} id
 * @property {string} name
 * @property {string} role
 * @property {number} departmentId
 */

/**
 * @typedef {object} Feedback
 * @property {number} id
 * @property {string} timestamp
 * @property {string} feedback
 * @property {FeedbackAuthor} author
 */
/**
 * @typedef {object} FeedbacksResponse
 * @property {string} message
 * @property {number} count
 * @property {Feedback[]} data
 * @property {object} pagination
 * @property {number} pagination.total
 * @property {number} pagination.limit
 * @property {number} pagination.offset
 * @property {number} pagination.pageCount
 * @property {number} pagination.currentPage
 */

/**
 * Renders pagination controls based on the pagination info
 * @param {PaginationInfo} pagination - The pagination information
 */
const renderPaginationControls = (pagination) => {
    const paginationUl = document.querySelector(".pagination");
    if (!paginationUl) return;

    paginationUl.innerHTML = ""; // Clear existing controls

    if (!pagination) {
        // Hide pagination if no data
        paginationUl.classList.add("d-none");
        return;
    }
    paginationUl.classList.remove("d-none");

    const { currentPage, pageCount } = pagination;

    // Previous button
    const prevLi = document.createElement("li");
    prevLi.classList.add("page-item");
    if (currentPage === 1) {
        prevLi.classList.add("disabled");
    }
    const prevA = document.createElement("a");
    prevA.classList.add("page-link");
    prevA.href = "#";
    prevA.innerText = "Previous";
    prevA.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            fetchAndRenderFeedbacks(currentPage - 1);
        }
    });
    prevLi.appendChild(prevA);
    paginationUl.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= pageCount; i++) {
        const pageLi = document.createElement("li");
        pageLi.classList.add("page-item");
        if (i === currentPage) {
            pageLi.classList.add("active");
        }
        const pageA = document.createElement("a");
        pageA.classList.add("page-link");
        pageA.href = "#";
        pageA.innerText = i.toString();
        pageA.addEventListener("click", (e) => {
            e.preventDefault();
            fetchAndRenderFeedbacks(i);
        });
        pageLi.appendChild(pageA);
        paginationUl.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement("li");
    nextLi.classList.add("page-item");
    if (currentPage === pageCount) {
        nextLi.classList.add("disabled");
    }
    const nextA = document.createElement("a");
    nextA.classList.add("page-link");
    nextA.href = "#";
    nextA.innerText = "Next";
    nextA.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentPage < pageCount) {
            fetchAndRenderFeedbacks(currentPage + 1);
        }
    });
    nextLi.appendChild(nextA);
    paginationUl.appendChild(nextLi);
};

/**
 * Format date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
const formatDate = (dateString) => {
    const date = new Date(`${dateString}Z`); // Ensure UTC interpretation
    return date.toLocaleString();
};

/**
 * Fetch and display feedbacks with pagination and sorting
 * @param {number} pageNumber - The page number to fetch
 */
const fetchAndRenderFeedbacks = async (pageNumber = 1) => {
    const feedbackList = document.getElementById("feedbackList");
    if (!feedbackList) return;

    // Get filter values
    const sortEl = document.getElementById("sort");
    const entriesEl = document.getElementById("entries");

    // Build query parameters
    const params = new URLSearchParams();

    if (sortEl && sortEl instanceof HTMLSelectElement && sortEl.value) {
        params.append("sort", sortEl.value);
    }

    const limit = (entriesEl && entriesEl instanceof HTMLSelectElement && parseInt(entriesEl.value)) || 10;
    params.append("limit", limit.toString());
    params.append("offset", ((pageNumber - 1) * limit).toString());

    try {
        // Show loading state
        feedbackList.innerHTML = `<p class="text-center"><span class="spinner-border spinner-border-sm" role="status"></span> Loading feedbacks...</p>`;
        const paginationUl = document.querySelector(".pagination");
        if (paginationUl) {
            paginationUl.classList.add("d-none"); // Hide pagination during load
        }

        // Fetch feedbacks with filters
        const res = await fetch(`${API_URL}/api/feedbacks?${params.toString()}`, {
            credentials: "include"
        });

        if (statusRedirect(res, "href")) return;

        /** @type {FeedbacksResponse} */
        const feedbacksResponse = await res.json();
        const { data: feedbacks, pagination } = feedbacksResponse;

        // Clear existing content
        feedbackList.innerHTML = `<h2><b>Feedbacks</b> <span class="fs-6">(${pagination.total} results)</span></h2>`;

        // No results case
        if (feedbacks.length === 0) {
            feedbackList.innerHTML += `<div class="alert alert-info">No feedbacks found.</div>`;
            renderPaginationControls(pagination);
            return;
        }

        // Loop through feedbacks and render each one
        for (const feedback of feedbacks) {
            // Get department data if not already available in the author object
            let departmentInfo = "N/A";
            if (feedback.author.departmentId) {
                try {
                    const dept = await getDepartmentData(feedback.author.departmentId);
                    departmentInfo = dept.name || "N/A";
                } catch (error) {
                    console.error("Error fetching department data:", error);
                }
            }

            // Collapse ID for this feedback
            const collapseId = `feedback-collapse-${feedback.id}`;

            const feedbackItem = document.createElement("div");
            feedbackItem.className = "thread-item";
            feedbackItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h3>
                                <span class="thread-top__text">Feedback #${feedback.id}
                                    <span class="badge bg-secondary rounded-pill ms-2">${formatDate(feedback.timestamp)}</span>
                                </span>
                            </h3>
                        </div>
                        <span>
                            From: ${feedback.author.name} (${departmentInfo})
                        </span>
                    </div>
                    <div class="profile__dropdown">
                        <button class="thread-btn btn collapsed" type="button" data-bs-toggle="collapse"
                            data-bs-target="#${collapseId}" aria-expanded="false"
                            aria-controls="${collapseId}">▼</button>
                    </div>
                </div>
                <div class="thread-collapse collapse" id="${collapseId}">
                    <div class="mt-3">
                        <hr>
                        <b>Feedback</b>
                        <div class="p-3 bg-light rounded mt-2">
                            <p class="mb-0">${feedback.feedback}</p>
                        </div>
                    </div>
                </div>
            `;

            feedbackList.appendChild(feedbackItem);
        }

        renderPaginationControls(pagination);

    } catch (e) {
        console.error("Failed to fetch feedbacks:", e);
        feedbackList.innerHTML = `
            <h2><b>Feedbacks</b></h2>
            <div class="alert alert-danger">Error loading feedbacks. Please try again.</div>
        `;
        // Create a minimal pagination object for error state
        renderPaginationControls({
            currentPage: 1,
            pageCount: 1,
            total: 0,
            limit: 10,
            offset: 0
        });
    }
};

/**
 * Check if the current user has admin privileges and hide/show elements accordingly
 */
const checkAdminAccess = async () => {
    try {
        const user = await getUserData("@me");

        // Check if user is admin or superadmin
        const isAdmin = user.role === "admin" || user.role === "superadmin";

        if (!isAdmin) {
            // Redirect to forbidden page if not admin
            window.location.href = "/forbidden";
        }

        // Show admin-only elements
        document.querySelectorAll(".admin-only").forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.display = "flex";
            }
        });
    } catch (error) {
        console.error("Error checking admin access:", error);
        window.location.href = "/login";
    }
};

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await checkAdminAccess();
        await fetchAndRenderFeedbacks();

        // Add event listeners for filters to reset to page 1
        const changeEventListenersId = ["sort", "entries"];

        changeEventListenersId.forEach((el) => {
            document.getElementById(el)?.addEventListener("change", () => fetchAndRenderFeedbacks(1));
        });
    } catch (error) {
        console.error("Error during initial page load:", error);
    }
});
