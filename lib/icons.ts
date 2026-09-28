import {
  Utensils, Bus, ShoppingCart, ReceiptText, Clapperboard, HeartPulse, GraduationCap,
  CircleEllipsis, Banknote, Gift, Briefcase, PartyPopper, CircleDollarSign, Wallet,
  Landmark, Smartphone, Coffee, Car, Home, Zap, Tv, Gamepad2, Dumbbell, Plane, Shirt,
  PawPrint, Baby, BookOpen, Wrench, Music, PiggyBank, CreditCard, HandCoins, type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  utensils: Utensils, bus: Bus, "shopping-cart": ShoppingCart, receipt: ReceiptText,
  clapperboard: Clapperboard, "heart-pulse": HeartPulse, "graduation-cap": GraduationCap,
  "circle-ellipsis": CircleEllipsis, banknote: Banknote, gift: Gift, briefcase: Briefcase,
  "party-popper": PartyPopper, "circle-dollar-sign": CircleDollarSign, wallet: Wallet,
  landmark: Landmark, smartphone: Smartphone, coffee: Coffee, car: Car, home: Home,
  zap: Zap, tv: Tv, "gamepad-2": Gamepad2, dumbbell: Dumbbell, plane: Plane, shirt: Shirt,
  "paw-print": PawPrint, baby: Baby, book: BookOpen, wrench: Wrench, music: Music,
  "piggy-bank": PiggyBank, "credit-card": CreditCard, "hand-coins": HandCoins,
};

export function getIcon(name?: string | null): LucideIcon {
  return (name && REGISTRY[name]) || CircleEllipsis;
}

export const ICON_CHOICES = Object.keys(REGISTRY);
