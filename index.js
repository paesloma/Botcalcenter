const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// 1. MINI SERVIDOR WEB (Evita el error "No open ports detected")
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('El bot de WhatsApp está en línea y funcionando.'));
app.listen(port, () => console.log(`Puerto ${port} abierto exitosamente para satisfacer a Render.`));

// URL de tu Google Apps Script
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzOLNB4nSlqjxZ01ENwmzOQuXsOCv_BytRovwM6aIY427py3RQIdh_90aX6tSfI8ftcKg/exec";

// 2. CONFIGURACIÓN OPTIMIZADA (Evita el error "Out of memory 512Mi")
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
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

    if (texto.toLowerCase().startsWith('extraer 1')) {
        console.log('Comando "extraer 1" detectado. Procesando información...');
        
        const lineas = texto.split('\n');

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
                const response = await axios.post(GOOGLE_SHEETS_URL, payload);
                console.log('Registro exitoso en Sheets:', response.data);
            } catch (error) {
                console.error('Error al conectar con Google Sheets:', error);
            }
        } else {
            console.log('El mensaje fue ignorado porque no tiene la estructura completa.');
        }
    }
});

// Inicializamos el bot
client.initialize();
