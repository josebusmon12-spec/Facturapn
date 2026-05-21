# 🍞 Sistema de Facturación e Inventario - Panificadora Rodríguez

Este es el sistema de facturación, punto de venta (POS) y control de inventario desarrollado para **Panificadora Rodríguez**. 

La aplicación está diseñada bajo el enfoque **Offline-First**: funciona de forma 100% autónoma de manera local (usando el almacenamiento del navegador) y se sincroniza en tiempo real con la nube (Firebase Firestore) cuando hay credenciales configuradas y conexión a internet.

---

## 🚀 Guía de Despliegue en GitHub Pages (Sin costo de Servidor)

Sigue estos sencillos pasos para subir el proyecto a GitHub y habilitar el enlace web para que cualquier persona autorizada de la empresa pueda usar la aplicación desde su computadora, tablet o celular.

### Paso 1: Crear una Cuenta y un Repositorio en GitHub
1. Ingresa a [GitHub](https://github.com/) e inicia sesión (o crea una cuenta gratuita si no tienes una).
2. En la esquina superior derecha, haz clic en el botón **`+`** y selecciona **`New repository`** (Nuevo repositorio).
3. Configura el repositorio:
   - **Repository name**: Escribe un nombre, por ejemplo: `facturacion-pn-rodriguez`.
   - **Public/Private**: Elige **`Public`** (Público) para poder utilizar la versión gratuita de GitHub Pages.
   - *Nota: Deja las demás opciones desactivadas (no agregues README ni .gitignore adicionales desde la web, ya que el proyecto ya los incluye).*
4. Haz clic en el botón **`Create repository`** (Crear repositorio).

### Paso 2: Subir los Archivos al Repositorio

#### Opción A: Desde la Página Web de GitHub (La más fácil y rápida)
1. En la pantalla que aparece tras crear el repositorio, busca la sección que dice: *"...or upload an existing file"* (o subir un archivo existente) y haz clic en el enlace **`upload an existing file`**.
2. Abre la carpeta del proyecto en tu computadora (`facturacion Pn Rodriguez`).
3. Selecciona **todos** los archivos de esta carpeta:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `logo.png`
   - `README.md`
   - `.gitignore` (opcional)
4. **Arrastra y suelta** todos estos archivos dentro del recuadro de la página web de GitHub.
5. Espera a que terminen de cargarse los archivos.
6. En la parte inferior, haz clic en el botón verde **`Commit changes`** (Confirmar cambios).

#### Opción B: Usando la Consola de Git (Recomendado para programadores)
Si tienes Git instalado en tu computadora, abre la consola en la carpeta del proyecto y ejecuta:
```bash
git init
git add .
git commit -m "Despliegue inicial del sistema"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/facturacion-pn-rodriguez.git
git push -u origin main
```
*(Reemplaza `TU_USUARIO` con tu nombre de usuario real de GitHub).*

---

### Paso 3: Activar la Aplicación Web (GitHub Pages)
1. Dentro de tu repositorio en GitHub, ingresa a la pestaña **`Settings`** (Configuración) en la parte superior derecha.
2. En la barra lateral izquierda, busca la sección **`Code and automation`** y haz clic en **`Pages`**.
3. En la sección **`Build and deployment`**:
   - En **`Source`**, selecciona **`Deploy from a branch`**.
   - En **`Branch`**, cambia `None` por **`main`**.
   - Deja la carpeta en **`/ (root)`**.
   - Haz clic en **`Save`** (Guardar).
4. Espera 1 o 2 minutos. Recarga la página.
5. En la parte superior de esa misma sección de **`Pages`** aparecerá una caja verde con tu enlace listo. Será algo como:
   👉 **`https://TU_USUARIO.github.io/facturacion-pn-rodriguez/`**

¡Listo! Cualquier persona de la empresa con ese enlace podrá abrir el sistema de facturación desde cualquier navegador web.

---

## 🔒 Seguridad de las Credenciales (Firebase)

Para proteger la base de datos y evitar que personas ajenas tengan acceso a las ventas e inventario:
1. **Las credenciales de Firebase Firestore no se guardan en el código subido a GitHub**.
2. El sistema utiliza almacenamiento seguro local en el navegador (`localStorage`) para persistir la llave de acceso.
3. **Cómo configurar un nuevo dispositivo**:
   - Abre el link generado de la aplicación.
   - Ve a la pestaña **`Configuración`** en el menú izquierdo.
   - Baja a la sección **`Conexión Cloud (Firebase Firestore)`**.
   - Ingresa los datos de tu proyecto de Firebase (API Key, Project ID, App ID).
   - Presiona **`Guardar y Conectar Cloud`**.
   - ¡El dispositivo se sincronizará automáticamente en tiempo real con las ventas de los demás dispositivos vinculados!
