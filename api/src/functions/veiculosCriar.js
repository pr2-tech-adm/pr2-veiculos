const { app } = require('@azure/functions');
const { lerUsuario, temRole } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');

app.http('veiculosCriar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'gestao/veiculos',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!temRole(usuario, 'admin')) {
      return { status: 403, jsonBody: { erro: 'Apenas administradores' } };
    }

    let corpo;
    try {
      corpo = await request.json();
    } catch {
      return { status: 400, jsonBody: { erro: 'JSON inválido' } };
    }

    const placa = String(corpo.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (placa.length !== 7) {
      return { status: 400, jsonBody: { erro: 'Placa inválida' } };
    }
    if (!corpo.modelo) {
      return { status: 400, jsonBody: { erro: 'Modelo é obrigatório' } };
    }

    const entidade = {
      partitionKey: 'veiculo',
      rowKey: placa,
      placa,
      modelo: String(corpo.modelo),
      ano: Number(corpo.ano) || 0,
      cor: String(corpo.cor || ''),
      kmAtual: Number(corpo.kmAtual) || 0,
      status: 'Disponivel'
    };

    try {
      await obterTabela('Veiculos').createEntity(entidade);
    } catch (erro) {
      if (erro.statusCode === 409) {
        return { status: 409, jsonBody: { erro: 'Placa já cadastrada' } };
      }
      throw erro;
    }

    return { status: 201, jsonBody: entidade };
  }
});