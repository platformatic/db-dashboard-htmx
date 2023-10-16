/** @param {import('fastify').FastifyInstance} fastify */
export default async function (fastify, opts) {
  fastify.get('/', async (request, reply) => {
    return reply.html`
      <section>
        <header>
          <h1>Welcome to Platformatic DB Dashboard</h2>
        </header>
      </section>
    `
  })
}
