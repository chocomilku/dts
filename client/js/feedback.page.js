import { API_URL } from "./constants.js";
import { getUserData } from "./fetchHelpers.js";
import { statusRedirect } from "./statusRedirect.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Set up the form submit handling
    await setupFormSubmission();
});

const setupFormSubmission = async () => {
    const alertPlaceholder = document.createElement("div");
    alertPlaceholder.id = "alert-placeholder";

    // Get the form and insert the alert placeholder before it
    const formElem = document.getElementById("feedbackForm");
    if (!formElem || !formElem.parentNode) return;

    formElem.parentNode.insertBefore(alertPlaceholder, formElem);

    const submitBtn = document.getElementById("form-submit");
    if (!(submitBtn instanceof HTMLButtonElement)) return;

    // Initialize current user
    try {
        await getUserData("@me"); // Ensure user is logged in
    } catch (e) {
        console.error("Failed to load user data", e);
        // Redirect to login if not authenticated
        window.location.href = "/login";
        return;
    }

    formElem.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Get the feedback text
        const detailsElem = document.getElementById("details");
        if (!(detailsElem instanceof HTMLTextAreaElement)) return;

        const feedback = detailsElem.value.trim();

        if (!feedback) {
            showAlert("Please enter your feedback before submitting.", "danger");
            return;
        }

        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...`;

        try {
            // Submit the feedback
            const response = await fetch(`${API_URL}/api/feedbacks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    feedback: feedback
                }),
                credentials: "include"
            });

            if (statusRedirect(response, "href")) return;

            const data = await response.json();

            if (response.ok) {
                // Show success message
                showAlert("Thank you! Your feedback has been submitted successfully.", "success");
                // Reset the form
                detailsElem.value = "";
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerText = "Submit";
            } else {
                // Show error message
                showAlert(data.message || "An error occurred while submitting your feedback. Please try again.", "danger");
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerText = "Submit";
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            showAlert("An unexpected error occurred. Please try again later.", "danger");
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit";
        }
    });
};

/**
 * Shows an alert message in the alert placeholder
 * @param {string} message - The message to display
 * @param {string} type - The Bootstrap alert type (success, danger, warning, info)
 */
const showAlert = (message, type = "success") => {
    const alertPlaceholder = document.getElementById("alert-placeholder");
    if (!alertPlaceholder) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    alertPlaceholder.innerHTML = "";
    alertPlaceholder.appendChild(wrapper);

    // Auto-dismiss success alerts after 5 seconds
    if (type === "success") {
        setTimeout(() => {
            const alertElement = wrapper.querySelector('.alert');
            if (alertElement) {
                // Remove the alert after 5 seconds
                alertElement.classList.remove('show');
                setTimeout(() => {
                    alertElement.remove();
                }, 150);
            }
        }, 5000);
    }
};
