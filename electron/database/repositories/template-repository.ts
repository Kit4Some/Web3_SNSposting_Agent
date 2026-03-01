import { queryAll, queryOne, execQuery } from '../index';
import type { Template, TemplateType } from '@shared/types';

export class TemplateRepository {
  getAll(): Template[] {
    const rows = queryAll<any>('SELECT * FROM templates ORDER BY type, name');
    return rows.map(this.mapRowToTemplate);
  }

  getByType(type: TemplateType): Template[] {
    const rows = queryAll<any>(
      'SELECT * FROM templates WHERE type = ? ORDER BY is_default DESC, name',
      [type]
    );
    return rows.map(this.mapRowToTemplate);
  }

  getDefault(type: TemplateType): Template | null {
    const row = queryOne<any>(
      'SELECT * FROM templates WHERE type = ? AND is_default = 1',
      [type]
    );
    return row ? this.mapRowToTemplate(row) : null;
  }

  getById(id: number): Template | null {
    const row = queryOne<any>('SELECT * FROM templates WHERE id = ?', [id]);
    return row ? this.mapRowToTemplate(row) : null;
  }

  insert(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): number {
    // If this is set as default, unset other defaults of the same type
    if (template.isDefault) {
      execQuery('UPDATE templates SET is_default = 0 WHERE type = ?', [template.type]);
    }

    const result = execQuery(
      `
        INSERT INTO templates (name, type, content, is_default)
        VALUES (?, ?, ?, ?)
      `,
      [template.name, template.type, template.content, template.isDefault ? 1 : 0]
    );

    return result.lastInsertRowid;
  }

  update(
    id: number,
    template: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>
  ): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (template.name !== undefined) {
      updates.push('name = ?');
      values.push(template.name);
    }
    if (template.type !== undefined) {
      updates.push('type = ?');
      values.push(template.type);
    }
    if (template.content !== undefined) {
      updates.push('content = ?');
      values.push(template.content);
    }
    if (template.isDefault !== undefined) {
      // If setting as default, unset other defaults of the same type
      if (template.isDefault) {
        const current = this.getById(id);
        if (current) {
          execQuery('UPDATE templates SET is_default = 0 WHERE type = ?', [
            template.type || current.type
          ]);
        }
      }
      updates.push('is_default = ?');
      values.push(template.isDefault ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = strftime('%s', 'now')");
      values.push(id);
      execQuery(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  setDefault(id: number): void {
    const template = this.getById(id);
    if (template) {
      execQuery('UPDATE templates SET is_default = 0 WHERE type = ?', [template.type]);
      execQuery(
        "UPDATE templates SET is_default = 1, updated_at = strftime('%s', 'now') WHERE id = ?",
        [id]
      );
    }
  }

  delete(id: number): void {
    execQuery('DELETE FROM templates WHERE id = ?', [id]);
  }

  private mapRowToTemplate(row: any): Template {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      content: row.content,
      isDefault: !!row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const templateRepository = new TemplateRepository();
