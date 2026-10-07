"use client";
import { MenuInferior, PerfilVista } from "@/components/Menu";
import { Cabecera, Pantalla } from "@/components/ui";

export default function PerfilSocia() {
  return (<><Cabecera titulo="Mi perfil" /><Pantalla><PerfilVista rol="socia" /></Pantalla><MenuInferior rol="socia" /></>);
}
