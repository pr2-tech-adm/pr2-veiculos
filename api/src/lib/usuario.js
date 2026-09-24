function lerUsuario(request) {
  const cabecalho = request.headers.get('x-ms-client-principal');
  if (!cabecalho) return null;
  return JSON.parse(Buffer.from(cabecalho, 'base64').toString('utf8'));
}

function temRole(usuario, role) {
  return !!usuario && usuario.userRoles.includes(role);
}

module.exports = { lerUsuario, temRole };