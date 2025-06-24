/** @import { DocumentsResponse, DocumentCountResponse } from "./constants.js" */
import { API_URL, dbDateTransformer, pillBadgeProvider } from "./constants.js";
import { getDepartmentData, getUserData, badgeColorProvider } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Fetch and display document counts
    try {
        const res = await fetch(`${API_URL}/api/documents/count`, { credentials: "include" });
        if (statusRedirect(res, "href")) return;
        /** @type {DocumentCountResponse} */
        const countData = await res.json();

        const openCountElem = document.getElementById("openCount");
        const closedCountElem = document.getElementById("closedCount");
        const assignedCountElem = document.getElementById("assignedCount");
        const assignedOverdueElem = document.getElementById("assignedOverdueCount");

        if (openCountElem) openCountElem.textContent = String(countData.data.openCount);
        if (closedCountElem) closedCountElem.textContent = String(countData.data.assignedCount);
        if (assignedCountElem) assignedCountElem.textContent = String(countData.data.closedCount);
        if (assignedOverdueElem) assignedOverdueElem.textContent = String(countData.data.assignedOverdueCount)
    } catch (e) {
        // Optionally handle error
        console.error("Failed to fetch document counts", e);
    }

    const docList = document.getElementById("docList");
    if (!docList) return;

    // Remove any existing thread items
    docList.querySelectorAll(".thread-item").forEach(el => el.remove());

    // Fetch documents
    const res = await fetch(`${API_URL}/api/documents?assigned=true`, { credentials: "include" });
    if (statusRedirect(res, "href")) return;

    /** @type {DocumentsResponse} */
    const docs = await res.json();

    // For collapse IDs
    let threadCount = 1;

    const me = await getUserData("@me");

    for (const doc of docs.data) {
        // Fetch related data
        const [originDept, author, signatory] = await Promise.all([
            getDepartmentData(doc.originDepartment),
            getUserData(doc.author),
            getUserData(doc.signatory)
        ]);

        // badges
        /**@type {HTMLSpanElement[]} */
        const badges = [];

        badges.push(pillBadgeProvider(doc.status));

        // Assigned to
        let assignedTo = "No one";
        let isAssignedToMe = false;

        if (doc.assignedDepartment != null) {
            const dept = await getDepartmentData(doc.assignedDepartment);
            assignedTo = dept?.name ?? "Unknown";

            if (me.department && me.department.id === doc.assignedDepartment) {
                isAssignedToMe = true;
            }

        } else if (doc.assignedUser != null) {
            const user = await getUserData(doc.assignedUser);
            assignedTo = user ? `${user.name} (${user.department?.name ?? ""})` : "Unknown";

            if (me.id === doc.assignedUser) {
                isAssignedToMe = true;
            }
        }

        if (isAssignedToMe) {
            badges.push(pillBadgeProvider("assign", "Assigned"));
        }

        // Overdue
        const isOverdue = doc.dueAt === null ? false : new Date(doc.dueAt) <= new Date() ? true : false;

        if (isOverdue) {
            badges.push(pillBadgeProvider("overdue"));
        }

        // get HTML
        const badgesHtml = badges.map((b) => {
            return b.outerHTML
        })

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
                                ${badgesHtml.join("")}
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
});