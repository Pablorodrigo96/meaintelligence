export interface BrazilianCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
] as const;

export const BRAZILIAN_CITIES: BrazilianCity[] = [
  // AC
  { name: "Rio Branco", state: "AC", lat: -9.9754, lng: -67.8249 },
  // AL
  { name: "Maceió", state: "AL", lat: -9.6658, lng: -35.7353 },
  { name: "Arapiraca", state: "AL", lat: -9.7525, lng: -36.6614 },
  // AP
  { name: "Macapá", state: "AP", lat: 0.0349, lng: -51.0694 },
  // AM
  { name: "Manaus", state: "AM", lat: -3.1190, lng: -60.0217 },
  // BA
  { name: "Salvador", state: "BA", lat: -12.9714, lng: -38.5124 },
  { name: "Feira de Santana", state: "BA", lat: -12.2669, lng: -38.9666 },
  { name: "Vitória da Conquista", state: "BA", lat: -14.8619, lng: -40.8444 },
  { name: "Camaçari", state: "BA", lat: -12.6996, lng: -38.3263 },
  { name: "Lauro de Freitas", state: "BA", lat: -12.8978, lng: -38.3271 },
  // CE
  { name: "Fortaleza", state: "CE", lat: -3.7172, lng: -38.5433 },
  { name: "Caucaia", state: "CE", lat: -3.7361, lng: -38.6531 },
  { name: "Juazeiro do Norte", state: "CE", lat: -7.2131, lng: -39.3150 },
  { name: "Maracanaú", state: "CE", lat: -3.8761, lng: -38.6253 },
  { name: "Sobral", state: "CE", lat: -3.6861, lng: -40.3481 },
  // DF
  { name: "Brasília", state: "DF", lat: -15.7975, lng: -47.8919 },
  // ES
  { name: "Vitória", state: "ES", lat: -20.3155, lng: -40.3128 },
  { name: "Vila Velha", state: "ES", lat: -20.3297, lng: -40.2925 },
  { name: "Serra", state: "ES", lat: -20.1209, lng: -40.3075 },
  { name: "Cariacica", state: "ES", lat: -20.2635, lng: -40.4165 },
  // GO
  { name: "Goiânia", state: "GO", lat: -16.6869, lng: -49.2648 },
  { name: "Aparecida de Goiânia", state: "GO", lat: -16.8198, lng: -49.2469 },
  { name: "Anápolis", state: "GO", lat: -16.3281, lng: -48.9530 },
  // MA
  { name: "São Luís", state: "MA", lat: -2.5297, lng: -44.2825 },
  { name: "Imperatriz", state: "MA", lat: -5.5264, lng: -47.4919 },
  // MT
  { name: "Cuiabá", state: "MT", lat: -15.6014, lng: -56.0979 },
  { name: "Várzea Grande", state: "MT", lat: -15.6460, lng: -56.1325 },
  { name: "Rondonópolis", state: "MT", lat: -16.4673, lng: -54.6372 },
  { name: "Sinop", state: "MT", lat: -11.8604, lng: -55.5053 },
  // MS
  { name: "Campo Grande", state: "MS", lat: -20.4697, lng: -54.6201 },
  { name: "Dourados", state: "MS", lat: -22.2233, lng: -54.8083 },
  { name: "Três Lagoas", state: "MS", lat: -20.7511, lng: -51.6783 },
  // MG
  { name: "Belo Horizonte", state: "MG", lat: -19.9167, lng: -43.9345 },
  { name: "Uberlândia", state: "MG", lat: -18.9186, lng: -48.2772 },
  { name: "Contagem", state: "MG", lat: -19.9320, lng: -44.0539 },
  { name: "Juiz de Fora", state: "MG", lat: -21.7642, lng: -43.3503 },
  { name: "Betim", state: "MG", lat: -19.9678, lng: -44.1983 },
  { name: "Montes Claros", state: "MG", lat: -16.7350, lng: -43.8617 },
  { name: "Ribeirão das Neves", state: "MG", lat: -19.7667, lng: -44.0869 },
  { name: "Uberaba", state: "MG", lat: -19.7472, lng: -47.9319 },
  { name: "Governador Valadares", state: "MG", lat: -18.8509, lng: -41.9494 },
  { name: "Ipatinga", state: "MG", lat: -19.4683, lng: -42.5367 },
  { name: "Sete Lagoas", state: "MG", lat: -19.4617, lng: -44.2467 },
  { name: "Divinópolis", state: "MG", lat: -20.1389, lng: -44.8842 },
  { name: "Santa Luzia", state: "MG", lat: -19.7697, lng: -43.8514 },
  { name: "Poços de Caldas", state: "MG", lat: -21.7878, lng: -46.5614 },
  // PA
  { name: "Belém", state: "PA", lat: -1.4558, lng: -48.5024 },
  { name: "Ananindeua", state: "PA", lat: -1.3659, lng: -48.3886 },
  { name: "Santarém", state: "PA", lat: -2.4425, lng: -54.7081 },
  { name: "Marabá", state: "PA", lat: -5.3686, lng: -49.1178 },
  // PB
  { name: "João Pessoa", state: "PB", lat: -7.1195, lng: -34.8450 },
  { name: "Campina Grande", state: "PB", lat: -7.2306, lng: -35.8811 },
  // PR
  { name: "Curitiba", state: "PR", lat: -25.4284, lng: -49.2733 },
  { name: "Londrina", state: "PR", lat: -23.3045, lng: -51.1696 },
  { name: "Maringá", state: "PR", lat: -23.4273, lng: -51.9375 },
  { name: "Ponta Grossa", state: "PR", lat: -25.0950, lng: -50.1619 },
  { name: "Cascavel", state: "PR", lat: -24.9578, lng: -53.4596 },
  { name: "São José dos Pinhais", state: "PR", lat: -25.5350, lng: -49.2058 },
  { name: "Foz do Iguaçu", state: "PR", lat: -25.5163, lng: -54.5854 },
  { name: "Colombo", state: "PR", lat: -25.2917, lng: -49.2236 },
  { name: "Guarapuava", state: "PR", lat: -25.3935, lng: -51.4570 },
  // PE
  { name: "Recife", state: "PE", lat: -8.0476, lng: -34.8770 },
  { name: "Jaboatão dos Guararapes", state: "PE", lat: -8.1130, lng: -35.0147 },
  { name: "Olinda", state: "PE", lat: -8.0089, lng: -34.8553 },
  { name: "Caruaru", state: "PE", lat: -8.2823, lng: -35.9761 },
  { name: "Petrolina", state: "PE", lat: -9.3891, lng: -40.5003 },
  { name: "Paulista", state: "PE", lat: -7.9369, lng: -34.8728 },
  // PI
  { name: "Teresina", state: "PI", lat: -5.0892, lng: -42.8019 },
  // RJ
  { name: "Rio de Janeiro", state: "RJ", lat: -22.9068, lng: -43.1729 },
  { name: "São Gonçalo", state: "RJ", lat: -22.8269, lng: -43.0634 },
  { name: "Duque de Caxias", state: "RJ", lat: -22.7856, lng: -43.3117 },
  { name: "Nova Iguaçu", state: "RJ", lat: -22.7592, lng: -43.4510 },
  { name: "Niterói", state: "RJ", lat: -22.8833, lng: -43.1036 },
  { name: "Belford Roxo", state: "RJ", lat: -22.7642, lng: -43.3992 },
  { name: "São João de Meriti", state: "RJ", lat: -22.8058, lng: -43.3722 },
  { name: "Campos dos Goytacazes", state: "RJ", lat: -21.7545, lng: -41.3244 },
  { name: "Petrópolis", state: "RJ", lat: -22.5047, lng: -43.1828 },
  { name: "Volta Redonda", state: "RJ", lat: -22.5232, lng: -44.1042 },
  // RN
  { name: "Natal", state: "RN", lat: -5.7945, lng: -35.2110 },
  { name: "Mossoró", state: "RN", lat: -5.1878, lng: -37.3442 },
  { name: "Parnamirim", state: "RN", lat: -5.9158, lng: -35.2628 },
  // RS
  { name: "Porto Alegre", state: "RS", lat: -30.0346, lng: -51.2177 },
  { name: "Caxias do Sul", state: "RS", lat: -29.1681, lng: -51.1794 },
  { name: "Pelotas", state: "RS", lat: -31.7654, lng: -52.3376 },
  { name: "Canoas", state: "RS", lat: -29.9178, lng: -51.1740 },
  { name: "Santa Maria", state: "RS", lat: -29.6868, lng: -53.8069 },
  { name: "Gravataí", state: "RS", lat: -29.9447, lng: -50.9919 },
  { name: "Viamão", state: "RS", lat: -30.0810, lng: -51.0234 },
  { name: "Novo Hamburgo", state: "RS", lat: -29.6878, lng: -51.1306 },
  { name: "São Leopoldo", state: "RS", lat: -29.7604, lng: -51.1472 },
  { name: "Rio Grande", state: "RS", lat: -32.0350, lng: -52.0986 },
  { name: "Alvorada", state: "RS", lat: -29.9908, lng: -51.0808 },
  { name: "Passo Fundo", state: "RS", lat: -28.2624, lng: -52.4068 },
  // RO
  { name: "Porto Velho", state: "RO", lat: -8.7612, lng: -63.9004 },
  { name: "Ji-Paraná", state: "RO", lat: -10.8853, lng: -61.9517 },
  // RR
  { name: "Boa Vista", state: "RR", lat: 2.8195, lng: -60.6714 },
  // SC
  { name: "Florianópolis", state: "SC", lat: -27.5954, lng: -48.5480 },
  { name: "Joinville", state: "SC", lat: -26.3045, lng: -48.8487 },
  { name: "Blumenau", state: "SC", lat: -26.9194, lng: -49.0661 },
  { name: "São José", state: "SC", lat: -27.6136, lng: -48.6366 },
  { name: "Chapecó", state: "SC", lat: -27.1006, lng: -52.6157 },
  { name: "Criciúma", state: "SC", lat: -28.6775, lng: -49.3697 },
  { name: "Itajaí", state: "SC", lat: -26.9078, lng: -48.6619 },
  { name: "Balneário Camboriú", state: "SC", lat: -26.9906, lng: -48.6353 },
  // SP
  { name: "São Paulo", state: "SP", lat: -23.5505, lng: -46.6333 },
  { name: "Guarulhos", state: "SP", lat: -23.4538, lng: -46.5333 },
  { name: "Campinas", state: "SP", lat: -22.9099, lng: -47.0626 },
  { name: "São Bernardo do Campo", state: "SP", lat: -23.6914, lng: -46.5646 },
  { name: "Santo André", state: "SP", lat: -23.6737, lng: -46.5432 },
  { name: "Osasco", state: "SP", lat: -23.5325, lng: -46.7917 },
  { name: "São José dos Campos", state: "SP", lat: -23.1896, lng: -45.8841 },
  { name: "Ribeirão Preto", state: "SP", lat: -21.1704, lng: -47.8103 },
  { name: "Sorocaba", state: "SP", lat: -23.5015, lng: -47.4526 },
  { name: "Santos", state: "SP", lat: -23.9608, lng: -46.3336 },
  { name: "Mauá", state: "SP", lat: -23.6677, lng: -46.4614 },
  { name: "São José do Rio Preto", state: "SP", lat: -20.8113, lng: -49.3758 },
  { name: "Mogi das Cruzes", state: "SP", lat: -23.5227, lng: -46.1896 },
  { name: "Diadema", state: "SP", lat: -23.6861, lng: -46.6228 },
  { name: "Jundiaí", state: "SP", lat: -23.1857, lng: -46.8978 },
  { name: "Piracicaba", state: "SP", lat: -22.7338, lng: -47.6476 },
  { name: "Carapicuíba", state: "SP", lat: -23.5224, lng: -46.8357 },
  { name: "Bauru", state: "SP", lat: -22.3246, lng: -49.0871 },
  { name: "Itaquaquecetuba", state: "SP", lat: -23.4862, lng: -46.3486 },
  { name: "São Vicente", state: "SP", lat: -23.9571, lng: -46.3952 },
  { name: "Franca", state: "SP", lat: -20.5396, lng: -47.4009 },
  { name: "Praia Grande", state: "SP", lat: -24.0058, lng: -46.4028 },
  { name: "Guarujá", state: "SP", lat: -23.9935, lng: -46.2564 },
  { name: "Taubaté", state: "SP", lat: -23.0205, lng: -45.5558 },
  { name: "Limeira", state: "SP", lat: -22.5642, lng: -47.4013 },
  { name: "Suzano", state: "SP", lat: -23.5425, lng: -46.3111 },
  { name: "Taboão da Serra", state: "SP", lat: -23.6019, lng: -46.7581 },
  { name: "Sumaré", state: "SP", lat: -22.8206, lng: -47.2669 },
  { name: "Barueri", state: "SP", lat: -23.5114, lng: -46.8761 },
  { name: "Embu das Artes", state: "SP", lat: -23.6494, lng: -46.8522 },
  { name: "Indaiatuba", state: "SP", lat: -23.0907, lng: -47.2178 },
  { name: "Cotia", state: "SP", lat: -23.6040, lng: -46.9192 },
  { name: "Americana", state: "SP", lat: -22.7392, lng: -47.3314 },
  { name: "Marília", state: "SP", lat: -22.2139, lng: -49.9458 },
  { name: "Presidente Prudente", state: "SP", lat: -22.1256, lng: -51.3889 },
  { name: "Jacareí", state: "SP", lat: -23.3039, lng: -45.9658 },
  { name: "Araraquara", state: "SP", lat: -21.7845, lng: -48.1782 },
  // SE
  { name: "Aracaju", state: "SE", lat: -10.9091, lng: -37.0677 },
  // TO
  { name: "Palmas", state: "TO", lat: -10.1689, lng: -48.3317 },
];

/**
 * Find a city in the dictionary by name and optionally state.
 */
export function findCity(cityName: string, stateUf?: string): BrazilianCity | undefined {
  const normalized = cityName.trim().toLowerCase();
  return BRAZILIAN_CITIES.find(
    (c) =>
      c.name.toLowerCase() === normalized &&
      (!stateUf || c.state === stateUf)
  );
}

/**
 * Get cities filtered by state UF.
 */
export function getCitiesByState(stateUf: string): BrazilianCity[] {
  return BRAZILIAN_CITIES.filter((c) => c.state === stateUf);
}
