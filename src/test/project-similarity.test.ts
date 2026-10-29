import { describe, it, expect } from "vitest";
import {
  calculateProjectSimilarity,
  getRelatedProjects,
  type SimilarityProject,
} from "@/lib/project-similarity";

describe("Calcul de similarité robuste entre projets", () => {
  const cluster: SimilarityProject = {
    slug: "cluster-haute-disponibilite",
    title: "Infrastructure haute disponibilité par cluster étendu",
    tag: "Projet de fin d'études",
    technologies: ["Cluster", "Linux", "Virtualisation", "Haute disponibilité", "Windows server"],
  };

  const paylix: SimilarityProject = {
    slug: "paylix",
    title: "PayLix — gestion des frais scolaires",
    tag: "Projet personnel",
    technologies: ["Développement web", "Base de données", "Tableaux de bord"],
  };

  const marketnet: SimilarityProject = {
    slug: "marketnet",
    title: "MarketNet — boutiques en ligne avec commandes sur WhatsApp",
    tag: "E-commerce & Intégration Mobile",
    technologies: [
      "Next.js / React",
      "TypeScript",
      "Tailwind CSS",
      "Supabase",
      "WhatsApp Business API",
      "Cloudinary CDN",
    ],
  };

  const assistant: SimilarityProject = {
    slug: "etude-de-cas-assistant-virtuel-ia-pour-portfolio-interactif",
    title: "Étude de cas : Assistant Virtuel IA pour Portfolio Interactif",
    tag: "Full-Stack",
    technologies: [],
  };

  const secondInfra: SimilarityProject = {
    slug: "datacenter-securisation-reseau",
    title: "Sécurisation et segmentation LAN / DMZ sur pare-feu pfSense",
    tag: "Réseaux & Sécurité",
    technologies: ["Réseaux LAN", "Cisco", "Linux", "Pare-feu"],
  };

  it("Cluster (infrastructure) n'est PAS similaire aux projets purement web (MarketNet, PayLix)", () => {
    const scoreMarketnet = calculateProjectSimilarity(cluster, marketnet);
    const scorePaylix = calculateProjectSimilarity(cluster, paylix);

    expect(scoreMarketnet).toBe(0);
    expect(scorePaylix).toBe(0);

    const related = getRelatedProjects(cluster, [marketnet, paylix, assistant]);
    expect(related).toHaveLength(0);
  });

  it("MarketNet et PayLix sont détectés comme similaires car partageant le domaine web et les bases de données", () => {
    const score = calculateProjectSimilarity(marketnet, paylix);
    expect(score).toBeGreaterThanOrEqual(3);

    const relatedToMarketnet = getRelatedProjects(marketnet, [cluster, paylix, assistant]);
    expect(relatedToMarketnet.some((r) => r.project.slug === "paylix")).toBe(true);
    expect(relatedToMarketnet.some((r) => r.project.slug === "cluster-haute-disponibilite")).toBe(false);
  });

  it("Deux projets d'infrastructure sont correctement détectés comme similaires", () => {
    const score = calculateProjectSimilarity(cluster, secondInfra);
    expect(score).toBeGreaterThanOrEqual(3);

    const related = getRelatedProjects(cluster, [secondInfra, marketnet, paylix]);
    expect(related).toHaveLength(1);
    expect(related[0]?.project.slug).toBe("datacenter-securisation-reseau");
  });

  it("Ne renvoie jamais le projet lui-même", () => {
    const score = calculateProjectSimilarity(marketnet, marketnet);
    expect(score).toBe(0);
  });
});
