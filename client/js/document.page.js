import { API_URL } from "./constants.js";
import { getDepartmentData, getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

const loadPageData = async () => {
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

    //TODO: implement document thread
    //TODO: implement documetn action guard
    //TODO: implement documetn action functionality
}

document.addEventListener("DOMContentLoaded", loadPageData);