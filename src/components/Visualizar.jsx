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
      setShowSecondModal(true);
    }
  };

  // Cuando rechazas la modificación (cerrar el segundo modal)
  const handleModificacion = async (modificacion) => {
    // Cerrar segundo modal y consultar al backend si hay opciones de acción según la decisión
    setShowSecondModal(false);
    try{
      // Llamada al backend que devuelve las opciones (String[])
      const resp = await gestor.tomarModificacion(Boolean(modificacion));
      // Si la respuesta viene como objeto con 'opciones', adaptamos, si no asumimos arreglo
      if(resp && resp.opciones){
        setOpcionesState(resp.opciones);
      } else if(Array.isArray(resp)){
        setOpcionesState(resp);
      } else {
        // fallback: usar opciones por defecto
        setOpcionesState(['Confirmar', 'Rechazar', 'Solicitar revision a experto']);
      }
      setShowThirdModal(true);
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
      if(option === 'Confirmar'){
        await gestor.confirmarEvento(option);
      } else if(option === 'Rechazar'){
        await gestor.rechazarEvento(option);
      } else if(option === 'Solicitar revision a experto' || option === 'Solicitar revision a experto'){
        await gestor.solicitarRevisionExperto(option);
      } else {
        // fallback: enviar a confirmar por defecto
        await gestor.confirmarEvento(option);
      }

      // Actualizar listado en el padre
      onEstadoActualizado();
      setShowThirdModal(false);
      setMostrarFinCU(true);
    }catch(err){
      console.error('Error al ejecutar acción sobre el evento:', err);
      // mostrar alerta simple
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
            <Button style={btnSecondary} onClick={() => handleModificacion(false)}>
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
          <Modal.Body style={bodyStyle}>
            <p>Seleccione una acción para el evento.</p>
            <div className="d-grid gap-2">
              {opciones.map((op, idx) => (
                <Button
                  key={idx}
                  variant="outline-primary"
                  style={{
                    ...btnPrimary,
                    background: "transparent",
                    color: "#00e6ff",
                    border: "2px solid #00e6ff"
                  }}
                  onClick={() => handleOptionSelect(op)}
                >
                  {op}
                </Button>
              ))}
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
    </>
  );
}

export default VisualizarMapa;