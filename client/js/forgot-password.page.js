import { API_URL } from "./constants.js";
import { redirect } from "./statusRedirect.js";

/**
 * Displays an alert message in the action alert placeholder
 * @param {string} message - The message to display
 * @param {"success"|"danger"|"warning"|"info"} type - The type of alert
 */
function showAlert(message, type = "danger") {
    const alertPlaceholder = window.document.getElementById("alertPlaceholder");
    if (!alertPlaceholder) return;

    alertPlaceholder.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

/**
 * Updates the submit button state
 * @param {HTMLButtonElement} button - The form submit button
 * @param {boolean} loading - Whether to show loading state
 * @param {string|null} customText - Custom text to display
 */
function updateSubmitButton(button, loading = false, customText = null) {
    if (!button) return;

    if (loading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Submitting...`;
    } else if (customText) {
        button.disabled = true;
        button.innerHTML = customText;
    } else {
        button.disabled = false;
        button.innerHTML = "Submit";
    }
}

/**
 * Handles the  form submission
 * @param {SubmitEvent} ev - The form submit event
 */
const handleFormSubmit = async (ev) => {
    ev.preventDefault();

    if (!(ev.target instanceof HTMLFormElement)) return;

    const form = ev.target;

    /**@type {HTMLInputElement} */
    const username = form.elements["username"]

    /**@type {HTMLInputElement} */
    const email = form.elements["email"]

    /**@type {HTMLButtonElement} */
    const submitButton = form.elements["form-submit"]

    updateSubmitButton(submitButton, true)

    try {

        const response = await fetch(`${API_URL}/api/forgot-password`, {
            method: "POST",
            body: new URLSearchParams({
                username: username.value,
                email: email.value
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",
        })

        /** @type {{ message: string }} */
        const data = await response.json();

        if (!response.ok) {
            updateSubmitButton(submitButton, false);
            showAlert(data.message ?? "An Error occurred.", "danger")
        } else {
            updateSubmitButton(submitButton, false);
            showAlert(data.message, "success")
            setTimeout(() => {
                redirect("/login", "href");
            }, 1000)
        }

    } catch (error) {
        updateSubmitButton(submitButton, false);
        showAlert("An error occured.", "danger")
    }

}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgotForm")

    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
})