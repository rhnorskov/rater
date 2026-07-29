// Takes the value, not the name: Next only inlines NEXT_PUBLIC_* on literal
// static member access, so process.env[name] would be undefined in the browser.
export function required(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

export const SUPABASE_URL = required(
	"NEXT_PUBLIC_SUPABASE_URL",
	process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = required(
	"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
