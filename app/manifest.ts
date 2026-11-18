import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {
  name:"CoICT MovieNight",short_name:"MovieNight",description:"Suggest films, vote, request invitations and reserve your MovieNight seats.",
  start_url:"/",scope:"/",display:"standalone",background_color:"#09090d",theme_color:"#141218",
  orientation:"any",
  icons:[{src:"/icon",sizes:"512x512",type:"image/png",purpose:"any"},{src:"/icon",sizes:"512x512",type:"image/png",purpose:"maskable"},{src:"/apple-icon",sizes:"180x180",type:"image/png"}]
 };
}
