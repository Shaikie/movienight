import { NextResponse } from "next/server";
const demo = [
{id:27205,title:"Inception",overview:"A thief plants an idea in a dream.",poster_path:"/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",release_date:"2010-07-16",vote_average:8.4,genre:"Sci-Fi"},
{id:157336,title:"Interstellar",overview:"Explorers travel beyond the galaxy.",poster_path:"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",release_date:"2014-11-07",vote_average:8.7,genre:"Adventure"}];
const categories:Record<string,string>={popular:"movie/popular",now_playing:"movie/now_playing",top_rated:"movie/top_rated",upcoming:"movie/upcoming"};
export async function GET(request:Request) {
 const params=new URL(request.url).searchParams;
 const q=(params.get("q")||"").trim().slice(0,120);
 const category=params.get("category")||"popular";
 const rawPage=Number(params.get("page")||1);
 const page=Number.isInteger(rawPage)?Math.max(1,Math.min(500,rawPage)):1;
 const key=process.env.TMDB_API_KEY;
 if(!key) {
  const results=demo.filter(m=>!q||(m.title+" "+m.overview+" "+m.genre).toLowerCase().includes(q.toLowerCase()));
  return NextResponse.json({results:page===1?results:[],page,total_pages:1,total_results:results.length,source:"sample"});
 }
 const url=new URL("https://api.themoviedb.org/3/"+(q?"search/movie":categories[category]||categories.popular));
 url.searchParams.set("api_key",key);
 url.searchParams.set("language","en-US");
 url.searchParams.set("page",String(page));
 if(q)url.searchParams.set("query",q);
 try {
  const response=await fetch(url,{next:{revalidate:900}});
  if(!response.ok)return NextResponse.json({error:"Movie provider is temporarily unavailable."},{status:502});
  const data=await response.json();
  return NextResponse.json({results:(data.results??[]).map((m:{id:number;title:string;overview:string;poster_path:string|null;release_date:string;vote_average:number})=>({...m,genre:"Featured"})),page:data.page??page,total_pages:Math.min(data.total_pages??1,500),total_results:data.total_results??0,source:"tmdb"});
 }catch{return NextResponse.json({error:"Unable to reach movie provider."},{status:502});}
}
