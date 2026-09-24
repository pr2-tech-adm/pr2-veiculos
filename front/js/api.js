async function chamarApi(caminho, opcoes) {
  const resposta = await fetch(caminho, opcoes);

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem = (dados && dados.erro) || 'Erro ' + resposta.status;
    throw new Error(mensagem);
  }
  return dados;
}