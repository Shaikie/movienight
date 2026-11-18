import { ImageResponse } from "next/og";
export const size={width:512,height:512};
export const contentType="image/png";
export default function Icon(){return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(145deg,#301622,#09090d)",borderRadius:100,border:"12px solid #d4af37"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",color:"#e7c76a",fontSize:170,fontWeight:800}}><span>▶</span><span style={{fontSize:49,letterSpacing:5,color:"#fff"}}>MOVIENIGHT</span></div></div>,size);}
