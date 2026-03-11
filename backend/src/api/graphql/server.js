const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const logger = require('../../utils/logger');

const createApolloServer = () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Extract user from JWT token
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return { user: null };
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return {
          user: {
            userId: decoded.userId,
            customerId: decoded.customerId,
            role: decoded.role,
            regions: decoded.regions || []
          }
        };
      } catch (error) {
        logger.warn('Invalid JWT token in GraphQL request', { error: error.message });
        return { user: null };
      }
    },
    formatError: (error) => {
      logger.error('GraphQL error', {
        message: error.message,
        path: error.path,
        extensions: error.extensions
      });

      // Don't expose internal errors to clients
      if (error.message.includes('Database') || error.message.includes('Internal')) {
        return new Error('An internal error occurred');
      }

      return error;
    },
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production'
  });

  return server;
};

module.exports = createApolloServer;