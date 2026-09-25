const ANGULOS = [
  { id: 'frente', rotulo: 'Frente' },
  { id: 'traseira', rotulo: 'Traseira' },
  { id: 'lateralDireita', rotulo: 'Lateral direita' },
  { id: 'lateralEsquerda', rotulo: 'Lateral esquerda' },
  { id: 'interior', rotulo: 'Interior' },
  { id: 'interior2', rotulo: 'Interior 2' },
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

function dataCurta(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

function urlImagem(r, momento, angulo) {
  const extensao = angulo === 'assinatura' ? 'png' : 'jpg';
  return `/api/gestao/foto/${encodeURIComponent(r.placa)}/${encodeURIComponent(r.id)}/${momento}-${angulo}.${extensao}`;
}

function rotuloAngulo(angulo, momento, r) {
  if (angulo.id !== 'assinatura') return angulo.rotulo;
  const quando = momento === 'retirada' ? r.retiradaEm : r.entregaEm;
  const prefixo = momento === 'retirada' ? 'Assinatura Retirada' : 'Assinatura Entrega';
  return `${prefixo} - ${dataCurta(quando)}`;
}

function celulaFoto(r, momento, angulo) {
  const caixa = el('div', angulo.id === 'assinatura' ? 'comp-celula assin' : 'comp-celula');
  caixa.append(el('span', 'foto-rotulo', rotuloAngulo(angulo, momento, r)));

  const url = urlImagem(r, momento, angulo.id);
  const link = el('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  const imagem = el('img');
  imagem.src = url;
  imagem.alt = `${angulo.rotulo} (${momento})`;
  imagem.loading = 'lazy';
  imagem.addEventListener('error', () => {
    imagem.replaceWith(el('span', 'mensagem', 'Foto não encontrada'));
  });
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

function renderFotos(container, r, momento) {
  container.replaceChildren();
  if (momento === 'entrega' && r.status !== 'Concluido') {
    container.append(el('p', 'mensagem', 'Este veículo ainda não foi entregue.'));
    return;
  }
  const grade = el('div', 'comparativo-simples');
  for (const angulo of ANGULOS) grade.append(celulaFoto(r, momento, angulo));
  container.append(grade);
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

  const abas = el('div', 'abas-fotos');
  const btnRetirada = el('button', 'aba-botao ativa', 'Fotos da retirada');
  btnRetirada.type = 'button';
  const btnEntrega = el('button', 'aba-botao', 'Fotos da entrega');
  btnEntrega.type = 'button';
  abas.append(btnRetirada, btnEntrega);
  corpo.append(abas);

  const painelFotos = el('div', 'painel-fotos');
  corpo.append(painelFotos);

  function selecionar(momento) {
    btnRetirada.classList.toggle('ativa', momento === 'retirada');
    btnEntrega.classList.toggle('ativa', momento === 'entrega');
    renderFotos(painelFotos, r, momento);
  }

  btnRetirada.addEventListener('click', () => selecionar('retirada'));
  btnEntrega.addEventListener('click', () => selecionar('entrega'));
  selecionar('retirada');

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

function linhaResumo(v, mostrarUsuario) {
  const linha = el('li', 'linha-resumo');
  linha.append(el('strong', '', v.placa));
  linha.append(el('span', '', v.modelo));
  if (mostrarUsuario && v.usuarioAtual) linha.append(el('span', 'linha-resumo-usuario', v.usuarioAtual));
  return linha;
}

function montarResumo(veiculos) {
  const disponiveis = veiculos.filter((v) => v.status === 'Disponivel');
  const emUso = veiculos.filter((v) => v.status === 'EmUso');

  document.getElementById('contagem-disponiveis').textContent = disponiveis.length;
  document.getElementById('contagem-em-uso').textContent = emUso.length;

  const listaDisponiveis = document.getElementById('lista-disponiveis');
  listaDisponiveis.replaceChildren();
  if (disponiveis.length === 0) {
    listaDisponiveis.append(el('li', 'mensagem', 'Nenhum veículo parado.'));
  } else {
    for (const v of disponiveis) listaDisponiveis.append(linhaResumo(v, false));
  }

  const listaEmUso = document.getElementById('lista-resumo-em-uso');
  listaEmUso.replaceChildren();
  if (emUso.length === 0) {
    listaEmUso.append(el('li', 'mensagem', 'Nenhum veículo em uso.'));
  } else {
    for (const v of emUso) listaEmUso.append(linhaResumo(v, true));
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
  return veiculos;
}

async function iniciar() {
  document.getElementById('fechar-detalhe').addEventListener('click', () => {
    document.getElementById('detalhe').hidden = true;
  });
  document.getElementById('filtro-placa').addEventListener('change', carregar);
  document.getElementById('filtro-avaria').addEventListener('change', carregar);

  try {
    const veiculos = await carregarPlacas();
    montarResumo(veiculos);
  } catch {
    // sem a lista de veículos, o resumo e o filtro ficam vazios
  }
  carregar();
}

iniciar();