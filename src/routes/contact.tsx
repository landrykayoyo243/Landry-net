import { createFileRoute, redirect } from "@tanstack/react-router";

// Ancienne adresse conservée pour rediriger les liens externes vers le formulaire d'accueil.
export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "contact" });
  },
});
