# Instrucciones para cualquier IA que trabaje en este proyecto

0. **Lee `docs/BITACORA.md`** (qué hizo la última IA y qué sigue) y la parte de arriba de `docs/PLAN-SIUMAX-COMERC.md` ("DÓNDE ESTAMOS AHORA" y "PROPUESTAS").
   **Después de cada paso o conversación importante, ACTUALIZA SIEMPRE:**
   - la bitácora (entrada nueva arriba);
   - "Dónde estamos" y la tabla de propuestas del plan;
   - `docs/CONVERSACIONES.md` (qué pidió o decidió el dueño);
   - `docs/MEMORIA-IA.md` (si aprendiste algo o cometiste un error).
   Después, `git commit`. Así Claude y Antigravity pueden turnarse sin perder nada.
1. Lee **docs/MEMORIA-IA.md**: cómo es el dueño, el servidor, el código, cómo se prueba y los errores que ya se cometieron.
2. Lee **docs/PLAN-SIUMAX-COMERC.md**: qué es el sistema, las reglas de trabajo, las fases hechas y la que sigue
   (fase 4, Clientes y empresas, con su propuesta completa).
3. **Responde siempre en español**, simple. El dueño no es programador.
4. **No subas nada a Evicamp (producción) ni hagas push a GitHub sin que el dueño lo diga en ese momento.** siumax es el
   sitio de pruebas.
5. **Antes de cada fase o cambio grande, muestra la propuesta y espera su OK.**
6. Todo debe funcionar **100% con teclado** y **sin internet**. Prueba con las pruebas de `ai-scripts/pruebas/`.
7. **SQL en Evicamp:** respaldo primero y `psql` con `lock_timeout`. **Nunca** reinicies la API (`activar-seguridad.sh`).
8. **No compartas** el contenido de `.env.vps`.
