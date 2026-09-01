import Image from "next/image";
import { cn } from "#/lib/utils";
import type { Movie } from "./movie";

// TMDB posters are 2:3, and the CDN serves fixed renditions. The seed stores the original,
// which is a multi-megabyte file behind a thumbnail, so ask for the smallest rendition that
// still covers a 2x display.
const SIZES = {
	sm: { width: 32, height: 48, rendition: "w92" },
	md: { width: 64, height: 96, rendition: "w154" },
	lg: { width: 160, height: 240, rendition: "w342" },
} as const;

type Props = {
	movie: Movie;
	size: keyof typeof SIZES;
	className?: string;
};

function rendition(url: string, size: string): string {
	return url.replace("/t/p/original/", `/t/p/${size}/`);
}

export function Poster({ movie, size, className }: Props) {
	const { width, height, rendition: name } = SIZES[size];

	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-md bg-muted",
				className,
			)}
			style={{ width, height }}
		>
			{movie.posterUrl === null ? null : (
				<Image
					src={rendition(movie.posterUrl, name)}
					alt=""
					width={width}
					height={height}
					// Every film is offered once, so an optimised copy is never served twice
					// and each poster would pay for a cold transform. TMDB's CDN already
					// holds the right size.
					unoptimized
					className="size-full object-cover"
				/>
			)}
		</div>
	);
}
