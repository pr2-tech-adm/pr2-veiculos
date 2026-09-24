const ANGULOS = [
  { id: 'frente', rotulo: 'Frente' },
  { id: 'traseira', rotulo: 'Traseira' },
  { id: 'lateralDireita', rotulo: 'Lateral direita' },
  { id: 'lateralEsquerda', rotulo: 'Lateral esquerda' },
  { id: 'interior', rotulo: 'Interior' },
  { id: 'painel', rotulo: 'Painel (km)' },
  { id: 'assinatura', rotulo: 'Assinatura' }
];

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function data(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—';
}

function urlImagem(r, momento, angulo) {
  const extensao = angulo === 'assinatura' ? 'png' : 'jpg';
  return `/api/gestao/foto/${encodeURIComponent(r.placa)}/${encodeURIComponent(r.id)}/${momento}-${angulo}.${extensao}`;
}

function celula(r, momento, angulo, disponivel) {
  const caixa = el('div', angulo.id === 'assinatura' ? 'comp-celula assin' : 'comp-celula');
  if (!disponivel) {
    caixa.append(el('span', 'mensagem', 'Ainda não entregue'));
    return caixa;
  }
  const url = urlImagem(r, momento, angulo.id);
  const link = el('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  const imagem = el('img');
  imagem.src = url;
  imagem.alt = `${angulo.rotulo} (${momento})`;
  imagem.loading = 'lazy';
  link.append(imagem);
  caixa.append(link);
  return caixa;
}

function bloco(titulo, linhas) {
  const caixa = el('div');
  caixa.append(el('strong', '', titulo));
  for (const linha of linhas) caixa.append(el('span', '', linha));
  return caixa;
}

function abrirDetalhe(r) {
  const corpo = document.getElementById('detalhe-corpo');
  corpo.replaceChildren();

  const concluido = r.status === 'Concluido';

  corpo.append(el('h2', '', `${r.placa} · ${r.destino || ''}`));
  if (r.avaria) {
    corpo.append(el('p', 'aviso-avaria', `Avaria informada na entrega: ${r.observacoesEntrega}`));
  }

  const resumo = el('div', 'resumo');
  resumo.append(
    bloco('Retirada', [
      `Responsável: ${r.usuarioRetirada}`,
      `Data: ${data(r.retiradaEm)}`,
      `Km: ${r.kmRetirada}`,
      `Combustível: ${r.combustivelRetirada}`,
      `Devolução prevista: ${data(r.devolucaoPrevista)}`,
      `Observações: ${r.observacoesRetirada || '—'}`
    ]),
    bloco('Entrega', concluido
      ? [
          `Responsável: ${r.usuarioEntrega}`,
          `Data: ${data(r.entregaEm)}`,
          `Km: ${r.kmEntrega}`,
          `Combustível: ${r.combustivelEntrega}`,
          `Observações: ${r.observacoesEntrega || '—'}`
        ]
      : ['Ainda não entregue'])
  );
  corpo.append(resumo);

  const comparativo = el('div', 'comparativo');
  comparativo.append(el('strong', '', 'Retirada'), el('strong', '', 'Entrega'));
  for (const angulo of ANGULOS) {
    comparativo.append(el('div', 'comp-titulo', angulo.rotulo));
    comparativo.append(
      celula(r, 'retirada', angulo, true),
      celula(r, 'entrega', angulo, concluido)
    );
  }
  corpo.append(comparativo);

  document.getElementById('detalhe').hidden = false;
}

function criarCartao(r) {
  const item = el('li', 'cartao');

  const info = el('div');
  const situacao = r.status === 'Concluido' ? 'Concluído' : 'Em uso';
  info.append(el('strong', '', `${r.placa} · ${situacao}${r.avaria ? ' · ⚠ Avaria' : ''}`));
  info.append(el('span', '', `${r.usuarioRetirada} · retirada ${data(r.retiradaEm)}`));
  if (r.entregaEm) {
    info.append(el('span', '', `entrega ${data(r.entregaEm)} por ${r.usuarioEntrega}`));
  }

  const botao = el('button', 'botao', 'Ver fotos');
  botao.type = 'button';
  botao.addEventListener('click', () => abrirDetalhe(r));

  item.append(info, botao);
  return item;
}

async function carregar() {
  const mensagem = document.getElementById('mensagem');
  const lista = document.getElementById('lista');

  const parametros = new URLSearchParams();
  const placa = document.getElementById('filtro-placa').value;
  if (placa) parametros.set('placa', placa);
  if (document.getElementById('filtro-avaria').checked) parametros.set('avaria', 'true');

  mensagem.textContent = 'Carregando...';
  mensagem.hidden = false;
  lista.replaceChildren();

  try {
    const registros = await chamarApi('/api/gestao/registros?' + parametros.toString());
    if (registros.length === 0) {
      mensagem.textContent = 'Nenhum registro encontrado.';
      return;
    }
    mensagem.hidden = true;
    for (const r of registros) lista.append(criarCartao(r));
  } catch (erro) {
    mensagem.textContent = 'Não foi possível carregar: ' + erro.message;
  }
}

async function carregarPlacas() {
  const veiculos = await chamarApi('/api/veiculos?status=todos');
  const filtro = document.getElementById('filtro-placa');
  for (const v of veiculos) {
    const opcao = el('option', '', `${v.placa} · ${v.modelo}`);
    opcao.value = v.placa;
    filtro.append(opcao);
  }
}

async function iniciar() {
  document.getElementById('fechar-detalhe').addEventListener('click', () => {
    document.getElementById('detalhe').hidden = true;
  });
  document.getElementById('filtro-placa').addEventListener('change', carregar);
  document.getElementById('filtro-avaria').addEventListener('change', carregar);

  try {
    await carregarPlacas();
  } catch {
    // sem a lista de veículos, o filtro fica só com "Todos"
  }
  carregar();
}

iniciar();