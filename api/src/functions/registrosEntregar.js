const { app } = require('@azure/functions');
const { lerUsuario, temRole, mesmoUsuario } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');
const { obterContainer } = require('../lib/blobs');
const { FOTOS, COMBUSTIVEIS, lerChecklist, sha256 } = require('../lib/arquivos');

const erro = (status, mensagem) => ({ status, jsonBody: { erro: mensagem } });

app.http('registrosEntregar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'registros/entregar',
  handler: async (request, context) => {
    const usuario = lerUsuario(request);
    const admin = temRole(usuario, 'admin');
    if (!temRole(usuario, 'tecnico') && !admin) return erro(403, 'Sem permissão');

    let form;
    try {
      form = await request.formData();
    } catch {
      return erro(400, 'Formulário inválido');
    }

    const placa = String(form.get('placa') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const kmEntrega = Number(form.get('kmEntrega'));
    const combustivel = String(form.get('combustivel') || '');
    const observacoes = String(form.get('observacoes') || '').trim();
    const avaria = form.get('avaria') === 'true';

    if (placa.length !== 7) return erro(400, 'Placa inválida');
    if (!Number.isFinite(kmEntrega) || kmEntrega < 0) return erro(400, 'Km inválido');
    if (!COMBUSTIVEIS.includes(combustivel)) return erro(400, 'Combustível inválido');
    if (avaria && !observacoes) return erro(400, 'Descreva a avaria nas observações');

    const checklist = await lerChecklist(form);
    if (checklist.erro) return erro(400, checklist.erro);

    const tabelaVeiculos = obterTabela('Veiculos');
    const tabelaRegistros = obterTabela('Registros');

    let veiculo;
    try {
      veiculo = await tabelaVeiculos.getEntity('veiculo', placa);
    } catch (e) {
      if (e.statusCode === 404) return erro(404, 'Veículo não encontrado');
      throw e;
    }
    if (veiculo.status !== 'EmUso' || !veiculo.registroAtual) {
      return erro(409, 'Este veículo não está em uso');
    }

    const dono = mesmoUsuario(veiculo.usuarioAtual, usuario.userDetails);
    if (!dono && !admin) {
      return erro(403, 'Somente quem retirou o veículo (ou um administrador) pode entregá-lo');
    }

    let registro;
    try {
      registro = await tabelaRegistros.getEntity(placa, veiculo.registroAtual);
    } catch (e) {
      if (e.statusCode === 404) return erro(409, 'Registro de retirada não encontrado');
      throw e;
    }
    if (registro.status !== 'EmUso') return erro(409, 'Este uso já foi encerrado');
    if (kmEntrega < registro.kmRetirada) {
      return erro(400, `O km de entrega não pode ser menor que o da retirada (${registro.kmRetirada})`);
    }

    const id = registro.rowKey;
    const agora = new Date();

    try {
      const container = obterContainer('fotos');
      const hashes = {};

      for (const nome of FOTOS) {
        await container
          .getBlockBlobClient(`${placa}/${id}/entrega-${nome}.jpg`)
          .uploadData(checklist.fotos[nome], { blobHTTPHeaders: { blobContentType: 'image/jpeg' } });
        hashes[nome] = sha256(checklist.fotos[nome]);
      }
      await container
        .getBlockBlobClient(`${placa}/${id}/entrega-assinatura.png`)
        .uploadData(checklist.assinatura, { blobHTTPHeaders: { blobContentType: 'image/png' } });
      hashes.assinatura = sha256(checklist.assinatura);

      await tabelaRegistros.updateEntity(
        {
          partitionKey: placa,
          rowKey: id,
          status: 'Concluido',
          usuarioEntrega: usuario.userDetails,
          entregaEm: agora.toISOString(),
          kmEntrega,
          combustivelEntrega: combustivel,
          observacoesEntrega: observacoes,
          avaria,
          hashesEntrega: JSON.stringify(hashes)
        },
        'Merge',
        { etag: registro.etag }
      );
    } catch (e) {
      if (e.statusCode === 412) return erro(409, 'Este uso já foi encerrado');
      context.error('Falha ao gravar entrega', e);
      return erro(500, 'Falha ao gravar o registro. Tente novamente.');
    }

    try {
      await tabelaVeiculos.updateEntity(
        {
          partitionKey: 'veiculo',
          rowKey: placa,
          status: 'Disponivel',
          kmAtual: kmEntrega,
          usuarioAtual: '',
          registroAtual: ''
        },
        'Merge',
        { etag: veiculo.etag }
      );
    } catch (e) {
      context.error('Falha ao liberar veículo', e);
      await tabelaRegistros.updateEntity(
        { partitionKey: placa, rowKey: id, status: 'EmUso' },
        'Merge'
      );
      return erro(500, 'Falha ao liberar o veículo. Tente novamente.');
    }

    return { status: 201, jsonBody: { id, placa, entregaEm: agora.toISOString() } };
  }
});