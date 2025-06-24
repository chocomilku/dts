import app from "@app";
import { mailTransporter } from "@mail/mail";

(async () => {
	await mailTransporter.verify((er, s) => {
		if (er) {
			console.error(er);
			return process.exit(1);
		}
	});
})();

export default {
	port: 54321,
	fetch: app.fetch,
};
