import { query, round2 } from '../db/index.js';
import { logAudit } from './audit.service.js';

export class HRError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'HR_ERROR') {
    super(message);
    this.name = 'HRError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface CreateEmployeeInput {
  fullName: string;
  nin?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  baseSalary: number;
  status?: 'ACTIVE' | 'TERMINATED';
}

/**
 * Normalizes any date string (e.g. '2026-11-15' or '2026-11') to the first day of that month ('2026-11-01').
 */
export function normalizeMonthPeriod(periodStr: string): string {
  if (!periodStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }
  const clean = periodStr.substring(0, 7); // 'YYYY-MM'
  return `${clean}-01`;
}

// ==================== Employees ====================

export async function createEmployee(input: CreateEmployeeInput, userId: number) {
  if (!input.fullName || input.fullName.trim().length < 2) {
    throw new HRError('Le nom complet de l’employé est obligatoire', 400, 'INVALID_NAME');
  }

  const baseSalary = round2(Number(input.baseSalary) || 0);
  if (baseSalary < 0) {
    throw new HRError('Le salaire de base ne peut pas être négatif', 400, 'INVALID_SALARY');
  }

  const res = await query(
    `INSERT INTO employees (full_name, nin, phone, position, hire_date, base_salary, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.fullName.trim(),
      input.nin?.trim() || null,
      input.phone?.trim() || null,
      input.position?.trim() || 'Employé',
      input.hireDate ? new Date(input.hireDate) : null,
      baseSalary,
      input.status || 'ACTIVE',
    ]
  );
  const employee = res.rows[0];

  await logAudit({
    userId,
    action: 'EMPLOYEE_CREATED',
    entityType: 'EMPLOYEE',
    entityId: employee.id,
    newValues: { fullName: employee.full_name, position: employee.position, baseSalary },
    description: `Création du profil employé ${employee.full_name} (${employee.position})`,
  });

  return employee;
}

export async function getEmployees(params: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 30));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.status && params.status !== 'ALL') {
    conditions.push(`e.status = $${idx++}`);
    values.push(params.status.toUpperCase());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(`(e.full_name ILIKE $${idx} OR COALESCE(e.position,'') ILIKE $${idx} OR COALESCE(e.nin,'') ILIKE $${idx} OR COALESCE(e.phone,'') ILIKE $${idx})`);
    values.push(term);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(e.id)::int AS total FROM employees e ${whereClause}`,
    values
  );
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Active payroll mass estimation
  const payrollSumRes = await query(
    `SELECT COALESCE(SUM(e.base_salary), 0)::float AS total_base_mass
     FROM employees e
     WHERE e.status = 'ACTIVE'`
  );

  const sql = `
    SELECT e.*
    FROM employees e
    ${whereClause}
    ORDER BY (e.status = 'ACTIVE') DESC, e.full_name ASC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  values.push(pageSize, offset);
  const res = await query(sql, values);

  return {
    employees: res.rows,
    summary: {
      totalEmployees: total,
      monthlyBasePayrollMass: round2(payrollSumRes.rows[0]?.total_base_mass || 0),
    },
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getEmployeeById(id: number) {
  const res = await query('SELECT * FROM employees WHERE id = $1', [id]);
  if (res.rows.length === 0) {
    throw new HRError('Employé introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  return res.rows[0];
}

export async function updateEmployee(
  id: number,
  data: Partial<CreateEmployeeInput>,
  userId: number
) {
  const current = await getEmployeeById(id);

  const fullName = data.fullName !== undefined ? data.fullName.trim() : current.full_name;
  const nin = data.nin !== undefined ? data.nin.trim() : current.nin;
  const phone = data.phone !== undefined ? data.phone.trim() : current.phone;
  const position = data.position !== undefined ? data.position.trim() : current.position;
  const hireDate = data.hireDate !== undefined ? (data.hireDate ? new Date(data.hireDate) : null) : current.hire_date;
  const baseSalary = data.baseSalary !== undefined ? round2(Number(data.baseSalary)) : Number(current.base_salary);
  const status = data.status || current.status;

  const res = await query(
    `UPDATE employees
     SET full_name = $1, nin = $2, phone = $3, position = $4, hire_date = $5, base_salary = $6, status = $7
     WHERE id = $8
     RETURNING *`,
    [fullName, nin, phone, position, hireDate, baseSalary, status, id]
  );
  const updated = res.rows[0];

  await logAudit({
    userId,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'EMPLOYEE',
    entityId: id,
    oldValues: current,
    newValues: updated,
    description: `Mise à jour employé ${updated.full_name} (${updated.position})`,
  });

  return updated;
}

export async function deleteEmployee(id: number, userId: number) {
  const current = await getEmployeeById(id);

  // Check if salary history exists
  const salCheck = await query('SELECT id FROM salaries WHERE employee_id = $1 LIMIT 1', [id]);
  if (salCheck.rows.length > 0) {
    // If salaries exist, do NOT delete, mark as TERMINATED
    await query(`UPDATE employees SET status = 'TERMINATED' WHERE id = $1`, [id]);
    await logAudit({
      userId,
      action: 'EMPLOYEE_TERMINATED',
      entityType: 'EMPLOYEE',
      entityId: id,
      description: `Fin de contrat / Archivage de l’employé ${current.full_name}`,
    });
    return { success: true, status: 'TERMINATED', archived: true, message: 'Employé marqué comme sorti (bulletins conservés)' };
  }

  await query('DELETE FROM employees WHERE id = $1', [id]);
  await logAudit({
    userId,
    action: 'EMPLOYEE_DELETED',
    entityType: 'EMPLOYEE',
    entityId: id,
    description: `Suppression du profil employé ${current.full_name}`,
  });

  return { success: true, status: 'DELETED', archived: false, message: 'Employé supprimé avec succès' };
}

// ==================== Monthly Payroll (Salaires & Primes) ====================

export async function getSalaries(periodStr?: string) {
  const period = normalizeMonthPeriod(periodStr || '');

  const sql = `
    SELECT
      s.*,
      e.full_name AS employee_name,
      e.position AS employee_position,
      e.phone AS employee_phone,
      e.nin AS employee_nin,
      e.status AS employee_status
    FROM salaries s
    JOIN employees e ON e.id = s.employee_id
    WHERE s.period = $1
    ORDER BY e.full_name ASC
  `;
  const res = await query(sql, [period]);

  let totalBase = 0;
  let totalBonus1 = 0;
  let totalBonus2 = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const row of res.rows) {
    const base = Number(row.base_salary);
    const b1 = Number(row.bonus1);
    const b2 = Number(row.bonus2);
    const ded = Number(row.deductions);
    const tot = Number(row.total);

    totalBase += base;
    totalBonus1 += b1;
    totalBonus2 += b2;
    totalDeductions += ded;
    totalNet += tot;

    if (row.paid) {
      paidCount++;
    } else {
      unpaidCount++;
    }
  }

  return {
    period,
    salaries: res.rows,
    summary: {
      totalBase: round2(totalBase),
      totalBonus1: round2(totalBonus1),
      totalBonus2: round2(totalBonus2),
      totalDeductions: round2(totalDeductions),
      totalNet: round2(totalNet),
      paidCount,
      unpaidCount,
      employeeCount: res.rows.length,
    },
  };
}

/**
 * Auto-generates draft monthly payroll entries for all ACTIVE employees.
 */
export async function generatePayroll(periodStr: string, userId: number) {
  const period = normalizeMonthPeriod(periodStr);

  const empRes = await query(
    `SELECT id, full_name, base_salary
     FROM employees
     WHERE status = 'ACTIVE'
     ORDER BY id ASC`
  );

  if (empRes.rows.length === 0) {
    throw new HRError('Aucun employé actif trouvé pour générer la paie', 400, 'NO_ACTIVE_EMPLOYEES');
  }

  let generatedCount = 0;
  for (const emp of empRes.rows) {
    const base = Number(emp.base_salary);
    const insRes = await query(
      `INSERT INTO salaries (
        employee_id, period, base_salary, bonus1, bonus2, deductions, total, paid
      ) VALUES ($1, $2, $3, 0, 0, 0, $3, false)
      ON CONFLICT (employee_id, period) DO NOTHING
      RETURNING id`,
      [emp.id, period, base]
    );
    if (insRes.rows.length > 0) {
      generatedCount++;
    }
  }

  await logAudit({
    userId,
    action: 'PAYROLL_GENERATED',
    entityType: 'PAYROLL',
    entityId: period,
    newValues: { period, generatedCount },
    description: `Génération de la feuille de paie pour la période ${period} (${generatedCount} bulletin(s))`,
  });

  return getSalaries(period);
}

export async function updateSalary(
  salaryId: number,
  data: {
    bonus1?: number;
    bonus2?: number;
    deductions?: number;
    paid?: boolean;
    paymentDate?: string;
  },
  userId: number
) {
  const sRes = await query(
    `SELECT s.*, e.full_name AS employee_name
     FROM salaries s
     JOIN employees e ON e.id = s.employee_id
     WHERE s.id = $1`,
    [salaryId]
  );

  if (sRes.rows.length === 0) {
    throw new HRError('Bulletin de salaire introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const current = sRes.rows[0];

  const bonus1 = data.bonus1 !== undefined ? round2(Number(data.bonus1)) : Number(current.bonus1);
  const bonus2 = data.bonus2 !== undefined ? round2(Number(data.bonus2)) : Number(current.bonus2);
  const deductions = data.deductions !== undefined ? round2(Number(data.deductions)) : Number(current.deductions);
  const baseSalary = Number(current.base_salary);

  const total = round2(Math.max(0, baseSalary + bonus1 + bonus2 - deductions));

  const isPaid = data.paid !== undefined ? Boolean(data.paid) : Boolean(current.paid);
  const paymentDate = isPaid
    ? (data.paymentDate ? data.paymentDate.substring(0, 10) : (current.payment_date || new Date().toISOString().substring(0, 10)))
    : null;

  const updRes = await query(
    `UPDATE salaries
     SET bonus1 = $1, bonus2 = $2, deductions = $3, total = $4, paid = $5, payment_date = $6
     WHERE id = $7
     RETURNING *`,
    [bonus1, bonus2, deductions, total, isPaid, paymentDate, salaryId]
  );
  const updated = updRes.rows[0];

  await logAudit({
    userId,
    action: 'SALARY_UPDATED',
    entityType: 'SALARY',
    entityId: salaryId,
    oldValues: current,
    newValues: updated,
    description: `Mise à jour bulletin de salaire #${salaryId} (${current.employee_name}) : Net = ${total} DZD`,
  });

  return updated;
}
