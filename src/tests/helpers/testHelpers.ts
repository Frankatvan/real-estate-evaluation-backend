import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  company_name: string;
}

interface TestProject {
  id: string;
  user_id: string;
  name: string;
  location: string;
  total_area: number;
  project_type: string;
}

export class TestHelpers {
  constructor(private pool: Pool) {}

  async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUser: TestUser = {
      id: `test-${Date.now()}`,
      username: `testuser-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      company_name: 'Test Company'
    };

    const userData = { ...defaultUser, ...overrides };
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    await this.pool.query(
      `INSERT INTO users (id, username, email, password, company_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [userData.id, userData.username, userData.email, hashedPassword, userData.company_name]
    );

    return userData;
  }

  async createTestProject(userId: string, overrides: Partial<TestProject> = {}): Promise<TestProject> {
    const defaultProject: TestProject = {
      id: `test-project-${Date.now()}`,
      user_id: userId,
      name: `Test Project ${Date.now()}`,
      location: 'Test Location',
      total_area: 10000,
      project_type: 'residential'
    };

    const projectData = { ...defaultProject, ...overrides };

    await this.pool.query(
      `INSERT INTO projects (id, user_id, name, location, total_area, project_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectData.id, projectData.user_id, projectData.name, projectData.location, projectData.total_area, projectData.project_type]
    );

    return projectData;
  }

  async generateAuthToken(userId: string): Promise<string> {
    const secret = process.env.JWT_SECRET || 'test-secret-key';
    return jwt.sign({ userId }, secret, { expiresIn: '1h' });
  }

  async cleanupTestData(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM calculation_results WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM plan_data WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM calculation_parameters WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM tenants_data WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM units_data WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM construction_data WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM sales_data WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM excel_files WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM project_versions WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM projects WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  async cleanupAllTestData(): Promise<void> {
    await this.pool.query("DELETE FROM calculation_results WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM plan_data WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM calculation_parameters WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM tenants_data WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM units_data WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM construction_data WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM sales_data WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM excel_files WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM project_versions WHERE project_id IN (SELECT id FROM projects WHERE user_id LIKE 'test-%')");
    await this.pool.query("DELETE FROM projects WHERE user_id LIKE 'test-%'");
    await this.pool.query("DELETE FROM users WHERE id LIKE 'test-%'");
  }

  async truncateTable(tableName: string): Promise<void> {
    await this.pool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
  }

  async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  async insertTestSalesData(projectId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO sales_data (project_id, total_units, average_price, total_revenue)
       VALUES ($1, $2, $3, $4)`,
      [projectId, 100, 50000, 5000000]
    );
  }

  async insertTestConstructionData(projectId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO construction_data (project_id, land_cost, construction_cost, infrastructure_cost, other_costs)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, 1000000, 2000000, 500000, 300000]
    );
  }

  async insertTestCalculationResult(projectId: string, scenarioName?: string): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO calculation_results (project_id, npv, irr, roi, payback_period, scenario_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [projectId, 1000000, 0.15, 0.25, 3.5, scenarioName || `Scenario ${Date.now()}`]
    );
    return result.rows[0].id;
  }
}

export default TestHelpers;
