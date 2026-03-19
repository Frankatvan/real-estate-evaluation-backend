-- ============================================
-- 房地产成本收益测算系统 - Supabase数据库初始化脚本
-- ============================================
-- 此脚本包含所有必要的数据表创建和配置
-- 在Supabase SQL编辑器中一次性执行此文件
-- ============================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_role CHECK (role IN ('USER', 'ADMIN', 'MANAGER'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. 创建项目表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    total_units INTEGER,
    total_area DECIMAL(12, 2),
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 3. 创建版本表
CREATE TABLE IF NOT EXISTS versions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(200),
    description TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_version UNIQUE (project_id, version_number)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_versions_project_id ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_creator_id ON versions(creator_id);
CREATE INDEX IF NOT EXISTS idx_versions_is_current ON versions(is_current);

-- 4. 创建Excel文件表
CREATE TABLE IF NOT EXISTS excel_files (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_file_type CHECK (file_type IN ('SALES', 'CONSTRUCTION', 'UNITS', 'TENANTS', 'PLAN'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_excel_files_version_id ON excel_files(version_id);

-- 5. 创建销售数据表
CREATE TABLE IF NOT EXISTS sales_data (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    unit_code VARCHAR(50) NOT NULL,
    unit_type VARCHAR(50),
    actual_price DECIMAL(12, 2),
    expected_price DECIMAL(12, 2),
    closing_date DATE,
    version_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_unit_sale UNIQUE (version_id, unit_code)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sales_data_version_id ON sales_data(version_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_unit_code ON sales_data(unit_code);

-- 6. 创建施工数据表
CREATE TABLE IF NOT EXISTS construction_data (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    unit_code VARCHAR(50),
    cost_code VARCHAR(50) NOT NULL,
    vendor VARCHAR(200),
    category VARCHAR(50),
    amount DECIMAL(12, 2),
    clear_date DATE,
    due_date DATE,
    is_cleared BOOLEAN DEFAULT FALSE,
    notes TEXT,
    version_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_construction_data_version_id ON construction_data(version_id);
CREATE INDEX IF NOT EXISTS idx_construction_data_unit_code ON construction_data(unit_code);
CREATE INDEX IF NOT EXISTS idx_construction_data_cost_code ON construction_data(cost_code);

-- 7. 创建单元数据表
CREATE TABLE IF NOT EXISTS units_data (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    unit_code VARCHAR(50) NOT NULL,
    unit_type VARCHAR(50),
    area DECIMAL(10, 2),
    floor INTEGER,
    building VARCHAR(100),
    status VARCHAR(20),
    version_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_unit UNIQUE (version_id, unit_code)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_units_data_version_id ON units_data(version_id);
CREATE INDEX IF NOT EXISTS idx_units_data_unit_code ON units_data(unit_code);

-- 8. 创建租户数据表
CREATE TABLE IF NOT EXISTS tenants_data (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    unit_code VARCHAR(50),
    tenant_name VARCHAR(200) NOT NULL,
    lease_start_date DATE,
    lease_end_date DATE,
    monthly_rent DECIMAL(12, 2),
    rental_deposit DECIMAL(12, 2),
    version_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tenants_data_version_id ON tenants_data(version_id);
CREATE INDEX IF NOT EXISTS idx_tenants_data_unit_code ON tenants_data(unit_code);
CREATE INDEX IF NOT EXISTS idx_tenants_data_tenant_name ON tenants_data(tenant_name);

-- 9. 创建计划数据表
CREATE TABLE IF NOT EXISTS plan_data (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    unit_code VARCHAR(50),
    planned_start_date DATE,
    planned_end_date DATE,
    planned_cost DECIMAL(12, 2),
    phase VARCHAR(50),
    version_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plan_unit UNIQUE (version_id, unit_code)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_plan_data_version_id ON plan_data(version_id);
CREATE INDEX IF NOT EXISTS idx_plan_data_unit_code ON plan_data(unit_code);

-- 10. 创建测算参数表
CREATE TABLE IF NOT EXISTS calculation_parameters (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    benchmark_selling_price DECIMAL(12, 2),
    wbg_income_calculation_method VARCHAR(50),
    loan_interest_rate DECIMAL(5, 4),
    terminal_value DECIMAL(12, 2),
    five_year_value DECIMAL(12, 2),
    restenants_cost_rate DECIMAL(5, 4),
    sales_commission_fixed DECIMAL(12, 2),
    sales_commission_rate DECIMAL(5, 4),
    vacancy_rate DECIMAL(5, 4),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_parameters UNIQUE (version_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_calculation_parameters_version_id ON calculation_parameters(version_id);

-- 11. 创建测算结果表
CREATE TABLE IF NOT EXISTS calculation_results (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    result_type VARCHAR(50) NOT NULL,
    result_key VARCHAR(100),
    result_value DECIMAL(18, 6),
    result_text TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_calculation_results_version_id ON calculation_results(version_id);
CREATE INDEX IF NOT EXISTS idx_calculation_results_type ON calculation_results(result_type);
CREATE INDEX IF NOT EXISTS idx_calculation_results_calculated_at ON calculation_results(calculated_at DESC);

-- 12. 创建文件上传记录表
CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_type VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_upload_type CHECK (upload_type IN ('sales_import', 'construction_import', 'units_import', 'tenants_import', 'plan_import'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_file_uploads_version_id ON file_uploads(version_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_type ON file_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_at ON file_uploads(uploaded_at DESC);

-- 13. 创建触发器函数自动更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. 创建数据库视图简化查询
CREATE OR REPLACE VIEW projects_with_versions AS
SELECT
    p.*,
    COUNT(v.id) as version_count,
    MAX(CASE WHEN v.is_current THEN v.id END) as current_version_id,
    MAX(CASE WHEN v.is_current THEN v.name END) as current_version_name
FROM projects p
LEFT JOIN versions v ON p.id = v.project_id
GROUP BY p.id;

CREATE OR REPLACE VIEW versions_with_stats AS
SELECT
    v.*,
    COUNT(DISTINCT sd.id) as sales_count,
    COUNT(DISTINCT cd.id) as construction_count,
    COUNT(DISTINCT ud.id) as units_count,
    COUNT(DISTINCT td.id) as tenants_count
FROM versions v
LEFT JOIN sales_data sd ON v.id = sd.version_id
LEFT JOIN construction_data cd ON v.id = cd.version_id
LEFT JOIN units_data ud ON v.id = ud.version_id
LEFT JOIN tenants_data td ON v.id = td.version_id
GROUP BY v.id;

-- 15. 添加表注释
COMMENT ON TABLE users IS '系统用户表，存储认证和用户信息';
COMMENT ON TABLE projects IS '房地产项目表，存储项目基本信息';
COMMENT ON TABLE versions IS '项目版本表，支持项目数据版本控制';
COMMENT ON TABLE sales_data IS '销售数据表，存储单元销售信息';
COMMENT ON TABLE construction_data IS '施工成本数据表';
COMMENT ON TABLE units_data IS '单元数据表，存储物业单元信息';
COMMENT ON TABLE tenants_data IS '租户数据表，存储租赁信息';
COMMENT ON TABLE plan_data IS '计划数据表，存储施工计划信息';
COMMENT ON TABLE calculation_parameters IS '测算参数表，存储财务测算配置';
COMMENT ON TABLE calculation_results IS '测算结果表，存储计算结果';
COMMENT ON TABLE file_uploads IS '文件上传记录表';

-- 16. 创建性能优化索引
CREATE INDEX IF NOT EXISTS idx_sales_data_composite ON sales_data(version_id, unit_code);
CREATE INDEX IF NOT EXISTS idx_units_data_composite ON units_data(version_id, unit_code);
CREATE INDEX IF NOT EXISTS idx_tenants_data_composite ON tenants_data(version_id, unit_code);
CREATE INDEX IF NOT EXISTS idx_plan_data_composite ON plan_data(version_id, unit_code);

-- ============================================
-- 数据库初始化完成
-- ============================================
-- 所有表已创建，索引已建立，触发器已配置
-- 可以开始使用系统
-- ============================================