const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Performance Testing Platform API',
      version: '1.0.0',
      description: 'API endpoints for the performance testing platform with k6 + JMeter support',
      contact: {
        name: 'QA Team',
        email: 'qa@example.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Product ID',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            price: {
              type: 'number',
              description: 'Product price',
            },
            stock: {
              type: 'number',
              description: 'Product stock quantity',
            },
          },
          required: ['id', 'name', 'price', 'stock'],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
