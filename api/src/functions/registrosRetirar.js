const { app } = require('@azure/functions');
const crypto = require('crypto');
const { lerUsuario, temRole } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');
const { obterContainer } = require('../lib/blobs');

const FOTOS = ['frente', 'traseira', 'lateralDireita', 'lateralEsquerda', 'interior', 'painel'];
const COMBUSTIVEIS = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];
const MAX_FOTO = 3 * 1024 * 1024;
const MAX_ASSINATURA = 512 * 1024;

const erro = (status, mensagem) => ({ status, jsonBody: { erro: mensagem } });

const ehJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const ehPng = (b) => b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

async function lerArquivo(form, campo, max, validador) {
  const arquivo = form.get(campo);
  if (!arquivo || typeof arquivo === 'string' || arquivo.size > max) return null;
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  return validador(buffer) ? buffer : null;
}

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

app.http('registrosRetirar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'registros/retirar',
  handler: async (request, context) => {
    const usuario = lerUsuario(request);
    if (!temRole(usuario, 'tecnico') && !temRole(usuario, 'admin')) {
      return erro(403, 'Sem permissão');
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return erro(400, 'Formulário inválido');
    }

    const placa = String(form.get('placa') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const kmRetirada = Number(form.get('kmRetirada'));
    const combustivel = String(form.get('combustivel') || '');
    const destino = String(form.get('destino') || '').trim();
    const devolucaoPrevista = String(form.get('devolucaoPrevista') || '');
    const observacoes = String(form.get('observacoes') || '').trim();

    if (placa.length !== 7) return erro(400, 'Placa inválida');
    if (!Number.isFinite(kmRetirada) || kmRetirada < 0) return erro(400, 'Km inválido');
    if (!COMBUSTIVEIS.includes(combustivel)) return erro(400, 'Combustível inválido');
    if (!destino) return erro(400, 'Destino é obrigatório');
    if (Number.isNaN(Date.parse(devolucaoPrevista))) return erro(400, 'Data de devolução inválida');

    const arquivos = {};
    for (const nome of FOTOS) {
      const buffer = await lerArquivo(form, nome, MAX_FOTO, ehJpeg);
      if (!buffer) return erro(400, `Foto obrigatória ausente ou inválida: ${nome}`);
      arquivos[nome] = buffer;
    }
    const assinatura = await lerArquivo(form, 'assinatura', MAX_ASSINATURA, ehPng);
    if (!assinatura) return erro(400, 'Assinatura obrigatória ausente ou inválida');

    const tabelaVeiculos = obterTabela('Veiculos');
    let veiculo;
    try {
      veiculo = await tabelaVeiculos.getEntity('veiculo', placa);
    } catch (e) {
      if (e.statusCode === 404) return erro(404, 'Veículo não encontrado');
      throw e;
    }
    if (veiculo.status !== 'Disponivel') return erro(409, 'Veículo indisponível');

    const agora = new Date();
    const id = `${9999999999999 - agora.getTime()}-${crypto.randomBytes(3).toString('hex')}`;

    try {
      await tabelaVeiculos.updateEntity(
        {
          partitionKey: 'veiculo',
          rowKey: placa,
          status: 'EmUso',
          usuarioAtual: usuario.userDetails,
          registroAtual: id
        },
        'Merge',
        { etag: veiculo.etag }
      );
    } catch (e) {
      if (e.statusCode === 412) return erro(409, 'Outro técnico acabou de retirar este veículo');
      throw e;
    }

    try {
      const container = obterContainer('fotos');
      const hashes = {};

      for (const nome of FOTOS) {
        await container
          .getBlockBlobClient(`${placa}/${id}/retirada-${nome}.jpg`)
          .uploadData(arquivos[nome], { blobHTTPHeaders: { blobContentType: 'image/jpeg' } });
        hashes[nome] = sha256(arquivos[nome]);
      }
      await container
        .getBlockBlobClient(`${placa}/${id}/retirada-assinatura.png`)
        .uploadData(assinatura, { blobHTTPHeaders: { blobContentType: 'image/png' } });
      hashes.assinatura = sha256(assinatura);

      await obterTabela('Registros').createEntity({
        partitionKey: placa,
        rowKey: id,
        status: 'EmUso',
        usuarioRetirada: usuario.userDetails,
        retiradaEm: agora.toISOString(),
        kmRetirada,
        combustivelRetirada: combustivel,
        destino,
        devolucaoPrevista: new Date(devolucaoPrevista).toISOString(),
        observacoesRetirada: observacoes,
        hashesRetirada: JSON.stringify(hashes)
      });
    } catch (e) {
      context.error('Falha ao gravar retirada', e);
      await tabelaVeiculos.updateEntity(
        { partitionKey: 'veiculo', rowKey: placa, status: 'Disponivel', usuarioAtual: '', registroAtual: '' },
        'Merge'
      );
      return erro(500, 'Falha ao gravar o registro. Tente novamente.');
    }

    return { status: 201, jsonBody: { id, placa, retiradaEm: agora.toISOString() } };
  }
});