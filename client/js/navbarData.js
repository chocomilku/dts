import { getUserData } from "./fetchHelpers.js";

const loadUserData = async () => {
    try {
        const user = await getUserData("@me");
        const nameElem = document.getElementsByClassName('profile__name')
        const deptElem = document.getElementsByClassName('profile__dept')

        if (nameElem) {
            for (let i = 0; i < nameElem.length; i++) {
                nameElem[i].textContent = user.name ?? "Unknown";
            }

        }

        if (deptElem) {
            for (let i = 0; i < deptElem.length; i++) {
                let content = "No Department";
                if (user.department) {
                    content = `${user.department.name} (${user.role})`
                }

                deptElem[i].textContent = content;
            }
        }

    } catch (e) {
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);

// Logout handler
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await fetch("/api/logout", {
                    method: "POST",
                    credentials: "include"
                });
                window.location.href = "/login";
            } catch (err) {
                console.error("Logout failed", err);
            }
        });
    }
});