import { statusRedirect, redirect } from "./statusRedirect.js";

const API_URL = "http://localhost:54321";

(async () => {
    try {
        const res = await fetch(`${API_URL}/api/check`, { credentials: "include" });
        const redirected = statusRedirect(res, "replace");
        if (!redirected) redirect("./dashboard.html", "replace");

    } catch (e) {
        window.location.replace("./servererror.html");
    }
})();