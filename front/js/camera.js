async function capturarFoto(titulo) {
  const painel = document.getElementById('camera');
  const video = document.getElementById('camera-video');
  const btnCapturar = document.getElementById('camera-capturar');
  const btnCancelar = document.getElementById('camera-cancelar');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('câmera indisponível (o site precisa ser aberto por HTTPS)');
  }

  document.getElementById('camera-titulo').textContent = titulo;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
    audio: false
  });
  video.srcObject = stream;
  painel.hidden = false;

  return new Promise((resolve) => {
    function fechar(resultado) {
      stream.getTracks().forEach((faixa) => faixa.stop());
      video.srcObject = null;
      painel.hidden = true;
      btnCapturar.onclick = null;
      btnCancelar.onclick = null;
      resolve(resultado);
    }

    btnCancelar.onclick = () => fechar(null);

    btnCapturar.onclick = () => {
      if (!video.videoWidth) return;
      const escala = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => fechar(blob), 'image/jpeg', 0.8);
    };
  });
}