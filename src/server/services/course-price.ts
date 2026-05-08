import "server-only";

/**
 * Bidirectional invariant for the course price + isFree pair:
 * 1. `isFree === true` → price is forced to "0.00"
 * 2. `price === 0`     → `isFree` becomes true and price is normalised to "0.00"
 *
 * Rule (2) closes the legacy bug where admins entered ฿0 but left
 * `isFree = false`, sending students into the slip-upload flow for a
 * functionally free course. Centralising the rule here keeps it out of
 * the repo (SRP) and ensures every caller — create, update, future
 * imports — applies the same normalisation.
 */
export interface CoursePriceInput {
	price?: string | undefined;
	isFree?: boolean | undefined;
}

export interface NormalizedCoursePrice {
	price: string | undefined;
	isFree: boolean | undefined;
}

const ZERO_PRICE = "0.00";

export function normalizeCoursePrice(
	input: CoursePriceInput,
): NormalizedCoursePrice {
	const { price, isFree } = input;

	if (isFree === true) {
		return { price: ZERO_PRICE, isFree: true };
	}

	if (price !== undefined && Number(price) === 0) {
		return { price: ZERO_PRICE, isFree: true };
	}

	return { price, isFree };
}

/**
 * Variant for the create path where `price` and `isFree` are both required:
 * returns concrete (non-undefined) values so the caller can insert directly.
 */
export function normalizeCoursePriceRequired(input: {
	price: string;
	isFree: boolean;
}): { price: string; isFree: boolean } {
	const normalised = normalizeCoursePrice(input);
	return {
		price: normalised.price ?? input.price,
		isFree: normalised.isFree ?? input.isFree,
	};
}
