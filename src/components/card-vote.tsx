import React from "react";

export function MovieCard() {
  return <div></div>;
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center">
        <div className="aspect-[2/3] h-full bg-white"></div>
        {/* <img src="/images/dummy-movie-thumbnail.png" alt="" className=" h-full aspect-[2/3]"/> */}
        <button className="text-2sm border-1 rounded-full border border-white border-opacity-10 bg-white bg-opacity-10 px-4 py-2 font-medium text-white text-opacity-60">
          Didn&apos;t watch
        </button>
      </div>
      <h2 className="text-bold text-lg">Movie title (1972)</h2>
    </div>
  );
}
