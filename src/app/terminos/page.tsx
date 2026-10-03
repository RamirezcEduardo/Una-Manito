import type { Metadata } from "next";
import { DocumentoLegal } from "@/components/Legal";
import { EMPRESA } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos y condiciones · Una Manito" };

export default function Terminos() {
  return (
    <DocumentoLegal titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso de la aplicación <b>{EMPRESA.nombre}</b>, operada por {EMPRESA.razonSocial} (RUC {EMPRESA.ruc}),
        con domicilio en Lima, Perú. Al registrarte y usar la aplicación aceptas estos términos.
      </p>

      <h2>1. Qué es Una Manito</h2>
      <p>
        Una Manito es una plataforma que <b>conecta</b> a personas que necesitan servicios para su hogar (“clientes”) con trabajadoras
        y trabajadores independientes que los prestan (“socias”). Una Manito no es empleadora de las socias: cada socia presta el
        servicio de forma independiente y decide qué pedidos acepta.
      </p>

      <h2>2. Registro y cuenta</h2>
      <ul>
        <li>Debes ser mayor de 18 años y dar datos verdaderos (nombre, celular y, en el caso de las socias, DNI y foto).</li>
        <li>Eres responsable de lo que se haga con tu cuenta. No compartas el código de ingreso que te enviamos.</li>
        <li>Las socias quedan “pendientes de aprobación” hasta que Una Manito verifique sus datos. Podemos rechazar o suspender cuentas que incumplan estos términos.</li>
      </ul>

      <h2>3. Pedidos</h2>
      <ul>
        <li>El cliente indica el servicio, la dirección, la fecha y hora, el número de horas, si la socia lleva materiales y notas adicionales.</li>
        <li>Antes de confirmar se muestra un <b>precio estimado</b>, calculado según las tarifas vigentes por hora y los recargos aplicables.</li>
        <li>El pedido se asigna a la primera socia disponible que lo acepte.</li>
        <li>El cliente puede cancelar mientras el pedido esté buscando socia o recién aceptado. Una vez que la socia está en camino ya no se puede cancelar desde la aplicación.</li>
      </ul>

      <h2>4. Pagos y comisión</h2>
      <ul>
        <li>En la etapa beta el cliente paga directamente a la socia por Yape, Plin o efectivo al terminar el servicio, y lo marca en la aplicación. La socia confirma que recibió el pago.</li>
        <li>Una Manito cobra a la socia una comisión sobre el valor de cada servicio terminado. El porcentaje vigente se muestra a la socia en cada pedido antes de aceptarlo.</li>
        <li>Más adelante podremos habilitar pagos con tarjeta u otros medios; te avisaremos de los cambios.</li>
      </ul>

      <h2>5. Compromisos de clientes y socias</h2>
      <ul>
        <li>Tratarse con respeto. No se tolera el acoso, la discriminación ni la violencia.</li>
        <li>El cliente debe ofrecer un lugar seguro para trabajar y estar presente o dejar indicaciones claras de acceso.</li>
        <li>La socia debe llegar a la hora acordada, cuidar las pertenencias del cliente y realizar el servicio con diligencia.</li>
        <li>Las calificaciones deben ser honestas y no ofensivas.</li>
      </ul>

      <h2>6. Responsabilidad</h2>
      <p>
        Una Manito realiza esfuerzos razonables para verificar a las socias y mantener la aplicación funcionando, pero no garantiza
        que siempre haya socias disponibles ni que la aplicación funcione sin interrupciones. Si ocurre un problema durante un servicio
        (daños, pérdidas o inasistencia), repórtalo a {EMPRESA.correo} dentro de las 48 horas para que lo revisemos.
      </p>

      <h2>7. Libro de Reclamaciones</h2>
      <p>
        Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571), puedes registrar una queja o reclamo
        escribiendo a {EMPRESA.correo}.
      </p>

      <h2>8. Cambios</h2>
      <p>
        Podemos actualizar estos términos. Si el cambio es importante te avisaremos en la aplicación. Si sigues usándola después
        del aviso, se entiende que aceptas la nueva versión.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces de Lima.</p>
    </DocumentoLegal>
  );
}
