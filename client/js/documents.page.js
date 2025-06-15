import { API_URL } from "./constants.js";
import { getDepartmentData, getUserData, badgeColorProvider } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

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
 */

/**
 * @typedef {object} DocumentsResponse
 * @property {string} message
 * @property {Document[]} data
 */

const loadDepartments = async () => {
    const departmentSelect = document.getElementById("department");
    if (!departmentSelect) return;
    if (!(departmentSelect instanceof HTMLSelectElement)) return;

    try {
        const res = await fetch(`${API_URL}/api/departments`, {
            credentials: "include"
        });
        if (statusRedirect(res, "href")) return;

        /**
         * @type {{
        * message: string,
        * data: {
        * id: number;
        * name: string;
        * }[]}
        * }
        */
        const data = await res.json();

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.innerText = "All"
        allOption.selected = true;

        departmentSelect.add(allOption);

        data.data.forEach((dept) => {
            const option = document.createElement("option");
            option.value = dept.id.toString()
            option.innerText = dept.name;

            departmentSelect.add(option);
        })


    } catch (e) {
        console.error("Failed to load departments:", e);
    }
}

const fetchAndRenderDocuments = async () => {
    const docList = document.getElementById("docList");
    if (!docList) return;

    // Get all filter values
    const departmentEl = document.getElementById("department");
    const statusEl = document.getElementById("status");
    const assignedEl = document.getElementById("assigned");
    const sortEl = document.getElementById("sort");
    const entriesEl = document.getElementById("entries");
    const searchEl = document.getElementById("search");

    // Build query parameters
    const params = new URLSearchParams();

    if (departmentEl && (departmentEl instanceof HTMLSelectElement) && departmentEl.value && departmentEl.value !== "all") {
        params.append("department", departmentEl.value);
    }

    if (statusEl && statusEl instanceof HTMLSelectElement && statusEl.value && statusEl.value !== "any") {
        params.append("status", statusEl.value);
    }

    if (assignedEl && assignedEl instanceof HTMLSelectElement && assignedEl.value === "yes") {
        params.append("assigned", "true");
    }

    if (sortEl && sortEl instanceof HTMLSelectElement && sortEl.value) {
        params.append("sort", sortEl.value);
    }

    if (entriesEl && entriesEl instanceof HTMLSelectElement && entriesEl.value) {
        params.append("limit", entriesEl.value);
    }

    if (searchEl && searchEl instanceof HTMLInputElement && searchEl.value.trim()) {
        params.append("q", searchEl.value.trim());
    }

    try {
        // Show loading state
        docList.innerHTML = `<p class="text-center"><span class="spinner-border spinner-border-sm" role="status"></span>Loading documents...</p>`;

        // Fetch documents with filters
        const res = await fetch(`${API_URL}/api/documents?${params.toString()}`, {
            credentials: "include"
        });
        if (statusRedirect(res, "href")) return;

        /** @type {DocumentsResponse} */
        const docs = await res.json();

        // Clear existing content
        docList.innerHTML = `<h2><b>Documents</b> <span class="fs-6">(${docs.data.length} results)</span></h2>`;

        // No results case
        if (docs.data.length === 0) {
            docList.innerHTML += `<div class="alert alert-info mt-3">No documents found matching your filters.</div>`;
            return;
        }

        // For collapse IDs
        let threadCount = 1;

        // Render documents
        for (const doc of docs.data) {
            // Fetch related data
            const [originDept, author, signatory] = await Promise.all([
                getDepartmentData(doc.originDepartment),
                getUserData(doc.author),
                getUserData(doc.signatory)
            ]);

            // Assigned to
            let assignedTo = "No one";
            if (doc.assignedDepartment != null) {
                const dept = await getDepartmentData(doc.assignedDepartment);
                assignedTo = dept?.name ?? "Unknown";
            } else if (doc.assignedUser != null) {
                const user = await getUserData(doc.assignedUser);
                assignedTo = user ? `${user.name} (${user.department?.name ?? ""})` : "Unknown";
            }

            // Collapse ID
            const collapseId = `thread-collapse-${threadCount++}`;

            // Thread item
            const threadItem = document.createElement("div");
            threadItem.className = "thread-item";
            threadItem.innerHTML = `
              <div class="thread-visible">
                <div>
                  <div class="thread-top">
                    <h3>
                      <a href="/documents/${doc.trackingNumber}" class="thread-top__text">${doc.trackingNumber}
                        <span class="badge ${badgeColorProvider(doc.status)} rounded-pill fs-6 ms-2">
                          ${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </a>
                    </h3>
                  </div>
                  <span>
                    ${doc.title}
                  </span>
                </div>
                <div class="profile__dropdown">
                  <button class="thread-btn btn collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#${collapseId}" aria-expanded="false"
                    aria-controls="${collapseId}">▼</button>
                </div>
              </div>
              <div class="thread-collapse collapse" id="${collapseId}">
                <hr>
                <div><b>Origin Department</b> <span>${originDept?.name ?? "Unknown"}</span></div>
                <div><b>Document Type</b> <span>${doc.type}</span></div>
                <div><b>Created By</b> <span>${author ? `${author.name} (${author.department?.name ?? ""})` : "Unknown"}</span></div>
                <div><b>Currently Assigned To</b> <span>${assignedTo}</span></div>
                <div><b>Signatory</b> <span>${signatory ? `${signatory.name} (${signatory.department?.name ?? ""})` : "Unknown"}</span></div>
                <div><b>Last Updated At</b> <span>${doc.lastUpdatedAt ?? ""}</span></div>
              </div>
            `;
            docList.appendChild(threadItem);
        }
    } catch (e) {
        console.error("Failed to fetch documents:", e);
        docList.innerHTML = `
            <h2><b>Documents</b></h2>
            <div class="alert alert-danger">Error loading documents. Please try again.</div>
          `;
    }
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
    // First load departments in the dropdown
    await loadDepartments();

    // Initial document fetch
    await fetchAndRenderDocuments();

    // Add event listeners to all filter elements
    const filterElements = [
        "department",
        "status",
        "assigned",
        "sort",
        "entries"
    ];

    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", fetchAndRenderDocuments);
        }
    });

    // Add event listener to search button
    const searchBtn = document.getElementById("searchBtn");
    if (searchBtn) {
        searchBtn.addEventListener("click", fetchAndRenderDocuments);
    }

    // Optional: Add event listener for Enter key in search box
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e instanceof KeyboardEvent && e.key === "Enter") {
                e.preventDefault();
                fetchAndRenderDocuments();
            }
        });
    }
});
