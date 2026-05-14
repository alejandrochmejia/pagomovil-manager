import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function captureReceipt(): Promise<string> {
  if (Capacitor.getPlatform() === 'web') {
    return captureWeb();
  }

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    quality: 85,
    width: 1200,
    allowEditing: false,
  });

  if (!photo.base64String) {
    throw new Error('No se pudo capturar la imagen');
  }

  return photo.base64String;
}

function captureWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    let settled = false;

    const cleanup = () => {
      input.removeEventListener('change', onChange);
      input.removeEventListener('cancel', onCancel);
      input.remove();
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onChange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(() => reject(new Error('No se selecciono ninguna imagen')));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        const base64 = result.split(',')[1] ?? '';
        finish(() =>
          base64 ? resolve(base64) : reject(new Error('No se pudo leer la imagen')),
        );
      };
      reader.onerror = () => finish(() => reject(new Error('Error leyendo la imagen')));
      reader.readAsDataURL(file);
    };

    const onCancel = () => finish(() => reject(new Error('Captura cancelada')));

    input.addEventListener('change', onChange);
    input.addEventListener('cancel', onCancel);

    input.click();
  });
}
