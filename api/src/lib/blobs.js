const { BlobServiceClient } = require('@azure/storage-blob');

function obterContainer(nome) {
  return BlobServiceClient
    .fromConnectionString(process.env.STORAGE_CONNECTION_STRING)
    .getContainerClient(nome);
}

module.exports = { obterContainer };