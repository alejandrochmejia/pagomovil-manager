import type { CapacitorConfig } from '@capacitor/cli';

// TODO antes de publicar a Play Store: cambiar appId a com.botinfy.pagomovilmanager
// (requiere regenerar android/ o mover el paquete Java + editar build.gradle).
const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Pago Movil Manager',
  webDir: 'dist'
};

export default config;
