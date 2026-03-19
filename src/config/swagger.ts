import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation automatically from JSDoc comments
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '房地产成本收益测算系统 API',
      version: '1.0.0',
      description: `
        房地产成本收益测算系统的RESTful API文档。

        ## 功能特性
        - 用户认证和权限管理
        - 项目管理和版本控制
        - Excel数据导入
        - 财务测算和分析
        - 计划和付款管理

        ## 认证
        大部分API端点需要JWT认证。请先调用 \`/api/v1/users/login\` 获取token，
        然后在请求头中添加 \`Authorization: Bearer <token>\`。
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '用户ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'MANAGER'],
              description: '用户角色'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '项目ID'
            },
            name: {
              type: 'string',
              description: '项目名称'
            },
            description: {
              type: 'string',
              description: '项目描述'
            },
            location: {
              type: 'string',
              description: '项目位置'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'],
              description: '项目状态'
            }
          }
        },
        CalculationParameters: {
          type: 'object',
          properties: {
            benchmarkSellingPrice: {
              type: 'number',
              description: '基准售价'
            },
            loanInterestRate: {
              type: 'number',
              description: '贷款利率'
            },
            vacancyRate: {
              type: 'number',
              description: '空置率'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '错误信息'
            },
            details: {
              type: 'object',
              description: '详细错误信息'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功'
            },
            message: {
              type: 'string',
              description: '响应消息'
            },
            data: {
              type: 'object',
              description: '响应数据'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);