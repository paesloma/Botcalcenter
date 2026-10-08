const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// URL de tu Google Apps Script ya configurada
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzOLNB4nSlqjxZ01ENwmzOQuXsOCv_BytRovwM6aIY427py3RQIdh_90aX6tSfI8ftcKg/exec";

// Configuración del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generar y mostrar el código QR en la consola de Render
client.on('qr', (qr) => {
    console.log('ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP (Dispositivos vinculados):');
    qrcode.generate(qr, { small: true });
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado exitosamente y listo para procesar tickets!');
});

// Escuchador de mensajes entrantes
client.on('message', async (message) => {
    const texto = message.body.trim();

    // Filtro estricto: Solo se activa si el mensaje empieza exactamente con "extraer 1"
    if (texto.toLowerCase().startsWith('extraer 1')) {
        console.log('Comando "extraer 1" detectado. Procesando información...');
        
        // Separamos el texto usando los saltos de línea
        const lineas = texto.split('\n');

        // Verificamos que contenga el comando más los 6 datos (7 líneas en total)
        if (lineas.length >= 7) {
            const payload = {
                tipo_atencion: lineas[1].trim(),
                marca: lineas[2].trim(),
                garantia_activa: lineas[3].trim(),
                tipo_producto: lineas[4].trim(),
                nombre_apellido: lineas[5].trim(),
                telefono: lineas[6].trim()
            };

            try {
                // Enviar los datos estructurados a tu Google Sheets
                const response = await axios.post(GOOGLE_SHEETS_URL, payload);
                console.log('Registro exitoso en Sheets:', response.data);
            } catch (error) {
                console.error('Error al conectar con Google Sheets:', error);
            }
        } else {
            console.log('El mensaje fue ignorado porque no tiene la estructura completa de datos.');
        }
    }
});

// Inicializamos el bot
client.initialize();
