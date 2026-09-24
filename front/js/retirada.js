const FOTOS = [
  { id: 'frente', rotulo: 'Frente' },
  { id: 'traseira', rotulo: 'Traseira' },
  { id: 'lateralDireita', rotulo: 'Lateral direita' },
  { id: 'lateralEsquerda', rotulo: 'Lateral esquerda' },
  { id: 'interior', rotulo: 'Interior' },
  { id: 'painel', rotulo: 'Painel (km)' }
];

const fotos = {};
const placa = new URLSearchParams(location.search).get('placa') || '';

function mostrarErro(texto) {
  const caixa = document.getElementById('erro');
  caixa.textContent = texto;
  caixa.hidden = false;
}

function atualizarContador() {
  const total = Object.keys(fotos).length;
  document.getElementById('contador').textContent = `${total}/${FOTOS.length}`;
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

function iniciar() {
  if (!placa) {
    location.href = 'index.html';
    return;
  }
  document.getElementById('placa').textContent = placa;
  document.getElementById('devolucao').min = new Date().toLocaleDateString('sv-SE');
  montarFotos();
}

iniciar();