import { statusRedirect, redirect } from "./statusRedirect.js";
import { API_URL } from "./constants.js";

(async () => {
    try {
        const res = await fetch(`${API_URL}/api/check`, { credentials: "include" });
        const redirected = statusRedirect(res, "replace");
        if (!redirected) redirect("./dashboard.html", "replace");

    } catch (e) {
        window.location.replace("./servererror.html");
    }
})();