const { app } = require('@azure/functions');
const { lerUsuario, temRole } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');

app.http('gestaoRegistros', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'gestao/registros',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!temRole(usuario, 'admin')) {
      return { status: 403, jsonBody: { erro: 'Apenas administradores' } };
    }

    const placa = String(request.query.get('placa') || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const soAvaria = request.query.get('avaria') === 'true';

    const opcoes = placa ? { queryOptions: { filter: `PartitionKey eq '${placa}'` } } : {};

    const registros = [];
    for await (const r of obterTabela('Registros').listEntities(opcoes)) {
      if (soAvaria && r.avaria !== true) continue;
      registros.push({
        placa: r.partitionKey,
        id: r.rowKey,
        status: r.status,
        usuarioRetirada: r.usuarioRetirada,
        retiradaEm: r.retiradaEm,
        kmRetirada: r.kmRetirada,
        combustivelRetirada: r.combustivelRetirada,
        destino: r.destino,
        devolucaoPrevista: r.devolucaoPrevista,
        observacoesRetirada: r.observacoesRetirada || '',
        usuarioEntrega: r.usuarioEntrega || null,
        entregaEm: r.entregaEm || null,
        kmEntrega: r.kmEntrega ?? null,
        combustivelEntrega: r.combustivelEntrega || null,
        observacoesEntrega: r.observacoesEntrega || '',
        avaria: r.avaria === true
      });
    }

    registros.sort((a, b) => String(b.retiradaEm).localeCompare(String(a.retiradaEm)));
    return { jsonBody: registros.slice(0, 200) };
  }
});