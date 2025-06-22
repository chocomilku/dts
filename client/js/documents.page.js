/** @import { DocumentsResponse, DepartmentsResponse } from "./constants.js" */
import { API_URL, dbDateTransformer } from "./constants.js";
import { getDepartmentData, getUserData, badgeColorProvider } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";


const loadDepartments = async () => {
    const departmentSelect = document.getElementById("department");
    if (!departmentSelect) return;
    if (!(departmentSelect instanceof HTMLSelectElement)) return;

    try {
        const res = await fetch(`${API_URL}/api/departments`, {
            credentials: "include"
        });
        if (statusRedirect(res, "href")) return;

        /** @type {DepartmentsResponse} */
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
            fetchAndRenderDocuments(currentPage - 1);
        }
    });
    prevLi.appendChild(prevA);
    paginationUl.appendChild(prevLi);

    // Page numbers
    // Simplified: show all page numbers. For many pages, a more complex logic (e.g., ellipsis) would be needed.
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
            fetchAndRenderDocuments(i);
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
            fetchAndRenderDocuments(currentPage + 1);
        }
    });
    nextLi.appendChild(nextA);
    paginationUl.appendChild(nextLi);
};


const fetchAndRenderDocuments = async (pageNumber = 1) => {
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
    } else if (assignedEl && assignedEl instanceof HTMLSelectElement && assignedEl.value === "no") {
        params.append("assigned", "false");
    }


    if (sortEl && sortEl instanceof HTMLSelectElement && sortEl.value) {
        params.append("sort", sortEl.value);
    }

    const limit = (entriesEl && entriesEl instanceof HTMLSelectElement && parseInt(entriesEl.value)) || 10;
    params.append("limit", limit.toString());
    params.append("offset", ((pageNumber - 1) * limit).toString());


    if (searchEl && searchEl instanceof HTMLInputElement && searchEl.value.trim()) {
        params.append("q", searchEl.value.trim());
    }

    try {
        // Show loading state
        docList.innerHTML = `<p class="text-center"><span class="spinner-border spinner-border-sm" role="status"></span>Loading documents...</p>`;
        const paginationUl = document.querySelector(".pagination");
        if (paginationUl) paginationUl.classList.add("d-none"); // Hide pagination during load


        // Fetch documents with filters
        const res = await fetch(`${API_URL}/api/documents?${params.toString()}`, {
            credentials: "include"
        });
        if (statusRedirect(res, "href")) return;

        /** @type {DocumentsResponse} */
        const docsResponse = await res.json();
        const { data: docs, pagination } = docsResponse;

        // Clear existing content
        docList.innerHTML = `<h2><b>Documents</b> <span class="fs-6">(${pagination.total} results)</span></h2>`;

        // No results case
        if (docs.length === 0) {
            docList.innerHTML += `<div class="alert alert-info mt-3">No documents found matching your filters.</div>`;
            renderPaginationControls(null); // Clear/hide pagination
            return;
        }

        // For collapse IDs
        let threadCount = 1;

        // Render documents
        for (const doc of docs) {
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
                <div><b>Created At</b> <span>${doc.createdAt ? dbDateTransformer(doc.createdAt).toLocaleString() : "Unknown"}</span></div>
                <div><b>Last Updated At</b> <span>${doc.lastUpdatedAt ? dbDateTransformer(doc.lastUpdatedAt).toLocaleString() : "Unknown"}</span></div>
                <div><b>Due At</b> <span>${doc.dueAt ? dbDateTransformer(doc.dueAt).toLocaleString() : "No Due Date"}</span></div>
              </div>
            `;
            docList.appendChild(threadItem);
        }
        renderPaginationControls(pagination);

    } catch (e) {
        console.error("Failed to fetch documents:", e);
        docList.innerHTML = `
            <h2><b>Documents</b></h2>
            <div class="alert alert-danger">Error loading documents. Please try again.</div>
          `;
        renderPaginationControls(null); // Clear/hide pagination on error
    }
};

document.addEventListener("DOMContentLoaded", async () => { // Made async
    try {
        await loadDepartments();
        await fetchAndRenderDocuments(); // Initial fetch (page 1) - await restored
    } catch (error) {
        console.error("Error during initial page load:", error);
        // Optionally, display a user-friendly message in the UI
        const docList = document.getElementById("docList");
        if (docList) {
            docList.innerHTML = `
                <h2><b>Documents</b></h2>
                <div class="alert alert-danger">Error initializing page. Please try refreshing.</div>
            `;
        }
        const paginationUl = document.querySelector(".pagination");
        if (paginationUl) paginationUl.classList.add("d-none");
    }

    // Add event listeners for filters to reset to page 1
    document.getElementById("department")?.addEventListener("change", () => fetchAndRenderDocuments(1));
    document.getElementById("status")?.addEventListener("change", () => fetchAndRenderDocuments(1));
    document.getElementById("assigned")?.addEventListener("change", () => fetchAndRenderDocuments(1));
    document.getElementById("sort")?.addEventListener("change", () => fetchAndRenderDocuments(1));
    document.getElementById("entries")?.addEventListener("change", () => fetchAndRenderDocuments(1));

    const searchInput = document.getElementById("search");
    const searchButton = document.getElementById("searchBtn"); // Corrected ID from search-button to searchBtn

    const performSearch = () => fetchAndRenderDocuments(1);

    searchButton?.addEventListener("click", performSearch);
    searchInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });
});
