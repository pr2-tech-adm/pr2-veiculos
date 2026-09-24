async function iniciar() {
  const mensagem = document.getElementById('mensagem');
  const lista = document.getElementById('lista');

  try {
    const eu = await chamarApi('/api/eu');
    document.getElementById('usuario').textContent = eu.usuario;

    const veiculos = await chamarApi('/api/veiculos');
    lista.replaceChildren();

    if (veiculos.length === 0) {
      mensagem.textContent = 'Nenhum veículo disponível no momento.';
      return;
    }
    mensagem.hidden = true;

    for (const v of veiculos) {
      const item = document.createElement('li');
      item.className = 'cartao';

      const info = document.createElement('div');
      const titulo = document.createElement('strong');
      titulo.textContent = v.placa;
      const detalhe = document.createElement('span');
      detalhe.textContent = `${v.modelo} · ${v.cor} · ${v.kmAtual} km`;
      info.append(titulo, detalhe);

      const botao = document.createElement('a');
      botao.className = 'botao';
      botao.href = `retirada.html?placa=${encodeURIComponent(v.placa)}`;
      botao.textContent = 'Retirar';

      item.append(info, botao);
      lista.append(item);
    }
  } catch (erro) {
    mensagem.textContent = 'Não foi possível carregar: ' + erro.message;
  }
}

iniciar();