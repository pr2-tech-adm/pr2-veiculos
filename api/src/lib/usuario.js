function lerUsuario(request) {
  const cabecalho = request.headers.get('x-ms-client-principal');
  if (!cabecalho) return null;
  return JSON.parse(Buffer.from(cabecalho, 'base64').toString('utf8'));
}

function temRole(usuario, role) {
  return !!usuario && usuario.userRoles.includes(role);
}

function normalizar(valor) {
  return String(valor || '').trim().toLowerCase();
}

function mesmoUsuario(a, b) {
  return normalizar(a) !== '' && normalizar(a) === normalizar(b);
}

module.exports = { lerUsuario, temRole, normalizar, mesmoUsuario };