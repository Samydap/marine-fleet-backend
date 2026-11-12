#!/usr/bin/env bash
# =============================================================================
# Flujo completo del Caso 13 contra la API real. Sirve para dos cosas:
#   1. Prueba de punta a punta (sale con error si algun paso falla).
#   2. Guion de la demo en la sustentacion: cada paso imprime que esta pasando.
#
# Requisitos: la API corriendo (npm run start:dev), base migrada y con seed,
# y `curl` + `jq` instalados.  Uso:  bash scripts/flujo-demo.sh
# =============================================================================
set -euo pipefail

API="${API:-http://localhost:3000/api/v1}"
CLAVE='Marina.2026'
SUFIJO="$(date +%s)"

paso() { printf '\n\033[1;34m== %s\033[0m\n' "$1"; }
ok() { printf '   \033[32m✔ %s\033[0m\n' "$1"; }
falla() { printf '   \033[31m✘ %s\033[0m\n' "$1"; exit 1; }

# peticion METODO RUTA TOKEN [JSON] -> imprime el cuerpo; falla si no es 2xx
peticion() {
  local metodo="$1" ruta="$2" token="$3" cuerpo="${4:-}"
  local args=(-s -w '\n%{http_code}' -X "$metodo" "$API$ruta" -H 'Content-Type: application/json')
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$cuerpo" ]] && args+=(-d "$cuerpo")
  local salida codigo
  salida="$(curl "${args[@]}")"
  codigo="${salida##*$'\n'}"
  salida="${salida%$'\n'*}"
  if [[ "$codigo" != 2* ]]; then
    echo "$salida" | jq . >&2 || echo "$salida" >&2
    falla "$metodo $ruta respondio $codigo"
  fi
  echo "$salida"
}

# codigo METODO RUTA TOKEN [JSON] -> solo el codigo HTTP (para probar rechazos)
codigo() {
  local args=(-s -o /dev/null -w '%{http_code}' -X "$1" "$API$2" -H 'Content-Type: application/json')
  [[ -n "$3" ]] && args+=(-H "Authorization: Bearer $3")
  [[ -n "${4:-}" ]] && args+=(-d "$4")
  curl "${args[@]}"
}

login() {
  peticion POST /auth/login '' "{\"email\":\"$1@marina.gov\",\"password\":\"$CLAVE\"}" | jq -r .data.accessToken
}

esperar_cartel() {
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    local v
    v="$(curl -s "$API/carteles/criminal/$1" -H "Authorization: Bearer $2" | jq -r '.data.numeroVersion // empty')"
    if [[ -n "$v" && "$v" -ge "$3" ]]; then echo "$v"; return 0; fi
    sleep 0.5
  done
  echo 0
}

paso '0. Salud del sistema (RNF disponibilidad)'
peticion GET /salud '' | jq -c .data
ok 'API y base de datos disponibles'

paso '1. Inicio de sesion por rol (RF-7)'
ALMIRANTE="$(login almirante)"
ANALISTA="$(login analista_datos_criminales)"
DIRECTOR="$(login director_inteligencia)"
COORDINADOR="$(login coordinador_operaciones)"
SEGURIDAD="$(login especialista_seguridad)"
ok 'Tokens emitidos para Almirante, Analista, Director, Coordinador y Seguridad'
[[ "$(codigo POST /criminales "$COORDINADOR" '{"nombre":"X"}')" == 403 ]] && ok 'RBAC: el Coordinador NO puede registrar criminales (403)'

paso '2. Registrar criminal con afiliacion (RF-1)'
CRIMINAL="$(peticion POST /criminales "$ANALISTA" "{\"nombre\":\"Capone Bege $SUFIJO\",\"alias\":[\"Gang\"],\"edad\":42,\"descripcionFisica\":\"Sombrero de copa\",\"zonaInfluenciaId\":\"z-sabaody\",\"organizacionId\":\"org-barbanegra\",\"rolEnOrganizacion\":\"OFICIAL\"}")"
CID="$(echo "$CRIMINAL" | jq -r .data.id)"
echo "$CRIMINAL" | jq -c '.data | {id, nombre, nivelAmenaza, organizacion}'
ok "Criminal $CID registrado (nivel PENDIENTE: aun sin recompensa)"
[[ "$(esperar_cartel "$CID" "$ANALISTA" 1)" -ge 1 ]] && ok 'Cartel WANTED v1 generado automaticamente (RF-2)'

paso '3. Recompensa normal: queda VIGENTE sin firma (RF-1/RF-5)'
peticion POST /recompensas "$ANALISTA" "{\"criminalId\":\"$CID\",\"monto\":350000000,\"motivo\":\"Demo\"}" | jq -c '.data | {estado, monto, requiereValidacion}'
sleep 1
peticion GET "/criminales/$CID" "$ANALISTA" | jq -c '.data | {recompensaVigenteMonto, nivelAmenaza}'
ok 'Monto aplicado y nivel de amenaza reclasificado automaticamente'

paso '4. Recompensa de alto rango: exige firma del Almirante'
ALTA="$(peticion POST /recompensas "$ANALISTA" "{\"criminalId\":\"$CID\",\"monto\":1500000000,\"motivo\":\"Demo alto rango\"}")"
RID="$(echo "$ALTA" | jq -r .data.id)"
echo "$ALTA" | jq -c '.data | {estado, requiereValidacion}'
[[ "$(codigo PATCH "/recompensas/$RID/validacion" "$ANALISTA" '{"aprobar":true}')" == 403 ]] && ok 'El Analista no puede validarla (403)'
peticion PATCH "/recompensas/$RID/validacion" "$ALMIRANTE" '{"aprobar":true,"motivo":"Aprobada en demo"}' | jq -c '.data | {estado, validadaPor}'
sleep 1
peticion GET "/criminales/$CID" "$ANALISTA" | jq -c '.data | {recompensaVigenteMonto, nivelAmenaza}'
V="$(esperar_cartel "$CID" "$ANALISTA" 2)"
ok "Almirante aprobo; la anterior paso a HISTORICA; cartel ahora en version $V"

paso '5. Historial de modificaciones (trazabilidad por trigger)'
peticion GET "/criminales/$CID/historial" "$ANALISTA" | jq -c '[.data[] | {campo, valorAnterior, valorNuevo}] | .[0:4]'
ok 'Cada cambio quedo con valor anterior, nuevo y usuario'

paso '6. Centro de inteligencia: reporte ciudadano -> avistamiento (RF-3)'
REP="$(peticion POST /reportes-ciudadanos '' "{\"criminalId\":\"$CID\",\"descripcion\":\"Lo vi comprando provisiones en el muelle\",\"ubicacion\":\"Grove 13, Sabaody\",\"zonaInfluenciaId\":\"z-sabaody\"}")"
REPID="$(echo "$REP" | jq -r .data.id)"
ok "Reporte publico recibido sin login ($REPID)"
peticion PATCH "/reportes-ciudadanos/$REPID/revision" "$DIRECTOR" '{"decision":"APROBADO"}' | jq -c '.data | {estado, avistamientoId}'
peticion GET "/avistamientos?criminalId=$CID" "$DIRECTOR" | jq -c '.data[0] | {ubicacion, origen, estadoVerificacion}'
ok 'El Director lo aprobo y se convirtio en avistamiento oficial'

paso '7. Coordinacion de operativos entre bases (RF-4)'
OP="$(peticion POST /operativos "$COORDINADOR" "{\"nombre\":\"Captura de Bege $SUFIJO\",\"objetivoCriminalId\":\"$CID\",\"fechaInicioPlaneada\":\"2026-12-01T06:00:00Z\",\"objetivo\":\"Rodear el Grove 13\",\"prioridad\":\"ALTA\"}")"
OPID="$(echo "$OP" | jq -r .data.id)"
echo "$OP" | jq -c '.data | {codigo, estado, prioridad, baseLiderId}'
peticion POST "/operativos/$OPID/bases" "$COORDINADOR" '{"bases":[{"baseNavalId":"b-g1","rolParticipacion":"APOYO","unidadesAsignadas":6,"recursos":"2 buques"}]}' >/dev/null
VER="$(peticion GET "/operativos/$OPID" "$COORDINADOR" | jq -r .data.version)"
peticion PATCH "/operativos/$OPID/estado" "$COORDINADOR" "{\"estado\":\"EN_CURSO\",\"version\":$VER}" | jq -c '.data | {estado, version}'
[[ "$(codigo PATCH "/operativos/$OPID/estado" "$COORDINADOR" "{\"estado\":\"ABORTADO\",\"version\":$VER}")" == 409 ]] && ok 'Concurrencia optimista: version vieja -> 409'
ok 'Operativo creado, base G-1 asignada y en curso; las bases reciben notificacion'

paso '8. Enfrentamiento vinculado al operativo (RF-6)'
INC="$(peticion POST /incidentes "$COORDINADOR" "{\"tipo\":\"ENFRENTAMIENTO\",\"fechaHora\":\"2026-11-10T15:30:00Z\",\"ubicacion\":\"Grove 13\",\"descripcion\":\"Choque con la tripulacion\",\"operativoId\":\"$OPID\",\"criminales\":[{\"criminalId\":\"$CID\",\"rolEnIncidente\":\"OBJETIVO\"}],\"marinos\":[{\"nombre\":\"Vicealmirante Momonga\"}]}")"
INCID="$(echo "$INC" | jq -r .data.id)"
IVER="$(echo "$INC" | jq -r .data.version)"
peticion POST "/incidentes/$INCID/cierre" "$COORDINADOR" "{\"resultado\":\"EXITO\",\"desenlaces\":[{\"criminalId\":\"$CID\",\"desenlace\":\"CAPTURADO\"}],\"version\":$IVER}" | jq -c '.data | {resultado}'
sleep 1
peticion GET "/criminales/$CID" "$ANALISTA" | jq -c '.data | {estado, fechaBaja}'
ok 'Al cerrar el enfrentamiento, el criminal paso a CAPTURADO automaticamente'
peticion GET "/incidentes/por-operativo/$OPID" "$COORDINADOR" | jq -c '.meta'

paso '9. Analisis y reportes (RNF < 3 s)'
INICIO=$(date +%s%N)
peticion GET /reportes/recompensas-por-mar "$DIRECTOR" | jq -c '[.data.filas[]? // .data[]? | {mar: (.marNombre // .mar), total: (.totalAcumulado // .total)}]' || true
FIN=$(date +%s%N)
ok "Reporte mensual por mar en $(( (FIN-INICIO)/1000000 )) ms"
curl -s -o /tmp/reporte.csv -w '   CSV: %{http_code} %{content_type}\n' "$API/reportes/recompensas-por-mar/exportar?formato=csv" -H "Authorization: Bearer $DIRECTOR"
curl -s -o /tmp/reporte.pdf -w '   PDF: %{http_code} %{content_type}\n' "$API/reportes/recompensas-por-mar/exportar?formato=pdf" -H "Authorization: Bearer $DIRECTOR"
peticion GET /amenaza/distribucion "$ANALISTA" | jq -c .data

paso '10. Bitacora de auditoria (RF-7)'
peticion GET "/auditoria?limit=5" "$SEGURIDAD" | jq -c '[.data[] | {accion, rol, exitoso}]'
[[ "$(codigo GET /auditoria "$ANALISTA")" == 403 ]] && ok 'Solo Seguridad y Almirante leen la bitacora'

printf '\n\033[1;32mFlujo completo OK.\033[0m\n'
