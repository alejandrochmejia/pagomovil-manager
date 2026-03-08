import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function captureReceipt(): Promise<string> {
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
