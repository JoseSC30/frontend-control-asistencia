# Frontend — Control de Asistencia

Aplicación web (SPA) construida con **React 18 + Vite** que consume la API del backend. Ofrece una interfaz distinta según el rol: el **estudiante** consulta su historial y marca asistencia; el **administrador** gestiona estudiantes, asistencias, importaciones, actividades y módulos.

## Stack tecnológico

| Capa                      | Tecnología                                           |
| ------------------------- | ---------------------------------------------------- |
| Librería UI               | React 18 (`react`, `react-dom`)                      |
| Empaquetador / Dev server | Vite 5                                               |
| Estilos                   | CSS plano (`src/styles.css`)                         |
| Comunicación              | `fetch` contra la API REST (variable `VITE_API_URL`) |

## Estructura del proyecto

```text
frontend-control-asistencia/
  src/
    main.jsx      # Vistas Login, StudentView, AdminView y utilidades
    styles.css    # Estilos de la interfaz
  index.html
  vite.config.js
  .env.example    # Plantilla de variables de entorno
  package.json
```

## Requisitos previos

- Node.js 18 o superior.
- El backend ejecutándose (por defecto en `http://localhost:3000`).

## 1. Instalar dependencias

```powershell
npm install
```

## 2. Configurar variables de entorno

Copia `.env.example` a `.env`. La única variable es la URL base de la API:

| Variable       | Descripción                                                 | Valor de desarrollo         |
| -------------- | ----------------------------------------------------------- | --------------------------- |
| `VITE_API_URL` | URL base de la API del backend (incluye el prefijo `/api`). | `http://localhost:3000/api` |

```powershell
Copy-Item .env.example .env
```

> Si no defines `VITE_API_URL`, la aplicación usa `http://localhost:3000/api` por defecto.

## 3. Ejecutar en desarrollo

```powershell
npm run dev
```

Vite sirve la aplicación en `http://localhost:5173`. Con el backend en ejecución, abre esa URL en el navegador.

Para generar una versión de producción:

```powershell
npm run build     # genera la carpeta dist/
npm run preview   # sirve la versión compilada
```

## Uso

- **Administrador:** ingresa con sus credenciales (`admin@asistencia.local` / `Admin123*`). Puede ver la vista general de asistencias con filtros por fecha y estudiante, corregir estados (Presente / Retraso / Falta), consultar el listado de estudiantes con buscador, importar Excel de estudiantes y de fechas, revisar el historial de actividades y activar un nuevo módulo.
- **Estudiante:** ingresa con su correo o número de registro (sin contraseña). Consulta su historial con estados, hora de registro y totales, y marca su asistencia solo cuando la fecha corresponde.

## Requerimientos funcionales y su reflejo en la interfaz

| Código | Requerimiento                                               | Estado             | Pantalla / elemento                                           |
| ------ | ----------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| RF-01  | Ingreso de estudiante por correo o registro (módulo activo) | ✅                 | Pantalla de **Login**                                         |
| RF-02  | Admin con credenciales, autorización y cierre de sesión     | ✅                 | **Login** + botón **Cerrar sesión**                           |
| RF-03  | Marcar una sola vez en la fecha programada                  | ✅                 | **Inicio estudiante** → botón _Marcar asistencia_             |
| RF-04  | Falta al terminar la fecha sin marca; solo el admin corrige | ✅                 | Estado _Falta_ derivado + selector en **Asistencias** (admin) |
| RF-05  | Historial personal de fechas, estados, hora y totales       | ✅                 | **Mi historial de asistencia**                                |
| RF-06  | Listar estudiantes con registro, nombre, correo y búsqueda  | ✅                 | Pestaña **Estudiantes** con buscador                          |
| RF-07  | Admin cambia el estado en fechas programadas; se audita     | ✅                 | Selector de estado en **Asistencias**                         |
| RF-08  | Vista general, filtros por fecha/estudiante y totales       | ✅                 | Pestaña **Asistencias** (filtros y tarjetas de totales)       |
| RF-09  | Actividades importantes con usuario, acción y fecha/hora    | ✅                 | Pestaña **Historial de actividades**                          |
| RF-10  | Historial de actividades del módulo activo                  | ✅                 | Pestaña **Historial de actividades**                          |
| RF-11  | Importar Excel de estudiantes con validación                | ✅                 | Pestaña **Importar Excel** → _Estudiantes_                    |
| RF-12  | Importar Excel de fechas con hora inicio/fin                | ✅                 | Pestaña **Importar Excel** → _Fechas de clases_               |
| RF-13  | Activar un nuevo módulo con confirmación                    | ✅                 | Pestaña **Nuevo módulo**                                      |
| RF-14  | Persistencia de datos                                       | ✅                 | (Backend / PostgreSQL)                                        |
| RF-15  | Conservar registros de módulos anteriores                   | ✅                 | (Backend; la UI muestra solo el módulo activo)                |
| RF-16  | _(Opcional)_ Vista previa antes de activar                  | ❌ No implementado | —                                                             |
| RF-17  | _(Opcional)_ Exportar asistencias a Excel                   | ❌ No implementado | —                                                             |
| RF-18  | _(Opcional)_ Mensajes de confirmación/error                 | ✅                 | Avisos (`notice`) y errores en toda la interfaz               |

## Conexión a la base de datos desde pgAdmin

El frontend no accede directamente a la base de datos, pero para administrarla desde pgAdmin usa:

| Parámetro                      | Valor                |
| ------------------------------ | -------------------- |
| Host / Servidor                | `localhost`          |
| Puerto                         | `5432`               |
| Base de datos                  | `control_asistencia` |
| Usuario                        | `postgres`           |
| Contraseña                     | `tu_contraseña`      |
| Base de datos de mantenimiento | `postgres`           |

El detalle de creación de la base de datos y las tablas está en el README del backend (`schema.sql`).
