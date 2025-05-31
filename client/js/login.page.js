import { API_URL } from "./constants.js";
import { redirect } from "./statusRedirect.js"

(() => {
    const forms = document.getElementsByTagName("form");
    const username = document.getElementById("username")
    const password = document.getElementById("password")
    if (!(username instanceof HTMLInputElement)) return;
    if (!(password instanceof HTMLInputElement)) return;

    const formFields = [username, password];

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', async event => {
            event.preventDefault()
            if (!form.checkValidity()) {
                event.stopPropagation()
                formFields.forEach((f) => {
                    if (f.nextElementSibling && f.nextElementSibling instanceof HTMLElement) {
                        f.nextElementSibling.innerText = f.nextElementSibling.dataset["originalMessage"] ?? ""
                    }

                    if (f.checkValidity()) {
                        f.classList.remove("is-invalid");
                        f.classList.add("is-valid");
                    } else {
                        f.classList.remove("is-valid");
                        f.classList.add("is-invalid");
                    }
                })
            } else {
                const btn = document.getElementById("form-submit");
                if (!btn) return;
                if (!(btn instanceof HTMLButtonElement)) return;

                btn.disabled = true;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Signing In...`

                if (!username) return;
                if (!password) return;

                const res = await fetch(`${API_URL}/api/login`, {
                    method: "POST",
                    body: new URLSearchParams({ username: username.value, password: password.value }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    credentials: "include"
                })

                /**
                 * @type {{ message: string }}
                 */
                const data = await res.json();

                if (!res.ok) {
                    btn.disabled = false;
                    btn.innerHTML = `Log In`
                    formFields.forEach(async (f) => {
                        if (f.nextElementSibling && f.nextElementSibling instanceof HTMLElement) {
                            f.nextElementSibling.innerText = data.message
                        }

                        f.classList.remove("is-valid");
                        f.classList.add("is-invalid");
                    })
                } else {
                    btn.disabled = true;
                    btn.innerHTML = data.message;
                    redirect("/dashboard.html", "replace");
                }

            }
        }, false)
    })
})()
