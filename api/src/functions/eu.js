const { app } = require('@azure/functions');

function lerUsuario(request) {
  const cabecalho = request.headers.get('x-ms-client-principal');
  if (!cabecalho) return null;
  const texto = Buffer.from(cabecalho, 'base64').toString('utf8');
  return JSON.parse(texto);
}

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