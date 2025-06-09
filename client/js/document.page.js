import { API_URL } from "./constants.js";
import { getDepartmentData, getUserData } from "./fetchHelpers.js";
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

    if (doc.data[0].assignedDepartment != null) {
        const deptData = await getDepartmentData(doc.data[0].assignedDepartment);
        assignedTo = deptData.name
    } else if (doc.data[0].assignedUser != null) {
        const userData = await getUserData(doc.data[0].assignedUser);
        assignedTo = `${userData.name} (${userData.department?.name})`
    } else {
        assignedTo = "No one"
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

    //#region doc actions
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

}

document.addEventListener("DOMContentLoaded", loadPageData);