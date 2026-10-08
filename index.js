const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const express = require('express');

// 1. SERVIDOR WEB Y GENERADOR DE QR VISUAL (Para evitar el Timeout en Render)
const app = express();
const port = process.env.PORT || 3000;
let qrCodeData = 'Generando QR... por favor recarga la página en unos segundos.';

app.get('/', async (req, res) => {
    if (qrCodeData.startsWith('✅') || qrCodeData.startsWith('Generando')) {
        res.send(`<h1 style="font-family: Arial; padding: 20px; text-align: center;">${qrCodeData}</h1>`);
    } else {
        try {
            const qrImage = await qrcode.toDataURL(qrCodeData);
            res.send(`
                <div style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h2>Escanea este código QR con WhatsApp</h2>
                    <img src="${qrImage}" alt="QR Code" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px;" />
                    <p style="color: gray;">Si el código caduca o no funciona, presiona F5 para recargar la página y obtener uno nuevo.</p>
                </div>
            `);
        } catch (err) {
            res.send('Error al generar la imagen del código QR.');
        }
    }
});

app.listen(port, () => console.log(`Servidor Express escuchando en el puerto ${port}`));

// URL de tu Google Apps Script
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzOLNB4nSlqjxZ01ENwmzOQuXsOCv_BytRovwM6aIY427py3RQIdh_90aX6tSfI8ftcKg/exec";

// 2. CONFIGURACIÓN DEL BOT CON CAMUFLAJE PARA EVITAR BLOQUEOS
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Camuflamos el servidor para que WhatsApp crea que es un Chrome en Windows
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process'
        ]
    },
    // Forzamos una versión estable de WhatsApp Web
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

// Capturamos el QR y lo guardamos para que la web lo muestre
client.on('qr', (qr) => {
    console.log('Nuevo QR generado. Abre tu enlace de Render (.onrender.com) para escanearlo.');
    qrCodeData = qr; 
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('¡Bot conectado exitosamente!');
    qrCodeData = '✅ El Bot de WhatsApp está conectado y registrando datos en segundo plano.';
});

// Procesamiento de mensajes entrantes
client.on('message', async (message) => {
    const texto = message.body.trim();

    // Filtro para el comando asignado
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
        }
    }
});

client.initialize();
