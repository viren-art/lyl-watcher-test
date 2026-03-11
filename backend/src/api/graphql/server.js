const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Extract JWT token from Authorization header
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return { user: null };
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded };
      } catch (error) {
        return { user: null };
      }
    },
    formatError: (error) => {
      // Log error for monitoring
      console.error('GraphQL Error:', error);

      // Return sanitized error to client
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      };
    },
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production'
  });
};

module.exports = createApolloServer;