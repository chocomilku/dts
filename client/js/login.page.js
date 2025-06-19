/**
 * Login Page Module
 * Handles form submission and user authentication
 */
import { API_URL } from "./constants.js";
import { redirect } from "./statusRedirect.js";

/**
 * Validates form fields and updates their UI state
 * @param {HTMLInputElement[]} fields - Input fields to validate
 * @param {boolean} resetMessages - Whether to reset error messages to their original state
 * @param {string|null} errorMessage - Custom error message to display for invalid fields
 * @param {boolean} forceInvalidate - force invalidate form fields to show errors such as auth or network error
 */
function validateFields(fields, resetMessages = true, errorMessage = null, forceInvalidate = false) {
    fields.forEach(field => {
        // Get feedback element
        const feedbackEl = field.nextElementSibling;

        // Update message if it's an HTML element
        if (feedbackEl instanceof HTMLElement) {
            if (resetMessages) {
                feedbackEl.innerText = feedbackEl.dataset.originalMessage || "";
            } else if (errorMessage) {
                feedbackEl.innerText = errorMessage;
            }
        }

        if (!forceInvalidate) {
            // Update field classes based on validity
            if (field.checkValidity()) {
                field.classList.remove("is-invalid");
                field.classList.add("is-valid");
            } else {
                field.classList.remove("is-valid");
                field.classList.add("is-invalid");
            }
        } else {
            field.classList.remove("is-valid");
            field.classList.add("is-invalid");
        }
    });
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
            Signing In...`;
    } else if (customText) {
        button.disabled = true;
        button.innerHTML = customText;
    } else {
        button.disabled = false;
        button.innerHTML = "Log In";
    }
}

/**
 * Handles the login form submission
 * @param {Event} event - The form submit event
 */
async function handleLoginSubmit(event) {
    event.preventDefault();

    // Get form and input elements
    if (!(event.target instanceof HTMLFormElement)) {
        console.error("Event target is not a form element");
        return;
    }

    const form = event.target;
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const submitButton = document.getElementById("form-submit");

    // Validate input elements
    if (!(username instanceof HTMLInputElement) ||
        !(password instanceof HTMLInputElement) ||
        !(submitButton instanceof HTMLButtonElement)) {
        console.error("Required form elements not found or have incorrect types");
        return;
    }

    const formFields = [username, password];

    // Handle form validation failure
    if (!form.checkValidity()) {
        event.stopPropagation();
        validateFields(formFields, true);
        return;
    }

    // Show loading state
    updateSubmitButton(submitButton, true);

    try {
        // Send login request
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            body: new URLSearchParams({
                username: username.value,
                password: password.value
            }),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            credentials: "include"
        });

        // Parse response
        /** @type {{ message: string }} */
        const data = await response.json();

        // Handle response based on success/failure
        if (!response.ok) {
            updateSubmitButton(submitButton, false);
            validateFields(formFields, false, data.message, true);
        } else {
            updateSubmitButton(submitButton, false, data.message);
            redirect("/dashboard", "replace");
        }
    } catch (error) {
        console.error("Login failed:", error);
        updateSubmitButton(submitButton, false);
        validateFields(formFields, false, "Network error. Please try again.", true);
    }
}

// Initialize login form when document is ready
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    } else {
        console.error("Login form not found");
    }
});
