import Image from "next/image";
import { notFound } from "next/navigation";

import { findRandom } from "@/database/movie/repository";
import { getPosterUrl } from "@/services/tmdb/poster";

import { MovieHeader } from "./header";

export default async function MoviePage() {
  return (
    <div>
      <h1>Movie Page</h1>
    </div>
  );

  // const [movieA, movieB] = await findRandom(2);

  // if (!movieA || !movieB) {
  //   return notFound();
  // }

  // return (
  //   <>
  //     <MovieHeader />
  //     <div className="flex h-full">
  //       <button className="group flex h-full w-1/2 flex-col items-end justify-center gap-4 pr-8">
  //         <div className="relative aspect-[2/3] w-64 border-8 border-transparent group-hover:border-gray-700">
  //           <Image
  //             fill
  //             src={getPosterUrl(movieA.posterPath, "w342")}
  //             alt={movieA.title}
  //           />
  //         </div>

  //         <div className="h-16 w-64">
  //           {movieA.title} ({movieA.releaseDate.getFullYear()})
  //         </div>
  //       </button>

  //       <button className="group flex h-full w-1/2 flex-col items-start justify-center gap-4 pl-8">
  //         <div className="relative aspect-[2/3] w-64 border-8 border-transparent group-hover:border-gray-700">
  //           <Image
  //             fill
  //             src={getPosterUrl(movieB.posterPath, "w342")}
  //             alt={movieB.title}
  //           />
  //         </div>

  //         <div className="h-16 w-64">
  //           {movieB.title} ({movieB.releaseDate.getFullYear()})
  //         </div>
  //       </button>
  //     </div>
  //   </>
  // );
}
