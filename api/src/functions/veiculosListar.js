const { app } = require('@azure/functions');
const { lerUsuario, temRole } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');

app.http('veiculosListar', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'veiculos',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!usuario) {
      return { status: 401, jsonBody: { erro: 'Não autenticado' } };
    }

    const admin = temRole(usuario, 'admin');
    const filtro = admin ? (request.query.get('status') || 'Disponivel') : 'Disponivel';

    const tabela = obterTabela('Veiculos');
    const veiculos = [];
    const consulta = tabela.listEntities({
      queryOptions: { filter: "PartitionKey eq 'veiculo'" }
    });

    for await (const v of consulta) {
      if (filtro === 'todos' || v.status === filtro) {
        veiculos.push({
          placa: v.placa,
          modelo: v.modelo,
          ano: v.ano,
          cor: v.cor,
          kmAtual: v.kmAtual,
          status: v.status
        });
      }
    }

    return { jsonBody: veiculos };
  }
});