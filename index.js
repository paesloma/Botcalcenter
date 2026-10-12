const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const express = require('express');
const nodemailer = require('nodemailer');

// 1. CONFIGURACIÓN DE GMAIL (NODEMAILER)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'paesloma@gmail.com', // Tu correo de origen
        pass: 'voccbgupurcbtdhx'    // Contraseña de aplicación generada
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
                    <img src="${qrImage}" alt="QR Code" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px;" />
                    <p style="color: gray;">Si el código caduca o falla, presiona F5 para recargar la página.</p>
                </div>
            `);
        } catch (err) {
            res.send('Error al generar la imagen del código QR.');
        }
    }
});

app.listen(port, () => console.log(`Servidor Express escuchando en el puerto ${port}`));

// URL de tu NUEVA base de datos de Google Apps Script (Actualizada con tu enlace exacto)
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyyqf_jvFCr9TwCnjwwI_-vt8RhzLSamkAVSAtG_3yWxtoSRJjuKW63HkeEaABvYkX1JQ/exec";

// 3. CONFIGURACIÓN DE WHATSAPP CON CAMUFLAJE
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
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
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

client.on('qr', (qr) => { 
    console.log('Nuevo QR generado. Abre tu enlace de Render (.onrender.com) para escanearlo.');
    qrCodeData = qr; 
});

client.on('ready', () => { 
    console.log('¡Bot conectado exitosamente!');
    qrCodeData = '✅ El Bot de WhatsApp está conectado y registrando datos en segundo plano.'; 
});

// 4. MEMORIA PARA EL AGENTE CONVERSACIONAL
const sesiones = new Map();

async function registrarOrden(datos, numeroDestino) {
    try {
        await axios.post(GOOGLE_SHEETS_URL, datos);
        console.log('Registro exitoso en Sheets');
    } catch (error) { 
        console.error('Error al conectar con Google Sheets:', error); 
    }

    try {
        const mailOptions = {
            from: 'paesloma@gmail.com',
            to: 'paesloma@gmail.com', // El correo que recibirá la alerta
            subject: `Nueva Orden Registrada - ${datos.marca}`,
            text: `Se ha registrado un nuevo ticket:\n\nAtención: ${datos.tipo_atencion}\nMarca: ${datos.marca}\nGarantía: ${datos.garantia_activa}\nProducto: ${datos.tipo_producto}\nCliente: ${datos.nombre_apellido}\nTeléfono: ${datos.telefono}`
        };
        await transporter.sendMail(mailOptions);
        console.log('Correo enviado exitosamente');
    } catch (error) { 
        console.error('Error enviando correo:', error); 
    }
    
    await client.sendMessage(numeroDestino, '✅ ¡Listo! Tu orden ha sido registrada y notificada exitosamente. Nos comunicaremos contigo pronto.');
}

// 5. PROCESAMIENTO DE MENSAJES
client.on('message', async (message) => {
    const texto = message.body.trim();
    const numero = message.from;

    if (message.isGroupMsg || numero === 'status@broadcast') return;

    // ==========================================
    // MODO RÁPIDO: Comando directo
    // ==========================================
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
            await registrarOrden(payload, numero);
        }
        return;
    }

    // ==========================================
    // MODO AGENTE CONVERSACIONAL (MENÚ NUMÉRICO)
    // ==========================================
    if (!sesiones.has(numero)) {
        const saludos = ['hola', 'buenas', 'buen dia', 'buenas tardes', 'ayuda'];
        
        if (saludos.some(s => texto.toLowerCase().includes(s))) {
            sesiones.set(numero, { paso: 1, datos: {} });
            
            const textoBienvenida = `👨‍🔧 *POSTVENTA GO*\n\nHola, gracias por escribirnos y estamos para servirte. Por el momento estamos atendiendo las siguientes marcas: TCL, RCA, PHILIPS, Hamilton Beach y CHiQ.\n\nPor favor selecciona una opción del menú escribiendo el *NÚMERO* correspondiente:\n\n*1.* SERVICIO TECNICO\n*2.* INSTALACION\n*3.* MANTENIMIENTO`;

            await client.sendMessage(numero, textoBienvenida);
        }
        return;
    }

    const sesion = sesiones.get(numero);

    switch (sesion.paso) {
        case 1:
            const opciones = {
                '1': 'SERVICIO TECNICO',
                '2': 'INSTALACION',
                '3': 'MANTENIMIENTO'
            };

            if (opciones[texto]) {
                sesion.datos.tipo_atencion = opciones[texto]; 
                sesion.paso = 2;
                await client.sendMessage(numero, '¿Qué marca es el equipo? (Ej: TCL, Samsung, LG...)');
            } else {
                await client.sendMessage(numero, '⚠️ Opción no válida. Por favor, responde únicamente con el número *1*, *2* o *3*.');
            }
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
            
            await registrarOrden(sesion.datos, numero);
            sesiones.delete(numero);
            break;
    }
});

client.initialize();
