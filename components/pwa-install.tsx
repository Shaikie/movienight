"use client";
import { useEffect,useState } from "react";
import { Download, X } from "lucide-react";
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export default function PwaInstall(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js").catch(()=>{});
  const installed=window.matchMedia("(display-mode: standalone)").matches;
  if(installed)return;
  const onPrompt=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);setVisible(true);};
  const onInstalled=()=>{setVisible(false);setPrompt(null);};
  window.addEventListener("beforeinstallprompt",onPrompt);
  window.addEventListener("appinstalled",onInstalled);
  return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled);};
 },[]);
 if(!visible||!prompt)return null;
 return <aside className="mn-install-banner" aria-label="Install MovieNight"><div className="mn-install-symbol">▶</div><div><strong>Take MovieNight with you</strong><p>Install the app on your device for quick access.</p></div><button type="button" className="mn-button mn-button-small" onClick={async()=>{await prompt.prompt();await prompt.userChoice;setVisible(false);setPrompt(null);}}><Download size={16}/> Install</button><button type="button" className="mn-install-close" aria-label="Dismiss install suggestion" onClick={()=>setVisible(false)}><X size={18}/></button></aside>;
}
