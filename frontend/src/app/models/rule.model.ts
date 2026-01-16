export interface Rule {
  id: number;
  name: string;
  eplQuery: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deploymentId: string;
}

export function fromRule(rule: any): Rule {
  return {
    id: rule.id,
    name: rule.name,
    eplQuery: rule.eplQuery,
    description: rule.description,
    active: rule.active,
    createdAt: new Date(rule.createdAt),
    updatedAt: new Date(rule.updatedAt),
    deploymentId: rule.deploymentId,
  };
}
