export interface StageItem {
  id: string;
  name: string;
  shortDesc: string;
  headline: string;
  description: string;
  problemSolved: string;
  inputArtifact: string;
  outputArtifact: string;
  responsibleRole: string;
  keyMetrics: { label: string; value: string }[];
  connectedNext: string;
  connectedPrev: string;
  color: string;
  iconName: string;
}

export interface ProductModule {
  id: string;
  category: "operations" | "execution" | "administration";
  title: string;
  tagline: string;
  description: string;
  workflow: string[];
  connectedModules: string[];
  status: "Operational" | "Automated" | "Enterprise Gated";
  actionLabel: string;
  actionHref: string;
  highlightStats: { label: string; value: string }[];
}

export interface WorkflowStep {
  step: number;
  title: string;
  phase: string;
  actor: string;
  summary: string;
  inputData: string;
  systemAction: string;
  outputArtifact: string;
  verificationRule: string;
}

export interface Chapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  quote: string;
  narrative: string;
  visualTheme: string;
  tags: string[];
  stat: { value: string; label: string };
}
