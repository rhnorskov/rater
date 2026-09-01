import Image from "next/image";
import { cn } from "#/lib/utils";
import type { Movie } from "./queries";

// TMDB posters are 2:3.
const SIZES = {
	sm: { width: 32, height: 48 },
	md: { width: 64, height: 96 },
	lg: { width: 160, height: 240 },
} as const;

type Props = {
	movie: Movie;
	size: keyof typeof SIZES;
	className?: string;
};

export function Poster({ movie, size, className }: Props) {
	const { width, height } = SIZES[size];

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
					src={movie.posterUrl}
					alt=""
					width={width}
					height={height}
					className="size-full object-cover"
				/>
			)}
		</div>
	);
}
