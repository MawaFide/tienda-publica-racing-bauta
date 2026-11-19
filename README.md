# Tienda web Racing-Bauta

Esta carpeta contiene una tienda web estatica que lee los productos disponibles desde Supabase. Muestra solo modelos con `quantity > 0`.

## 1. Crear la tabla en Supabase

Abre el editor SQL de Supabase y ejecuta `supabase-schema.sql`.

## 2. Configurar la tienda

Copia los datos publicos del proyecto en `config.js`:

```js
window.RACING_BAUTA_STORE = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_ANON_KEY_PUBLICA",
  whatsappPhone: "5350000000",
  contactEmail: "ventas@racing-bauta.com",
  currency: "USD"
};
```

## 3. Sincronizar inventario

El sincronizador lee la base local `ventas.db` de Racing-Bauta y sube productos/modelos a Supabase.

En PowerShell o CMD, desde esta carpeta:

```bash
set SUPABASE_URL=https://TU-PROYECTO.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_PRIVADA
python sync_to_supabase.py
```

En Linux/WSL:

```bash
export SUPABASE_URL=https://TU-PROYECTO.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_PRIVADA
python3 sync_to_supabase.py
```

La llave `service_role` es privada: se usa solo en la computadora o servidor que sincroniza, nunca dentro de `config.js` ni del navegador.

## 4. Abrir la tienda

Para probar local:

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080` desde esta carpeta.

Para publicarla, sube estos archivos a Netlify, Vercel, Cloudflare Pages o cualquier hosting estatico.
