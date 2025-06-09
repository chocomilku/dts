// @ts-nocheck
import { API_URL } from "./constants.js";
import { getDepartmentData, getUserData, badgeColorProvider } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";


const actionAlertPlaceholder = document.getElementById("actionAlertPlaceholder");

function showActionAlert(message, type = "danger") {
    if (!actionAlertPlaceholder) return;
    actionAlertPlaceholder.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

const loadPageData = async () => {
    //#region fetching
    const urlParts = window.location.pathname.split('/');
    const tn = urlParts[urlParts.length - 1];

    const res = await fetch(`${API_URL}/api/documents/${tn}`, {
        credentials: "include"
    })

    if (statusRedirect(res, "href")) return;

    /**
     * @type{{message: string, data: {
    id: number;
    trackingNumber: string;
    status: "open" | "closed";
    title: string;
    type: string;
    details: string;
    signatory: number;
    author: number;
    originDepartment: number;
    assignedUser: number | null;
    assignedDepartment: number | null;
    createdAt: string | null;
    lastUpdatedAt: string | null;
}[]}}
     */
    const doc = await res.json();

    const me = await getUserData("@me");

    //#endregion

    //#region doc details
    // declarations
    const docTrackingNumber = document.getElementById("docTrackingNumber");
    const docTitle = document.getElementById("docTitle");
    const docDetails = document.getElementById("docDetails");
    const docAttributes = document.getElementById("docAttributes");

    // processing
    const originDeptData = await getDepartmentData(doc.data[0].originDepartment)
    const authorData = await getUserData(doc.data[0].author);
    const signatoryData = await getUserData(doc.data[0].signatory);
    let assignedTo = "";

    let isAssignedToMe = false;
    if (doc.data[0].assignedDepartment != null) {
        const deptData = await getDepartmentData(doc.data[0].assignedDepartment);
        assignedTo = deptData.name;
        if (me.department && me.department.id === doc.data[0].assignedDepartment) {
            isAssignedToMe = true;
        }
    } else if (doc.data[0].assignedUser != null) {
        const userData = await getUserData(doc.data[0].assignedUser);
        assignedTo = `${userData.name} (${userData.department?.name})`;
        if (me.id === doc.data[0].assignedUser) {
            isAssignedToMe = true;
        }
    } else {
        assignedTo = "No one";
    }

    const attributes = [
        { key: "Origin Department", value: originDeptData.name },
        { key: "Document Type", value: doc.data[0].type },
        { key: "Author", value: `${authorData.name} (${authorData.department?.name})` },
        { key: "Currently Assigned to", value: assignedTo },
        { key: "Signatory", value: `${signatoryData.name} (${signatoryData.department?.name})` },
        { key: "Created At", value: doc.data[0].createdAt },
        { key: "Last Updated At", value: doc.data[0].lastUpdatedAt },
    ]

    // input content
    if (docTrackingNumber) {
        docTrackingNumber.innerText = doc.data[0].trackingNumber;
    }

    // Remove any existing badge (if re-rendered)
    const next = docTrackingNumber.nextSibling;
    if (next && next.nodeType === Node.ELEMENT_NODE && next.classList.contains('badge')) {
        next.remove();
    }

    if (isAssignedToMe) {
        const assignedBadge = document.createElement("span");
        assignedBadge.className = `badge ${badgeColorProvider("assign")} rounded-pill ms-2`;
        assignedBadge.textContent = "Assigned";
        docTrackingNumber.after(assignedBadge);
    }

    // Add status badge
    const badge = document.createElement("span");
    badge.className = `badge ${badgeColorProvider(doc.data[0].status)} rounded-pill ms-2`;
    badge.textContent = doc.data[0].status.charAt(0).toUpperCase() + doc.data[0].status.slice(1);
    docTrackingNumber.after(badge);



    if (docTitle) {
        docTitle.innerText = doc.data[0].title;
    }

    if (docDetails) {
        docDetails.innerHTML = doc.data[0].details;
    }

    let docAttributesValue = "";
    attributes.forEach((k) => {
        const val = `<div><b>${k.key}</b> <span>${k.value}</span></div>`
        docAttributesValue += val;
    })

    if (docAttributes) {
        docAttributes.innerHTML = docAttributesValue;
    }



    //#endregion

    //#region doc action buttons
    // Insert Open/Close button based on status and permissions

    const buttonRows = document.getElementById("buttonRows");
    if (buttonRows) {
        const isSuperAdmin = me.role === "superadmin";
        const isSignatory = me.id === doc.data[0].signatory;
        const isAuthor = me.id === doc.data[0].author;
        const isOpen = doc.data[0].status === "open";

        // Permission logic matches backend:
        // - To close: superadmin OR signatory OR author
        // - To open: superadmin OR author
        let canEdit = false;
        if (isOpen) {
            canEdit = isSuperAdmin || isSignatory || isAuthor;
        } else {
            canEdit = isSuperAdmin || isAuthor;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = isOpen ? "btn btn-danger" : "btn btn-success";
        btn.textContent = isOpen ? "Close" : "Reopen";
        btn.disabled = !canEdit;

        btn.addEventListener("click", async () => {
            // Re-check permissions on click
            let allowed = false;
            if (isOpen) {
                allowed = isSuperAdmin || isSignatory || isAuthor;
            } else {
                allowed = isSuperAdmin || isAuthor;
            }
            if (!allowed) return;

            btn.disabled = true;
            btn.textContent = isOpen ? "Closing..." : "Reopening...";

            try {
                const res = await fetch(`${API_URL}/api/documents/${doc.data[0].trackingNumber}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        status: isOpen ? "closed" : "open"
                    })
                });
                if (statusRedirect(res, "href")) return;
                if (res.ok) {
                    window.location.reload();
                } else {
                    btn.disabled = false;
                    btn.textContent = isOpen ? "Close" : "Reopen";
                    showActionAlert("Failed to update document status.");
                }
            } catch (e) {
                btn.disabled = false;
                btn.textContent = isOpen ? "Close" : "Reopen";
                showActionAlert("Error updating document status.");
            }
        });

        buttonRows.innerHTML = ""; // Clear existing
        buttonRows.appendChild(btn);
    }
    // ...existing code...
    //#endregion

    //#region doc action form conditional rendering

    const actionForm = document.getElementById("action-form");
    if (actionForm) {
        // Permission logic: must be signatory, superadmin, doc author, assigned user, or user in assigned department, and doc must be open
        const isSuperAdmin = me.role === "superadmin";
        const isSignatory = me.id === doc.data[0].signatory;
        const isAuthor = me.id === doc.data[0].author;
        const isAssignedUser = doc.data[0].assignedUser && me.id === doc.data[0].assignedUser;
        const isInAssignedDept = doc.data[0].assignedDepartment && me.department?.id === doc.data[0].assignedDepartment;
        const isOpen = doc.data[0].status === "open";

        if (
            !isOpen ||
            (!isSuperAdmin && !isSignatory && !isAuthor && !isAssignedUser && !isInAssignedDept)
        ) {
            actionForm.remove();
        } else {
            // Setup dynamic fields
            const actionTypeSelect = actionForm.querySelector("#actionType");
            const detailsField = actionForm.querySelector("#details")?.closest("div");

            // Helper to create recipient select
            const createRecipientSelect = async (type) => {
                let select = document.createElement("select");
                select.className = "form-select";
                select.name = "recipient";
                select.id = "recipient";
                select.required = true;

                let label = document.createElement("label");
                label.className = "form-label required";
                label.htmlFor = "recipient";
                if (type === "department") {
                    label.textContent = "Department to transfer";
                    // Fetch departments
                    const res = await fetch(`${API_URL}/api/departments`, { credentials: "include" });
                    if (!res.ok) {
                        showActionAlert("Failed to load departments.");
                        return null;
                    }

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
                    select.innerHTML = `<option value="">Select Department</option>`;
                    data.data.forEach(dept => {
                        select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
                    });
                } else if (type === "user") {
                    label.textContent = "User to assign";
                    // Fetch users
                    const res = await fetch(`${API_URL}/api/users`, { credentials: "include" });
                    if (!res.ok) {
                        showActionAlert("Failed to load users.");
                        return null;
                    }

                    /**
                    * @type {{message: string, count: number,data: {
                    * department: { id: number; name: string } | null;
                    * id: number;
                    * role: "superadmin" | "admin" | "clerk" | "officer";
                    * name: string;
                    * username: string;
                    * createdAt: string | null;
                    * }[]}}
                    */
                    const data = await res.json();
                    select.innerHTML = `<option value="">Select User</option>`;
                    // Only users in the same department as the author
                    data.data
                        .filter(user => user.department && user.department.id === me.department?.id)
                        .forEach(user => {
                            select.innerHTML += `<option value="${user.id}">${user.name} (${user.department?.name})</option>`;
                        });
                }
                const wrapper = document.createElement("div");
                wrapper.appendChild(label);
                wrapper.appendChild(select);
                return wrapper;
            };

            // Dynamic field logic
            let recipientField = null;

            async function updateRecipientField() {
                // Remove old recipient field if exists
                if (recipientField && recipientField.parentNode) {
                    recipientField.parentNode.removeChild(recipientField);
                    recipientField = null;
                }
                const actionType = actionTypeSelect.value;
                if (actionType === "transfer") {
                    recipientField = await createRecipientSelect("department");
                    if (recipientField && detailsField) {
                        actionForm.insertBefore(recipientField, detailsField);
                    }
                } else if (actionType === "assign") {
                    recipientField = await createRecipientSelect("user");
                    if (recipientField && detailsField) {
                        actionForm.insertBefore(recipientField, detailsField);
                    }
                }
            }

            actionTypeSelect.addEventListener("change", updateRecipientField);
            // Initial call
            updateRecipientField();

            // Form submission
            actionForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                showActionAlert(""); // Clear previous

                const actionType = actionTypeSelect.value;
                const details = actionForm.querySelector("#details").value;
                let recipient = null;
                let recipientType = null;

                if (actionType === "transfer" || actionType === "assign") {
                    const recipientInput = actionForm.querySelector("#recipient");
                    if (!recipientInput || !recipientInput.value) {
                        showActionAlert("Please select a recipient.");
                        return;
                    }
                    recipient = recipientInput.value;
                    recipientType = actionType === "transfer" ? "dept" : "user";
                }

                // Build body
                const body = new URLSearchParams();
                body.append("action", actionType);
                if (recipient) body.append("recipient", recipient);
                if (recipientType) body.append("recipientType", recipientType);
                if (details) body.append("additionalDetails", details);

                try {
                    const res = await fetch(`${API_URL}/api/documents/${doc.data[0].trackingNumber}/action`, {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body
                    });
                    // if (statusRedirect(res, "href")) return;
                    if (res.ok) {
                        actionForm.reset();
                        showActionAlert("Action posted successfully", "success");
                        setTimeout(() => {
                            window.location.reload();
                        }, 500)
                    } else {
                        const data = await res.json();
                        showActionAlert(data?.message || "Failed to perform action.");
                    }
                } catch (err) {
                    showActionAlert("Network error. Please try again.");
                }
            });
        }
    }
    //#endregion

    //#region doc thread
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

    const docThread = document.getElementById("docThread");
    if (docThread) {
        // Remove all existing .thread-item (if any)
        docThread.querySelectorAll(".thread-item").forEach(el => el.remove());

        /**
         * Fetch and render document logs
         */
        async function renderDocumentLogs() {
            // Get tracking number from URL
            const urlParts = window.location.pathname.split('/');
            const tn = urlParts[urlParts.length - 1];

            // Fetch logs
            /** @type {DocumentLogsResponse} */
            const logsRes = await fetch(`${API_URL}/api/documents/${tn}/logs`, {
                credentials: "include"
            }).then(res => res.json());

            for (let i = 0; i < logsRes.data.length; ++i) {
                const log = logsRes.data[i];

                // Get location name
                let locationName = "";
                try {
                    const dept = await getDepartmentData(log.location);
                    locationName = dept?.name ?? "";
                } catch { locationName = ""; }

                // Get author info
                let authorName = "";
                let authorDept = "";
                try {
                    const author = await getUserData(log.author);
                    authorName = author?.name ?? "";
                    authorDept = author?.department?.name ?? "";
                } catch { authorName = ""; authorDept = ""; }

                // Get recipient info
                let recipientStr = "";
                if (log.recipient && log.recipientType === "user") {
                    try {
                        const user = await getUserData(log.recipient);
                        recipientStr = `${user.name}${user.department ? " (" + user.department.name + ")" : ""}`;
                    } catch { recipientStr = ""; }
                } else if (log.recipient && log.recipientType === "dept") {
                    try {
                        const dept = await getDepartmentData(log.recipient);
                        recipientStr = dept.name;
                    } catch { recipientStr = ""; }
                }

                // Badge color
                const badgeClass = badgeColorProvider(log.action);

                // Thread item HTML
                const threadId = `thread-collapse-${i + 1}`;
                const threadItem = document.createElement("div");
                threadItem.className = "thread-item";
                threadItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h4 class="thread-top__text">${log.timestamp} — ${locationName}
                                <span class="badge ${badgeClass} rounded-pill fs-6">${log.action.charAt(0).toUpperCase() + log.action.slice(1)}</span>
                            </h4>
                        </div>
                        <span>
                            ${log.logMessage}
                        </span>
                    </div>
                    <div class="profile__dropdown">
                        <button class="thread-btn btn collapsed" type="button" data-bs-toggle="collapse"
                            data-bs-target="#${threadId}" aria-expanded="false"
                            aria-controls="${threadId}">▼</button>
                    </div>
                </div>
                <div class="thread-collapse collapse" id="${threadId}">
                    <hr>
                    <h5><b>Additional Details</b></h5>
                    <p>${log.additionalDetails ? log.additionalDetails : "<i>No additional details</i>"}</p>
                    <hr>
                    <div><b>Current Location</b> <span>${locationName}</span></div>
                    <div><b>Action Author</b> <span>${authorName}${authorDept ? " (" + authorDept + ")" : ""}</span></div>
                    ${recipientStr ? `<div><b>Recipient</b> <span>${recipientStr}</span></div>` : ""}
                </div>
            `;
                docThread.appendChild(threadItem);
            }
        }

        renderDocumentLogs();
    }
    //#endregion
}

document.addEventListener("DOMContentLoaded", loadPageData);