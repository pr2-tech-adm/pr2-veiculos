const { TableClient } = require('@azure/data-tables');

function obterTabela(nome) {
  return TableClient.fromConnectionString(
    process.env.STORAGE_CONNECTION_STRING,
    nome
  );
}

module.exports = { obterTabela };