import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

function VisualizarMapa({ evento, show, onHide, gestor, datos, onEstadoActualizado, handleFinCU }) {
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [showThirdModal, setShowThirdModal] = useState(false);

  // Estados para campos modificables
  const [magnitud, setMagnitud] = useState('');
  const [alcance, setAlcance] = useState('');
  const [clasificacion, setClasificacion] = useState('');
  const [origen, setOrigen] = useState('');
  const [mostrarFinCU, setMostrarFinCU] = useState(false);
  const [opcionesState, setOpcionesState] = useState(null);
  const [mostrarNotificacionModificacion, setMostrarNotificacionModificacion] = useState(false);
  const [modifiedInfo, setModifiedInfo] = useState(null);

  // Opciones provistas por el backend (datos, o por la llamada a tomarModificacion) o fallback local
  const opciones = opcionesState || ((datos && datos.opciones) ? datos.opciones : ['Confirmar', 'Rechazar', 'Solicitar revision a experto']);

  // Cargar datos del evento al iniciar
  useEffect(() => {
    if (evento && show) {
      // Debug: ver qué viene en 'evento' y en 'datos' cuando se abre el modal
      // (console.debug no rompe en producción, ayuda a encontrar nombres de propiedades)
      console.debug('VisualizarMapa - evento:', evento, 'datos:', datos);

      setMagnitud(evento.valorMagnitud || '');

      // Soporte para varios nombres posibles devueltos por el backend
      const alcanceVal = (datos && (datos.alcanceNombre || datos.alcance || datos.alcance_name))
        || evento.alcanceNombre || evento.alcance || evento.alcance_name || '';
      const origenVal = (datos && (datos.origenNombre || datos.origen || datos.origen_name))
        || evento.origenNombre || evento.origen || evento.origen_name || '';
      const clasificacionVal = (datos && (datos.clasificacionNombre || datos.clasificacion || datos.clasificacion_name))
        || evento.clasificacionNombre || evento.clasificacion || evento.clasificacion_name || '';

      setAlcance(alcanceVal);
      setOrigen(origenVal);
      setClasificacion(clasificacionVal);
    }
  }, [evento, show, datos]);

  // Valores a mostrar en el modal - calculados a partir de props (evita problemas de timing con setState)
  const displayAlcance = (datos && (datos.alcanceNombre || datos.alcance || datos.alcance_name))
    || (evento && (evento.alcanceNombre || evento.alcance || evento.alcance_name))
    || alcance;
  const displayOrigen = (datos && (datos.origenNombre || datos.origen || datos.origen_name))
    || (evento && (evento.origenNombre || evento.origen || evento.origen_name))
    || origen;
  const displayClasificacion = (datos && (datos.clasificacionNombre || datos.clasificacion || datos.clasificacion_name))
    || (evento && (evento.clasificacionNombre || evento.clasificacion || evento.clasificacion_name))
    || clasificacion;

  // Cuando se abre el segundo modal (modificación), inicializar los estados del formulario
  // a partir de los valores calculados (display...). Esto evita que el select de 'origen'
  // quede vacío por condiciones de carrera entre props y setState.
  useEffect(() => {
    if (showSecondModal) {
      setMagnitud((evento && evento.valorMagnitud) || magnitud || '');
      setAlcance(displayAlcance || alcance || '');
      // Normalizar y mapear 'origen' a una de las opciones del select (evita problemas de tildes/case)
      const ORIGEN_OPTIONS = ['Tectónico', 'Volcánico', 'Artificial'];
      const normalize = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
      const matchOption = (val, options) => {
        if(!val) return '';
        const n = normalize(val);
        for(const opt of options){
          if(normalize(opt) === n) return opt;
        }
        return val; // devolver original si no encuentra
      };
      setOrigen(matchOption(displayOrigen || origen || '', ORIGEN_OPTIONS));
      setClasificacion(displayClasificacion || clasificacion || '');
    }
  }, [showSecondModal, displayAlcance, displayOrigen, displayClasificacion, evento]);

  // Controladores de modales
  const handleClose = () => onHide();

  const handleSecondClose = () => setShowSecondModal(false);

  const handleClick = (op) => {
    // Mostrar/ocultar modal principal; si el usuario elige "Sí" para visualizar, mantenemos la UI local
    if(op){
      // el frontend sólo controla la visualización; la acción de visualizar no necesita backend
      onHide();
    } else {
      // Si no visualizar, preguntar por modificar
      // Cerrar todos los otros modales antes de abrir el segundo
      setShowThirdModal(false);
      setMostrarNotificacionModificacion(false);
      setMostrarFinCU(false);
      // Cerrar el modal principal (padre) y abrir el segundo modal
      onHide();
      setShowSecondModal(true);
    }
  };

  // Cuando rechazas la modificación (cerrar el segundo modal)
  const handleModificacion = async (modificacion) => {
    // Cerrar segundo modal y consultar al backend si hay opciones de acción según la decisión
    setShowSecondModal(false);
    setMostrarFinCU(false);
    try{
      // Preparar datos de modificación a enviar al backend
      const modificacionInfo = {
        id: evento?.id,
        magnitud: magnitud || null,
        alcance: alcance || null,
        origen: origen || null
      };
      // Guardar lo que había antes y lo que se enviará (para mostrar diff en la notificación)
      const before = {
        magnitud: evento?.valorMagnitud ?? null,
        alcance: (datos && (datos.alcanceNombre || datos.alcance || datos.alcance_name)) || evento?.alcanceNombre || evento?.alcance || evento?.alcance_name || null,
        origen: (datos && (datos.origenNombre || datos.origen || datos.origen_name)) || evento?.origenNombre || evento?.origen || evento?.origen_name || null
      };
      const after = {
        magnitud: modificacionInfo.magnitud ?? null,
        alcance: modificacionInfo.alcance ?? null,
        origen: modificacionInfo.origen ?? null
      };
      setModifiedInfo({ before, after });
      // Llamada al backend que devuelve las opciones (String[])
      const resp = await gestor.tomarModificacion(Boolean(modificacion), modificacionInfo);
      // Si la respuesta viene como objeto con 'opciones', adaptamos, si no asumimos arreglo
      if(resp && resp.opciones){
        setOpcionesState(resp.opciones);
      } else if(Array.isArray(resp)){
        setOpcionesState(resp);
      } else {
        // fallback: usar opciones por defecto
        setOpcionesState(['Confirmar', 'Rechazar', 'Solicitar revision a experto']);
      }
      // Si se modificó (modificacion === true), mostrar notificación de éxito
      // NO abrir el tercer modal aún; se abrirá cuando cierre la notificación
      if(modificacion) {
        // Cerrar tercer modal si estaba abierto, mostrar notificación
        setShowThirdModal(false);
        // Cerrar primer modal si sigue abierto
        onHide();
        setMostrarNotificacionModificacion(true);
      } else {
        // Si NO se modificó, abrir directamente el tercer modal con opciones
        // Cerrar notificación si estaba abierta
        setMostrarNotificacionModificacion(false);
        // Cerrar primer modal si sigue abierto
        onHide();
        setShowThirdModal(true);
      }
    }catch(err){
      console.error('Error al solicitar opciones de modificación:', err);
      alert('No se pudieron cargar las opciones de modificación. Reintente.');
    }
  };

  // Cuando confirmas/modificas o cierras tercer modal
  const handleThirdClose = () => setShowThirdModal(false);

  // Manejar selección de opción en tercer modal
  const handleOptionSelect = async (option) => {
    // Llamar al backend para la acción seleccionada
    try{
      // Unificar acciones: el backend expone /revision-manual/accion/{opc}
      // para Confirmar, Rechazar y Solicitar revision a experto. Usamos
      // el método genérico tomarAccion para invocarlo.
      const ACTIONS_VIA_ACCION = ['Confirmar', 'Rechazar', 'Solicitar revision a experto'];
      if (ACTIONS_VIA_ACCION.includes(option)) {
        // Preferir el método genérico tomarAccion si está disponible,
        // si no existe, caer en los métodos específicos según el nombre.
        if (gestor && typeof gestor.tomarAccion === 'function') {
          await gestor.tomarAccion(option);
        } else {
          // Método genérico no disponible -> intentar métodos concretos
          if (option === 'Confirmar' && gestor && typeof gestor.confirmarEvento === 'function') {
            await gestor.confirmarEvento(option);
          } else if (option === 'Rechazar' && gestor && typeof gestor.rechazarEvento === 'function') {
            await gestor.rechazarEvento(option);
          } else if (option === 'Solicitar revision a experto' && gestor && typeof gestor.solicitarRevisionExperto === 'function') {
            await gestor.solicitarRevisionExperto(option);
          } else {
            // ultimo recurso: intentar invocar tomarAccion aunque no sea función (lanza error controlado)
            await gestor.tomarAccion(option);
          }
        }
      } else {
        // fallback: usar los métodos anteriores si es necesario
        if (gestor && typeof gestor.confirmarEvento === 'function') {
          await gestor.confirmarEvento(option);
        } else {
          // intentar tomarAccion como último recurso
          await gestor.tomarAccion(option);
        }
      }

      // Actualizar listado en el padre
      onEstadoActualizado();
      // Cerrar todos los modales excepto el modal final de confirmación
      setShowThirdModal(false);
      setShowSecondModal(false);
      setMostrarNotificacionModificacion(false);
      setMostrarFinCU(true);
    }catch(err){
      console.error('Error al ejecutar acción sobre el evento:', err);
      // mostrar alerta simple
      alert('Error en la acción: ' + (err.message || err.status || 'desconocido'));
    }
  };

  // Handlers explícitos para botones que deben invocar /revision-manual/accion/{opc}
  const handleConfirmarClick = async () => {
    try{
      if (gestor && typeof gestor.tomarAccion === 'function') {
        await gestor.tomarAccion('Confirmar');
      } else if (gestor && typeof gestor.confirmarEvento === 'function') {
        await gestor.confirmarEvento('Confirmar');
      } else {
        // último recurso
        await gestor.rechazarEvento && gestor.rechazarEvento('Confirmar');
      }
      onEstadoActualizado();
      setShowThirdModal(false);
      setShowSecondModal(false);
      setMostrarNotificacionModificacion(false);
      setMostrarFinCU(true);
    }catch(err){
      console.error('Error al confirmar evento:', err);
      alert('Error en la acción: ' + (err.message || err.status || 'desconocido'));
    }
  };

  const handleSolicitarRevisionClick = async () => {
    try{
      if (gestor && typeof gestor.tomarAccion === 'function') {
        await gestor.tomarAccion('Solicitar revision a experto');
      } else if (gestor && typeof gestor.solicitarRevisionExperto === 'function') {
        await gestor.solicitarRevisionExperto('Solicitar revision a experto');
      } else if (gestor && typeof gestor.tomarAccion !== 'function' && gestor && typeof gestor.rechazarEvento === 'function') {
        // intentar usar rechazarEvento si no hay otra alternativa
        await gestor.rechazarEvento('Solicitar revision a experto');
      } else {
        // intento final: invocar tomarAccion (esto lanzará si no existe)
        await gestor.tomarAccion('Solicitar revision a experto');
      }
      onEstadoActualizado();
      setShowThirdModal(false);
      setShowSecondModal(false);
      setMostrarNotificacionModificacion(false);
      setMostrarFinCU(true);
    }catch(err){
      console.error('Error al solicitar revision a experto:', err);
      alert('Error en la acción: ' + (err.message || err.status || 'desconocido'));
    }
  };

  if (!evento) return null;

  // --- ESTILOS UNIFICADOS ---
  const modalStyle = {
    background: "rgba(20, 30, 48, 0.95)",
    color: "#fff",
    borderRadius: 20,
    border: "none",
    boxShadow: "0 4px 32px 0 rgba(0,230,255,0.10)",
    fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
    padding: "0"
  };

  const headerStyle = {
    background: "linear-gradient(90deg, #00e6ff 0%, #0072ff 100%)",
    color: "#222",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    border: "none",
    padding: "1.5rem 2rem"
  };

  const titleStyle = {
    fontWeight: 700,
    letterSpacing: 1,
    color: "#222"
  };

  const bodyStyle = {
    background: "rgba(20, 30, 48, 0.95)",
    color: "#fff",
    padding: "2rem"
  };

  const footerStyle = {
    background: "rgba(20, 30, 48, 0.95)",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    border: "none",
    padding: "1.5rem 2rem"
  };

  const btnPrimary = {
    background: "linear-gradient(90deg, #00e6ff 0%, #0072ff 100%)",
    border: "none",
    fontWeight: 600,
    fontSize: 15,
    color: "#222",
    boxShadow: "0 2px 12px 0 rgba(0,230,255,0.10)",
    transition: "transform 0.1s"
  };

  const btnDanger = {
    background: "linear-gradient(90deg, #ff4b2b 0%, #ff416c 100%)",
    border: "none",
    fontWeight: 600,
    fontSize: 15,
    color: "#fff",
    boxShadow: "0 2px 12px 0 rgba(255,75,43,0.10)",
    transition: "transform 0.1s"
  };

  const btnSecondary = {
    background: "#222",
    border: "none",
    fontWeight: 600,
    fontSize: 15,
    color: "#fff",
    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.10)",
    transition: "transform 0.1s"
  };

  const selectStyle = {
    background: "#222",
    color: "#00e6ff",
    border: "1px solid #00e6ff"
  };

  const inputStyle = {
    background: "#222",
    color: "#00e6ff",
    border: "1px solid #00e6ff"
  };

  return (
    <>
      {/* Primer modal */}
      <Modal show={show} onHide={onHide} centered contentClassName="border-0" style={{ border: "none" }}>
        <div style={modalStyle}>
          <Modal.Header closeButton style={headerStyle}>
            <Modal.Title style={titleStyle}>Datos del evento sísmico seleccionado</Modal.Title>
          </Modal.Header>
          <Modal.Body style={bodyStyle}>
            <div>
              <p><b>Alcance:</b> {displayAlcance}</p>
              <p><b>Clasificación:</b> {displayClasificacion}</p>
              <p><b>Origen:</b> {displayOrigen}</p>
            </div>
            <hr style={{ borderColor: "#00e6ff", opacity: 0.2 }} />
            <div>
              <h5 style={{ color: "#00e6ff" }}>
                ¿Desea visualizar en un mapa el evento sísmico y las estaciones sismológicas involucradas?
              </h5>
            </div>
          </Modal.Body>
          <Modal.Footer style={footerStyle}>
            <Button style={btnDanger} onClick={() => handleClick(false)}>
              No
            </Button>
            <Button style={btnPrimary} onClick={() => handleClick(true)}>
              Sí
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Segundo modal */}
      <Modal show={showSecondModal} onHide={handleSecondClose} centered contentClassName="border-0" style={{ border: "none" }}>
        <div style={modalStyle}>
          <Modal.Header closeButton style={headerStyle}>
            <Modal.Title style={titleStyle}>¿Desea modificar datos del evento?</Modal.Title>
          </Modal.Header>
          <Modal.Body style={bodyStyle}>
            <p>Modificación de los siguientes datos del evento sísmico:</p>
            <form id="formModificarEvento">
              <div className="mb-3">
                <label htmlFor="magnitud" className="form-label">Magnitud</label>
                <input
                  type="number"
                  className="form-control"
                  id="magnitud"
                  name="magnitud"
                  step="0.1"
                  value={magnitud}
                  onChange={(e) => setMagnitud(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="alcance" className="form-label">Alcance</label>
                <select
                  className="form-select"
                  id="alcance"
                  name="alcance"
                  value={displayAlcance}
                  onChange={(e) => setAlcance(e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">Seleccione alcance</option>
                  <option value="Local">Local</option>
                  <option value="Regional">Regional</option>
                  <option value="Global">Global</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="origen" className="form-label">Origen de generación</label>
                <select
                  className="form-select"
                  id="origen"
                  name="origen"
                  value={displayOrigen}
                  onChange={(e) => setOrigen(e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">Seleccione origen</option>
                  <option value="Tectónico">Tectónico</option>
                  <option value="Volcánico">Volcánico</option>
                  <option value="Artificial">Artificial</option>
                </select>
              </div>
            </form>
          </Modal.Body>
          <Modal.Footer style={footerStyle}>
            <Button style={btnDanger} onClick={() => handleModificacion(false)}>
              No Modificar
            </Button>
            <Button style={btnPrimary} onClick={() => handleModificacion(true)}>
              Modificar
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Tercer modal */}
      <Modal show={showThirdModal} onHide={handleThirdClose} centered contentClassName="border-0" style={{ border: "none" }}>
        <div style={modalStyle}>
          <Modal.Header closeButton style={headerStyle}>
            <Modal.Title style={titleStyle}>Seleccione una acción</Modal.Title>
          </Modal.Header>
          {/* Helper para estilos de botones según la opción */}
          {/* confirmar -> verde, rechazar -> rojo (usar btnDanger), solicitar revision -> naranja */}
          <Modal.Body style={bodyStyle}>
                <p>Seleccione una acción para el evento.</p>
                <div className="d-grid gap-2">
                  {opciones.map((op, idx) => {
                    const keyLower = (op || '').toString().toLowerCase();
                    const getOptionButtonStyle = (opt) => {
                      if(!opt) return { ...btnPrimary };
                      if(opt === 'Confirmar' || keyLower === 'confirmar'){
                        return { ...btnPrimary, background: 'linear-gradient(90deg, #28a745 0%, #1e9b3f 100%)', color: '#fff', border: 'none' };
                      }
                      if(opt === 'Rechazar' || keyLower === 'rechazar'){
                        return { ...btnDanger };
                      }
                      if(keyLower.includes('solicitar') || keyLower.includes('revision')){
                        return { ...btnPrimary, background: 'linear-gradient(90deg, #ff9800 0%, #ff6d00 100%)', color: '#222', border: 'none' };
                      }
                      // fallback: estilo por defecto (outline azul)
                      return { ...btnPrimary, background: 'transparent', color: '#00e6ff', border: '2px solid #00e6ff' };
                    };

                    return (
                      <Button
                        key={idx}
                        style={getOptionButtonStyle(op)}
                        onClick={() => handleOptionSelect(op)}
                      >
                        {op}
                      </Button>
                    );
                  })}
                </div>
              </Modal.Body>
          <Modal.Footer style={footerStyle}>
            <Button style={btnSecondary} onClick={handleThirdClose}>
              Cancelar
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Modal Fin CU */}
      <Modal show={mostrarFinCU} onHide={() => setMostrarFinCU(false)} centered contentClassName="border-0" style={{ border: "none" }}>
        <div style={modalStyle}>
          <Modal.Header closeButton style={headerStyle}>
            <Modal.Title style={titleStyle}>Registrar resultado de revisión manual</Modal.Title>
          </Modal.Header>
          <Modal.Body style={bodyStyle}>
            <p style={{ color: "#00e6ff" }}>Revisión manual registrada correctamente</p>
          </Modal.Body>
          <Modal.Footer style={footerStyle}>
            <Button style={btnPrimary} onClick={() => setMostrarFinCU(false)}>
              Cerrar
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Modal Notificación de Modificación */}
  <Modal show={mostrarNotificacionModificacion} onHide={() => { setMostrarNotificacionModificacion(false); setShowSecondModal(false); setMostrarFinCU(false); onHide(); setShowThirdModal(true); }} centered contentClassName="border-0" style={{ border: "none" }}>
        <div style={modalStyle}>
          <Modal.Header closeButton style={headerStyle}>
            <Modal.Title style={titleStyle}>Evento Modificado</Modal.Title>
          </Modal.Header>
          <Modal.Body style={bodyStyle}>
            <div style={{ textAlign: 'center' }}>
              <i className="bi bi-check-circle" style={{ fontSize: 48, color: "#4caf50", marginBottom: "1rem" }}></i>
              <p style={{ fontSize: "1.1rem", color: "#00e6ff", marginBottom: "0.5rem" }}>
                ¡Evento modificado correctamente!
              </p>
              {modifiedInfo ? (
                (() => {
                  const { before, after } = modifiedInfo;
                  const keys = ['magnitud', 'alcance', 'origen'];
                  const changed = keys.filter(k => {
                    const b = before?.[k];
                    const a = after?.[k];
                    // comparar como strings, considerando null/undefined
                    return String(b ?? '') !== String(a ?? '');
                  });
                  if (changed.length === 0) {
                    return <p style={{ color: "#aaa", fontSize: "0.95rem" }}>No hubo cambios en los campos seleccionados.</p>;
                  }
                  return (
                    <div style={{ color: "#ddd", fontSize: "0.95rem", textAlign: 'left', margin: '0 auto', maxWidth: 420 }}>
                      <p style={{ color: '#00e6ff', marginBottom: '0.5rem' }}>Cambios realizados:</p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {changed.map((k) => (
                          <li key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                            <strong style={{ textTransform: 'capitalize', color: '#fff' }}>{k.replace(/([A-Z])/g, ' $1')}</strong>
                            <span style={{ color: '#aaa' }}>{String(before?.[k] ?? '')} → <strong style={{ color: '#00e6ff' }}>{String(after?.[k] ?? '')}</strong></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()
              ) : (
                <p style={{ color: "#aaa", fontSize: "0.95rem" }}>
                  Los datos del evento sísmico han sido actualizados en el sistema.
                </p>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer style={footerStyle}>
            <Button style={btnPrimary} onClick={() => { setMostrarNotificacionModificacion(false); setShowSecondModal(false); setMostrarFinCU(false); onHide(); setShowThirdModal(true); }}>
              Continuar
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </>
  );
}

export default VisualizarMapa;