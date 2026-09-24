const { app } = require('@azure/functions');
const { lerUsuario } = require('../lib/usuario');

app.http('eu', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'eu',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!usuario) {
      return { status: 401, jsonBody: { erro: 'Não autenticado' } };
    }
    return {
      jsonBody: { usuario: usuario.userDetails, roles: usuario.userRoles }
    };
  }
});