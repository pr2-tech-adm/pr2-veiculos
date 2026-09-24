const { app } = require('@azure/functions');
const { lerUsuario, temRole, mesmoUsuario } = require('../lib/usuario');
const { obterTabela } = require('../lib/tabelas');

app.http('registrosMeuUso', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'registros/meu-uso',
  handler: async (request) => {
    const usuario = lerUsuario(request);
    if (!temRole(usuario, 'tecnico') && !temRole(usuario, 'admin')) {
      return { status: 403, jsonBody: { erro: 'Sem permissão' } };
    }

    const veiculos = obterTabela('Veiculos');
    const registros = obterTabela('Registros');
    const resultado = [];

    const consulta = veiculos.listEntities({
      queryOptions: { filter: "PartitionKey eq 'veiculo' and status eq 'EmUso'" }
    });

    for await (const v of consulta) {
      if (!mesmoUsuario(v.usuarioAtual, usuario.userDetails)) continue;

      let registro = null;
      try {
        registro = await registros.getEntity(v.placa, v.registroAtual);
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }

      resultado.push({
        placa: v.placa,
        modelo: v.modelo,
        cor: v.cor,
        registroAtual: v.registroAtual,
        retiradaEm: registro ? registro.retiradaEm : null,
        kmRetirada: registro ? registro.kmRetirada : null,
        destino: registro ? registro.destino : null,
        devolucaoPrevista: registro ? registro.devolucaoPrevista : null
      });
    }

    return { jsonBody: resultado };
  }
});