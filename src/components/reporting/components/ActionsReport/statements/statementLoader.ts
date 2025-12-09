/**
 * Statement Loader
 * 
 * This module loads statement templates from the markdown document
 * and provides them to the statement generators.
 * 
 * The markdown document is the source of truth for all statements.
 * Update the markdown, and the statements will be updated automatically.
 */

import statementTemplates from './statementTemplates';

export interface StatementTemplate {
  id: string;
  category: 'findings' | 'opportunities' | 'risks' | 'actions';
  type: string;
  condition?: string;
  template: string;
  placeholders?: string[];
  quadrant?: string;
  priority?: number;
}

export interface StatementTemplates {
  findings: StatementTemplate[];
  opportunities: StatementTemplate[];
  risks: StatementTemplate[];
  actions: StatementTemplate[];
}

/**
 * Get statement template by ID
 */
export function getStatementTemplate(
  category: keyof StatementTemplates,
  type: string
): StatementTemplate | undefined {
  const templates = statementTemplates[category];
  return templates.find((t: StatementTemplate) => t.type === type);
}

/**
 * Get all templates for a category
 */
export function getTemplatesForCategory(
  category: keyof StatementTemplates
): StatementTemplate[] {
  return statementTemplates[category] || [];
}

/**
 * Replace placeholders in a template with actual values
 */
export function renderTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  let rendered = template;
  
  // Replace placeholders like {count}, {percentage}, etc.
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(placeholder, String(value));
  });
  
  // Handle pluralization placeholders like {plural}
  if (values.count !== undefined) {
    const count = typeof values.count === 'number' ? values.count : parseInt(String(values.count));
    rendered = rendered.replace(/\{plural\}/g, count === 1 ? '' : 's');
    rendered = rendered.replace(/\{is\/are\}/g, count === 1 ? 'is' : 'are');
  }
  
  return rendered;
}

export default statementTemplates;

