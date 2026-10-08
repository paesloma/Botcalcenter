const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// REEMPLAZA ESTO CON LA URL DE TU GOOGLE APPS SCRIPT
const GOOGLE_SHEETS_URL = "TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI";

// Configuración del cliente de WhatsApp
// Se utiliza LocalAuth para guardar la sesión y no tener que escanear el QR cada vez
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Estos argumentos son obligatorios para que funcione en servidores en la nube como Render
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generar y mostrar el código QR en la consola
client.on('qr', (qr) => {
    console.log('ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP (Dispositivos vinculados):');
    qrcode.generate(qr, { small: true });
});

// Confirmación de que el bot se conectó correctamente
client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado exitosamente y listo para procesar tickets!');
});

// Escuchador de mensajes entrantes
client.on('message', async (message) => {
    const texto = message.body.trim();

    // Filtro: Solo se activa si el mensaje empieza exactamente con "extraer 1"
    if (texto.toLowerCase().startsWith('extraer 1')) {
        console.log('Comando "extraer 1" detectado. Procesando información...');
        
        // Separamos el texto usando los saltos de línea
        const lineas = texto.split('\n');

        // Verificamos que contenga al menos el comando y los 6 datos (7 líneas mínimo)
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
                // Enviar los datos estructurados a Google Sheets
                const response = await axios.post(GOOGLE_SHEETS_URL, payload);
                console.log('Registro exitoso en Sheets:', response.data);
                
                // Opcional: Enviar una confirmación silenciosa de éxito (descomentar si se desea)
                // await message.reply('✅ Registrado en la base de datos.');
            } catch (error) {
                console.error('Error al conectar con Google Sheets:', error);
            }
        } else {
            console.log('El mensaje no tiene la estructura completa de datos.');
        }
    }
});

// Inicializamos el bot
client.initialize();
