export const BANCOS = [
  { codigo: '0102', nombre: 'Banco de Venezuela' },
  { codigo: '0104', nombre: 'Venezolano de Crédito' },
  { codigo: '0105', nombre: 'Mercantil' },
  { codigo: '0108', nombre: 'Provincial' },
  { codigo: '0114', nombre: 'Bancaribe' },
  { codigo: '0115', nombre: 'Exterior' },
  { codigo: '0116', nombre: 'BOD' },
  { codigo: '0128', nombre: 'Caroní' },
  { codigo: '0134', nombre: 'Banesco' },
  { codigo: '0137', nombre: 'Sofitasa' },
  { codigo: '0138', nombre: 'Plaza' },
  { codigo: '0146', nombre: 'Bangente' },
  { codigo: '0151', nombre: 'Fondo Común' },
  { codigo: '0156', nombre: '100% Banco' },
  { codigo: '0157', nombre: 'Del Sur' },
  { codigo: '0163', nombre: 'Del Tesoro' },
  { codigo: '0166', nombre: 'Agrícola' },
  { codigo: '0168', nombre: 'Bancamiga' },
  { codigo: '0169', nombre: 'Mi Banco' },
  { codigo: '0171', nombre: 'Activo' },
  { codigo: '0172', nombre: 'Bancrecer' },
  { codigo: '0174', nombre: 'Banplus' },
  { codigo: '0175', nombre: 'Bicentenario' },
  { codigo: '0177', nombre: 'Banfanb' },
  { codigo: '0191', nombre: 'BNC' },
  { codigo: '0196', nombre: 'ABN AMRO' },
  { codigo: '0601', nombre: 'Instituto Municipal de Crédito Popular' },
] as const;

export type BancoNombre = (typeof BANCOS)[number]['nombre'];

export const TIPOS_CEDULA = ['V', 'J', 'E', 'G'] as const;

