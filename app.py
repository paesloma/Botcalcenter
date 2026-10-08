import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Reemplaza esto con la URL que obtuviste de Google Apps Script
GOOGLE_SHEETS_URL = "TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI"

@app.route('/webhook', methods=['POST', 'GET'])
def webhook():
    # Esta sección es para la verificación inicial de WhatsApp API
    if request.method == 'GET':
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        if mode and token:
            if mode == 'subscribe' and token == 'tu_token_secreto_aqui':
                return challenge, 200
        return 'Error de validación', 403

    # Esta sección procesa los mensajes entrantes
    if request.method == 'POST':
        data = request.get_json()
        
        try:
            if 'entry' in data:
                for entry in data['entry']:
                    for change in entry['changes']:
                        if 'messages' in change['value']:
                            mensaje_data = change['value']['messages'][0]
                            # Extraemos el texto del mensaje
                            texto_mensaje = mensaje_data.get('text', {}).get('body', '').strip()
                            
                            # Filtro estricto: Solo procesar si inicia con "extraer 1"
                            if texto_mensaje.lower().startswith("extraer 1"):
                                procesar_y_enviar_a_sheets(texto_mensaje)
        except Exception as e:
            print(f"Error procesando el mensaje: {e}")

        # Se debe responder siempre 200 OK para que WhatsApp no reenvíe el mensaje
        return jsonify({"status": "success"}), 200

def procesar_y_enviar_a_sheets(texto):
    """
    Toma el mensaje, lo separa por líneas y lo envía a la base de datos.
    Se asume el formato:
    extraer 1
    Tipo de atención
    Marca
    Garantía
    Tipo de producto
    Nombre y Apellido
    Teléfono
    """
    # Separamos el bloque de texto por cada salto de línea
    lineas = texto.split('\n')
    
    # Validamos que al menos existan las líneas necesarias después del comando
    if len(lineas) >= 7:
        payload = {
            "tipo_atencion": lineas[1].strip(),
            "marca": lineas[2].strip(),
            "garantia_activa": lineas[3].strip(),
            "tipo_producto": lineas[4].strip(),
            "nombre_apellido": lineas[5].strip(),
            "telefono": lineas[6].strip()
        }
        
        try:
            # Enviamos el paquete JSON a Google Apps Script
            respuesta = requests.post(GOOGLE_SHEETS_URL, json=payload)
            print("Registro exitoso en Sheets:", respuesta.text)
        except Exception as e:
            print("Error de conexión con Sheets:", e)

if __name__ == '__main__':
    # Configuración del puerto para despliegue en la nube (Render, Heroku, etc.)
    puerto = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=puerto)
