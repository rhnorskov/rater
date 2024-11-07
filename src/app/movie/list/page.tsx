import Image from "next/image";

import { findPopular } from "@/database/movie/repository";
import { getPosterUrl } from "@/services/tmdb/poster";

import { MovieListHeader } from "./header";

export default async function ListMoviePage() {
  const movies = await findPopular(1000);

  return (
    <>
      <MovieListHeader />
      <div className="flex flex-col gap-8 p-8">
        <h1 className="text-4xl font-bold">Rate movies</h1>
        <div className="grid grid-cols-8 gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="flex flex-col gap-2">
              <div className="relative aspect-[2/3] w-full">
                <Image
                  fill
                  src={getPosterUrl(movie.posterPath, "w342")}
                  alt={movie.title}
                />
              </div>
              <div className="text-center text-lg font-semibold">
                {movie.title} ({movie.releaseDate.getFullYear()})
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
