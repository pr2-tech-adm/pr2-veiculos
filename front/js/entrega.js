const FOTOS = [
  { id: 'frente', rotulo: 'Frente' },
  { id: 'traseira', rotulo: 'Traseira' },
  { id: 'lateralDireita', rotulo: 'Lateral direita' },
  { id: 'lateralEsquerda', rotulo: 'Lateral esquerda' },
  { id: 'interior', rotulo: 'Interior' },
  { id: 'interior2', rotulo: 'Interior 2' },
  { id: 'painel', rotulo: 'Painel (km)' }
];

const fotos = {};
const placa = new URLSearchParams(location.search).get('placa') || '';
let assinatura;

function mostrarErro(texto) {
  const caixa = document.getElementById('erro');
  caixa.textContent = texto;
  caixa.hidden = false;
}

function tudoPronto() {
  return (
    document.getElementById('formulario').checkValidity() &&
    Object.keys(fotos).length === FOTOS.length &&
    !assinatura.vazia()
  );
}

function atualizarBotao() {
  document.getElementById('enviar').disabled = !tudoPronto();
}

function atualizarContador() {
  const total = Object.keys(fotos).length;
  document.getElementById('contador').textContent = `${total}/${FOTOS.length}`;
  atualizarBotao();
}

function montarFotos() {
  const grade = document.getElementById('fotos');

  for (const foto of FOTOS) {
    const slot = document.createElement('div');
    slot.className = 'slot';

    const imagem = document.createElement('img');
    imagem.alt = foto.rotulo;
    imagem.hidden = true;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'slot-botao';
    botao.textContent = foto.rotulo;

    botao.addEventListener('click', async () => {
      document.getElementById('erro').hidden = true;
      try {
        const blob = await capturarFoto(foto.rotulo);
        if (!blob) return;

        fotos[foto.id] = blob;
        if (imagem.src) URL.revokeObjectURL(imagem.src);
        imagem.src = URL.createObjectURL(blob);
        imagem.hidden = false;
        slot.classList.add('pronto');
        botao.textContent = `${foto.rotulo} ✓ (refazer)`;
        atualizarContador();
      } catch (erro) {
        mostrarErro('Não foi possível abrir a câmera: ' + erro.message);
      }
    });

    slot.append(imagem, botao);
    grade.append(slot);
  }
}

function mostrarSucesso(resposta) {
  const quando = new Date(resposta.entregaEm).toLocaleString('pt-BR');
  document.getElementById('sucesso-detalhe').textContent =
    `Veículo ${resposta.placa} entregue em ${quando}.`;
  document.getElementById('formulario').hidden = true;
  document.getElementById('sucesso').hidden = false;
}

async function enviar(evento) {
  evento.preventDefault();
  if (!tudoPronto()) return;

  const botao = document.getElementById('enviar');
  botao.disabled = true;
  botao.textContent = 'Enviando...';
  document.getElementById('erro').hidden = true;

  try {
    const dados = new FormData();
    dados.append('placa', placa);
    dados.append('kmEntrega', document.getElementById('km').value);
    dados.append('combustivel', document.getElementById('combustivel').value);
    dados.append('observacoes', document.getElementById('observacoes').value);
    dados.append('avaria', document.getElementById('avaria').checked ? 'true' : 'false');

    for (const foto of FOTOS) {
      dados.append(foto.id, fotos[foto.id], `${foto.id}.jpg`);
    }
    dados.append('assinatura', await assinatura.blob(), 'assinatura.png');

    const resposta = await chamarApi('/api/registros/entregar', {
      method: 'POST',
      body: dados
    });
    mostrarSucesso(resposta);
  } catch (erro) {
    mostrarErro(erro.message);
    botao.textContent = 'Confirmar entrega';
    atualizarBotao();
  }
}

async function iniciar() {
  if (!placa) {
    location.href = 'index.html';
    return;
  }
  document.getElementById('placa').textContent = placa;

  try {
    const lista = await chamarApi('/api/registros/meu-uso');
    const uso = lista.find((v) => v.placa === placa);
    if (!uso) {
      mostrarErro('Este veículo não está em uso por você.');
      return;
    }

    const info = document.getElementById('info');
    info.textContent = `Retirado em ${new Date(uso.retiradaEm).toLocaleString('pt-BR')}. Km na retirada: ${uso.kmRetirada}.`;
    info.hidden = false;
    if (Number.isFinite(uso.kmRetirada)) {
      document.getElementById('km').min = uso.kmRetirada;
    }
  } catch (erro) {
    mostrarErro('Não foi possível carregar: ' + erro.message);
    return;
  }

  assinatura = criarAssinatura(document.getElementById('assinatura'), atualizarBotao);
  document.getElementById('limpar-assinatura').addEventListener('click', () => assinatura.limpar());

  const avaria = document.getElementById('avaria');
  const observacoes = document.getElementById('observacoes');
  avaria.addEventListener('change', () => {
    observacoes.required = avaria.checked;
    atualizarBotao();
  });

  const formulario = document.getElementById('formulario');
  formulario.addEventListener('input', atualizarBotao);
  formulario.addEventListener('change', atualizarBotao);
  formulario.addEventListener('submit', enviar);

  formulario.hidden = false;
  montarFotos();
  atualizarBotao();
}

iniciar();