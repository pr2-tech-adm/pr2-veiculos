const crypto = require('crypto');

const FOTOS = ['frente', 'traseira', 'lateralDireita', 'lateralEsquerda', 'interior', 'painel'];
const COMBUSTIVEIS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];
const MAX_FOTO = 3 * 1024 * 1024;
const MAX_ASSINATURA = 512 * 1024;

const ehJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const ehPng = (b) => b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

async function lerArquivo(form, campo, max, validador) {
  const arquivo = form.get(campo);
  if (!arquivo || typeof arquivo === 'string' || arquivo.size > max) return null;
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  return validador(buffer) ? buffer : null;
}

async function lerChecklist(form) {
  const fotos = {};
  for (const nome of FOTOS) {
    const buffer = await lerArquivo(form, nome, MAX_FOTO, ehJpeg);
    if (!buffer) return { erro: `Foto obrigatória ausente ou inválida: ${nome}` };
    fotos[nome] = buffer;
  }
  const assinatura = await lerArquivo(form, 'assinatura', MAX_ASSINATURA, ehPng);
  if (!assinatura) return { erro: 'Assinatura obrigatória ausente ou inválida' };
  return { fotos, assinatura };
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

module.exports = { FOTOS, COMBUSTIVEIS, lerChecklist, sha256 };