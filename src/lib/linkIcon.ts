import { Code2, Folder, Link2, Sparkles, TrendingUp } from "lucide-react";

export const linkIconChoices = [
  { id: "link", label: "Link", icon: Link2 },
  { id: "code", label: "Code", icon: Code2 },
  { id: "sparkles", label: "AI", icon: Sparkles },
  { id: "folder", label: "Folder", icon: Folder },
  { id: "chart", label: "Chart", icon: TrendingUp },
];
export const linkIcon = (name: string) =>
  linkIconChoices.find((item) => item.id === name)?.icon ?? Link2;
