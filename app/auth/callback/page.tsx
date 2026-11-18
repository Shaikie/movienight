"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { browserSupabase } from "@/lib/supabase-browser";
export default function Callback(){
 const [message,setMessage]=useState("Completing sign-in...");
 useEffect(()=>{(async()=>{
  try{
   const supabase=browserSupabase();
   const code=new URLSearchParams(window.location.search).get("code");
   if(code){const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)throw error;}
   else {const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error("No authentication session found.");}
   window.location.replace("/dashboard");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to complete sign-in");}
 })();},[]);
 return <main className="mn-container mn-page"><h1>MovieNight sign-in</h1><p>{message}</p><Link href="/login">Back to login</Link></main>;
}
