// @ts-nocheck
// jquery 😭😭😭

/**@import {UsersResponse} from "./constants.js" */
import { API_URL } from "./constants.js";
import { statusRedirect } from "./statusRedirect.js";

const getUsers = async () => {
    try {

        const res = await fetch(`${API_URL}/api/users`, {
            credentials: "include"
        })
        if (statusRedirect(res, "href")) return;

        /**@type {UsersResponse} */
        const users = await res.json();

        let data = users.data.map((u) => {
            return {
                id: u.id.toString(),
                text: `${u.name} (${u.department.name})`
            }
        })

        data.unshift({
            id: "",
            text: "Select an option",
            selected: true,
            disabled: true,
        })
        return data;

    } catch (e) {
        console.error(e);
    }
}

$(document).ready(async function () {
    $('#summernote').summernote({
        placeholder: "Write details here",
        height: 100
    });

    $("#docType").select2({
        theme: 'bootstrap-5',
        data: docTypes
    });


    getUsers().then((res) => {
        $("#signatory").select2({
            theme: 'bootstrap-5',
            minimumInputLength: 2,
            data: res,
        });
    }).catch(e => {
        console.error(e);
    })

})

const docTypes = [
    { id: "", text: "Select an Option", selected: true, disabled: true },
    { id: "Affidavit Form", text: "Affidavit Form" },
    { id: "Animal Health Certificate", text: "Animal Health Certificate" },
    { id: "Architectural Sketch Plan", text: "Architectural Sketch Plan" },
    { id: "Authorization to Purchase Bidding Documents", text: "Authorization to Purchase Bidding Documents" },
    { id: "Barangay Certification", text: "Barangay Certification" },
    { id: "Barangay Clearance", text: "Barangay Clearance" },
    { id: "Bike Registration Form", text: "Bike Registration Form" },
    { id: "Building Permit Application", text: "Building Permit Application" },
    { id: "Business Permit Application", text: "Business Permit Application" },
    { id: "Business Retirement Form- Barangay Budget Review Form", text: "Business Retirement Form- Barangay Budget Review Form" },
    { id: "Case Study Report Form", text: "Case Study Report Form" },
    { id: "Certification of Gross Sales", text: "Certification of Gross Sales" },
    { id: "Certified True Copy of Civil Documents", text: "Certified True Copy of Civil Documents" },
    { id: "Certified True Copy of Permit", text: "Certified True Copy of Permit" },
    { id: "Certified True Copy Request", text: "Certified True Copy Request" },
    { id: "CCTV Footage Request Form", text: "CCTV Footage Request Form" },
    { id: "Communications Intake Form", text: "Communications Intake Form" },
    { id: "Community Tax Certificate (Cedula)", text: "Community Tax Certificate (Cedula)" },
    { id: "Consent to Marry (Form 92)", text: "Consent to Marry (Form 92)" },
    { id: "Cooperative Accreditation Form", text: "Cooperative Accreditation Form" },
    { id: "COVID-19 Test Kit Request", text: "COVID-19 Test Kit Request" },
    { id: "Death Registration Form", text: "Death Registration Form" },
    { id: "Development Permit", text: "Development Permit" },
    { id: "Disbursement Voucher (DV)", text: "Disbursement Voucher (DV)" },
    { id: "Drainage Plan", text: "Drainage Plan" },
    { id: "E-Services Access Form", text: "E-Services Access Form" },
    { id: "Electrical Permit Form", text: "Electrical Permit Form" },
    { id: "Engineering Evaluation Report", text: "Engineering Evaluation Report" },
    { id: "Environmental Clearance Application", text: "Environmental Clearance Application" },
    { id: "Environmental Clearance Form", text: "Environmental Clearance Form" },
    { id: "Event Coordination Form", text: "Event Coordination Form" },
    { id: "Excavation Permit Form", text: "Excavation Permit Form" },
    { id: "Fire Safety Inspection Certificate Application", text: "Fire Safety Inspection Certificate Application" },
    { id: "Gate Pass Form", text: "Gate Pass Form" },
    { id: "Health Surveillance Data Request Form", text: "Health Surveillance Data Request Form" },
    { id: "HIV Self-Test Request", text: "HIV Self-Test Request" },
    { id: "Housing Assistance Application", text: "Housing Assistance Application" },
    { id: "IT Service Request Form", text: "IT Service Request Form" },
    { id: "Investment Incentive Application", text: "Investment Incentive Application" },
    { id: "Job Order Contract Form", text: "Job Order Contract Form" },
    { id: "Joint Venture Agreement Form", text: "Joint Venture Agreement Form" },
    { id: "Journal Entry Voucher (JEV)", text: "Journal Entry Voucher (JEV)" },
    { id: "Leave Application Form", text: "Leave Application Form" },
    { id: "Leafletting Permit Form", text: "Leafletting Permit Form" },
    { id: "Legal Request Form", text: "Legal Request Form" },
    { id: "Legitimation Form", text: "Legitimation Form" },
    { id: "Live Birth Registration Form", text: "Live Birth Registration Form" },
    { id: "Loading/Unloading Zone Application", text: "Loading/Unloading Zone Application" },
    { id: "Logistics/Manpower Request Form", text: "Logistics/Manpower Request Form" },
    { id: "Market Stall Application", text: "Market Stall Application" },
    { id: "Marriage License Application (Form 90)", text: "Marriage License Application (Form 90)" },
    { id: "Media Request Form", text: "Media Request Form" },
    { id: "Monthly Remittance Report", text: "Monthly Remittance Report" },
    { id: "Occupancy Certification", text: "Occupancy Certification" },
    { id: "Park Activity Permit", text: "Park Activity Permit" },
    { id: "Park Venue Reservation Form", text: "Park Venue Reservation Form" },
    { id: "Personnel Data Sheet", text: "Personnel Data Sheet" },
    { id: "Pet Registration Form", text: "Pet Registration Form" },
    { id: "Project Procurement Management Plan", text: "Project Procurement Management Plan" },
    { id: "Property Assessment Request", text: "Property Assessment Request" },
    { id: "Public Assistance Request Form", text: "Public Assistance Request Form" },
    { id: "Public Complaint Form", text: "Public Complaint Form" },
    { id: "Purchase Request", text: "Purchase Request" },
    { id: "QCitizen ID Application", text: "QCitizen ID Application" },
    { id: "Rabies Vaccination Certificate", text: "Rabies Vaccination Certificate" },
    { id: "Real Property Lease Application", text: "Real Property Lease Application" },
    { id: "Real Property Verification Form", text: "Real Property Verification Form" },
    { id: "Remittance List", text: "Remittance List" },
    { id: "Research Data Request Form", text: "Research Data Request Form" },
    { id: "Resettlement Certificate", text: "Resettlement Certificate" },
    { id: "Sales Declaration", text: "Sales Declaration" },
    { id: "Sanitary Permit Application", text: "Sanitary Permit Application" },
    { id: "Sealing & Licensing of Weights & Measures Form", text: "Sealing & Licensing of Weights & Measures Form" },
    { id: "Signboard Permit Form", text: "Signboard Permit Form" },
    { id: "Site Development Plan", text: "Site Development Plan" },
    { id: "Site Survey Report", text: "Site Survey Report" },
    { id: "Small Business Registration", text: "Small Business Registration" },
    { id: "Solo Parent ID Application", text: "Solo Parent ID Application" },
    { id: "Specimen Collection Request", text: "Specimen Collection Request" },
    { id: "Sports Event Registration", text: "Sports Event Registration" },
    { id: "Sports Facility Booking Form", text: "Sports Facility Booking Form" },
    { id: "Statement of Funding Sources", text: "Statement of Funding Sources" },
    { id: "Supplemental Budget Form", text: "Supplemental Budget Form" },
    { id: "Tax Declaration Request", text: "Tax Declaration Request" },
    { id: "Tour Operator Registration", text: "Tour Operator Registration" },
    { id: "Tourism Event Permit", text: "Tourism Event Permit" },
    { id: "Traffic Clearance Permit", text: "Traffic Clearance Permit" },
    { id: "Transfer Tax Form", text: "Transfer Tax Form" },
    { id: "Transport Support Service Request", text: "Transport Support Service Request" },
    { id: "Tree Cutting Permit", text: "Tree Cutting Permit" },
    { id: "Unified Business Permit Application", text: "Unified Business Permit Application" },
    { id: "Venue Request Form", text: "Venue Request Form" },
    { id: "Vendor Accreditation Form", text: "Vendor Accreditation Form" },
    { id: "Vehicle Access Permit", text: "Vehicle Access Permit" },
    { id: "Youth Council Accreditation Form", text: "Youth Council Accreditation Form" },
    { id: "Youth Program Application", text: "Youth Program Application" },
    { id: "Zoning Certificate", text: "Zoning Certificate" },
    { id: "Zoning Clearance", text: "Zoning Clearance" }
];

const submitHandling = async () => {
    const formElem = document.getElementById("new-doc-form");
    const btn = document.getElementById("form-submit");

    if (!(formElem instanceof HTMLFormElement)) return;
    if (!(btn instanceof HTMLButtonElement)) return;

    formElem.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!formElem.checkValidity()) {
            event.stopPropagation();
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Submitting...`

        /** @type {HTMLInputElement} */
        const titleValue = formElem.elements["title"]

        const docTypeValue = $("#docType").select2('data')[0].id
        const signatoryValue = $("#signatory").select2('data')[0].id
        const detailsValue = $('#summernote').summernote('code');

        const res = await fetch(`${API_URL}/api/documents`, {
            method: "POST",
            body: new URLSearchParams({
                title: titleValue.value,
                type: docTypeValue,
                details: detailsValue,
                signatory: signatoryValue
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            credentials: "include"
        })

        /**
         * @type {{message: string, insertedData: {
         * id: number;
         * trackingNumber: string;
        * }[]
         *}}
         */
        const data = await res.json();

        if (!res.ok) {
            btn.disabled = false;
            btn.innerHTML = "Submit"
            if (alertPlaceholder) alertPlaceholder.innerHTML = `<div class="alert alert-danger" role="alert">An error occurred.</div>`;
            console.error(await res.json());
        } else {
            btn.disabled = true;
            btn.innerHTML = data.message;
            setTimeout(() => {
                window.location.href = `/documents/${data.insertedData[0].trackingNumber}`
            }, 1000)
        }
    })
}

document.addEventListener("DOMContentLoaded", submitHandling);