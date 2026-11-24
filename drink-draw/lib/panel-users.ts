export const panelRoles = ["admin", "user"] as const;
export type PanelRole = (typeof panelRoles)[number];

export type PanelUser = {
  id: string;
  username: string;
  name: string;
  role: PanelRole;
};

export const roleLabels: Record<PanelRole, string> = {
  admin: "Administrador",
  user: "Usuário comum",
};
