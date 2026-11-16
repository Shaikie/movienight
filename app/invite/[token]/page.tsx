import MovieNight from "@/components/movie-night";
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MovieNight invitationToken={token} />;
}
