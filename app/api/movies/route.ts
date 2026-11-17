import { NextResponse } from "next/server";

const demo = [
 {id:27205,title:"Inception",overview:"A skilled thief is offered a chance to have his past crimes forgiven if he can plant an idea in someone's mind.",poster_path:"/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",release_date:"2010-07-16",vote_average:8.4,genre:"Sci-Fi"},
 {id:157336,title:"Interstellar",overview:"A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",poster_path:"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",release_date:"2014-11-07",vote_average:8.7,genre:"Adventure"},
 {id:155,title:"The Dark Knight",overview:"Batman faces a criminal mastermind who wants to plunge Gotham into anarchy.",poster_path:"/qJ2tW6WMUDux911r6m7haRef0WH.jpg",release_date:"2008-07-18",vote_average:9.0,genre:"Action"},
 {id:496243,title:"Parasite",overview:"A family sees an opportunity when one of its members starts working for a wealthy household.",poster_path:"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",release_date:"2019-05-30",vote_average:8.5,genre:"Thriller"},
 {id:324857,title:"Spider-Man: Into the Spider-Verse",overview:"Miles Morales becomes Spider-Man and meets heroes from other dimensions.",poster_path:"/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",release_date:"2018-12-14",vote_average:8.4,genre:"Animation"},
 {id:438631,title:"Dune",overview:"A gifted young man must travel to the most dangerous planet in the universe to secure his future.",poster_path:"/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",release_date:"2021-09-15",vote_average:8.0,genre:"Sci-Fi"},
 {id:546554,title:"Knives Out",overview:"A detective investigates the death of a celebrated crime novelist.",poster_path:"/pThyQovXQrw2m0s9x82twj48Jq4.jpg",release_date:"2019-11-27",vote_average:7.9,genre:"Mystery"},
 {id:13,title:"Forrest Gump",overview:"The extraordinary life of a gentle man unfolds across decades of American history.",poster_path:"/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",release_date:"1994-07-06",vote_average:8.5,genre:"Drama"}
];

export async function GET(request:Request) {
 const query=new URL(request.url).searchParams.get("q")?.trim().toLowerCase()||"";
 const key=process.env.TMDB_API_KEY;
 if(!key) {
  const results=demo.filter(movie=>!query||(movie.title+" "+movie.overview+" "+movie.genre).toLowerCase().includes(query));
  return NextResponse.json({results,source:"sample"});
 }
 const endpoint=query?"search/movie":"movie/now_playing";
 const url=new URL("https://api.themoviedb.org/3/"+endpoint);
 url.searchParams.set("api_key",key);
 url.searchParams.set("language","en-US");
 if(query)url.searchParams.set("query",query);
 url.searchParams.set("page","1");
 const response=await fetch(url,{next:{revalidate:1800}});
 if(!response.ok)return NextResponse.json({error:"Movie provider is temporarily unavailable."},{status:502});
 const data=await response.json();
 return NextResponse.json({results:(data.results??[]).map((movie:{id:number;title:string;overview:string;poster_path:string|null;release_date:string;vote_average:number})=>({...movie,genre:"Featured"})),source:"tmdb"});
}
