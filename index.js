const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const express = require('express');
const nodemailer = require('nodemailer');

// 1. CONFIGURACIÓN DE GMAIL (NODEMAILER)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'TU_CORREO@gmail.com', // Reemplaza con tu correo de Gmail
        pass: 'TU_CONTRASEÑA_DE_APLICACION' // La clave de 16 letras generada en Google
    }
});

// 2. SERVIDOR WEB PARA EL QR (Evita Timeout en Render)
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
                    <img src="${qrImage}" alt="QR Code" style="width: 300px; height: 300px; border: 2px solid black;" />
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

// 3. CONFIGURACIÓN DE WHATSAPP CON CAMUFLAJE
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu', '--single-process']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

client.on('qr', (qr) => { qrCodeData = qr; });
client.on('ready', () => { qrCodeData = '✅ El Bot de WhatsApp está conectado y listo.'; console.log('¡Bot conectado!'); });

// 4. MEMORIA PARA EL AGENTE CONVERSACIONAL
const sesiones = new Map();

// Función auxiliar para registrar datos y enviar correos
async function registrarOrden(datos, numeroDestino) {
    try {
        await axios.post(GOOGLE_SHEETS_URL, datos);
        console.log('Registro exitoso en Sheets');
    } catch (error) { console.error('Error en Sheets:', error); }

    try {
        const mailOptions = {
            from: 'TU_CORREO@gmail.com',
            to: 'CORREO_DESTINO@gmail.com', // A quién le llegará el correo
            subject: `Nueva Orden Registrada - ${datos.marca}`,
            text: `Se ha registrado un nuevo ticket:\n\nAtención: ${datos.tipo_atencion}\nMarca: ${datos.marca}\nGarantía: ${datos.garantia_activa}\nProducto: ${datos.tipo_producto}\nCliente: ${datos.nombre_apellido}\nTeléfono: ${datos.telefono}`
        };
        await transporter.sendMail(mailOptions);
        console.log('Correo enviado exitosamente');
    } catch (error) { console.error('Error enviando correo:', error); }
    
    await client.sendMessage(numeroDestino, '✅ ¡Listo! Tu orden ha sido registrada y notificada exitosamente. Nos comunicaremos contigo pronto.');
}

// 5. PROCESAMIENTO DE MENSAJES
client.on('message', async (message) => {
    const texto = message.body.trim();
    const numero = message.from;

    // Ignorar mensajes de grupos o estados
    if (message.isGroupMsg || numero === 'status@broadcast') return;

    // ==========================================
    // MODO RÁPIDO: Comando "extraer 1" (Regla previa)
    // ==========================================
    if (texto.toLowerCase().startsWith('extraer 1')) {
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
            await registrarOrden(payload, numero);
        }
        return; // Detiene la ejecución para que no intervenga el agente
    }

    // ==========================================
    // MODO AGENTE CONVERSACIONAL (Paso a paso)
    // ==========================================
    
    // Si el usuario no tiene una sesión activa, esperamos un saludo para iniciar
    if (!sesiones.has(numero)) {
        const saludos = ['hola', 'buenas', 'buen dia', 'buenas tardes', 'ayuda'];
        if (saludos.some(s => texto.toLowerCase().includes(s))) {
            sesiones.set(numero, { paso: 1, datos: {} });
            await client.sendMessage(numero, '¡Hola! Bienvenido. Por favor, selecciona el tipo de atención que necesitas escribiendo una de estas opciones:\n\n- Servicio Técnico\n- Instalación\n- Mantenimiento\n- Garantía');
        }
        return;
    }

    // Recuperamos el estado actual del usuario
    const sesion = sesiones.get(numero);

    switch (sesion.paso) {
        case 1:
            sesion.datos.tipo_atencion = texto;
            sesion.paso = 2;
            await client.sendMessage(numero, '¿Qué marca es el equipo? (Ej: TCL, Samsung, LG...)');
            break;
        case 2:
            sesion.datos.marca = texto;
            sesion.paso = 3;
            await client.sendMessage(numero, '¿El equipo cuenta con garantía activa? (Responde Sí o No)');
            break;
        case 3:
            sesion.datos.garantia_activa = texto;
            sesion.paso = 4;
            await client.sendMessage(numero, '¿Qué tipo de producto es? (Ej: Televisor, Refrigeradora...)');
            break;
        case 4:
            sesion.datos.tipo_producto = texto;
            sesion.paso = 5;
            await client.sendMessage(numero, 'Por favor, indícanos el Nombre y Apellido del titular.');
            break;
        case 5:
            sesion.datos.nombre_apellido = texto;
            sesion.paso = 6;
            await client.sendMessage(numero, 'Finalmente, indícanos un número de teléfono de contacto.');
            break;
        case 6:
            sesion.datos.telefono = texto;
            await client.sendMessage(numero, '⏳ Procesando tu información, espera un momento...');
            
            // Envía todo a Sheets, dispara el correo y notifica al cliente
            await registrarOrden(sesion.datos, numero);
            
            // Borra la sesión para que el cliente pueda abrir nuevos tickets en el futuro
            sesiones.delete(numero);
            break;
    }
});

client.initialize();
