"use client";
import { MenuInferior, PerfilVista } from "@/components/Menu";
import { Cabecera, Pantalla } from "@/components/ui";

export default function PerfilCliente() {
  return (<><Cabecera titulo="Mi perfil" /><Pantalla><PerfilVista rol="cliente" /></Pantalla><MenuInferior rol="cliente" /></>);
}
