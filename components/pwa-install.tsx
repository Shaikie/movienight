"use client";
import { useEffect,useState } from "react";
import { Download, X } from "lucide-react";
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export default function PwaInstall(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null);
 const [visible,setVisible]=useState(false);
 const [showGuide,setShowGuide]=useState(false);
 const [ios,setIos]=useState(false);
 const [installed,setInstalled]=useState(false);
 useEffect(()=>{
  if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js").catch(()=>{});
  const standalone=window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as Navigator & {standalone?:boolean}).standalone===true);
  setInstalled(standalone);
  setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  if(standalone)return;
  const onPrompt=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);setVisible(true);};
  const onInstalled=()=>{setInstalled(true);setVisible(false);setPrompt(null);};
  window.addEventListener("beforeinstallprompt",onPrompt);
  window.addEventListener("appinstalled",onInstalled);
  return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled);};
 },[]);
 if(installed)return null;
 return <div className="mn-install-area">
 <button type="button" className="mn-install-launcher" onClick={()=>{setShowGuide(v=>!v);setVisible(true);}} aria-expanded={visible||showGuide} aria-label="Install MovieNight"><Download size={17}/><span>Install app</span></button>
 {(visible||showGuide)&&<aside className="mn-install-banner" aria-label="Install MovieNight">
 <div className="mn-install-symbol">▶</div><div><strong>Install CoICT MovieNight</strong><p>{prompt?"Add MovieNight to your home screen.":ios?"In Safari, tap Share, then Add to Home Screen.":"Open your browser menu (⋮) and choose Install app or Add to Home screen."}</p></div>
 {prompt&&<button type="button" className="mn-button mn-button-small" onClick={async()=>{try{await prompt.prompt();await prompt.userChoice;}finally{setVisible(false);setShowGuide(false);setPrompt(null);}}}><Download size={16}/> Install</button>}
 <button type="button" className="mn-install-close" aria-label="Close installation help" onClick={()=>{setVisible(false);setShowGuide(false);}}><X size={18}/></button>
 </aside>}
 </div>;
}
