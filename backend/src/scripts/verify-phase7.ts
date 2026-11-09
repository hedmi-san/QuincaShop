process.env.NODE_ENV = 'test';

import { createServer } from 'http';
import { query } from '../db/index.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase7Tests() {
  const { app } = await import('../server.js');
  console.log('\n======================================================');
  console.log('--- STARTING PHASE 7 END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================\n');

  // Start HTTP server on an ephemeral port
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  try {
    // -----------------------------------------------------------------
    // Step 1: Authentication & RBAC Isolation Verification
    // -----------------------------------------------------------------
    console.log('[Step 1] Authenticating ADMIN and ACCOUNTANT users...');

    // 1.1 Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@store.local',
        password: 'StrongPassword2026!',
      }),
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeded with 200 OK');
    const adminLoginData: any = await adminLoginRes.json();
    const adminToken = adminLoginData.data.token;
    assert(!!adminToken, 'Admin received valid JWT token');

    // 1.2 Login as Accountant
    const accountantLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'accountant@store.local',
        password: 'StrongPassword2026!',
      }),
    });
    assert(accountantLoginRes.status === 200, 'Accountant login succeeded with 200 OK');
    const accountantLoginData: any = await accountantLoginRes.json();
    const accountantToken = accountantLoginData.data.token;
    assert(!!accountantToken, 'Accountant received valid JWT token');

    // 1.3 Verify ACCOUNTANT is locked out of Expenses and HR (RBAC Enforced)
    console.log('\n[Step 2] Testing RBAC Security Isolation (Accountant lockout)...');
    
    const accExpensesRes = await fetch(`${baseUrl}/admin/expenses`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(accExpensesRes.status === 403, 'Accountant access to /admin/expenses returns 403 Forbidden');
    const accExpensesBody: any = await accExpensesRes.json();
    assert(typeof accExpensesBody.error === 'string' && accExpensesBody.error.includes('Access denied'), 'Accountant receives Access denied error');

    const accEmployeesRes = await fetch(`${baseUrl}/admin/hr/employees`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(accEmployeesRes.status === 403, 'Accountant access to /admin/hr/employees returns 403 Forbidden');

    const accSalariesRes = await fetch(`${baseUrl}/admin/hr/salaries`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    assert(accSalariesRes.status === 403, 'Accountant access to /admin/hr/salaries returns 403 Forbidden');
    console.log('RBAC Isolation verified: ACCOUNTANT is strictly prevented from HR & Overhead Expenses.\n');

    // -----------------------------------------------------------------
    // Step 2: Clean up previous test entries for repeatable verification
    // -----------------------------------------------------------------
    console.log('[Step 3] Cleaning up test data from any previous runs...');
    await query(`DELETE FROM expenses WHERE description LIKE '[TEST-PH7]%'`);
    await query(`DELETE FROM salaries WHERE period IN ('2026-11-01', '2026-12-01')`);
    await query(`DELETE FROM employees WHERE full_name LIKE '[TEST-PH7]%'`);
    console.log('Cleanup completed.\n');

    // -----------------------------------------------------------------
    // Step 3: Operating Expenses Management & Category Aggregations
    // -----------------------------------------------------------------
    console.log('[Step 4] Testing Operating Expenses Management (CRUD & Aggregations)...');

    // 4.1 Create multiple expenses across categories
    const exp1Res = await fetch(`${baseUrl}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category: 'RENT',
        amount: 150000,
        description: '[TEST-PH7] Loyer Dépôt Principal Novembre 2026',
        expenseDate: '2026-11-01',
      }),
    });
    assert(exp1Res.status === 201, 'Expense 1 (RENT, 150000 DZD) created');
    const exp1: any = ((await exp1Res.json()) as any).data;

    const exp2Res = await fetch(`${baseUrl}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category: 'ELECTRICITY',
        amount: 35000,
        description: '[TEST-PH7] Sonelgaz Facture Moyenne Tension',
        expenseDate: '2026-11-05',
      }),
    });
    assert(exp2Res.status === 201, 'Expense 2 (ELECTRICITY, 35000 DZD) created');

    const exp3Res = await fetch(`${baseUrl}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category: 'FUEL',
        amount: 12000,
        description: '[TEST-PH7] Plein Gasoil Camion Master',
        expenseDate: '2026-11-08',
      }),
    });
    assert(exp3Res.status === 201, 'Expense 3 (FUEL, 12000 DZD) created');
    const exp3: any = ((await exp3Res.json()) as any).data;

    const exp4Res = await fetch(`${baseUrl}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        category: 'MAINTENANCE',
        amount: 8500,
        description: '[TEST-PH7] Vidange chariot élévateur',
        expenseDate: '2026-11-10',
      }),
    });
    assert(exp4Res.status === 201, 'Expense 4 (MAINTENANCE, 8500 DZD) created');
    const exp4: any = ((await exp4Res.json()) as any).data;

    // 4.2 Query expenses with filter & aggregate validation
    const getExpRes = await fetch(`${baseUrl}/admin/expenses?search=%5BTEST-PH7%5D`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getExpRes.status === 200, 'Fetched test expenses list');
    const getExpData: any = await getExpRes.json();
    assert(getExpData.data.length === 4, 'Found exactly 4 created test expenses');
    assert(getExpData.summary.totalAmount === 205500, 'Summary total matches 150000 + 35000 + 12000 + 8500 = 205,500 DZD');
    assert(getExpData.summary.totalCount === 4, 'Summary count is 4');

    // 4.3 Update an expense (Fuel: 12,000 -> 15,000 DZD)
    const updateExpRes = await fetch(`${baseUrl}/admin/expenses/${exp3.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        amount: 15000,
        description: '[TEST-PH7] Plein Gasoil Camion Master + AdBlue',
      }),
    });
    assert(updateExpRes.status === 200, 'Expense updated successfully');
    const updatedExp: any = ((await updateExpRes.json()) as any).data;
    assert(Number(updatedExp.amount) === 15000, 'Updated expense amount is 15000 DZD');

    // 4.4 Delete an expense (Maintenance: 8,500 DZD)
    const deleteExpRes = await fetch(`${baseUrl}/admin/expenses/${exp4.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteExpRes.status === 200, 'Expense deleted successfully');

    // Verify deletion & updated totals (205,500 - 8,500 + 3,000 = 200,000 DZD)
    const postDelExpRes = await fetch(`${baseUrl}/admin/expenses?search=%5BTEST-PH7%5D`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const postDelExpData: any = await postDelExpRes.json();
    assert(postDelExpData.data.length === 3, 'Expenses count after deletion is 3');
    assert(postDelExpData.summary.totalAmount === 200000, 'Updated total is 200,000 DZD');
    console.log('Expenses CRUD & category calculations validated.\n');

    // -----------------------------------------------------------------
    // Step 4: HR Employee Registry Management
    // -----------------------------------------------------------------
    console.log('[Step 5] Testing HR Personnel & Employee Registry...');

    // 5.1 Create Active Employees
    const emp1Res = await fetch(`${baseUrl}/admin/hr/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: '[TEST-PH7] Mohamed Saidi',
        position: 'Vendeur Comptoir Senior',
        baseSalary: 45000,
        phone: '0550112233',
        nin: '199016160012345678',
        hireDate: '2023-01-15',
        status: 'ACTIVE',
      }),
    });
    assert(emp1Res.status === 201, 'Created Employee 1 (Mohamed Saidi, Base 45000 DZD)');
    const emp1: any = ((await emp1Res.json()) as any).data;

    const emp2Res = await fetch(`${baseUrl}/admin/hr/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: '[TEST-PH7] Yacine Brahimi',
        position: 'Magasinier / Cariste',
        baseSalary: 40000,
        phone: '0550223344',
        nin: '199216160012345679',
        hireDate: '2023-06-01',
        status: 'ACTIVE',
      }),
    });
    assert(emp2Res.status === 201, 'Created Employee 2 (Yacine Brahimi, Base 40000 DZD)');
    const emp2: any = ((await emp2Res.json()) as any).data;

    const emp3Res = await fetch(`${baseUrl}/admin/hr/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: '[TEST-PH7] Amine Belkacem',
        position: 'Chauffeur Livreur B2B',
        baseSalary: 42000,
        phone: '0550334455',
        nin: '199516160012345680',
        hireDate: '2024-02-10',
        status: 'ACTIVE',
      }),
    });
    assert(emp3Res.status === 201, 'Created Employee 3 (Amine Belkacem, Base 42000 DZD)');
    const emp3: any = ((await emp3Res.json()) as any).data;

    // 5.2 List and verify summary metrics
    const listEmpRes = await fetch(`${baseUrl}/admin/hr/employees?search=%5BTEST-PH7%5D`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listEmpRes.status === 200, 'Employees listed successfully');
    const listEmpData: any = await listEmpRes.json();
    assert(listEmpData.data.length === 3, 'Found 3 test employees');

    // 5.3 Update employee
    const updateEmpRes = await fetch(`${baseUrl}/admin/hr/employees/${emp1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        position: 'Responsable Magasin Comptoir',
        base_salary: 48000,
      }),
    });
    assert(updateEmpRes.status === 200, 'Employee 1 updated successfully');
    const updatedEmp1: any = ((await updateEmpRes.json()) as any).data;
    assert(Number(updatedEmp1.base_salary) === 48000, 'Updated base salary is 48000 DZD');
    console.log('Employee registry management validated.\n');

    // -----------------------------------------------------------------
    // Step 5: Monthly Payroll Generation & Bonus/Deductions Invariant
    // -----------------------------------------------------------------
    console.log('[Step 6] Testing Monthly Payroll Generation & Calculation...');
    const period = '2026-11-01';

    // 6.1 Generate Payroll
    const genPayrollRes = await fetch(`${baseUrl}/admin/hr/salaries/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ period }),
    });
    assert(genPayrollRes.status === 200 || genPayrollRes.status === 201, 'Payroll generated for period 2026-11');
    const genData: any = ((await genPayrollRes.json()) as any).data;
    
    // Find our test employees in generated salaries
    const testSalaries = genData.salaries.filter((s: any) =>
      s.employee_name.startsWith('[TEST-PH7]')
    );
    assert(testSalaries.length === 3, 'Generated payroll contains all 3 test employees');

    const sEmp1 = testSalaries.find((s: any) => s.employee_id === emp1.id);
    const sEmp2 = testSalaries.find((s: any) => s.employee_id === emp2.id);
    const sEmp3 = testSalaries.find((s: any) => s.employee_id === emp3.id);

    assert(Number(sEmp1.base_salary) === 48000, 'Emp1 base salary initialized to 48000');
    assert(Number(sEmp2.base_salary) === 40000, 'Emp2 base salary initialized to 40000');
    assert(Number(sEmp3.base_salary) === 42000, 'Emp3 base salary initialized to 42000');
    assert(!sEmp1.paid && !sEmp2.paid && !sEmp3.paid, 'All newly generated salaries are unpaid (paid = false)');

    // 6.2 Adjust bonuses and deductions for Emp1 (Mohamed)
    // Bonus1 (Aïd): 10,000 DZD, Bonus2 (Rendement): 5,000 DZD, Retenue: 3,000 DZD
    // Expected Net: 48,000 + 10,000 + 5,000 - 3,000 = 60,000 DZD
    const updateSal1Res = await fetch(`${baseUrl}/admin/hr/salaries/${sEmp1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bonus1: 10000,
        bonus2: 5000,
        deductions: 3000,
      }),
    });
    assert(updateSal1Res.status === 200, 'Updated Emp1 salary bonuses & deductions');
    const updatedSal1: any = ((await updateSal1Res.json()) as any).data;
    assert(Number(updatedSal1.bonus1) === 10000, 'Bonus1 is 10000 DZD');
    assert(Number(updatedSal1.bonus2) === 5000, 'Bonus2 is 5000 DZD');
    assert(Number(updatedSal1.deductions) === 3000, 'Deductions is 3000 DZD');
    assert(Number(updatedSal1.total) === 60000, 'Net salary total is strictly 60,000 DZD');

    // 6.3 Adjust deductions for Emp2 (Yacine): Avance sur salaire 5,000 DZD
    // Expected Net: 40,000 - 5,000 = 35,000 DZD
    const updateSal2Res = await fetch(`${baseUrl}/admin/hr/salaries/${sEmp2.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        deductions: 5000,
      }),
    });
    assert(updateSal2Res.status === 200, 'Updated Emp2 salary deductions');
    const updatedSal2: any = ((await updateSal2Res.json()) as any).data;
    assert(Number(updatedSal2.total) === 35000, 'Emp2 net salary is strictly 35,000 DZD');

    // 6.4 Mark Emp1 salary as paid
    const paySal1Res = await fetch(`${baseUrl}/admin/hr/salaries/${sEmp1.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        paid: true,
        paymentDate: '2026-11-28',
      }),
    });
    assert(paySal1Res.status === 200, 'Marked Emp1 salary as paid');
    const paidSal1: any = ((await paySal1Res.json()) as any).data;
    assert(paidSal1.paid === true, 'Emp1 salary has paid = true');
    assert(paidSal1.payment_date?.substring(0, 10) === '2026-11-28', 'Emp1 payment_date recorded');

    // 6.5 Verify payroll overview query
    const getPayrollRes = await fetch(`${baseUrl}/admin/hr/salaries?period=${period}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getPayrollRes.status === 200, 'Fetched period payroll sheet');
    const payrollData: any = ((await getPayrollRes.json()) as any).data;
    assert(payrollData.summary.paidCount >= 1, 'Summary reflects at least 1 paid salary');
    console.log('Payroll calculation and settlement validated.\n');

    // -----------------------------------------------------------------
    // Step 6: Employee Termination Protection & Foreign Key Safety
    // -----------------------------------------------------------------
    console.log('[Step 7] Testing Termination Protection & Historical Payroll Integrity...');

    // 7.1 Create a temporary employee with NO payroll history
    const tempEmpRes = await fetch(`${baseUrl}/admin/hr/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: '[TEST-PH7] Karim Stagiaire Temp',
        position: 'Stagiaire',
        baseSalary: 25000,
      }),
    });
    assert(tempEmpRes.status === 201, 'Created temporary employee with no salaries');
    const tempEmp: any = ((await tempEmpRes.json()) as any).data;

    // Delete temporary employee: row should be completely deleted
    const delTempRes = await fetch(`${baseUrl}/admin/hr/employees/${tempEmp.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delTempRes.status === 200, 'Deleted temporary employee');
    const checkTempRes = await query('SELECT id FROM employees WHERE id = $1', [tempEmp.id]);
    assert(checkTempRes.rows.length === 0, 'Temporary employee row was cleanly removed from DB');

    // 7.2 Delete Employee 1 (Mohamed Saidi), who has an existing salary in `salaries`
    // Rather than failing with FK violation or deleting historical pay, status must transition to 'TERMINATED'
    const delEmp1Res = await fetch(`${baseUrl}/admin/hr/employees/${emp1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delEmp1Res.status === 200, 'Delete request for employee with salary history succeeded');
    const delEmp1Data: any = await delEmp1Res.json();
    assert(delEmp1Data.data.status === 'TERMINATED', 'Employee was safely archived as TERMINATED');
    assert(delEmp1Data.data.archived === true, 'Response confirms employee was archived');

    // Verify DB still holds historical salaries for Mohamed
    const checkSalRes = await query('SELECT id, total, paid FROM salaries WHERE employee_id = $1', [emp1.id]);
    assert(checkSalRes.rows.length > 0, 'Historical salary records were preserved intact');
    assert(checkSalRes.rows[0].paid === true, 'Historical salary payment status preserved');

    // 7.3 Generate payroll for the subsequent month: '2026-12-01'
    const genDecRes = await fetch(`${baseUrl}/admin/hr/salaries/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ period: '2026-12-01' }),
    });
    assert(genDecRes.status === 200 || genDecRes.status === 201, 'Generated December 2026 payroll');
    const decSalaries = ((await genDecRes.json()) as any).data.salaries.filter((s: any) =>
      s.employee_name.startsWith('[TEST-PH7]')
    );

    // Verify terminated employee Mohamed was NOT included in new month's payroll
    const decEmp1Salary = decSalaries.find((s: any) => s.employee_id === emp1.id);
    assert(!decEmp1Salary, 'Terminated employee is automatically excluded from subsequent payroll generation');

    const decEmp2Salary = decSalaries.find((s: any) => s.employee_id === emp2.id);
    const decEmp3Salary = decSalaries.find((s: any) => s.employee_id === emp3.id);
    assert(!!decEmp2Salary && !!decEmp3Salary, 'Active employees (Yacine and Amine) are properly included in December payroll');
    console.log('Termination protection and payroll continuity validated.\n');

    // -----------------------------------------------------------------
    // Final Clean up
    // -----------------------------------------------------------------
    console.log('[Step 8] Cleaning up test records...');
    await query(`DELETE FROM expenses WHERE description LIKE '[TEST-PH7]%'`);
    await query(`DELETE FROM salaries WHERE period IN ('2026-11-01', '2026-12-01')`);
    await query(`DELETE FROM employees WHERE full_name LIKE '[TEST-PH7]%'`);
    console.log('Cleanup completed.\n');

    console.log('======================================================');
    console.log('🎉 ALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runPhase7Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Phase 7 Verification Failed:', err);
    process.exit(1);
  });
