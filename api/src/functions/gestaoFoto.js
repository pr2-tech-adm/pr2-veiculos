const { app } = require('@azure/functions');
const { lerUsuario, temRole } = require('../lib/usuario');
const { obterContainer } = require('../lib/blobs');

const PLACA = /^[A-Z0-9]{7}$/;
const ID = /^[0-9]+-[a-f0-9]{6}$/;
const ARQUIVO = /^(retirada|entrega)-(frente|traseira|lateralDireita|lateralEsquerda|interior|painel|assinatura)\.(jpg|png)$/;

app.http('gestaoFoto', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'gestao/foto/{placa}/{id}/{arquivo}',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!temRole(usuario, 'admin')) {
      return { status: 403, jsonBody: { erro: 'Apenas administradores' } };
    }

    const { placa, id, arquivo } = request.params;
    if (!PLACA.test(placa) || !ID.test(id) || !ARQUIVO.test(arquivo)) {
      return { status: 400, jsonBody: { erro: 'Parâmetros inválidos' } };
    }

    const blob = obterContainer('fotos').getBlobClient(`${placa}/${id}/${arquivo}`);

    let conteudo;
    try {
      conteudo = await blob.downloadToBuffer();
    } catch (e) {
      if (e.statusCode === 404) return { status: 404, jsonBody: { erro: 'Arquivo não encontrado' } };
      throw e;
    }

    return {
      status: 200,
      body: conteudo,
      headers: {
        'Content-Type': arquivo.endsWith('.png') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'private, max-age=3600'
      }
    };
  }
});