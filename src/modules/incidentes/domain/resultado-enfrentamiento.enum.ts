export enum TipoIncidente {
  ENFRENTAMIENTO = 'ENFRENTAMIENTO',
  CAPTURA = 'CAPTURA',
  FUGA = 'FUGA',
  AVISTAMIENTO_HOSTIL = 'AVISTAMIENTO_HOSTIL',
  SABOTAJE = 'SABOTAJE',
}

export enum ResultadoEnfrentamiento {
  EN_CURSO = 'EN_CURSO',
  EXITO = 'EXITO',
  FRACASO = 'FRACASO',
  PARCIAL = 'PARCIAL',
}

export enum RolEnIncidente {
  OBJETIVO = 'OBJETIVO',
  COMPLICE = 'COMPLICE',
  TESTIGO = 'TESTIGO',
}

export enum DesenlaceParticipante {
  CAPTURADO = 'CAPTURADO',
  ESCAPO = 'ESCAPO',
  MUERTO = 'MUERTO',
  DESCONOCIDO = 'DESCONOCIDO',
}
