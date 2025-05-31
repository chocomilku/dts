// @ts-check
/**
 * Redirects to a specific page based on the status code of a fetch request.
 * @param {Response} res Response object from a fetch Request
 * @param {"href" | "replace"} redirectType type of redirection.
 * - `href` = previous page before the redirection can be returned with back
 * - `replace` = previous page before the redirection cannot be returned with back
 * @returns boolean
 */
const statusRedirect = (res, redirectType) => {
    if (res.ok) return false;

    switch (res.status) {
        case 401:
            redirect("./login.html", redirectType)
            return true;
        case 403:
            redirect("./forbidden.html", redirectType)
            return true;
        case 404:
            redirect("./notfound.html", redirectType)
            return true;
        case 500:
            redirect("./servererror.html", redirectType)
            return true;
        default:
            return false;
    }
}

/**
 * Redirection methods
 * @param {string} page String URL to redirect to
 * @param {"href" | "replace"} redirectType type of redirection.
 * - `href` = previous page before the redirection can be returned with back
 * - `replace` = previous page before the redirection cannot be returned with back
 */
const redirect = (page, redirectType) => {
    switch (redirectType) {
        case "href":
            window.location.href = page
            break;
        case "replace":
            window.location.replace(page);
            break;
    }
}

export { statusRedirect, redirect };
