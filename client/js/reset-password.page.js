import { API_URL } from "./constants.js";
import { redirect, statusRedirect } from "./statusRedirect.js";

/**
 * Gets the token from the URL
 * @returns {string|null} token
 */
const getTokenFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("token")
}

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
            Resetting...`;
    } else if (customText) {
        button.disabled = true;
        button.innerHTML = customText;
    } else {
        button.disabled = false;
        button.innerHTML = "Reset";
    }
}

/**
 * checks if the token is still valid. 
 * if not force to return to login page.
 * @param {string} token 
 */
const checkTokenValidity = async (token) => {
    try {

        const response = await fetch(`${API_URL}/api/reset-check`, {
            method: "POST",
            body: new URLSearchParams({
                token: token
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",
        })

        if (statusRedirect(response, "replace")) return;

    } catch (e) {
        console.error(e);
    }
}

/**
 * Handles the  form submission
 * @param {SubmitEvent} ev - The form submit event
 */
const handleFormSubmit = async (ev) => {
    ev.preventDefault()
    if (!(ev.target instanceof HTMLFormElement)) return;

    const token = getTokenFromUrl();
    if (!token) return redirect("/login", "replace");

    const form = ev.target;

    /**@type {HTMLInputElement} */
    const newPassword = form.elements["newPassword"]

    /**@type {HTMLButtonElement} */
    const submitButton = form.elements["form-submit"]

    updateSubmitButton(submitButton, true)

    try {
        const response = await fetch(`${API_URL}/api/reset-password`, {
            method: "POST",
            body: new URLSearchParams({
                token: token,
                newPassword: newPassword.value
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include",
        })

        if (statusRedirect(response, "replace")) return;

        if (!response.ok) {
            const data = await response.json()
            updateSubmitButton(submitButton, false);
            showAlert(data.message ?? "An Error occurred.", "danger")
        } else {
            updateSubmitButton(submitButton, false);
            showAlert("Password has been reset successfully!", "success")
            setTimeout(() => {
                redirect("/login", "replace");
            }, 1000)
        }

    } catch (error) {
        updateSubmitButton(submitButton, false);
        showAlert("An error occurred.", "danger")
    }

}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("resetForm")
    const token = getTokenFromUrl();

    if (token === null) {
        redirect("/login", "replace")
    } else {
        await checkTokenValidity(token);
    }

    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
})