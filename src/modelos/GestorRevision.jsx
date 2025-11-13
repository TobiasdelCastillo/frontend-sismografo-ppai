/**
 * GestorRevision - Cliente HTTP para gestión de eventos sísmicos
 * Toda la lógica de negocio está en el backend (Java/Spring Boot)
 * Este cliente solo maneja consultas HTTP y visualización
 */
import { parseOpciones } from './OpcionesBack';
export class GestorRevision {
    constructor(options = {}){
        this.baseUrl = (typeof window !== 'undefined' && import.meta?.env?.VITE_API_URL)
            ? import.meta.env.VITE_API_URL
            : (options.baseUrl || 'http://localhost:8080');
        this.authToken = options.authToken || null;
    }

    setAuthToken(token){
        this.authToken = token;
    }

    _buildHeaders(json = true){
        const headers = {};
        if(json){
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';
        }
        if(this.authToken){
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    async _request(path, opts = {}){
        const url = `${this.baseUrl}${path}`;
        const init = Object.assign({}, opts);
        const sendJson = init.json !== false;
        init.headers = Object.assign({}, init.headers || {}, this._buildHeaders(sendJson));

        const resp = await fetch(url, init);
        const contentType = resp.headers.get('content-type') || '';
        let body = null;
        if(contentType.includes('application/json')){
            body = await resp.json();
        } else {
            body = await resp.text();
        }
        if(!resp.ok){
            const message = (body && body.message) ? body.message : `HTTP ${resp.status}`;
            const err = new Error(message);
            err.status = resp.status;
            err.body = body;
            throw err;
        }
        return body;
    }

    // GET /gestor-revision
    async buscarEventosNoRevisados(){
        return await this._request('/revision-manual/auto-detectados', { method: 'GET' });
    }
    
    // PATCH /bloquear/{idEvento}
    async bloquearEvento(idEvento){
        return await this._request(`/revision-manual/bloquear/${idEvento}`, { method: 'PATCH' });
    }
    

    // PATCH /revision-manual/modificar/{modificacion}
    // Envía: { modificacion: boolean, modificacionInfo: { id, magnitud, alcance, origen } }
    // Devuelve: String[] (opciones de acción)
    async tomarModificacion(modificacion, modificacionInfo = {}){
        const payload = {
            id: modificacionInfo.id || null,
            magnitud: modificacionInfo.magnitud || null,
            alcance: modificacionInfo.alcance || null,
            origen: modificacionInfo.origen || null
        };
        const resp = await this._request(`/revision-manual/modificar/${modificacion}`, { 
            method: 'PATCH', 
            body: JSON.stringify(payload) 
        });
        // Normalizar la respuesta para devolver siempre un arreglo de strings
        try{
            return parseOpciones(resp);
        }catch(e){
            // En caso de error en el parseo, devolver un fallback
            return ['Confirmar', 'Rechazar', 'Solicitar revision a experto'];
        }
    }


    async rechazarEvento(opc){
        return await this._request(`/revision-manual/accion/${encodeURIComponent(opc)}`, { method: 'PATCH', json: false });
    }

    // Alias genérico para tomar una acción por nombre (Confirmar/Rechazar/Solicitar revision a experto)
    async tomarAccion(opc){
        return await this._request(`/revision-manual/accion/${encodeURIComponent(opc)}`, { method: 'PATCH', json: false });
    }

    // Compatibilidad: confirmarEvento existía antes y algunas partes del UI lo llaman.
    // Implementamos como wrapper que invoca el endpoint /revision-manual/accion/Confirmar
    async confirmarEvento(payload){
        // payload puede ser un texto o un objeto; ignoramos y llamamos al endpoint esperable
        return await this._request(`/revision-manual/accion/${encodeURIComponent('Confirmar')}`, { method: 'PATCH', json: false });
    }

    // POST /gestor-revision/seleccionar
    async seleccionarEvento(payload){
        return await this._request('/gestor-revision/seleccionar', { method: 'POST', body: JSON.stringify(payload) });
    }


 

    // POST /gestor-revision/solicitar-experto
    async solicitarRevisionExperto(payload){
        return await this._request('/gestor-revision/solicitar-experto', { method: 'POST', body: JSON.stringify(payload) });
    }

}
