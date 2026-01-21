
import { PlanDetails, SubscriptionPlan } from './types.ts';

export const MERCADO_PAGO_PUBLIC_KEY = "APP_USR-18445a98-fbd2-4fdd-a116-f440a4383951";

export const PLANS: PlanDetails[] = [
  {
    id: SubscriptionPlan.CLASSIC,
    name: "Plano Clássico",
    credits: 1000,
    price: 10.00,
    description: "Ideal para iniciantes que buscam viralizar no TikTok e Reels. Economia garantida para quem está começando."
  },
  {
    id: SubscriptionPlan.MEDIUM,
    name: "Plano Médio",
    credits: 2000,
    price: 20.00,
    description: "Para criadores que postam diariamente. O melhor custo-benefício para manter sua audiência engajada."
  },
  {
    id: SubscriptionPlan.PROFESSIONAL,
    name: "Plano Profissional",
    credits: 3000,
    price: 30.00,
    description: "Domine o mercado de cortes. Poder de fogo máximo para agências e produtores profissionais de conteúdo.",
    highlight: "MAIS VENDIDO"
  }
];

export const INITIAL_CREDITS = 70;
export const GENERATION_COST = 10;
export const ADMIN_EMAIL = "wesleybizerra@hotmail.com";
