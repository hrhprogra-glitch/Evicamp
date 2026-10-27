# Instrucciones para cualquier IA que trabaje en este proyecto

1. Lee primero **docs/PLAN-SIUMAX-COMERC.md**: qué es el sistema, las reglas de trabajo, las fases hechas y la que sigue
   (fase 4, Clientes y empresas, con su propuesta completa).
2. **Responde siempre en español**, simple. El dueño no es programador.
3. **No subas nada a Evicamp (producción) ni hagas push a GitHub sin que el dueño lo diga en ese momento.** siumax es el
   sitio de pruebas.
4. **Antes de cada fase o cambio grande, muestra la propuesta y espera su OK.**
5. Todo debe funcionar **100% con teclado** y **sin internet**. Prueba con las pruebas de `ai-scripts/pruebas/`.
6. **SQL en Evicamp:** respaldo primero y `psql` con `lock_timeout`. **Nunca** reinicies la API (`activar-seguridad.sh`).
7. **No compartas** el contenido de `.env.vps`.
