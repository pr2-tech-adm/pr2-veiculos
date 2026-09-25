const crypto = require('crypto');

const FOTOS = ['frente', 'traseira', 'lateralDireita', 'lateralEsquerda', 'interior', 'interior2', 'painel']; // ⚠️ confirmar - ver abaixo

const COMBUSTIVEIS = ['Vazio', 'Reserva', '1/4', '1/2', '3/4', 'Cheio']; // ⚠️ chute - confirmar

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function lerChecklist(form) {
  const fotos = {};
  for (const nome of FOTOS) {
    const arquivo = form.get(nome);
    if (!arquivo || typeof arquivo.arrayBuffer !== 'function') {
      return { erro: `Foto "${nome}" é obrigatória` };
    }
    fotos[nome] = Buffer.from(await arquivo.arrayBuffer());
  }

  const assinaturaArquivo = form.get('assinatura');
  if (!assinaturaArquivo || typeof assinaturaArquivo.arrayBuffer !== 'function') {
    return { erro: 'Assinatura é obrigatória' };
  }
  const assinatura = Buffer.from(await assinaturaArquivo.arrayBuffer());

  return { fotos, assinatura };
}

module.exports = { FOTOS, COMBUSTIVEIS, lerChecklist, sha256 };