/**
 * Type declaration for statement templates JSON file
 */
declare module './statementTemplates.json' {
  interface StatementTemplate {
    id: string;
    category: 'findings' | 'opportunities' | 'risks' | 'actions';
    type: string;
    condition?: string;
    template: string;
    placeholders?: string[];
    quadrant?: string;
    priority?: number;
  }

  interface StatementTemplates {
    findings: StatementTemplate[];
    opportunities: StatementTemplate[];
    risks: StatementTemplate[];
    actions: StatementTemplate[];
  }

  const templates: StatementTemplates;
  export default templates;
}

