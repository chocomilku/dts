/**
 * Document Page Module - Displays and manages document details, actions, and history
 * @module document-page
 * @import { DocumentsResponse, DepartmentsResponse, UsersResponse, DocumentLogsResponse, Document, User } from "./constants.js"
 */
import { API_URL, dbDateTransformer, pillBadgeProvider } from "./constants.js";
import { getDepartmentData, getUserData, badgeColorProvider } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

/**
 * Displays an alert message in the action alert placeholder
 * @param {string} message - The message to display
 * @param {"success"|"danger"|"warning"|"info"} type - The type of alert
 */
function showActionAlert(message, type = "danger") {
    const actionAlertPlaceholder = window.document.getElementById("actionAlertPlaceholder");
    if (!actionAlertPlaceholder) return;

    actionAlertPlaceholder.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

/**
 * Gets the tracking number from the URL
 * @returns {string} The document tracking number
 */
function getTrackingNumberFromUrl() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[urlParts.length - 1];
}

/**
 * Fetches the document data and current user
 * @returns {Promise<{document: Document, currentUser: User} | null>} The document and current user or null if error
 */
async function fetchDocumentData() {
    try {
        const trackingNumber = getTrackingNumberFromUrl();

        const res = await fetch(`${API_URL}/api/documents/${trackingNumber}`, {
            credentials: "include"
        });

        if (statusRedirect(res, "href")) return null;
        if (!res.ok) {
            showActionAlert("Failed to fetch document data");
            return null;
        }

        /** @type {DocumentsResponse} */
        const docResponse = await res.json();

        if (!docResponse?.data?.length) {
            showActionAlert("No document data found");
            return null;
        }

        const currentUser = await getUserData("@me");

        return {
            document: docResponse.data[0],
            currentUser
        };
    } catch (error) {
        console.error("Error fetching document data:", error);
        showActionAlert("An error occurred while loading document data");
        return null;
    }
}

/**
 * Formats the first letter of a string to uppercase
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Renders the document details section
 * @param {Document} doc - The document object
 * @param {User} currentUser - The current user
 */
async function renderDocumentDetails(doc, currentUser) {
    try {
        // DOM elements
        const docTrackingNumber = window.document.getElementById("docTrackingNumber");
        const docTitle = window.document.getElementById("docTitle");
        const docDetails = window.document.getElementById("docDetails");
        const docAttributes = window.document.getElementById("docAttributes");

        if (!docTrackingNumber || !docTitle || !docDetails || !docAttributes) {
            console.error("Document detail elements not found");
            return;
        }

        // Fetch related data
        const [originDeptData, authorData, signatoryData] = await Promise.all([
            getDepartmentData(doc.originDepartment),
            getUserData(doc.author),
            getUserData(doc.signatory)
        ]);

        // Process assignment information
        let assignedTo = "No one";
        let isAssignedToMe = false;

        if (doc.assignedDepartment != null) {
            try {
                const deptData = await getDepartmentData(doc.assignedDepartment);
                assignedTo = deptData?.name || "Unknown Department";

                if (currentUser.department && currentUser.department.id === doc.assignedDepartment) {
                    isAssignedToMe = true;
                }
            } catch (error) {
                console.error("Error fetching assigned department:", error);
            }
        } else if (doc.assignedUser != null) {
            try {
                const userData = await getUserData(doc.assignedUser);
                assignedTo = `${userData?.name || "Unknown"} (${userData?.department?.name || "No Department"})`;

                if (currentUser.id === doc.assignedUser) {
                    isAssignedToMe = true;
                }
            } catch (error) {
                console.error("Error fetching assigned user:", error);
            }
        }

        // Document attributes
        const attributes = [
            { key: "Origin Department", value: originDeptData?.name || "Unknown" },
            { key: "Document Type", value: doc.type || "Unspecified" },
            { key: "Author", value: `${authorData?.name || "Unknown"} (${authorData?.department?.name || "No Department"})` },
            { key: "Currently Assigned to", value: assignedTo },
            { key: "Signatory", value: `${signatoryData?.name || "Unknown"} (${signatoryData?.department?.name || "No Department"})` },
            { key: "Created At", value: doc.createdAt ? dbDateTransformer(doc.createdAt).toLocaleString() : "Unknown" },
            { key: "Last Updated At", value: doc.lastUpdatedAt ? dbDateTransformer(doc.lastUpdatedAt).toLocaleString() : "Unknown" },
            { key: "Due At", value: doc.dueAt ? dbDateTransformer(doc.dueAt).toLocaleString() : "No Due Date" },
        ];

        // Update DOM content
        docTrackingNumber.innerText = doc.trackingNumber;

        // Remove any existing badges (if re-rendered)
        const siblings = [];
        let next = docTrackingNumber.nextSibling;
        while (next) {
            if (next.nodeType === Node.ELEMENT_NODE && next instanceof Element && next.classList.contains('badge')) {
                siblings.push(next);
            }
            next = next.nextSibling;
        }
        siblings.forEach(sibling => sibling.remove());

        /**@type {HTMLSpanElement[]} */
        const badges = [];

        // Add status badge
        badges.push(pillBadgeProvider(doc.status));

        // Add assigned badge if applicable
        if (isAssignedToMe) {
            badges.push(pillBadgeProvider("assign", "Assigned"));
        }

        const isOverdue = doc.dueAt === null ? false : new Date(doc.dueAt) <= new Date() ? true : false;

        if (isOverdue) {
            badges.push(pillBadgeProvider("overdue"));
        }

        badges.forEach((el) => {
            docTrackingNumber.parentElement?.insertAdjacentElement("beforeend", el)
        })

        docTitle.innerText = doc.title || "Untitled Document";
        docDetails.innerHTML = doc.details || "";

        // Build attributes HTML
        let docAttributesValue = "";
        attributes.forEach((attr) => {
            docAttributesValue += `<div><b>${attr.key}</b> <span>${attr.value}</span></div>`;
        });

        docAttributes.innerHTML = docAttributesValue;

    } catch (error) {
        console.error("Error rendering document details:", error);
        showActionAlert("Error displaying document details");
    }
}

/**
 * Renders the document action buttons based on permissions
 * @param {Document} doc - The document object
 * @param {User} currentUser - The current user
 */
function renderDocumentActionButtons(doc, currentUser) {
    const buttonRows = window.document.getElementById("buttonRows");
    if (!buttonRows) return;

    try {
        // Clear existing buttons
        buttonRows.innerHTML = "";

        // Permission checks
        const isSuperAdmin = currentUser.role === "superadmin";
        const isSignatory = currentUser.id === doc.signatory;
        const isAuthor = currentUser.id === doc.author;
        const isOpen = doc.status === "open";

        // Permission logic matches backend:
        // - To close: superadmin OR signatory OR author
        // - To open: superadmin OR author
        const canEdit = isOpen
            ? (isSuperAdmin || isSignatory || isAuthor)
            : (isSuperAdmin || isAuthor);

        // Create button
        const btn = window.document.createElement("button");
        btn.type = "button";
        btn.className = isOpen ? "btn btn-danger" : "btn btn-success";
        btn.textContent = isOpen ? "Close" : "Reopen";
        btn.disabled = !canEdit;

        // Button click handler
        btn.addEventListener("click", async () => {
            // Re-check permissions on click (safety)
            const allowed = isOpen
                ? (isSuperAdmin || isSignatory || isAuthor)
                : (isSuperAdmin || isAuthor);

            if (!allowed) return;

            btn.disabled = true;
            btn.textContent = isOpen ? "Closing..." : "Reopening...";

            try {
                const res = await fetch(`${API_URL}/api/documents/${doc.trackingNumber}`, {
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
            } catch (error) {
                console.error("Error updating document status:", error);
                btn.disabled = false;
                btn.textContent = isOpen ? "Close" : "Reopen";
                showActionAlert("Error updating document status.");
            }
        });

        buttonRows.appendChild(btn);

    } catch (error) {
        console.error("Error rendering action buttons:", error);
        showActionAlert("Error displaying document actions");
    }
}

/**
 * Creates a select element for recipient selection
 * @param {"department"|"user"} type - The type of recipients to display
 * @param {User} currentUser - The current user for filtering options
 * @returns {Promise<HTMLDivElement|null>} The wrapper containing the select element or null on error
 */
async function createRecipientSelect(type, currentUser) {
    try {
        // Create elements
        const select = document.createElement("select");
        select.className = "form-select";
        select.name = "recipient";
        select.id = "recipient";
        select.required = true;

        const label = document.createElement("label");
        label.className = "form-label required";
        label.htmlFor = "recipient";

        const wrapper = document.createElement("div");

        if (type === "department") {
            label.textContent = "Department to transfer";

            // Fetch departments
            const res = await fetch(`${API_URL}/api/departments`, { credentials: "include" });
            if (!res.ok) {
                showActionAlert("Failed to load departments.");
                return null;
            }

            /** @type {DepartmentsResponse} */
            const data = await res.json();

            select.innerHTML = `<option value="">Select Department</option>`;
            if (data?.data) {
                data.data.forEach(dept => {
                    select.innerHTML += `<option value="${dept.id}">${dept.name || "Unknown"}</option>`;
                });
            }
        } else if (type === "user") {
            label.textContent = "User to assign";

            // Fetch users
            const res = await fetch(`${API_URL}/api/users`, { credentials: "include" });
            if (!res.ok) {
                showActionAlert("Failed to load users.");
                return null;
            }

            /** @type {UsersResponse} */
            const data = await res.json();

            select.innerHTML = `<option value="">Select User</option>`;                // Only users in the same department as the current user
            if (data?.data && currentUser?.department?.id) {
                const filteredUsers = data.data.filter(user =>
                    user.department && user.department.id === currentUser.department?.id
                );

                filteredUsers.forEach(user => {
                    const deptName = user.department?.name || "No Department";
                    select.innerHTML += `<option value="${user.id}">${user.name || "Unknown"} (${deptName})</option>`;
                });
            }
        }

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        return wrapper;

    } catch (error) {
        console.error(`Error creating ${type} select:`, error);
        return null;
    }
}

/**
 * Sets up the document action form functionality
 * @param {Document} doc - The document object
 * @param {User} currentUser - The current user
 */
async function setupDocumentActionForm(doc, currentUser) {
    const actionForm = window.document.getElementById("action-form");
    if (!actionForm) return;

    try {
        // Permission checks
        const isSuperAdmin = currentUser.role === "superadmin";
        const isSignatory = currentUser.id === doc.signatory;
        const isAuthor = currentUser.id === doc.author;
        const isAssignedUser = doc.assignedUser && currentUser.id === doc.assignedUser;
        const isInAssignedDept = doc.assignedDepartment &&
            currentUser.department?.id === doc.assignedDepartment;
        const isOpen = doc.status === "open";

        // Remove form if no permission
        if (!isOpen || (!isSuperAdmin && !isSignatory && !isAuthor && !isAssignedUser && !isInAssignedDept)) {
            actionForm.remove();
            return;
        }

        // Get form fields
        const actionTypeSelect = actionForm.querySelector("#actionType");
        const detailsField = actionForm.querySelector("#details")?.closest("div");

        if (!actionTypeSelect || !detailsField) {
            console.error("Required form fields not found");
            return;
        }

        // Safely cast elements to their appropriate types
        const actionTypeSelectElement = /** @type {HTMLSelectElement} */ (actionTypeSelect);

        // Dynamic field management
        let recipientField = null;

        async function updateRecipientField() {
            // Remove old recipient field if it exists
            if (recipientField && recipientField.parentNode) {
                recipientField.parentNode.removeChild(recipientField);
                recipientField = null;
            }

            const actionType = actionTypeSelectElement.value;

            if (actionType === "transfer") {
                recipientField = await createRecipientSelect("department", currentUser);
                if (recipientField && actionForm && detailsField) {
                    actionForm.insertBefore(recipientField, detailsField);
                }
            } else if (actionType === "assign") {
                recipientField = await createRecipientSelect("user", currentUser);
                if (recipientField && actionForm && detailsField) {
                    actionForm.insertBefore(recipientField, detailsField);
                }
            }
        }

        // Set up action type change listener
        actionTypeSelectElement.addEventListener("change", updateRecipientField);

        // Initial setup
        await updateRecipientField();

        // Form submission handler
        actionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            showActionAlert(""); // Clear previous alerts

            const actionType = actionTypeSelectElement.value;
            const detailsInput = /** @type {HTMLTextAreaElement} */ (actionForm.querySelector("#details"));
            const details = detailsInput ? detailsInput.value : "";
            let recipient = null;
            let recipientType = null;

            // Get recipient info if needed
            if (actionType === "transfer" || actionType === "assign") {
                const recipientInput = /** @type {HTMLSelectElement} */ (actionForm.querySelector("#recipient"));
                if (!recipientInput || !recipientInput.value) {
                    showActionAlert("Please select a recipient.");
                    return;
                }
                recipient = recipientInput.value;
                recipientType = actionType === "transfer" ? "dept" : "user";
            }

            // Build request body
            const body = new URLSearchParams();
            body.append("action", actionType);
            if (recipient) body.append("recipient", recipient);
            if (recipientType) body.append("recipientType", recipientType);
            if (details) body.append("additionalDetails", details);

            try {
                const formSubmitButton = /** @type {HTMLButtonElement} */ (actionForm.querySelector("#form-submit"));
                if (formSubmitButton) {
                    formSubmitButton.disabled = true;
                }

                const res = await fetch(`${API_URL}/api/documents/${doc.trackingNumber}/action`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body
                });

                // Optional status redirect
                // if (statusRedirect(res, "href")) return;

                if (formSubmitButton) {
                    formSubmitButton.disabled = false;
                }

                if (res.ok) {
                    /** @type {HTMLFormElement} */ (actionForm).reset();
                    showActionAlert("Action posted successfully", "success");
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    const errorData = await res.json().catch(() => ({ message: "Error processing response" }));
                    showActionAlert(errorData?.message || "Failed to perform action.");
                }
            } catch (error) {
                console.error("Error submitting action:", error);
                showActionAlert("Network error. Please try again.");

                const formSubmitButton = /** @type {HTMLButtonElement} */ (actionForm.querySelector("#form-submit"));
                if (formSubmitButton) {
                    formSubmitButton.disabled = false;
                }
            }
        });

    } catch (error) {
        console.error("Error setting up document action form:", error);
        showActionAlert("Error setting up document actions");
    }
}

/**
 * Renders the document history thread
 * @param {Document} doc - The document object
 */
async function renderDocumentThread(doc) {
    const docThread = window.document.getElementById("docThread");
    if (!docThread) return;

    try {
        // Clear existing thread items
        docThread.querySelectorAll(".thread-item").forEach(el => el.remove());

        // Fetch document logs using the doc parameter
        const logsRes = await fetch(`${API_URL}/api/documents/${doc.trackingNumber}/logs`, {
            credentials: "include"
        });

        if (!logsRes.ok) {
            showActionAlert("Failed to load document history", "warning");
            return;
        }

        /** @type {DocumentLogsResponse} */
        const logsData = await logsRes.json();

        if (!logsData?.data?.length) {
            // No logs found, add message
            const emptyMessage = window.document.createElement("p");
            emptyMessage.className = "text-muted fst-italic";
            emptyMessage.textContent = "No activity has been recorded for this document.";
            docThread.appendChild(emptyMessage);
            return;
        }

        // Process and render each log entry
        for (let i = 0; i < logsData.data.length; ++i) {
            const log = logsData.data[i];

            try {
                // Get location info
                let locationName = "";
                try {
                    const dept = await getDepartmentData(log.location);
                    locationName = dept?.name || "";
                } catch (error) {
                    console.warn("Could not fetch location:", error);
                }

                // Get author info
                let authorName = "";
                let authorDept = "";
                try {
                    const author = await getUserData(log.author);
                    authorName = author?.name || "";
                    authorDept = author?.department?.name || "";
                } catch (error) {
                    console.warn("Could not fetch author:", error);
                }

                // Get recipient info
                let recipientStr = "";
                if (log.recipient && log.recipientType === "user") {
                    try {
                        const user = await getUserData(log.recipient);
                        recipientStr = `${user?.name || ""}${user?.department ? " (" + user.department.name + ")" : ""}`;
                    } catch (error) {
                        console.warn("Could not fetch user recipient:", error);
                    }
                } else if (log.recipient && log.recipientType === "dept") {
                    try {
                        const dept = await getDepartmentData(log.recipient);
                        recipientStr = dept?.name || "";
                    } catch (error) {
                        console.warn("Could not fetch department recipient:", error);
                    }
                }

                // Badge styling
                const badgeClass = badgeColorProvider(log.action);

                // Create thread item
                const threadId = `thread-collapse-${i + 1}`;
                const threadItem = window.document.createElement("div");
                threadItem.className = "thread-item";
                threadItem.innerHTML = `
                <div class="thread-visible">
                    <div>
                        <div class="thread-top">
                            <h4 class="thread-top__text">${log.timestamp ? dbDateTransformer(log.timestamp).toLocaleString() : "Unknown"} — ${locationName}
                                <span class="badge ${badgeClass} rounded-pill fs-6">${capitalizeFirst(log.action)}</span>
                            </h4>
                        </div>
                        <span>
                            ${log.logMessage || ""}
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
                    <p>${log.additionalDetails || "<i>No additional details</i>"}</p>
                    <hr>
                    <div><b>Current Location</b> <span>${locationName}</span></div>
                    <div><b>Action Author</b> <span>${authorName}${authorDept ? " (" + authorDept + ")" : ""}</span></div>
                    ${recipientStr ? `<div><b>Recipient</b> <span>${recipientStr}</span></div>` : ""}
                </div>
                `;

                docThread.appendChild(threadItem);

            } catch (error) {
                console.error("Error rendering log entry:", error);
            }
        }

    } catch (error) {
        console.error("Error rendering document thread:", error);
        showActionAlert("Error loading document history");
    }
}

/**
 * Main function to load and render page data
 */
async function loadPageData() {
    try {
        // Fetch document and user data
        const data = await fetchDocumentData();

        if (!data) return;

        const { document: doc, currentUser } = data;

        // Render different page sections
        await renderDocumentDetails(doc, currentUser);
        renderDocumentActionButtons(doc, currentUser);
        await setupDocumentActionForm(doc, currentUser);
        await renderDocumentThread(doc);

    } catch (error) {
        console.error("Error loading page data:", error);
        showActionAlert("An unexpected error occurred while loading the page");
    }
}

// Initialize when the DOM is ready
document.addEventListener("DOMContentLoaded", loadPageData);