const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); // Librería actualizada
const axios = require('axios');
const express = require('express');

// 1. SERVIDOR WEB Y GENERADOR DE QR VISUAL
const app = express();
const port = process.env.PORT || 3000;
let qrCodeData = 'El código QR se está generando, recarga la página en unos segundos...';

app.get('/', async (req, res) => {
    // Si el bot ya se conectó, mostramos un mensaje de éxito
    if (qrCodeData.startsWith('✅') || qrCodeData.startsWith('El código')) {
        res.send(`<h1 style="font-family: Arial; padding: 20px;">${qrCodeData}</h1>`);
    } else {
        try {
            // Convertimos el texto del QR en una imagen real
            const qrImage = await qrcode.toDataURL(qrCodeData);
            res.send(`
                <div style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h2>Escanea este código QR con WhatsApp</h2>
                    <img src="${qrImage}" alt="QR Code" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px;" />
                    <p style="color: gray;">Si la cámara no lo lee o caduca, refresca/recarga esta página.</p>
                </div>
            `);
        } catch (err) {
            res.send('Error al generar la imagen del código QR.');
        }
    }
});

app.listen(port, () => console.log(`Servidor activo en el puerto ${port}`));

// URL de tu Google Apps Script
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzOLNB4nSlqjxZ01ENwmzOQuXsOCv_BytRovwM6aIY427py3RQIdh_90aX6tSfI8ftcKg/exec";

// 2. CONFIGURACIÓN DEL BOT
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'
        ]
    }
});

// Guardamos el código QR para que la página web lo muestre
client.on('qr', (qr) => {
    console.log('Nuevo QR generado. Abre el enlace de tu bot para escanearlo.');
    qrCodeData = qr; 
});

// Cuando se conecte, cambiamos el mensaje de la web
client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado exitosamente!');
    qrCodeData = '✅ El Bot ya está conectado a WhatsApp y funcionando en segundo plano.';
});

// Escuchador de mensajes
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
                await axios.post(GOOGLE_SHEETS_URL, payload);
                console.log('Registro exitoso en Sheets');
            } catch (error) {
                console.error('Error al conectar con Google Sheets:', error);
            }
        }
    }
});

client.initialize();
