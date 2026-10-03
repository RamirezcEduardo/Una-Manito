import type { Metadata } from "next";
import { DocumentoLegal } from "@/components/Legal";
import { EMPRESA } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad · Una Manito" };

export default function Privacidad() {
  return (
    <DocumentoLegal titulo="Política de privacidad">
      <p>
        En <b>{EMPRESA.nombre}</b> cuidamos tus datos personales conforme a la Ley N.° 29733, Ley de Protección de Datos Personales,
        y su Reglamento. Aquí te contamos qué datos usamos, para qué y cuáles son tus derechos.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es {EMPRESA.razonSocial} (RUC {EMPRESA.ruc}), con domicilio en Lima, Perú.
        Contacto: {EMPRESA.correo}.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <ul>
        <li><b>Clientes:</b> nombre, celular, correo, direcciones y ubicación en el mapa, historial de pedidos, pagos marcados y calificaciones.</li>
        <li><b>Socias:</b> nombre, celular, correo, DNI, foto, distritos y servicios en los que trabaja, disponibilidad, servicios realizados, ganancias y calificaciones.</li>
        <li><b>Datos técnicos:</b> información básica del dispositivo y del uso de la aplicación, necesaria para que funcione y sea segura.</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Crear tu cuenta e iniciar sesión.</li>
        <li>Conectar a clientes y socias y gestionar cada pedido: dirección, horario, estado, pago y calificaciones.</li>
        <li>Verificar la identidad de las socias antes de aprobarlas.</li>
        <li>Atender consultas, reclamos y problemas de seguridad.</li>
        <li>Cumplir obligaciones legales y tributarias.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h2>4. Con quién los compartimos</h2>
      <ul>
        <li><b>Entre cliente y socia, solo durante un pedido:</b> el cliente ve el nombre, la foto, la calificación y el celular de su socia; la socia ve el nombre, el celular y la dirección del cliente. El DNI de la socia nunca se muestra a los clientes.</li>
        <li><b>Proveedores que nos ayudan a operar</b> (alojamiento de la base de datos y de la aplicación, envío de correos y mapas), que tratan los datos solo por encargo nuestro. Algunos pueden estar fuera del Perú, con medidas adecuadas de protección.</li>
        <li><b>Autoridades</b>, cuando la ley lo exija.</li>
      </ul>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tu cuenta esté activa y, después, el tiempo necesario para cumplir obligaciones legales o atender reclamos.
        Luego los eliminamos o anonimizamos.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de <b>acceso, rectificación, cancelación y oposición</b> (derechos ARCO) escribiendo a {EMPRESA.correo}
        con tu nombre y una copia de tu documento de identidad. Te responderemos en los plazos que establece la ley. Si no estás conforme
        con la respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Usamos conexiones cifradas y reglas de acceso para que cada persona vea solo la información que le corresponde.
        Aun así, ningún sistema es 100% infalible; si detectamos un problema de seguridad que te afecte, te avisaremos.
      </p>

      <h2>8. Ubicación</h2>
      <p>
        Solo usamos tu ubicación cuando tocas “Usar mi ubicación actual” o marcas un punto en el mapa, para ubicar la dirección del servicio.
      </p>

      <h2>9. Cambios</h2>
      <p>Si cambiamos esta política te avisaremos en la aplicación.</p>
    </DocumentoLegal>
  );
}
