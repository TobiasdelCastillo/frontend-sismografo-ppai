// Utilidad para obtener y normalizar las opciones que devuelve
// el endpoint PATCH /revision-manual/modificar/{modificacion}
// Exporta la función por defecto `obtenerOpciones` y la función pura `parseOpciones`.

const DEFAULT_OPCIONES = ['Confirmar', 'Rechazar', 'Solicitar revision a experto'];

/**
 * Parsea distintas formas en que el backend puede devolver las opciones
 * y siempre devuelve un arreglo de strings.
 * - Si body es Array -> lo devuelve
 * - Si body es { opciones: Array } -> devuelve body.opciones
 * - Si body es string JSON -> intenta parsear
 * - Si body es comma-separated string -> lo divide
 * - Si no puede obtener opciones, devuelve DEFAULT_OPCIONES
 */
export function parseOpciones(body){
	if(!body) return DEFAULT_OPCIONES.slice();

	// Si ya es array
	if(Array.isArray(body)) return body.map(String);

	// Si es objeto y tiene .opciones
	if(typeof body === 'object'){
		if(Array.isArray(body.opciones)) return body.opciones.map(String);
		// Buscar una propiedad que sea array
		for(const k of Object.keys(body)){
			if(Array.isArray(body[k])) return body[k].map(String);
		}
		return DEFAULT_OPCIONES.slice();
	}

	// Si es string, intentar parsear JSON
	if(typeof body === 'string'){
		try{
            console.log("opciones seteadas");
			const parsed = JSON.parse(body);
			if(Array.isArray(parsed)) return parsed.map(String);
			if(parsed && typeof parsed === 'object' && Array.isArray(parsed.opciones)) return parsed.opciones.map(String);
		}catch(e){
			// no es JSON -> intentar comma-separated
			const parts = body.split(',').map(s => s.trim()).filter(Boolean);
			if(parts.length) return parts.map(String);
		}
	}

	return DEFAULT_OPCIONES.slice();
}

/**
 * Llama al endpoint PATCH /revision-manual/modificar/{modificacion} y
 * devuelve un arreglo normalizado de opciones.
 * options: { baseUrl?, modificacion?, authToken? }
 */
export default async function obtenerOpciones({ baseUrl = 'http://localhost:8080', modificacion = true, authToken = null } = {}){
	const url = `${baseUrl.replace(/\/$/, '')}/revision-manual/modificar/${modificacion}`;
	const headers = { 'Accept': 'application/json' };
	if(authToken) headers['Authorization'] = `Bearer ${authToken}`;

	const resp = await fetch(url, { method: 'PATCH', headers });
	const contentType = resp.headers.get('content-type') || '';
	let body = null;

	if(contentType.includes('application/json')){
		try{ body = await resp.json(); }catch(e){ body = null; }
	} else {
		// Intentar leer como texto y parsear
		const txt = await resp.text();
		try{ body = JSON.parse(txt); }catch(e){ body = txt; }
	}

	return parseOpciones(body);
}

