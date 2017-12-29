const { GraphQLServer } = require('graphql-yoga')
const { importSchema } = require('graphql-import')
const { Graphcool } = require('graphcool-binding')
const { me, signup, login, updatePassword, AuthPayload } = require('./auth')

const typeDefs = importSchema('./src/schema.graphql')

const resolvers = {
  Query: {
    me,
  },
  Mutation: {
    signup,
    login,
    updatePassword
  },
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: req => ({
    ...req,
    db: new Graphcool({
      schemaPath: './database/schema.generated.graphql',
      endpoint: process.env.GRAPHCOOL_ENDPOINT,
      secret: process.env.GRAPHCOOL_SECRET,
      debug: true,
    }),
  }),
})

server.start(() => console.log('Server is running on http://localhost:4000'))
