import { Suspense } from "react";
import MovieNight from "@/components/movie-night";

async function InvitationContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MovieNight invitationToken={token} />;
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <div className="container" style={{ padding: "48px 0" }}>
            <p className="eyebrow">MOVIENIGHT</p>
            <h1 className="serif">Preparing your invitation...</h1>
          </div>
        </main>
      }
    >
      <InvitationContent params={params} />
    </Suspense>
  );
}
