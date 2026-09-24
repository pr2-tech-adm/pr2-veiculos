function criarCartao(titulo, detalhe, textoBotao, destino) {
  const item = document.createElement('li');
  item.className = 'cartao';

  const info = document.createElement('div');
  const tituloEl = document.createElement('strong');
  tituloEl.textContent = titulo;
  const detalheEl = document.createElement('span');
  detalheEl.textContent = detalhe;
  info.append(tituloEl, detalheEl);

  const botao = document.createElement('a');
  botao.className = 'botao';
  botao.href = destino;
  botao.textContent = textoBotao;

  item.append(info, botao);
  return item;
}

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '';
}

async function iniciar() {
  const mensagem = document.getElementById('mensagem');
  const lista = document.getElementById('lista');
  const secaoUso = document.getElementById('em-uso');
  const listaUso = document.getElementById('lista-uso');

  try {
    const eu = await chamarApi('/api/eu');
    document.getElementById('usuario').textContent = eu.usuario;

    const [emUso, disponiveis] = await Promise.all([
      chamarApi('/api/registros/meu-uso'),
      chamarApi('/api/veiculos')
    ]);

    listaUso.replaceChildren();
    secaoUso.hidden = emUso.length === 0;
    for (const v of emUso) {
      let detalhe = `${v.modelo} · retirado em ${formatarData(v.retiradaEm)}`;
      if (v.destino) detalhe += ` · ${v.destino}`;
      const cartao = criarCartao(v.placa, detalhe, 'Entregar', `entrega.html?placa=${encodeURIComponent(v.placa)}`);
      cartao.classList.add('em-uso');
      listaUso.append(cartao);
    }

    lista.replaceChildren();
    if (disponiveis.length === 0) {
      mensagem.textContent = 'Nenhum veículo disponível no momento.';
      mensagem.hidden = false;
      return;
    }
    mensagem.hidden = true;

    for (const v of disponiveis) {
      const detalhe = `${v.modelo} · ${v.cor} · ${v.kmAtual} km`;
      lista.append(criarCartao(v.placa, detalhe, 'Retirar', `retirada.html?placa=${encodeURIComponent(v.placa)}`));
    }
  } catch (erro) {
    mensagem.textContent = 'Não foi possível carregar: ' + erro.message;
    mensagem.hidden = false;
  }
}

iniciar();