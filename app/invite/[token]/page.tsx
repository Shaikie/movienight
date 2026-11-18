import { Suspense } from "react";
import CoictFlow from "@/components/coict-flow";

async function InvitationContent({params}:{params:Promise<{token:string}>}) {
 const {token}=await params;
 return <CoictFlow page="invite" invitationToken={token}/>;
}
export default function InvitationPage({params}:{params:Promise<{token:string}>}) {
 return <Suspense fallback={<main className="mn-app"><div className="mn-container mn-page"><p className="mn-kicker">MOVIENIGHT</p><h1>Preparing your invitation...</h1></div></main>}>
  <InvitationContent params={params}/>
 </Suspense>;
}
