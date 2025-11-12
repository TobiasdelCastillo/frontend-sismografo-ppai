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
    

    //     @PatchMapping("/modificar/{modificacion}")
    // public String[] tomarModificacion(@PathVariable Boolean modificacion){
    //     return gestorRevisionService.tomarModificacion(modificacion);
    // }
    async tomarModificacion(modificacion){
        const resp = await this._request(`/revision-manual/modificar/${modificacion}`, { method: 'PATCH' });
        // Normalizar la respuesta para devolver siempre un arreglo de strings
        try{
            return parseOpciones(resp);
        }catch(e){
            // En caso de error en el parseo, devolver un fallback
            return ['Confirmar', 'Rechazar', 'Solicitar revision a experto'];
        }
    }



    // POST /gestor-revision/seleccionar
    async seleccionarEvento(payload){
        return await this._request('/gestor-revision/seleccionar', { method: 'POST', body: JSON.stringify(payload) });
    }

    // POST /gestor-revision/confirmar
    async confirmarEvento(payload){
        return await this._request('/gestor-revision/confirmar', { method: 'POST', body: JSON.stringify(payload) });
    }

    // POST /gestor-revision/rechazar
    async rechazarEvento(opc){
        return await this._request(`/revision-manual/rechazar/${encodeURIComponent(opc)}`, { method: 'PATCH' });
    }

    // POST /gestor-revision/solicitar-experto
    async solicitarRevisionExperto(payload){
        return await this._request('/gestor-revision/solicitar-experto', { method: 'POST', body: JSON.stringify(payload) });
    }

}
