export type ProjectTeamName = "FRONTEND" | "BACKEND" | "DATABASE" | "QA";

export const PROJECT_TEAM_ROLES: Record<ProjectTeamName, string[]> = {
  FRONTEND: ["Frontend Developer", "Frontend Engineer", "UI Engineer"],
  BACKEND: ["Backend Developer", "Backend Engineer", "API Engineer"],
  DATABASE: ["Database Engineer", "Database Administrator", "Data Architect"],
  QA: ["QA Engineer", "Automation Test Engineer", "QA Specialist"],
};

export const TEAM_RESPONSIBILITIES: Record<ProjectTeamName, string> = {
  FRONTEND: "Frontend UI implementation, component architecture, client-side state management, and user experience integration.",
  BACKEND: "Backend API endpoints, business logic implementation, service integrations, and data validation.",
  DATABASE: "Schema architecture, database migrations, query optimization, and relational data modeling.",
  QA: "Quality assurance, automated test coverage, regression testing, and deliverable verification.",
};
