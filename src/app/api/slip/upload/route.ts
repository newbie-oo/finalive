import { NextResponse } from "next/server";
import { apiRouteRaw } from "@/lib/api-route";
import { uploadSlip } from "@/server/actions/slip";
import { rateLimitConfigs } from "@/lib/rate-limit";

export const POST = apiRouteRaw({
	auth: "required",
	rateLimit: rateLimitConfigs.upload,
	handler: async ({ req, user: _user }) => {
		let formData: FormData;
		try {
			formData = await req.formData();
		} catch {
			return { code: "validation_failed", message: "invalid form data" };
		}

		const pendingId = formData.get("pendingId");
		const file = formData.get("slip");
		const reportedAmount = formData.get("reportedAmount");

		if (typeof pendingId !== "string" || pendingId.length === 0) {
			return NextResponse.json(
				{ code: "validation_failed", message: "pendingId required" },
				{ status: 400 },
			);
		}
		if (!(file instanceof File)) {
			return NextResponse.json(
				{ code: "validation_failed", message: "slip file required" },
				{ status: 400 },
			);
		}

		const buf = Buffer.from(await file.arrayBuffer());

		const result = await uploadSlip({
			pendingId,
			bytes: buf,
			reportedAmount:
				typeof reportedAmount === "string" && reportedAmount.length > 0
					? reportedAmount
					: undefined,
		});

		return NextResponse.redirect(
			new URL(`/checkout/${result.pendingId}/success`, req.url),
			303,
		);
	},
});
