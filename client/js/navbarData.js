import { API_URL } from "./constants.js"
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
                deptElem[i].textContent = user.department?.name ?? "No Department";
            }
        }

    } catch (e) {
        console.error(e);
        window.location.replace("/servererror");
    }
}

document.addEventListener("DOMContentLoaded", loadUserData);