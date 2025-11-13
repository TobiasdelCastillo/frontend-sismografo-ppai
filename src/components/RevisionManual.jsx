import { useEffect, useState, useRef } from 'react';
import { GestorRevision } from '../modelos/index';
import OpcionesRevision from './OpcionesRevision';

function RevisionManual() {
    const gestorRef = useRef(new GestorRevision());
    const gestor = gestorRef.current;
    const [eventos, setEventos] = useState([]);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleEstadoActualizado = async () => {
        setMostrarModal(false);
        await cargarEventos();
    };

    const cargarEventos = async () => {
        setLoading(true);
        setError(null);
        try {
            const ev = await gestor.buscarEventosNoRevisados();
            setEventos(ev || []);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los eventos. Ver consola para más detalles.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        cargarEventos();
    }, []);
    
    
    const handleRevisar = async (eventoPlano) => {
        setLoading(true);
        setError(null);
        try{
            // Bloquear el evento (cambiar a estado bloqueado)
            const idEvento = eventoPlano.id;
            if(idEvento){
                const datosEvento = await gestor.bloquearEvento(idEvento);
                setDatos(datosEvento);
            }
            
            setEventoSeleccionado(eventoPlano);
            setMostrarModal(true);
        }catch(err){
            console.error('Error al bloquear evento:', err);
            setError('Error al bloquear evento.');
        }finally{
            setLoading(false);
        }
    };




    // --- ESTILOS EN LÍNEA Y CLASES PARA UNIFICAR CON INICIO ---
    return (
        <div
            className="d-flex flex-column align-items-center justify-content-center min-vh-100"
            style={{
                background: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
                color: "#fff",
                fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
            }}
        >
            <div
                className="shadow-lg rounded-4 p-5"
                style={{
                    background: "rgba(20, 30, 48, 0.85)",
                    maxWidth: 1100,
                    width: "100%",
                }}
            >
                <div className="mb-4 text-center">
                    <h1 className="fw-bold mb-2" style={{ letterSpacing: 1, color: "#00e6ff" }}>
                        Eventos Sísmicos Auto Detectados
                    </h1>
                    <h5 className="mb-3" style={{ color: "#00e6ff" }}>
                        Revisión Manual de Eventos
                    </h5>
                </div>
                <div className="table-responsive">
                    <table className="table table-dark table-striped table-hover align-middle rounded-3 overflow-hidden">
                        <thead>
                            <tr style={{ background: "rgba(0,230,255,0.10)" }}>
                                <th>Fecha y Hora</th>
                                <th>Latitud Epicentro</th>
                                <th>Longitud Epicentro</th>
                                <th>Latitud Hipocentro</th>
                                <th>Longitud Hipocentro</th>
                                <th>Magnitud</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventos.map((evento, idx) => (
                                <tr key={idx}>
                                    <td>{evento.fechaHoraOcurrencia}</td>
                                    <td>{evento.latitudEpicentro}</td>
                                    <td>{evento.longitudEpicentro}</td>
                                    <td>{evento.latitudHipocentro}</td>
                                    <td>{evento.longitudHipocentro}</td>
                                    <td>
                                        <span className="badge rounded-pill" style={{ background: "#00e6ff", color: "#222", fontWeight: 600 }}>
                                            {evento.valorMagnitud}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                                            style={{
                                                background: "linear-gradient(90deg, #00e6ff 0%, #0072ff 100%)",
                                                border: "none",
                                                fontWeight: 600,
                                                fontSize: 15,
                                                boxShadow: "0 2px 12px 0 rgba(0,230,255,0.10)",
                                                transition: "transform 0.1s",
                                            }}
                                            onClick={() => handleRevisar(evento)}
                                        >
                                            <i className="bi bi-journal-check" style={{ fontSize: 18 }}></i>
                                            Revisar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <OpcionesRevision
                    evento={eventoSeleccionado}
                    show={mostrarModal}
                    onHide={() => setMostrarModal(false)}
                    gestor={gestor}
                    datos={datos}
                    onEstadoActualizado={handleEstadoActualizado}
                    finCU={() => {}}
                />
            </div>
        </div>
    );
}

export { RevisionManual };
