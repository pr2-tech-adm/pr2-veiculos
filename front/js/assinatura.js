function criarAssinatura(canvas, aoMudar) {
  const ctx = canvas.getContext('2d');
  let desenhando = false;
  let pontos = 0;

  function preparar() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    pontos = 0;
  }

  function posicao(evento) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evento.clientX - r.left) * (canvas.width / r.width),
      y: (evento.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function terminar() {
    if (!desenhando) return;
    desenhando = false;
    aoMudar();
  }

  canvas.addEventListener('pointerdown', (evento) => {
    desenhando = true;
    canvas.setPointerCapture(evento.pointerId);
    const p = posicao(evento);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener('pointermove', (evento) => {
    if (!desenhando) return;
    const p = posicao(evento);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    pontos++;
  });

  canvas.addEventListener('pointerup', terminar);
  canvas.addEventListener('pointercancel', terminar);

  preparar();

  return {
    vazia: () => pontos < 15,
    limpar: () => { preparar(); aoMudar(); },
    blob: () => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  };
}