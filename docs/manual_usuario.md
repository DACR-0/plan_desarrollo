# SIGEPU — Sistema de Gestión del Plan de Desarrollo Universitario
## Manual de Usuario

**Versión:** 1.0
**Fecha:** Febrero 2026

---

## Tabla de Contenidos

1. [¿Qué es SIGEPU?](#1-qué-es-sigepu)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Navegación General](#3-navegación-general)
4. [Tablero de Control (Dashboard)](#4-tablero-de-control-dashboard)
5. [Estructura del Plan](#5-estructura-del-plan)
6. [Planes de Desarrollo](#6-planes-de-desarrollo)
7. [Áreas, Objetivos y Metas](#7-áreas-objetivos-y-metas)
8. [Indicadores](#8-indicadores)
9. [Variables](#9-variables)
10. [Reportes](#10-reportes)
11. [Usuarios](#11-usuarios)
12. [Cambiar Contraseña](#12-cambiar-contraseña)
13. [Preguntas Frecuentes](#13-preguntas-frecuentes)

---

## 1. ¿Qué es SIGEPU?

**SIGEPU** es el sistema de la universidad para hacer seguimiento al **Plan de Desarrollo Institucional**. Con él puede:

- Ver el avance de metas e indicadores en tiempo real.
- Consultar el cumplimiento por área estratégica.
- Actualizar los datos (variables) que alimentan los cálculos automáticos.
- Exportar reportes en PDF o Excel.

El sistema tiene dos tipos de usuario:

| Tipo | ¿Qué puede hacer? |
|---|---|
| **Administrador** | Ver todo + crear, editar y eliminar registros |
| **Consultor** | Solo consultar información (sin modificar) |

---

## 2. Acceso al Sistema

### Iniciar sesión

1. Abra su navegador y vaya a la dirección del sistema.
2. Ingrese su **correo electrónico** y **contraseña**.
3. Haga clic en **Iniciar sesión**.

> Si su contraseña es incorrecta, el sistema mostrará un mensaje de error en rojo. Verifique que no haya espacios al escribir.

### Cerrar sesión

Haga clic en el ícono de su perfil en la esquina superior derecha y seleccione **Cerrar sesión**. Su sesión expira automáticamente después de 24 horas.

---

## 3. Navegación General

Al ingresar verá la pantalla principal con dos elementos de navegación:

**Barra lateral izquierda (Menú)**

```
📊  Dashboard
🏗️  Estructura
📋  Planes
📌  Indicadores
📐  Metas
🔢  Variables
📄  Reportes
👤  Usuarios       (solo administradores)
📅  Períodos       (solo administradores)
📬  Solicitudes
```

**Barra superior**
- Nombre del plan activo (puede cambiarlo desde el selector).
- Nombre del usuario conectado.
- Botón de cerrar sesión.

### Cambiar el plan activo

En la barra superior hay un selector de plan. Haga clic sobre él, elija el plan que desea consultar y todos los datos de la pantalla se actualizarán automáticamente.

---

## 4. Tablero de Control (Dashboard)

El Dashboard es la pantalla principal. Muestra un resumen del estado del plan activo.

### Tarjetas de Resumen (KPIs)

En la parte superior encontrará cuatro tarjetas:

| Tarjeta | Qué muestra |
|---|---|
| **Total de Indicadores** | Cantidad total de indicadores del plan |
| **En Meta** | Indicadores con ≥ 90% de cumplimiento |
| **En Progreso** | Indicadores entre 50% y 89% |
| **En Riesgo** | Indicadores por debajo del 50% |

### Sistema de Semáforos

Cada indicador tiene un color de estado:

- 🟢 **Verde — En Meta**: el indicador ha alcanzado o superado el 90% de su objetivo.
- 🟡 **Amarillo — En Progreso**: avance entre el 50% y el 89%.
- 🔴 **Rojo — En Riesgo**: avance menor al 50%, requiere atención.

### Gráficas

- **Progreso por Área**: gráfica de barras con el porcentaje promedio de cada área estratégica.
- **Estado de Cumplimiento**: gráfica de dona mostrando la distribución de indicadores por color.
- **Evolución**: gráfica de línea con la evolución del cumplimiento a lo largo del tiempo.

### Listas rápidas

- **Mejores indicadores**: los que tienen mayor porcentaje de cumplimiento.
- **Indicadores en riesgo**: los que necesitan atención urgente.

---

## 5. Estructura del Plan

La página **Estructura** muestra la organización completa del plan en forma de árbol expandible.

```
Plan de Desarrollo 2022-2026
  └── Área Estratégica 1: Docencia
        └── Objetivo General 1.1: Mejorar la calidad académica
              └── Objetivo Específico 1.1.1: Capacitar docentes
                    └── Meta 1.1.1.1: 80% docentes capacitados
                          └── Indicador: % docentes con certificación
  └── Área Estratégica 2: Investigación
        └── ...
```

### Cómo usar la estructura

- Haga clic en cualquier elemento para **expandir o colapsar** sus subniveles.
- Use esta vista para **entender cómo se organiza el plan** antes de ingresar datos.
- Los iconos de colores indican el estado actual de cada indicador dentro del árbol.

---

## 6. Planes de Desarrollo

> Solo disponible para **administradores**.

### Ver la lista de planes

En el menú, haga clic en **Planes**. Verá una tabla con todos los planes registrados, su período y si están activos o no.

### Crear un nuevo plan

1. Haga clic en el botón **+ Nuevo Plan**.
2. Complete los campos:
   - **Nombre**: título del plan (ej.: "Plan de Desarrollo 2026-2030").
   - **Descripción**: resumen del plan (opcional).
   - **Año de inicio** y **Año de fin**.
3. Haga clic en **Guardar**.

### Activar un plan

Solo puede estar **un plan vigente** a la vez. Para activar un plan:

1. En la lista de planes, ubique el plan deseado.
2. Haga clic en el botón **Activar**.
3. Confirme la acción. El plan anterior quedará como inactivo automáticamente.

> ⚠️ Al activar un nuevo plan, los datos del plan anterior no se pierden. Puede seguir consultándolos seleccionando ese plan en el selector de la barra superior.

### Editar o eliminar un plan

- **Editar**: haga clic en el ícono de lápiz ✏️ junto al plan.
- **Eliminar**: haga clic en el ícono de papelera 🗑️. El plan se desactiva (no se borra permanentemente).

---

## 7. Áreas, Objetivos y Metas

Estas secciones se administran a través de la página **Metas** y de la vista de **Estructura**. Siguen el mismo patrón de formularios.

### Crear un Área Estratégica

1. Vaya a **Estructura** o **Metas**.
2. Haga clic en **+ Nueva Área**.
3. Ingrese el **código** (ej.: "A1"), el **nombre** y el **orden de aparición**.
4. Guarde.

### Crear un Objetivo General

1. Seleccione el área a la que pertenecerá.
2. Haga clic en **+ Objetivo General**.
3. Complete código, nombre y descripción.
4. Guarde.

### Crear un Objetivo Específico

Similar al objetivo general, pero seleccionando primero el objetivo general al que pertenece.

### Crear una Meta

1. Seleccione el objetivo específico al que pertenece la meta.
2. Haga clic en **+ Nueva Meta**.
3. Complete:
   - **Nombre** de la meta.
   - **Línea Base**: valor de partida (punto de inicio).
   - **Valor Meta**: valor objetivo a alcanzar.
   - **Unidad de medida** (ej.: %, número, personas).
4. Guarde.

---

## 8. Indicadores

Los indicadores miden el avance de cada meta mediante **fórmulas matemáticas** que se calculan automáticamente a partir de variables.

### Ver la lista de indicadores

Haga clic en **Indicadores** en el menú. Verá una tabla con todos los indicadores del plan activo, su estado (semáforo) y el porcentaje de cumplimiento.

### Crear un indicador (solo administradores)

1. Haga clic en **+ Nuevo Indicador**.
2. Complete:
   - **Nombre**: descripción clara del indicador.
   - **Meta asociada**: seleccione la meta que medirá este indicador.
   - **Fórmula**: expresión matemática usando los nombres de las variables.
     - Ejemplo: `(Graduados_Oportunos / Total_Matriculados) * 100`
     - Los nombres deben coincidir exactamente con los nombres de las variables registradas en el plan.
   - **Línea Base**: valor inicial del indicador.
   - **Valor Meta**: valor objetivo.
   - **Período de cálculo**: anual, semestral o trimestral.
3. Haga clic en **Guardar**.

> 💡 El sistema valida automáticamente que la fórmula sea correcta. Si hay un error, le indicará dónde está el problema.

### Recalcular un indicador

Si actualizó las variables y quiere ver el nuevo resultado:

1. En la lista de indicadores, haga clic en el botón **Recalcular** (ícono de refrescar 🔄) del indicador deseado.
2. El sistema evaluará la fórmula con los valores actuales de las variables y actualizará el porcentaje de cumplimiento.

### Ver el historial de un indicador

Haga clic en el ícono de historial 📜 del indicador. Verá una lista de todos los cálculos anteriores con:
- Fecha y hora del cálculo.
- Valor calculado.
- Porcentaje de cumplimiento.
- Valores de las variables usadas en ese cálculo.

---

## 9. Variables

Las variables son los **datos de entrada** que alimentan las fórmulas de los indicadores. Por ejemplo, si un indicador calcula `(Graduados / Total) * 100`, entonces `Graduados` y `Total` son variables.

### Ver las variables del plan

Haga clic en **Variables** en el menú. Verá una tabla con todas las variables del plan activo y sus valores actuales.

### Actualizar una variable (edición individual)

1. En la lista, haga clic en el ícono de edición ✏️ junto a la variable.
2. Ingrese el nuevo valor numérico.
3. Opcionalmente, escriba una observación (ej.: "Dato del semestre 2025-2").
4. Haga clic en **Guardar**.

> El sistema registra automáticamente el cambio en el historial.

### Actualizar varias variables a la vez (actualización por lote)

Cuando necesite actualizar muchos valores de una vez:

1. En la lista de variables, active el **modo de edición masiva** (botón "Editar todo").
2. Modifique los valores directamente en la tabla.
3. Haga clic en **Guardar todo**.
4. El sistema actualizará todas las variables y **recalculará automáticamente** todos los indicadores afectados.

### Ver el historial de una variable

Haga clic en el ícono de historial 📜 junto a la variable para ver todos los valores anteriores con fecha, usuario que hizo el cambio y observación.

---

## 10. Reportes

Desde la sección **Reportes** puede exportar la información del plan activo en dos formatos.

### Exportar en PDF

1. Haga clic en **Exportar PDF**.
2. El sistema generará un documento con la estructura del plan, los indicadores y sus valores actuales.
3. El archivo se descargará automáticamente en su computador.

### Exportar en Excel

1. Haga clic en **Exportar Excel**.
2. El archivo `.xlsx` se descargará con hojas organizadas por área estratégica.

> 💡 Los reportes siempre corresponden al **plan activo** seleccionado en la barra superior.

---

## 11. Usuarios

> Solo disponible para **administradores**.

### Ver la lista de usuarios

Haga clic en **Usuarios** en el menú. Verá todos los usuarios registrados con su nombre, correo, rol y estado.

### Crear un nuevo usuario

1. Haga clic en **+ Nuevo Usuario**.
2. Complete:
   - **Nombre completo**
   - **Correo electrónico** (será el nombre de usuario para ingresar)
   - **Contraseña inicial**
   - **Rol**: Administrador o Consultor
3. Haga clic en **Guardar**.

> El nuevo usuario podrá iniciar sesión de inmediato con las credenciales creadas. Se recomienda pedirle que cambie su contraseña al primer ingreso.

### Activar o desactivar un usuario

- Haga clic en el ícono de estado 🔘 junto al usuario para cambiar entre activo / inactivo.
- Los usuarios inactivos no pueden iniciar sesión.

---

## 12. Cambiar Contraseña

Cualquier usuario puede cambiar su propia contraseña:

1. Haga clic en su nombre en la esquina superior derecha.
2. Seleccione **Cambiar contraseña**.
3. Ingrese su contraseña actual.
4. Ingrese la nueva contraseña (al menos 6 caracteres).
5. Repita la nueva contraseña para confirmar.
6. Haga clic en **Guardar**.

---

## 13. Preguntas Frecuentes

**¿Por qué no veo datos en el Dashboard?**
Verifique que haya un plan seleccionado en la barra superior y que ese plan tenga indicadores y variables configurados.

**¿Qué pasa si cambio el valor de una variable?**
El cambio se guarda en el historial. Para que el indicador muestre el nuevo resultado, debe hacer clic en **Recalcular** en ese indicador, o usar la **actualización por lote** en Variables (que recalcula todo automáticamente).

**¿Por qué mi indicador no cambia después de actualizar variables?**
Debe recalcular el indicador explícitamente. El sistema no recalcula de forma automática al editar una variable de forma individual; solo lo hace con la actualización por lote.

**¿Puedo tener dos planes activos al mismo tiempo?**
No. El sistema permite solo un plan **vigente** a la vez. Sin embargo, puede consultar el historial de cualquier plan seleccionándolo en el selector de la barra superior.

**¿Se pueden recuperar datos eliminados?**
El sistema usa eliminación lógica (los registros se desactivan pero no se borran). Contacte al administrador del sistema si necesita recuperar un registro.

**¿Qué significa la fórmula de un indicador?**
Es una expresión matemática que el sistema evalúa automáticamente. Por ejemplo:
`(Pub_Scopus + Pub_WoS) / Docentes_TC * 100`
significa: *(publicaciones en Scopus + publicaciones en WoS) dividido entre docentes a tiempo completo, multiplicado por 100*.
Los nombres en la fórmula deben coincidir exactamente con los nombres de las variables del plan.

**Olvidé mi contraseña, ¿qué hago?**
Contacte al administrador del sistema para que restablezca su contraseña. El sistema no tiene función de recuperación automática por correo.

**¿Con qué navegadores funciona el sistema?**
El sistema funciona correctamente en las versiones actuales de **Google Chrome**, **Microsoft Edge** y **Mozilla Firefox**. Se recomienda Chrome para una mejor experiencia.

---

*Fin del manual de usuario.*
