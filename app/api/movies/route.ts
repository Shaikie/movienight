import { NextResponse } from "next/server";

const demo = [
  { id: 1, title: "Inception", overview: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.", poster_path: null, release_date: "2010-07-16", vote_average: 8.4 },
  { id: 2, title: "Interstellar", overview: "A team of explorers travel beyond this galaxy to discover whether mankind has a future among the stars.", poster_path: null, release_date: "2014-11-07", vote_average: 8.7 },
  { id: 3, title: "The Grand Budapest Hotel", overview: "A legendary concierge and his protégé become embroiled in the theft of a priceless painting.", poster_path: null, release_date: "2014-03-28", vote_average: 8.1 },
  { id: 4, title: "Spider-Man: Into the Spider-Verse", overview: "Teen Miles Morales becomes Spider-Man and crosses paths with heroes from other dimensions.", poster_path: null, release_date: "2018-12-14", vote_average: 8.4 },
  { id: 5, title: "Knives Out", overview: "A detective investigates the death of a renowned crime novelist at his estate.", poster_path: null, release_date: "2019-11-27", vote_average: 7.9 },
];
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const key = process.env.TMDB_API_KEY;
  if (!key) return NextResponse.json({ results: demo, source: "sample" });
  const endpoint = query ? "search/movie" : "movie/now_playing";
  const url = new URL("https://api.themoviedb.org/3/" + endpoint);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  if (query) url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) return NextResponse.json({ error: "Movie provider is temporarily unavailable." }, { status: 502 });
  const data = await response.json();
  return NextResponse.json({ results: data.results ?? [], source: "tmdb" });
}
